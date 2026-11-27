#!/usr/bin/env python3
"""GM-65 operator tool: turn sanitized server error reports into GitHub issue drafts.

Defaults to dry-run preview. Passes nothing to GitHub unless --apply is explicitly specified.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ALLOWED_FIELDS = (
    "reportCode",
    "errorCode",
    "httpStatus",
    "screen",
    "action",
    "requestId",
    "appVersion",
    "platform",
    "osVersion",
    "occurredAt",
    "urgent",
    "status",
    "note",
)


def fetch_reports_from_supabase(url: str, service_role_key: str, only_new: bool) -> list[dict[str, Any]]:
    endpoint = f"{url.rstrip('/')}/rest/v1/rpc/gm65_admin_list_error_reports"
    body = json.dumps({"only_new": only_new}).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Supabase RPC HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase connection failed: {exc.reason}") from exc

    if not isinstance(raw, list):
        raise RuntimeError("Unexpected response shape from gm65_admin_list_error_reports")
    return [sanitize_report(item) for item in raw if isinstance(item, dict)]


def sanitize_report(item: dict[str, Any]) -> dict[str, Any]:
    return {field: item.get(field) for field in ALLOWED_FIELDS if field in item}


def format_issue(report: dict[str, Any]) -> tuple[str, str]:
    report_code = str(report.get("reportCode") or "GCD-UNKNOWN")
    error_code = str(report.get("errorCode") or "UNKNOWN_ERROR")
    screen = str(report.get("screen") or "unknown")
    urgent = bool(report.get("urgent"))
    prefix = "[URGENT][GM-65]" if urgent else "[GM-65]"
    title = f"{prefix} {report_code}: {error_code} on {screen}"

    note = str(report.get("note") or "").strip()
    lines = [
        f"## Error Report `{report_code}`",
        "",
        "| Field | Value |",
        "| --- | --- |",
        f"| Error code | `{error_code}` |",
        f"| HTTP status | `{report.get('httpStatus') if report.get('httpStatus') is not None else 'n/a'}` |",
        f"| Screen | `{screen}` |",
        f"| Action | `{report.get('action') or 'n/a'}` |",
        f"| Request ID | `{report.get('requestId') or 'n/a'}` |",
        f"| App version | `{report.get('appVersion') or 'n/a'}` |",
        f"| Platform | `{report.get('platform') or 'n/a'}` `{report.get('osVersion') or ''}` |".rstrip(),
        f"| Occurred at | `{report.get('occurredAt') or 'n/a'}` |",
        f"| Urgent | `{urgent}` |",
        "",
        "### User note (self-reported)",
        "",
        note if note else "_No additional note provided._",
        "",
        "---",
        "_Generated from sanitized `gm65_private.error_reports` export (ADR-030). No user tokens, emails, votes, room codes, or coordinates included._",
    ]
    return title, "\n".join(lines)


def create_github_issue(repo: str, title: str, body: str, labels: list[str]) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError(f"Invalid repository slug: {repo}")
    cmd = ["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body]
    for label in labels:
        cmd.extend(["--label", label])
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"gh issue create failed ({proc.returncode}): {proc.stderr.strip()}")
    return proc.stdout.strip()


def load_reports_from_file(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and isinstance(data.get("reports"), list):
        data = data["reports"]
    if not isinstance(data, list):
        raise RuntimeError("Input JSON must be a list of error report objects")
    return [sanitize_report(item) for item in data if isinstance(item, dict)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Preview or create GitHub issues from sanitized GM-65 error reports (defaults to dry-run)."
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", type=Path, help="Path to a JSON array exported from gm65_admin_list_error_reports.")
    source.add_argument("--supabase-url", help="Supabase API URL (reads SUPABASE_SERVICE_ROLE_KEY from env).")
    parser.add_argument("--only-new", action="store_true", default=True, help="Query only status='new' reports (default).")
    parser.add_argument("--all-statuses", action="store_true", help="Include non-new reports when querying Supabase.")
    parser.add_argument("--limit", type=int, default=20, help="Maximum reports to process (default: 20).")
    parser.add_argument("--repo", default="ThanhTris/IE307", help="Target GitHub repo for --apply.")
    parser.add_argument("--label", action="append", default=["bug"], help="Label(s) to apply with --apply.")
    parser.add_argument("--apply", action="store_true", help="Actually invoke `gh issue create`. Without this flag, dry-run only.")
    args = parser.parse_args(argv)

    if args.input:
        reports = load_reports_from_file(args.input)
    else:
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not service_key:
            print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required with --supabase-url.", file=sys.stderr)
            return 2
        reports = fetch_reports_from_supabase(args.supabase_url, service_key, only_new=not args.all_statuses)

    reports = reports[: max(0, args.limit)]
    if not reports:
        print("No matching GM-65 error reports found.")
        return 0

    mode_label = "APPLY" if args.apply else "DRY-RUN"
    print(f"[{mode_label}] Processing {len(reports)} report(s):")
    for idx, report in enumerate(reports, start=1):
        title, body = format_issue(report)
        if args.apply:
            url = create_github_issue(args.repo, title, body, args.label)
            print(f"{idx}. CREATED: {title} -> {url}")
        else:
            print(f"\n--- Preview {idx}/{len(reports)}: {title} ---")
            print(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
