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
from test_repository_validator import MemorySource, deliver_in_memory


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource(controlled_statuses=True)
        original_source = gates.repository.Source
        source_patch = patch.object(gates.repository, 'Source', side_effect=lambda ref: self.source if ref is None else original_source(ref))
        source_patch.start()
        self.addCleanup(source_patch.stop)

    def records(self):
        return gates.repository.task_records(self.source)

    def approve_in_memory(self, tid):
        deliver_in_memory(self.source, tid)
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
        self.assertEqual(gates.readiness(self.source, records, 'GM-01'), ('IN_REVIEW', []))
        self.assertEqual(gates.readiness(self.source, records, 'GM-02'), ('BLOCKED', ['GM-01']))
        self.assertEqual(gates.readiness(self.source, records, 'GM-00'), ('DONE_REVIEWED', []))

    def test_approved_baseline_opens_independent_work_not_all_merges(self):
        self.approve_in_memory('GM-01')
        records = self.records()
        self.assertEqual(gates.readiness(self.source, records, 'GM-02')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, records, 'GM-03')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, records, 'GM-04'), ('READY_TO_CLAIM', []))
        self.assertEqual(gates.readiness(self.source, records, 'GM-04', 'merge'), ('NEEDS_BASE_CHECK', []))
        self.assertEqual(gates.readiness(self.source, records, 'GM-08'), ('BLOCKED', ['GM-04', 'GM-06']))
        ready = [tid for tid in records if gates.readiness(self.source, records, tid)[0] == 'READY_TO_CLAIM']
        self.assertEqual(set(ready), {'GM-02', 'GM-03', 'GM-04'})

    def test_fields_then_database_then_import(self):
        for tid in ('GM-01', 'GM-03', 'GM-04'):
            self.approve_in_memory(tid)
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-06')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-08'), ('BLOCKED', ['GM-06']))
        self.approve_in_memory('GM-06')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-08')[0], 'READY_TO_CLAIM')

    def test_contract_can_start_before_database_merge(self):
        for tid in ('GM-01', 'GM-02', 'GM-03', 'GM-04'):
            self.approve_in_memory(tid)
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-07')[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-07', 'merge'), ('BLOCKED', ['GM-06']))

    def test_mock_preferences_merge_without_backend_but_integration_waits(self):
        for tid in ('GM-01', 'GM-02', 'GM-03', 'GM-04', 'GM-05', 'GM-06', 'GM-07'):
            self.approve_in_memory(tid)
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-10', 'merge', self.source),
                         ('READY_FOR_MERGE_REVIEW', []))
        state, blockers = gates.readiness(self.source, self.records(), 'GM-25')
        self.assertEqual(state, 'BLOCKED')
        self.assertIn('GM-21', blockers)

    def test_approved_dependency_without_handoff_blocks(self):
        self.approve_in_memory('GM-01')
        self.source.files.remove('docs/evidence/roadmap-v2/GM-01/HANDOFF.md')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02'),
                         ('BLOCKED_ARTIFACTS', ['GM-01']))

    def test_missing_delivered_output_blocks(self):
        for tid in ('GM-01', 'GM-02', 'GM-04'):
            self.approve_in_memory(tid)
        import json
        entry = next(e for e in json.loads(self.source.read('tasks/task-id-map.json'))['entries']
                     if e['new_id'] == 'GM-02')
        self.source.files.remove(entry['outputs'][0])
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-05'),
                         ('BLOCKED_ARTIFACTS', ['GM-02']))

    def test_missing_target_handoff_blocks_start_and_merge(self):
        self.approve_in_memory('GM-01')
        base = MemorySource(controlled_statuses=True)
        base.contents.update(self.source.contents)
        base.files.update(self.source.files)
        base.files.remove('docs/evidence/roadmap-v2/GM-01/HANDOFF.md')
        for gate in ('start', 'merge'):
            self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', gate, base),
                             ('BLOCKED_ON_BASE', ['GM-01']))

    def test_accepted_owner_distinguishes_ready_to_start(self):
        self.approve_in_memory('GM-01')
        path = self.source.task_path('GM-02')
        self.source.contents[path] = self.source.read(path).replace('assignment_status: proposed', 'assignment_status: accepted')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02')[0], 'READY_TO_START')

    def test_all_dependencies_required_not_any(self):
        self.approve_in_memory('GM-01')
        self.approve_in_memory('GM-02')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-07', 'merge'), ('BLOCKED', ['GM-03', 'GM-04', 'GM-06']))

    def test_merge_without_base_is_never_ready(self):
        self.approve_in_memory('GM-01')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', 'merge'), ('NEEDS_BASE_CHECK', []))

    def test_approved_local_dependency_missing_on_base_still_blocks(self):
        base = MemorySource(controlled_statuses=True)
        self.approve_in_memory('GM-01')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', 'merge', base), ('BLOCKED_ON_BASE', ['GM-01']))

    def test_matching_approved_dependency_on_base_allows_merge_review_only(self):
        self.approve_in_memory('GM-01')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', 'merge', self.source), ('READY_FOR_MERGE_REVIEW', []))

    def test_changed_evidence_or_task_revision_on_base_blocks(self):
        self.approve_in_memory('GM-01')
        base = MemorySource(controlled_statuses=True)
        base.contents.update(self.source.contents)
        base.files.update(self.source.files)
        evidence = 'docs/evidence/GM-28/REPOSITORY_AUDIT.md'
        base.contents[evidence] += '\nAn older/different review revision.\n'
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', 'merge', base)[0], 'BLOCKED_ON_BASE')
        base.contents.update(self.source.contents)
        base.files.update(self.source.files)
        base.contents['tasks/review/GM-01.md'] += '\nChanged scope.\n'
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02', 'merge', base)[0], 'BLOCKED_ON_BASE')

    def test_merge_requires_start_gate_even_when_merge_deps_empty(self):
        records = self.records()
        records['GM-02']['meta']['merge_dependencies'] = ''
        self.assertEqual(gates.readiness(self.source, records, 'GM-02', 'merge', self.source), ('BLOCKED', ['GM-01']))

    def test_done_parent_with_pending_review_does_not_unlock(self):
        path = 'tasks/review/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('status: review', 'status: done')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02'), ('BLOCKED', ['GM-01']))

    def test_missing_evidence_does_not_unlock(self):
        self.approve_in_memory('GM-01')
        self.source.files.remove('docs/evidence/GM-28/REPOSITORY_AUDIT.md')
        self.assertEqual(gates.readiness(self.source, self.records(), 'GM-02')[0], 'BLOCKED')

    def test_every_dependency_precedes_child_in_layers(self):
        records = self.records()
        for gate in ('start', 'merge'):
            levels = {tid: index for index, layer in enumerate(gates.layers(records, gate)) for tid in layer}
            self.assertEqual(set(levels), set(records))
            for tid, record in records.items():
                for dep in gates.dependencies(record, gate):
                    self.assertLess(levels[dep], levels[tid], (gate, dep, tid))

    def test_layers_reject_cycles(self):
        records = self.records()
        records['GM-00']['meta']['dependencies'] = 'GM-01'
        with self.assertRaisesRegex(ValueError, 'cycle'):
            gates.layers(records)

    def test_generated_indexes_match_repository(self):
        for path, expected in gates.render_documents(self.source).items():
            self.assertEqual(self.source.read(path), expected, path)

    def test_live_repository_indexes_match_current_status(self):
        live = MemorySource()
        for path, expected in gates.render_documents(live).items():
            self.assertEqual(live.read(path), expected, path)

    def test_moving_tasks_does_not_rewrite_historical_evidence(self):
        path = 'docs/evidence/roadmap-v1/GM-01/FINAL_AUDIT_2026-10-08.md'
        self.source.contents[path] = '[old task](../../../../tasks/backlog/GM-01.md)\n'
        self.assertNotIn(path, gates.task_link_updates(self.source))

    def test_owner_change_makes_generated_indexes_stale(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = self.source.read(path).replace('owner: Tuấn', 'owner: Trang')
        result = gates.render_documents(self.source)
        name = 'docs/project/TEAM_AND_RESPONSIBILITIES.md'
        self.assertNotEqual(self.source.read(name), result[name])

    def test_moved_task_links_are_repaired_without_changing_status(self):
        old, new = 'tasks/review/GM-01.md', 'tasks/done/GM-01.md'
        self.source.files.remove(old)
        self.source.files.add(new)
        original = self.source.contents.pop(old)
        self.source.contents[new] = original.replace('status: review', 'status: done')
        updates = gates.task_link_updates(self.source)
        task = updates[self.source.task_path('GM-02')]
        self.assertIn('[GM-01](../done/GM-01.md)', task)
        self.assertIn('status: backlog', task)
        self.assertNotIn('Decision: Approved', task)
        self.assertEqual(self.source.read(new), original.replace('status: review', 'status: done'))

    def test_task_link_repair_keeps_anchors_and_external_urls(self):
        path = 'docs/project/link-test.md'
        self.source.files.add(path)
        external = '[external](https://example.com/tasks/backlog/GM-01.md)'
        self.source.contents[path] = '[gate](../../tasks/backlog/GM-01.md#review)\n' + external
        revised = gates.task_link_updates(self.source)[path]
        self.assertIn('../../tasks/review/GM-01.md#review', revised)
        self.assertIn(external, revised)

    def test_task_cli_reports_blocker_with_nonzero_exit(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['task_readiness.py', '--approval-source', 'local', '--task', 'GM-02']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 1)
        self.assertIn('WAIT GM-01', output.getvalue())

    def test_task_cli_unknown_id_is_error(self):
        with patch.object(sys, 'argv', ['task_readiness.py', '--approval-source', 'local', '--task', 'GM-99']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gates.main(), 2)

    def test_merge_cli_requires_explicit_target_ref(self):
        with patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-02', '--gate', 'merge']), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as raised:
                gates.main()
        self.assertEqual(raised.exception.code, 2)

    def test_merge_cli_uses_real_git_snapshot_without_writing(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['task_readiness.py', '--approval-source', 'local', '--task', 'GM-02', '--gate', 'merge', '--base-ref', 'HEAD']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 1)
        self.assertIn('Target snapshot: HEAD =', output.getvalue())
        self.assertIn('WAIT GM-01', output.getvalue())

    def test_task_cli_approved_baseline_is_success(self):
        with patch.object(sys, 'argv', ['task_readiness.py', '--approval-source', 'local', '--task', 'GM-00']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gates.main(), 0)

    def test_all_report_can_succeed_while_work_is_blocked(self):
        output = io.StringIO()
        with patch.object(sys, 'argv', ['task_readiness.py', '--approval-source', 'local', '--all']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 0)
        self.assertIn('BLOCKED', output.getvalue())


if __name__ == '__main__':
    unittest.main()
