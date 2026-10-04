"""Canonical report snapshot and source fingerprint, with no third-party imports."""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = (
    "deliverables/report/Manabi_Yeu_cau_va_dac_ta.docx",
    "deliverables/report/Manabi_Ke_hoach_va_du_lieu.docx",
    "deliverables/report/Manabi_Tien_do_cong_viec.docx",
    "docs/project/Phan_cong_du_an_Manabi.xlsx",
)
MANIFEST = "docs/project/generated-reports.json"
WORKBOOK_MANIFEST = "docs/project/workbook-source.json"
UPDATE_HEADINGS = (
    "Đã làm", "Còn lại", "Lỗi và blocker", "File đã thay đổi",
    "Kiểm thử và evidence", "Bước tiếp theo", "Quyết định reviewer",
)


def monitored(name: str) -> bool:
    if name in {"AGENTS.md", "README.md", "CONTRIBUTING.md"}:
        return True
    if name.startswith(("docs/", "tasks/")) and name.endswith(".md"):
        return True
    if name.startswith(("data/", "schemas/")) and name.endswith(".json"):
        return True
    if name.startswith(("apps/", "packages/", "services/", "supabase/", "scripts/", ".githooks/", "design/")):
        return not name.endswith((".png", ".jpg", ".pdf", ".pyc")) and "/__pycache__/" not in name
    return name in {"package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "tsconfig.json"}


def working_files(root: Path = ROOT) -> dict[str, bytes]:
    result = {}
    excluded = {".git", ".work", "archive", "outputs", "node_modules", "__pycache__"}
    for folder, dirs, names in os.walk(root):
        dirs[:] = [name for name in dirs if name not in excluded]
        for name in names:
            path = Path(folder) / name
            relative = path.relative_to(root).as_posix()
            if monitored(relative) or relative in (*REPORTS, MANIFEST, WORKBOOK_MANIFEST):
                result[relative] = path.read_bytes()
    return result


def tree_files(ref: str, root: Path = ROOT) -> dict[str, bytes]:
    listing = subprocess.check_output(["git", "ls-tree", "-r", "-z", ref], cwd=root)
    records = []
    for item in listing.split(b"\0"):
        if not item:
            continue
        meta, raw_name = item.split(b"\t", 1)
        name = raw_name.decode("utf-8")
        if monitored(name) or name in (*REPORTS, MANIFEST, WORKBOOK_MANIFEST):
            records.append((name, meta.split()[2]))
    proc = subprocess.run(["git", "cat-file", "--batch"], cwd=root,
                          input=b"".join(oid + b"\n" for _, oid in records), capture_output=True, check=True)
    offset, result = 0, {}
    for name, _ in records:
        end = proc.stdout.index(b"\n", offset)
        size = int(proc.stdout[offset:end].split()[-1])
        offset = end + 1
        result[name] = proc.stdout[offset:offset + size]
        offset += size + 1
    return result


def fingerprint(files: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    for name, value in sorted(files.items()):
        if monitored(name):
            digest.update(name.encode("utf-8") + b"\0" + value.replace(b"\r\n", b"\n") + b"\0")
    return digest.hexdigest()


def text(files: dict[str, bytes], name: str) -> str:
    return files[name].decode("utf-8-sig")


def clean(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", value)
    return value.replace("**", "").replace("`", "").strip()


def section(body: str, heading: str) -> str:
    found = re.search(rf"^### {re.escape(heading)}\s*\n(.*?)(?=^#|\Z)", body, re.M | re.S)
    return clean(found.group(1).strip()) if found else ""


def snapshot(files: dict[str, bytes]) -> tuple[dict, list[str]]:
    registry = json.loads(text(files, "data/project-tasks.json"))
    task_files = {}
    errors = []
    for name in sorted(files):
        if not name.startswith("tasks/") or not name.endswith(".md") or "/templates/" in name:
            continue
        body = text(files, name)
        match = re.match(r"# (MANABI-\d{3})\b", body)
        if match:
            task_id = match.group(1)
            if task_id in task_files:
                errors.append(f"duplicate task {task_id}")
            task_files[task_id] = (name, body)
    tasks = []
    for planned in registry["tasks"]:
        item = dict(planned)
        if item["id"] not in task_files:
            errors.append(f"missing task {item['id']}")
            continue
        name, body = task_files[item["id"]]
        status = re.search(r"^- Trạng thái: (\S+)", body, re.M)
        item.update(file=name, status=status.group(1) if status else "missing",
                    updates={h: section(body, h) for h in UPDATE_HEADINGS})
        for field in ("owner", "reviewer"):
            label = "Owner" if field == "owner" else "Reviewer"
            actual = re.search(rf"^- {label}: (.+)$", body, re.M)
            if not actual or actual.group(1).strip() != item[field]:
                errors.append(f"{item['id']} {field} mismatch")
        tasks.append(item)
    rebaseline = None
    if "MANABI-001" in task_files:
        name, body = task_files["MANABI-001"]
        status = re.search(r"^- Trạng thái: (\S+)", body, re.M)
        rebaseline = {"id": "MANABI-001", "file": name, "status": status.group(1) if status else "missing",
                      "owner": re.search(r"^- Owner: (.+)$", body, re.M).group(1),
                      "reviewer": re.search(r"^- Reviewer: (.+)$", body, re.M).group(1),
                      "updates": {h: section(body, h) for h in UPDATE_HEADINGS}}
    return {**registry, "tasks": tasks, "rebaseline": rebaseline, "sourceFingerprint": fingerprint(files)}, errors
