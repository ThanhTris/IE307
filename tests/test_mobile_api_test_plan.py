"""Documentation regressions only; never claim an Android/API execution passed."""
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MATRIX = 'docs/testing/MOBILE_API_TEST_MATRIX.md'
RELATED = tuple(range(16, 39))
DEVICE = (16, *range(24, 32), 33, 35, 38)


class MobileApiPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.matrix = (ROOT / MATRIX).read_text(encoding='utf-8')
        cls.entries = {
            item['new_id']: item
            for item in json.loads((ROOT / 'tasks/task-id-map.json').read_text(encoding='utf-8'))['entries']
        }

    def task_text(self, number):
        task = f'GM-{number:02d}'
        paths = [path for path in (ROOT / 'tasks').glob(f'*/{task}.md') if path.parent.name != 'templates']
        self.assertEqual(len(paths), 1, task)
        return paths[0].read_text(encoding='utf-8')

    def test_all_api_and_consumers_link_specific_mobile_handoff(self):
        for number in RELATED:
            with self.subTest(task=number):
                text = self.task_text(number)
                self.assertIn('../../' + MATRIX, text)
                self.assertIn('## Kiểm API trên điện thoại và bàn giao', text)
                self.assertIn('Không thêm dependency từ task này tới task số lớn.', text)

    def test_device_cases_are_in_manifest_and_task_body(self):
        for number in DEVICE:
            with self.subTest(task=number):
                entry = self.entries[f'GM-{number:02d}']
                self.assertIn('Android thật', entry['verification']['cases'])
                for value in entry['verification'].values():
                    self.assertIn(value, self.task_text(number))

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
        for phrase in ('force-stop', 'release candidate', 'Không đổi Not run thành N/A',
                       'HTTP tới IP LAN bị từ chối', 'không tự public backend',
                       'Ít nhất', 'GM-31', 'GM-33', 'GM-34'):
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

    def test_templates_and_output_policy_require_split_device_evidence(self):
        for relative in ('tasks/templates/CHECKS_TEMPLATE.md',
                         'tasks/templates/HANDOFF_TEMPLATE.md',
                         '.github/pull_request_template.md',
                         'docs/project/DEFINITION_OF_DONE.md',
                         'docs/project/TASK_OUTPUT_REQUIREMENTS.md'):
            with self.subTest(path=relative):
                text = (ROOT / relative).read_text(encoding='utf-8')
                self.assertIn('MOBILE_API_TEST_MATRIX.md', text)
                self.assertIn('Not run', text)


if __name__ == '__main__':
    unittest.main()
