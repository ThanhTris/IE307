-- GM20.4/schema0.12.0 candidate. New B-supplement sessions only; creation OFF.
-- No backfill/dual-write. Existing v2/v3/B results keep their pinned authority.
begin;
-- Deferred constraints fire after the RPC SECURITY DEFINER returns. Keep their
-- unchanged bodies private, but execute as owner instead of granting schema access
-- to authenticated clients. Existing model rows/IDs and predicates are unchanged.
alter function gm06_canonical.check_member_count() security definer;
alter function gm06_canonical.check_history() security definer;
create schema gm20_canonical_private;
revoke all on schema gm20_canonical_private from public,anon,authenticated,service_role;
alter default privileges in schema gm20_canonical_private revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema gm20_canonical_private revoke execute on functions from public,anon,authenticated,service_role;

create function gm20_canonical_private.evaluate_v4(input jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare roster jsonb; pool jsonb; r1 jsonb; r2 jsonb; eligible jsonb; unanimous jsonb; remaining jsonb; scored jsonb; selected jsonb; candidates jsonb;
 person record; ballot jsonb; scope jsonb; allowed text[]; n int; round_no int; cap int; phase int; best int; wants int; winner text; base jsonb;
begin
 if jsonb_typeof(input) is distinct from 'object' then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 if (select array_agg(key order by key) from jsonb_object_keys(input) key) is distinct from array['policyVersion','pool','roster','round','round1','round2','seed']
 or input->>'policyVersion' is distinct from 'dish-decision-v4/ADR-019-30PCT-MIN1'
 or input->'round' is null or input->'round' not in('1'::jsonb,'2'::jsonb)
 or jsonb_typeof(input->'seed') is distinct from 'string' or input->>'seed' !~ '^[0-9a-f]{8}$'
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 roster:=input->'roster';pool:=input->'pool';r1:=input->'round1';r2:=input->'round2';round_no:=(input->>'round')::numeric::int;
 if gm20_private.valid_ids(roster) is not true or gm20_private.valid_ids(pool) is not true
 or jsonb_typeof(r1) is distinct from 'object' or jsonb_typeof(r2) is distinct from 'object'
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 if jsonb_array_length(roster) not between 2 and 20 or jsonb_array_length(pool) not between 10 and 20
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 select jsonb_agg(value order by value collate "C") into pool from jsonb_array_elements_text(pool);
 for phase in 1..2 loop
  if phase=1 then ballot:=r1;scope:=pool;allowed:=array['WANT','OK','NO'];
  else
   select count(*) into n from jsonb_each(r1);
   select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into eligible from jsonb_array_elements_text(pool) p
    where not exists(select 1 from jsonb_each(r1) b where b.value->>p.value='NO');
   select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into unanimous from jsonb_array_elements_text(eligible) p
    where not exists(select 1 from jsonb_each(r1) b where b.value->>p.value<>'WANT');
   cap:=case when round_no=2 then case when jsonb_array_length(eligible)=0 then 0 else greatest(1,floor(.30*jsonb_array_length(eligible))::int) end else null end;
   if round_no=2 and (n=0 or jsonb_array_length(eligible)=0 or jsonb_array_length(unanimous)>0)
   then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
   ballot:=r2;scope:=case when round_no=2 then eligible else '[]'::jsonb end;allowed:=array['KEEP','REMOVE'];
   if round_no=1 and r2<>'{}'::jsonb then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
  end if;
  for person in select * from jsonb_each(ballot) loop
   if not roster ? person.key or jsonb_typeof(person.value)<>'object' then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
   if (select count(*) from jsonb_each(person.value))<>jsonb_array_length(scope)
   or exists(select 1 from jsonb_each(person.value) v where not scope ? v.key or jsonb_typeof(v.value)<>'string' or not(v.value#>>'{}'=any(allowed)))
   or (phase=2 and (select count(*) from jsonb_each(person.value) v where v.value='"REMOVE"'::jsonb)>cap)
   then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
  end loop;
 end loop;
 base:=jsonb_build_object('policyVersion','dish-decision-v4/ADR-019-30PCT-MIN1','evaluatorVersion','1.0.0','round1BallotCount',n,
  'removalCap',cap,'winnerId',null,'reasonCode',null,'matchTier',null,'scoreVersion',null,'rankingVersion',null,'topDishes','[]'::jsonb);
 if n=0 then return base||jsonb_build_object('status','WAITING','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb); end if;
 if jsonb_array_length(eligible)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb,'reasonCode','EMPTY_INTERSECTION','matchTier','NO_CONSENSUS'); end if;
 if round_no=1 and jsonb_array_length(unanimous)=0 then return base||jsonb_build_object('status','ROUND_2','eligibleIds',eligible,'candidateIds',eligible); end if;
 if round_no=2 and r2='{}'::jsonb then return base||jsonb_build_object('status','WAITING','eligibleIds',eligible,'candidateIds','[]'::jsonb); end if;
 select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into remaining from jsonb_array_elements_text(eligible) p
  where round_no=1 or not exists(select 1 from jsonb_each(r2) b where b.value->>p.value='REMOVE');
 if jsonb_array_length(remaining)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb,'reasonCode','ALL_REMOVED','matchTier','NO_CONSENSUS'); end if;
 select jsonb_agg(jsonb_build_object('dishId',id,'score',score) order by score desc,id collate "C"),max(score) into scored,best from (
  select p.value id,(select sum(case b.value->>p.value when 'WANT' then 2 when 'OK' then 1 else 0 end)::int from jsonb_each(r1) b) score from jsonb_array_elements_text(remaining) p) q;
 select jsonb_agg(value->>'dishId' order by value->>'dishId' collate "C") into candidates from jsonb_array_elements(scored) where (value->>'score')::int=best;
 winner:=gm20_private.select_winner(candidates,input->>'seed');
 select jsonb_agg(value order by ord) into selected from jsonb_array_elements(scored) with ordinality t(value,ord) where ord<=3;
 if not exists(select 1 from jsonb_array_elements(selected) where value->>'dishId'=winner) then
  select jsonb_agg(value order by ord) into selected from jsonb_array_elements(scored) with ordinality t(value,ord) where ord<=2 or value->>'dishId'=winner;
 end if;
 select jsonb_agg(value||jsonb_build_object('rank',rank,'isWinner',value->>'dishId'=winner) order by (value->>'score')::int desc,value->>'dishId' collate "C") into selected from (
  select value,dense_rank() over(order by (value->>'score')::int desc) rank from jsonb_array_elements(selected)) q;
 select count(*) into wants from jsonb_each(r1) b where b.value->>winner='WANT';
 return base||jsonb_build_object('status','DECIDED','eligibleIds',remaining,'candidateIds',candidates,'winnerId',winner,'topDishes',selected,
  'reasonCode',case when round_no=1 then 'UNANIMOUS_WANT' else 'ACCEPTABLE_FINAL' end,'matchTier',case when wants=n then 'PERFECT' when wants*2>n then 'CONSENSUS' else 'COMPROMISE' end,
  'scoreVersion','want2-ok1-round1-v1','rankingVersion','score-desc-dense-rank-v1');
end $$;

create table gm20_canonical_private.configuration(singleton boolean primary key check(singleton),allow_new_sessions boolean not null default false);
insert into gm20_canonical_private.configuration values(true,false);
create table gm20_canonical_private.sessions(
 room_id uuid primary key references public.rooms(id) on delete cascade,
 contract_version text not null default 'dish-session-v4/roadmap-v2/GM-07.B-supplement' check(contract_version='dish-session-v4/roadmap-v2/GM-07.B-supplement'),
 result_id uuid unique references gm06_canonical.results(result_id) on delete set null,
 created_at timestamptz not null default clock_timestamp()
);
create table gm20_canonical_private.request_acks(
 user_id uuid not null references auth.users(id) on delete cascade,request_id text not null,
 payload_hash text not null check(payload_hash~'^[a-f0-9]{64}$'),response jsonb not null,
 expires_at timestamptz not null,primary key(user_id,request_id)
);
create table gm20_canonical_private.result_round_rows(
 result_id uuid not null references gm06_canonical.results(result_id) on delete cascade,
 dish_id uuid not null,round_dish_id uuid not null,primary key(result_id,dish_id),unique(result_id,round_dish_id)
);
create table gm20_canonical_private.selection_secrets(
 result_id uuid primary key references gm06_canonical.results(result_id) on delete cascade,
 seed text not null check(seed~'^[0-9a-f]{8}$'),algorithm text not null check(algorithm='u32-murmur3-rejection-v1')
);
-- Producer seam for GM23, no network/send, raw ballots or consent payload.
create table gm20_canonical_private.terminal_outbox(
 result_id uuid primary key references gm06_canonical.results(result_id) on delete cascade,
 room_ref_id uuid not null references gm17_private.room_refs(id),status text not null check(status in('DECIDED','NO_CONSENSUS')),
 contract_version text not null check(contract_version='dish-session-v4/roadmap-v2/GM-07.B-supplement'),
 version int not null default 1 check(version=1),created_at timestamptz not null,expires_at timestamptz not null
);
create table gm20_canonical_private.outbox_audience(
 result_id uuid not null references gm20_canonical_private.terminal_outbox(result_id) on delete cascade,
 user_id uuid not null,primary key(result_id,user_id),
 foreign key(result_id,user_id) references gm06_canonical.result_members(result_id,user_id) on delete cascade
);
create trigger gm20_round_rows_frozen before update on gm20_canonical_private.result_round_rows for each row execute function gm06_canonical.immutable();
create trigger gm20_outbox_frozen before update on gm20_canonical_private.terminal_outbox for each row execute function gm06_canonical.immutable();
create trigger gm20_outbox_audience_frozen before update on gm20_canonical_private.outbox_audience for each row execute function gm06_canonical.immutable();
create trigger gm20_seed_frozen before update on gm20_canonical_private.selection_secrets for each row execute function gm06_canonical.immutable();

create function gm20_canonical_private.canonical_card(card jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare result jsonb:=card; price jsonb:=card->'priceReference'; art jsonb:=card->'artwork';
begin
 if price<>'null'::jsonb then result:=jsonb_set(result,'{priceReference}',(price-'checkedAt')||jsonb_build_object('observedAt',price->'checkedAt')); end if;
 if art<>'null'::jsonb then result:=jsonb_set(result,'{artwork}',art||jsonb_build_object('attribution',coalesce(art->'attribution','null'::jsonb))); end if;
 if gm06_canonical.valid_card(result) is not true then raise sqlstate '23514' using message='GM20_CARD_ADAPTER'; end if;
 return result;
end $$;
create function gm20_canonical_private.wire_card(card jsonb,row_key uuid) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select jsonb_set(card,'{roundDishId}',to_jsonb(row_key::text))||jsonb_build_object('priceReference',
 case when card->'priceReference'='null'::jsonb then 'null'::jsonb else ((card->'priceReference')-'observedAt')||jsonb_build_object('checkedAt',card->'priceReference'->'observedAt') end)
$$;

create function gm20_canonical_private.result_projection(key uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('contractVersion','dish-session-v4/roadmap-v2/GM-07.B-supplement','resultId',r.result_id::text,'policyVersion',r.policy_version,
  'status',r.status,'reasonCode',r.reason,'round',r.terminal_round,'finalizedAt',r.finalized_at,'round1BallotCount',r.scored_r1_count,
  'winner',(select gm20_canonical_private.wire_card(c.value,m.round_dish_id) from jsonb_array_elements(r.locked_pool) c join gm20_canonical_private.result_round_rows m on m.result_id=r.result_id and m.dish_id=(c.value->>'dishId')::uuid where m.dish_id=r.winner_dish_id),
  'scoreVersion',case when r.status='DECIDED' then r.score_version else null end,'rankingVersion',case when r.status='DECIDED' then r.ranking_version else null end,
  'topDishes',coalesce((select jsonb_agg(jsonb_build_object('dish',gm20_canonical_private.wire_card(c.value,m.round_dish_id),'score',p.value->'score','rank',p.value->'rank','isWinner',p.value->'isWinner') order by p.ord)
   from jsonb_array_elements(r.top_dishes) with ordinality p(value,ord) join lateral jsonb_array_elements(r.locked_pool) c on c.value->>'dishId'=p.value->>'dishId'
   join gm20_canonical_private.result_round_rows m on m.result_id=r.result_id and m.dish_id=(p.value->>'dishId')::uuid),'[]'::jsonb))
 from gm06_canonical.results r where r.result_id=key and r.retain_until>statement_timestamp()
$$;

create function gm20_canonical_private.view(room_key uuid,caller uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select dish_v4_private.view(room_key,caller)||jsonb_build_object('contractVersion',c.contract_version,'result',gm20_canonical_private.result_projection(c.result_id))
 from gm20_canonical_private.sessions c where c.room_id=room_key
$$;

create function gm20_canonical_private.atomic_child() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
 if not exists(select 1 from gm06_canonical.results r where r.result_id=new.result_id and r.write_xid=pg_current_xact_id()) then
  raise sqlstate '23514' using message='GM20_ATOMIC_CHILD'; end if;
 if tg_table_name='result_round_rows' then
  if not exists(select 1 from gm06_canonical.results r cross join lateral jsonb_array_elements(r.locked_pool) d where r.result_id=new.result_id and d.value->>'dishId'=new.dish_id::text) then
   raise sqlstate '23514' using message='GM20_ROW_MAPPING'; end if;
 end if;
 return new;
end $$;
create trigger gm20_rows_atomic before insert on gm20_canonical_private.result_round_rows for each row execute function gm20_canonical_private.atomic_child();
create trigger gm20_outbox_atomic before insert on gm20_canonical_private.terminal_outbox for each row execute function gm20_canonical_private.atomic_child();
create trigger gm20_audience_atomic before insert on gm20_canonical_private.outbox_audience for each row execute function gm20_canonical_private.atomic_child();

create function gm20_canonical_private.save_history(room_key uuid,result_key uuid,roster uuid[],snapshot jsonb,locked_at timestamptz,stamp timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare scope_value text; person uuid; granted jsonb; consent_key uuid; until_time timestamptz; expiry timestamptz; hid uuid;
begin
 perform 1 from public.consents c where c.user_id=any(roster) order by c.id for update;
 foreach scope_value in array array['personal','group'] loop
  granted:='{}';expiry:=stamp+interval '30 days';
  foreach person in array roster loop
   consent_key:=null;until_time:=null;
   if exists(select 1 from jsonb_array_elements(snapshot) d where d.value->>'userId'=person::text and d.value->>(scope_value||'HistoryConsent')='true')
   and dish_v4_private.has_locked_history_consent(room_key,person,scope_value,locked_at) then
    select c.id,c.expires_at into consent_key,until_time from public.consents c
     where c.user_id=person and c.scope=scope_value||'_history' and (c.room_id=room_key or(c.room_id is null and not c.retention_detached))
      and c.enabled and c.revoked_at is null and c.granted_at<=locked_at and(c.expires_at is null or c.expires_at>stamp)
      and exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope=scope_value and st.enabled)
     order by (c.room_id=room_key) desc nulls last,c.id limit 1;
   end if;
   if consent_key is null then continue; end if;
   granted:=granted||jsonb_build_object(person::text,consent_key::text);
   if scope_value='personal' then
    hid:=gen_random_uuid();
    insert into gm06_canonical.histories(history_id,result_id,scope,owner_user_id,expires_at)
     values(hid,result_key,'personal',person,least(stamp+interval '30 days',coalesce(until_time,'infinity'::timestamptz)));
    insert into gm06_canonical.history_audience values(hid,result_key,person,consent_key);
   else expiry:=least(expiry,coalesce(until_time,'infinity'::timestamptz)); end if;
  end loop;
  if scope_value='group' and (select count(*) from jsonb_each(granted))=cardinality(roster) then
   hid:=gen_random_uuid();
   insert into gm06_canonical.histories(history_id,result_id,scope,owner_user_id,expires_at) values(hid,result_key,'group',null,expiry);
   insert into gm06_canonical.history_audience select hid,result_key,key::uuid,(value#>>'{}')::uuid from jsonb_each(granted);
  end if;
 end loop;
end $$;

create function gm20_canonical_private.finish(room_key uuid,source text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; cap gm20_canonical_private.sessions%rowtype;
 count_current int; count_waiting int; roster_count int; input jsonb; decision jsonb; pool jsonb; seed_value text; key uuid;
 stamp timestamptz:=clock_timestamp(); fingerprint text; locked jsonb;
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 select * into r from public.rooms where id=room_key for update;
 select * into s from dish_v4_private.sessions where room_id=room_key for update;
 select * into cap from gm20_canonical_private.sessions where room_id=room_key for update;
 if not found then return null; end if;
 stamp:=clock_timestamp();
 if cap.result_id is not null then return cap.result_id; end if;
 if r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') or r.expires_at<=stamp then return null; end if;
 select count(*),count(entered_waiting_at) into count_current,count_waiting from dish_v4_private.ballots where room_id=room_key and round=s.round;
 roster_count:=cardinality(s.roster);
 if count_current=0 then return null; end if;
 if source='ALL' and(count_current<>roster_count or count_waiting<>roster_count) then return null; end if;
 if source='HOST' and(gm19_private.require_auth()<>r.host_user_id or count_current<=roster_count/2 or s.waiting_started_at is null or r.state not in('WAITING_1','WAITING_2')) then return null; end if;
 if source='TIMEOUT' and(s.waiting_started_at is null or s.waiting_started_at+interval '60 seconds'>stamp) then return null; end if;
 if source not in('ALL','HOST','TIMEOUT') then raise sqlstate '22023' using message='GM20_INVALID_FINALIZE_SOURCE'; end if;
 input:=jsonb_build_object('policyVersion',s.policy_version,'roster',to_jsonb(s.roster),
  'pool',(select jsonb_agg(value->>'dishId') from jsonb_array_elements(s.initial_pool)), 'round',s.round,
  'round1',coalesce((select jsonb_object_agg(user_id::text,votes) from dish_v4_private.ballots where room_id=room_key and round=1),'{}'::jsonb),
  'round2',coalesce((select jsonb_object_agg(user_id::text,votes) from dish_v4_private.ballots where room_id=room_key and round=2),'{}'::jsonb),'seed','00000000');
 decision:=gm20_canonical_private.evaluate_v4(input);
 if decision->>'status'='WAITING' then return null; end if;
 perform set_config('dish_v4.writer','on',true);
 if decision->>'status'='ROUND_2' then
  select jsonb_agg(jsonb_set(value,'{roundDishId}',to_jsonb(gen_random_uuid()::text)) order by value->>'dishId' collate "C") into pool
   from jsonb_array_elements(s.initial_pool) where decision->'eligibleIds' ? (value->>'dishId');
  update dish_v4_private.sessions set round=2,round_pool=pool,waiting_started_at=null where room_id=room_key;
  update public.rooms set state='ROUND_2',version=version+1,pool_version=pool_version+1,updated_at=stamp where id=room_key;
  return null;
 end if;
 -- Independent secure terminal seed, generated only when a terminal result is written.
 seed_value:=encode(extensions.gen_random_bytes(4),'hex');
 decision:=gm20_canonical_private.evaluate_v4(jsonb_set(input,'{seed}',to_jsonb(seed_value)));
 key:=gen_random_uuid();
 select encode(sha256(convert_to(key::text||':'||string_agg(u::text,',' order by u),'UTF8')),'hex') into fingerprint from unnest(s.roster) u;
 select jsonb_agg(gm20_canonical_private.canonical_card(value) order by ord) into locked from jsonb_array_elements(s.initial_pool) with ordinality t(value,ord);
 -- Canonical's register_result trigger is the ONLY shared registry insert.
 insert into gm06_canonical.results(result_id,room_ref_id,catalogue_id,catalogue_sha,storage_version,policy_version,score_version,ranking_version,status,reason,terminal_round,winner_dish_id,locked_pool,top_dishes,member_count,member_fingerprint,scored_r1_count,meal_slot,planned_meal_at,finalized_at,retain_until)
 values(key,room_key,s.catalogue_id,s.catalogue_sha,'GM06.3',s.policy_version,'want2-ok1-round1-v1','score-desc-dense-rank-v1',decision->>'status',decision->>'reasonCode',s.round,(decision->>'winnerId')::uuid,locked,decision->'topDishes',roster_count,fingerprint,(decision->>'round1BallotCount')::int,s.meal_slot,s.desired_at,stamp,stamp+interval '30 days');
 insert into gm06_canonical.result_members select key,u,exists(select 1 from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.user_id=u) from unnest(s.roster) u;
 insert into gm20_canonical_private.result_round_rows select key,(value->>'dishId')::uuid,(value->>'roundDishId')::uuid from jsonb_array_elements(dish_v4_private.current_pool(s));
 insert into gm20_canonical_private.selection_secrets values(key,seed_value,'u32-murmur3-rejection-v1');
 perform gm20_canonical_private.save_history(room_key,key,s.roster,s.consent_snapshot,r.locked_at,stamp);
 insert into gm20_canonical_private.terminal_outbox(result_id,room_ref_id,status,contract_version,created_at,expires_at)
  values(key,room_key,decision->>'status',cap.contract_version,stamp,stamp+interval '7 days');
 insert into gm20_canonical_private.outbox_audience select key,u from unnest(s.roster) u;
 update gm20_canonical_private.sessions set result_id=key where room_id=room_key;
 update dish_v4_private.sessions set finalized_at=stamp where room_id=room_key;
 update public.rooms set state=decision->>'status',version=version+1,updated_at=stamp where id=room_key;
 return key;
end $$;

create or replace function gm20_canonical_private.dispatch(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid; room_key uuid; r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; c dish_v3_private.catalogues%rowtype;
 request_key text; signature text; old_ack gm20_canonical_private.request_acks%rowtype; answer jsonb; keys text[]; name_value text; room_code text; seed_value text;
 count_value integer; available integer; meal text; desired timestamptz; pref jsonb; consent_value boolean; pool_value jsonb; pool_changed boolean;
 ballot_value jsonb; active_pool jsonb; actual_round integer; pool_version_value bigint; expected bigint; current_revision bigint;
 accepted integer; roster_count integer; result_key uuid; history_key uuid; history_rows jsonb;
 mutating boolean; status_value integer:=400;
begin
 caller:=gm19_private.require_auth();
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'contractVersion'<>'dish-session-v4/roadmap-v2/GM-07.B-supplement' then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
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
  select * into old_ack from gm20_canonical_private.request_acks a where a.user_id=caller and a.request_id=request_key;
  if found then
   if old_ack.payload_hash<>signature then return dish_v4_private.fail('REQUEST_ID_REUSED','{}',409); end if;
   return old_ack.response;
  end if;
 end if;

 if command='create' then
  if not(select allow_new_sessions from gm20_canonical_private.configuration where singleton) then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
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
  insert into gm20_canonical_private.sessions(room_id) values(room_key);
  insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1);
  answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',room_code,'version',1,'expiresAt',(select expires_at from public.rooms where id=room_key)));
 elsif command='previewJoin' then
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or payload->>'requestId' !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select room_ref.id into room_key from public.rooms room_ref where room_ref.code=payload->>'code' and room_ref.policy_version='dish-decision-v4' and exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=room_ref.id);
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
  select id into room_key from public.rooms where code=payload->>'code' and policy_version='dish-decision-v4' and exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=public.rooms.id);
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  answer:=dish_v4_private.admit_member(room_key,caller,payload->>'displayName');
  elsif command='history' then
   select coalesce(jsonb_agg(jsonb_build_object('historyId',h.history_id::text,'roomId',z.room_ref_id::text,'resultId',z.result_id::text,
    'scope',h.scope,'createdAt',z.finalized_at,'expiresAt',h.expires_at,'finalizedAt',z.finalized_at,'desiredAt',z.planned_meal_at,
    'memberCount',z.member_count,'round1BallotCount',z.scored_r1_count,'result',gm20_canonical_private.result_projection(z.result_id)) order by z.finalized_at desc,h.history_id),'[]'::jsonb)
    into history_rows from gm06_canonical.histories h join gm06_canonical.results z using(result_id)
    where exists(select 1 from gm20_canonical_private.result_round_rows m where m.result_id=z.result_id)
     and gm06_canonical.history_visible(h.history_id,caller,clock_timestamp());
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('items',history_rows));
 elsif command='deleteHistory' then
  begin history_key:=(payload->>'historyId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  delete from gm06_canonical.histories h where h.history_id=history_key and gm06_canonical.history_visible(h.history_id,caller,clock_timestamp())
   and exists(select 1 from gm20_canonical_private.result_round_rows m where m.result_id=h.result_id);
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
  if not exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=room_key) then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
  if command='snapshot' or command='result' then
   if not exists(select 1 from public.rooms where id=room_key and policy_version='dish-decision-v4') then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
    if exists(select 1 from public.rooms where id=room_key and state='EXPIRED')
      or exists(select 1 from public.rooms where id=room_key and expires_at<=clock_timestamp() and state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')) then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command='snapshot' then answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
    else select gm20_canonical_private.result_projection(capability.result_id) into answer from gm20_canonical_private.sessions capability where capability.room_id=room_key;
    if answer is null then return dish_v4_private.fail('RESULT_NOT_READY','{}',409); end if; answer:=jsonb_build_object('ok',true,'data',answer); end if;
  else
   select * into r from public.rooms where id=room_key and policy_version='dish-decision-v4' for update;
   select * into s from dish_v4_private.sessions where room_id=room_key for update;
   if not found or r.id is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
   if r.state='EXPIRED' then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if r.expires_at<=clock_timestamp() and r.state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2') then update public.rooms set state='EXPIRED',version=version+1,updated_at=clock_timestamp() where id=room_key; return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command in('updateSettings','start','cancel','finalize') and r.host_user_id<>caller then return dish_v4_private.fail('NOT_HOST','{}',403); end if;
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
     count_value:=(payload->'settings'->>'dishCount')::numeric::integer; meal:=payload->'settings'->>'mealSlot';
     if meal is null or meal not in('breakfast','lunch','dinner','snack') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     desired:=null;
     if payload->'settings' ? 'desiredAt' and jsonb_typeof(payload->'settings'->'desiredAt') not in('string','null') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     if payload->'settings'->>'desiredAt' is not null then begin desired:=(payload->'settings'->>'desiredAt')::timestamptz; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end; end if;
    select * into c from dish_v3_private.catalogues where id=s.catalogue_id;
    select count(*) into available from jsonb_array_elements(c.cards) d where d.value->'mealSlots' ? meal;
    if available<count_value then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',count_value),409); end if;
    -- Time-only/equivalent settings do not request a new draw. The pinned seed
    -- is independent of room-version/time edits. Catalogue is
    -- pinned at create; preference ranking remains UNSUPPORTED in this wire.
    pool_value:=s.initial_pool;
    if s.requested_count is distinct from count_value or s.meal_slot is distinct from meal then
     pool_value:=dish_v4_private.pool_for(c.cards,count_value,meal,s.pool_seed);
    end if;
    -- Generated row IDs and ordering are not a content change. If all cards
    -- are the same, retain the original IDs AND order rather than re-keying.
    pool_changed:=(select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(pool_value))
     is distinct from (select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(s.initial_pool));
    if not pool_changed then pool_value:=s.initial_pool; end if;
     update dish_v4_private.sessions set requested_count=count_value,meal_slot=meal,desired_at=desired,settings=payload->'settings',initial_pool=pool_value where room_id=room_key;
    update public.rooms set meal_slot=meal,desired_at=desired,version=version+1,
     pool_version=pool_version+case when pool_changed then 1 else 0 end,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',r.version+1,
      'poolVersion',r.pool_version+case when pool_changed then 1 else 0 end,'settings',payload->'settings'));
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
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
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
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
   elsif command='finalize' then
    if r.state in('ROUND_1','ROUND_2') then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    if r.state not in('WAITING_1','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if s.waiting_started_at is null then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
    if accepted<=cardinality(s.roster)/2 then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    perform dish_v4_private.finish(room_key,'HOST');
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
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
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','TERMINAL','state',r.state,'round',s.round,'resultId',(select capability.result_id::text from gm20_canonical_private.sessions capability where capability.room_id=room_key),'finalizedAt',s.finalized_at));
     end if;
    end if;
    answer:=answer||jsonb_build_object('roomId',room_key::text,'version',r.version,'state',r.state);
   end if;
   insert into gm20_canonical_private.request_acks(user_id,request_id,payload_hash,response,expires_at)
    values(caller,request_key,signature,answer,clock_timestamp()+interval '24 hours');
   answer:=answer||jsonb_build_object('requestId',request_key);
  end if;
 return answer;
exception
 when sqlstate 'PT401' then return dish_v4_private.fail('AUTH_REQUIRED','{}',401);
 when invalid_text_representation or numeric_value_out_of_range then return dish_v4_private.fail('INVALID_INPUT');
 when unique_violation then return dish_v4_private.fail('CONFLICT','{}',409);
end $$;

-- Retain the exact original B finisher; new capability routes only its own rows.
alter function dish_v4_private.finish(uuid,text) rename to finish_baseline_0111;
revoke all on function dish_v4_private.finish_baseline_0111(uuid,text) from public,anon,authenticated,service_role;
create function dish_v4_private.finish(room_key uuid,source text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from gm20_canonical_private.sessions where room_id=room_key) then return gm20_canonical_private.finish(room_key,source); end if;
 return dish_v4_private.finish_baseline_0111(room_key,source);
end $$;
revoke all on function dish_v4_private.finish(uuid,text) from public,anon,authenticated,service_role;

alter function dish_v4_private.tick() rename to tick_baseline_0111;
revoke all on function dish_v4_private.tick_baseline_0111() from public,anon,authenticated,service_role;
create function dish_v4_private.tick() returns void
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform dish_v4_private.tick_baseline_0111();
 delete from gm20_canonical_private.request_acks where expires_at<=clock_timestamp();
 delete from gm20_canonical_private.terminal_outbox where expires_at<=clock_timestamp();
end $$;
revoke all on function dish_v4_private.tick() from public,anon,authenticated,service_role;

-- The public name and envelope stay the same. Old sessions cannot enter new wire,
-- and new sessions cannot be read/mutated via B to bypass the pinned authority.
alter function public.dish_session(text,jsonb) rename to dish_session_baseline_0111;
revoke all on function public.dish_session_baseline_0111(text,jsonb) from public,anon,authenticated,service_role;
create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; room_key uuid;
begin
 if jsonb_typeof(payload) is distinct from 'object' then return dish_v4_private.fail('INVALID_INPUT'); end if;
 if payload->>'contractVersion'='dish-session-v4/roadmap-v2/GM-07.B-supplement' then
  answer:=gm20_canonical_private.dispatch(command,payload);
 else
  room_key:=gm19_private.uuid_or_null(payload->>'roomId');
  if room_key is null and payload ? 'code' then select id into room_key from public.rooms where code=payload->>'code'; end if;
  if exists(select 1 from gm20_canonical_private.sessions where room_id=room_key) then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
  answer:=public.dish_session_baseline_0111(command,payload);
 end if;
 if jsonb_typeof(payload->'requestId')='string' then answer:=answer||jsonb_build_object('requestId',payload->>'requestId'); end if;
 return answer;
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

do $$declare item record;begin
 for item in select tablename from pg_tables where schemaname='gm20_canonical_private' loop
  execute format('alter table gm20_canonical_private.%I enable row level security',item.tablename);
  execute format('alter table gm20_canonical_private.%I force row level security',item.tablename);
 end loop;
end $$;
revoke all on all tables in schema gm20_canonical_private from public,anon,authenticated,service_role;
revoke all on all functions in schema gm20_canonical_private from public,anon,authenticated,service_role;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.12.0','dish-session-v4/roadmap-v2/GM-20.4','1.1.0','1.1.0','GM06.3/0032; GM07.B-supplement/PR138; GM15.3/237e5f7; GM19.2/68e2e07');
commit;
