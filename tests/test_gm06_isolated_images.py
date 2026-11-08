"""Exact-version image cache portability and fail-before-allocation behavior."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('isolated_image_runner', ROOT/'scripts/gm06_isolated_http_check.py')
runner = importlib.util.module_from_spec(spec)
with patch.object(sys, 'path', [str(ROOT/'scripts'), *sys.path]):
    spec.loader.exec_module(runner)


class IsolatedImageTests(unittest.TestCase):
    def inspect_cache(self, available):
        def inspect(args, **kwargs):
            self.assertEqual(args[:5], ['docker', 'image', 'inspect', '--format', '{{.Id}}'])
            self.assertEqual(kwargs['encoding'], 'utf-8')
            found = args[-1] in available
            return subprocess.CompletedProcess(args, 0 if found else 1,
                                               'sha256:cached\n' if found else '',
                                               '' if found else 'Error response from daemon: No such image: '+args[-1])
        return inspect

    def test_ecr_cached_without_fallback(self):
        for image in (runner.PG_IMAGE, runner.REST_IMAGE):
            with self.subTest(image=image), patch.object(runner.subprocess, 'run', side_effect=self.inspect_cache({image})) as run:
                self.assertEqual(runner.local_image(image), image)
                self.assertEqual(run.call_count, 1)

    def test_ci_ghcr_cache_uses_same_pinned_version(self):
        for image in (runner.PG_IMAGE, runner.REST_IMAGE):
            ghcr = image.replace('public.ecr.aws/', 'ghcr.io/')
            with self.subTest(image=image), patch.object(runner.subprocess, 'run', side_effect=self.inspect_cache({ghcr})) as run:
                self.assertEqual(runner.local_image(image), ghcr)
                self.assertEqual([call.args[0][-1] for call in run.call_args_list], [image, ghcr])

    def test_ci_docker_hub_cache_uses_same_pinned_version(self):
        for image in (runner.PG_IMAGE, runner.REST_IMAGE):
            ghcr = image.replace('public.ecr.aws/', 'ghcr.io/')
            hub = image.removeprefix('public.ecr.aws/')
            with self.subTest(image=image), patch.object(runner.subprocess, 'run', side_effect=self.inspect_cache({hub})) as run:
                self.assertEqual(runner.local_image(image), hub)
                self.assertEqual([call.args[0][-1] for call in run.call_args_list], [image, ghcr, hub])

    def test_wrong_version_cached_in_docker_hub_is_rejected(self):
        for image in (runner.PG_IMAGE, runner.REST_IMAGE):
            hub = image.removeprefix('public.ecr.aws/')
            other = hub.rsplit(':', 1)[0]+':0.0.0'
            with self.subTest(image=image), patch.object(runner.subprocess, 'run', side_effect=self.inspect_cache({other})) as run:
                with self.assertRaisesRegex(RuntimeError, 'OWNED_QA_IMAGE_NOT_CACHED'):
                    runner.local_image(image)
                self.assertNotIn(other, [call.args[0][-1] for call in run.call_args_list])
                self.assertEqual(run.call_count, 3)

    def test_missing_images_fail_before_resource_allocation_with_report(self):
        with tempfile.TemporaryDirectory() as folder:
            report = Path(folder)/'report.json'
            with patch.object(runner, 'git_ref', return_value='test-head'), \
                 patch.object(runner.subprocess, 'run', side_effect=self.inspect_cache(set())), \
                 patch.object(runner, 'command') as allocate:
                with self.assertRaisesRegex(RuntimeError, 'OWNED_QA_IMAGE_NOT_CACHED'):
                    runner.run(report)
                allocate.assert_not_called()
            result = json.loads(report.read_text(encoding='utf-8'))
            self.assertEqual(result['result'], 'Fail')
            self.assertEqual(result['assertions'], 0)
            self.assertEqual(result['cleanup'], 'own containers/tmpfs and network removed')
            self.assertIn('docker pull ghcr.io/supabase/postgres:17.11.0.004', result['failure'])

    def test_daemon_error_is_not_treated_as_cache_miss(self):
        denied = subprocess.CompletedProcess([], 1, '', 'permission denied on Docker socket; private diagnostic')
        with patch.object(runner.subprocess, 'run', return_value=denied) as run:
            with self.assertRaisesRegex(RuntimeError, '^OWNED_QA_IMAGE_INSPECTION_FAILED') as raised:
                runner.local_image(runner.PG_IMAGE)
            self.assertNotIn('private diagnostic', str(raised.exception))
            self.assertEqual(run.call_count, 1)


if __name__ == '__main__':
    unittest.main()
