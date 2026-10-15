-- GM-16.1 / schema 0.1.0. Real local PostgreSQL/pgTAP, synthetic identities.
-- Caller claims setup here is SQL testing, not evidence of JWT verification.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

insert into auth.users(id) values
 ('16000000-0000-4000-8000-000000000001'),
 ('16000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"userId":"16000000-0000-4000-8000-000000000002"}}', true);
select is(auth.uid(), '16000000-0000-4000-8000-000000000001'::uuid, 'caller comes from JWT sub, not user_metadata.userId');
select set_config('request.jwt.claims', '{}', true);
select is(auth.uid(), null::uuid, 'no authenticated claims means no caller');
select ok(not has_table_privilege('anon', 'auth.users', 'SELECT'), 'anon cannot list auth users');
select ok(not has_table_privilege('authenticated', 'auth.users', 'UPDATE'), 'client cannot mutate auth identity');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'profile writes remain default deny until explicit RPC');
select ok(not has_table_privilege('authenticated', 'public.votes', 'SELECT'), 'guest session does not open raw votes');
select ok(not has_table_privilege('authenticated', 'public.devices', 'SELECT'), 'guest session does not expose device tokens');
select * from finish();
rollback;
