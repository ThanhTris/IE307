-- ADR-024 / 0050: soft preference ranking, 5..20 dishes, origin on canonical cards only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(16);

select extensions.ok(exists(
  select 1 from public.schema_versions where schema_version = '0.26.0' and upstream_revision = 'ADR-024/0050_preference_ranking'
), '0050 is registered');

-- preference_match: one point per matched dimension, unknown data matches nothing
select extensions.is(dish_v4_private.preference_match(
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650"]}',
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650","abd817da-4bee-58c2-936d-8f60aa7a5e80"]}'), 1, 'a shared dish group counts once');
select extensions.is(dish_v4_private.preference_match('{"origin":"north"}', '{"cuisineIds":["f3e57f22-1cc1-51c8-ad0d-5448436e2f85"]}'), 1, 'region matches origin');
select extensions.is(dish_v4_private.preference_match('{"origin":"south"}', '{"cuisineIds":["f3e57f22-1cc1-51c8-ad0d-5448436e2f85"]}'), 0, 'another region does not match');
select extensions.is(dish_v4_private.preference_match('{"origin":"west"}', '{"cuisineIds":["a739129b-1f51-5ba8-a53f-4c5d66455f68"]}'), 1, 'Miền Tây maps to west');
select extensions.is(dish_v4_private.preference_match(
  '{"categoryIds":[],"origin":"unknown","flavor":null}',
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650"],"cuisineIds":["f3e57f22-1cc1-51c8-ad0d-5448436e2f85"],"flavor":{"spicy":{"present":true,"intensity":"unknown"}}}'), 0, 'unknown dish data matches nothing');
select extensions.is(dish_v4_private.preference_match(
  '{"flavor":{"spicy":{"present":true,"intensity":"high"},"sour":{"present":true,"intensity":"low"},"sweet":{"present":false,"intensity":"none"}}}',
  '{"flavor":{"spicy":{"present":true,"intensity":"unknown"},"sour":{"present":true,"intensity":"unknown"},"sweet":{"present":true,"intensity":"unknown"}}}'), 2, 'Cay and Chua match, Ngọt does not');
select extensions.is(dish_v4_private.preference_match('{"flavor":{"salty":{"present":true,"intensity":"low"}}}', '{"flavor":{"salty":{"present":true,"intensity":"low"}}}'), 1, 'Thanh đạm matches low salt');
select extensions.is(dish_v4_private.preference_match('{"flavor":{"salty":{"present":true,"intensity":"high"}}}', '{"flavor":{"salty":{"present":true,"intensity":"low"}}}'), 0, 'Thanh đạm does not match high salt');
select extensions.is(dish_v4_private.preference_match('{"flavor":{"salty":{"present":true,"intensity":"medium"}}}', '{"flavor":{"salty":{"present":true,"intensity":"high"}}}'), 1, 'Mặn / Đậm đà matches medium or high salt');
select extensions.is(dish_v4_private.preference_match('{"categoryIds":["86089932-3503-5934-a401-60374d76a61d"]}', '{"categoryIds":["86089932-3503-5934-a401-60374d76a61d"]}'), 1, 'Béo / Ngậy tag matches once, not as a group too');

-- ranked_pool: preferred dishes are drawn, count and meal kept, seeded order kept in the output
with catalogue(cards) as (select '[
  {"dishId":"00000000-0000-4000-8000-000000000001","name":"A","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":[]},
  {"dishId":"00000000-0000-4000-8000-000000000002","name":"B","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650"]},
  {"dishId":"00000000-0000-4000-8000-000000000003","name":"C","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":[]},
  {"dishId":"00000000-0000-4000-8000-000000000004","name":"D","mealSlots":["dinner"],"cuisineIds":[],"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650"]}
]'::jsonb)
select extensions.ok((select (select bool_or(d->>'name' = 'B') and bool_and(d->>'name' <> 'D') and count(*) = 2
  from jsonb_array_elements(dish_v4_private.ranked_pool(cards, 2, 'lunch', 'abc',
    '[{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650"]}]')) d) from catalogue), 'the matching lunch dish is always drawn, never another meal');

select extensions.ok((
  select dish_v4_private.ranked_pool('[{"dishId":"00000000-0000-4000-8000-000000000001","name":"A","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":[]}]', 1, 'lunch', 'abc', '[]') -> 0 ? 'origin'
), 'canonical pool cards carry origin');
select extensions.ok(not (dish_v4_private.card('{"dishId":"x","name":"a","origin":"north"}') ? 'origin'), 'the baseline card shape is unchanged');

-- 5..20 dishes in storage
select extensions.ok(exists(select 1 from pg_constraint where conname = 'sessions_requested_count_check'
  and conrelid = 'dish_v4_private.sessions'::regclass and pg_get_constraintdef(oid) ~ '>= 5'), 'sessions accept 5 dishes');
select extensions.ok(pg_get_functiondef('gm06_canonical.valid_terminal'::regproc) ~ 'not between 5 and 20'
  and pg_get_functiondef('gm20_canonical_private.evaluate_v4'::regproc) ~ 'not between 5 and 20', 'decision model and stored-result check accept 5-dish pools');

select * from extensions.finish();
rollback;
