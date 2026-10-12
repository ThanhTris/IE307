"""Task planning regressions; not evidence of implemented or approved UI."""
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASIC_UI = {'GM-05', *(f'GM-{number:02d}' for number in range(9, 15))}


class UiRefinementTaskTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = (ROOT / 'tasks/backlog/GM-39.md').read_text(encoding='utf-8')
        cls.entries = json.loads((ROOT / 'tasks/task-id-map.json').read_text(encoding='utf-8'))['entries']
        cls.entry = next(item for item in cls.entries if item['new_id'] == 'GM-39')

    def test_owner_reviewer_and_project_mapping(self):
        for field in ('owner: Trang', 'reviewer: Trí', 'proposed_assignee: rosy179',
                      'github_issue: 107', 'priority: P1', 'track: UI'):
            self.assertIn(field, self.text)
        gate = json.loads((ROOT / 'tasks/project-gate.json').read_text(encoding='utf-8'))
        self.assertEqual(gate['issues']['GM-39'], 107)

    def test_only_completed_basic_ui_is_required(self):
        for key in ('start_dependencies', 'merge_dependencies'):
            line = re.search(rf'^{key}: (.*)$', self.text, re.M).group(1)
            self.assertEqual(set(re.findall(r'GM-\d{2}', line)), BASIC_UI)
        self.assertEqual({item['task'] for item in self.entry['inputs']}, BASIC_UI)
        self.assertIn('GM-39 không chờ GM-15..38 hoặc API/release', self.text)

    def test_no_backward_dependency_or_replaced_legacy_task(self):
        self.assertEqual(self.entry['previous_ids'], [])
        for entry in self.entries:
            if entry['new_id'] != 'GM-39':
                self.assertNotIn('GM-39', {item['task'] for item in entry['inputs']})
        for path in (ROOT / 'tasks').glob('*/GM-*.md'):
            if path.stem != 'GM-39':
                metadata = path.read_text(encoding='utf-8').split('---', 2)[1]
                self.assertNotRegex(metadata, r'(?m)^(?:start_dependencies|merge_dependencies):.*GM-39')

    def test_visual_and_runtime_evidence_are_required(self):
        self.assertEqual(self.entry['stage'], 'prototype')
        self.assertEqual(self.entry['verification']['mode'], 'html-prototype')
        for value in self.entry['verification'].values():
            self.assertIn(value, self.text)
        for requirement in ('Ảnh/video trước–sau', 'TalkBack', 'zoom 200%',
                            'không tự Approved/Done', 'giữ interface'):
            self.assertIn(requirement, self.text)

    def test_html_only_scope_and_project_context(self):
        self.assertIn('design/prototypes/gi-cung-duoc.html', self.entry['outputs'])
        self.assertFalse(any(path.startswith(('mobile/', 'supabase/'))
                             for path in self.entry['outputs']))
        self.assertIn('Không sửa `mobile/`, `supabase/`', self.text)
        self.assertIn('UI_REFINEMENT_BRIEF.md', self.text)
        brief = (ROOT / 'docs/design/UI_REFINEMENT_BRIEF.md').read_text(encoding='utf-8')
        for phrase in ('2–8 người', 'WANT', 'UNSET', 'GPS', 'coverage',
                       'không sửa app', 'Prompt khởi đầu', 'Trí chọn', 'mô phỏng'):
            self.assertIn(phrase, brief)
        for number in range(9, 15):
            entry = next(item for item in self.entries if item['new_id'] == f'GM-{number:02d}')
            self.assertEqual(entry['verification']['mode'], 'expo-go')


if __name__ == '__main__':
    unittest.main()
