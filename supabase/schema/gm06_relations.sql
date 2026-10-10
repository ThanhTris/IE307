-- SQL integrity only. Selection, membership permission, publish pipeline, consent
-- withdrawal/cleanup and transaction state transitions belong to later API tasks.
alter table public.members add unique(id,room_id);
alter table public.submissions add foreign key(member_id,room_id)
  references public.members(id,room_id) deferrable initially deferred;
alter table public.public_anchors add unique(anchor_id,coverage_id);
alter table public.rooms add foreign key(anchor_id,coverage_id)
  references public.public_anchors(anchor_id,coverage_id) deferrable initially deferred;

-- Weekly ranges can wrap Sunday -> Monday. Pairwise overlap check locks their
-- group row before examining committed intervals, including the cyclic boundary.
-- The lock is acquired before row insertion/update to serialize competing writers.
create function gm06_private.lock_schedule_group() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare group_id uuid;
begin
  -- A real tuple update also rejects write skew under REPEATABLE READ (40001);
  -- a lock alone would leave the second writer's old snapshot unchanged.
  for group_id in select schedule_id from public.schedule_groups
      where schedule_id in (new.schedule_id,old.schedule_id) order by schedule_id loop
    update public.schedule_groups set version=version+1 where schedule_id=group_id;
  end loop;
  if TG_OP='DELETE' then return old; else return new; end if;
end $$;
create trigger weekly_schedules_group_lock before insert or update or delete on public.weekly_schedules
  for each row execute function gm06_private.lock_schedule_group();

create function gm06_private.relation_guard() returns trigger
language plpgsql security definer set search_path = pg_catalog, gm06_private as $$
begin
  if exists(select 1 from public.venue_dishes o join public.venues v on v.id=o.venue_id
    join public.schedule_groups g on g.schedule_id=o.schedule_id
    where g.timezone<>v.timezone or (o.service_mode is not null and not o.service_mode=any(v.service_modes))) then
    raise exception using errcode='23514',message='GM06_OFFERING_CONTEXT';
  end if;
  if exists(select 1 from public.weekly_schedules a join public.weekly_schedules b
       on a.schedule_id=b.schedule_id and a.id<b.id
       cross join (values(-10080),(0),(10080)) w(shift)
       where a.status='open' and b.status='open' and
       greatest((a.day_of_week-1)*1440+gm06_private.minute_of_day(a.start_time),
         (b.day_of_week-1)*1440+gm06_private.minute_of_day(b.start_time)+w.shift) <
       least((a.day_of_week-1+a.end_day_offset)*1440+gm06_private.minute_of_day(a.end_time),
         (b.day_of_week-1+b.end_day_offset)*1440+gm06_private.minute_of_day(b.end_time)+w.shift)) then
    raise exception using errcode='23514',message='GM06_SCHEDULE_OVERLAP';
  end if;
  if exists(select 1 from public.votes v join public.submissions s on s.id=v.submission_id
    join public.round_dishes p on p.id=v.round_dish_id where
    s.room_id<>p.room_id or s.round<>p.round or
    (s.round=1 and v.value not in ('WANT','OK','NO')) or
    (s.round=2 and v.value not in ('KEEP','REMOVE'))) then
    raise exception using errcode='23514',message='GM06_VOTE_ROOM_ROUND';
  end if;
  if exists(select 1 from public.results r join public.round_dishes p on p.id=r.winner_round_dish_id
    where r.room_id<>p.room_id or not p.choice_id=any(r.tied_choice_ids) or
    (r.reason_code='UNANIMOUS_WANT' and p.round<>1) or
    (r.reason_code='ACCEPTABLE_FINAL' and p.round<>2)) then
    raise exception using errcode='23514',message='GM06_RESULT_REFERENCE';
  end if;
  -- Wrong taxonomy type is invalid even when the UUID exists.
  if exists(select 1 from public.dishes d cross join lateral unnest(d.cuisine_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'cuisine') or
     exists(select 1 from public.dishes d cross join lateral unnest(d.category_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'category') or
     exists(select 1 from public.preferences d cross join lateral unnest(d.cuisine_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'cuisine') or
     exists(select 1 from public.preferences d cross join lateral unnest(d.category_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'category') then
    raise exception using errcode='23514',message='GM06_TAXONOMY_TYPE';
  end if;
  if exists(select 1 from public.schedule_groups g where not exists(
       select 1 from public.weekly_schedules w where w.schedule_id=g.schedule_id)) then
    raise exception using errcode='23514',message='GM06_EMPTY_SCHEDULE_GROUP';
  end if;
  if exists(select 1 from (
       select profile_overrides profile from public.venue_dishes
       union all select effective_profile from public.round_dishes) d
       cross join lateral jsonb_array_elements_text(d.profile->'cuisineIds') x(id)
       join public.taxonomy t on t.id=x.id::uuid where t.type<>'cuisine') or
     exists(select 1 from (
       select profile_overrides profile from public.venue_dishes
       union all select effective_profile from public.round_dishes) d
       cross join lateral jsonb_array_elements_text(d.profile->'categoryIds') x(id)
       join public.taxonomy t on t.id=x.id::uuid where t.type<>'category') then
    raise exception using errcode='23514',message='GM06_PROFILE_TAXONOMY_TYPE';
  end if;
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['venues','venue_dishes','schedule_groups','weekly_schedules',
    'votes','submissions','round_dishes','results','taxonomy','dishes','preferences'] loop
    execute format('create constraint trigger %I after insert or update or delete on public.%I deferrable initially deferred for each row execute function gm06_private.relation_guard()', t||'_relation_guard',t);
  end loop;
end $$;
