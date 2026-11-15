-- ADR-026 / 0053: new inbox rows are published to Supabase Realtime; a client sees only its own rows.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(6);

select extensions.ok(exists(
  select 1 from public.schema_versions where schema_version = '0.29.0' and upstream_revision = 'ADR-026/0053_inbox_realtime'
), '0053 is registered');
select extensions.ok(exists(
  select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inbox'
), 'public.inbox is in the supabase_realtime publication');
select extensions.ok(has_table_privilege('authenticated', 'public.inbox', 'select')
  and not has_table_privilege('authenticated', 'public.inbox', 'insert')
  and not has_table_privilege('authenticated', 'public.inbox', 'update')
  and not has_table_privilege('authenticated', 'public.inbox', 'delete'), 'authenticated may read but never write inbox rows');
select extensions.ok(not has_table_privilege('anon', 'public.inbox', 'select'), 'anonymous clients cannot read inbox rows');

create temp table adr26rt on commit drop as select gen_random_uuid() as sender_id, gen_random_uuid() as receiver_id, gen_random_uuid() as other_id;
insert into auth.users(id, is_anonymous) select sender_id, true from adr26rt;
insert into auth.users(id, is_anonymous) select receiver_id, true from adr26rt;
insert into auth.users(id, is_anonymous) select other_id, true from adr26rt;
select set_config('request.jwt.claims', (select jsonb_build_object('sub', sender_id, 'role', 'authenticated')::text from adr26rt), true);
select public.invite_partner('adr26rt-invite', null, (select receiver_id::text from adr26rt));
grant select on adr26rt to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', (select jsonb_build_object('sub', receiver_id, 'role', 'authenticated')::text from adr26rt), true);
select extensions.is((select count(*)::int from public.inbox), 1, 'the receiver reads exactly its own new row (RLS)');
select set_config('request.jwt.claims', (select jsonb_build_object('sub', other_id, 'role', 'authenticated')::text from adr26rt), true);
select extensions.is((select count(*)::int from public.inbox), 0, 'another account reads none of it');
reset role;

select * from extensions.finish();
rollback;
