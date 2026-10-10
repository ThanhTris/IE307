"""Negative checks for task/requirement manifests, not native feature tests."""
from pathlib import Path
import importlib.util
import json
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location(
    "repository_validator", ROOT / "scripts" / "validate_repository.py"
)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class MemorySource:
    def __init__(self, controlled_statuses=False):
        source = validator.Source(None)
        self.files = set(source.files)
        self.contents = {
            path: source.read(path)
            for path in self.files
            if path.endswith((".md", ".json"))
        }
        if controlled_statuses:
            # Explicit test fixture, independent of later human approvals in the repo.
            # Never change real task status/evidence to manufacture a gate result.
            record = validator.task_records(self)['GM-01']
            old, new = record['path'], 'tasks/review/GM-01.md'
            text = re.sub(r'^status:.*$', 'status: review', record['text'], flags=re.M)
            text = re.sub(r'^(Reviewed-by|Reviewed-at|Decision|Review-evidence):.*\n?', '', text, flags=re.M)
            text = text.replace('- [x]', '- [ ]')
            self.files.remove(old)
            self.contents.pop(old)
            self.files.add(new)
            self.contents[new] = text
            for tid in ('GM-02', 'GM-03', 'GM-08'):
                current = self.task_path(tid)
                if current != f'tasks/backlog/{tid}.md':
                    baseline = self.contents.pop(current)
                    baseline = re.sub(r'^status:.*$', 'status: backlog', baseline, flags=re.M)
                    baseline = re.sub(r'^assignment_status:.*$', 'assignment_status: proposed', baseline, flags=re.M)
                    backlog = f'tasks/backlog/{tid}.md'
                    self.files.remove(current)
                    self.files.add(backlog)
                    self.contents[backlog] = baseline
            import task_readiness
            self.contents.update(task_readiness.task_link_updates(self))
            self.contents.update(task_readiness.render_documents(self))

    def read(self, path):
        return self.contents[path]

    def task_path(self, tid):
        return next(path for path in self.files if re.fullmatch(rf'tasks/(?:backlog|in-progress|review|done)/{tid}\.md', path))

    def exists(self, path):
        return path in self.files or any(
            item.startswith(path.rstrip("/") + "/") for item in self.files
        )


def deliver_in_memory(source, tid):
    """Synthetic artifact presence; never writes to the repository."""
    entry = next(e for e in json.loads(source.read('tasks/task-id-map.json'))['entries']
                 if e['new_id'] == tid)
    for path in entry['outputs'] + [f'docs/evidence/roadmap-v2/{tid}/HANDOFF.md']:
        source.files.add(path)
        source.contents.setdefault(path, '{}' if path.endswith('.json') else 'Synthetic delivered artifact.\n')


class ManifestValidationTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource(controlled_statuses=True)

    def errors(self):
        return "\n".join(validator.validate(self.source))

    def test_current_baseline(self):
        self.assertEqual(self.errors(), "")

    def test_live_repository_static_validation_defers_dependency_approval_to_project(self):
        # Actual Project gates run live; stale Markdown must not block structural CI.
        source = MemorySource()
        validator.github_project_status.configuration(source)
        self.assertEqual(validator.validate(source, check_dependency_approvals=False), [])

    def test_only_known_archived_task_paths_are_historical_references(self):
        path = 'docs/evidence/roadmap-v1/GM-01/FINAL_AUDIT_2026-10-08.md'
        target = 'tasks/review/GM-01.md'
        self.assertTrue(validator.historical_task_reference(self.source, path, target))
        self.assertFalse(validator.historical_task_reference(self.source, path, 'tasks/review/GM-99.md'))
        self.assertFalse(validator.historical_task_reference(self.source, path, 'missing-artifact.md'))
        self.assertFalse(validator.historical_task_reference(self.source, 'docs/project/START_HERE.md', target))

    def test_missing_data_preparation_notebook_link_is_rejected(self):
        path = "data-preparation/README.md"
        self.source.contents[path] = self.source.read(path).replace(
            "(notebooks/prepare_thu_duc_menus.ipynb)", "(notebooks/missing.ipynb)"
        )
        self.assertIn(
            "broken link: data-preparation/README.md -> notebooks/missing.ipynb",
            self.errors(),
        )

    def test_declared_task_missing_is_rejected(self):
        self.source.files.remove("tasks/backlog/GM-18.md")
        self.assertIn("task/manifest mismatch", self.errors())

    def test_duplicate_task_manifest_is_rejected(self):
        path = "tasks/backlog/MASTER_BACKLOG.md"
        self.source.contents[path] += "\n| [GM-18](GM-18.md) | duplicate |\n"
        self.assertIn("unique implementation task IDs", self.errors())

    def test_dependency_cycle_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-02', self.source.read(path), flags=re.M)
        self.assertIn("dependency cycle", self.errors())

    def test_missing_current_requirement_trace_is_rejected(self):
        path = "docs/specs/TRACEABILITY.md"
        self.source.contents[path] = "\n".join(
            line for line in self.source.read(path).splitlines()
            if not line.startswith("| FR-20 |")
        )
        self.assertIn("each current FR exactly once", self.errors())

    def test_duplicate_requirement_trace_is_rejected(self):
        path = "docs/specs/TRACEABILITY.md"
        row = next(line for line in self.source.read(path).splitlines()
                   if line.startswith("| FR-20 |"))
        self.source.contents[path] += "\n" + row + "\n"
        self.assertIn("each current FR exactly once", self.errors())

    def test_unknown_trace_task_is_rejected(self):
        path = "docs/specs/TRACEABILITY.md"
        self.source.contents[path] += "\nUnknown task GM-99\n"
        self.assertIn("unknown task in traceability", self.errors())

    def test_done_pending_decision_is_rejected(self):
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = re.sub(r'^Decision:.*$', 'Decision: Pending', self.source.read(path), flags=re.M)
        self.assertIn('Decision is not Approved', self.errors())

    def test_done_without_evidence_is_rejected(self):
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = re.sub(r'^Review-evidence:.*$', 'Review-evidence: missing.md', self.source.read(path), flags=re.M)
        self.assertIn('missing review evidence file', self.errors())

    def test_review_date_must_exist_in_calendar(self):
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = re.sub(r'^Reviewed-at:.*$', 'Reviewed-at: 2026-02-30', self.source.read(path), flags=re.M)
        self.assertIn('invalid review date', self.errors())

    def test_recorded_reviewer_must_match_independent_reviewer(self):
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = self.source.read(path).replace('Reviewed-by: Trí', 'Reviewed-by: Codex')
        self.assertIn('independent reviewer mismatch', self.errors())

    def test_done_with_unchecked_criteria_is_rejected(self):
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] += '\n- [ ] Incomplete acceptance criterion\n'
        self.assertIn('unchecked criteria in done task', self.errors())

    def test_active_child_rejects_done_parent_without_approval(self):
        # GM-01 is review; its GM-00 dependency must be approved, not just in done/.
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = re.sub(r'^Decision:.*$', 'Decision: Changes requested', self.source.read(path), flags=re.M)
        self.assertIn('active task with unreviewed dependency: GM-01 -> GM-00', self.errors())

    def test_scope_gate_cannot_be_bypassed(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-00', self.source.read(path), flags=re.M)
        self.assertIn('task bypasses current baseline gate: GM-02', self.errors())

    def test_parallel_ancestor_is_rejected(self):
        path = 'tasks/backlog/GM-05.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-02', self.source.read(path), flags=re.M)
        self.assertIn('parallel tasks have dependency', self.errors())

    def test_parallel_same_owner_is_rejected(self):
        path = 'tasks/backlog/GM-09.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-12', self.source.read(path), flags=re.M)
        self.assertIn('parallel tasks share owner', self.errors())

    def test_unknown_parallel_task_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-99', self.source.read(path), flags=re.M)
        self.assertIn('unknown parallel task', self.errors())

    def test_missing_reverse_parallel_declaration_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with:', self.source.read(path), flags=re.M)
        self.assertIn('asymmetric parallel declaration', self.errors())

    def test_duplicate_dependency_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-01, GM-01', self.source.read(path), flags=re.M)
        self.assertIn('duplicate merge_dependencies', self.errors())

    def test_invalid_dependency_text_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-01 or optional', self.source.read(path), flags=re.M)
        self.assertIn('invalid merge_dependencies IDs', self.errors())

    def test_active_assignment_must_be_accepted(self):
        path = 'tasks/review/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('assignment_status: accepted', 'assignment_status: proposed')
        self.assertIn('active task without accepted assignment', self.errors())

    def test_core_cannot_depend_on_extension(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-01, GM-38', self.source.read(path), flags=re.M)
        self.assertIn('core blocked by extension', self.errors())

    def test_hidden_pr_template_is_in_inventory(self):
        self.assertIn('.github/pull_request_template.md', self.source.files)

    def test_missing_pr_template_is_rejected(self):
        self.source.files.remove('.github/pull_request_template.md')
        self.assertIn('missing required file: .github/pull_request_template.md', self.errors())

    def test_dependency_checkbox_cannot_drift_from_metadata(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = self.source.read(path).replace('- [ ] [GM-01]', '- [ ] [GM-00]')
        self.assertIn('dependency checklist differs from metadata', self.errors())

    def test_release_must_wait_for_all_core_tasks(self):
        path = 'tasks/backlog/GM-34.md'
        self.source.contents[path] = re.sub(r'^(start|merge)_dependencies:.*$', r'\1_dependencies: GM-01', self.source.read(path), flags=re.M)
        self.assertIn('release bypasses P0 tasks', self.errors())

    def set_status_in_memory(self, tid, status, approve=False):
        record = validator.task_records(self.source)[tid]
        old = record['path']
        new = f'tasks/{status}/{tid}.md'
        text = re.sub(r'^status:.*$', f'status: {status}', record['text'], flags=re.M)
        text = re.sub(r'^assignment_status:.*$', 'assignment_status: accepted', text, flags=re.M)
        if approve:
            deliver_in_memory(self.source, tid)
            text = text.replace('- [ ]', '- [x]')
            text += (f"\nReviewed-by: {record['meta']['reviewer']}\nReviewed-at: 2026-10-08\n"
                     'Decision: Approved\nReview-evidence: docs/evidence/GM-28/REPOSITORY_AUDIT.md\n')
        self.source.files.remove(old)
        self.source.files.add(new)
        self.source.contents.pop(old)
        self.source.contents[new] = text
        import task_readiness
        self.source.contents.update(task_readiness.task_link_updates(self.source))
        self.source.contents.update(task_readiness.render_documents(self.source))

    def test_in_progress_with_unfinished_merge_dependencies_is_valid(self):
        for tid in ('GM-01', 'GM-02', 'GM-03', 'GM-04'):
            self.set_status_in_memory(tid, 'done', approve=True)
        self.set_status_in_memory('GM-07', 'in-progress')
        self.assertEqual(self.errors(), '')

    def test_draft_review_with_merge_blockers_is_valid(self):
        for tid in ('GM-01', 'GM-02', 'GM-03', 'GM-04'):
            self.set_status_in_memory(tid, 'done', approve=True)
        self.set_status_in_memory('GM-07', 'review')
        self.assertEqual(self.errors(), '')

    def test_in_progress_still_requires_start_approval(self):
        self.set_status_in_memory('GM-20', 'in-progress')
        self.assertIn('active task with unreviewed dependency: GM-20 -> GM-15', self.errors())

    def test_done_cannot_skip_merge_dependencies(self):
        self.set_status_in_memory('GM-01', 'done', approve=True)
        self.set_status_in_memory('GM-20', 'done', approve=True)
        self.assertIn('active task with unreviewed dependency: GM-20 -> GM-19', self.errors())

    def test_parallel_merge_ancestor_is_allowed(self):
        records = validator.task_records(self.source)
        for tid, peer in (('GM-07', 'GM-06'), ('GM-06', 'GM-07')):
            path = records[tid]['path']
            self.source.contents[path] = re.sub(r'^parallel_with: (.*)$',
                lambda m: f'parallel_with: {m[1]}, {peer}', self.source.read(path), flags=re.M)
        self.assertIn('GM-06', records['GM-07']['meta']['merge_dependencies'])
        self.assertEqual(self.errors(), '')

    def test_missing_start_metadata_is_rejected(self):
        path = 'tasks/backlog/GM-20.md'
        self.source.contents[path] = re.sub(r'^start_dependencies:.*\n', '', self.source.read(path), flags=re.M)
        self.assertIn('missing start_dependencies', self.errors())

    def test_obsolete_field_is_rejected_outside_historical_baseline(self):
        path = 'tasks/backlog/GM-20.md'
        self.source.contents[path] = self.source.read(path).replace('merge_dependencies:', 'dependencies:')
        self.assertIn('obsolete dependencies field', self.errors())

    def test_unknown_start_dependency_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-99', self.source.read(path), flags=re.M)
        self.assertIn('unknown dependency: GM-02 -> GM-99', self.errors())

    def test_combined_start_merge_cycle_is_rejected(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-05', self.source.read(path), flags=re.M)
        self.assertIn('dependency cycle', self.errors())

    def test_merge_checklist_drift_is_rejected(self):
        path = 'tasks/backlog/GM-20.md'
        self.source.contents[path] = self.source.read(path).replace('- [ ] [GM-15]', '- [ ] [GM-00]')
        self.assertIn('merge dependency checklist differs from metadata', self.errors())

    def test_parallel_task_needs_explicit_scope_boundary(self):
        path = 'tasks/backlog/GM-20.md'
        self.source.contents[path] = self.source.read(path).replace('### Phần làm trước và phần chờ tích hợp', '### Missing boundary')
        self.assertIn('missing parallel scope boundary', self.errors())

    def test_start_dependency_cannot_point_to_a_later_number_even_without_cycle(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-03', self.source.read(path), flags=re.M)
        self.assertIn('dependency must have a smaller task ID: GM-02 -> GM-03', self.errors())

    def test_merge_dependency_cannot_point_to_a_later_number_even_without_cycle(self):
        path = self.source.task_path('GM-02')
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-03', self.source.read(path), flags=re.M)
        self.assertIn('dependency must have a smaller task ID: GM-02 -> GM-03', self.errors())

    def test_mapping_keeps_previous_identity_not_an_active_dependency(self):
        records = validator.task_records(self.source)
        self.assertEqual(records['GM-01']['meta']['previous_ids'], 'GM-01')
        self.assertEqual(records['GM-03']['meta']['start_dependencies'], 'GM-01')
        self.assertEqual(records['GM-35']['meta']['priority'], 'P1')
        for tid, record in records.items():
            for gate in ('start', 'merge'):
                for dep in validator.dependency_ids(record, gate):
                    self.assertLess(dep, tid)

    def test_current_id_mapping_must_be_unique(self):
        path = 'tasks/task-id-map.json'
        mapping = json.loads(self.source.read(path))
        mapping['entries'][1]['new_id'] = mapping['entries'][0]['new_id']
        self.source.contents[path] = json.dumps(mapping)
        self.assertIn('task ID mapping must declare each current task exactly once', self.errors())

    def test_previous_id_must_match_mapping(self):
        path = 'tasks/review/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('previous_ids: GM-01', 'previous_ids: GM-02')
        self.assertIn('task ID mapping mismatch: GM-01', self.errors())

    def test_missing_number_in_roadmap_is_rejected(self):
        self.source.files.remove('tasks/backlog/GM-04.md')
        self.assertIn('current task IDs must be contiguous from GM-01', self.errors())

    def test_invalid_mapping_json_is_rejected(self):
        self.source.contents['tasks/task-id-map.json'] = '{broken'
        self.assertIn('invalid task ID mapping JSON/schema', self.errors())

    def test_input_must_be_produced_by_declared_parent(self):
        path = 'tasks/task-id-map.json'
        mapping = json.loads(self.source.read(path))
        mapping['entries'][4]['inputs'][0]['artifact'] = 'missing/wrong-contract.md'
        self.source.contents[path] = json.dumps(mapping)
        self.assertIn('input artifact not produced by', self.errors())

    def test_input_gate_must_match_dependencies(self):
        path = 'tasks/task-id-map.json'
        mapping = json.loads(self.source.read(path))
        mapping['entries'][4]['inputs'][0]['gate'] = 'merge'
        self.source.contents[path] = json.dumps(mapping)
        self.assertIn('artifact input gates differ from dependencies', self.errors())

    def test_screen_cannot_skip_components_even_with_lower_ids(self):
        path = 'tasks/backlog/GM-09.md'
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-07', self.source.read(path), flags=re.M)
        self.assertIn('start gate missing foundation UI/components', self.errors())

    def test_mock_screen_must_not_wait_for_real_backend(self):
        path = 'tasks/backlog/GM-09.md'
        self.source.contents[path] = re.sub(r'^merge_dependencies:.*$', 'merge_dependencies: GM-05, GM-07, GM-16', self.source.read(path), flags=re.M)
        self.assertIn('mock UI screen must not wait for backend implementation', self.errors())

    def test_import_cannot_skip_database(self):
        path = 'tasks/backlog/GM-08.md'
        self.source.contents[path] = re.sub(r'^start_dependencies:.*$', 'start_dependencies: GM-04', self.source.read(path), flags=re.M)
        self.assertIn('start gate missing foundation DATA/database', self.errors())

    def test_previous_scope_must_not_disappear(self):
        path = 'tasks/task-id-map.json'
        mapping = json.loads(self.source.read(path))
        mapping['entries'][4]['previous_ids'] = []
        self.source.contents[path] = json.dumps(mapping)
        self.assertIn('previous task scope missing from roadmap mapping', self.errors())

    def test_done_needs_actual_handoff_file(self):
        self.set_status_in_memory('GM-01', 'done', approve=True)
        self.source.files.remove('docs/evidence/roadmap-v2/GM-01/HANDOFF.md')
        self.assertIn('missing delivered artifact', self.errors())

    def test_every_task_declares_runnable_output_checks(self):
        records = validator.task_records(self.source)
        for entry in validator.roadmap(self.source)['entries']:
            tid = entry['new_id']
            self.assertIn(f'docs/evidence/roadmap-v2/{tid}/CHECKS.md', entry['outputs'])
            self.assertIn('## Đầu ra chạy được và nghiệm thu', records[tid]['text'])
            for value in entry['verification'].values():
                self.assertIn(value, records[tid]['text'])

    def test_missing_verification_is_rejected(self):
        mapping = validator.roadmap(self.source)
        del mapping['entries'][1]['verification']
        self.source.contents['tasks/task-id-map.json'] = json.dumps(mapping)
        self.assertIn('missing runnable output verification', self.errors())

    def test_ui_cannot_claim_api_only_verification(self):
        mapping = validator.roadmap(self.source)
        mapping['entries'][8]['verification']['mode'] = 'api'
        self.source.contents['tasks/task-id-map.json'] = json.dumps(mapping)
        self.assertIn('verification mode does not match track/stage', self.errors())

    def test_missing_checks_output_is_rejected(self):
        mapping = validator.roadmap(self.source)
        mapping['entries'][3]['outputs'].remove('docs/evidence/roadmap-v2/GM-04/CHECKS.md')
        self.source.contents['tasks/task-id-map.json'] = json.dumps(mapping)
        self.assertIn('output checks artifact must be declared', self.errors())

    def test_api_requires_request_examples(self):
        mapping = validator.roadmap(self.source)
        mapping['entries'][18]['outputs'].remove('supabase/tests/http/GM-19.http')
        self.source.contents['tasks/task-id-map.json'] = json.dumps(mapping)
        self.assertIn('API request examples must be declared', self.errors())

    def test_verification_and_task_body_must_match(self):
        mapping = validator.roadmap(self.source)
        mapping['entries'][3]['verification']['expected'] = 'Changed output contract not in task'
        self.source.contents['tasks/task-id-map.json'] = json.dumps(mapping)
        self.assertIn('verification differs from task body', self.errors())

    def test_done_needs_actual_checks_file(self):
        self.set_status_in_memory('GM-01', 'done', approve=True)
        self.source.files.remove('docs/evidence/roadmap-v2/GM-01/CHECKS.md')
        self.assertIn('missing delivered artifact', self.errors())


if __name__ == "__main__":
    unittest.main()
