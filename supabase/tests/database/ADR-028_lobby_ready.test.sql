-- ADR-028 / 0055: lobby "ready" and avoid-recent ordering (behaviour covered end to end by .work/e2e/36-test-ready-avoid.mjs).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(5);
select extensions.ok(exists(select 1 from public.schema_versions where schema_version = '0.31.0' and upstream_revision = 'ADR-028/0055_lobby_ready'), '0055 is registered');
select extensions.ok(to_regprocedure('gm20_canonical_private.view_before_ready(uuid,uuid)') is not null, 'the previous snapshot view is kept behind the wrapper');
select extensions.ok(to_regprocedure('public.dish_session_before_ready(text,jsonb)') is not null, 'the previous dish_session is kept behind the wrapper');
select extensions.ok(not has_function_privilege('authenticated', 'public.dish_session_before_ready(text,jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.dish_session(text,jsonb)', 'execute'), 'only the new entry point is callable');
-- without the setting the draw is the same as before: no dish is treated as avoided
select extensions.is(
  (select jsonb_array_length(dish_v4_private.ranked_pool('[{"dishId":"a","mealSlots":["lunch"]},{"dishId":"b","mealSlots":["lunch"]}]'::jsonb, 2, 'lunch', 'seed', '[]'::jsonb))),
  2, 'ranked_pool still draws every dish when nothing is avoided');
select * from extensions.finish();
rollback;
