-- Tie-break chain for the result podium (ADR-022).
-- Additive: earlier migrations stay immutable.
--  * The ballot may carry an optional `pace` list (ms spent on each flashcard, round 1 only).
--    `public.dish_session` strips it before the pinned B-contract handler sees the payload, so the wire
--    contract and the idempotent request hash are unchanged; the values land in a private table.
--  * Dishes with the same score are ordered by: more WANT votes, then shorter average decision time
--    (missing time sorts last), then the winner, then dish id. The winner is the head of that chain;
--    only a complete tie falls back to the seeded draw (`gm20_private.select_winner`) as before.
--  * Ranks stay dense by score and the wire shape, score version and ranking version are unchanged;
--    the order of `topDishes` is what carries the tie-break.
begin;

create table dish_v4_private.ballot_pace(
 room_id uuid not null, user_id uuid not null, round integer not null check(round=1),
 pace jsonb not null check(jsonb_typeof(pace)='object'),
 primary key(room_id,user_id,round),
 foreign key(room_id,user_id,round) references dish_v4_private.ballots(room_id,user_id,round) on delete cascade
);
alter table dish_v4_private.ballot_pace enable row level security;
alter table dish_v4_private.ballot_pace force row level security;
revoke all on dish_v4_private.ballot_pace from public,anon,authenticated,service_role;

create function dish_v4_private.pace_ms(room_key uuid,dish text) returns numeric
language sql stable security definer set search_path=pg_catalog as $$
 select avg((p.pace->>dish)::numeric) from dish_v4_private.ballot_pace p
  where p.room_id=room_key and p.round=1 and p.pace ? dish
$$;
revoke all on function dish_v4_private.pace_ms(uuid,text) from public,anon,authenticated,service_role;

create function dish_v4_private.pick_winner(room_key uuid,choice_ids jsonb,seed text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare narrowed jsonb;
begin
 with c as (select v.value as id from jsonb_array_elements_text(choice_ids) v),
  w as (select c.id,
   (select count(*) from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>c.id='WANT')::integer wants,
   dish_v4_private.pace_ms(room_key,c.id) pace from c),
  w1 as (select * from w where wants=(select max(wants) from w)),
  w2 as (select * from w1 where pace is not distinct from (select min(pace) from w1))
 select coalesce(jsonb_agg(id order by id collate "C"),'[]'::jsonb) into narrowed from w2;
 return gm20_private.select_winner(narrowed,seed)::uuid;
end $$;
revoke all on function dish_v4_private.pick_winner(uuid,jsonb,text) from public,anon,authenticated,service_role;

create or replace function dish_v4_private.dense_podium(candidates jsonb,round1_pool jsonb,room_key uuid,winner_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare entry jsonb:='[]'; item record; rank_value integer:=0; previous integer;
begin
 if not exists(select 1 from jsonb_array_elements(candidates) c where c.value->>'dishId'=winner_id::text) then
  raise exception 'Winner must be in final candidate set';
 end if;
 for item in
  select c.value as dish,s.score,s.wants
   from jsonb_array_elements(candidates) c
   cross join lateral (
    select coalesce(sum(case b.votes->>(c.value->>'dishId') when 'WANT' then 2 when 'OK' then 1 else 0 end),0)::integer score,
     (count(*) filter(where b.votes->>(c.value->>'dishId')='WANT'))::integer wants
     from dish_v4_private.ballots b where b.room_id=room_key and b.round=1) s
   order by s.score desc,s.wants desc,dish_v4_private.pace_ms(room_key,c.value->>'dishId') asc nulls last,
    (c.value->>'dishId'=winner_id::text) desc,c.value->>'dishId' collate "C"
   limit 3
 loop
  if previous is distinct from item.score then rank_value:=rank_value+1; end if;
  previous:=item.score;
  entry:=entry||jsonb_build_array(jsonb_build_object('dish',item.dish,'score',item.score,'rank',rank_value,
   'isWinner',item.dish->>'dishId'=winner_id::text));
 end loop;
 return entry;
end $$;

create or replace function dish_v4_private.finish_baseline_0111(room_key uuid,source text) returns uuid
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
  winner:=dish_v4_private.pick_winner(room_key,choice_ids,s.pool_seed);
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

alter function public.dish_session(text,jsonb) rename to dish_session_before_pace;
revoke all on function public.dish_session_before_pace(text,jsonb) from public,anon,authenticated,service_role;
create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; raw_pace jsonb; room_key uuid; caller uuid; pool jsonb; stored jsonb:='{}'; item jsonb; dish_id text; ms numeric;
begin
 if command is distinct from 'submit' or jsonb_typeof(payload) is distinct from 'object' or not payload ? 'pace' then
  return public.dish_session_before_pace(command,payload);
 end if;
 raw_pace:=payload->'pace';
 answer:=public.dish_session_before_pace(command,payload-'pace');
 if answer->>'ok' is distinct from 'true' or payload->>'round' is distinct from '1' then return answer; end if;
 -- The decision time only breaks ties: a malformed or missing value is ignored, it never fails the vote.
 begin
  caller:=auth.uid(); room_key:=gm19_private.uuid_or_null(payload->>'roomId');
  select s.initial_pool into pool from dish_v4_private.sessions s where s.room_id=room_key;
  if caller is not null and pool is not null and jsonb_typeof(raw_pace)='array' and jsonb_array_length(raw_pace)<=20 then
   for item in select v.value from jsonb_array_elements(raw_pace) v loop
    if jsonb_typeof(item)='object' and jsonb_typeof(item->'roundDishId')='string' and jsonb_typeof(item->'ms')='number' then
     dish_id:=null;
     select p.value->>'dishId' into dish_id from jsonb_array_elements(pool) p where p.value->>'roundDishId'=item->>'roundDishId';
     if dish_id is not null then
      ms:=least(greatest(round((item->>'ms')::numeric),0),60000);
      stored:=stored||jsonb_build_object(dish_id,ms);
     end if;
    end if;
   end loop;
   if stored<>'{}'::jsonb then
    insert into dish_v4_private.ballot_pace(room_id,user_id,round,pace) values(room_key,caller,1,stored) on conflict do nothing;
   end if;
  end if;
 exception when others then null;
 end;
 return answer;
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.23.0','dish-session-v4/roadmap-v2/podium-tiebreak','1.1.0','1.1.0','0047_dish_v4_podium_tiebreak');

commit;
