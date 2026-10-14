-- GM-19 SQL boundary suite. Run against the disposable local database after
-- migrations. It intentionally uses no production fixture rows.
begin;
create extension if not exists pgtap with schema extensions;
-- Test helper visibility only; rollback restores the production schema ACL.
grant usage on schema extensions to anon,authenticated;
set local search_path = public, extensions;
select plan(13);

select ok(exists(select 1 from public.schema_versions where contract_id='food-v1/roadmap-v2/GM-19.1'),
  'GM-19 contract is registered');
select is((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='create_room' limit 1), true, 'create_room is SECURITY DEFINER');
select ok((select p.proconfig @> array['search_path=pg_catalog, public, gm19_private'] from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='start_round' limit 1), 'start_round fixes search_path');
select ok(has_function_privilege('authenticated','public.create_room(text,text,text,jsonb,text,text,text,text,jsonb,boolean)','EXECUTE'), 'authenticated can call create_room');
select ok(not has_function_privilege('anon','public.create_room(text,text,text,jsonb,text,text,text,text,jsonb,boolean)','EXECUTE'), 'anon cannot call create_room');
select ok(not has_table_privilege('authenticated','gm19_private.acks','SELECT'), 'private ACK is not directly readable');
select ok(not has_table_privilege('authenticated','public.rooms','INSERT'), 'client cannot insert rooms directly');
select ok(not has_table_privilege('authenticated','public.members','UPDATE'), 'client cannot update members directly');

set local role anon;
select throws_ok($q$select public.create_room('00000000-0000-4000-8000-000000000001','anon','00000000-0000-0000-0000-000000000001',to_jsonb(1000),now()::text,'dine_in','lunch',null,null,false)$q$,
  '42501', null, 'anonymous create is rejected at SQL privilege boundary');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
select is((public.create_room('not-a-uuid','x','not-a-uuid',to_jsonb(1000),now()::text,'dine_in','lunch',null,null,false)->>'messageKey'),'INVALID_INPUT',
  'malformed request returns INVALID_INPUT');
select is((public.join_room('not-a-uuid','BAD','x')->>'messageKey'),'INVALID_INPUT', 'malformed join returns INVALID_INPUT');
select is((public.get_room_snapshot('not-a-uuid')->>'messageKey'),'INVALID_INPUT', 'malformed snapshot returns INVALID_INPUT');
reset role;
delete from gm19_private.rate_windows where user_id=auth.uid();
set local role authenticated;
select is((select count(*) from generate_series(1,11) g
  cross join lateral public.create_room(format('19000000-0000-4000-8000-%s', lpad(g::text,12,'0')), 'rate', '00000000-0000-0000-0000-000000000001', to_jsonb(1000), (now()+interval '1 hour')::text, 'dine_in', 'lunch', null, null, false) result
  where result->>'messageKey'='RATE_LIMITED'), 1::bigint, 'create_room rate window returns one 429-domain response at request 11');
select * from finish();
rollback;
