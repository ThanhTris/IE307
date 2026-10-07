"""Gate scenarios use in-memory task copies; never approve real repository tasks."""
import contextlib
import io
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import task_readiness as gates
from test_repository_validator import MemorySource


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource()

    def records(self):
        return gates.repository.task_records(self.source)

    def approve_in_memory(self, tid):
        record = self.records()[tid]
        text = record['text']
        text = re.sub(r'^status:.*$', 'status: done', text, flags=re.M)
        text = re.sub(r'^assignment_status:.*$', 'assignment_status: accepted', text, flags=re.M)
        text = text.replace('- [ ]', '- [x]')
        text += (f"\nReviewed-by: {record['meta']['reviewer']}\nReviewed-at: 2026-10-07\n"
                 "Decision: Approved\nReview-evidence: docs/evidence/GM-28/REPOSITORY_AUDIT.md\n")
        self.source.contents[record['path']] = text

    def test_current_baseline_is_review_and_children_blocked(self):
        records = self.records()
        self.assertEqual(gates.readiness(self.source, records, 'GM-28'), ('IN_REVIEW', []))
        self.assertEqual(gates.readiness(self.source, records, 'GM-01'), ('BLOCKED', ['GM-28']))
        self.assertEqual(gates.readiness(self.source, records, 'GM-00'), ('DONE_REVIEWED', []))

    def test_approved_gate_opens_only_directly_satisfied_tasks(self):
        self.approve_in_memory('GM-28')
        records = self.records()
        self.assertEqual(gates.readiness(self.source, records, 'GM-01')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, records, 'GM-03')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, records, 'GM-02'), ('BLOCKED', ['GM-01']))

    def test_accepted_owner_distinguishes_ready_to_start(self):
        self.approve_in_memory('GM-28')
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('assignment_status: proposed', 'assignment_status: accepted')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-01')[0], 'READY_TO_START')

    def test_all_dependencies_required_not_any(self):
        self.approve_in_memory('GM-01')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-05'), ('BLOCKED', ['GM-04']))

    def test_done_parent_with_pending_review_does_not_unlock(self):
        path = 'tasks/review/GM-28.md'
        self.source.contents[path] = self.source.read(path).replace('status: review', 'status: done')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-01'), ('BLOCKED', ['GM-28']))

    def test_missing_evidence_does_not_unlock(self):
        self.approve_in_memory('GM-28')
        self.source.files.remove('docs/evidence/GM-28/REPOSITORY_AUDIT.md')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-01')[0], 'BLOCKED')

    def test_every_dependency_precedes_child_in_layers(self):
        records = self.records()
        levels = {tid: index for index, layer in enumerate(gates.layers(records)) for tid in layer}
        self.assertEqual(set(levels), set(records))
        for tid, record in records.items():
            for dep in gates.dependencies(record):
                self.assertLess(levels[dep], levels[tid], (dep, tid))

    def test_layers_reject_cycles(self):
        records = self.records()
        records['GM-00']['meta']['dependencies'] = 'GM-28'
        with self.assertRaisesRegex(ValueError, 'cycle'):
            gates.layers(records)

    def test_generated_indexes_match_repository(self):
        for path, expected in gates.render_documents(self.source).items():
            self.assertEqual(self.source.read(path), expected, path)

    def test_owner_change_makes_generated_indexes_stale(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('owner: Tuấn', 'owner: Trang')
        result = gates.render_documents(self.source)
        name = 'docs/project/TEAM_AND_RESPONSIBILITIES.md'
        self.assertNotEqual(self.source.read(name), result[name])

    def test_moved_task_links_are_repaired_without_changing_status(self):
        old, new = 'tasks/review/GM-28.md', 'tasks/done/GM-28.md'
        self.source.files.remove(old)
        self.source.files.add(new)
        original = self.source.contents.pop(old)
        self.source.contents[new] = original.replace('status: review', 'status: done')
        updates = gates.task_link_updates(self.source)
        task = updates['tasks/backlog/GM-01.md']
        self.assertIn('[GM-28](../done/GM-28.md)', task)
        self.assertIn('status: backlog', task)
        self.assertNotIn('Decision: Approved', task)
        self.assertEqual(self.source.read(new), original.replace('status: review', 'status: done'))

    def test_task_link_repair_keeps_anchors_and_external_urls(self):
        path = 'docs/project/link-test.md'
        self.source.files.add(path)
        external = '[external](https://example.com/tasks/backlog/GM-28.md)'
        self.source.contents[path] = '[gate](../../tasks/backlog/GM-28.md#review)\n' + external
        revised = gates.task_link_updates(self.source)[path]
        self.assertIn('../../tasks/review/GM-28.md#review', revised)
        self.assertIn(external, revised)

    def test_task_cli_reports_blocker_with_nonzero_exit(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-01']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 1)
        self.assertIn('WAIT GM-28', output.getvalue())

    def test_task_cli_unknown_id_is_error(self):
        with patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-99']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gates.main(), 2)

    def test_task_cli_approved_baseline_is_success(self):
        with patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-00']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gates.main(), 0)

    def test_all_report_can_succeed_while_work_is_blocked(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['task_readiness.py', '--all']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 0)
        self.assertIn('BLOCKED', output.getvalue())


if __name__ == '__main__':
    unittest.main()
