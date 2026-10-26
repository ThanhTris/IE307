"""Task metadata and handoff contract checks; never claim a device/API run passed."""
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MATRIX = 'docs/testing/MOBILE_API_TEST_MATRIX.md'
HANDOFF = 'docs/project/UI_BE_DATA_SYNC_HANDOFF_2026-10-25.md'
FIGMA_MAP = 'docs/design/UI_FIGMA_TASK_MAP.json'
API_PRODUCERS = tuple(range(16, 24))


class MobileApiPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.matrix = (ROOT / MATRIX).read_text(encoding='utf-8')
        cls.task_map = json.loads((ROOT / 'tasks/task-id-map.json').read_text(encoding='utf-8'))
        cls.entries = {item['new_id']: item for item in cls.task_map['entries']}
        cls.figma = json.loads((ROOT / FIGMA_MAP).read_text(encoding='utf-8'))

    def task_text(self, number):
        task = f'GM-{number:02d}'
        paths = [path for path in (ROOT / 'tasks').glob(f'*/{task}.md') if path.parent.name != 'templates']
        self.assertEqual(len(paths), 1, task)
        return paths[0].read_text(encoding='utf-8')

    def test_current_task_verification_metadata_is_structured_and_complete(self):
        for number in range(16, 39):
            task_id = f'GM-{number:02d}'
            with self.subTest(task=task_id):
                entry = self.entries[task_id]
                self.assertIn(entry.get('stage'), {
                    'implementation', 'integration', 'native', 'regression', 'qa',
                    'release', 'extension',
                })
                verification = entry.get('verification')
                self.assertIsInstance(verification, dict)
                for key in ('mode', 'tool', 'entrypoint', 'expected', 'cases'):
                    self.assertIsInstance(verification.get(key), str)
                    self.assertTrue(verification[key].strip(), f'{task_id}: verification.{key}')
                self.assertTrue(self.task_text(number).strip())

    def test_figma_map_is_versioned_and_links_real_task_frames(self):
        self.assertRegex(self.figma['version'], r'^ui-figma-final/\d{4}-\d{2}-\d{2}$')
        self.assertRegex(self.figma['handoffUrl'], r'^https://www\.figma\.com/design/')
        self.assertEqual(len(self.figma['fileKey']), 22)
        for item in self.figma['tasks']:
            with self.subTest(task=item['id']):
                self.assertRegex(item['id'], r'^GM-\d{2}$')
                self.assertTrue(item.get('nodes'), f"{item['id']} has no Figma frame/node")
                self.assertRegex(item.get('figmaUrl', ''), r'^https://www\.figma\.com/design/')
                number = int(item['id'][-2:])
                text = self.task_text(number)
                self.assertTrue(
                    FIGMA_MAP in text or item['figmaUrl'] in text,
                    f"{item['id']} must link its machine-readable Figma source or mapped frame",
                )

    def test_be_producer_tasks_name_handoff_and_real_api_checks(self):
        handoff = (ROOT / HANDOFF).read_text(encoding='utf-8')
        self.assertIn('GM-16', handoff)
        self.assertIn('GM-23', handoff)
        for number in API_PRODUCERS:
            with self.subTest(task=number):
                entry = self.entries[f'GM-{number:02d}']
                verification = entry['verification']
                self.assertEqual(verification['mode'], 'api')
                self.assertRegex(verification['tool'], r'(?i)(postman|curl|http|sql|runner)')
                self.assertRegex(verification['entrypoint'], r'(?i)(api|rpc|history|inbox|room|catalogue|ballot|snapshot|session|invite|start)')
                text = self.task_text(number)
                self.assertIn('CHECKS', text)
                self.assertIn('HANDOFF', text)
                self.assertRegex(text, r'(?i)(http|rpc|sql|api)')

    def test_device_scope_preserves_android_api_and_not_run_requirements(self):
        device_modes = {'expo-api', 'expo-native', 'expo-api-extension'}
        for entry in self.entries.values():
            mode = entry.get('verification', {}).get('mode')
            if mode not in device_modes:
                continue
            with self.subTest(task=entry['new_id']):
                cases = entry['verification']['cases']
                scope = ' '.join(entry['verification'].values())
                self.assertRegex(scope, r'(?i)android|thiết bị|expo go|native build')
                self.assertRegex(scope, r'(?i)api|http|endpoint|request|rest')
                text = self.task_text(int(entry['new_id'][-2:]))
                self.assertRegex(text, r'(?i)(API|HTTP|endpoint|request|native|Expo)')
                if 'Not run' in cases or 'Not run' in scope:
                    self.assertRegex(text, r'(?i)not run|chưa chạy')

    def test_gm16_native_adapter_does_not_wait_for_future_screens(self):
        text = self.task_text(16)
        for key in ('start_dependencies', 'merge_dependencies'):
            line = re.search(rf'^{key}: (.*)$', text, re.M).group(1)
            self.assertEqual(set(re.findall(r'GM-\d{2}', line)), {'GM-03', 'GM-06', 'GM-07'})
        self.assertIn('harness nội bộ tối thiểu', text)
        self.assertIn('AC native/expiry hiện hành còn Not run vẫn chặn Done', text)
        self.assertIn('Auth HTTP/SecureStore thật', self.entries['GM-16']['verification']['tool'])

    def test_server_matrix_covers_every_core_api_and_staged_native_checks(self):
        for number in range(16, 24):
            self.assertRegex(self.matrix, rf'(?m)^\| GM-{number:02d} /')
        for phrase in ('force-stop', 'release candidate', 'Not run',
                       'HTTP', 'public backend', 'GM-31', 'GM-33', 'GM-34'):
            # Case-insensitive minimum-device wording is intentional.
            self.assertIn(phrase.lower(), self.matrix.lower())

    def test_structure_mock_and_extensions_keep_their_stages(self):
        self.assertEqual(self.entries['GM-02']['stage'], 'structure')
        self.assertEqual(self.entries['GM-03']['stage'], 'structure')
        for number in range(9, 15):
            self.assertEqual(self.entries[f'GM-{number:02d}']['verification']['mode'], 'expo-go')
        for number in (36, 37):
            self.assertEqual(self.entries[f'GM-{number:02d}']['verification']['mode'], 'api-extension')
            self.assertIn('Scope hiện tại', self.task_text(number))

    def test_templates_and_output_policy_keep_split_evidence_and_handoff_links(self):
        for relative in ('tasks/templates/CHECKS_TEMPLATE.md',
                         'tasks/templates/HANDOFF_TEMPLATE.md',
                         '.github/pull_request_template.md',
                         'docs/project/DEFINITION_OF_DONE.md',
                         'docs/project/TASK_OUTPUT_REQUIREMENTS.md'):
            with self.subTest(path=relative):
                text = (ROOT / relative).read_text(encoding='utf-8')
                self.assertRegex(text, r'(?i)not run')
                self.assertRegex(text, r'(?i)(Android|device|thiết bị)')
                self.assertRegex(text, r'(?i)(mock|giả lập)')
        self.assertTrue((ROOT / HANDOFF).is_file())
        self.assertTrue((ROOT / FIGMA_MAP).is_file())


if __name__ == '__main__':
    unittest.main()
