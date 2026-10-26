import json
from pathlib import Path
import unittest
from unittest.mock import patch

from scripts.dish_v4_ci import approved_host_binding
from scripts.dish_policy_worker import QAContainerDB


class DishV4QaOwnershipTests(unittest.TestCase):
    def test_wildcard_docker_ports_are_allowed_only_on_ephemeral_hosted_ci(self):
        wildcard = {'HostIp': '0.0.0.0', 'HostPort': '54361'}
        loopback = {'HostIp': '127.0.0.1', 'HostPort': '54361'}
        self.assertFalse(approved_host_binding(wildcard, 54361))
        self.assertTrue(approved_host_binding(loopback, 54361))
        self.assertTrue(approved_host_binding(wildcard, 54361, hosted_ci=True))
        self.assertFalse(approved_host_binding(wildcard, 54362, hosted_ci=True))

    def test_worker_rejects_application_database_before_docker_inspect(self):
        with patch('scripts.dish_policy_worker.subprocess.run') as run:
            with self.assertRaisesRegex(ValueError, 'dedicated IE307 dish-v4 QA container'):
                QAContainerDB('supabase_db_gi-cung-duoc-local', 'gi-cung-duoc-local', 'supabase')
            run.assert_not_called()

    def test_worker_rejects_project_id_mismatch_before_docker_inspect(self):
        with patch('scripts.dish_policy_worker.subprocess.run') as run:
            with self.assertRaisesRegex(ValueError, 'dedicated IE307 dish-v4 QA container'):
                QAContainerDB('supabase_db_ie307-dish-v4-qa-20261026-77-1',
                              'ie307-dish-v4-qa-20261026-78-1',
                              '.work/ci/review-results/dish-v4-qa-20261026-78-1')
            run.assert_not_called()

    def test_worker_refuses_docker_container_with_wrong_project_label(self):
        project = 'ie307-dish-v4-qa-20261026-77-1'
        info = {
            'Name': '/supabase_db_' + project,
            'State': {'Running': True},
            'Config': {
                'Image': 'public.ecr.aws/supabase/postgres:17.6.1',
                'Labels': {
                    'com.supabase.cli.project': 'ie307-dish-v4-qa-20261026-78-1',
                    'com.supabase.cli.workdir': str(Path('.work/ci/review-results/dish-v4-qa-20261026-77-1').resolve()),
                },
            },
        }
        result = type('Result', (), {'returncode': 0, 'stdout': json.dumps([info]), 'stderr': ''})()
        with patch('scripts.dish_policy_worker.subprocess.run', return_value=result) as run:
            with self.assertRaisesRegex(RuntimeError, 'QA_DB_CONTAINER_OWNERSHIP_MISMATCH'):
                QAContainerDB('supabase_db_' + project, project,
                              '.work/ci/review-results/dish-v4-qa-20261026-77-1')
            self.assertEqual(run.call_count, 1)


if __name__ == '__main__':
    unittest.main()
