-- Foundation-only assertions; not schema/RLS/RPC coverage. Changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);
select is(current_database(), 'postgres', 'connected to local postgres database');
select ok(current_setting('server_version_num')::integer >= 170000, 'PostgreSQL 17 or later');
select is((select 1 + 1), 2, 'database executes a real query');
select * from finish();
rollback;
