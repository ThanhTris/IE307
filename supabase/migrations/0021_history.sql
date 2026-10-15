-- GM-21.1 independent history/consent API. GM-19/20 consume private ports later.
begin;
-- Multiple retained meals may detach consents for the same user/scope. Keep
-- scoped uniqueness and one active global row, without merging historical IDs.
alter table public.consents drop constraint consents_unique_1;
alter table public.consents add constraint consents_unique_1 unique(user_id,room_id,scope);
create unique index gm21_active_global_consent on public.consents(user_id,scope)
 where room_id is null and not retention_detached;
create schema gm21_private;
revoke all on schema gm21_private from public,anon,authenticated,service_role;
alter default privileges in schema gm21_private revoke execute on functions from public;
create table gm21_private.settings (
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check(scope in ('personal','group')), enabled boolean not null,
 changed_at timestamptz not null, version bigint not null check(version>0),
 primary key(user_id,scope)
);
-- Minimal GM-07 display fields, not a live-room reference or location snapshot.
create table gm21_private.presentations (
 history_id uuid primary key references public.histories(id) on delete cascade,
 room_id uuid not null,room_code text not null check(room_code~'^[A-HJ-NP-Z2-9]{6}$'),
 member_count int not null check(member_count between 2 and 8)
);
create table gm21_private.recent_snapshots (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 group_key text not null,roster uuid[] not null,dish_ids uuid[] not null check(cardinality(dish_ids)<=3),
 context_version bigint not null,frozen_at timestamptz not null
);
-- Completion receipts prevent retries from recreating deleted/withdrawn summaries.
-- UUID only, independent of operational result retention.
create table gm21_private.recordings (
 result_id uuid primary key,expires_at timestamptz not null
);
insert into gm21_private.recordings select result_id,max(finalized_at)+interval '30 days'
 from public.histories group by result_id;
create table gm21_private.windows (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation text not null,expires_at timestamptz not null,hits int not null,
 primary key(user_id,operation)
);
create index gm21_windows_expiry on gm21_private.windows(expires_at);
create function gm21_private.expired_metadata() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 delete from gm21_private.windows where expires_at<=statement_timestamp();
 delete from gm21_private.recordings where expires_at<=statement_timestamp();
 return null;
end$$;
-- GM-17 retention always issues this DELETE, even with no expired ACK rows.
-- Its existing worker therefore also purges GM-21's own bounded metadata.
create trigger gm21_metadata_retention after delete on public.idempotency
 for each statement execute function gm21_private.expired_metadata();
do $$declare t text;begin
 foreach t in array array['settings','presentations','recent_snapshots','recordings','windows'] loop
 execute format('alter table gm21_private.%I enable row level security',t);
 execute format('alter table gm21_private.%I force row level security',t);
 end loop;
end$$;
revoke all on all tables in schema gm21_private from public,anon,authenticated,service_role;

create function gm21_private.group_key(roster uuid[]) returns text
language sql immutable set search_path=pg_catalog as $$
 select encode(sha256(convert_to('gm21-group-v1:'||coalesce(string_agg(id::text,',' order by id),''),'UTF8')),'hex')
 from (select distinct unnest(roster) id) q;
$$;
create function gm21_private.roster(room uuid) returns uuid[]
language sql stable set search_path=pg_catalog as $$
 select coalesce(array_agg(m.user_id order by m.user_id),'{}') from public.members m
 where m.room_id=room and m.left_at is null;
$$;
create function gm21_private.error(code text,status int,request_id text default null) returns jsonb
language plpgsql volatile set search_path=pg_catalog as $$
begin
 perform set_config('response.status',status::text,true);
 return jsonb_build_object('ok',false,'messageKey',code,'error',jsonb_build_object('messageKey',code))
   ||case when request_id is null then '{}'::jsonb else jsonb_build_object('requestId',request_id) end;
end$$;
create function gm21_private.authorize(op text) returns text
language plpgsql volatile set search_path=pg_catalog as $$
declare used int;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then return 'AUTH_REQUIRED';end if;
 delete from gm21_private.windows where expires_at<=statement_timestamp();
 delete from gm21_private.recordings where expires_at<=statement_timestamp();
 insert into gm21_private.windows as w values(auth.uid(),op,statement_timestamp()+interval '1 minute',1)
 on conflict on constraint windows_pkey do update set hits=w.hits+1 returning hits into used;
 if used>60 then return 'RATE_LIMITED';end if;
 return null;
end$$;
create function gm21_private.invalidate(room uuid) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;
begin
 -- Caller already owns reference_epoch, including the GM-06 statement trigger.
 select * into r from public.rooms where id=room for update;
 if not found or r.state<>'LOBBY' or r.expires_at<=statement_timestamp() then return;end if;
 -- Initial membership before any evaluated pool/ready state needs no invalidation.
 if r.evaluated_at is null and not exists(select 1 from public.members where room_id=room and ready)
   and not exists(select 1 from gm21_private.recent_snapshots where room_id=room) then return;end if;
 delete from gm21_private.recent_snapshots where room_id=room;
 update public.members set ready=false,version=version+1 where room_id=room and ready;
 update public.rooms set context_version=context_version+1,updated_at=greatest(updated_at,statement_timestamp()),version=version+1 where id=room;
end$$;
create function gm21_private.roster_changed() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if TG_OP='UPDATE' and new.left_at is not distinct from old.left_at then return new;end if;
 if TG_OP='INSERT' and not new.ready and (select count(*) from public.members where room_id=new.room_id and left_at is null)=1
   and not exists(select 1 from gm21_private.recent_snapshots where room_id=new.room_id) then return new;end if;
 perform gm21_private.invalidate(case when TG_OP='DELETE' then old.room_id else new.room_id end);
 return case when TG_OP='DELETE' then old else new end;
end$$;
create trigger gm21_roster_change after insert or delete or update of left_at on public.members
 for each row execute function gm21_private.roster_changed();

create function gm21_private.capture_presentation() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into gm21_private.presentations(history_id,room_id,room_code,member_count)
 select new.id,r.id,r.code,cardinality(r.roster_user_ids) from public.results s join public.rooms r on r.id=s.room_id
 where s.id=new.result_id and cardinality(r.roster_user_ids) between 2 and 8;
 if not found then raise exception using errcode='23514',message='GM21_HISTORY_PRESENTATION_REQUIRED';end if;
 return new;
end$$;
create trigger gm21_history_presentation after insert on public.histories
 for each row execute function gm21_private.capture_presentation();
insert into gm21_private.presentations
 select h.id,r.id,r.code,cardinality(r.roster_user_ids) from public.histories h
 join public.results s on s.id=h.result_id join public.rooms r on r.id=s.room_id
 where cardinality(r.roster_user_ids) between 2 and 8;

-- Trusted GM-19 hook: renew only in LOBBY, never grant retrospectively after start.
create function gm21_private.prepare_consents(room uuid,expected_version bigint) returns void
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
   on conflict on constraint consents_unique_1 do update set enabled=true,granted_at=excluded.granted_at,revoked_at=null,expires_at=excluded.expires_at,version=existing.version+1 where not existing.enabled;
  end loop;
 end loop;
end$$;
create function gm21_private.recent_dishes(room uuid) returns uuid[]
language plpgsql stable security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;users uuid[];out_ids uuid[];
begin
 select * into r from public.rooms where id=room;
 if not found or r.expires_at<=statement_timestamp() then return '{}';end if;
 if r.state<>'LOBBY' then
  select dish_ids into out_ids from gm21_private.recent_snapshots where room_id=room;
  return coalesce(out_ids,'{}');
 end if;
 users:=gm21_private.roster(room);
 if cardinality(users) not between 2 and 8 or exists(
  select 1 from public.members m where m.room_id=room and m.left_at is null and
   (not m.history_consent or exists(select 1 from gm21_private.settings st where st.user_id=m.user_id and st.scope='group' and not st.enabled) or not exists(select 1 from public.consents c where c.user_id=m.user_id and c.room_id=room
      and c.scope='group_history' and c.enabled and c.revoked_at is null and c.granted_at<=statement_timestamp()
      and (c.expires_at is null or c.expires_at>statement_timestamp())))) then return '{}';end if;
 select coalesce(array_agg(dish_id order by finalized_at desc,id desc),'{}') into out_ids from (
  select h.id,h.dish_id,h.finalized_at from public.histories h
  where h.scope='group' and h.group_key=gm21_private.group_key(users)
    and (select array_agg(u order by u) from unnest(h.member_user_ids) u)=users
    and h.finalized_at<=statement_timestamp() and gm17_private.history_valid(h.id)
  order by h.finalized_at desc,h.id desc limit 3) q;
 return out_ids;
end$$;
-- Call before GM-19 changes LOBBY to ROUND_1, in the same transaction/room lock.
create function gm21_private.freeze_recent(room uuid,expected_version bigint) returns uuid[]
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare ids uuid[];r public.rooms%rowtype;
begin
 perform gm17_private.require_room(room,expected_version,false);
 select * into r from public.rooms where id=room;
 if r.state<>'LOBBY' then raise sqlstate 'PT409' using message='ROOM_LOCKED';end if;
 ids:=gm21_private.recent_dishes(room);
 insert into gm21_private.recent_snapshots values(room,gm21_private.group_key(gm21_private.roster(room)),gm21_private.roster(room),ids,r.context_version,statement_timestamp())
 on conflict on constraint recent_snapshots_pkey do update set group_key=excluded.group_key,roster=excluded.roster,dish_ids=excluded.dish_ids,context_version=excluded.context_version,frozen_at=excluded.frozen_at;
 return ids;
end$$;
-- GM-20 must call this trusted port atomically after persisting the actual result.
-- No client can supply winner, roster, group key or consent IDs.
create function gm21_private.record_result(result uuid) returns int
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;s public.results%rowtype;d public.round_dishes%rowtype;users uuid[];
 dish_name_value text;cid uuid;member_user uuid;group_consents uuid[]:='{}';key_value text;count_rows int:=0;n int;
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 delete from gm21_private.recordings where expires_at<=statement_timestamp();
 if exists(select 1 from gm21_private.recordings where result_id=result) then return 0;end if;
 select * into s from public.results where id=result;
 if not found then raise sqlstate 'PT400' using message='INVALID_INPUT';end if;
 select * into r from public.rooms where id=s.room_id for update;
 if r.state<>'DECIDED' or s.winner_round_dish_id is null or s.finalized_at>clock_timestamp() or s.finalized_at+interval '30 days'<=statement_timestamp() then return 0;end if;
 select * into d from public.round_dishes where id=s.winner_round_dish_id and room_id=r.id;
 if not found then raise sqlstate 'PT400' using message='INVALID_INPUT';end if;
 select name into dish_name_value from public.dishes where id=d.dish_id;
 if dish_name_value is null then raise sqlstate 'PT400' using message='INVALID_DISH';end if;
 select array_agg(u order by u) into users from unnest(r.roster_user_ids) u;
 key_value:=gm21_private.group_key(users);
 foreach member_user in array users loop
  if not exists(select 1 from jsonb_array_elements(r.consent_snapshot) c where c->>'userId'=member_user::text and (c->>'historyConsent')::boolean) then continue;end if;
  select c.id into cid from public.consents c where c.room_id=r.id and c.user_id=member_user and c.scope='personal_history'
   and c.enabled and c.revoked_at is null and c.granted_at<=s.finalized_at and (c.expires_at is null or c.expires_at>statement_timestamp());
  if cid is not null and not exists(select 1 from gm21_private.settings st where st.user_id=member_user and st.scope='personal' and not st.enabled) then
   insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
   values(gen_random_uuid(),'personal',member_user,array[member_user],key_value,s.id,d.dish_id,dish_name_value,r.meal_slot,s.match_tier,s.finalized_at,s.finalized_at+interval '30 days',array[cid],1)
   on conflict on constraint histories_unique_1 do nothing;
   get diagnostics n=row_count;count_rows:=count_rows+n;
  end if;
  select c.id into cid from public.consents c where c.room_id=r.id and c.user_id=member_user and c.scope='group_history'
   and c.enabled and c.revoked_at is null and c.granted_at<=s.finalized_at and (c.expires_at is null or c.expires_at>statement_timestamp());
  if cid is not null and not exists(select 1 from gm21_private.settings st where st.user_id=member_user and st.scope='group' and not st.enabled) then group_consents:=array_append(group_consents,cid);end if;
 end loop;
 if cardinality(group_consents)=cardinality(users) and cardinality(users) between 2 and 8 then
  insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
  values(gen_random_uuid(),'group',null,users,key_value,s.id,d.dish_id,dish_name_value,r.meal_slot,s.match_tier,s.finalized_at,s.finalized_at+interval '30 days',group_consents,1)
  on conflict on constraint histories_unique_1 do nothing;
  get diagnostics n=row_count;count_rows:=count_rows+n;
 end if;
 insert into gm21_private.recordings values(s.id,s.finalized_at+interval '30 days') on conflict do nothing;
 return count_rows;
end$$;

create function public.get_history(scope text default null,cursor text default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare denial text;cursor_id uuid;cursor_time timestamptz;rows jsonb;
begin
 denial:=gm21_private.authorize('get_history');
 if denial is not null then return gm21_private.error(denial,case when denial='RATE_LIMITED' then 429 else 401 end);end if;
 if coalesce(scope,'') not in ('personal','group') or (cursor is not null and cursor!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then return gm21_private.error('INVALID_INPUT',400);end if;
 if cursor is not null then
  cursor_id:=cursor::uuid;
  select h.finalized_at into cursor_time from public.histories h where h.id=cursor_id and h.scope=$1 and gm17_private.history_visible(h.id);
  if not found then return gm21_private.error('INVALID_INPUT',400);end if;
 end if;
 -- Older detached summaries without an authentic display snapshot are not fabricated.
 if exists(select 1 from public.histories h where h.scope=$1 and gm17_private.history_visible(h.id)
  and not exists(select 1 from gm21_private.presentations p where p.history_id=h.id)) then return gm21_private.error('UNKNOWN_ERROR',503);end if;
 select coalesce(jsonb_agg(item order by finalized_at desc,id desc),'[]') into rows from (
  select h.id,h.finalized_at,jsonb_build_object('id',h.id,'roomId',p.room_id,'roomCode',p.room_code,
   'mealDate',to_char(h.finalized_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'winnerName',h.dish_name,'winnerArtworkUrl',null,'memberCount',p.member_count,'scope',h.scope) item
  from public.histories h join gm21_private.presentations p on p.history_id=h.id
  where h.scope=$1 and h.finalized_at<=statement_timestamp() and gm17_private.history_visible(h.id)
    and (cursor_id is null or (h.finalized_at,h.id)<(cursor_time,cursor_id))
  order by h.finalized_at desc,h.id desc limit 50) q;
 return jsonb_build_object('ok',true,'data',rows);
end$$;

-- GM-07 wire request IDs are opaque req_* strings; map to UUID storage with SHA256.
create function gm21_private.request_key(op text,request_id text) returns uuid
language sql stable set search_path=pg_catalog as $$
 select substr(encode(sha256(convert_to(jsonb_build_array(auth.uid(),op,request_id)::text,'UTF8')),'hex'),1,32)::uuid;
$$;
create function gm21_private.write_ack(op text,request_id text,payload jsonb) returns jsonb
language plpgsql volatile set search_path=pg_catalog as $$
declare stored public.idempotency%rowtype;hashed text:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 select * into stored from public.idempotency where user_id=auth.uid() and operation=op and idempotency.request_id=gm21_private.request_key(op,$2);
 if found then
  if stored.payload_hash<>hashed then return gm21_private.error('REQUEST_ID_REUSED',409,request_id);end if;
  if stored.expires_at<=statement_timestamp() then return gm21_private.error('INVALID_INPUT',400,request_id);end if;
  return jsonb_build_object('ok',true,'requestId',request_id,'data',null);
 end if;
 return null;
end$$;
create function gm21_private.save_ack(op text,request_id text,payload jsonb) returns jsonb
language plpgsql volatile set search_path=pg_catalog as $$
begin
 insert into public.idempotency(id,user_id,operation,request_id,payload_hash,expected_version,response,created_at,expires_at,version)
 values(gen_random_uuid(),auth.uid(),op,gm21_private.request_key(op,request_id),encode(sha256(convert_to(payload::text,'UTF8')),'hex'),null,
  '{"roomId":null,"resultId":null,"serverVersion":1}',statement_timestamp(),statement_timestamp()+interval '24 hours',1);
 return jsonb_build_object('ok',true,'requestId',request_id,'data',null);
end$$;
create function public.update_history_consent("requestId" text default null,scope text default null,consent jsonb default null) returns jsonb
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
  end loop;
 end if;
 return gm21_private.save_ack('update_history_consent',"requestId",payload);
end$$;
create function public.delete_history("requestId" text default null,history_id text default null) returns jsonb
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
   and gm21_private.group_key(gm21_private.roster(r.id))=old_group order by r.id loop perform gm21_private.invalidate(room);end loop;
 end if;
 -- Missing/other owner's ID is the same successful no-op; no existence oracle.
 return gm21_private.save_ack('delete_history',"requestId",payload);
end$$;
revoke execute on all functions in schema gm21_private from public,anon,authenticated,service_role;
revoke all on function public.get_history(text,text),public.update_history_consent(text,text,jsonb),public.delete_history(text,text) from public,anon,authenticated,service_role;
grant execute on function public.get_history(text,text),public.update_history_consent(text,text,jsonb),public.delete_history(text,text) to authenticated;
comment on schema gm21_private is 'GM21.1 private consent/history ports; no production finalize or GM19 wiring claim';
commit;
