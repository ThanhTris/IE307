-- GM-20.3: private decision kernel and transactional ballot/finalize boundary.
begin;
create schema gm20_private;
revoke all on schema gm20_private from public, anon, authenticated, service_role;
alter default privileges in schema gm20_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema gm20_private revoke execute on functions from public, anon, authenticated, service_role;
create table gm20_private.submission_wire (
 submission_id uuid primary key references public.submissions(id) on delete cascade,
 intent_id text not null, request_id text not null, semantic_hash text not null,
 original_ack jsonb not null
);
create table gm20_private.decision_seeds (
 result_id uuid primary key references public.results(id) on delete cascade,
 seed text not null check(seed ~ '^[0-9a-f]{8}$'),
 algorithm text not null check(algorithm='u32-murmur3-rejection-v1')
);
alter table gm20_private.submission_wire enable row level security;
alter table gm20_private.submission_wire force row level security;
alter table gm20_private.decision_seeds enable row level security;
alter table gm20_private.decision_seeds force row level security;

create function gm20_private.pointer(s text) returns text language sql immutable set search_path=pg_catalog as $$ select replace(replace(s,'~','~0'),'/','~1') $$;
create function gm20_private.issue(code text,path text) returns jsonb language sql immutable set search_path=pg_catalog as $$ select jsonb_build_array(jsonb_build_object('code',code,'path',path)) $$;
create function gm20_private.invalid(issues jsonb) returns jsonb language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('policyVersion','decision-v2','status','INVALID_INPUT','candidateIds','[]'::jsonb,'issues',
 (select jsonb_agg(value order by (value->>'path') collate "C",(value->>'code') collate "C") from jsonb_array_elements(issues)))
$$;
create function gm20_private.valid_ids(ids jsonb) returns boolean language plpgsql immutable set search_path=pg_catalog as $$
begin
 if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)=0 then return false; end if;
 return not exists(select 1 from jsonb_array_elements(ids) where jsonb_typeof(value)<>'string' or btrim(value#>>'{}',E' \t\r\n')='')
 and (select count(*)=count(distinct value) from jsonb_array_elements(ids));
end $$;
create function gm20_private.matrix_issues(m jsonb,roster jsonb,pool jsonb,allowed text[],path text) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare person record; item record; issues jsonb:='[]'; p text;
begin
 if jsonb_typeof(m) is distinct from 'object' then return gm20_private.issue('INVALID_INPUT',path); end if;
 for person in select * from jsonb_each(m) loop
  p:=path||'/'||gm20_private.pointer(person.key);
  if not roster ? person.key then issues:=issues||gm20_private.issue('NOT_MEMBER',p); end if;
  if jsonb_typeof(person.value)<>'object' then issues:=issues||gm20_private.issue('INVALID_INPUT',p); continue; end if;
  for item in select * from jsonb_each(person.value) loop
   if not pool ? item.key then issues:=issues||gm20_private.issue('INVALID_DISH',p||'/'||gm20_private.pointer(item.key)); end if;
   if jsonb_typeof(item.value)<>'string' or not (item.value#>>'{}'=any(allowed)) then issues:=issues||gm20_private.issue('INVALID_INPUT',p||'/'||gm20_private.pointer(item.key)); end if;
  end loop;
 end loop;
 return issues;
end $$;
create function gm20_private.complete(m jsonb,roster jsonb,pool jsonb) returns boolean language sql immutable set search_path=pg_catalog as $$
 select not exists(select 1 from jsonb_array_elements_text(roster) r cross join jsonb_array_elements_text(pool) p where m->r.value->>p.value is null or m->r.value->>p.value='UNSET')
$$;
create function gm20_private.evaluate(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog as $$
declare issues jsonb:='[]'; k text; roster jsonb; pool jsonb; m jsonb; a jsonb; u jsonb; s jsonb; top_ids jsonb; w integer; n integer; best integer; base jsonb:=jsonb_build_object('policyVersion','decision-v2');
begin
 if jsonb_typeof(input) is distinct from 'object' then return gm20_private.invalid(gm20_private.issue('INVALID_INPUT','')); end if;
 for k in select jsonb_object_keys(input) loop
  if not k=any(array['policyVersion','roster','pool','round','round1','round2']) then issues:=issues||gm20_private.issue('INVALID_INPUT','/'||gm20_private.pointer(k)); end if;
 end loop;
 if input->'policyVersion' is distinct from '"decision-v2"'::jsonb then issues:=issues||gm20_private.issue('INVALID_INPUT','/policyVersion'); end if;
 if input->'round' is null or input->'round' not in ('1'::jsonb,'2'::jsonb) then issues:=issues||gm20_private.issue('INVALID_INPUT','/round'); end if;
 if not gm20_private.valid_ids(input->'roster') then issues:=issues||gm20_private.issue('INVALID_INPUT','/roster'); end if;
 if not gm20_private.valid_ids(input->'pool') then issues:=issues||gm20_private.issue('INVALID_INPUT','/pool'); end if;
 if jsonb_array_length(issues)>0 then return gm20_private.invalid(issues); end if;
 roster:=input->'roster'; select jsonb_agg(value order by value collate "C") into pool from jsonb_array_elements_text(input->'pool'); m:=input->'round1';
 issues:=gm20_private.matrix_issues(m,roster,pool,array['WANT','OK','NO','UNSET'],'/round1');
 if input ? 'round2' then
  if input->'round'<>'2'::jsonb then issues:=issues||gm20_private.issue('INVALID_INPUT','/round2'); end if;
  issues:=issues||gm20_private.matrix_issues(input->'round2',roster,pool,array['KEEP','REMOVE','UNSET'],'/round2');
 end if;
 if jsonb_array_length(issues)>0 then return gm20_private.invalid(issues); end if;
 if not gm20_private.complete(m,roster,pool) then return base||jsonb_build_object('status','WAITING','candidateIds','[]'::jsonb,'waitingRound',1,'reasonCode','INCOMPLETE_BALLOT'); end if;
 select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]') into u from jsonb_array_elements_text(pool) p where not exists(select 1 from jsonb_array_elements_text(roster) r where m->r.value->>p.value<>'WANT');
 select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]') into a from jsonb_array_elements_text(pool) p where not exists(select 1 from jsonb_array_elements_text(roster) r where m->r.value->>p.value='NO');
 if input->'round'='2'::jsonb and (jsonb_array_length(u)>0 or jsonb_array_length(a)=0) then return gm20_private.invalid(gm20_private.issue('INVALID_INPUT','/round')); end if;
 if jsonb_array_length(u)>0 then return base||jsonb_build_object('status','DECISION_READY','candidateIds',u,'reasonCode','UNANIMOUS_WANT','matchTier','PERFECT'); end if;
 if jsonb_array_length(a)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','candidateIds','[]'::jsonb,'reasonCode','EMPTY_INTERSECTION','matchTier','NO_CONSENSUS'); end if;
 if input->'round'='1'::jsonb then return base||jsonb_build_object('status','ROUND_2','candidateIds',a); end if;
 m:=coalesce(input->'round2','{}'); issues:=gm20_private.matrix_issues(m,roster,a,array['KEEP','REMOVE','UNSET'],'/round2');
 if jsonb_array_length(issues)>0 then return gm20_private.invalid(issues); end if;
 if not gm20_private.complete(m,roster,a) then return base||jsonb_build_object('status','WAITING','candidateIds','[]'::jsonb,'waitingRound',2,'reasonCode','INCOMPLETE_BALLOT'); end if;
 select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]') into s from jsonb_array_elements_text(a) p where not exists(select 1 from jsonb_array_elements_text(roster) r where m->r.value->>p.value<>'KEEP');
 if jsonb_array_length(s)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','candidateIds','[]'::jsonb,'reasonCode','ALL_REMOVED','matchTier','NO_CONSENSUS'); end if;
 select max((select count(*) from jsonb_array_elements_text(roster) r where input->'round1'->r.value->>p.value='WANT')) into best from jsonb_array_elements_text(s) p;
 select jsonb_agg(p.value order by p.value collate "C") into top_ids from jsonb_array_elements_text(s) p where (select count(*) from jsonb_array_elements_text(roster) r where input->'round1'->r.value->>p.value='WANT')=best;
 n:=jsonb_array_length(roster); w:=best;
 return base||jsonb_build_object('status','DECISION_READY','candidateIds',top_ids,'reasonCode','ACCEPTABLE_FINAL','matchTier',case when w=n then 'PERFECT' when 2*w>n then 'CONSENSUS' else 'COMPROMISE' end);
end $$;
create function gm20_private.select_winner(ids jsonb,seed text) returns text language plpgsql immutable set search_path=pg_catalog as $$
declare x bigint; counter bigint; draw bigint; bound bigint; lim bigint; sorted jsonb;
begin
 if not gm20_private.valid_ids(ids) or seed is null or seed !~ '^[0-9a-f]{8}$' then raise exception 'Invalid private selection input'; end if;
 select jsonb_agg(value order by value collate "C") into sorted from jsonb_array_elements_text(ids);
 bound:=jsonb_array_length(sorted); lim:=4294967296-(4294967296%bound); counter:=('x'||seed)::bit(32)::bigint;
 loop
  x:=counter; x:=mod(((x # (x>>16))::numeric * 2246822507),4294967296)::bigint;
  x:=mod(((x # (x>>13))::numeric * 3266489909),4294967296)::bigint;
  draw:=x # (x>>16); counter:=(counter+1)%4294967296; exit when draw<lim;
 end loop;
 return sorted->>(draw%bound)::integer;
end $$;
create function gm20_private.decide(input jsonb) returns jsonb language plpgsql immutable set search_path=pg_catalog as $$
declare evaluated jsonb;
begin
 if jsonb_typeof(input) is distinct from 'object' then return gm20_private.invalid(gm20_private.issue('INVALID_INPUT','')); end if;
 if jsonb_typeof(input->'seed') is distinct from 'string' or input->>'seed' !~ '^[0-9a-f]{8}$' then return gm20_private.invalid(gm20_private.issue('INVALID_INPUT','/seed')); end if;
 evaluated:=gm20_private.evaluate(input-'seed');
 if evaluated->>'status'='DECISION_READY' then return evaluated||jsonb_build_object('status','DECISION_SELECTED','winnerId',gm20_private.select_winner(evaluated->'candidateIds',input->>'seed')); end if;
 return evaluated;
end $$;

-- Canonical group identity handed to GM-21, independent of display/roster order.
create function gm20_private.group_key(users uuid[]) returns text language sql immutable set search_path=pg_catalog,extensions as $$
 select encode(extensions.digest(convert_to('gm21-group-v1:'||(select string_agg(u::text,',' order by u::text collate "C") from (select distinct unnest(users) u) ids),'UTF8'),'sha256'),'hex')
$$;
create function gm20_private.write_history(room_key uuid,result_key uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; result_row public.results%rowtype; card jsonb; person uuid; c public.consents%rowtype; cs uuid[]:='{}'; until_at timestamptz; opted boolean; all_opted boolean:=true;
begin
 select * into r from public.rooms where id=room_key;
 select * into result_row from public.results where id=result_key;
 if result_row.winner_round_dish_id is null then return; end if;
 select projection into card from gm19_private.pool_snapshots where round_dish_id=result_row.winner_round_dish_id;
 -- Lock consent rows before evaluating them. Reference epoch serializes writers.
 perform 1 from public.consents where user_id=any(r.roster_user_ids) and (room_id=r.id or room_id is null) order by id for update;
 until_at:=result_row.finalized_at+interval '30 days';
 foreach person in array r.roster_user_ids loop
  select coalesce(bool_or(value->>'historyConsent'='true'),false) into opted from jsonb_array_elements(r.consent_snapshot) where value->>'userId'=person::text;
  if opted then
   select * into c from public.consents where user_id=person and scope='personal_history' and (room_id=r.id or room_id is null) and enabled and revoked_at is null and granted_at<=result_row.finalized_at and (expires_at is null or expires_at>result_row.finalized_at) order by (room_id=r.id) desc nulls last limit 1;
   if found then
    insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
    values(gen_random_uuid(),'personal',person,array[person],gm20_private.group_key(array[person]),result_key,(card->>'dishId')::uuid,card->>'name',r.meal_slot,result_row.match_tier,result_row.finalized_at,least(result_row.finalized_at+interval '30 days',coalesce(c.expires_at,'infinity')),array[c.id],1);
   end if;
  end if;
  select * into c from public.consents where user_id=person and scope='group_history' and (room_id=r.id or room_id is null) and enabled and revoked_at is null and granted_at<=result_row.finalized_at and (expires_at is null or expires_at>result_row.finalized_at) order by (room_id=r.id) desc nulls last limit 1;
  if not opted or not found then all_opted:=false; else cs:=array_append(cs,c.id); until_at:=least(until_at,coalesce(c.expires_at,'infinity')); end if;
 end loop;
 if all_opted then
  insert into public.histories(id,scope,owner_user_id,member_user_ids,group_key,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,consent_ids,version)
  values(gen_random_uuid(),'group',null,r.roster_user_ids,gm20_private.group_key(r.roster_user_ids),result_key,(card->>'dishId')::uuid,card->>'name',r.meal_slot,result_row.match_tier,result_row.finalized_at,until_at,cs,1);
 end if;
end $$;
create function gm20_private.engine_input(room_key uuid,round_value integer) returns jsonb language sql security definer set search_path=pg_catalog as $$
 select jsonb_build_object('policyVersion',r.policy_version,'roster',r.roster_user_ids,'pool',(select jsonb_agg(choice_id::text order by choice_id::text collate "C") from public.round_dishes where room_id=r.id and round=1),'round',round_value,'round1',coalesce((select jsonb_object_agg(user_id::text,ballot) from (select m.user_id,jsonb_object_agg(rd.choice_id::text,v.value) ballot from public.submissions s join public.members m on m.id=s.member_id join public.votes v on v.submission_id=s.id join public.round_dishes rd on rd.id=v.round_dish_id where s.room_id=r.id and s.round=1 group by m.user_id) b),'{}'::jsonb)) || case when round_value=2 then jsonb_build_object('round2',coalesce((select jsonb_object_agg(user_id::text,ballot) from (select m.user_id,jsonb_object_agg(rd.choice_id::text,v.value) ballot from public.submissions s join public.members m on m.id=s.member_id join public.votes v on v.submission_id=s.id join public.round_dishes rd on rd.id=v.round_dish_id where s.room_id=r.id and s.round=2 group by m.user_id) b),'{}'::jsonb)) else '{}'::jsonb end from public.rooms r where r.id=room_key
$$;
create function gm20_private.finalize(room_key uuid,round_value integer) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; evaluated jsonb; old_row public.round_dishes%rowtype; new_id uuid; result_key uuid; winner uuid; choice text; seed text; event_key uuid; person uuid; now_at timestamptz:=clock_timestamp(); pos integer:=0;
begin
 select * into r from public.rooms where id=room_key for update;
 if r.state not in ('ROUND_1','ROUND_2') then raise exception 'Private finalize state invariant'; end if;
 evaluated:=gm20_private.evaluate(gm20_private.engine_input(room_key,round_value));
 if evaluated->>'status'='WAITING' then return null; end if;
 if evaluated->>'status'='ROUND_2' then
  for old_row in select * from public.round_dishes where room_id=room_key and round=1 and evaluated->'candidateIds' ? choice_id::text order by ordinal loop
   new_id:=gen_random_uuid();
   insert into public.round_dishes(id,room_id,round,choice_id,dish_id,variant,offering_id,venue_id,ordinal,dataset_version,schedule_id,schedule_version,effective_profile,price,pool_version,version)
   values(new_id,room_key,2,old_row.choice_id,old_row.dish_id,old_row.variant,old_row.offering_id,old_row.venue_id,pos,old_row.dataset_version,old_row.schedule_id,old_row.schedule_version,old_row.effective_profile,old_row.price,r.pool_version+1,1);
   insert into gm19_private.pool_snapshots select new_id,jsonb_set(projection,'{roundDishId}',to_jsonb(new_id::text)) from gm19_private.pool_snapshots where round_dish_id=old_row.id;
   pos:=pos+1;
  end loop;
  update public.rooms set state='ROUND_2',pool_version=pool_version+1,version=version+1,updated_at=now_at where id=room_key;
  return null;
 end if;
 if evaluated->>'status' not in ('DECISION_READY','NO_CONSENSUS') then raise exception 'Private decision invariant'; end if;
 result_key:=gen_random_uuid();
 if evaluated->>'status'='DECISION_READY' then
  seed:=encode(extensions.gen_random_bytes(4),'hex'); choice:=gm20_private.select_winner(evaluated->'candidateIds',seed);
  select id into strict winner from public.round_dishes where room_id=room_key and round=round_value and choice_id=choice::uuid;
 end if;
 insert into public.results(id,room_id,winner_round_dish_id,reason_code,match_tier,policy_version,tied_choice_ids,finalized_at,version)
 values(result_key,room_key,winner,evaluated->>'reasonCode',evaluated->>'matchTier',r.policy_version,array(select value::uuid from jsonb_array_elements_text(evaluated->'candidateIds')),now_at,1);
 if seed is not null then insert into gm20_private.decision_seeds values(result_key,seed,'u32-murmur3-rejection-v1'); end if;
 perform gm20_private.write_history(room_key,result_key);
 event_key:=gen_random_uuid();
 insert into public.events(id,kind,room_id,invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
 values(event_key,'ROOM_RESULT_READY',room_key,null,result_key,r.roster_user_ids,'gm20-result:'||result_key,now_at,now_at+interval '7 days',1);
 foreach person in array r.roster_user_ids loop
  insert into public.inbox(id,owner_user_id,event_id,read_at,created_at,expires_at,version) values(gen_random_uuid(),person,event_key,null,now_at,now_at+interval '7 days',1);
 end loop;
 update public.rooms set state=case when winner is null then 'NO_CONSENSUS' else 'DECIDED' end,version=version+1,updated_at=now_at where id=room_key;
 return result_key;
end $$;
create function gm20_private.error(code text,status integer,room uuid default null,request_id text default null) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform set_config('response.status',status::text,true);
 return jsonb_strip_nulls(jsonb_build_object('ok',false,'messageKey',code,'requestId',request_id,'roomId',room,'error',jsonb_build_object('messageKey',code),'retryAfterSeconds',case when status=429 then 60 else null end));
end $$;
create function gm20_private.wire_id(value jsonb) returns boolean language sql immutable set search_path=pg_catalog as $$
 select coalesce(jsonb_typeof(value)='string' and length(value#>>'{}') between 1 and 128 and value#>>'{}' !~ '[[:cntrl:]]',false)
$$;
create function public.submit_ballot("requestId" jsonb default null,room_id jsonb default null,"round" jsonb default null,pool_version jsonb default null,intent_id jsonb default null,expected_version jsonb default null,votes jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid:=gm19_private.require_auth(); req text; intent text; request_key uuid; rid uuid; rn integer; pv bigint; ev bigint; r public.rooms%rowtype; member_key uuid; old public.submissions%rowtype; wire gm20_private.submission_wire%rowtype; payload_key text; ack jsonb; semantic text; normalized jsonb; item jsonb; submission_key uuid; result_key uuid; response_value jsonb; receipt jsonb; all_submitted boolean; previous_version bigint;
begin
 if not gm20_private.wire_id("requestId") or not gm20_private.wire_id(intent_id) or jsonb_typeof(room_id) is distinct from 'string' or gm19_private.uuid_or_null(room_id#>>'{}') is null or "round" is null or "round" not in ('1'::jsonb,'2'::jsonb) or jsonb_typeof(pool_version) is distinct from 'number' or jsonb_typeof(expected_version) is distinct from 'number' then return gm20_private.error('INVALID_INPUT',400); end if;
 if (pool_version#>>'{}')::numeric not between 1 and 9007199254740991 or (expected_version#>>'{}')::numeric not between 1 and 9007199254740991 or trunc((pool_version#>>'{}')::numeric)<>(pool_version#>>'{}')::numeric or trunc((expected_version#>>'{}')::numeric)<>(expected_version#>>'{}')::numeric then return gm20_private.error('INVALID_INPUT',400); end if;
 req:="requestId"#>>'{}'; intent:=intent_id#>>'{}'; request_key:=gm19_private.request_uuid(req); rid:=(room_id#>>'{}')::uuid; rn:=("round"#>>'{}')::integer; pv:=(pool_version#>>'{}')::bigint; ev:=(expected_version#>>'{}')::bigint;
 payload_key:=gm19_private.hash_payload(jsonb_build_object('requestId',req,'roomId',room_id,'round',"round",'poolVersion',pool_version,'intentId',intent_id,'expectedVersion',expected_version,'votes',votes));
 ack:=gm19_private.ack_lookup('submit_ballot',request_key,payload_key);
 if ack->>'kind'='reused' then return gm20_private.error('REQUEST_ID_REUSED',409,rid,req); end if;
 if ack->>'kind'='replay' then return ack->'response'; end if;
 -- The private cache may expire before the retention job removes its public key.
 -- Reclaim only this caller's expired attempt, under the reference lock acquired above.
 delete from public.idempotency i where i.user_id=caller and i.operation='submit_ballot'
   and i.request_id=request_key and i.expires_at<=statement_timestamp();
 select * into r from public.rooms where id=rid for update;
 select id into member_key from public.members where public.members.room_id=rid and user_id=caller and left_at is null;
 if r.id is null or member_key is null or not caller=any(r.roster_user_ids) then return gm20_private.error('NOT_MEMBER',403,rid,req); end if;
 select * into old from public.submissions where public.submissions.room_id=rid and member_id=member_key and public.submissions.round=rn;
 if old.id is null then
  if r.expires_at<=clock_timestamp() then return gm20_private.error('ROOM_EXPIRED',410,rid,req); end if;
  if ev<>r.version or pv<>r.pool_version or rn<>(select coalesce(max(rd.round),1) from public.round_dishes rd where rd.room_id=rid) then return gm20_private.error('VERSION_CONFLICT',409,rid,req); end if;
  if r.state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED') then return gm20_private.error('ROOM_TERMINAL',409,rid,req); end if;
  if r.state not in ('ROUND_1','ROUND_2') then return gm20_private.error('INVALID_ROOM_STATE',409,rid,req); end if;
 end if;
 if jsonb_typeof(votes) is distinct from 'array' then return gm20_private.error('INVALID_INPUT',400,rid,req); end if;
 if jsonb_array_length(votes)>8 then return gm20_private.error('INVALID_INPUT',400,rid,req); end if;
 for item in select value from jsonb_array_elements(votes) loop
  if jsonb_typeof(item)<>'object' or not item ?& array['roundDishId','vote'] or exists(select 1 from jsonb_object_keys(item) k where k not in ('roundDishId','vote')) or jsonb_typeof(item->'roundDishId')<>'string' or gm19_private.uuid_or_null(item->>'roundDishId') is null or jsonb_typeof(item->'vote')<>'string' then return gm20_private.error('INVALID_INPUT',400,rid,req); end if;
  if not (item->>'vote'=any(case when rn=1 then array['WANT','OK','NO'] else array['KEEP','REMOVE'] end)) then return gm20_private.error('INVALID_INPUT',400,rid,req); end if;
  if not exists(select 1 from public.round_dishes rd where rd.id=(item->>'roundDishId')::uuid and rd.room_id=rid and rd.round=rn) then return gm20_private.error('INVALID_DISH',400,rid,req); end if;
 end loop;
 if (select count(*)<>count(distinct (value->>'roundDishId')::uuid) from jsonb_array_elements(votes)) then return gm20_private.error('INVALID_INPUT',400,rid,req); end if;
 if jsonb_array_length(votes)<>(select count(*) from public.round_dishes rd where rd.room_id=rid and rd.round=rn) then return gm20_private.error('INCOMPLETE_BALLOT',400,rid,req); end if;
 select coalesce(jsonb_agg(jsonb_build_object('roundDishId',(value->>'roundDishId')::uuid,'vote',value->>'vote') order by (value->>'roundDishId')::uuid),'[]') into normalized from jsonb_array_elements(votes);
 semantic:=gm19_private.hash_payload(jsonb_build_object('roomId',rid,'caller',caller,'round',rn,'poolVersion',pv,'votes',normalized));
 if old.id is not null then
  select * into wire from gm20_private.submission_wire where submission_id=old.id;
  if wire.intent_id is distinct from intent or wire.semantic_hash is distinct from semantic then return gm20_private.error('ALREADY_SUBMITTED',409,rid,req); end if;
  response_value:=jsonb_set(jsonb_set(wire.original_ack,'{requestId}',to_jsonb(req)),'{data,receipt,requestId}',to_jsonb(req));
  select id into result_key from public.results where public.results.room_id=rid;
  perform gm19_private.save_ack('submit_ballot',request_key,payload_key,rid,result_key,ev,(response_value->>'version')::bigint,response_value);
  return response_value;
 end if;
 if exists(select 1 from public.submissions where member_id=member_key and public.submissions.intent_id=gm19_private.request_uuid(intent)) then return gm20_private.error('ALREADY_SUBMITTED',409,rid,req); end if;
 if not gm19_private.allow_call('submit_ballot',60) then return gm20_private.error('RATE_LIMITED',429,rid,req); end if;
 if r.expires_at<=clock_timestamp() then return gm20_private.error('ROOM_EXPIRED',410,rid,req); end if;
 submission_key:=gen_random_uuid(); previous_version:=r.version;
 insert into public.submissions(id,room_id,member_id,round,intent_id,request_id,payload_hash,pool_version,accepted_at,version)
 values(submission_key,rid,member_key,rn,gm19_private.request_uuid(intent),request_key,semantic,pv,clock_timestamp(),1);
 insert into public.votes(id,submission_id,round_dish_id,value,version) select gen_random_uuid(),submission_key,(value->>'roundDishId')::uuid,value->>'vote',1 from jsonb_array_elements(normalized);
 result_key:=gm20_private.finalize(rid,rn);
 select * into r from public.rooms where id=rid;
 if r.version=previous_version then update public.rooms set version=version+1,updated_at=clock_timestamp() where id=rid returning * into r; end if;
 select count(*)=cardinality(r.roster_user_ids) into all_submitted from public.submissions s join public.members m on m.id=s.member_id where s.room_id=rid and s.round=rn and m.user_id=any(r.roster_user_ids);
 select jsonb_build_object('round',rn,'intentId',intent,'requestId',req,'submittedAt',accepted_at,'voteCount',jsonb_array_length(normalized)) into receipt from public.submissions where id=submission_key;
 response_value:=jsonb_build_object('ok',true,'requestId',req,'roomId',rid,'version',r.version,'state',r.state,'data',jsonb_build_object('accepted',true,'round',rn,'allMembersSubmitted',all_submitted,'roomVersion',r.version,'receipt',receipt));
 insert into gm20_private.submission_wire values(submission_key,intent,req,semantic,response_value);
 perform gm19_private.save_ack('submit_ballot',request_key,payload_key,rid,result_key,ev,r.version,response_value);
 return response_value;
exception when sqlstate 'PT401' then raise; when others then
 -- This block is a subtransaction: all business mutations roll back before ACK failure.
 return gm20_private.error('UNKNOWN_ERROR',503,rid,req);
end $$;

create or replace function public.get_room_snapshot(room_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); rid uuid; r public.rooms%rowtype; member_data jsonb; pool_data jsonb; pref_data jsonb; votes_data jsonb; submission_data jsonb; result_data jsonb; current_round integer;
begin
  begin rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  if not exists(select 1 from public.members where public.members.room_id=rid and user_id=caller and left_at is null) then return gm19_private.error('NOT_MEMBER',403); end if;
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  select * into r from public.rooms where id=rid for share; if not found then return gm19_private.error('NOT_MEMBER',403); end if;
  if not exists(select 1 from public.members m where m.room_id=rid and m.user_id=caller and m.left_at is null) then return gm19_private.error('NOT_MEMBER',403); end if;
  if r.expires_at<=clock_timestamp() then return gm19_private.error('ROOM_EXPIRED',410,rid); end if;
  if not gm19_private.allow_call('get_room_snapshot',60) then return gm19_private.error('RATE_LIMITED',429,rid); end if;
  -- Terminal cancellation has no result and must retain the last locked round.
  -- pool_version also changes in the lobby; it cannot identify a voting round.
  select coalesce(max(rd.round),1) into current_round from public.round_dishes rd where rd.room_id=rid;
  select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'displayName',m.nickname,'isHost',m.user_id=r.host_user_id,
      'ready',m.ready,'joinedAt',m.joined_at,'hasSubmitted',exists(select 1 from public.submissions s where s.member_id=m.id and s.round=current_round))), '[]')
    into member_data from public.members m where m.room_id=rid and m.left_at is null;
  select coalesce(jsonb_agg(ps.projection order by rd.ordinal),'[]') into pool_data
    from public.round_dishes rd join gm19_private.pool_snapshots ps on ps.round_dish_id=rd.id
    where rd.room_id=rid and rd.round=current_round;
  select jsonb_strip_nulls(jsonb_build_object('cuisineIds',p.cuisine_ids,'categoryIds',p.category_ids,'temperature',p.temperature,'flavor',p.flavor,'historyConsent',m.history_consent))
    into pref_data from public.preferences p join public.members m on m.room_id=p.room_id and m.user_id=p.user_id where p.room_id=rid and p.user_id=caller and m.left_at is null;
  select coalesce(jsonb_object_agg(v.round_dish_id::text,v.value),'{}') into votes_data from public.votes v join public.submissions s on s.id=v.submission_id join public.members m on m.id=s.member_id where s.room_id=rid and m.user_id=caller and s.round=current_round;
  select jsonb_build_object('round',s.round,'intentId',w.intent_id,'requestId',w.request_id,'submittedAt',s.accepted_at,'voteCount',(select count(*) from public.votes vv where vv.submission_id=s.id)) into submission_data from public.submissions s join public.members m on m.id=s.member_id join gm20_private.submission_wire w on w.submission_id=s.id where s.room_id=rid and m.user_id=caller and s.round=current_round;
  select jsonb_build_object('resultId',rs.id,'roomId',rid,'round',current_round,'winnerRoundDishId',rs.winner_round_dish_id,'winnerDish',ps.projection,'reasonCode',rs.reason_code,'matchTier',rs.match_tier,'finalizedAt',rs.finalized_at,'policyVersion',rs.policy_version) into result_data from public.results rs left join gm19_private.pool_snapshots ps on ps.round_dish_id=rs.winner_round_dish_id where rs.room_id=rid;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',r.id::text,'code',r.code,'state',r.state,'version',r.version,'hostUserId',r.host_user_id::text,
    'context',jsonb_strip_nulls(jsonb_build_object('anchorId',r.anchor_id::text,'anchorName',r.anchor_display_name,'radiusM',r.radius_m,'desiredAt',r.desired_at,
     'serviceMode',r.service_mode,'mealSlot',r.meal_slot,'timeHint',r.time_hint,'budget',case when r.budget is null then null else to_jsonb((r.budget->>'max')::numeric) end,'avoidRecent',r.avoid_recent)),
    'members',member_data,'ownPreferences',pref_data,'round',current_round,'poolVersion',r.pool_version,'pool',pool_data,'ownVotes',votes_data,'ownSubmission',submission_data,
    'datasetVersion',r.dataset_version,'eligibilityVersion',r.eligibility_version,'evaluatedAt',r.evaluated_at,'result',result_data,'expiresAt',r.expires_at));
end $$;

revoke all on all tables in schema gm20_private from public, anon, authenticated, service_role, gm06_publisher;
revoke execute on all functions in schema gm20_private from public, anon, authenticated, service_role;
revoke all on function public.submit_ballot(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_ballot(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.5.0','food-v1/roadmap-v2/GM-20.3','1.1.0','1.1.0','c20f7c2: GM-06/07/15/19/22');
commit;
