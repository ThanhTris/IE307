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
    for path in sorted((*ROOT.glob("schemas/*.json"), *ROOT.glob("data/examples/*.json"))):
        try:
            json.loads(path.read_text(encoding="utf-8-sig"))
        except (UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"invalid JSON: {path.relative_to(ROOT)}: {exc}")
    return errors


def check_links() -> list[str]:
    errors: list[str] = []
    roots = (ROOT / "docs", ROOT / "tasks")
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


def main() -> int:
    errors = check_required() + check_json() + check_links()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("Manabi repository documents, JSON and local links: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
