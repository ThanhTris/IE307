"""GM-51 tests. SQL only runs in an explicitly selected, network-isolated QA container."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'supabase/seed'))
from import_hosted_catalogue import (
    MEALS, PROJECTS, build, connection_env, main, readback_sql, switch_sql, upstream,
    verify_bundle,
)

RECEIPT = ROOT / 'supabase/seed/catalogue/hosted-v1/staging-storage-receipt.json'
STAGING_SHA = '83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f'
COVERAGE = dict(zip(MEALS, (68, 100, 72, 114)))


class CatalogueReleaseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(temp.cleanup)
        cls.directory = Path(temp.name)
        with contextlib.redirect_stdout(io.StringIO()):
            main(['hosted-build', '--target', 'staging', '--storage-receipt', str(RECEIPT),
                  '--output', str(cls.directory)])
        cls.input = cls.directory / 'dishes.json'
        cls.manifest = cls.directory / 'manifest.json'

    def test_release_gates(self):
        bundle, manifest = verify_bundle('staging', self.input, self.manifest, RECEIPT, STAGING_SHA)
        self.assertEqual(bundle['usageScope'], 'production')
        self.assertFalse(bundle['fixtureOnly'])
        self.assertFalse(manifest['testOnly'])
        self.assertEqual(manifest['counts']['dishes'], 253)
        self.assertEqual((manifest['photos'], manifest['illustrations']), (136, 117))
        self.assertEqual(manifest['descriptionRights']['references'], 188)
        self.assertEqual(manifest['descriptionRights']['dishes'], 253)
        self.assertEqual({meal: item['dishes'] for meal, item in manifest['coverage'].items()}, COVERAGE)
        floor = json.loads((self.directory / 'release-floor.json').read_bytes())
        self.assertTrue(floor['pass'])
        self.assertEqual(len(floor['checks']), 33)
        self.assertTrue(all(item['pass'] for item in floor['checks']))
        with self.assertRaises(ValueError):
            upstream.candidate(self.input)

    def test_rejects_wrong_hash_tampered_bundle_manifest_and_receipt(self):
        with self.assertRaises(ValueError):
            verify_bundle('staging', self.input, self.manifest, RECEIPT, '0' * 64)
        altered_bundle = self.directory / 'altered-dishes.json'
        altered_bundle.write_bytes(self.input.read_bytes() + b' ')
        with self.assertRaises(ValueError):
            verify_bundle('staging', altered_bundle, self.manifest, RECEIPT, STAGING_SHA)
        altered_manifest = self.directory / 'altered-manifest.json'
        altered_manifest.write_text('{}', encoding='utf-8')
        with self.assertRaises(ValueError):
            verify_bundle('staging', self.input, altered_manifest, RECEIPT, STAGING_SHA)
        for target, raw in [('staging', RECEIPT.read_bytes() + b' '), ('production', RECEIPT.read_bytes())]:
            with self.subTest(target=target), self.assertRaises(ValueError):
                build(target, raw)

    def test_production_requires_own_bucket_and_complete_hashes(self):
        # Offline wiring only. No claim of uploads or publicly verified production images.
        receipt = json.loads(RECEIPT.read_bytes())
        receipt['bucketPublicUrl'] = receipt['bucketPublicUrl'].replace(PROJECTS['staging'], PROJECTS['production'])
        raw, manifest, _ = build('production', json.dumps(receipt).encode())
        self.assertNotEqual(manifest['bundleSha256'], STAGING_SHA)
        self.assertIn(PROJECTS['production'].encode(), raw)
        self.assertNotIn(PROJECTS['staging'].encode(), raw)
        receipt['objects'][0]['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            build('production', json.dumps(receipt).encode())

    def test_dry_run_and_wrong_confirmation_never_connect(self):
        args = [
            'hosted-import', '--target', 'staging', '--storage-receipt', str(RECEIPT),
            '--input', str(self.input), '--manifest', str(self.manifest), '--sha256', STAGING_SHA,
            '--expect-active-id', 'none',
        ]
        with patch('import_hosted_catalogue.psql') as psql, contextlib.redirect_stdout(io.StringIO()) as stdout:
            main(args)
            self.assertTrue(json.loads(stdout.getvalue())['dryRun'])
            for options in (['--apply'], ['--apply', '--confirm-project', PROJECTS['production']]):
                with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                    main(args + options)
            psql.assert_not_called()

    def test_hosted_apply_verifies_readback(self):
        args = [
            'hosted-import', '--target', 'staging', '--storage-receipt', str(RECEIPT),
            '--input', str(self.input), '--manifest', str(self.manifest), '--sha256', STAGING_SHA,
            '--expect-active-id', 'none', '--apply', '--confirm-project', PROJECTS['staging'],
        ]
        with patch('import_hosted_catalogue.psql', return_value=None) as psql:
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                main(args)
            self.assertEqual(psql.call_args.args[0], 'staging')
            self.assertIn('lock table dish_v3_private.catalogues', psql.call_args.args[1])

    def test_tls_and_project_allowlist(self):
        staging = PROJECTS['staging']
        dsn = f'postgresql://postgres:p%40ss@db.{staging}.supabase.co:5432/postgres'
        connection = connection_env('staging', dsn)
        self.assertEqual(connection['PGSSLMODE'], 'verify-full')
        self.assertEqual(connection['PGPASSWORD'], 'p@ss')
        pooler = f'postgresql://postgres.{staging}:password@aws-0-ap-southeast-1.pooler.supabase.com'
        self.assertEqual(connection_env('staging', pooler + '/postgres')['PGUSER'], 'postgres.' + staging)
        for bad in (
            dsn + '?sslmode=disable', dsn + '?hostaddr=127.0.0.1', dsn.replace(':5432', ':6543'),
            dsn.replace('supabase.co', 'supabase.co.evil.invalid'), pooler + ':6543/postgres',
            pooler.replace(staging, PROJECTS['production']) + '/postgres',
            'postgresql://postgres:password@localhost/postgres',
        ):
            with self.subTest(bad=bad), self.assertRaisesRegex(ValueError, 'confirmed project'):
                connection_env('staging', bad)
        with self.assertRaisesRegex(ValueError, 'confirmed project'):
            connection_env('production', dsn)

    def test_existing_qa_target_guard(self):
        class ForeignDB:
            database = 'postgres'
        with self.assertRaisesRegex(ValueError, 'process-owned'):
            upstream.owned(ForeignDB(), uuid.uuid4())


@unittest.skipUnless(os.environ.get('GM51_QA_CONTAINER'), 'optional isolated PostgreSQL integration')
class CatalogueReleaseSQLTest(unittest.TestCase):
    def test_activation_readback_pools_replay_failure_and_rollback(self):
        container = os.environ['GM51_QA_CONTAINER']
        self.assertRegex(container, r'^ie307-gm51-local-qa-[0-9]{8}(?:-[0-9]+)?$')
        config = json.loads(subprocess.check_output(['docker', 'inspect', container], text=True))[0]
        self.assertEqual(config['Config']['Labels'].get('ie307.gm51'), 'disposable-qa')
        self.assertEqual(config['Config']['Image'], 'public.ecr.aws/supabase/postgres:17.11.0.004')
        self.assertEqual(config['HostConfig']['NetworkMode'], 'none')
        self.assertFalse(config['HostConfig']['PortBindings'])
        self.assertFalse(config['HostConfig']['Binds'])

        def query(sql, failure=None):
            proc = subprocess.run(
                ['docker', 'exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres',
                 '-v', 'ON_ERROR_STOP=1'], input=sql, encoding='utf-8', capture_output=True, timeout=30,
            )
            if failure:
                self.assertNotEqual(proc.returncode, 0)
                self.assertIn(failure, proc.stderr)
            else:
                self.assertEqual(proc.returncode, 0, proc.stderr)
            return proc.stdout.strip()

        previous_data, previous_sha = upstream.candidate(ROOT / upstream.contract.BUNDLE_PATH)
        previous = upstream.release_id(previous_data), previous_sha
        empty = (None, None)
        qa_seed = upstream.import_sql(previous_data, previous_sha, activate=True)
        raw, manifest, _ = build('staging', RECEIPT.read_bytes())
        bundle = json.loads(raw)
        desired = manifest['releaseId'], manifest['bundleSha256']
        sql = switch_sql(desired, previous, bundle=bundle, target='staging')

        # Prepare a fresh isolated DB with migrations through 0066 before this test.
        self.assertEqual(query(readback_sql()), 'null')
        self.assertEqual(query("select count(*) from dish_v3_private.catalogues;"), '0')
        releases = ','.join(upstream.food.literal(item[0]) for item in (previous, desired))
        self.addCleanup(query, f'delete from dish_v3_private.catalogues where id in ({releases});')
        query(qa_seed)
        before = json.loads(query(readback_sql()))
        self.assertEqual((before['releaseId'], before['sourceSha256'], before['testOnly']), (*previous, True))
        query(sql, 'catalogues_test_only_check')
        migration = ROOT / 'supabase/migrations/0067_gm51_hosted_catalogue.sql'
        query(migration.read_text(encoding='utf-8'))
        self.assertEqual(before, json.loads(query(readback_sql())))
        self.assertEqual(query("select contract_id from public.schema_versions where schema_version='0.31.10';"),
                         'release-v1/2026-11-20/GM-51.1')
        query(switch_sql(desired, empty, bundle=bundle, target='staging'), 'GM51_ACTIVE_CHANGED')
        self.assertEqual(query(f"select count(*) from dish_v3_private.catalogues where id='{desired[0]}';"), '0')
        broken = sql.removesuffix('commit;\n') + "select 1/0; commit;"
        query(broken, 'division by zero')
        self.assertEqual(before, json.loads(query(readback_sql())))
        self.assertEqual(query(f"select count(*) from dish_v3_private.catalogues where id='{desired[0]}';"), '0')

        receipt = json.loads(query(sql))
        self.assertEqual(receipt, {
            'releaseId': desired[0], 'sourceSha256': STAGING_SHA, 'testOnly': False,
            'active': True, 'count': 253, 'coverage': COVERAGE,
        })
        self.assertEqual(receipt, json.loads(query(readback_sql())))
        self.assertEqual(receipt, json.loads(query(sql)))
        self.assertEqual(query(f"select count(*) from dish_v3_private.catalogues where id='{desired[0]}';"), '1')
        query(switch_sql((desired[0], '0' * 64), desired, bundle=bundle, target='staging'), 'GM51_RELEASE_CONFLICT')
        query(f"update dish_v3_private.catalogues set source_sha=repeat('f',64) where id='{desired[0]}';",
              'CATALOGUE_RELEASE_IMMUTABLE')
        query("insert into dish_v3_private.catalogues(id,source_sha,cards,test_only) "
              "values('untagged',repeat('f',64),'[]',false);", 'catalogues_hosted_version_check')
        self.assertEqual(query("""
select bool_and(not has_table_privilege(role_name,'dish_v3_private.catalogues','select,insert,update,delete'))
from unnest(array['authenticated','anon','service_role']) role_name;
"""), 't')

        user_id = str(uuid.uuid4())
        member_id = str(uuid.uuid4())
        pool_checks = []
        for meal in MEALS:
            for count in (10, 20):
                payload = {
                    'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B',
                    'requestId': f'gm51-{meal}-{count}', 'displayName': 'GM51 QA',
                    'preferences': {'cuisineIds': [], 'categoryIds': [], 'temperature': None,
                                    'flavor': None, 'budget': None, 'avoidRecent': False},
                    'settings': {'mealSlot': meal, 'dishCount': count, 'desiredAt': None},
                }
                request = upstream.food.literal(json.dumps(payload))
                pool_checks.append(f"""
do $$ declare ack jsonb; begin
 ack := public.dish_session('create',{request}::jsonb);
 if ack->>'ok' is distinct from 'true' then
  raise exception 'GM51 QA create % failed with %','{meal}',ack#>>'{{error,messageKey}}';
 end if;
 perform set_config('gm51.response',ack::text,true);
end $$;
set local request.jwt.claim.sub = '{member_id}';
do $$ declare created jsonb; joined jsonb; snapshot jsonb; begin
 created := current_setting('gm51.response')::jsonb->'data';
 joined := public.dish_session('join', jsonb_build_object(
   'contractVersion','dish-session-v4/roadmap-v2/GM-07.B','requestId','gm51-join-{meal}-{count}',
   'code',created->>'code','displayName','GM51 Member'));
 if joined->>'ok' is distinct from 'true' or joined#>>'{{data,roomId}}' is distinct from created->>'roomId' then
   raise exception 'GM51 QA join failed with %',joined#>>'{{error,messageKey}}';
 end if;
 snapshot := public.dish_session('snapshot', jsonb_build_object(
   'contractVersion','dish-session-v4/roadmap-v2/GM-07.B','roomId',created->>'roomId'));
 if snapshot->>'ok' is distinct from 'true'
    or snapshot#>>'{{data,catalogueVersion}}' is distinct from '{desired[0]}'
    or snapshot#>>'{{data,catalogueSha}}' is distinct from '{desired[1]}'
    or snapshot#>>'{{data,settings,mealSlot}}' is distinct from '{meal}'
    or jsonb_array_length(snapshot#>'{{data,pool}}') is distinct from {count} then
   raise exception 'GM51 QA snapshot does not match release and requested pool';
 end if;
end $$;
reset role;
select s.meal_slot, s.requested_count, s.catalogue_id, s.catalogue_sha,
 jsonb_array_length(s.initial_pool),
 (select count(distinct card->>'dishId') from jsonb_array_elements(s.initial_pool) card),
 (select bool_and(card->'mealSlots' ? '{meal}') from jsonb_array_elements(s.initial_pool) card)
from dish_v4_private.sessions s where s.room_id=(current_setting('gm51.response')::jsonb#>>'{{data,roomId}}')::uuid;
set local request.jwt.claim.sub = '{user_id}';
set local role authenticated;
""")
        rows = query(f"""
begin;
insert into auth.users(id) values('{user_id}'),('{member_id}');
update gm20_canonical_private.configuration set allow_new_sessions=true where singleton;
do $$ begin perform dish_v4_private.tick(); end $$;
set local request.jwt.claim.sub = '{user_id}';
set local role authenticated;
{''.join(pool_checks)}
rollback;
""").splitlines()
        for meal in MEALS:
            for count in (10, 20):
                self.assertIn(f'{meal}|{count}|{desired[0]}|{desired[1]}|{count}|{count}|t', rows)

        query(switch_sql(previous, desired, target='production'), 'GM51_UNKNOWN_RELEASE')
        rolled_back = json.loads(query(switch_sql(previous, desired, target='staging')))
        self.assertEqual(rolled_back, before)
        self.assertEqual(json.loads(query(switch_sql(previous, desired, target='staging'))), before)
        query(switch_sql(desired, previous, bundle=bundle, target='staging'))
        self.assertEqual(query(switch_sql(empty, desired, target='staging')), 'null')
        self.assertEqual(query(readback_sql()), 'null')


if __name__ == '__main__':
    unittest.main()
