-- GM-21.2 lifecycle/finalization integration, on frozen GM19/GM20.3.
-- New forward migration: do not rewrite deployed upstream migrations.
begin;
create or replace function gm21_private.invalidate(room uuid) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;
begin
 -- Caller already owns reference_epoch, including the GM-06 statement trigger.
 select * into r from public.rooms where id=room for update;
 if not found or r.state<>'LOBBY' or r.expires_at<=statement_timestamp() then return;end if;
 -- Initial membership before any evaluated pool/ready state needs no invalidation.
 if r.evaluated_at is null and not exists(select 1 from public.members where room_id=room and ready)
   and not exists(select 1 from gm21_private.recent_snapshots where room_id=room)
   and not exists(select 1 from public.round_dishes where room_id=room) then return;end if;
 delete from gm21_private.recent_snapshots where room_id=room;
 update public.members set ready=false,version=version+1 where room_id=room and ready;
 update public.rooms set context_version=context_version+1,updated_at=greatest(updated_at,statement_timestamp()),version=version+1 where id=room;
end$$;

create or replace function gm21_private.prepare_consents(room uuid,expected_version bigint) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;m record;s record;
begin
 perform gm17_private.require_room(room,expected_version,false);
 select * into r from public.rooms where id=room;
 if r.state<>'LOBBY' then raise sqlstate 'PT409' using message='ROOM_LOCKED';end if;
 for m in select * from public.members where room_id=room and left_at is null order by user_id loop
  if not m.history_consent then continue;end if;
  for s in select * from gm21_private.settings where user_id=m.user_id and enabled loop
   insert into public.consents as existing(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version)
   values(gen_random_uuid(),m.user_id,room,s.scope||'_history',true,statement_timestamp(),null,statement_timestamp()+interval '30 days',1)
   on conflict on constraint consents_unique_1 do update set enabled=true,granted_at=excluded.granted_at,revoked_at=null,expires_at=excluded.expires_at,version=existing.version+1 where not existing.enabled or existing.revoked_at is not null or existing.expires_at<=statement_timestamp();
  end loop;
 end loop;
end$$;

alter function gm19_private.pool_for_room(uuid,uuid[],jsonb) rename to pool_without_history;
create function gm19_private.pool_for_room(room_key uuid, trusted_recent_dish_ids uuid[] default '{}', trusted_context jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; recent uuid[]:='{}'; data jsonb;
begin
 select * into r from public.rooms where id=room_key;
 if found and r.state='LOBBY' then
  if exists(select 1 from public.members where room_id=room_key and user_id=auth.uid() and left_at is null) then
   perform gm21_private.prepare_consents(room_key,r.version);
  end if;
  recent:=gm21_private.recent_dishes(room_key);
 elsif found then
  recent:=gm21_private.recent_dishes(room_key);
 end if;
 -- A not-yet-created room has no group history. Caller cannot supply recents.
 data:=gm19_private.pool_without_history(room_key,recent,trusted_context);
 -- No published dataset is an empty catalogue, with the same sentinel used
 -- by GM19 create_room; never write a null dataset version into an existing room.
 return data||jsonb_build_object('datasetVersion',case when data->>'datasetVersion'~'^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' then data->>'datasetVersion' else coalesce(r.dataset_version,'0.0.0') end);
end $$;
create function gm21_private.start_snapshot() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if old.state='LOBBY' and new.state='ROUND_1' then
  insert into gm21_private.recent_snapshots values(old.id,gm21_private.group_key(gm21_private.roster(old.id)),gm21_private.roster(old.id),gm21_private.recent_dishes(old.id),old.context_version,statement_timestamp())
  on conflict on constraint recent_snapshots_pkey do update set group_key=excluded.group_key,roster=excluded.roster,dish_ids=excluded.dish_ids,context_version=excluded.context_version,frozen_at=excluded.frozen_at;
 end if;
 return new;
end $$;
create trigger gm21_start_snapshot before update of state on public.rooms
 for each row execute function gm21_private.start_snapshot();
-- A room-level flag changes the common recent input, even if global settings
-- did not change. Started snapshots are intentionally immutable.
drop trigger gm21_roster_change on public.members;
create or replace function gm21_private.roster_changed() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if TG_OP='UPDATE' and new.left_at is not distinct from old.left_at and new.history_consent is not distinct from old.history_consent then return new;end if;
 if TG_OP='INSERT' and not new.ready and (select count(*) from public.members where room_id=new.room_id and left_at is null)=1
   and not exists(select 1 from gm21_private.recent_snapshots where room_id=new.room_id) then return new;end if;
 perform gm21_private.invalidate(case when TG_OP='DELETE' then old.room_id else new.room_id end);
 return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger gm21_roster_change after insert or delete or update of left_at,history_consent on public.members
 for each row execute function gm21_private.roster_changed();
create or replace function public.update_history_consent("requestId" text default null,scope text default null,consent jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare reply jsonb;denial text;payload jsonb;enabled_value boolean;room uuid;other_enabled boolean;changed boolean;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then return gm21_private.error('AUTH_REQUIRED',401);end if;
 if "requestId" is null or "requestId"!~'^[A-Za-z0-9_-]{1,128}$' or coalesce(scope,'') not in ('personal','group') or consent is null or jsonb_typeof(consent)<>'boolean' then return gm21_private.error('INVALID_INPUT',400);end if;
 payload:=jsonb_build_object('scope',scope,'consent',consent);enabled_value:=consent::boolean;
 reply:=gm21_private.write_ack('update_history_consent',"requestId",payload);if reply is not null then return reply;end if;
 denial:=gm21_private.authorize('update_history_consent');if denial is not null then return gm21_private.error(denial,429,"requestId");end if;
 select s.enabled is distinct from enabled_value into changed from gm21_private.settings s where s.user_id=auth.uid() and s.scope=$2;
 changed:=coalesce(changed,true);
 insert into gm21_private.settings as s values(auth.uid(),scope,enabled_value,statement_timestamp(),1)
 on conflict on constraint settings_pkey do update set enabled=excluded.enabled,changed_at=excluded.changed_at,version=s.version+1;
 if not enabled_value then
  insert into gm21_private.recordings select h.result_id,max(h.finalized_at)+interval '30 days' from public.histories h
   where ($2='personal' and h.scope='personal' and h.owner_user_id=auth.uid()) or ($2='group' and h.scope='group' and auth.uid()=any(h.member_user_ids))
   group by h.result_id on conflict do nothing;
  delete from public.histories h where ($2='personal' and h.scope='personal' and h.owner_user_id=auth.uid())
    or ($2='group' and h.scope='group' and auth.uid()=any(h.member_user_ids));
  update public.consents c set enabled=false,revoked_at=statement_timestamp(),version=version+1
   where c.user_id=auth.uid() and c.scope=$2||'_history' and c.enabled;
 end if;
 if changed then
  for room in select r.id from public.rooms r join public.members m on m.room_id=r.id
    where m.user_id=auth.uid() and m.left_at is null and r.state='LOBBY' and r.expires_at>statement_timestamp() order by r.id loop
   select exists(select 1 from gm21_private.settings s where s.user_id=auth.uid() and s.enabled) into other_enabled;
   update public.members set history_consent=other_enabled,version=version+1 where room_id=room and user_id=auth.uid() and history_consent is distinct from other_enabled;
   perform gm21_private.invalidate(room);
   perform gm19_private.refresh_lobby_pool(room);
  end loop;
 end if;
 return gm21_private.save_ack('update_history_consent',"requestId",payload);
end$$;
create or replace function public.delete_history("requestId" text default null,history_id text default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare reply jsonb;payload jsonb;denial text;old_group text;room uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then return gm21_private.error('AUTH_REQUIRED',401);end if;
 if "requestId" is null or "requestId"!~'^[A-Za-z0-9_-]{1,128}$' or history_id is null or history_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return gm21_private.error('INVALID_INPUT',400);end if;
 payload:=jsonb_build_object('historyId',history_id::uuid);
 reply:=gm21_private.write_ack('delete_history',"requestId",payload);if reply is not null then return reply;end if;
 denial:=gm21_private.authorize('delete_history');if denial is not null then return gm21_private.error(denial,429,"requestId");end if;
 insert into gm21_private.recordings select h.result_id,h.finalized_at+interval '30 days' from public.histories h where h.id=history_id::uuid and
  ((h.scope='personal' and h.owner_user_id=auth.uid()) or (h.scope='group' and auth.uid()=any(h.member_user_ids))) on conflict do nothing;
 delete from public.histories h where h.id=history_id::uuid and
   ((h.scope='personal' and h.owner_user_id=auth.uid()) or (h.scope='group' and auth.uid()=any(h.member_user_ids))) returning case when h.scope='group' then h.group_key else null end into old_group;
 if old_group is not null then
  for room in select r.id from public.rooms r where r.state='LOBBY' and r.expires_at>statement_timestamp()
   and gm21_private.group_key(gm21_private.roster(r.id))=old_group order by r.id loop perform gm21_private.invalidate(room);perform gm19_private.refresh_lobby_pool(room);end loop;
 end if;
 -- Missing/other owner's ID is the same successful no-op; no existence oracle.
 return gm21_private.save_ack('delete_history',"requestId",payload);
end$$;

create or replace function gm20_private.write_history(room_key uuid,result_key uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; result_row public.results%rowtype; card jsonb; person uuid; c public.consents%rowtype; cs uuid[]:='{}'; until_at timestamptz; opted boolean; all_opted boolean:=true;
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 if exists(select 1 from gm21_private.recordings where result_id=result_key) then return; end if;
 select * into r from public.rooms where id=room_key for update;
 select * into result_row from public.results where id=result_key;
 if result_row.room_id is distinct from room_key or result_row.finalized_at>clock_timestamp() or result_row.finalized_at+interval '30 days'<=statement_timestamp() then return; end if;
 insert into gm21_private.recordings values(result_key,result_row.finalized_at+interval '30 days') on conflict do nothing;
 if result_row.winner_round_dish_id is null then return; end if;
 select projection into card from gm19_private.pool_snapshots where round_dish_id=result_row.winner_round_dish_id;
 -- Lock consent rows before evaluating them. Reference epoch serializes writers.
 perform 1 from public.consents where user_id=any(r.roster_user_ids) and (room_id=r.id or (room_id is null and not retention_detached)) order by id for update;
 until_at:=result_row.finalized_at+interval '30 days';
 foreach person in array r.roster_user_ids loop
  select coalesce(bool_or(value->>'historyConsent'='true'),false) into opted from jsonb_array_elements(r.consent_snapshot) where value->>'userId'=person::text;
  if opted then
   select * into c from public.consents where user_id=person and not exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='personal' and not st.enabled) and scope='personal_history' and (room_id=r.id or (room_id is null and not retention_detached)) and enabled and revoked_at is null and granted_at<=result_row.finalized_at and (expires_at is null or expires_at>result_row.finalized_at) order by (room_id=r.id) desc nulls last limit 1;
   if found then
    insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
    values(gen_random_uuid(),'personal',person,array[person],gm20_private.group_key(array[person]),result_key,(card->>'dishId')::uuid,card->>'name',r.meal_slot,result_row.match_tier,result_row.finalized_at,least(result_row.finalized_at+interval '30 days',coalesce(c.expires_at,'infinity')),array[c.id],1) on conflict on constraint histories_unique_1 do nothing;
   end if;
  end if;
  select * into c from public.consents where user_id=person and not exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='group' and not st.enabled) and scope='group_history' and (room_id=r.id or (room_id is null and not retention_detached)) and enabled and revoked_at is null and granted_at<=result_row.finalized_at and (expires_at is null or expires_at>result_row.finalized_at) order by (room_id=r.id) desc nulls last limit 1;
  if not opted or not found then all_opted:=false; else cs:=array_append(cs,c.id); until_at:=least(until_at,coalesce(c.expires_at,'infinity')); end if;
 end loop;
 if all_opted then
  insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
  values(gen_random_uuid(),'group',null,r.roster_user_ids,gm20_private.group_key(r.roster_user_ids),result_key,(card->>'dishId')::uuid,card->>'name',r.meal_slot,result_row.match_tier,result_row.finalized_at,until_at,cs,1) on conflict on constraint histories_unique_1 do nothing;
 end if;
end $$;

revoke execute on function gm19_private.pool_for_room(uuid,uuid[],jsonb),gm19_private.pool_without_history(uuid,uuid[],jsonb),gm21_private.start_snapshot(),gm20_private.write_history(uuid,uuid) from public,anon,authenticated,service_role;
comment on schema gm21_private is 'GM21.2 history/consent; actual GM19 pool/start and GM20 atomic writer integration';
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.6.0','food-v1/roadmap-v2/GM-21.2','1.1.0','1.1.0','ad8478d: GM19 + GM20.3 + GM22');
commit;
