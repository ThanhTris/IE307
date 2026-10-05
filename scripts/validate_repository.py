"""Validate the active Manabi document map and JSON fixtures without dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "AGENTS.md",
    "README.md",
    "frontend/README.md",
    "backend/README.md",
    "docs/project/REPOSITORY_STRUCTURE.md",
    "design/prototypes/manabi-vocabulary.html",
    "design/prototypes/UI-IMPLEMENTATION-NOTES.md",
    "docs/product/PRODUCT_REQUIREMENTS.md",
    "docs/product/FUNCTIONAL_REQUIREMENTS.md",
    "docs/product/NON_FUNCTIONAL_REQUIREMENTS.md",
    "docs/project/PROJECT_PLAN.md",
    "docs/project/TEAM_WORKFLOW.md",
    "docs/architecture/decisions/ADR-004-json-storage-and-database.md",
    "docs/specs/AI_QUIZ_SPEC.md",
    "docs/specs/IMAGE_CONTEXT_SPEC.md",
    "docs/specs/GAMES_SPEC.md",
    "docs/specs/SRS_SPEC.md",
)
LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def check_required() -> list[str]:
    return [f"missing required file: {path}" for path in REQUIRED if not (ROOT / path).is_file()]


def check_json() -> list[str]:
    errors: list[str] = []
    for path in sorted((*ROOT.glob("schemas/*.json"), *ROOT.glob("schemas/examples/*.json"))):
        try:
            json.loads(path.read_text(encoding="utf-8-sig"))
        except (UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"invalid JSON: {path.relative_to(ROOT)}: {exc}")
    return errors


def check_links() -> list[str]:
    errors: list[str] = []
    roots = tuple(ROOT / name for name in ("docs", "tasks", "frontend", "backend", "schemas", "design"))
    files = [ROOT / "README.md", ROOT / "AGENTS.md"]
    files.extend(path for folder in roots for path in folder.rglob("*.md"))
    for path in files:
        for match in LINK.finditer(path.read_text(encoding="utf-8-sig")):
            target = unquote(match.group(1).strip().split("#", 1)[0])
            if not target or target.startswith(("http://", "https://", "mailto:", "codex://")):
                continue
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            resolved = (path.parent / target).resolve()
            if not resolved.exists():
                errors.append(f"broken link: {path.relative_to(ROOT)} -> {target}")
    return errors


def check_task_plan() -> list[str]:
    errors: list[str] = []
    plan = ROOT / "tasks/backlog/MASTER_BACKLOG.md"
    team = ROOT / "docs/project/TEAM_AND_RESPONSIBILITIES.md"
    rows = [line.strip("| ").split(" | ") for line in plan.read_text(encoding="utf-8-sig").splitlines()
            if re.match(r"\| \d{3} \|", line)]
    if len(rows) != 36 or {row[0] for row in rows} != {f"{i:03}" for i in range(1, 37)}:
        errors.append("task plan must contain exactly 001..036")
    if any(len(row) != 7 for row in rows):
        return errors + ["invalid task plan columns"]
    members = {"Trí", "Trang", "Tâm", "Vinh", "Trung", "Tuấn"}
    graph = {row[0]: re.findall(r"\b\d{3}\b", row[5]) for row in rows}
    kinds = {row[0]: row[1] for row in rows}
    for row in rows:
        reviewers = set(row[3].split(" + "))
        if row[2] not in members or not reviewers <= members or row[2] in reviewers:
            errors.append(f"invalid owner/reviewer: {row[0]}")
        if row[1] in {"Core", "Core + Online", "Release"}:
            if any(kinds.get(dep) in {"Online", "Pilot"} for dep in graph[row[0]]):
                errors.append(f"core blocked by optional task: {row[0]}")
    visited, active = set(), set()
    def visit(task_id):
        if task_id not in graph:
            errors.append(f"unknown task dependency: {task_id}")
            return
        if task_id in active:
            errors.append(f"task dependency cycle: {task_id}")
            return
        if task_id in visited:
            return
        active.add(task_id)
        for dep in graph[task_id]:
            visit(dep)
        active.remove(task_id)
        visited.add(task_id)
    for task_id in graph:
        visit(task_id)
    summaries = {}
    for line in team.read_text(encoding="utf-8-sig").splitlines():
        cells = line.strip("| ").split(" | ")
        if cells[0] in members:
            summaries[cells[0]] = cells
    for member in members:
        owned = {row[0] for row in rows if row[2] == member}
        cells = summaries.get(member, [])
        if len(cells) != 4 or set(re.findall(r"\b\d{3}\b", cells[1])) != owned or cells[2] != str(len(owned)):
            errors.append(f"team summary differs from task plan: {member}")
    return errors


def main() -> int:
    errors = check_required() + check_json() + check_links() + check_task_plan()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("Manabi repository documents, JSON, local links and 36-task plan: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
