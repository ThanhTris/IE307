"""Negative checks for task/requirement manifests, not native feature tests."""
from pathlib import Path
import importlib.util
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
        self.source.contents[path] = self.source.read(path).replace(
            "dependencies: GM-00", "dependencies: GM-01"
        )
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


if __name__ == "__main__":
    unittest.main()
