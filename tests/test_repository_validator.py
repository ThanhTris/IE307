"""Negative checks for task/requirement manifests, not native feature tests."""
from pathlib import Path
import importlib.util
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "repository_validator", ROOT / "scripts" / "validate_repository.py"
)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class MemorySource:
    def __init__(self):
        source = validator.Source(None)
        self.files = set(source.files)
        self.contents = {
            path: source.read(path)
            for path in self.files
            if path.endswith((".md", ".json"))
        }

    def read(self, path):
        return self.contents[path]

    def exists(self, path):
        return path in self.files or any(
            item.startswith(path.rstrip("/") + "/") for item in self.files
        )


class ManifestValidationTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource()

    def errors(self):
        return "\n".join(validator.validate(self.source))

    def test_current_baseline(self):
        self.assertEqual(self.errors(), "")

    def test_declared_task_missing_is_rejected(self):
        self.source.files.remove("tasks/backlog/GM-25.md")
        self.assertIn("task/manifest mismatch", self.errors())

    def test_duplicate_task_manifest_is_rejected(self):
        path = "tasks/backlog/MASTER_BACKLOG.md"
        self.source.contents[path] += "\n| [GM-25](GM-25.md) | duplicate |\n"
        self.assertIn("unique implementation task IDs", self.errors())

    def test_dependency_cycle_is_rejected(self):
        path = "tasks/backlog/GM-01.md"
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-01', self.source.read(path), flags=re.M)
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
        # GM-28 is review; its GM-00 dependency must be approved, not just in done/.
        path = 'tasks/done/GM-00.md'
        self.source.contents[path] = re.sub(r'^Decision:.*$', 'Decision: Changes requested', self.source.read(path), flags=re.M)
        self.assertIn('active task with unreviewed dependency: GM-28 -> GM-00', self.errors())

    def test_scope_gate_cannot_be_bypassed(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-00', self.source.read(path), flags=re.M)
        self.assertIn('task bypasses current baseline gate: GM-01', self.errors())

    def test_parallel_ancestor_is_rejected(self):
        path = 'tasks/backlog/GM-02.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-01', self.source.read(path), flags=re.M)
        self.assertIn('parallel tasks have dependency', self.errors())

    def test_parallel_same_owner_is_rejected(self):
        path = 'tasks/backlog/GM-11.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-27', self.source.read(path), flags=re.M)
        self.assertIn('parallel tasks share owner', self.errors())

    def test_unknown_parallel_task_is_rejected(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with: GM-99', self.source.read(path), flags=re.M)
        self.assertIn('unknown parallel task', self.errors())

    def test_missing_reverse_parallel_declaration_is_rejected(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^parallel_with:.*$', 'parallel_with:', self.source.read(path), flags=re.M)
        self.assertIn('asymmetric parallel declaration', self.errors())

    def test_duplicate_dependency_is_rejected(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-28, GM-28', self.source.read(path), flags=re.M)
        self.assertIn('duplicate dependencies', self.errors())

    def test_invalid_dependency_text_is_rejected(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-28 or optional', self.source.read(path), flags=re.M)
        self.assertIn('invalid dependencies IDs', self.errors())

    def test_active_assignment_must_be_accepted(self):
        path = 'tasks/review/GM-28.md'
        self.source.contents[path] = self.source.read(path).replace('assignment_status: accepted', 'assignment_status: proposed')
        self.assertIn('active task without accepted assignment', self.errors())

    def test_core_cannot_depend_on_extension(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-28, GM-31', self.source.read(path), flags=re.M)
        self.assertIn('core blocked by extension', self.errors())

    def test_hidden_pr_template_is_in_inventory(self):
        self.assertIn('.github/pull_request_template.md', self.source.files)

    def test_missing_pr_template_is_rejected(self):
        self.source.files.remove('.github/pull_request_template.md')
        self.assertIn('missing required file: .github/pull_request_template.md', self.errors())

    def test_dependency_checkbox_cannot_drift_from_metadata(self):
        path = 'tasks/backlog/GM-01.md'
        self.source.contents[path] = self.source.read(path).replace('- [ ] [GM-28]', '- [ ] [GM-00]')
        self.assertIn('dependency checklist differs from metadata', self.errors())

    def test_release_must_wait_for_all_core_tasks(self):
        path = 'tasks/backlog/GM-22.md'
        self.source.contents[path] = re.sub(r'^dependencies:.*$', 'dependencies: GM-28', self.source.read(path), flags=re.M)
        self.assertIn('release bypasses P0 tasks', self.errors())


if __name__ == "__main__":
    unittest.main()
