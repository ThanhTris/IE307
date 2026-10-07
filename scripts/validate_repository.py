"""Validate the active Gi Cung Duoc baseline; no third-party dependency.

This checks documents and task metadata, not native execution or human approval.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import subprocess
from datetime import date
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    'README.md', 'AGENTS.md', 'mobile/README.md', 'supabase/README.md',
    'docs/product/PRODUCT_REQUIREMENTS.md', 'docs/product/FUNCTIONAL_REQUIREMENTS.md',
    'docs/product/NON_FUNCTIONAL_REQUIREMENTS.md', 'docs/project/MIGRATION_PLAN.md',
    'docs/project/PROJECT_PLAN.md', 'docs/project/TEAM_WORKFLOW.md',
    'docs/project/REPOSITORY_STRUCTURE.md', 'docs/project/TEAM_AND_RESPONSIBILITIES.md',
    'docs/specs/ROOM_SPEC.md', 'docs/specs/DECISION_SPEC.md', 'docs/specs/UI_SPEC.md',
    'docs/specs/IDENTITY_PRIVACY_SPEC.md', 'docs/specs/TRACEABILITY.md',
    'docs/architecture/API_CONTRACT.md', 'docs/architecture/DATA_MODEL.md',
    'docs/architecture/decisions/ADR-001-stack.md', 'docs/testing/TEST_PLAN.md',
    'docs/product/SYSTEM_OVERVIEW.md', 'docs/specs/OFFLINE_SYNC_SPEC.md',
    'docs/specs/NOTIFICATIONS_LINKS_SPEC.md', 'docs/specs/CONTEXT_HISTORY_SPEC.md',
    'design/DESIGN_SYSTEM.md', 'design/prototypes/gi-cung-duoc.html',
    'tasks/backlog/MASTER_BACKLOG.md', 'tasks/templates/TASK_TEMPLATE.md',
    'tests/fixtures/decision-cases.json',
    'docs/specs/FOOD_DATA_SPEC.md', 'docs/project/TASK_DEPENDENCIES.md',
    'scripts/task_readiness.py', 'tasks/templates/REVIEW_TEMPLATE.md',
    '.github/pull_request_template.md', '.github/ISSUE_TEMPLATE/task.yml',
)
LINK = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')


def task_records(src: Source) -> dict:
    """Read scalar task metadata; this is deliberately not a general YAML parser."""
    records = {}
    for path in sorted(src.files):
        if not re.fullmatch(r'tasks/(backlog|in-progress|review|done)/GM-\d{2}\.md', path):
            continue
        text = src.read(path)
        if text.startswith('---\n') and '\n---\n' in text[4:]:
            meta = dict(re.findall(r'^([a-z_]+):[ \t]*([^\n]*)$', text.split('---', 2)[1], re.M))
            records[meta.get('id', '')] = {'meta': meta, 'text': text, 'path': path}
    return records


def approval_errors(src: Source, record: dict) -> list[str]:
    """Check recorded independent approval, not whether a human really reviewed."""
    meta, text = record['meta'], record['text']
    errors = []
    fields = dict(re.findall(r'^(Reviewed-by|Reviewed-at|Decision|Review-evidence):[ \t]*([^\n]+)$', text, re.M))
    if meta.get('status') != 'done':
        errors.append('status is not done')
    if not fields.get('Reviewed-by') or fields.get('Reviewed-by') != meta.get('reviewer') or fields.get('Reviewed-by') == meta.get('owner'):
        errors.append('independent reviewer mismatch')
    try:
        value = fields.get('Reviewed-at', '')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            raise ValueError(value)
        date.fromisoformat(value)
    except ValueError:
        errors.append('invalid review date')
    if not re.fullmatch(r'Approved(?:\s+[—-]\s+.*)?', fields.get('Decision', '')):
        errors.append('Decision is not Approved')
    if fields.get('Review-evidence') not in src.files:
        errors.append('missing review evidence file')
    if '- [ ]' in text:
        errors.append('unchecked criteria in done task')
    return errors


class Source:
    def __init__(self, ref: str | None):
        self.ref = None
        if ref:
            if ref.startswith('-'):
                raise ValueError('invalid git ref')
            self.ref = self.git('rev-parse', '--verify', ref + '^{commit}').strip()
            self.files = set(self.git('ls-tree', '-r', '--name-only', self.ref).splitlines())
        else:
            # Scan only project sources, never dependencies/builds or .git metadata.
            self.files = set()
            for top in ('docs', 'tasks', 'mobile', 'supabase', 'design', 'tests', 'scripts', '.github', '.githooks'):
                folder = ROOT / top
                if folder.exists():
                    import os
                    for base, dirs, files in os.walk(folder):
                        dirs[:] = [d for d in dirs if d not in {'node_modules', '.git', '.expo', 'build', 'dist', '__pycache__'}]
                        self.files.update((Path(base) / f).relative_to(ROOT).as_posix() for f in files)
            self.files.update(p.name for p in ROOT.iterdir() if p.is_file())

    @staticmethod
    def git(*args: str) -> str:
        return subprocess.check_output(['git', *args], cwd=ROOT, encoding='utf-8')

    def read(self, path: str) -> str:
        return self.git('show', f'{self.ref}:{path}') if self.ref else (ROOT / path).read_text(encoding='utf-8-sig')

    def exists(self, path: str) -> bool:
        return path in self.files or any(p.startswith(path.rstrip('/') + '/') for p in self.files)


def validate(src: Source) -> list[str]:
    errors = [f'missing required file: {p}' for p in REQUIRED if p not in src.files]
    if any(p.startswith('legacy/') for p in src.files):
        errors.append('legacy archive directory must be absent after requested deletion')
    for p in sorted(src.files):
        if p.startswith('legacy/'):
            continue
        if p.endswith('.md') and (p.startswith(('docs/', 'tasks/', 'mobile/', 'supabase/', 'design/', 'tests/', '.github/')) or p in {'README.md', 'AGENTS.md', 'CONTRIBUTING.md'}):
            for match in LINK.finditer(src.read(p)):
                target = unquote(match.group(1).strip().strip('<>').split('#')[0])
                if not target or re.match(r'^[a-z]+:', target):
                    continue
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(p), target))
                if not src.exists(resolved):
                    errors.append(f'broken link: {p} -> {target}')
        if p.endswith('.json') and p.startswith('tests/fixtures/'):
            try:
                json.loads(src.read(p))
            except json.JSONDecodeError as exc:
                errors.append(f'invalid JSON {p}: {exc}')

    tasks = {}
    for p in sorted(src.files):
        if not re.match(r'tasks/(backlog|in-progress|review|done)/GM-\d{2}\.md$', p):
            continue
        text = src.read(p)
        if not text.startswith('---\n') or '\n---\n' not in text[4:]:
            errors.append(f'missing frontmatter: {p}')
            continue
        meta = dict(re.findall(r'^([a-z_]+):[ \t]*([^\n]*)$', text.split('---', 2)[1], re.M))
        tid = meta.get('id', '')
        if tid in tasks:
            errors.append(f'duplicate task: {tid}')
        tasks[tid] = meta
        for field in ('id', 'title', 'status', 'owner', 'reviewer', 'priority', 'size', 'spec'):
            if not meta.get(field):
                errors.append(f'{p}: missing {field}')
        if posixpath.basename(p) != tid + '.md' or meta.get('status') != p.split('/')[1]:
            errors.append(f'task path/status mismatch: {p}')
        if meta.get('owner') == meta.get('reviewer'):
            errors.append(f'owner reviews own task: {tid}')
        if meta.get('spec') not in src.files:
            errors.append(f'missing linked spec: {tid}')
        if '- [ ]' not in text and '- [x]' not in text:
            errors.append(f'missing AC: {tid}')
        if '## Test plan' not in text and 'Patch/test plan' not in text:
            errors.append(f'missing test plan: {tid}')
        if meta.get('status') == 'done':
            for reason in approval_errors(src, {'meta': meta, 'text': text, 'path': p}):
                errors.append(f'done without valid approval: {tid}: {reason}')
        if tid != 'GM-00':
            for field in ('assignment_status', 'baseline'):
                if not meta.get(field):
                    errors.append(f'{tid}: missing {field}')
            if meta.get('assignment_status') not in {'proposed', 'accepted'}:
                errors.append(f'{tid}: invalid assignment_status')
            if meta.get('status') in {'in-progress', 'review', 'done'} and meta.get('assignment_status') != 'accepted':
                errors.append(f'active task without accepted assignment: {tid}')
            for heading in ('## Dependency gate', '## Song song và bàn giao'):
                if heading not in text:
                    errors.append(f'{tid}: missing {heading}')
            if meta.get('baseline') != 'food-v1':
                errors.append(f'{tid}: wrong current baseline')
            if '## Dependency gate' in text:
                section = text.split('## Dependency gate', 1)[1].split('\n## ', 1)[0]
                checked_ids = re.findall(r'^- \[[ x]\] \[(GM-\d{2})\]', section, re.M)
                expected_ids = re.findall(r'GM-\d{2}', meta.get('dependencies', ''))
                if sorted(checked_ids) != sorted(expected_ids):
                    errors.append(f'{tid}: dependency checklist differs from metadata')
        for field in ('dependencies', 'parallel_with'):
            value = meta.get(field, '').strip()
            ids = re.findall(r'GM-\d{2}', value)
            if value and not re.fullmatch(r'GM-\d{2}(?:,\s*GM-\d{2})*', value):
                errors.append(f'{tid}: invalid {field} IDs')
            if len(ids) != len(set(ids)):
                errors.append(f'{tid}: duplicate {field}')
    manifest = 'tasks/backlog/MASTER_BACKLOG.md'
    declared = re.findall(r'^\| \[(GM-\d{2})\]', src.read(manifest), re.M) if manifest in src.files else []
    if not declared or len(declared) != len(set(declared)):
        errors.append('master backlog must declare unique implementation task IDs')
    expected = {'GM-00', *declared}
    if set(tasks) != expected:
        errors.append(f'task/manifest mismatch: missing={sorted(expected-set(tasks))}; unexpected={sorted(set(tasks)-expected)}')
    graph = {tid: re.findall(r'GM-\d{2}', m.get('dependencies', '')) for tid, m in tasks.items()}
    records = task_records(src)
    active, seen = set(), set()

    def visit(tid):
        if tid in active:
            errors.append(f'dependency cycle: {tid}')
            return
        if tid in seen:
            return
        active.add(tid)
        for dep in graph.get(tid, []):
            if dep not in tasks:
                errors.append(f'unknown dependency: {tid} -> {dep}')
                continue
            if tasks[tid].get('priority') == 'P0' and tasks[dep].get('priority') in {'P1', 'P2'}:
                errors.append(f'core blocked by extension: {tid} -> {dep}')
            if tasks[tid].get('status') in {'in-progress', 'review', 'done'} and approval_errors(src, records[dep]):
                errors.append(f'active task with unreviewed dependency: {tid} -> {dep}')
            visit(dep)
        active.remove(tid)
        seen.add(tid)
    for tid in tasks:
        visit(tid)

    def ancestors(tid, seen=None):
        seen = set() if seen is None else seen
        for dep in graph.get(tid, []):
            if dep not in seen:
                seen.add(dep)
                ancestors(dep, seen)
        return seen

    for tid, meta in tasks.items():
        if tid not in {'GM-00', 'GM-28'} and 'GM-28' not in ancestors(tid):
            errors.append(f'task bypasses current baseline gate: {tid}')
        for peer in re.findall(r'GM-\d{2}', meta.get('parallel_with', '')):
            if peer not in tasks:
                errors.append(f'unknown parallel task: {tid} -> {peer}')
            elif peer == tid or peer in ancestors(tid) or tid in ancestors(peer):
                errors.append(f'parallel tasks have dependency: {tid} / {peer}')
            elif tasks[peer].get('owner') == meta.get('owner'):
                errors.append(f'parallel tasks share owner: {tid} / {peer}')
            elif tid not in re.findall(r'GM-\d{2}', tasks[peer].get('parallel_with', '')):
                errors.append(f'asymmetric parallel declaration: {tid} / {peer}')
    if 'GM-22' in tasks:
        required_core = {tid for tid, meta in tasks.items()
                         if meta.get('priority') == 'P0' and tid != 'GM-22'}
        missing_core = required_core - ancestors('GM-22')
        if missing_core:
            errors.append('release bypasses P0 tasks: ' + ', '.join(sorted(missing_core)))

    teamfile = 'docs/project/TEAM_AND_RESPONSIBILITIES.md'
    if teamfile in src.files:
        team = src.read(teamfile)
        for member in ('Trí', 'Trang', 'Tâm', 'Vinh', 'Trung', 'Tuấn'):
            row = next((r for r in team.splitlines() if r.startswith('| '+member+' |')), '')
            listed = set(re.findall(r'GM-\d{2}', row))
            owned = {tid for tid,m in tasks.items() if m.get('owner') == member}
            if listed != owned:
                errors.append(f'team ownership mismatch: {member}')
    tracefile = 'docs/specs/TRACEABILITY.md'
    if tracefile in src.files:
        trace = src.read(tracefile)
        requirements = src.read('docs/product/FUNCTIONAL_REQUIREMENTS.md')
        required_ids = re.findall(r'^\| (FR-\d{2}) \|', requirements, re.M)
        traced_ids = re.findall(r'^\| (FR-\d{2}) \|', trace, re.M)
        if not required_ids or len(required_ids) != len(set(required_ids)):
            errors.append('functional requirements must declare unique FR IDs')
        if set(traced_ids) != set(required_ids) or len(traced_ids) != len(set(traced_ids)):
            errors.append('traceability must cover each current FR exactly once')
        for task_id in set(re.findall(r'GM-\d{2}', trace)):
            if task_id not in tasks:
                errors.append(f'unknown task in traceability: {task_id}')
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--git-tree', help='Validate committed snapshot rather than working files')
    args = parser.parse_args()
    try:
        errors = validate(Source(args.git_tree))
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f'Validation failed: {exc}')
        return 1
    for error in errors:
        print(error)
    if errors:
        return 1
    print('Gi Cung Duoc: documents, links, JSON, task manifest, dependencies and current FR traceability OK.')
    print('Scope: documentation validation only; no native build/backend execution or human approval verified.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
