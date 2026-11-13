-- Tie-break chain for canonical (B-supplement) results (ADR-022). Companion of 0047.
-- `evaluate_v4` stays untouched (it is the pure decision model with SQL/domain parity fixtures).
-- After it decides, `apply_tiebreak` re-orders the terminal podium with the same chain as 0047:
--   score, more WANT votes, shorter average decision time (missing last), winner, dish id.
-- The winner is the head of that chain; only a complete tie uses the seeded draw.
-- Ranks stay dense by score, so the stored shape still satisfies gm06_canonical.valid_terminal.
begin;

create function gm20_canonical_private.apply_tiebreak(room_key uuid,decision jsonb,seed_value text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare winner uuid; podium jsonb; winner_wants integer; ballots integer; tier text;
begin
 ballots:=(decision->>'round1BallotCount')::integer;
 winner:=dish_v4_private.pick_winner(room_key,decision->'candidateIds',seed_value);
 select jsonb_agg(jsonb_build_object('dishId',q.id,'score',q.score,'rank',q.rank,'isWinner',q.id=winner::text) order by q.ord) into podium
  from (
   select s.id,s.score,
    dense_rank() over(order by s.score desc) rank,
    row_number() over(order by s.score desc,s.wants desc,s.pace asc nulls last,(s.id=winner::text) desc,s.id collate "C") ord
   from (
    select e.value id,
     coalesce((select sum(case b.votes->>e.value when 'WANT' then 2 when 'OK' then 1 else 0 end)
      from dish_v4_private.ballots b where b.room_id=room_key and b.round=1),0)::integer score,
     (select count(*) from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>e.value='WANT')::integer wants,
     dish_v4_private.pace_ms(room_key,e.value) pace
    from jsonb_array_elements_text(decision->'eligibleIds') e
   ) s
  ) q where q.ord<=3;
 select count(*) into winner_wants from dish_v4_private.ballots b where b.room_id=room_key and b.round=1 and b.votes->>winner::text='WANT';
 tier:=case when winner_wants=ballots then 'PERFECT' when winner_wants*2>ballots then 'CONSENSUS' else 'COMPROMISE' end;
 return decision||jsonb_build_object('winnerId',winner::text,'topDishes',podium,'matchTier',tier);
end $$;
revoke all on function gm20_canonical_private.apply_tiebreak(uuid,jsonb,text) from public,anon,authenticated,service_role;

create or replace function gm20_canonical_private.finish(room_key uuid,source text) returns uuid
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
 if decision->>'status'='DECIDED' then decision:=gm20_canonical_private.apply_tiebreak(room_key,decision,seed_value); end if;
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
revoke all on function gm20_canonical_private.finish(uuid,text) from public,anon,authenticated,service_role;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.24.0','dish-session-v4/roadmap-v2/podium-tiebreak-canonical','1.1.0','1.1.0','0048_canonical_podium_tiebreak');

commit;
