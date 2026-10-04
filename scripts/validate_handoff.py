"""Check task reporting and freshness in the working tree or a pushed Git tree."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter

from manabi_report_data import MANIFEST, REPORTS, UPDATE_HEADINGS, WORKBOOK_MANIFEST, fingerprint, snapshot, tree_files, working_files


def check(files: dict[str, bytes], require_reports: bool = True) -> list[str]:
    data, errors = snapshot(files)
    tasks = data["tasks"]
    expected = {f"MANABI-{i:03d}" for i in range(2, 38)}
    if {t["id"] for t in tasks} != expected or len(tasks) != 36:
        errors.append("expected exactly MANABI-002..037")
    mapping = {t["id"]: t for t in tasks}
    report_tasks = tasks + ([data["rebaseline"]] if data["rebaseline"] else [])
    for member in data["members"]:
        name = member["name"]
        owned = [t for t in tasks if t["owner"] == name]
        reviewed = [t for t in tasks if t["reviewer"] == name]
        if (len(owned), sum(t["points"] for t in owned), len(reviewed)) != (6, 32, 6):
            errors.append(f"unequal planned load: {name}")
    seen, visiting = set(), set()
    def visit(task_id):
        if task_id == "MANABI-001" or task_id in seen:
            return
        if task_id in visiting:
            errors.append(f"dependency cycle at {task_id}")
            return
        if task_id not in mapping:
            errors.append(f"unknown dependency {task_id}")
            return
        visiting.add(task_id)
        for dep in mapping[task_id]["deps"]:
            visit(dep)
        visiting.remove(task_id)
        seen.add(task_id)
    for task in report_tasks:
        if task["id"] != "MANABI-001":
            visit(task["id"])
        if task["owner"] == task["reviewer"]:
            errors.append(f"self review: {task['id']}")
        status = task["status"]
        folder = task["file"].split("/")[1]
        if status not in {"backlog", "in-progress", "blocked", "review", "done"}:
            errors.append(f"invalid task status: {task['id']}")
        elif folder != ("in-progress" if status == "blocked" else status):
            errors.append(f"status/folder mismatch: {task['id']}")
        for heading in UPDATE_HEADINGS:
            if not task["updates"][heading]:
                errors.append(f"missing update {task['id']}: {heading}")
        decision = task["updates"]["Quyết định reviewer"]
        if status == "done":
            approved = re.search(r"chấp thuận|approved|duyệt đạt", decision, re.I)
            dated = re.search(r"\b\d{4}-\d{2}-\d{2}\b", decision)
            refused = re.search(r"không.{0,30}(?:duyệt|chấp thuận)|chưa.{0,30}(?:duyệt|chấp thuận)|rejected|từ chối", decision, re.I)
            if not approved or not dated or refused:
                errors.append(f"done without dated approval: {task['id']}")
        for spec in task.get("specs", []):
            if spec not in files:
                errors.append(f"missing linked spec: {task['id']} {spec}")
    covered_fr = {r for t in tasks for r in t["requirements"]}
    covered_nfr = {r for t in tasks for r in t["nfr"]}
    if not {f"FR-{i:02d}" for i in range(1, 19)} <= covered_fr:
        errors.append("FR coverage incomplete")
    if not {f"NFR-{i:02d}" for i in range(1, 13)} <= covered_nfr:
        errors.append("NFR coverage incomplete")
    if require_reports:
        if WORKBOOK_MANIFEST not in files:
            errors.append("missing workbook-source.json; regenerate workbook")
        else:
            workbook_meta = json.loads(files[WORKBOOK_MANIFEST].decode("utf-8"))
            task_source = {name: files[name] for name in ["data/project-tasks.json", *(t["file"] for t in tasks)]}
            if workbook_meta.get("sourceFingerprint") != fingerprint(task_source):
                errors.append("workbook stale for task sources; regenerate workbook before DOCX")
            if REPORTS[3] in files and workbook_meta.get("artifactSha256") != hashlib.sha256(files[REPORTS[3]]).hexdigest():
                errors.append("workbook sidecar hash mismatch")
        if MANIFEST not in files:
            errors.append("missing generated-reports.json; regenerate DOCX")
        else:
            manifest = json.loads(files[MANIFEST].decode("utf-8"))
            if manifest.get("sourceFingerprint") != fingerprint(files):
                errors.append("reports stale for this source snapshot; regenerate DOCX after all source changes")
            for name in REPORTS:
                if name not in files:
                    errors.append(f"missing report {name}")
                elif manifest.get("artifacts", {}).get(name) != hashlib.sha256(files[name]).hexdigest():
                    errors.append(f"report hash mismatch: {name}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--git-tree", help="Check committed snapshot instead of working tree")
    parser.add_argument("--source-only", action="store_true")
    args = parser.parse_args()
    files = tree_files(args.git_tree) if args.git_tree else working_files()
    errors = check(files, not args.source_only)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    statuses = Counter(t["status"] for t in snapshot(files)[0]["tasks"])
    print(f"Manabi handoff OK: 36 tasks; equal planned load; DAG; FR/NFR; statuses {dict(statuses)}; "
          + ("source only" if args.source_only else "report fingerprint/hashes"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
