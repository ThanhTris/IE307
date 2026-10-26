"""Regression for recurring worker commands flashing Windows console windows."""
import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dish_policy_worker', ROOT / 'scripts/dish_policy_worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerProcessTests(unittest.TestCase):
    def test_both_qa_tick_adapters_hide_windows_console_and_keep_output(self):
        for adapter in (worker.QAContainerDB, worker.ManifestQAContainerDB):
            with self.subTest(adapter=adapter.__name__):
                db = adapter.__new__(adapter)
                db.container = 'owned-test-container'
                completed = subprocess.CompletedProcess([], 0, 'tick-output', '')
                with patch.object(worker.os, 'name', 'nt'), \
                        patch.object(worker.subprocess, 'CREATE_NO_WINDOW', 0x08000000, create=True), \
                        patch.object(worker.subprocess, 'run', return_value=completed) as run:
                    self.assertEqual(db.psql('select safe_tick();'), 'tick-output')
                self.assertEqual(run.call_args.kwargs['creationflags'], 0x08000000)
                self.assertTrue(run.call_args.kwargs['capture_output'])
                self.assertIn('owned-test-container', run.call_args.args[0])

    def test_non_windows_launch_does_not_receive_windows_only_flags(self):
        with patch.object(worker.os, 'name', 'posix'), patch.object(worker.subprocess, 'run') as run:
            worker.run_hidden_process(['docker', 'version'], capture_output=True, timeout=5)
        self.assertNotIn('creationflags', run.call_args.kwargs)
        self.assertEqual(run.call_args.kwargs['timeout'], 5)


if __name__ == '__main__':
    unittest.main()
