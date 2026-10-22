-- ADR-019: additive dish-decision-v3. Legacy rooms/votes/results are not rewritten.
begin;
create schema dish_v3_private;
revoke all on schema dish_v3_private from public,anon,authenticated,service_role;
alter default privileges in schema dish_v3_private revoke execute on functions from public,anon,authenticated,service_role;
create table dish_v3_private.catalogues (
 id text primary key, source_sha text not null check(source_sha ~ '^[a-f0-9]{64}$'),
 cards jsonb not null check(jsonb_typeof(cards)='array'), test_only boolean not null check(test_only),
 installed_at timestamptz not null default statement_timestamp(), active boolean not null default false
);
create unique index dish_v3_one_active_catalogue on dish_v3_private.catalogues(active) where active;
create function dish_v3_private.valid_catalogue(cards jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare card jsonb; k text; value jsonb;
begin
 if jsonb_typeof(cards) is distinct from 'array' then return false; end if;
 for card in select * from jsonb_array_elements(cards) loop
  if jsonb_typeof(card) is distinct from 'object' or jsonb_typeof(card->'dishId') is distinct from 'string'
   or gm19_private.uuid_or_null(card->>'dishId') is null or jsonb_typeof(card->'name') is distinct from 'string'
   or length(btrim(card->>'name')) not between 1 and 256 then return false; end if;
  foreach k in array array['mealSlots','cuisineIds','categoryIds'] loop
   if jsonb_typeof(card->k) is distinct from 'array' then return false; end if;
   for value in select * from jsonb_array_elements(card->k) loop
    if jsonb_typeof(value)<>'string' then return false; end if;
    if k='mealSlots' then
     if value#>>'{}' not in('breakfast','lunch','dinner','snack') then return false; end if;
    elsif gm19_private.uuid_or_null(value#>>'{}') is null then return false;
    end if;
   end loop;
  end loop;
 end loop;
 return (select count(*)=count(distinct d.value->>'dishId') from jsonb_array_elements(cards) d);
end $$;
alter table dish_v3_private.catalogues add constraint dish_v3_catalogue_valid check(dish_v3_private.valid_catalogue(cards));
create function dish_v3_private.freeze_catalogue() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if (new.id,new.source_sha,new.cards,new.test_only) is distinct from (old.id,old.source_sha,old.cards,old.test_only) then
  raise sqlstate '23514' using message='CATALOGUE_RELEASE_IMMUTABLE';
 end if;
 return new;
end $$;
create trigger dish_v3_catalogue_frozen before update on dish_v3_private.catalogues for each row execute function dish_v3_private.freeze_catalogue();
create table dish_v3_private.runtime (singleton boolean primary key check(singleton), last_tick timestamptz not null);
alter table dish_v3_private.runtime add column last_cleanup timestamptz;
create table dish_v3_private.sessions (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 dish_count integer not null check(dish_count between 10 and 20),
 catalogue_id text not null references dish_v3_private.catalogues(id), catalogue_sha text not null,
 pool jsonb not null, pool2 jsonb, round integer not null default 1 check(round in (1,2)),
 waiting_started_at timestamptz, result jsonb,
 seed text not null, check(seed ~ '^[a-f0-9]{8}$')
);
alter table dish_v3_private.sessions add column selection jsonb not null default '{}';
create table dish_v3_private.ballots (
 room_id uuid not null references dish_v3_private.sessions(room_id) on delete cascade,
 user_id uuid not null references auth.users(id), round integer not null check(round in(1,2)),
 votes jsonb not null, entered_waiting boolean not null default false,
 primary key(room_id,user_id,round)
);
create table dish_v3_private.acks (
 user_id uuid not null references auth.users(id), request_id text not null,
 payload_hash text not null, response jsonb not null, expires_at timestamptz not null,
 primary key(user_id,request_id)
);
do $$ declare t text; begin
 foreach t in array array['catalogues','sessions','ballots','acks','runtime'] loop
  execute format('alter table dish_v3_private.%I enable row level security',t);
  execute format('alter table dish_v3_private.%I force row level security',t);
  execute format('revoke all on dish_v3_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

-- Nullable place columns only for the explicit new policy. Legacy guards remain.
alter table public.rooms alter column anchor_id drop not null;
alter table public.rooms alter column coverage_id drop not null;
alter table public.rooms alter column radius_m drop not null;
alter table public.rooms alter column desired_at drop not null;
alter table public.rooms alter column service_mode drop not null;
alter table public.rooms alter column dataset_version drop not null;
alter table public.rooms drop constraint rooms_policy_version_shape;
alter table public.rooms add constraint rooms_policy_version_shape check(policy_version in('decision-v2','dish-decision-v3'));
alter table public.rooms add constraint dish_v3_legacy_context check(policy_version <> 'decision-v2' or
 (anchor_id is not null and coverage_id is not null and radius_m>0 and desired_at is not null and service_mode is not null and dataset_version is not null));
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.rooms'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%cardinality(roster_user_ids)%' loop
  execute format('alter table public.rooms drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.rooms add constraint dish_v3_roster_limits check(
 state not in('ROUND_1','ROUND_2','DECIDED','NO_CONSENSUS') or
 (locked_at is not null and evaluated_at is not null
 and cardinality(roster_user_ids) between 2 and case when policy_version='dish-decision-v3' then 20 else 8 end
 and jsonb_array_length(consent_snapshot)=cardinality(roster_user_ids)
 and (policy_version='dish-decision-v3' or desired_at>=locked_at)));

-- Prevent legacy RPCs from silently applying ready/cap8 rules to new sessions.
create function dish_v3_private.writer_guard() returns trigger language plpgsql set search_path=pg_catalog as $$
declare room_key uuid; is_new boolean;
begin
 if tg_table_name='rooms' then room_key:=coalesce(new.id,old.id);
 else room_key:=coalesce(new.room_id,old.room_id); end if;
 select policy_version='dish-decision-v3' into is_new from public.rooms where id=room_key;
 if tg_table_name='rooms' and tg_op='INSERT' then is_new:=new.policy_version='dish-decision-v3'; end if;
 if is_new and current_setting('dish_v3.writer',true) is distinct from 'on' then
  raise sqlstate 'PT409' using message='POLICY_VERSION_REQUIRED';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger dish_v3_rooms_guard before insert or update or delete on public.rooms for each row execute function dish_v3_private.writer_guard();
create trigger dish_v3_members_guard before insert or update or delete on public.members for each row execute function dish_v3_private.writer_guard();

create function dish_v3_private.cap(n integer) returns integer language sql immutable set search_path=pg_catalog as $$
 select case when n<1 then 0 else least(3,(n-1)/2) end
$$;
create function dish_v3_private.fail(code text, details jsonb default '{}') returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('ok',false,'error',jsonb_build_object('messageKey',code,'details',details))
$$;

-- Caller holds reference_epoch then room lock. One transaction selects/persists.
create function dish_v3_private.finish(room_key uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare s dish_v3_private.sessions%rowtype; r public.rooms%rowtype;
 participants integer; total integer; good jsonb; unanimous jsonb; survivors jsonb; choices jsonb;
 winner text; best integer; wants integer; tier text; reason text; final_pool jsonb; stamp timestamptz:=clock_timestamp();
begin
 select * into r from public.rooms where id=room_key for update;
 select * into s from dish_v3_private.sessions where room_id=room_key for update;
 if r.state not in('ROUND_1','ROUND_2') then return; end if;
 select count(*) into participants from dish_v3_private.ballots where room_id=room_key and round=s.round;
 if participants=0 then return; end if;
 select count(*) into total from dish_v3_private.ballots where room_id=room_key and round=1;
 select coalesce(jsonb_agg(d.value order by d.value->>'dishId'),'[]') into good from jsonb_array_elements(s.pool) d
  where not exists(select 1 from dish_v3_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')='NO');
 select coalesce(jsonb_agg(d.value order by d.value->>'dishId'),'[]') into unanimous from jsonb_array_elements(good) d
  where not exists(select 1 from dish_v3_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')<>'WANT');
 if s.round=1 and jsonb_array_length(unanimous)>0 then
  final_pool:=unanimous; reason:='UNANIMOUS_WANT';tier:='PERFECT';
 elsif jsonb_array_length(good)=0 then
  final_pool:='[]';reason:='EMPTY_INTERSECTION';tier:='NO_CONSENSUS';
 elsif s.round=1 and jsonb_array_length(good)>1 then
  update dish_v3_private.sessions set pool2=good,round=2,waiting_started_at=null where room_id=room_key;
  update public.rooms set state='ROUND_2',pool_version=pool_version+1,version=version+1,updated_at=stamp where id=room_key;
  return;
 else
  if s.round=1 then survivors:=good; else
   select coalesce(jsonb_agg(d.value order by d.value->>'dishId'),'[]') into survivors from jsonb_array_elements(s.pool2) d
    where not exists(select 1 from dish_v3_private.ballots b where b.room_id=room_key and b.round=2 and b.votes->>(d.value->>'dishId')='REMOVE');
  end if;
  if jsonb_array_length(survivors)=0 then final_pool:='[]'; reason:='ALL_REMOVED';tier:='NO_CONSENSUS';
  else
   -- Only round-one participants contribute WANT/OK. Missing ballots add zero.
   select max((select count(*) from dish_v3_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')='WANT')) into best from jsonb_array_elements(survivors) d;
   select jsonb_agg(d.value order by d.value->>'dishId') into final_pool from jsonb_array_elements(survivors) d
    where (select count(*) from dish_v3_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')='WANT')=best;
   wants:=best;tier:=case when wants=total then 'PERFECT' when 2*wants>total then 'CONSENSUS' else 'COMPROMISE' end;
   reason:='ACCEPTABLE_FINAL';
  end if;
 end if;
 if jsonb_array_length(final_pool)>0 then
  select jsonb_agg(value->>'dishId' order by value->>'dishId') into choices from jsonb_array_elements(final_pool);
  winner:=gm20_private.select_winner(choices,s.seed);
 end if;
 update dish_v3_private.sessions set result=jsonb_build_object('resultId',gen_random_uuid(),'winner',
  (select value from jsonb_array_elements(final_pool) where value->>'dishId'=winner),
  'reasonCode',reason,'matchTier',tier,'round',s.round,'finalizedAt',stamp,
  'policyVersion','dish-decision-v3') where room_id=room_key;
 update public.rooms set state=case when winner is null then 'NO_CONSENSUS' else 'DECIDED' end,
  version=version+1,updated_at=stamp where id=room_key;
end $$;

create function dish_v3_private.reconcile(room_key uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; s dish_v3_private.sessions%rowtype;
begin
 select * into r from public.rooms where id=room_key for update;
 select * into s from dish_v3_private.sessions where room_id=room_key for update;
 if r.state not in('LOBBY','ROUND_1','ROUND_2') then return; end if;
 if r.expires_at<=clock_timestamp() then
  update public.rooms set state='EXPIRED',version=version+1,updated_at=clock_timestamp() where id=room_key;
 elsif s.waiting_started_at+interval '60 seconds'<=clock_timestamp() then perform dish_v3_private.finish(room_key);
 end if;
end $$;

create function dish_v3_private.view(room_key uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$
 select jsonb_build_object('roomId',r.id,'code',r.code,'hostUserId',r.host_user_id,
 'state',r.state,'version',r.version,'round',s.round,'policyVersion','dish-decision-v3',
 'dishCount',s.dish_count,'maxMembers',20,'catalogueVersion',s.catalogue_id,'catalogueSha',s.catalogue_sha,
 'testData',c.test_only,'selection',s.selection,'pool',case when s.round=2 then s.pool2 else s.pool end,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'displayName',m.nickname) order by m.joined_at,m.user_id),'[]')
  from public.members m where m.room_id=r.id and m.left_at is null),
 'ownBallot',(select votes from dish_v3_private.ballots where room_id=r.id and user_id=auth.uid() and round=s.round),
 'ownWaiting',coalesce((select entered_waiting from dish_v3_private.ballots where room_id=r.id and user_id=auth.uid() and round=s.round),false),
 'submittedCount',(select count(*) from dish_v3_private.ballots where room_id=r.id and round=s.round),
 'waitingStartedAt',s.waiting_started_at,'deadline',s.waiting_started_at+interval '60 seconds',
 'serverTime',clock_timestamp(),'expiresAt',r.expires_at,'result',s.result,
 'removalCap',case when s.round=2 then dish_v3_private.cap(jsonb_array_length(s.pool2)) else 0 end)
 from public.rooms r join dish_v3_private.sessions s on s.room_id=r.id join dish_v3_private.catalogues c on c.id=s.catalogue_id where r.id=room_key
$$;

create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid; room_key uuid; r public.rooms%rowtype; s dish_v3_private.sessions%rowtype;
 request_key text; signature text; old dish_v3_private.acks%rowtype; response jsonb; c dish_v3_private.catalogues%rowtype;
 count_value integer; pool_value jsonb; vote_value jsonb; name_value text; code_value text; now_at timestamptz:=statement_timestamp();
 key text; amount integer; active_pool jsonb; existing_ballot jsonb;
 candidates jsonb; meal text; cuisines jsonb; categories jsonb;
 allowed_keys text[];
begin
 caller:=gm19_private.require_auth();
 if command is null or command not in('create','join','snapshot','start','submit','waiting','finalize','cancel','leave') or jsonb_typeof(payload) is distinct from 'object' then return dish_v3_private.fail('INVALID_INPUT'); end if;
 allowed_keys:=case command
  when 'create' then array['requestId','displayName','dishCount','mealSlot','cuisineIds','categoryIds']
  when 'join' then array['requestId','code','displayName']
  when 'snapshot' then array['roomId']
  when 'submit' then array['requestId','roomId','round','poolVersion','votes','expectedVersion']
  when 'waiting' then array['requestId','roomId','round','poolVersion','expectedVersion']
  else array['requestId','roomId','expectedVersion'] end;
 if exists(select 1 from jsonb_object_keys(payload) k where not k=any(allowed_keys)) then return dish_v3_private.fail('INVALID_INPUT'); end if;
 if not gm19_private.allow_call('dish_session_'||command,case when command='snapshot' then 120 when command='create' then 10 else 60 end) then return dish_v3_private.fail('RATE_LIMITED'); end if;
 -- Required order for the core's nested-FK serialization.
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 now_at:=clock_timestamp();
 perform set_config('dish_v3.writer','on',true);
 if command<>'snapshot' then
  request_key:=payload->>'requestId';
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or request_key is null or length(btrim(request_key)) not between 1 and 128 or request_key~'[[:cntrl:]]' then return dish_v3_private.fail('INVALID_INPUT'); end if;
  signature:=gm19_private.hash_payload(jsonb_build_object('command',command,'payload',payload));
  select * into old from dish_v3_private.acks where user_id=caller and request_id=request_key;
  if found then
   if old.payload_hash<>signature then return dish_v3_private.fail('REQUEST_ID_REUSED'); end if;
   return old.response;
  end if;
 end if;
 if command='create' then
  if not exists(select 1 from dish_v3_private.runtime where last_tick>now_at-interval '15 seconds') then return dish_v3_private.fail('WORKER_NOT_READY'); end if;
  if jsonb_typeof(payload->'dishCount') is distinct from 'number' or (payload->>'dishCount')::numeric<>trunc((payload->>'dishCount')::numeric) or (payload->>'dishCount')::numeric not between 10 and 20 then return dish_v3_private.fail('INVALID_INPUT'); end if;
  count_value:=(payload->>'dishCount')::integer;name_value:=btrim(payload->>'displayName');
  meal:=payload->>'mealSlot';
  cuisines:=coalesce(payload->'cuisineIds','[]'::jsonb);
  categories:=coalesce(payload->'categoryIds','[]'::jsonb);
  if meal is null or meal not in('breakfast','lunch','dinner','snack') or jsonb_typeof(cuisines)<>'array' or jsonb_typeof(categories)<>'array'
   then return dish_v3_private.fail('INVALID_INPUT'); end if;
  if exists(select 1 from jsonb_array_elements(cuisines||categories) f where jsonb_typeof(f.value)<>'string' or gm19_private.uuid_or_null(f.value#>>'{}') is null)
   then return dish_v3_private.fail('INVALID_INPUT'); end if;
  if name_value is null or length(name_value) not between 1 and 24 or name_value~'[[:cntrl:]]' then return dish_v3_private.fail('INVALID_INPUT'); end if;
  select * into c from dish_v3_private.catalogues where active;
  if not found then return dish_v3_private.fail('CATALOGUE_NOT_READY'); end if;
  select coalesce(jsonb_agg(d.value),'[]') into candidates from jsonb_array_elements(c.cards) d
   where d.value->'mealSlots' ? meal
   and (jsonb_array_length(cuisines)=0 or exists(select 1 from jsonb_array_elements_text(cuisines) f where d.value->'cuisineIds' ? f.value))
   and (jsonb_array_length(categories)=0 or exists(select 1 from jsonb_array_elements_text(categories) f where d.value->'categoryIds' ? f.value));
  if jsonb_array_length(candidates)<count_value then return dish_v3_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',jsonb_array_length(candidates),'requested',count_value)); end if;
  room_key:=gen_random_uuid();
  select jsonb_agg(value order by ordering) into pool_value from
   (select value,encode(extensions.digest(value->>'dishId'||room_key::text,'sha256'),'hex') ordering from jsonb_array_elements(candidates) order by ordering limit count_value) d;
  loop code_value:=gm19_private.code(); exit when not exists(select 1 from public.rooms where code=code_value); end loop;
  insert into public.rooms(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,avoid_recent,
   timezone,catalogue_version,dataset_version,eligibility_version,context_version,pool_version,policy_version,pool_seed,roster_user_ids,consent_snapshot,version)
  values(room_key,code_value,caller,'LOBBY',now_at,now_at,now_at+interval '60 minutes',meal,false,'UTC','1.0.0',null,'dish-only-v3',1,1,'dish-decision-v3',
   encode(extensions.gen_random_bytes(16),'hex'),array[caller],jsonb_build_array(jsonb_build_object('userId',caller,'historyConsent',false)),1);
  insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,version) values(gen_random_uuid(),room_key,caller,name_value,false,false,now_at,1);
  insert into dish_v3_private.sessions(room_id,dish_count,catalogue_id,catalogue_sha,pool,seed)
   values(room_key,count_value,c.id,c.source_sha,pool_value,encode(extensions.gen_random_bytes(4),'hex'));
  update dish_v3_private.sessions set selection=jsonb_build_object('mealSlot',meal,'cuisineIds',cuisines,'categoryIds',categories) where room_id=room_key;
 else
  if command='join' then
   if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v3_private.fail('INVALID_INPUT'); end if;
   select id into room_key from public.rooms where code=payload->>'code' and policy_version='dish-decision-v3';
  else room_key:=gm19_private.uuid_or_null(payload->>'roomId'); end if;
  select * into r from public.rooms where id=room_key and policy_version='dish-decision-v3' for update;
  if not found then return dish_v3_private.fail('ROOM_NOT_FOUND'); end if;
  if command<>'join' and not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v3_private.fail('NOT_MEMBER'); end if;
  perform dish_v3_private.reconcile(room_key);
  select * into r from public.rooms where id=room_key;
  select * into s from dish_v3_private.sessions where room_id=room_key for update;
  if command='snapshot' then return jsonb_build_object('ok',true,'data',dish_v3_private.view(room_key)); end if;
  if r.state in('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED') then
   return dish_v3_private.fail('ROOM_TERMINAL');
  end if;
  if command='join' then
   if exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then null;
   else
    if r.state<>'LOBBY' then return dish_v3_private.fail('ROOM_LOCKED'); end if;
    if (select count(*) from public.members where room_id=room_key and left_at is null)>=20 then return dish_v3_private.fail('ROOM_FULL'); end if;
    name_value:=btrim(payload->>'displayName');
    if name_value is null or length(name_value) not between 1 and 24 or name_value~'[[:cntrl:]]' then return dish_v3_private.fail('INVALID_INPUT'); end if;
    insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,version) values(gen_random_uuid(),room_key,caller,name_value,false,false,now_at,1)
     on conflict(room_id,user_id) do update set left_at=null,nickname=excluded.nickname,joined_at=excluded.joined_at,version=public.members.version+1;
    update public.rooms set version=version+1,updated_at=now_at where id=room_key;
   end if;
  else
   if command in('start','finalize','cancel') and r.host_user_id<>caller then return dish_v3_private.fail('NOT_HOST'); end if;
   -- Submit/waiting bind to the actual round/pool and replay their immutable intent.
   if command in('submit','waiting') then
    if payload->'round' is distinct from to_jsonb(s.round) or payload->'poolVersion' is distinct from to_jsonb(r.pool_version) then return dish_v3_private.fail('VERSION_CONFLICT'); end if;
   elsif payload->'expectedVersion' is distinct from to_jsonb(r.version) then return dish_v3_private.fail('VERSION_CONFLICT'); end if;
   if command='start' then
    if not exists(select 1 from dish_v3_private.runtime where last_tick>now_at-interval '15 seconds') then return dish_v3_private.fail('WORKER_NOT_READY'); end if;
    if r.state<>'LOBBY' then return dish_v3_private.fail('INVALID_ROOM_STATE'); end if;
    if (select count(*) from public.members where room_id=room_key and left_at is null)<2 then return dish_v3_private.fail('NOT_ENOUGH_MEMBERS'); end if;
    update public.rooms set state='ROUND_1',locked_at=now_at,evaluated_at=now_at,version=version+1,updated_at=now_at,
     roster_user_ids=(select array_agg(user_id order by user_id) from public.members where room_id=room_key and left_at is null),
     consent_snapshot=(select jsonb_agg(jsonb_build_object('userId',user_id,'historyConsent',false) order by user_id) from public.members where room_id=room_key and left_at is null) where id=room_key;
   elsif command='cancel' then
    update public.rooms set state='CANCELLED',version=version+1,updated_at=now_at where id=room_key;
   elsif command='leave' then
    if r.state<>'LOBBY' or r.host_user_id=caller then return dish_v3_private.fail('INVALID_ROOM_STATE'); end if;
    update public.members set left_at=now_at,version=version+1 where room_id=room_key and user_id=caller;
    update public.rooms set version=version+1,updated_at=now_at where id=room_key;
    response:=jsonb_build_object('ok',true,'data',null);
   elsif command in('submit','waiting','finalize') then
    if r.state not in('ROUND_1','ROUND_2') then return dish_v3_private.fail('INVALID_ROOM_STATE'); end if;
    active_pool:=case when s.round=1 then s.pool else s.pool2 end;
    if command='submit' then
     vote_value:=payload->'votes';
     if jsonb_typeof(vote_value) is distinct from 'object' or (select count(*) from jsonb_object_keys(vote_value))<>jsonb_array_length(active_pool) then return dish_v3_private.fail('INCOMPLETE_BALLOT'); end if;
     for key in select value->>'dishId' from jsonb_array_elements(active_pool) loop
      if (vote_value->>key) is null or jsonb_typeof(vote_value->key)<>'string' or
       (s.round=1 and vote_value->>key not in('WANT','OK','NO')) or (s.round=2 and vote_value->>key not in('KEEP','REMOVE')) then return dish_v3_private.fail('INVALID_INPUT'); end if;
     end loop;
     if s.round=2 and (select count(*) from jsonb_each_text(vote_value) where value='REMOVE')>dish_v3_private.cap(jsonb_array_length(active_pool)) then return dish_v3_private.fail('REMOVE_LIMIT'); end if;
     select votes into existing_ballot from dish_v3_private.ballots where room_id=room_key and user_id=caller and round=s.round;
     if found and existing_ballot<>vote_value then return dish_v3_private.fail('ALREADY_SUBMITTED'); end if;
     if existing_ballot is null then
      insert into dish_v3_private.ballots(room_id,user_id,round,votes) values(room_key,caller,s.round,vote_value);
      update public.rooms set version=version+1,updated_at=now_at where id=room_key;
     end if;
    elsif command='waiting' then
     if not exists(select 1 from dish_v3_private.ballots where room_id=room_key and user_id=caller and round=s.round) then return dish_v3_private.fail('INCOMPLETE_BALLOT'); end if;
     update dish_v3_private.ballots set entered_waiting=true where room_id=room_key and user_id=caller and round=s.round and not entered_waiting;
     get diagnostics amount=row_count;
     if amount>0 then
      update dish_v3_private.sessions set waiting_started_at=coalesce(waiting_started_at,now_at) where room_id=room_key;
      update public.rooms set version=version+1,updated_at=now_at where id=room_key;
     end if;
     if (select count(*) from dish_v3_private.ballots where room_id=room_key and round=s.round and entered_waiting)=cardinality(r.roster_user_ids) then perform dish_v3_private.finish(room_key); end if;
    else
     if not exists(select 1 from dish_v3_private.ballots where room_id=room_key and round=s.round) then return dish_v3_private.fail('NO_SUBMISSIONS'); end if;
     perform dish_v3_private.finish(room_key);
    end if;
   end if;
  end if;
 end if;
 response:=coalesce(response,jsonb_build_object('ok',true,'data',dish_v3_private.view(room_key)));
 insert into dish_v3_private.acks(user_id,request_id,payload_hash,response,expires_at) values(caller,request_key,signature,response,now_at+interval '24 hours');
 perform set_config('dish_v3.writer','off',true);
 return response;
exception when invalid_text_representation or numeric_value_out_of_range then return dish_v3_private.fail('INVALID_INPUT');
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

-- Cron/worker entry is server-only; no client can finalize another room.
create function dish_v3_private.tick() returns void language plpgsql security definer set search_path=pg_catalog as $$
declare k uuid;
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 perform set_config('dish_v3.writer','on',true);
 insert into dish_v3_private.runtime(singleton,last_tick) values(true,statement_timestamp())
  on conflict(singleton) do update set last_tick=excluded.last_tick;
 for k in select r.id from public.rooms r join dish_v3_private.sessions s on s.room_id=r.id
  where r.state in('LOBBY','ROUND_1','ROUND_2') and (r.expires_at<=statement_timestamp() or s.waiting_started_at+interval '60 seconds'<=statement_timestamp())
  order by r.id loop perform dish_v3_private.reconcile(k); end loop;
 delete from dish_v3_private.acks where expires_at<=statement_timestamp();
 if exists(select 1 from dish_v3_private.runtime where last_cleanup is null or last_cleanup<statement_timestamp()-interval '1 minute') then
  perform gm17_private.cleanup();
  update dish_v3_private.runtime set last_cleanup=statement_timestamp() where singleton;
 end if;
 perform set_config('dish_v3.writer','off',true);
end $$;
-- Existing retention remains authoritative for legacy and new rooms. Preserve
-- its dependency-aware deletions while allowing its trusted writes through guard.
alter function gm17_private.cleanup() rename to cleanup_before_dish_v3;
revoke all on function gm17_private.cleanup_before_dish_v3() from public,anon,authenticated,service_role;
create function gm17_private.cleanup() returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; previous text:=current_setting('dish_v3.writer',true);
begin
 perform set_config('dish_v3.writer','on',true);
 delete from dish_v3_private.acks where expires_at<=statement_timestamp();
 answer:=gm17_private.cleanup_before_dish_v3();
 perform set_config('dish_v3.writer',coalesce(previous,'off'),true);
 return answer;
end $$;
revoke all on function gm17_private.cleanup() from public,anon,authenticated,service_role;
-- Install/monitor the 1-second server job per docs, in the intended DB only.
-- No automatic cross-database or system-wide scheduler mutation in migrations.
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.8.0','dish-session-v3/ADR-019','1.1.0','1.1.0','d8245a02c85d5b3bc4888a826589e99c1dc58a6d');
commit;

