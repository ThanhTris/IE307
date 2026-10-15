-- GM-23.1 inbox, push-device ownership, delivery leases and trusted sender.
-- GM-20 owns 0023_finalize.sql; this migration is intentionally 0025.
begin;

create schema if not exists gm23_private;
revoke all on schema gm23_private from public, anon, authenticated, service_role;
alter default privileges in schema gm23_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema gm23_private revoke execute on functions from public, anon, authenticated, service_role;

alter table public.devices add column if not exists session_id uuid;
alter table public.devices add column if not exists registration_generation bigint not null default 1;
alter table public.devices add constraint devices_registration_generation_shape
  check (registration_generation >= 1);
create unique index if not exists devices_active_token_uq
  on public.devices(push_token) where active and push_token is not null;

create table gm23_private.delivery_meta (
  delivery_id uuid primary key references public.deliveries(id) on delete cascade,
  registration_generation bigint not null default 1,
  lease_id uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default transaction_timestamp(),
  provider_ticket_at timestamptz,
  last_error text,
  version bigint not null default 1,
  check (registration_generation >= 1),
  check (isfinite(lease_until)),
  check (isfinite(next_attempt_at)),
  check (isfinite(provider_ticket_at)),
  check (version >= 1)
);
alter table gm23_private.delivery_meta enable row level security;
alter table gm23_private.delivery_meta force row level security;
revoke all on gm23_private.delivery_meta from public, anon, authenticated, service_role, gm06_publisher;

create index if not exists gm23_delivery_meta_due_idx
  on gm23_private.delivery_meta(next_attempt_at, lease_until);
create index if not exists gm23_delivery_meta_lease_idx
  on gm23_private.delivery_meta(lease_until);

create or replace function gm23_private.error(code text, status integer, room uuid default null, request_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, gm23_private as $$
begin
  perform set_config('response.status',status::text,true);
  return jsonb_build_object('ok',false,'messageKey',code,'requestId',request_id,
    'roomId',room,'error',jsonb_build_object('messageKey',code),
    'retryAfterSeconds',case when status=429 then 60 else null end);
end $$;

create or replace function gm23_private.expo_token(value text) returns boolean
language sql immutable security definer set search_path = pg_catalog as $$
  select value is not null and length(value) between 20 and 256
    and value !~ '[[:cntrl:]]'
    and value ~ '^(ExponentPushToken|ExpoPushToken)\[[^]]+\]$'
$$;

create or replace function gm23_private.jwt_session() returns uuid
language plpgsql stable security definer set search_path = pg_catalog as $$
declare claims jsonb; value text;
begin
  claims:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
  value:=claims->>'session_id';
  return gm19_private.uuid_or_null(value);
exception when others then return null;
end $$;

create or replace function gm23_private.session_valid(user_key uuid, session_key uuid) returns boolean
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if session_key is null then return false; end if;
  -- The disposable SQL fixture has only auth.users/auth.uid. Real GoTrue
  -- installations expose auth.sessions, where not_after is checked.
  if to_regclass('auth.sessions') is null then return exists(select 1 from auth.users where id=user_key);
  end if;
  return exists(select 1 from auth.sessions s where s.id=session_key and s.user_id=user_key
    and (s.not_after is null or s.not_after>clock_timestamp()));
end $$;

create or replace function gm23_private.service_only() returns void
language plpgsql security definer set search_path = pg_catalog as $$
declare claims jsonb; role_value text;
begin
  -- PostgREST exposes the role both as the legacy scalar GUC and, depending
  -- on the gateway version, only inside request.jwt.claims. Accept either
  -- representation but never trust a caller supplied body field.
  role_value:=nullif(current_setting('request.jwt.claim.role',true),'');
  if role_value is null then
    claims:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
    role_value:=claims->>'role';
  end if;
  if role_value<>'service_role' then
    raise sqlstate 'PT403' using message='SENDER_FORBIDDEN';
  end if;
end $$;

create or replace function gm23_private.ensure_delivery(event_key uuid, recipient uuid, device_key uuid, generation_key bigint, expiry timestamptz)
returns void language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare delivery_key uuid;
begin
  if expiry<=clock_timestamp() then return; end if;
  insert into public.deliveries(id,event_id,recipient_user_id,device_id,state,attempts,ticket_id,receipt_id,last_attempt_at,expires_at,version)
    values(gen_random_uuid(),event_key,recipient,device_key,'pending',0,null,null,null,least(expiry,clock_timestamp()+interval '7 days'),1)
    on conflict (event_id,recipient_user_id,device_id) do update set
      state=case when public.deliveries.state in ('expired','failed') and public.deliveries.expires_at>clock_timestamp()
        and exists(select 1 from gm23_private.delivery_meta existing_meta where existing_meta.delivery_id=public.deliveries.id and existing_meta.registration_generation is distinct from generation_key)
        then 'pending' else public.deliveries.state end,
      attempts=case when public.deliveries.state in ('expired','failed') and public.deliveries.expires_at>clock_timestamp()
        and exists(select 1 from gm23_private.delivery_meta existing_meta where existing_meta.delivery_id=public.deliveries.id and existing_meta.registration_generation is distinct from generation_key)
        then 0 else public.deliveries.attempts end,
      ticket_id=case when public.deliveries.state in ('expired','failed') and public.deliveries.expires_at>clock_timestamp()
        and exists(select 1 from gm23_private.delivery_meta existing_meta where existing_meta.delivery_id=public.deliveries.id and existing_meta.registration_generation is distinct from generation_key)
        then null else public.deliveries.ticket_id end,
      receipt_id=case when public.deliveries.state in ('expired','failed') and public.deliveries.expires_at>clock_timestamp()
        and exists(select 1 from gm23_private.delivery_meta existing_meta where existing_meta.delivery_id=public.deliveries.id and existing_meta.registration_generation is distinct from generation_key)
        then null else public.deliveries.receipt_id end,
      last_attempt_at=case when public.deliveries.state in ('expired','failed') and public.deliveries.expires_at>clock_timestamp()
        and exists(select 1 from gm23_private.delivery_meta existing_meta where existing_meta.delivery_id=public.deliveries.id and existing_meta.registration_generation is distinct from generation_key)
        then null else public.deliveries.last_attempt_at end,
      expires_at=least(public.deliveries.expires_at,excluded.expires_at),
      version=public.deliveries.version+1
    returning id into delivery_key;
  if delivery_key is not null then
    insert into gm23_private.delivery_meta(delivery_id,registration_generation,next_attempt_at)
      values(delivery_key,generation_key,clock_timestamp()) on conflict (delivery_id) do update set
        registration_generation=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation then excluded.registration_generation else gm23_private.delivery_meta.registration_generation end,
        next_attempt_at=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation
          and exists(select 1 from public.deliveries delivery_state where delivery_state.id=delivery_key and delivery_state.state='pending') then clock_timestamp() else gm23_private.delivery_meta.next_attempt_at end,
        lease_id=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation
          and exists(select 1 from public.deliveries delivery_state where delivery_state.id=delivery_key and delivery_state.state='pending') then null else gm23_private.delivery_meta.lease_id end,
        lease_until=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation
          and exists(select 1 from public.deliveries delivery_state where delivery_state.id=delivery_key and delivery_state.state='pending') then null else gm23_private.delivery_meta.lease_until end,
        last_error=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation
          and exists(select 1 from public.deliveries delivery_state where delivery_state.id=delivery_key and delivery_state.state='pending') then null else gm23_private.delivery_meta.last_error end,
        version=case when gm23_private.delivery_meta.registration_generation is distinct from excluded.registration_generation then gm23_private.delivery_meta.version+1 else gm23_private.delivery_meta.version end;
  end if;
end $$;

create or replace function gm23_private.event_deliveries() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare person uuid; device_row record;
begin
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
      where new.user_id=any(e.recipient_user_ids) and e.expires_at>clock_timestamp() loop
      perform gm23_private.ensure_delivery(event_row.id,new.user_id,new.id,new.registration_generation,event_row.expires_at);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists gm23_device_delivery on public.devices;
create trigger gm23_device_delivery after insert or update of active,push_token,permission,registration_generation
  on public.devices for each row execute function gm23_private.device_deliveries();

-- Existing committed events are eligible for a newly registered device.
do $$ declare d record; e record; begin
  for d in select id,user_id,registration_generation from public.devices
    where active and permission='granted' and push_token is not null loop
    for e in select id,expires_at from public.events where d.user_id=any(recipient_user_ids) and expires_at>clock_timestamp() loop
      perform gm23_private.ensure_delivery(e.id,d.user_id,d.id,d.registration_generation,e.expires_at);
    end loop;
  end loop;
end $$;

create or replace function public.register_push_device("requestId" text, device_id text, token text, permission text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm23_private as $$
declare caller uuid:=gm19_private.require_auth(); req uuid; session_key uuid; normalized text; active_value boolean; stored_token text;
  payload jsonb; payload_key text; ack jsonb; current public.devices%rowtype; other public.devices%rowtype; new_generation bigint; wire jsonb; unchanged boolean;
begin
  begin req:=gm19_private.request_uuid("requestId"); session_key:=gm23_private.jwt_session(); exception when others then return gm23_private.error('INVALID_INPUT',400); end;
  if device_id is null or length(btrim(device_id))<1 or length(btrim(device_id))>256 or device_id~'[[:cntrl:]]' then return gm23_private.error('INVALID_INPUT',400,null,req); end if;
  if permission not in ('granted','denied','provisional','unknown') then return gm23_private.error('INVALID_INPUT',400,null,req); end if;
  normalized:=case when permission='granted' then 'granted' when permission='denied' then 'denied' else 'unknown' end;
  active_value:=normalized='granted'; stored_token:=case when active_value then token else null end;
  if active_value and not gm23_private.expo_token(stored_token) then return gm23_private.error('INVALID_INPUT',400,null,req); end if;
  if not gm23_private.session_valid(caller,session_key) then return gm23_private.error('AUTH_REQUIRED',401,null,req); end if;
  payload:=jsonb_build_object('deviceId',device_id,'token',stored_token,'permission',normalized);
  payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('register_push_device',req,payload_key);
  if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,req); end if;
  if not gm19_private.allow_call('register_push_device',30) then return gm23_private.error('RATE_LIMITED',429,null,req); end if;
  -- A token has one active owner. Rotate the old owner before the unique index is touched.
  if stored_token is not null then
    for other in select * from public.devices where push_token=stored_token and active
      and not(user_id=caller and device_key=device_id) for update loop
      update public.deliveries set state='expired',version=public.deliveries.version+1
        where public.deliveries.device_id=other.id and public.deliveries.state='pending';
      update public.devices set active=false,push_token=null,permission='unknown',
        registration_generation=public.devices.registration_generation+1,version=public.devices.version+1 where public.devices.id=other.id;
    end loop;
  end if;
  select * into current from public.devices where user_id=caller and device_key=device_id for update;
  if found then
    unchanged:=current.active is not distinct from active_value
      and current.push_token is not distinct from stored_token
      and current.permission is not distinct from normalized
      and current.session_id is not distinct from session_key;
    new_generation:=case when unchanged then current.registration_generation else current.registration_generation+1 end;
    if not unchanged then
       update public.deliveries set state='expired',version=public.deliveries.version+1
        where public.deliveries.device_id=current.id and public.deliveries.state='pending';
    end if;
    update public.devices set session_id=session_key,push_token=stored_token,permission=normalized,active=active_value,
      registration_generation=new_generation,last_seen_at=clock_timestamp(),version=public.devices.version+1 where public.devices.id=current.id;
  else
    new_generation:=1;
    insert into public.devices(id,user_id,device_key,platform,push_token,permission,active,created_at,last_seen_at,version,session_id,registration_generation)
      values(gen_random_uuid(),caller,btrim(device_id),'android',stored_token,normalized,active_value,clock_timestamp(),clock_timestamp(),1,session_key,new_generation);
  end if;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null);
  perform gm19_private.save_ack('register_push_device',req,payload_key,null,null,null,1,wire);
  return wire;
exception when sqlstate 'PT401' then return gm23_private.error('AUTH_REQUIRED',401,null,req);
end $$;

create or replace function public.unregister_push_device("requestId" text, device_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm23_private as $$
declare caller uuid:=gm19_private.require_auth(); req uuid; current public.devices%rowtype; payload_key text; ack jsonb; wire jsonb;
begin
  begin req:=gm19_private.request_uuid("requestId"); exception when others then return gm23_private.error('INVALID_INPUT',400); end;
  if device_id is null or length(btrim(device_id))<1 or length(btrim(device_id))>256 or device_id~'[[:cntrl:]]' then return gm23_private.error('INVALID_INPUT',400,null,req); end if;
  payload_key:=gm19_private.hash_payload(jsonb_build_object('deviceId',device_id)); ack:=gm19_private.ack_lookup('unregister_push_device',req,payload_key);
  if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,req); end if;
  if not gm19_private.allow_call('unregister_push_device',30) then return gm23_private.error('RATE_LIMITED',429,null,req); end if;
  select * into current from public.devices where user_id=caller and device_key=device_id for update;
  if found then
    update public.deliveries set state='expired',version=public.deliveries.version+1 where public.deliveries.device_id=current.id and public.deliveries.state='pending';
    update public.devices set active=false,push_token=null,permission='unknown',session_id=null,
      registration_generation=public.devices.registration_generation+1,last_seen_at=clock_timestamp(),version=public.devices.version+1 where public.devices.id=current.id;
  end if;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null);
  perform gm19_private.save_ack('unregister_push_device',req,payload_key,null,null,null,1,wire); return wire;
exception when sqlstate 'PT401' then return gm23_private.error('AUTH_REQUIRED',401,null,req);
end $$;

-- Trusted sender boundary. The token is only returned to service_role and never
-- granted to an authenticated client or exposed by the public device projection.
create or replace function public.claim_push_deliveries(batch_size integer default 100)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare delivery_row record; meta gm23_private.delivery_meta%rowtype; lease uuid; rows jsonb:='[]'::jsonb; now_at timestamptz:=clock_timestamp();
begin
  perform gm23_private.service_only();
  if batch_size is null or batch_size<1 or batch_size>100 then raise sqlstate '22023' using message='INVALID_INPUT'; end if;
  for delivery_row in select delivery_src.id,delivery_src.event_id,delivery_src.recipient_user_id,delivery_src.device_id,delivery_src.attempts,delivery_src.expires_at,event_src.kind,event_src.room_id,event_src.invitation_id,event_src.result_id,event_src.dedupe_key,device_src.push_token,device_src.registration_generation,device_src.session_id
    from public.deliveries delivery_src join public.events event_src on event_src.id=delivery_src.event_id join public.devices device_src on device_src.id=delivery_src.device_id
    join gm23_private.delivery_meta meta_src on meta_src.delivery_id=delivery_src.id
    where delivery_src.state='pending' and delivery_src.ticket_id is null and delivery_src.expires_at>now_at
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
      'attempt',delivery_row.attempts+1,'expiresAt',delivery_row.expires_at));
  end loop;
  return rows;
exception when sqlstate 'PT403' then raise;
end $$;

create or replace function public.complete_push_delivery(delivery_id uuid, lease_id uuid, ticket_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare m gm23_private.delivery_meta%rowtype; d public.deliveries%rowtype;
begin
  perform gm23_private.service_only();
  if ticket_id is null or length(btrim(ticket_id))<1 or length(ticket_id)>256 then raise sqlstate '22023' using message='INVALID_INPUT'; end if;
  select * into m from gm23_private.delivery_meta where gm23_private.delivery_meta.delivery_id=complete_push_delivery.delivery_id for update;
  if not found or m.lease_id is distinct from complete_push_delivery.lease_id or m.lease_until<=clock_timestamp() then return jsonb_build_object('ok',false,'messageKey','LEASE_LOST'); end if;
  select * into d from public.deliveries where id=complete_push_delivery.delivery_id for update;
  if d.id is null or not exists(select 1 from public.devices dev where dev.id=d.device_id and dev.registration_generation=m.registration_generation and dev.active) then
    update public.deliveries set state='expired',version=public.deliveries.version+1 where public.deliveries.id=d.id; return jsonb_build_object('ok',false,'messageKey','REGISTRATION_REVOKED');
  end if;
  update public.deliveries set ticket_id=complete_push_delivery.ticket_id,version=public.deliveries.version+1 where public.deliveries.id=d.id;
  update gm23_private.delivery_meta set provider_ticket_at=clock_timestamp(),lease_id=null,lease_until=null,version=gm23_private.delivery_meta.version+1 where gm23_private.delivery_meta.delivery_id=d.id;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.fail_push_delivery(delivery_id uuid, lease_id uuid, reason text, retry_after_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare m gm23_private.delivery_meta%rowtype; d public.deliveries%rowtype; delay_seconds integer;
begin
  perform gm23_private.service_only();
  select * into m from gm23_private.delivery_meta where gm23_private.delivery_meta.delivery_id=fail_push_delivery.delivery_id for update;
  if not found or m.lease_id is distinct from fail_push_delivery.lease_id or m.lease_until<=clock_timestamp() then return jsonb_build_object('ok',false,'messageKey','LEASE_LOST'); end if;
  select * into d from public.deliveries where id=fail_push_delivery.delivery_id for update;
  if d.id is null then return jsonb_build_object('ok',false,'messageKey','DELIVERY_GONE'); end if;
  delay_seconds:=greatest(60,least(3600,coalesce(retry_after_seconds,(power(2,greatest(d.attempts-1,0))::integer*60))));
  if d.expires_at<=clock_timestamp() or d.attempts>=5 or lower(coalesce(reason,'')) in ('devicenotregistered','invalidcredential','invalidinput') then
    update public.deliveries set state=case when d.expires_at<=clock_timestamp() then 'expired' else 'failed' end,version=public.deliveries.version+1 where public.deliveries.id=d.id;
  end if;
  if lower(coalesce(reason,''))='devicenotregistered' then
    update public.devices set active=false,push_token=null,permission='unknown',registration_generation=public.devices.registration_generation+1,version=public.devices.version+1
      where public.devices.id=d.device_id and public.devices.registration_generation=m.registration_generation;
  end if;
  update gm23_private.delivery_meta set last_error=left(coalesce(reason,'provider_error'),256),next_attempt_at=clock_timestamp()+make_interval(secs=>delay_seconds),lease_id=null,lease_until=null,version=gm23_private.delivery_meta.version+1 where gm23_private.delivery_meta.delivery_id=d.id;
  return jsonb_build_object('ok',true,'retryAfterSeconds',delay_seconds);
end $$;

create or replace function public.record_push_receipt(delivery_id uuid, receipt_id text, receipt_status text, reason text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare d public.deliveries%rowtype; m gm23_private.delivery_meta%rowtype;
begin
  perform gm23_private.service_only();
  if receipt_id is null or receipt_status not in ('ok','error') then raise sqlstate '22023' using message='INVALID_INPUT'; end if;
  select * into d from public.deliveries where id=record_push_receipt.delivery_id for update;
  if d.id is null or d.ticket_id is null then return jsonb_build_object('ok',false,'messageKey','RECEIPT_NOT_READY'); end if;
  select * into m from gm23_private.delivery_meta where gm23_private.delivery_meta.delivery_id=d.id for update;
  update public.deliveries set receipt_id=record_push_receipt.receipt_id,state=case when receipt_status='ok' then 'sent' else 'failed' end,version=public.deliveries.version+1 where public.deliveries.id=d.id;
  update gm23_private.delivery_meta set last_error=case when receipt_status='error' then left(reason,256) else null end,version=gm23_private.delivery_meta.version+1 where gm23_private.delivery_meta.delivery_id=d.id;
  if lower(coalesce(reason,''))='devicenotregistered' then
     update public.devices set active=false,push_token=null,permission='unknown',registration_generation=public.devices.registration_generation+1,version=public.devices.version+1
       where public.devices.id=d.device_id and public.devices.registration_generation=m.registration_generation;
  end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.claim_push_receipts(batch_size integer default 100)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm23_private as $$
declare receipt_row record; m gm23_private.delivery_meta%rowtype; lease uuid; rows jsonb:='[]'::jsonb; now_at timestamptz:=clock_timestamp();
begin
  perform gm23_private.service_only();
  if batch_size is null or batch_size<1 or batch_size>100 then raise sqlstate '22023' using message='INVALID_INPUT'; end if;
  for receipt_row in select delivery_src.id,delivery_src.ticket_id,delivery_src.expires_at
    from public.deliveries delivery_src join gm23_private.delivery_meta meta_src on meta_src.delivery_id=delivery_src.id
    where delivery_src.ticket_id is not null and delivery_src.receipt_id is null and delivery_src.expires_at>now_at
      and meta_src.provider_ticket_at<=now_at-interval '15 minutes'
      and (meta_src.lease_until is null or meta_src.lease_until<=now_at)
    order by delivery_src.id for update of delivery_src,meta_src skip locked limit batch_size loop
    lease:=gen_random_uuid();
    update gm23_private.delivery_meta set lease_id=lease,lease_until=now_at+interval '120 seconds',version=gm23_private.delivery_meta.version+1 where gm23_private.delivery_meta.delivery_id=receipt_row.id returning * into m;
    rows:=rows||jsonb_build_array(jsonb_build_object('deliveryId',receipt_row.id,'leaseId',lease,'leaseUntil',m.lease_until,'ticketId',receipt_row.ticket_id,'expiresAt',receipt_row.expires_at));
  end loop;
  return rows;
end $$;

revoke all on function public.register_push_device(text,text,text,text),public.unregister_push_device(text,text) from public,anon,authenticated,service_role;
grant execute on function public.register_push_device(text,text,text,text),public.unregister_push_device(text,text) to authenticated;
revoke all on function public.claim_push_deliveries(integer),public.complete_push_delivery(uuid,uuid,text),public.fail_push_delivery(uuid,uuid,text,integer),public.record_push_receipt(uuid,text,text,text) from public,anon,authenticated,service_role;
revoke all on function public.claim_push_receipts(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_push_deliveries(integer),public.claim_push_receipts(integer),public.complete_push_delivery(uuid,uuid,text),public.fail_push_delivery(uuid,uuid,text,integer),public.record_push_receipt(uuid,text,text,text) to service_role;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.7.0','food-v1/roadmap-v2/GM-23.1','1.1.0','1.1.0','ce7b87a: GM-21 merged on main')
on conflict (schema_version) do nothing;
commit;
