-- ADR-028 / 0055-0057: lobby "ready", v4-only scoping, and avoid-recent ordering.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(8);
select extensions.ok(exists(select 1 from public.schema_versions where schema_version = '0.31.0' and upstream_revision = 'ADR-028/0055_lobby_ready'), '0055 is registered');
select extensions.ok(exists(select 1 from public.schema_versions where schema_version = '0.31.1' and upstream_revision = 'ADR-028/0056_ready_hardening'), '0056 is registered');
select extensions.ok(exists(select 1 from public.schema_versions where schema_version = '0.31.2' and upstream_revision = 'ADR-028/0057_ready_v4_only'), '0057 is registered');
select extensions.ok(to_regprocedure('gm20_canonical_private.view_before_ready(uuid,uuid)') is not null, 'the previous snapshot view is kept behind the wrapper');
select extensions.ok(to_regprocedure('public.dish_session_before_ready(text,jsonb)') is not null, 'the previous dish_session is kept behind the wrapper');
select extensions.ok(not has_function_privilege('authenticated', 'public.dish_session_before_ready(text,jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.dish_session(text,jsonb)', 'execute'), 'only the new entry point is callable');
select extensions.ok(pg_get_functiondef('public.dish_session(text,jsonb)'::regprocedure) like '%policy_version=''dish-decision-v4'' for update%', '0057 scopes ready checks strictly to v4 and locks the room row');
-- without the setting the draw is the same as before: no dish is treated as avoided
select extensions.is(
  (select jsonb_array_length(dish_v4_private.ranked_pool('[{"dishId":"a","mealSlots":["lunch"]},{"dishId":"b","mealSlots":["lunch"]}]'::jsonb, 2, 'lunch', 'seed', '[]'::jsonb))),
  2, 'ranked_pool still draws every dish when nothing is avoided');
select * from extensions.finish();
rollback;
