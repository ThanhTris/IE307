"""Validate the active Gi Cung Duoc baseline; no third-party dependency.

This checks documents and task metadata, not native execution or human approval.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import subprocess
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
)
LINK = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')


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
            for top in ('docs', 'tasks', 'mobile', 'supabase', 'design', 'tests', 'scripts'):
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
        if p.endswith('.md') and (p.startswith(('docs/', 'tasks/', 'mobile/', 'supabase/', 'design/', 'tests/')) or p in {'README.md', 'AGENTS.md', 'CONTRIBUTING.md'}):
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
        meta = dict(re.findall(r'^([a-z]+):[ \t]*([^\n]*)$', text.split('---', 2)[1], re.M))
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
            if not re.search(r'Reviewed-at:\s*\d{4}-\d{2}-\d{2}', text) or not re.search(r'Reviewed-by:\s*\S', text):
                errors.append(f'done without review evidence: {tid}')
    manifest = 'tasks/backlog/MASTER_BACKLOG.md'
    declared = re.findall(r'^\| \[(GM-\d{2})\]', src.read(manifest), re.M) if manifest in src.files else []
    if not declared or len(declared) != len(set(declared)):
        errors.append('master backlog must declare unique implementation task IDs')
    expected = {'GM-00', *declared}
    if set(tasks) != expected:
        errors.append(f'task/manifest mismatch: missing={sorted(expected-set(tasks))}; unexpected={sorted(set(tasks)-expected)}')
    graph = {tid: re.findall(r'GM-\d{2}', m.get('dependencies', '')) for tid, m in tasks.items()}
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
            if tasks[tid].get('status') in {'in-progress', 'review', 'done'} and tasks[dep].get('status') != 'done':
                errors.append(f'active task with unreviewed dependency: {tid} -> {dep}')
            visit(dep)
        active.remove(tid)
        seen.add(tid)
    for tid in tasks:
        visit(tid)

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
