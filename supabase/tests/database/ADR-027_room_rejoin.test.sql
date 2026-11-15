-- ADR-027 / 0054: rejoining with the room code in round 1 (behaviour is covered end to end by .work/e2e/35-test-rejoin.mjs).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(4);
select extensions.ok(exists(select 1 from public.schema_versions where schema_version = '0.30.0' and upstream_revision = 'ADR-027/0054_room_rejoin_round_one'), '0054 is registered');
select extensions.ok(to_regprocedure('dish_v4_private.admit_member_lobby_only(uuid,uuid,text)') is not null, 'the lobby-only admission is kept behind the wrapper');
select extensions.ok(to_regprocedure('public.dish_session_before_rejoin(text,jsonb)') is not null, 'the previous dish_session is kept behind the wrapper');
select extensions.ok(not has_function_privilege('authenticated', 'public.dish_session_before_rejoin(text,jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.dish_session(text,jsonb)', 'execute'), 'only the new entry point is callable');
select * from extensions.finish();
rollback;
