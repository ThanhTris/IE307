import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import gm33_preflight as gm33


class PilotPreflightTest(unittest.TestCase):
    def test_adb_inventory_separates_usb_from_other_transports(self):
        rows = """List of devices attached
usb-private-serial device usb:1-1 product:example
emulator-5564 device product:sdk
wireless-private device product:example
offline-private offline usb:1-2
unauthorized-private unauthorized usb:1-3
"""
        self.assertEqual(gm33.classify_devices(rows),
                         {'usb': 1, 'emulator': 1, 'other': 1, 'unavailable': 2})
        with self.assertRaises(ValueError):
            gm33.classify_devices('unrecognized output')

    def test_received_gm32_checks_the_actual_runtime(self):
        runtime = {'catalogues': {'real': 'release'}, 'migrations': [{'version': '0041'}],
                   'schemaVersions': ['0.17.0']}
        runs = [{'group': group, 'result': 'Pass', 'stages': [{'result': 'Pass'}],
                 'functionInventorySha256': 'matching-functions'} for group in gm33.GM32_GROUPS]
        receipt = runtime | {'baseRevision': 'base', 'credentialsInEvidence': False, 'runs': runs}
        qa = runtime | {'state': 'Verified', 'functionInventorySha256': 'matching-functions'}
        with patch.object(gm33, 'run_command') as git:
            git.return_value = subprocess.CompletedProcess([], 0, json.dumps(receipt))
            self.assertIs(gm33.check_gm32(qa)['runtimeMatch'], True)
            git.assert_called_with('git', 'show', 'HEAD:' + gm33.GM32_RUNS)
            self.assertIs(gm33.check_gm32(qa | {'migrations': []})['runtimeMatch'], False)
            self.assertIs(gm33.check_gm32(qa | {'functionInventorySha256': 'other'})['runtimeMatch'], False)
            receipt['runs'].pop()
            git.return_value = subprocess.CompletedProcess([], 0, json.dumps(receipt))
            self.assertEqual(gm33.check_gm32(qa)['state'], 'Invalid')

    def collect(self, *, main='app-revision', gate='READY_TO_START', usb=True,
                catalogue=True, qa_revision='app-revision', dirty=False):
        def command(*args):
            if args[:2] == ('adb', 'devices'):
                device = 'private-serial device usb:1-1' if usb else 'emulator-5564 device'
                return subprocess.CompletedProcess(args, 0, 'List of devices attached\n' + device)
            output = {
                'rev-parse': 'app-revision',
                'ls-remote': main + '\trefs/heads/main',
                'merge-base': '',
                'status': ' M mobile/app.config.ts' if dirty else '',
            }[args[1]]
            return subprocess.CompletedProcess(args, 0, output)

        with (patch.object(gm33, 'run_command', side_effect=command),
              patch.object(gm33, 'check_project', return_value={
                  'state': gate, 'catalogue': {
                      'artifactsOnMain': True, 'projectDone': catalogue,
                      'projectStatus': 'Done' if catalogue else 'Needs Update',
                  },
              }),
              patch.object(gm33, 'check_qa', return_value={
                  'state': 'Verified', 'sourceRevision': qa_revision,
              }),
              patch.object(gm33, 'check_gm32', return_value={
                  'state': 'Received', 'runtimeMatch': True,
              })):
            return gm33.preflight('adb', Path('manifest.json'))

    def test_preflight_never_reports_pilot_pass_or_serial(self):
        report = self.collect()
        self.assertEqual(report['preflight'], 'Ready for manual setup')
        self.assertIs(report['pilotExecuted'], False)
        self.assertNotIn('private-serial', json.dumps(report))

    def test_merged_catalogue_still_requires_project_approval(self):
        report = self.collect(catalogue=False)
        self.assertTrue(report['project']['catalogue']['artifactsOnMain'])
        self.assertEqual(report['blockers'], [
            'GM-40 must be Done on Project #2 (current status: Needs Update)',
        ])

    def test_preflight_blocks_stale_target_gate_device_and_qa(self):
        report = self.collect(main='advanced', gate='BLOCKED', usb=False,
                              catalogue=False, qa_revision='old', dirty=True)
        self.assertEqual(report['preflight'], 'Blocked')
        self.assertEqual(len(report['blockers']), 6)
        self.assertEqual(report['adb']['counts']['emulator'], 1)


if __name__ == '__main__':
    unittest.main()
