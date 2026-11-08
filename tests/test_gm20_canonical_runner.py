"""Fail-closed ownership checks before any canonical QA Docker mutation."""
import importlib.util
from pathlib import Path
import unittest
import sys
import tempfile
import os
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('gm20_canonical_runner',ROOT/'scripts/gm20_canonical_check.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class CanonicalRunnerOwnershipTests(unittest.TestCase):
    def state(self):
        project='ie307-dish-v4-qa-20261029-123-1'
        return {'GM_V4_QA_PROJECT_ID':project,'GM_V4_QA_WORKDIR':str(ROOT/'.work/ci/review-results'/project.removeprefix('ie307-')),'GM_V4_OWNER_NAMESPACE':'00000000-0000-4000-8000-000000000001'}
    def test_application_project_and_external_workdir_are_rejected(self):
        for field,value in [('GM_V4_QA_PROJECT_ID','gi-cung-duoc-local'),('GM_V4_QA_WORKDIR','/tmp/not-owned'),('GM_V4_QA_WORKDIR',str(ROOT/'.work/ci/another-project'))]:
            state=self.state();state[field]=value
            with self.subTest(field=field,value=value),self.assertRaisesRegex(RuntimeError,'OWNERSHIP_MISMATCH'):runner.validate_state(state)
    def test_private_control_cannot_inject_unrelated_environment(self):
        state=self.state();state['HOME']='/tmp/unsafe'
        with self.assertRaisesRegex(RuntimeError,'CONTROL_KEYS'):runner.validate_state(state)
    def test_namespace_is_required_and_owned_layout_is_accepted(self):
        self.assertEqual(runner.validate_state(self.state())[0],self.state()['GM_V4_QA_PROJECT_ID'])
        state=self.state();state['GM_V4_OWNER_NAMESPACE']='not-a-uuid'
        with self.assertRaisesRegex(RuntimeError,'NAMESPACE_MISMATCH'):runner.validate_state(state)


class CanonicalRunnerFailureEvidenceTests(unittest.TestCase):
    def test_setup_failure_records_fail_and_removes_stale_success_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)
            stale=output/'http-results.json';stale.write_text('{"result":"Pass"}')
            with patch.object(runner,'OUTPUT',output),patch.object(runner.runtime,'REPORT',output/'runtime.json'), \
                 patch.object(sys,'argv',['gm20-canonical-check','--keep']),patch.dict(os.environ), \
                 patch.object(runner.runtime,'setup',side_effect=RuntimeError('synthetic setup failure')), \
                 patch.object(runner.runtime,'record') as record:
                with self.assertRaisesRegex(RuntimeError,'synthetic setup failure'):runner.main()
                self.assertFalse(stale.exists())
                record.assert_called_with('gm20-canonical-run','Fail',failure='synthetic setup failure')
