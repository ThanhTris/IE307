-- GM23.2: canonical notifications consume the GM20 transactional outbox.
begin;
create table gm23_private.canonical_notifications(
 result_id uuid primary key references gm17_private.result_refs(id) deferrable initially deferred,
 event_id uuid not null unique references public.events(id) on delete cascade,
 status text not null check(status in ('DECIDED','NO_CONSENSUS')),
 contract_version text not null,
 event_version integer not null check(event_version>=1)
);
alter table gm23_private.canonical_notifications enable row level security;
alter table gm23_private.canonical_notifications force row level security;
revoke all on gm23_private.canonical_notifications from public,anon,authenticated,service_role,gm06_publisher;
create trigger gm23_canonical_frozen before update on gm23_private.canonical_notifications for each row execute function gm06_canonical.immutable();
create function gm23_private.materialize_terminal(key uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare source gm20_canonical_private.terminal_outbox%rowtype; audience uuid[]; event_key uuid; person uuid;
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 select * into source from gm20_canonical_private.terminal_outbox where result_id=key for update;
 if not found or source.expires_at<=clock_timestamp() then return; end if;
 if exists(select 1 from gm23_private.canonical_notifications where result_id=key) then return; end if;
 select array_agg(user_id order by user_id) into audience from gm20_canonical_private.outbox_audience where result_id=key;
 if audience is null or audience is distinct from (select array_agg(user_id order by user_id) from gm06_canonical.result_members where result_id=key) then
  raise sqlstate '23514' using message='GM23_CANONICAL_AUDIENCE_MISMATCH';
 end if;
 event_key:=gen_random_uuid();
 insert into public.events(id,kind,room_id,invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
 values(event_key,'ROOM_RESULT_READY',source.room_ref_id,null,key,audience,'gm23-canonical-result:'||key,source.created_at,least(source.expires_at,source.created_at+interval '7 days'),1);
 insert into gm23_private.canonical_notifications values(key,event_key,source.status,source.contract_version,source.version);
 foreach person in array audience loop
  insert into public.inbox(id,owner_user_id,event_id,read_at,created_at,expires_at,version)
  values(gen_random_uuid(),person,event_key,null,source.created_at,least(source.expires_at,source.created_at+interval '7 days'),1)
  on conflict(owner_user_id,event_id) do nothing;
 end loop;
end $$;
create function gm23_private.terminal_notification() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin perform gm23_private.materialize_terminal(new.result_id); return new; end $$;
create constraint trigger gm23_terminal_notification after insert on gm20_canonical_private.terminal_outbox
 deferrable initially deferred for each row execute function gm23_private.terminal_notification();
create function gm23_private.notification_metadata(event_key uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('status',status,'contractVersion',contract_version,'eventVersion',event_version)
 from gm23_private.canonical_notifications where event_id=event_key
$$;
alter function public.list_partner_inbox(text) rename to list_partner_inbox_before_gm23_canonical;
revoke all on function public.list_partner_inbox_before_gm23_canonical(text) from public,anon,authenticated,service_role;
create function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare rows jsonb;
begin
 rows:=public.list_partner_inbox_before_gm23_canonical(cursor);
 if jsonb_typeof(rows)<>'array' then return rows; end if;
 return coalesce((select jsonb_agg(case when gm23_private.notification_metadata((v->>'eventId')::uuid) is null then v
 else jsonb_set(v,'{metadata}',coalesce(v->'metadata','{}')||gm23_private.notification_metadata((v->>'eventId')::uuid)) end order by ord)
 from jsonb_array_elements(rows) with ordinality t(v,ord)),'[]');
end $$;
revoke all on function public.list_partner_inbox(text) from public,anon,authenticated,service_role;
grant execute on function public.list_partner_inbox(text) to authenticated;
create or replace function gm23_private.event_deliveries() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare person uuid; device_row record;
begin
  if new.kind not in ('ROOM_INVITED','ROOM_RESULT_READY') then return new; end if;
  foreach person in array new.recipient_user_ids loop
    for device_row in select id,registration_generation from public.devices
      where user_id=person and active and permission='granted' and push_token is not null loop
      perform gm23_private.ensure_delivery(new.id,person,device_row.id,device_row.registration_generation,new.expires_at);
    end loop;
  end loop;
  return new;
end $$;
drop trigger if exists gm23_event_delivery on public.events;
create trigger gm23_event_delivery after insert on public.events
  for each row execute function gm23_private.event_deliveries();

create or replace function gm23_private.device_deliveries() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare event_row record;
begin
  if new.active and new.permission='granted' and new.push_token is not null then
    for event_row in select e.id,e.expires_at from public.events e
      where e.kind in ('ROOM_INVITED','ROOM_RESULT_READY') and new.user_id=any(e.recipient_user_ids) and e.expires_at>clock_timestamp() loop
      perform gm23_private.ensure_delivery(event_row.id,new.user_id,new.id,new.registration_generation,event_row.expires_at);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists gm23_device_delivery on public.devices;
create trigger gm23_device_delivery after insert or update of active,push_token,permission,registration_generation
  on public.devices for each row execute function gm23_private.device_deliveries();


create or replace function public.claim_push_deliveries(batch_size integer default 100)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare delivery_row record; meta gm23_private.delivery_meta%rowtype; lease uuid; rows jsonb:='[]'::jsonb; now_at timestamptz:=clock_timestamp();
begin
  perform gm23_private.service_only();
  if batch_size is null or batch_size<1 or batch_size>100 then raise sqlstate '22023' using message='INVALID_INPUT'; end if;
  for delivery_row in select delivery_src.id,delivery_src.event_id,delivery_src.recipient_user_id,delivery_src.device_id,delivery_src.attempts,delivery_src.expires_at,event_src.kind,event_src.room_id,event_src.invitation_id,coalesce(event_src.dish_v4_result_id,event_src.result_id) as result_id,event_src.dedupe_key,device_src.push_token,device_src.registration_generation,device_src.session_id
    from public.deliveries delivery_src join public.events event_src on event_src.id=delivery_src.event_id join public.devices device_src on device_src.id=delivery_src.device_id
    join gm23_private.delivery_meta meta_src on meta_src.delivery_id=delivery_src.id
    where (event_src.kind='ROOM_RESULT_READY' or (event_src.kind='ROOM_INVITED' and exists(select 1 from public.room_invitations live_inv join public.rooms live_room on live_room.id=live_inv.room_id where live_inv.id=event_src.invitation_id and live_inv.state='pending' and live_inv.expires_at>now_at and live_room.state='LOBBY' and live_room.expires_at>now_at))) and event_src.expires_at>now_at and delivery_src.state='pending' and delivery_src.ticket_id is null and delivery_src.expires_at>now_at
      and meta_src.next_attempt_at<=now_at and (meta_src.lease_until is null or meta_src.lease_until<=now_at)
      and device_src.active and device_src.permission='granted' and device_src.push_token is not null
      and gm23_private.session_valid(device_src.user_id,device_src.session_id)
    order by delivery_src.id for update of delivery_src,meta_src skip locked limit batch_size loop
    lease:=gen_random_uuid();
    update gm23_private.delivery_meta set lease_id=lease,lease_until=now_at+interval '120 seconds',
      registration_generation=delivery_row.registration_generation,last_error=null,version=gm23_private.delivery_meta.version+1 where gm23_private.delivery_meta.delivery_id=delivery_row.id returning * into meta;
    update public.deliveries set attempts=public.deliveries.attempts+1,last_attempt_at=now_at,version=public.deliveries.version+1 where public.deliveries.id=delivery_row.id;
    rows:=rows||jsonb_build_array(jsonb_build_object('deliveryId',delivery_row.id,'leaseId',lease,'leaseUntil',meta.lease_until,'eventId',delivery_row.event_id,
      'kind',delivery_row.kind,'roomId',delivery_row.room_id,'invitationId',delivery_row.invitation_id,'resultId',delivery_row.result_id,
      'dedupeKey',delivery_row.dedupe_key,'token',delivery_row.push_token,'registrationGeneration',delivery_row.registration_generation,
      'attempt',delivery_row.attempts+1,'expiresAt',delivery_row.expires_at)||coalesce(gm23_private.notification_metadata(delivery_row.event_id),'{}'::jsonb));
  end loop;
  return rows;
exception when sqlstate 'PT403' then raise;
end $$;

revoke execute on all functions in schema gm23_private from public,anon,authenticated,service_role,gm06_publisher;
do $$ declare key uuid; begin
 for key in select result_id from gm20_canonical_private.terminal_outbox where expires_at>clock_timestamp() order by result_id loop
 perform gm23_private.materialize_terminal(key); end loop;
end $$;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.15.0','food-v1/roadmap-v2/GM-23.2','1.1.0','1.1.0','GM20.4/0035; GM21.3/0036; GM22.2/0037');
commit;
