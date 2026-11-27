import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import gm52_hosted_parity as parity  # noqa: E402


def fn(name, sha='a'):
    return {'schema': 'public', 'name': name, 'identityArguments': 'p jsonb', 'definitionSha256': sha, 'acl': 'authenticated:EXECUTE:false'}


def state(ledger=('0001', '0002'), functions=None, schema='0.31.8', cron=True, active=True):
    jobs = [{'name': 'ie307-gm48-tick', 'schedule': '2 seconds', 'user': 'postgres', 'active': active},
            {'name': 'ie307-gm48-prune', 'schedule': '0 * * * *', 'user': 'postgres', 'active': True}] if cron else []
    return {'ledger': [{'version': v, 'name': 'm' + v} for v in ledger], 'functions': functions or [fn('a'), fn('b')],
            'settings': {'schemaVersion': schema, 'allowNewSessions': True, 'cronExtension': cron, 'cronJobs': jobs}}


class HostedParity(unittest.TestCase):
    def test_identical_projects_pass(self):
        report = parity.compare(state(), state(), expect_cron=True)
        self.assertEqual(report['result'], 'Pass')
        self.assertEqual(report['problems'], [])

    def test_a_migration_missing_or_inserted_out_of_order_fails(self):
        missing = parity.compare(state(), state(ledger=('0001',)), expect_cron=False)
        self.assertEqual(missing['ledger']['missingOnHosted'], ['0002'])
        extra = parity.compare(state(), state(ledger=('0001', '0002', '0003')), expect_cron=False)
        self.assertEqual(extra['ledger']['extraOnHosted'], ['0003'])
        self.assertEqual(extra['result'], 'Fail')

    def test_a_function_with_a_different_definition_hash_fails(self):
        report = parity.compare(state(), state(functions=[fn('a'), fn('b', sha='changed')]), expect_cron=False)
        self.assertEqual(report['functions']['changed'], ['public.b(p jsonb)'])
        self.assertIn('function definitions differ', report['problems'])

    def test_a_draft_function_outside_the_ledger_is_reported_as_extra(self):
        report = parity.compare(state(), state(functions=[fn('a'), fn('b'), fn('draft')]), expect_cron=False)
        self.assertEqual(report['functions']['extraOnHosted'], ['public.draft(p jsonb)'])

    def test_schema_version_differences_fail(self):
        report = parity.compare(state(), state(schema='0.30.0'), expect_cron=False)
        self.assertIn('schema version differs', report['problems'])

    def test_cron_jobs_are_required_unless_skipped(self):
        self.assertEqual(parity.compare(state(cron=False), state(cron=False), expect_cron=False)['result'], 'Pass')
        missing = parity.compare(state(cron=False), state(cron=False), expect_cron=True)
        self.assertIn('pg_cron extension is not enabled on hosted', missing['problems'])
        paused = parity.compare(state(), state(active=False), expect_cron=True)
        self.assertTrue(any('ie307-gm48-tick' in p for p in paused['problems']))

    def test_the_hosted_url_must_belong_to_the_project(self):
        import os
        old = os.environ.get('SUPABASE_DB_URL')
        try:
            os.environ['SUPABASE_DB_URL'] = 'postgresql://postgres.aaaabbbbccccddddeeee:pw@aws-0-region.pooler.supabase.com:5432/postgres'
            self.assertTrue(parity.hosted_url('aaaabbbbccccddddeeee').startswith('postgresql://'))
            with self.assertRaises(parity.ParityError):
                parity.hosted_url('zzzzzzzzzzzzzzzzzzzz')
            os.environ['SUPABASE_DB_URL'] = 'postgresql://postgres:pw@evil.example.com:5432/aaaabbbbccccddddeeee'
            with self.assertRaises(parity.ParityError):
                parity.hosted_url('aaaabbbbccccddddeeee')
            del os.environ['SUPABASE_DB_URL']
            with self.assertRaises(parity.ParityError):
                parity.hosted_url('aaaabbbbccccddddeeee')
        finally:
            if old is None:
                os.environ.pop('SUPABASE_DB_URL', None)
            else:
                os.environ['SUPABASE_DB_URL'] = old


if __name__ == '__main__':
    unittest.main()
