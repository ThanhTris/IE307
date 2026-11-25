-- GM-65 error reports. Run with psql against a disposable database after migrations; everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to anon, authenticated;
set local search_path = public, extensions;
select plan(18);

create function pg_temp.report(extra jsonb default '{}'::jsonb, report uuid default gen_random_uuid(),
  install uuid default '65000000-0000-4000-8000-000000000001') returns jsonb language sql as $$
  select public.report_app_error(jsonb_build_object('clientReportId', report, 'installId', install,
    'errorCode', 'NETWORK_ERROR', 'screen', 'guest_entry', 'appVersion', '0.1.0', 'platform', 'android',
    'occurredAt', '2026-11-25T07:00:00Z') || extra)
$$;

select ok(exists(select 1 from public.schema_versions where contract_id = 'release-v1/2026-11-25/GM-65.1'),
  'GM-65 contract is registered');
select ok(has_function_privilege('anon', 'public.report_app_error(jsonb)', 'EXECUTE'), 'anon can report');
select ok(has_function_privilege('authenticated', 'public.report_app_error(jsonb)', 'EXECUTE'), 'signed-in users can report');
select ok(not has_function_privilege('anon', 'public.gm65_admin_list_error_reports(boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.gm65_admin_list_error_reports(boolean)', 'EXECUTE'),
  'only the operator can list reports');
select ok(not has_schema_privilege('anon', 'gm65_private', 'USAGE')
  and not has_table_privilege('authenticated', 'gm65_private.error_reports', 'SELECT'), 'reports are not readable by clients');

set local role anon;
select matches(pg_temp.report('{"httpStatus": 503}', '65000000-0000-4000-8000-0000000000aa')->>'reportCode',
  '^GCD-[0-9A-F]{10}$', 'anonymous report returns a report code');
select is(pg_temp.report('{"httpStatus": 503}', '65000000-0000-4000-8000-0000000000aa')->>'ok', 'true',
  'sending the same report again is accepted');
reset role;
select is((select count(*) from gm65_private.error_reports
  where client_report_id = '65000000-0000-4000-8000-0000000000aa'), 1::bigint, 'a retried report is stored once');

set local role anon;
select is(pg_temp.report('{"token": "secret"}')->>'messageKey', 'INVALID_INPUT', 'unknown keys are rejected');
select is(pg_temp.report('{"screen": "Màn có dấu"}')->>'messageKey', 'INVALID_INPUT', 'free text is not accepted as a screen id');
select is(pg_temp.report(jsonb_build_object('note', repeat('a', 501)))->>'messageKey', 'INVALID_INPUT', 'a long note is rejected');
select is(pg_temp.report('{"httpStatus": "503"}')->>'messageKey', 'INVALID_INPUT', 'a text status is rejected');
select is(public.report_app_error('[]'::jsonb)->>'messageKey', 'INVALID_INPUT', 'a non-object payload is rejected');
select is((select count(*) from generate_series(1, 10) g cross join lateral pg_temp.report('{}', format('65000000-0000-4000-8001-%s', lpad(g::text, 12, '0'))::uuid) r
  where r->>'messageKey' = 'RATE_LIMITED'), 1::bigint, 'the eleventh report from one install in an hour is limited');
select is(pg_temp.report('{}', gen_random_uuid(), '65000000-0000-4000-8000-000000000002')->>'ok', 'true',
  'another install is not limited');
reset role;

-- Deleting the account keeps the report but forgets who sent it.
create temp table gm65_person(id uuid) on commit drop;
grant select on gm65_person to authenticated;
do $fixture$ declare person uuid := gen_random_uuid(); begin
  insert into auth.users(id, is_anonymous) values (person, true); insert into gm65_person values (person);
end $fixture$;
select set_config('request.jwt.claim.sub', (select id::text from gm65_person), true);
set local role authenticated;
select pg_temp.report('{}', '65000000-0000-4000-8000-0000000000bb', '65000000-0000-4000-8000-000000000003');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update gm65_private.error_reports set reporter_id = (select id from gm65_person)
  where client_report_id = '65000000-0000-4000-8000-0000000000bb';
delete from auth.users where id = (select id from gm65_person);
select ok((select reporter_id is null from gm65_private.error_reports
  where client_report_id = '65000000-0000-4000-8000-0000000000bb'), 'account deletion clears the reporter');

update gm65_private.error_reports set created_at = clock_timestamp() - interval '31 days'
  where client_report_id = '65000000-0000-4000-8000-0000000000bb';
select ok(gm65_private.prune() >= 1, 'reports older than 30 days are removed');
select ok(not exists(select 1 from gm65_private.error_reports
  where client_report_id = '65000000-0000-4000-8000-0000000000bb'), 'the expired report is gone');

select * from finish();
rollback;
