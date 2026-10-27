-- Keep the result podium within three entries when a tied winner falls
-- outside the deterministic cutoff. Preserve the winner and dense ranks.
begin;

create or replace function dish_v4_private.dense_podium(candidates jsonb,round1_pool jsonb,room_key uuid,winner_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare item record; score_value integer; ordered jsonb:='[]'; winner_item jsonb; winner_present boolean; selected jsonb; entry jsonb; rank_value integer:=0; previous integer:=null;
begin
 for item in select value from jsonb_array_elements(candidates) order by value->>'dishId' collate "C" loop
  select coalesce(sum(case when b.votes->>(item.value->>'dishId')='WANT' then 2 when b.votes->>(item.value->>'dishId')='OK' then 1 else 0 end),0)::integer into score_value
   from dish_v4_private.ballots b where b.room_id=room_key and b.round=1;
  ordered:=ordered||jsonb_build_array(jsonb_build_object('dish',item.value,'dishId',item.value->>'dishId','score',score_value));
 end loop;
 select coalesce(jsonb_agg(value order by (value->>'score')::integer desc,value->>'dishId' collate "C"),'[]'::jsonb) into ordered from jsonb_array_elements(ordered);
 selected:=(select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from (
  select value,row_number() over(order by (value->>'score')::integer desc,value->>'dishId' collate "C") ord
   from jsonb_array_elements(ordered) order by ord limit 3
 ) q);
 winner_item:=(select value from jsonb_array_elements(ordered) where value->>'dishId'=winner_id::text);
 winner_present:=exists(select 1 from jsonb_array_elements(selected) where value->>'dishId'=winner_id::text);
 if winner_item is null then raise exception 'Winner must be in final candidate set'; end if;
 if not winner_present then
  selected:=(select coalesce(jsonb_agg(value order by (value->>'score')::integer desc,value->>'dishId' collate "C"),'[]'::jsonb)
   from (select value from jsonb_array_elements(selected) order by (value->>'score')::integer desc,value->>'dishId' collate "C" limit 2) q)
   ||jsonb_build_array(winner_item);
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

commit;
