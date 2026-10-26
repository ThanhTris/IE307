-- Additive dish-session-v4 runtime. Existing v2/v3 sessions and storage remain pinned.
begin;

create schema dish_v4_private;
revoke all on schema dish_v4_private from public, anon, authenticated, service_role;
alter default privileges in schema dish_v4_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema dish_v4_private revoke execute on functions from public, anon, authenticated, service_role;

alter table public.rooms drop constraint rooms_policy_version_shape;
alter table public.rooms add constraint rooms_policy_version_shape check(policy_version in('decision-v2','dish-decision-v3','dish-decision-v4'));
alter table public.rooms drop constraint rooms_state_shape;
alter table public.rooms add constraint rooms_state_shape check(state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2','DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED'));
alter table public.rooms drop constraint dish_v3_roster_limits;
alter table public.rooms add constraint dish_v3_roster_limits check(
 state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2','DECIDED','NO_CONSENSUS') or
 (locked_at is not null and evaluated_at is not null
 and cardinality(roster_user_ids) between 2 and case when policy_version in('dish-decision-v3','dish-decision-v4') then 20 else 8 end
 and jsonb_array_length(consent_snapshot)=cardinality(roster_user_ids)
 and (policy_version in('dish-decision-v3','dish-decision-v4') or desired_at>=locked_at)));

create or replace function gm21_private.start_snapshot() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if old.policy_version='dish-decision-v4' then return new; end if;
 if old.state='LOBBY' and new.state='ROUND_1' then
  insert into gm21_private.recent_snapshots values(old.id,gm21_private.group_key(gm21_private.roster(old.id)),gm21_private.roster(old.id),gm21_private.recent_dishes(old.id),old.context_version,statement_timestamp())
  on conflict on constraint recent_snapshots_pkey do update set group_key=excluded.group_key,roster=excluded.roster,dish_ids=excluded.dish_ids,context_version=excluded.context_version,frozen_at=excluded.frozen_at;
 end if;
 return new;
end $$;

create or replace function gm21_private.invalidate(room uuid) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype;
begin
 select * into r from public.rooms where id=room for update;
 if not found or r.policy_version='dish-decision-v4' or r.state<>'LOBBY' or r.expires_at<=statement_timestamp() then return; end if;
 if r.evaluated_at is null and not exists(select 1 from public.members where room_id=room and ready)
   and not exists(select 1 from gm21_private.recent_snapshots where room_id=room)
   and not exists(select 1 from public.round_dishes where room_id=room) then return; end if;
 delete from gm21_private.recent_snapshots where room_id=room;
 update public.members set ready=false,version=version+1 where room_id=room and ready;
 update public.rooms set context_version=context_version+1,updated_at=greatest(updated_at,statement_timestamp()),version=version+1 where id=room;
end $$;
create or replace function gm19_private.refresh_lobby_pool(room_key uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from public.rooms where id=room_key and policy_version='dish-decision-v4') then return false; end if;
 return gm19_private.apply_lobby_pool(room_key,gm19_private.pool_for_room(room_key));
end $$;

create table dish_v4_private.sessions (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 contract_version text not null check(contract_version='dish-session-v4/roadmap-v2/GM-07.B'),
 policy_version text not null check(policy_version='dish-decision-v4/ADR-019-30PCT-MIN1'),
 catalogue_id text not null references dish_v3_private.catalogues(id),
 catalogue_sha text not null check(catalogue_sha ~ '^[a-f0-9]{64}$'),
 requested_count integer not null check(requested_count between 10 and 20),
 meal_slot text not null check(meal_slot in('breakfast','lunch','dinner','snack')),
 desired_at timestamptz,
 settings jsonb not null check(jsonb_typeof(settings)='object'),
 initial_pool jsonb not null check(jsonb_typeof(initial_pool)='array' and jsonb_array_length(initial_pool) between 10 and 20),
 round_pool jsonb,
 round integer not null default 1 check(round in(1,2)),
 roster uuid[],
 consent_snapshot jsonb,
 waiting_started_at timestamptz,
 result_id uuid,
 finalized_at timestamptz,
 pool_seed text not null check(pool_seed ~ '^[0-9a-f]{8}$'),
 created_at timestamptz not null default clock_timestamp(),
 check(isfinite(created_at) and isfinite(desired_at) and isfinite(waiting_started_at) and isfinite(finalized_at)),
 check(round_pool is null or (jsonb_typeof(round_pool)='array' and jsonb_array_length(round_pool)>0)),
 check(roster is null or cardinality(roster) between 2 and 20),
 check(consent_snapshot is null or jsonb_typeof(consent_snapshot)='array')
);
create table dish_v4_private.ballots (
 room_id uuid not null references dish_v4_private.sessions(room_id) on delete cascade,
 user_id uuid not null references auth.users(id),
 round integer not null check(round in(1,2)),
 votes jsonb not null check(jsonb_typeof(votes)='object'),
 accepted_at timestamptz not null default clock_timestamp(),
 entered_waiting_at timestamptz,
 primary key(room_id,user_id,round),
 check(isfinite(accepted_at) and isfinite(entered_waiting_at))
);
create table dish_v4_private.request_acks (
 user_id uuid not null references auth.users(id), request_id text not null,
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 response jsonb not null check(jsonb_typeof(response)='object'),
 expires_at timestamptz not null, primary key(user_id,request_id), check(isfinite(expires_at))
);
create table dish_v4_private.runtime (
 singleton boolean primary key check(singleton), last_tick timestamptz not null check(isfinite(last_tick))
);
create table dish_v4_private.default_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 preferences jsonb not null check(jsonb_typeof(preferences)='object'), revision bigint not null check(revision>=1),
 updated_at timestamptz not null default clock_timestamp(), check(isfinite(updated_at))
);
create table dish_v4_private.room_preferences (
 room_id uuid not null references dish_v4_private.sessions(room_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 preferences jsonb not null check(jsonb_typeof(preferences)='object'), revision bigint not null check(revision>=1),
 updated_at timestamptz not null default clock_timestamp(), primary key(room_id,user_id), check(isfinite(updated_at))
);
create table dish_v4_private.results (
 id uuid primary key, room_id uuid not null unique,
 winner_dish_id uuid, reason_code text not null check(reason_code in('UNANIMOUS_WANT','ACCEPTABLE_FINAL','EMPTY_INTERSECTION','ALL_REMOVED')),
 match_tier text not null check(match_tier in('PERFECT','CONSENSUS','COMPROMISE','NO_CONSENSUS')),
 terminal_round integer not null check(terminal_round in(1,2)),
 score_version text, ranking_version text, top_dishes jsonb not null check(jsonb_typeof(top_dishes)='array' and jsonb_array_length(top_dishes)<=3),
 projection jsonb not null check(jsonb_typeof(projection)='object'), finalized_at timestamptz not null,
 check(isfinite(finalized_at)),
 check((reason_code in('EMPTY_INTERSECTION','ALL_REMOVED') and winner_dish_id is null and jsonb_array_length(top_dishes)=0 and score_version is null and ranking_version is null)
  or (reason_code in('UNANIMOUS_WANT','ACCEPTABLE_FINAL') and winner_dish_id is not null and jsonb_array_length(top_dishes) between 1 and 3 and score_version='want2-ok1-round1-v1' and ranking_version='score-desc-dense-rank-v1'))
);
alter table dish_v4_private.sessions add constraint dish_v4_result_fk foreign key(result_id) references dish_v4_private.results(id) on delete set null deferrable initially deferred;
create table dish_v4_private.history (
 id uuid primary key, room_id uuid not null,
 result_id uuid not null references dish_v4_private.results(id) on delete cascade,
 scope text not null check(scope in('personal','group')), owner_user_id uuid references auth.users(id),
 member_user_ids uuid[] not null, projection jsonb not null check(jsonb_typeof(projection)='object'),
 created_at timestamptz not null, expires_at timestamptz not null, consent_snapshot jsonb not null,
 check((scope='personal' and owner_user_id is not null and cardinality(member_user_ids)=1)
   or (scope='group' and owner_user_id is null and cardinality(member_user_ids) between 2 and 20)),
 check(isfinite(created_at) and isfinite(expires_at) and expires_at>created_at)
);
create index dish_v4_history_owner on dish_v4_private.history(owner_user_id,created_at desc);
create index dish_v4_history_members on dish_v4_private.history using gin(member_user_ids);
alter table public.events add column dish_v4_result_id uuid references dish_v4_private.results(id) on delete cascade;

do $$ declare t text; con record; begin
 foreach t in array array['sessions','ballots','request_acks','runtime','default_preferences','room_preferences','results','history'] loop
  execute format('alter table dish_v4_private.%I enable row level security',t);
  execute format('alter table dish_v4_private.%I force row level security',t);
  execute format('revoke all on dish_v4_private.%I from public,anon,authenticated,service_role',t);
 end loop;
 for con in select conname from pg_constraint where conrelid='public.events'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%ROOM_RESULT_READY%' and pg_get_constraintdef(oid) like '%result_id%' loop
  execute format('alter table public.events drop constraint %I',con.conname);
 end loop;
 alter table public.events add constraint events_result_reference_shape check(
  (kind='ROOM_INVITED' and invitation_id is not null and result_id is null and dish_v4_result_id is null)
  or (kind='ROOM_RESULT_READY' and invitation_id is null and ((result_id is not null and dish_v4_result_id is null) or (result_id is null and dish_v4_result_id is not null)))
  or (kind='FRIEND_INVITED' and room_id is null and invitation_id is null and friend_invitation_id is not null and result_id is null and dish_v4_result_id is null));
end $$;

create function dish_v4_private.fail(code text, details jsonb default '{}', status integer default 400) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform set_config('response.status',status::text,true);
 return jsonb_build_object('ok',false,'error',jsonb_build_object('messageKey',code,'details',coalesce(details,'{}'::jsonb)));
end $$;
create function dish_v4_private.empty_preferences() returns jsonb language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('cuisineIds','[]'::jsonb,'categoryIds','[]'::jsonb,'temperature',null,'flavor',null,'budget',null,'avoidRecent',false)
$$;
create function dish_v4_private.valid_preferences(value jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare flavor_item record; budget_value jsonb;
begin
 if jsonb_typeof(value) is distinct from 'object' or not(value ?& array['cuisineIds','categoryIds','temperature','flavor','budget','avoidRecent']) then return false; end if;
 if exists(select 1 from jsonb_object_keys(value) k where k not in('cuisineIds','categoryIds','temperature','flavor','budget','avoidRecent')) then return false; end if;
 if value ? 'cuisineIds' and (jsonb_typeof(value->'cuisineIds')<>'array' or exists(select 1 from jsonb_array_elements(value->'cuisineIds') x(value) where jsonb_typeof(x.value)<>'string' or gm19_private.uuid_or_null(x.value#>>'{}') is null)
   or (select count(*)<>count(distinct x.value#>>'{}') from jsonb_array_elements(value->'cuisineIds') x(value))) then return false; end if;
 if value ? 'categoryIds' and (jsonb_typeof(value->'categoryIds')<>'array' or exists(select 1 from jsonb_array_elements(value->'categoryIds') x(value) where jsonb_typeof(x.value)<>'string' or gm19_private.uuid_or_null(x.value#>>'{}') is null)
   or (select count(*)<>count(distinct x.value#>>'{}') from jsonb_array_elements(value->'categoryIds') x(value))) then return false; end if;
 if value ? 'temperature' and (jsonb_typeof(value->'temperature') not in('string','null') or coalesce(value->>'temperature','unknown') not in('hot','warm','cold','ambient','unknown')) then return false; end if;
 if jsonb_typeof(value->'flavor') not in('object','null') then return false; end if;
 if jsonb_typeof(value->'flavor')='object' then
  if not(value->'flavor' ?& array['spicy','salty','sweet','sour']) or exists(select 1 from jsonb_object_keys(value->'flavor') k where not k=any(array['spicy','salty','sweet','sour'])) then return false; end if;
  for flavor_item in select key,value from jsonb_each(value->'flavor') loop
   if jsonb_typeof(flavor_item.value)<>'object' or not(flavor_item.value ?& array['present','intensity'])
    or jsonb_typeof(flavor_item.value->'present') not in('boolean','null')
    or jsonb_typeof(flavor_item.value->'intensity')<>'string'
    or flavor_item.value->>'intensity' not in('none','low','medium','high','unknown')
    or exists(select 1 from jsonb_object_keys(flavor_item.value) k where not k=any(array['present','intensity'])) then return false; end if;
  end loop;
 end if;
 budget_value:=value->'budget';
 if jsonb_typeof(budget_value) not in('object','null') then return false; end if;
 if jsonb_typeof(budget_value)='object' and (not(budget_value ?& array['maximum','currency','unit'])
  or exists(select 1 from jsonb_object_keys(budget_value) k where not k=any(array['maximum','currency','unit']))
  or jsonb_typeof(budget_value->'maximum')<>'number' or (budget_value->>'maximum')::numeric<0
  or jsonb_typeof(budget_value->'currency')<>'string' or budget_value->>'currency' !~ '^[A-Z]{3}$'
  or jsonb_typeof(budget_value->'unit')<>'string' or budget_value->>'unit' not in('portion','item','person','group','kg','menu_item_unspecified')) then return false; end if;
 if jsonb_typeof(value->'avoidRecent')<>'boolean' then return false; end if;
 return true;
end $$;
create function dish_v4_private.card(source jsonb) returns jsonb language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('dishId',source->'dishId','name',source->'name',
  'description',coalesce(source->'description','null'::jsonb),'mealSlots',coalesce(source->'mealSlots','[]'::jsonb),
  'cuisineIds',coalesce(source->'cuisineIds','[]'::jsonb),'cuisineLabels',coalesce(source->'cuisineLabels','[]'::jsonb),
  'categoryIds',coalesce(source->'categoryIds','[]'::jsonb),'categoryLabels',coalesce(source->'categoryLabels','[]'::jsonb),
  'temperature',coalesce(source->'temperature','null'::jsonb),'flavor',coalesce(source->'flavor','null'::jsonb),
  'artwork',case when source->'artwork'->>'usageRights' in('licensed','granted','public_domain')
       and nullif(source->'artwork'->>'license','') is not null and nullif(source->'artwork'->>'attribution','') is not null
       and nullif(source->'artwork'->>'url','') is not null
       then jsonb_build_object('uri',source->'artwork'->>'url','altText',source->>'name','attribution',source->'artwork'->>'attribution')
       else 'null'::jsonb end,
  'priceReference',coalesce(source->'priceReference','null'::jsonb))
$$;
create function dish_v4_private.current_pool(s dish_v4_private.sessions) returns jsonb language sql immutable set search_path=pg_catalog as $$
 select case when s.round=2 then s.round_pool else s.initial_pool end
$$;
create function dish_v4_private.normalize_votes(votes jsonb,pool jsonb,round_value integer) returns jsonb language plpgsql immutable set search_path=pg_catalog as $$
declare item jsonb; dish jsonb; id text; choice text; allowed text[]:=case when round_value=1 then array['WANT','OK','NO'] else array['KEEP','REMOVE'] end; result jsonb:='{}';
begin
 if jsonb_typeof(votes) is distinct from 'array' or jsonb_array_length(votes)<>jsonb_array_length(pool) then return null; end if;
 for item in select value from jsonb_array_elements(votes) loop
  if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k not in('roundDishId','choice'))
    or jsonb_typeof(item->'roundDishId')<>'string' or jsonb_typeof(item->'choice')<>'string' then return null; end if;
  id:=null;
  select p.value->>'dishId' into id from jsonb_array_elements(pool) p where p.value->>'roundDishId'=item->>'roundDishId';
  choice:=item->>'choice';
  if id is null or choice<>all(allowed) or result ? id then return null; end if;
  result:=result||jsonb_build_object(id,choice);
 end loop;
 return result;
end $$;

create function dish_v4_private.writer_guard() returns trigger language plpgsql set search_path=pg_catalog as $$
declare room_key uuid; version_value text;
begin
 if tg_table_name='rooms' then room_key:=coalesce(new.id,old.id); version_value:=case when tg_op='INSERT' then new.policy_version else old.policy_version end;
 else room_key:=coalesce(new.room_id,old.room_id); select policy_version into version_value from public.rooms where id=room_key; end if;
 if tg_table_name='rooms' and tg_op='INSERT' then version_value:=new.policy_version; end if;
 if version_value='dish-decision-v4' and current_setting('dish_v4.writer',true) is distinct from 'on' then
  raise sqlstate 'PT409' using message='POLICY_VERSION_REQUIRED';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger dish_v4_rooms_guard before insert or update or delete on public.rooms for each row execute function dish_v4_private.writer_guard();
create trigger dish_v4_members_guard before insert or update or delete on public.members for each row execute function dish_v4_private.writer_guard();

create function dish_v4_private.pool_for(catalogue jsonb,requested integer,meal text,seed text) returns jsonb
language sql volatile set search_path=pg_catalog,extensions as $$
 select coalesce(jsonb_agg(jsonb_set(dish_v4_private.card(x.value),'{roundDishId}',to_jsonb(gen_random_uuid()::text),true) order by x.order_key),'[]'::jsonb)
 from (select value,encode(extensions.digest(convert_to(seed||':'||(value->>'dishId'),'UTF8'),'sha256'),'hex') order_key
       from jsonb_array_elements(catalogue) where value->'mealSlots' ? meal
       order by order_key,value->>'dishId' collate "C" limit requested) x
$$;

create function dish_v4_private.view(room_key uuid,caller uuid) returns jsonb
language sql volatile security definer set search_path=pg_catalog as $$
 select jsonb_build_object(
  'contractVersion',s.contract_version,'policyVersion',s.policy_version,'catalogueVersion',s.catalogue_id,'catalogueSha',s.catalogue_sha,
  'roomId',r.id::text,'code',r.code,'hostUserId',r.host_user_id::text,'state',r.state,
  'version',r.version,'poolVersion',r.pool_version,'round',s.round,'dishCount',s.requested_count,'expiresAt',r.expires_at,'serverTime',clock_timestamp(),
  'settings',jsonb_build_object('dishCount',s.requested_count,'mealSlot',s.meal_slot,'desiredAt',s.desired_at),
  'memberCount',coalesce(cardinality(s.roster),(select count(*) from public.members m where m.room_id=r.id and m.left_at is null)),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id::text,'displayName',m.nickname,
     'role',case when m.user_id=r.host_user_id then 'HOST' else 'MEMBER' end,
     'submissionStatus',case when s.roster is null then 'NOT_SUBMITTED' when exists(select 1 from dish_v4_private.ballots b where b.room_id=r.id and b.user_id=m.user_id and b.round=s.round) then 'ACCEPTED' else 'NOT_SUBMITTED' end)
     order by m.joined_at,m.user_id),'[]'::jsonb) from public.members m where m.room_id=r.id and m.left_at is null),
  'pool',case when r.state='NO_CONSENSUS' then '[]'::jsonb else dish_v4_private.current_pool(s) end,
  'ownBallot',(select coalesce(jsonb_agg(jsonb_build_object('roundDishId',d.value->>'roundDishId','choice',b.votes->>(d.value->>'dishId')) order by d.value->>'dishId' collate "C"),'[]'::jsonb)
    from dish_v4_private.ballots b cross join jsonb_array_elements(dish_v4_private.current_pool(s)) d where b.room_id=r.id and b.user_id=caller and b.round=s.round),
  'ownWaiting',exists(select 1 from dish_v4_private.ballots b where b.room_id=r.id and b.user_id=caller and b.round=s.round and b.entered_waiting_at is not null),
  'ownPreferences',coalesce((select p.preferences from dish_v4_private.room_preferences p where p.room_id=r.id and p.user_id=caller),dish_v4_private.empty_preferences()),
  'ownPreferenceRevision',(select p.revision from dish_v4_private.room_preferences p where p.room_id=r.id and p.user_id=caller),
  'preferenceRanking','UNSUPPORTED',
  'submittedCount',(select count(*) from dish_v4_private.ballots b where b.room_id=r.id and b.round=s.round),
  'waitingStartedAt',case when r.state in('WAITING_1','WAITING_2') then s.waiting_started_at else null end,
  'deadline',case when r.state in('WAITING_1','WAITING_2') and s.waiting_started_at is not null then s.waiting_started_at+interval '60 seconds' else null end,
  'canEndWaiting',r.host_user_id=caller and r.state in('WAITING_1','WAITING_2') and s.waiting_started_at is not null and (select count(*) from dish_v4_private.ballots b where b.room_id=r.id and b.round=s.round)>coalesce(cardinality(s.roster),0)/2,
  'removalCap',case when s.round=2 and r.state in('ROUND_2','WAITING_2') then greatest(1,floor(jsonb_array_length(s.round_pool)*0.30)::integer) else null end,
  'result',(select projection from dish_v4_private.results z where z.id=s.result_id))
 from public.rooms r join dish_v4_private.sessions s on s.room_id=r.id where r.id=room_key
$$;

create function dish_v4_private.admit_member(room_key uuid,caller uuid,display_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; m public.members%rowtype; name_value text:=btrim(display_name); pref jsonb; member_exists boolean; member_id uuid;
begin
 select * into r from public.rooms where id=room_key for update;
 if not found or r.policy_version<>'dish-decision-v4' then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
 if r.expires_at<=clock_timestamp() then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
 if r.state<>'LOBBY' then return dish_v4_private.fail('ROOM_LOCKED','{}',409); end if;
 if name_value is null or length(name_value) not between 1 and 24 or name_value~'[[:cntrl:]]' then return dish_v4_private.fail('INVALID_INPUT'); end if;
 select * into m from public.members where room_id=room_key and user_id=caller for update;
 member_exists:=found;
 if member_exists and m.left_at is null then return jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',r.code,'version',r.version,'memberId',m.id::text)); end if;
 if (select count(*) from public.members where room_id=room_key and left_at is null)>=20 then return dish_v4_private.fail('ROOM_FULL','{}',409); end if;
 perform set_config('dish_v4.writer','on',true);
 if not member_exists then
  insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
   values(gen_random_uuid(),room_key,caller,name_value,false,false,clock_timestamp(),null,1);
 else
  update public.members set nickname=name_value,left_at=null,ready=false,history_consent=false,joined_at=clock_timestamp(),version=version+1 where id=m.id;
 end if;
 update public.rooms set roster_user_ids=array_append(array_remove(roster_user_ids,caller),caller),version=version+1,updated_at=clock_timestamp() where id=room_key;
 select preferences into pref from dish_v4_private.default_preferences where user_id=caller;
 insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,coalesce(pref,dish_v4_private.empty_preferences()),1)
  on conflict(room_id,user_id) do update set preferences=excluded.preferences,revision=dish_v4_private.room_preferences.revision+1,updated_at=clock_timestamp();
 select * into r from public.rooms where id=room_key;
 select id into member_id from public.members where room_id=room_key and user_id=caller and left_at is null;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',r.code,'version',r.version,'memberId',member_id::text));
end $$;

create function dish_v4_private.dense_podium(candidates jsonb,round1_pool jsonb,room_key uuid,winner_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare item record; score_value integer; ordered jsonb:='[]'; winner_item jsonb; winner_present boolean; selected jsonb; entry jsonb; rank_value integer:=0; previous integer:=null;
begin
 for item in select value from jsonb_array_elements(candidates) order by value->>'dishId' collate "C" loop
  select coalesce(sum(case when b.votes->>(item.value->>'dishId')='WANT' then 2 when b.votes->>(item.value->>'dishId')='OK' then 1 else 0 end),0)::integer into score_value
   from dish_v4_private.ballots b where b.room_id=room_key and b.round=1;
  ordered:=ordered||jsonb_build_array(jsonb_build_object('dish',item.value,'dishId',item.value->>'dishId','score',score_value));
 end loop;
 select coalesce(jsonb_agg(value order by (value->>'score')::integer desc,value->>'dishId' collate "C"),'[]'::jsonb) into ordered from jsonb_array_elements(ordered);
 selected:=(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from (select value,row_number() over(order by (value->>'score')::integer desc,value->>'dishId' collate "C") ord from jsonb_array_elements(ordered) limit 3) q);
 winner_item:=(select value from jsonb_array_elements(ordered) where value->>'dishId'=winner_id::text);
 winner_present:=exists(select 1 from jsonb_array_elements(selected) where value->>'dishId'=winner_id::text);
 if winner_item is null then raise exception 'Winner must be in final candidate set'; end if;
 if not winner_present then
  selected:=(select coalesce(jsonb_agg(value order by (value->>'score')::integer desc,value->>'dishId' collate "C"),'[]'::jsonb) from (
    select value from jsonb_array_elements(selected) where value->>'dishId'<>winner_id::text
    union all select winner_item) q);
 end if;
 entry:='[]'::jsonb;
 for item in select value from jsonb_array_elements(selected) order by (value->>'score')::integer desc,value->>'dishId' collate "C" loop
  score_value:=(item.value->>'score')::integer;
  if previous is distinct from score_value then rank_value:=rank_value+1; end if;
  previous:=score_value;
  entry:=entry||jsonb_build_array((item.value-'dishId'-'score')||jsonb_build_object('score',score_value,'rank',rank_value,'isWinner',item.value->>'dishId'=winner_id::text));
 end loop;
 return entry;
end $$;

create function dish_v4_private.save_history(room_key uuid,result_key uuid,projection_value jsonb,roster_value uuid[],consents jsonb,finish_time timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare person uuid; all_consented boolean:=true; history_expiry timestamptz:=finish_time+interval '30 days'; personal_expiry timestamptz; consent_expiry timestamptz; opted boolean;
begin
 perform 1 from public.consents c where c.user_id=any(roster_value) and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) order by c.id for update;
 for person in select unnest(roster_value) loop
  select coalesce(bool_or(value->>'historyConsent'='true'),false) into opted from jsonb_array_elements(consents) where value->>'userId'=person::text;
  consent_expiry:=null;
  if opted then
   select c.expires_at into consent_expiry from public.consents c where c.user_id=person and c.scope='personal_history'
    and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) and c.enabled and c.revoked_at is null
    and c.granted_at<=finish_time and (c.expires_at is null or c.expires_at>finish_time)
    and not exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='personal' and not st.enabled)
    order by (c.room_id=room_key) desc nulls last limit 1;
  end if;
  if opted and (found) then
   personal_expiry:=least(finish_time+interval '30 days',coalesce(consent_expiry,'infinity'));
   insert into dish_v4_private.history(id,room_id,result_id,scope,owner_user_id,member_user_ids,projection,created_at,expires_at,consent_snapshot)
    values(gen_random_uuid(),room_key,result_key,'personal',person,array[person],projection_value,finish_time,personal_expiry,consents);
  end if;
  consent_expiry:=null;
  if opted then
   select c.expires_at into consent_expiry from public.consents c where c.user_id=person and c.scope='group_history'
    and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) and c.enabled and c.revoked_at is null
    and c.granted_at<=finish_time and (c.expires_at is null or c.expires_at>finish_time)
    and not exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='group' and not st.enabled)
    order by (c.room_id=room_key) desc nulls last limit 1;
  end if;
  if not opted or not found then all_consented:=false;
  else history_expiry:=least(history_expiry,coalesce(consent_expiry,'infinity')); end if;
 end loop;
 if all_consented and cardinality(roster_value)>=2 then
  insert into dish_v4_private.history(id,room_id,result_id,scope,owner_user_id,member_user_ids,projection,created_at,expires_at,consent_snapshot)
   values(gen_random_uuid(),room_key,result_key,'group',null,roster_value,projection_value,finish_time,history_expiry,consents);
 end if;
end $$;

create function dish_v4_private.finish(room_key uuid,source text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; active_pool jsonb; eligible jsonb:='[]'; unanimous jsonb:='[]'; remaining jsonb:='[]'; winner_set jsonb:='[]'; podium jsonb:='[]';
 accepted integer; roster_count integer; participant_count integer; best integer; want_count integer; score_value integer; winner uuid; result_key uuid; finish_time timestamptz:=clock_timestamp();
 reason text; tier text; result_value jsonb; choice_ids jsonb; event_key uuid; person uuid; candidate jsonb;
begin
 select * into r from public.rooms where id=room_key for update;
 select * into s from dish_v4_private.sessions where room_id=room_key for update;
 if not found or r.policy_version<>'dish-decision-v4' or r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') or s.result_id is not null then return null; end if;
 roster_count:=cardinality(s.roster);
 select count(*) into accepted from dish_v4_private.ballots b where b.room_id=room_key and b.round=s.round;
 if accepted=0 then return null; end if;
 if source='ALL' and accepted<>roster_count then return null; end if;
 if source='TIMEOUT' and (s.waiting_started_at is null or s.waiting_started_at+interval '60 seconds'>finish_time) then return null; end if;
 if source not in('ALL','HOST','TIMEOUT') then raise exception 'Invalid finalize source'; end if;
 active_pool:=dish_v4_private.current_pool(s);
 select count(*) into participant_count from dish_v4_private.ballots b where b.room_id=room_key and b.round=1;
 select coalesce(jsonb_agg(d.value order by d.value->>'dishId' collate "C"),'[]'::jsonb) into eligible
  from jsonb_array_elements(s.initial_pool) d where not exists(
   select 1 from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')='NO');
 select coalesce(jsonb_agg(d.value order by d.value->>'dishId' collate "C"),'[]'::jsonb) into unanimous
  from jsonb_array_elements(eligible) d where not exists(
   select 1 from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>(d.value->>'dishId')<>'WANT');
 if s.round=1 then
  if jsonb_array_length(unanimous)>0 then
   remaining:=eligible; winner_set:=unanimous; reason:='UNANIMOUS_WANT';
  elsif jsonb_array_length(eligible)=0 then
   reason:='EMPTY_INTERSECTION'; tier:='NO_CONSENSUS';
  else
   select coalesce(jsonb_agg(jsonb_set(value,'{roundDishId}',to_jsonb(gen_random_uuid()::text),true) order by value->>'dishId' collate "C"),'[]'::jsonb)
    into remaining from jsonb_array_elements(eligible);
   update dish_v4_private.sessions set round=2,round_pool=remaining,waiting_started_at=null where room_id=room_key;
   update public.rooms set state='ROUND_2',pool_version=pool_version+1,version=version+1,updated_at=finish_time where id=room_key;
   return null;
  end if;
 else
  if jsonb_array_length(unanimous)>0 then raise exception 'Round two after a round-one winner'; end if;
  select coalesce(jsonb_agg(d.value order by d.value->>'dishId' collate "C"),'[]'::jsonb) into remaining
   from jsonb_array_elements(s.round_pool) d where not exists(
    select 1 from dish_v4_private.ballots b where b.room_id=room_key and b.round=2 and b.votes->>(d.value->>'dishId')='REMOVE');
  if jsonb_array_length(remaining)=0 then reason:='ALL_REMOVED'; tier:='NO_CONSENSUS';
  else
   for candidate in select value from jsonb_array_elements(remaining) loop
    select coalesce(sum(case when b.votes->>(candidate->>'dishId')='WANT' then 2 when b.votes->>(candidate->>'dishId')='OK' then 1 else 0 end),0)::integer
     into score_value from dish_v4_private.ballots b where b.room_id=room_key and b.round=1;
    if best is null or score_value>best then best:=score_value; winner_set:=jsonb_build_array(candidate);
    elsif score_value=best then winner_set:=winner_set||jsonb_build_array(candidate); end if;
   end loop;
   reason:='ACCEPTABLE_FINAL';
  end if;
 end if;
 if reason in('EMPTY_INTERSECTION','ALL_REMOVED') then
  result_key:=gen_random_uuid();
  result_value:=jsonb_build_object('resultId',result_key::text,'contractVersion',s.contract_version,'policyVersion',s.policy_version,'status','NO_CONSENSUS','reasonCode',reason,'winner',null,'topDishes','[]'::jsonb,
   'scoreVersion',null,'rankingVersion',null,'round',s.round,'finalizedAt',finish_time);
  insert into dish_v4_private.results(id,room_id,winner_dish_id,reason_code,match_tier,terminal_round,score_version,ranking_version,top_dishes,projection,finalized_at)
   values(result_key,room_key,null,reason,'NO_CONSENSUS',s.round,null,null,'[]'::jsonb,result_value,finish_time);
 else
  select max((select coalesce(sum(case when b.votes->>(d.value->>'dishId')='WANT' then 2 when b.votes->>(d.value->>'dishId')='OK' then 1 else 0 end),0)::integer
    from dish_v4_private.ballots b where b.room_id=room_key and b.round=1)) into best from jsonb_array_elements(winner_set) d;
  select coalesce(jsonb_agg(d.value->>'dishId' order by d.value->>'dishId' collate "C"),'[]'::jsonb) into choice_ids from jsonb_array_elements(winner_set) d
   where (select coalesce(sum(case when b.votes->>(d.value->>'dishId')='WANT' then 2 when b.votes->>(d.value->>'dishId')='OK' then 1 else 0 end),0)::integer from dish_v4_private.ballots b where b.room_id=room_key and b.round=1)=best;
  winner:=gm20_private.select_winner(choice_ids,s.pool_seed)::uuid;
  if s.round=2 then remaining:=remaining; end if;
  podium:=dish_v4_private.dense_podium(remaining,s.initial_pool,room_key,winner);
  select count(*) into want_count from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>winner::text='WANT';
  tier:=case when want_count=participant_count then 'PERFECT' when 2*want_count>participant_count then 'CONSENSUS' else 'COMPROMISE' end;
  select value into candidate from jsonb_array_elements(remaining) where value->>'dishId'=winner::text;
  result_key:=gen_random_uuid();
  result_value:=jsonb_build_object('resultId',result_key::text,'contractVersion',s.contract_version,'policyVersion',s.policy_version,'status','DECIDED','reasonCode',reason,
   'winner',candidate,'topDishes',podium,'scoreVersion','want2-ok1-round1-v1','rankingVersion','score-desc-dense-rank-v1',
   'round',s.round,'finalizedAt',finish_time);
  insert into dish_v4_private.results(id,room_id,winner_dish_id,reason_code,match_tier,terminal_round,score_version,ranking_version,top_dishes,projection,finalized_at)
   values(result_key,room_key,winner,reason,tier,s.round,'want2-ok1-round1-v1','score-desc-dense-rank-v1',podium,result_value,finish_time);
 end if;
 update dish_v4_private.sessions set result_id=result_key,finalized_at=finish_time where room_id=room_key;
 update public.rooms set state=case when winner is null then 'NO_CONSENSUS' else 'DECIDED' end,version=version+1,updated_at=finish_time where id=room_key;
 perform dish_v4_private.save_history(room_key,result_key,result_value,s.roster,s.consent_snapshot,finish_time);
 event_key:=gen_random_uuid();
 insert into public.events(id,kind,room_id,invitation_id,result_id,dish_v4_result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
  values(event_key,'ROOM_RESULT_READY',room_key,null,null,result_key,s.roster,'dish-v4-result:'||result_key,finish_time,finish_time+interval '7 days',1);
 foreach person in array s.roster loop
  insert into public.inbox(id,owner_user_id,event_id,read_at,created_at,expires_at,version)
   values(gen_random_uuid(),person,event_key,null,finish_time,finish_time+interval '7 days',1);
 end loop;
 return result_key;
end $$;

create function dish_v4_private.tick() returns void language plpgsql security definer set search_path=pg_catalog as $$
declare room_key uuid; stamp timestamptz:=clock_timestamp();
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 insert into dish_v4_private.runtime(singleton,last_tick) values(true,stamp)
  on conflict(singleton) do update set last_tick=excluded.last_tick;
 perform set_config('dish_v4.writer','on',true);
 for room_key in select s.room_id from dish_v4_private.sessions s join public.rooms r on r.id=s.room_id
  where r.policy_version='dish-decision-v4' and r.state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')
   and (r.expires_at<=stamp or s.waiting_started_at+interval '60 seconds'<=stamp) order by s.room_id loop
  if exists(select 1 from public.rooms where id=room_key and expires_at<=stamp and state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')) then
   update public.rooms set state='EXPIRED',version=version+1,updated_at=stamp where id=room_key;
  else perform dish_v4_private.finish(room_key,'TIMEOUT'); end if;
 end loop;
 delete from dish_v4_private.request_acks where expires_at<=stamp;
 delete from dish_v4_private.history where expires_at<=stamp;
 delete from dish_v4_private.results where finalized_at<=stamp-interval '30 days';
end $$;

create function dish_v4_private.dispatch(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid; room_key uuid; r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; c dish_v3_private.catalogues%rowtype;
 request_key text; signature text; old_ack dish_v4_private.request_acks%rowtype; answer jsonb; keys text[]; name_value text; room_code text; seed_value text;
 count_value integer; available integer; meal text; desired timestamptz; pref jsonb; consent_value boolean; pool_value jsonb;
 ballot_value jsonb; active_pool jsonb; actual_round integer; pool_version_value bigint; expected bigint; current_revision bigint;
 accepted integer; roster_count integer; result_key uuid; history_key uuid; history_rows jsonb;
 mutating boolean; status_value integer:=400;
begin
 caller:=gm19_private.require_auth();
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'contractVersion'<>'dish-session-v4/roadmap-v2/GM-07.B' then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
 if command not in('create','previewJoin','join','snapshot','updateSettings','updatePreferences','getDefaultPreferences','updateDefaultPreferences','start','submit','waiting','finalize','cancel','leave','result','history','deleteHistory') then return dish_v4_private.fail('INVALID_INPUT'); end if;
 keys:=case command
  when 'create' then array['contractVersion','requestId','displayName','settings','preferences']
  when 'previewJoin' then array['contractVersion','requestId','code']
  when 'join' then array['contractVersion','requestId','code','displayName']
  when 'snapshot' then array['contractVersion','roomId']
  when 'updateSettings' then array['contractVersion','requestId','roomId','expectedVersion','settings']
  when 'updatePreferences' then array['contractVersion','requestId','roomId','expectedVersion','preferences']
  when 'getDefaultPreferences' then array['contractVersion']
  when 'updateDefaultPreferences' then array['contractVersion','requestId','expectedRevision','preferences']
  when 'start' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'submit' then array['contractVersion','requestId','roomId','expectedVersion','round','poolVersion','votes']
  when 'waiting' then array['contractVersion','requestId','roomId','expectedVersion','round','poolVersion']
  when 'finalize' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'cancel' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'leave' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'result' then array['contractVersion','roomId']
  when 'history' then array['contractVersion']
  else array['contractVersion','requestId','historyId'] end;
 if exists(select 1 from jsonb_object_keys(payload) k where not k=any(keys)) then return dish_v4_private.fail('UNSUPPORTED_FIELD'); end if;
 if not gm19_private.allow_call('dish_v4_'||command,case when command in('snapshot','history','result','previewJoin') then 120 else 60 end) then return dish_v4_private.fail('RATE_LIMITED','{}',429); end if;
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 perform set_config('dish_v4.writer','on',true);
 mutating:=command not in('snapshot','result','history','previewJoin','getDefaultPreferences');
 if mutating then
  request_key:=payload->>'requestId';
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or request_key is null or request_key !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  signature:=gm19_private.hash_payload(payload);
  select * into old_ack from dish_v4_private.request_acks a where a.user_id=caller and a.request_id=request_key;
  if found then
   if old_ack.payload_hash<>signature then return dish_v4_private.fail('REQUEST_ID_REUSED','{}',409); end if;
   return old_ack.response;
  end if;
 end if;

 if command='create' then
  if not exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds') then return dish_v4_private.fail('WORKER_NOT_READY','{}',503); end if;
  if jsonb_typeof(payload->'settings') is distinct from 'object' or not(payload->'settings' ?& array['dishCount','mealSlot','desiredAt'])
    or jsonb_typeof(payload->'preferences') is distinct from 'object'
    or not dish_v4_private.valid_preferences(payload->'preferences') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 10 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
  count_value:=(payload->'settings'->>'dishCount')::integer; meal:=payload->'settings'->>'mealSlot'; name_value:=btrim(payload->>'displayName'); pref:=payload->'preferences';
  if exists(select 1 from jsonb_object_keys(payload->'settings') k where k not in('dishCount','mealSlot','desiredAt'))
    or meal is null or meal not in('breakfast','lunch','dinner','snack') or name_value is null or length(name_value) not between 1 and 24 or name_value~'[[:cntrl:]]' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  desired:=null;
  if payload->'settings' ? 'desiredAt' and jsonb_typeof(payload->'settings'->'desiredAt') not in('string','null') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->'settings'->>'desiredAt' is not null then begin desired:=(payload->'settings'->>'desiredAt')::timestamptz; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end; end if;
  select * into c from dish_v3_private.catalogues where active;
  if not found then return dish_v4_private.fail('CATALOGUE_NOT_READY','{}',503); end if;
  select count(*) into available from jsonb_array_elements(c.cards) d where d.value->'mealSlots' ? meal;
  if available<count_value then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',count_value),409); end if;
  room_key:=gen_random_uuid(); seed_value:=encode(extensions.gen_random_bytes(4),'hex');
  pool_value:=dish_v4_private.pool_for(c.cards,count_value,meal,seed_value);
  loop room_code:=gm19_private.code(); exit when not exists(select 1 from public.rooms where code=room_code); end loop;
  insert into public.rooms(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,time_hint,budget,avoid_recent,
   anchor_id,coverage_id,radius_m,desired_at,timezone,service_mode,catalogue_version,dataset_version,eligibility_version,context_version,pool_version,
   policy_version,pool_seed,roster_user_ids,consent_snapshot,version)
  values(room_key,room_code,caller,'LOBBY',clock_timestamp(),clock_timestamp(),clock_timestamp()+interval '60 minutes',meal,null,null,false,
   null,null,null,desired,'UTC',null,'1.0.0',null,'dish-only-v4',1,1,'dish-decision-v4',encode(extensions.gen_random_bytes(16),'hex'),array[caller],
   jsonb_build_array(jsonb_build_object('userId',caller,'historyConsent',false)),1);
  insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
   values(gen_random_uuid(),room_key,caller,name_value,false,false,clock_timestamp(),null,1);
  insert into dish_v4_private.sessions(room_id,contract_version,policy_version,catalogue_id,catalogue_sha,requested_count,meal_slot,desired_at,settings,initial_pool,pool_seed)
   values(room_key,'dish-session-v4/roadmap-v2/GM-07.B','dish-decision-v4/ADR-019-30PCT-MIN1',c.id,c.source_sha,count_value,meal,desired,payload->'settings',pool_value,seed_value);
  insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1);
  answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',room_code,'version',1,'expiresAt',(select expires_at from public.rooms where id=room_key)));
 elsif command='previewJoin' then
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or payload->>'requestId' !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select room_ref.id into room_key from public.rooms room_ref where room_ref.code=payload->>'code' and room_ref.policy_version='dish-decision-v4';
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  select * into r from public.rooms where id=room_key;
  answer:=jsonb_build_object('ok',true,'data',jsonb_strip_nulls(jsonb_build_object('joinable',r.state='LOBBY' and r.expires_at>clock_timestamp() and (select count(*) from public.members where room_id=r.id and left_at is null)<20,
   'roomState',r.state,'memberCount',(select count(*) from public.members where room_id=r.id and left_at is null),'memberLimit',20,
   'mealSlot',r.meal_slot,'dishCount',(select requested_count from dish_v4_private.sessions where room_id=r.id),
   'reasonCode',case when r.expires_at<=clock_timestamp() or r.state='EXPIRED' then 'ROOM_EXPIRED'
     when r.state in('DECIDED','NO_CONSENSUS','CANCELLED') then 'ROOM_TERMINAL'
     when r.state<>'LOBBY' then 'ROOM_LOCKED'
     when (select count(*) from public.members where room_id=r.id and left_at is null)>=20 then 'ROOM_FULL' else null end)));
 elsif command='join' then
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select id into room_key from public.rooms where code=payload->>'code' and policy_version='dish-decision-v4';
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  answer:=dish_v4_private.admit_member(room_key,caller,payload->>'displayName');
  elsif command='history' then
  select coalesce(jsonb_agg(jsonb_build_object('historyId',h.id::text,'roomId',h.room_id::text,'resultId',h.result_id::text,
   'scope',h.scope,'createdAt',h.created_at,'expiresAt',h.expires_at,'result',h.projection) order by h.created_at desc),'[]'::jsonb)
   into history_rows from dish_v4_private.history h where h.expires_at>clock_timestamp()
    and ((h.scope='personal' and h.owner_user_id=caller) or (h.scope='group' and caller=any(h.member_user_ids)));
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('items',history_rows));
 elsif command='deleteHistory' then
  begin history_key:=(payload->>'historyId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  delete from dish_v4_private.history h where h.id=history_key and ((h.scope='personal' and h.owner_user_id=caller) or (h.scope='group' and caller=any(h.member_user_ids)));
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
  elsif command='getDefaultPreferences' then
   select jsonb_build_object('revision',coalesce(p.revision,0),'preferences',coalesce(p.preferences,dish_v4_private.empty_preferences()))
    into answer from (select caller user_id) u left join dish_v4_private.default_preferences p on p.user_id=u.user_id;
   answer:=jsonb_build_object('ok',true,'data',answer);
 elsif command='updateDefaultPreferences' then
  if jsonb_typeof(payload->'expectedRevision') is distinct from 'number' or (payload->>'expectedRevision')::numeric<0 or trunc((payload->>'expectedRevision')::numeric)<>(payload->>'expectedRevision')::numeric or not dish_v4_private.valid_preferences(payload->'preferences') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  expected:=(payload->>'expectedRevision')::bigint;
  select revision into current_revision from dish_v4_private.default_preferences where user_id=caller for update;
  if coalesce(current_revision,0)<>expected then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
  insert into dish_v4_private.default_preferences(user_id,preferences,revision) values(caller,payload->'preferences',expected+1)
   on conflict(user_id) do update set preferences=excluded.preferences,revision=excluded.revision,updated_at=clock_timestamp();
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'revision',expected+1,'preferences',payload->'preferences'));
 else
  begin room_key:=(payload->>'roomId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  if command='snapshot' or command='result' then
   if not exists(select 1 from public.rooms where id=room_key and policy_version='dish-decision-v4') then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
    if exists(select 1 from public.rooms where id=room_key and state='EXPIRED')
      or exists(select 1 from public.rooms where id=room_key and expires_at<=clock_timestamp() and state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')) then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command='snapshot' then answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
    else select projection into answer from dish_v4_private.results z where z.room_id=room_key;
    if answer is null then return dish_v4_private.fail('RESULT_NOT_READY','{}',409); end if; answer:=jsonb_build_object('ok',true,'data',answer); end if;
  else
   select * into r from public.rooms where id=room_key and policy_version='dish-decision-v4' for update;
   select * into s from dish_v4_private.sessions where room_id=room_key for update;
   if not found or r.id is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
   if r.expires_at<=clock_timestamp() and r.state in('LOBBY','ROUND_1','ROUND_2') then update public.rooms set state='EXPIRED',version=version+1,updated_at=clock_timestamp() where id=room_key; return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command in('start','cancel','finalize') and r.host_user_id<>caller then return dish_v4_private.fail('NOT_HOST','{}',403); end if;
   if command in('updateSettings','updatePreferences','start','cancel','leave','finalize') then
   if jsonb_typeof(payload->'expectedVersion') is distinct from 'number' or (payload->>'expectedVersion')::numeric<>r.version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
   end if;
   if command in('submit','waiting') then
    if jsonb_typeof(payload->'expectedVersion') is distinct from 'number'
      or (payload->>'expectedVersion')::numeric<>trunc((payload->>'expectedVersion')::numeric)
      or (payload->>'expectedVersion')::bigint<1 or (payload->>'expectedVersion')::bigint>r.version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
   end if;
   if command='updateSettings' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('ROOM_LOCKED','{}',409); end if;
     if jsonb_typeof(payload->'settings') is distinct from 'object' or not(payload->'settings' ?& array['dishCount','mealSlot','desiredAt'])
       or exists(select 1 from jsonb_object_keys(payload->'settings') k where k not in('dishCount','mealSlot','desiredAt'))
       or jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 10 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
     count_value:=(payload->'settings'->>'dishCount')::integer; meal:=payload->'settings'->>'mealSlot';
     if meal is null or meal not in('breakfast','lunch','dinner','snack') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     desired:=null;
     if payload->'settings' ? 'desiredAt' and jsonb_typeof(payload->'settings'->'desiredAt') not in('string','null') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     if payload->'settings'->>'desiredAt' is not null then begin desired:=(payload->'settings'->>'desiredAt')::timestamptz; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end; end if;
    select * into c from dish_v3_private.catalogues where id=s.catalogue_id;
    select count(*) into available from jsonb_array_elements(c.cards) d where d.value->'mealSlots' ? meal;
    if available<count_value then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',count_value),409); end if;
    pool_value:=dish_v4_private.pool_for(c.cards,count_value,meal,s.pool_seed||':settings:'||(r.version+1)::text);
     update dish_v4_private.sessions set requested_count=count_value,meal_slot=meal,desired_at=desired,settings=payload->'settings',initial_pool=pool_value where room_id=room_key;
    update public.rooms set meal_slot=meal,desired_at=desired,version=version+1,pool_version=pool_version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',r.version+1,'poolVersion',r.pool_version+1,'settings',payload->'settings'));
   elsif command='updatePreferences' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('ROOM_LOCKED','{}',409); end if;
     pref:=payload->'preferences'; if not dish_v4_private.valid_preferences(pref) then return dish_v4_private.fail('INVALID_INPUT'); end if;
    insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1)
     on conflict(room_id,user_id) do update set preferences=excluded.preferences,revision=dish_v4_private.room_preferences.revision+1,updated_at=clock_timestamp();
    update public.rooms set version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',r.version+1,'poolVersion',r.pool_version));
   elsif command='start' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if not exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds') then return dish_v4_private.fail('WORKER_NOT_READY','{}',503); end if;
     perform gm21_private.prepare_consents(room_key,r.version);
     select count(*) into roster_count from public.members where room_id=room_key and left_at is null;
    if roster_count<2 then return dish_v4_private.fail('NOT_ENOUGH_MEMBERS','{}',409); end if;
    select array_agg(user_id order by joined_at,user_id),jsonb_agg(jsonb_build_object('userId',user_id::text,'historyConsent',history_consent) order by joined_at,user_id)
     into s.roster,s.consent_snapshot from public.members where room_id=room_key and left_at is null;
    update dish_v4_private.sessions set roster=s.roster,consent_snapshot=s.consent_snapshot where room_id=room_key;
    update public.rooms set state='ROUND_1',locked_at=clock_timestamp(),evaluated_at=clock_timestamp(),roster_user_ids=s.roster,consent_snapshot=s.consent_snapshot,
     version=version+1,updated_at=clock_timestamp() where id=room_key;
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
   elsif command in('submit','waiting') then
    if r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if jsonb_typeof(payload->'round') is distinct from 'number' or (payload->>'round')::integer<>s.round
      or jsonb_typeof(payload->'poolVersion') is distinct from 'number' or (payload->>'poolVersion')::bigint<>r.pool_version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
    if s.waiting_started_at is not null and s.waiting_started_at+interval '60 seconds'<=clock_timestamp() then
     perform dish_v4_private.finish(room_key,'TIMEOUT');
     select * into r from public.rooms where id=room_key; select * into s from dish_v4_private.sessions where room_id=room_key;
      if r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') or s.round<>(payload->>'round')::integer then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
    end if;
    active_pool:=dish_v4_private.current_pool(s);
    if command='submit' then
     ballot_value:=payload->'votes';
      ballot_value:=dish_v4_private.normalize_votes(ballot_value,active_pool,s.round);
      if ballot_value is null then return dish_v4_private.fail('INCOMPLETE_BALLOT'); end if;
      if s.round=2 and (select count(*) from jsonb_each_text(ballot_value) where value='REMOVE')>greatest(1,floor(jsonb_array_length(active_pool)*0.30)::integer) then return dish_v4_private.fail('REMOVE_LIMIT','{}',409); end if;
     select votes into pref from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=s.round;
     if found and pref is distinct from ballot_value then return dish_v4_private.fail('ALREADY_SUBMITTED','{}',409); end if;
     if not found then
      insert into dish_v4_private.ballots(room_id,user_id,round,votes) values(room_key,caller,s.round,ballot_value);
      update public.rooms set version=version+1,updated_at=clock_timestamp() where id=room_key;
     end if;
     select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
     if accepted=cardinality(s.roster) then perform dish_v4_private.finish(room_key,'ALL'); end if;
    else
     if not exists(select 1 from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=s.round) then return dish_v4_private.fail('INCOMPLETE_BALLOT'); end if;
      update dish_v4_private.ballots set entered_waiting_at=clock_timestamp() where room_id=room_key and user_id=caller and round=s.round and entered_waiting_at is null;
      update dish_v4_private.sessions set waiting_started_at=coalesce(waiting_started_at,clock_timestamp()) where room_id=room_key;
      update public.rooms set state=case when s.round=1 then 'WAITING_1' else 'WAITING_2' end,version=version+1,updated_at=clock_timestamp()
       where id=room_key and state in('ROUND_1','ROUND_2');
     select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
     if accepted=cardinality(s.roster) then perform dish_v4_private.finish(room_key,'ALL'); end if;
    end if;
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
   elsif command='finalize' then
    if r.state not in('WAITING_1','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if s.waiting_started_at is null then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
    if accepted<=cardinality(s.roster)/2 then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    perform dish_v4_private.finish(room_key,'HOST');
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
    elsif command='cancel' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    update public.rooms set state='CANCELLED',version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
   elsif command='leave' then
    if r.state<>'LOBBY' or r.host_user_id=caller then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    update public.members set left_at=clock_timestamp(),version=version+1 where room_id=room_key and user_id=caller and left_at is null;
    update public.rooms set roster_user_ids=array_remove(roster_user_ids,caller),version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
   else return dish_v4_private.fail('INVALID_INPUT');
   end if;
  end if;
 end if;
 if answer is null then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if mutating and answer->>'ok'='true' then
   if room_key is not null then
    select * into r from public.rooms where id=room_key;
    if command='submit' then
     select * into s from dish_v4_private.sessions where room_id=room_key;
     select accepted_at into desired from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=(payload->>'round')::integer;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'round',(payload->>'round')::integer,'poolVersion',(payload->>'poolVersion')::bigint,'submittedAt',desired));
    elsif command='waiting' then
     select min(entered_waiting_at) into desired from dish_v4_private.ballots where room_id=room_key and round=(payload->>'round')::integer and entered_waiting_at is not null;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'round',(payload->>'round')::integer,'poolVersion',(payload->>'poolVersion')::bigint,'waitingStartedAt',desired,'deadline',desired+interval '60 seconds'));
    elsif command='finalize' then
     select * into s from dish_v4_private.sessions where room_id=room_key;
     if r.state='ROUND_2' then
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','ROUND_ADVANCED','state','ROUND_2','round',2));
     else
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','TERMINAL','state',r.state,'round',s.round,'resultId',s.result_id::text,'finalizedAt',s.finalized_at));
     end if;
    end if;
    answer:=answer||jsonb_build_object('roomId',room_key::text,'version',r.version,'state',r.state);
   end if;
   insert into dish_v4_private.request_acks(user_id,request_id,payload_hash,response,expires_at)
    values(caller,request_key,signature,answer,clock_timestamp()+interval '24 hours');
   answer:=answer||jsonb_build_object('requestId',request_key);
  end if;
 return answer;
exception
 when sqlstate 'PT401' then return dish_v4_private.fail('AUTH_REQUIRED','{}',401);
 when invalid_text_representation or numeric_value_out_of_range then return dish_v4_private.fail('INVALID_INPUT');
 when unique_violation then return dish_v4_private.fail('CONFLICT','{}',409);
end $$;

alter function public.dish_session(text,jsonb) rename to dish_session_unversioned_legacy;
revoke all on function public.dish_session_unversioned_legacy(text,jsonb) from public,anon,authenticated,service_role;
create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; contract text;
begin
 if jsonb_typeof(payload) is distinct from 'object' then return dish_v4_private.fail('INVALID_INPUT'); end if;
 contract:=payload->>'contractVersion';
 if contract='dish-session-v4/roadmap-v2/GM-07.B' then
  answer:=dish_v4_private.dispatch(command,payload);
 elsif contract='dish-session-v3/ADR-019' then
  answer:=public.dish_session_unversioned_legacy(command,payload-'contractVersion');
 elsif contract is null then
  answer:=public.dish_session_unversioned_legacy(command,payload);
 else
  answer:=dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION');
 end if;
 if payload ? 'requestId' and jsonb_typeof(payload->'requestId')='string' then answer:=answer||jsonb_build_object('requestId',payload->>'requestId'); end if;
 return answer;
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

create or replace function public.accept_room_invite("requestId" text,invitation_id text,display_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,gm19_private,gm22_private,dish_v4_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; iid uuid; payload jsonb; payload_key text; ack jsonb; inv public.room_invitations%rowtype;
 r public.rooms%rowtype; m public.members%rowtype; name_value text; new_version bigint; wire jsonb; admitted jsonb; member_exists boolean;
begin
 begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
 payload:=jsonb_build_object('invitationId',iid,'displayName',display_name); payload_key:=gm19_private.hash_payload(payload);
 ack:=gm19_private.ack_lookup('accept_room_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
 if not gm19_private.allow_call('accept_room_invite',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 select * into inv from public.room_invitations where id=iid for update;
 if not found or inv.recipient_user_id<>caller then return gm19_private.error('NOT_RECIPIENT',403,null,request_key); end if;
 if inv.state<>'pending' then return gm19_private.error('INVITE_CANCELLED',409,inv.room_id,request_key); end if;
 if inv.expires_at<=statement_timestamp() then return gm19_private.error('INVITE_EXPIRED',410,inv.room_id,request_key); end if;
 select * into r from public.rooms where id=inv.room_id for update;
 if not found or r.expires_at<=statement_timestamp() then return gm19_private.error('ROOM_EXPIRED',410,inv.room_id,request_key); end if;
 if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,inv.room_id,request_key); end if;
 if not exists(select 1 from public.friends f where f.id=inv.friend_id and caller in(f.low_user_id,f.high_user_id)) then return gm19_private.error('NOT_PARTNER',403,inv.room_id,request_key); end if;
 if display_name is null or length(btrim(display_name))<1 or length(btrim(display_name))>24 or btrim(display_name)~'[[:cntrl:]]' then return gm19_private.error('INVALID_INPUT',400,inv.room_id,request_key); end if;
 if r.policy_version='dish-decision-v4' then
  admitted:=dish_v4_private.admit_member(r.id,caller,display_name);
  if admitted->>'ok'<>'true' then return admitted; end if;
  select version into new_version from public.rooms where id=r.id;
 else
  select * into m from public.members where room_id=r.id and user_id=caller for update;
  member_exists:=found;
  if not member_exists or m.left_at is not null then
   if (select count(*) from public.members where room_id=r.id and left_at is null)>=8 then return gm19_private.error('ROOM_FULL',409,r.id,request_key); end if;
   if not member_exists then insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
     values(gen_random_uuid(),r.id,caller,btrim(display_name),false,false,statement_timestamp(),null,1);
   else update public.members set nickname=btrim(display_name),left_at=null,ready=false,version=version+1 where id=m.id; end if;
   insert into public.preferences(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version)
    values(gen_random_uuid(),r.id,caller,'{}','{}',null,null,statement_timestamp(),1) on conflict(room_id,user_id) do nothing;
   update public.rooms set roster_user_ids=array_append(array_remove(roster_user_ids,caller),caller),version=version+1,updated_at=statement_timestamp() where id=r.id returning version into new_version;
   perform gm19_private.refresh_lobby_pool(r.id); select version into new_version from public.rooms where id=r.id;
  else new_version:=r.version; end if;
 end if;
 update public.room_invitations set state='accepted',responded_at=statement_timestamp(),version=version+1 where id=iid;
 select * into r from public.rooms where id=inv.room_id;
 wire:=jsonb_build_object('roomId',r.id::text,'code',r.code,'version',new_version,
  'memberId',(select id::text from public.members where room_id=r.id and user_id=caller and left_at is null));
 wire:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',r.id,'version',new_version,'state','LOBBY','data',wire);
 perform gm19_private.save_ack('accept_room_invite',request_key,payload_key,r.id,null,null,new_version,wire); return wire;
exception when sqlstate 'PT401' then return gm19_private.error('AUTH_REQUIRED',401); end $$;

create or replace function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,gm19_private,gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); cursor_id uuid;
begin
 if not gm19_private.allow_call('list_partner_inbox',60) then return gm22_private.social_error('RATE_LIMITED',429); end if;
 if cursor is not null then begin cursor_id:=cursor::uuid; exception when others then return gm22_private.social_error('INVALID_INPUT',400); end; end if;
 if cursor_id is not null and not exists(select 1 from public.inbox where id=cursor_id and owner_user_id=caller) then return gm22_private.social_error('NOT_MEMBER',403); end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id::text,'eventId',q.event_id::text,
  'type',case when q.kind='FRIEND_INVITED' then 'friend_invite' when q.kind='ROOM_INVITED' then 'room_invite' else 'room_result' end,
  'title',case when q.kind='FRIEND_INVITED' then 'Lời mời kết bạn' when q.kind='ROOM_INVITED' then 'Lời mời vào phòng' else 'Kết quả phòng đã sẵn sàng' end,
  'body',case when q.kind='FRIEND_INVITED' then 'Bạn có lời mời kết bạn mới' when q.kind='ROOM_INVITED' then 'Bạn có lời mời vào phòng mới' else 'Phòng của bạn đã có kết quả' end,
  'read',q.read_at is not null,'metadata',case when q.kind='FRIEND_INVITED' then jsonb_build_object('invitationId',q.friend_invitation_id::text)
   when q.kind='ROOM_INVITED' then jsonb_build_object('invitationId',q.invitation_id::text,'roomId',q.room_id::text)
   else jsonb_build_object('roomId',q.room_id::text,'resultId',coalesce(q.dish_v4_result_id,q.result_id)::text) end,'createdAt',q.created_at) order by q.id desc)
  from (select i.id,i.event_id,i.read_at,i.created_at,e.kind,e.friend_invitation_id,e.invitation_id,e.room_id,e.result_id,e.dish_v4_result_id
   from public.inbox i join public.events e on e.id=i.event_id where i.owner_user_id=caller and i.expires_at>statement_timestamp()
    and (cursor_id is null or i.id<cursor_id) order by i.id desc limit 50) q),'[]'::jsonb);
exception when sqlstate 'PT401' then return gm22_private.social_error('AUTH_REQUIRED',401); end $$;

alter function public.update_history_consent(text,text,jsonb) rename to update_history_consent_before_dish_v4;
revoke all on function public.update_history_consent_before_dish_v4(text,text,jsonb) from public,anon,authenticated,service_role;
create function public.update_history_consent("requestId" text default null,scope text default null,consent jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
begin
 perform set_config('dish_v4.writer','on',true);
 return public.update_history_consent_before_dish_v4("requestId",scope,consent);
end $$;
revoke all on function public.update_history_consent(text,text,jsonb) from public,anon,service_role;
grant execute on function public.update_history_consent(text,text,jsonb) to authenticated;

create function dish_v4_private.revoke_history() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if new.enabled=false and (tg_op='INSERT' or old.enabled is distinct from new.enabled) then
  if new.scope='personal' then delete from dish_v4_private.history where scope='personal' and owner_user_id=new.user_id;
  elsif new.scope='group' then delete from dish_v4_private.history where scope='group' and new.user_id=any(member_user_ids);
  end if;
 end if;
 return new;
end $$;
create trigger dish_v4_history_consent_revoke after insert or update of enabled on gm21_private.settings
 for each row execute function dish_v4_private.revoke_history();

revoke all on all functions in schema dish_v4_private from public,anon,authenticated,service_role;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.9.0','dish-session-v4/roadmap-v2/GM-07.B','1.1.0','1.1.0','dish-session-v3/ADR-019 + GM-40 catalogue profile')
on conflict(schema_version) do nothing;
commit;
