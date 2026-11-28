-- GM-54 / 0069: minimum Android app version config and public.get_app_version_policy(text) RPC.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(19);

select extensions.ok(exists(
  select 1
  from public.schema_versions
  where schema_version = '0.32.0'
    and contract_id = 'release-v1/2026-11-23/GM-54.2'
    and upstream_revision = 'GM-35/0066; GM-54 minimum version gate'
), '0069 migration schema version 0.32.0 is registered');

select extensions.ok(exists(
  select 1
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_app_version_policy'
    and p.prosecdef = true
    and p.proconfig = array['search_path=pg_catalog']
), 'get_app_version_policy is SECURITY DEFINER with search_path = pg_catalog');

select extensions.ok(
  not has_function_privilege('public', 'public.get_app_version_policy(text)', 'EXECUTE'),
  'PUBLIC default cannot execute get_app_version_policy'
);
select extensions.ok(
  has_function_privilege('anon', 'public.get_app_version_policy(text)', 'EXECUTE'),
  'anon can execute get_app_version_policy'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.get_app_version_policy(text)', 'EXECUTE'),
  'authenticated can execute get_app_version_policy'
);
select extensions.ok(
  has_function_privilege('service_role', 'public.get_app_version_policy(text)', 'EXECUTE'),
  'service_role can execute get_app_version_policy'
);

select extensions.ok(
  not has_schema_privilege('anon', 'gm54_private', 'USAGE')
    and not has_schema_privilege('authenticated', 'gm54_private', 'USAGE'),
  'anon and authenticated have no USAGE on gm54_private schema'
);

select extensions.ok(
  not has_table_privilege('anon', 'gm54_private.app_release_config', 'SELECT, INSERT, UPDATE, DELETE')
    and not has_table_privilege('authenticated', 'gm54_private.app_release_config', 'SELECT, INSERT, UPDATE, DELETE'),
  'anon and authenticated have no table privileges on gm54_private.app_release_config'
);

select extensions.ok(exists(
  select 1
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'gm54_private'
    and c.relname = 'app_release_config'
    and c.relrowsecurity = true
    and c.relforcerowsecurity = true
), 'gm54_private.app_release_config enables and forces RLS');

-- Verify seeded Android policy and normalization as anon (catches SQL COALESCE/NULLIF/search_path issues)
set local role anon;
select extensions.is(
  (public.get_app_version_policy('android')->>'platform'),
  'android',
  'anon android query returns platform android'
);
select extensions.is(
  (public.get_app_version_policy('android')->>'minimumVersion'),
  '1.0.0',
  'anon android query returns seeded minimumVersion 1.0.0'
);
select extensions.ok(
  coalesce(nullif(public.get_app_version_policy('android')->>'updateUrl', ''), '') like 'https://%',
  'anon android query returns https updateUrl'
);
select extensions.is(
  (public.get_app_version_policy('  AnDrOiD  ')->>'minimumVersion'),
  '1.0.0',
  'blank-padded mixed-case platform normalizes to android'
);
select extensions.is(
  (public.get_app_version_policy('')->>'minimumVersion'),
  '1.0.0',
  'empty platform falls back to android'
);
select extensions.is(
  (public.get_app_version_policy(null)->>'minimumVersion'),
  '1.0.0',
  'null platform falls back to android'
);
select extensions.throws_ok(
  'select id from gm54_private.app_release_config',
  '42501',
  null,
  'anon direct select on gm54_private.app_release_config is denied'
);

-- Verify authenticated role: unknown platform returns null policy fields & direct select denied
set local role authenticated;
select extensions.is(
  (public.get_app_version_policy('ios')->>'platform'),
  'ios',
  'unknown platform ios echoes platform name'
);
select extensions.is(
  jsonb_typeof(public.get_app_version_policy('ios')->'minimumVersion'),
  'null',
  'unknown platform returns explicit JSON null minimumVersion'
);

-- Simulate bumping minimum_version in gm54_private.app_release_config inside rolled-back txn
reset role;
update gm54_private.app_release_config
set minimum_version = '1.2.0'
where id = 'android';

set local role anon;
select extensions.is(
  (public.get_app_version_policy('android')->>'minimumVersion'),
  '1.2.0',
  'updated minimum_version 1.2.0 is immediately reflected via RPC'
);
reset role;

select * from extensions.finish();
rollback;
