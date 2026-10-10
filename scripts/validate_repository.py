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
    'docs/architecture/decisions/ADR-006-parallel-start-ordered-merge.md',
    'docs/architecture/decisions/ADR-007-task-roadmap-numbering.md',
    'docs/project/TASK_RENUMBERING.md', 'tasks/task-id-map.json',
    'docs/project/IMPLEMENTATION_ROADMAP.md',
    'docs/project/TASK_HANDOFFS.md',
    'docs/architecture/decisions/ADR-009-foundation-first-task-slicing.md',
    'tasks/templates/HANDOFF_TEMPLATE.md',
    'tasks/archive/roadmap-v1/task-snapshot.json',
    'tasks/archive/roadmap-v1/task-id-map.json',
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


def dependency_ids(record: dict, gate: str) -> list[str]:
    """Only the immutable historical GM-00 supports the old field."""
    meta = record['meta']
    field = gate + '_dependencies'
    value = meta.get(field, meta.get('dependencies', '') if meta.get('id') == 'GM-00' else '')
    return re.findall(r'GM-\d{2}', value)


def roadmap(src: Source) -> dict:
    return json.loads(src.read('tasks/task-id-map.json'))


def delivery_errors(src: Source, record: dict) -> list[str]:
    """Presence only: reviewers still verify contents, tests and upstream commits."""
    meta = record['meta']
    if meta.get('numbering') != 'roadmap-v2':
        return []
    entry = next(e for e in roadmap(src)['entries'] if e['new_id'] == meta['id'])
    paths = entry['outputs'] + [f"docs/evidence/roadmap-v2/{meta['id']}/HANDOFF.md"]
    return [f'missing delivered artifact: {path}' for path in paths if path not in src.files]


def validate_roadmap(src: Source, records: dict) -> tuple[list[str], dict]:
    """Check scope migration and each input's producer, not just numeric edges."""
    errors = []
    try:
        mapping = roadmap(src)
        entries = mapping['entries']
        if mapping['version'] != 'roadmap-v2' or mapping['previous_version'] != 'roadmap-v1':
            raise ValueError('wrong roadmap version')
        if not isinstance(entries, list) or not entries:
            raise ValueError('empty roadmap')
        new_ids = [e['new_id'] for e in entries]
        if any(not isinstance(t, str) or not re.fullmatch(r'GM-\d{2}', t) for t in new_ids):
            raise ValueError('invalid current ID')
        if len(new_ids) != len(set(new_ids)):
            errors.append('task ID mapping must declare each current task exactly once')
        if set(new_ids) != set(records) - {'GM-00'}:
            errors.append('task ID mapping must cover every current task')
        by_id = {e['new_id']: e for e in entries}
        snapshot = json.loads(src.read(mapping['previous_snapshot']))
        if snapshot['version'] != 'roadmap-v1' or not isinstance(snapshot['tasks'], dict):
            raise ValueError('invalid previous snapshot')
        previous_ids = {Path(path).stem for path in snapshot['tasks']}
        covered = set()
        track_stages = {
            'PLAN': {'baseline'}, 'UI': {'structure', 'components', 'screens'},
            'DATA': {'fields', 'database', 'import'},
            'BE': {'structure', 'api-contract', 'implementation'},
            'INTEGRATION': {'native', 'integration'}, 'QA': {'regression', 'qa'},
            'RELEASE': {'release'}, 'EXTENSION': {'extension'},
        }

        def valid_path(path):
            return (isinstance(path, str) and bool(path) and ':' not in path
                    and '\\' not in path and not path.startswith('/')
                    and '..' not in path.split('/') and posixpath.normpath(path) == path)

        for entry in entries:
            tid = entry['new_id']
            if (not isinstance(entry['previous_ids'], list)
                    or any(p not in previous_ids for p in entry['previous_ids'])
                    or len(entry['previous_ids']) != len(set(entry['previous_ids']))):
                raise ValueError('invalid previous IDs')
            covered.update(entry['previous_ids'])
            if (entry['track'] not in track_stages
                    or entry['stage'] not in track_stages[entry['track']]):
                errors.append(f'{tid}: invalid track/stage')
            outputs = entry['outputs']
            if (not isinstance(outputs, list) or not outputs
                    or any(not valid_path(p) for p in outputs) or len(outputs) != len(set(outputs))):
                raise ValueError('invalid outputs')
            inputs = entry['inputs']
            if not isinstance(inputs, list) or not inputs:
                raise ValueError('missing inputs')
            record = records.get(tid)
            if not record:
                continue
            meta, text = record['meta'], record['text']
            if re.findall(r'GM-\d{2}', meta.get('previous_ids', '')) != entry['previous_ids']:
                errors.append(f'task ID mapping mismatch: {tid}')
            for field in ('title', 'track', 'stage'):
                if meta.get(field) != entry[field]:
                    errors.append(f'{tid}: roadmap {field} differs from task metadata')
            if meta.get('numbering') != 'roadmap-v2' or 'previous_id' in meta:
                errors.append(f'{tid}: missing roadmap-v2 numbering/previous_ids')
            if not meta.get('contract_version'):
                errors.append(f'{tid}: missing contract_version')
            if '## Đầu vào bắt buộc và đầu ra bàn giao' not in text:
                errors.append(f'{tid}: missing artifact handoff section')
            if any(f'`{p}`' not in text for p in outputs):
                errors.append(f'{tid}: output artifacts missing from task body')
            start = set(dependency_ids(record, 'start'))
            merge = set(dependency_ids(record, 'merge')) - start
            expected = {(dep, 'start') for dep in start} | {(dep, 'merge') for dep in merge}
            declared, unique = set(), set()
            for item in inputs:
                producer, artifact, gate = item['task'], item['artifact'], item['gate']
                if not isinstance(producer, str) or gate not in {'start', 'merge'} or not valid_path(artifact):
                    raise ValueError('invalid input')
                declared.add((producer, gate))
                key = (producer, artifact, gate)
                if key in unique:
                    errors.append(f'{tid}: duplicate input artifact')
                unique.add(key)
                producer_outputs = (by_id.get(producer, {}).get('outputs', [])
                                    if producer != 'GM-00' else
                                    ['docs/evidence/GM-00/BASELINE_V02_2026-10-07.md'])
                if artifact not in producer_outputs:
                    errors.append(f'{tid}: input artifact not produced by {producer}: {artifact}')
                label = 'Trước bắt đầu' if gate == 'start' else 'Trước nghiệm thu/merge'
                row = re.compile(r'^\| \[' + re.escape(producer) + r'\]\([^\n]+?\) \| `'
                                 + re.escape(artifact) + r'`[^\n]+\| ' + label + r' \|$', re.M)
                if not row.search(text):
                    errors.append(f'{tid}: input artifact table differs from roadmap: {producer}')
            if declared != expected:
                errors.append(f'{tid}: artifact input gates differ from dependencies')
        if covered != previous_ids:
            errors.append('previous task scope missing from roadmap mapping: ' + ', '.join(sorted(previous_ids - covered)))
        if mapping['release_task'] not in by_id or by_id[mapping['release_task']]['stage'] != 'release':
            errors.append('roadmap release_task must identify the release stage')
        return errors, mapping
    except (ValueError, KeyError, TypeError, AttributeError, OSError) as exc:
        return errors + [f'invalid task ID mapping JSON/schema: {exc}'], {}


class Source:
    def __init__(self, ref: str | None):
        self.ref = None
        self._git_contents = {}
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
        if self.ref:
            # A resolved commit is immutable; --all merge checks reuse its records.
            if path not in self._git_contents:
                self._git_contents[path] = self.git('show', f'{self.ref}:{path}')
            return self._git_contents[path]
        return (ROOT / path).read_text(encoding='utf-8-sig')

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
            for field in ('assignment_status', 'baseline', 'start_dependencies', 'merge_dependencies'):
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
            if 'dependencies' in meta:
                errors.append(f'{tid}: obsolete dependencies field; use start/merge_dependencies')
            for gate, heading in (('start', '### Trước bắt đầu'), ('merge', '### Trước merge')):
                if heading not in text:
                    errors.append(f'{tid}: missing {heading}')
                    continue
                section = re.split(r'\n#{2,3} ', text.split(heading, 1)[1], maxsplit=1)[0]
                checked_ids = re.findall(r'^- \[[ x]\] \[(GM-\d{2})\]', section, re.M)
                expected_ids = re.findall(r'GM-\d{2}', meta.get(gate + '_dependencies', ''))
                if sorted(checked_ids) != sorted(expected_ids):
                    errors.append(f'{tid}: {gate} dependency checklist differs from metadata')
            if '### Phần làm trước và phần chờ tích hợp' not in text:
                errors.append(f'{tid}: missing parallel scope boundary')
        for field in ('dependencies', 'start_dependencies', 'merge_dependencies', 'parallel_with'):
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
    records = task_records(src)
    numbered = sorted(tid for tid in tasks if tid != 'GM-00')
    if numbered != [f'GM-{n:02}' for n in range(1, len(numbered) + 1)]:
        errors.append('current task IDs must be contiguous from GM-01')
    mapping_errors, mapping = validate_roadmap(src, records)
    errors.extend(mapping_errors)
    start_graph = {tid: dependency_ids(r, 'start') for tid, r in records.items()}
    # Merge requires both sets; retaining start edges also prevents mixed-gate cycles.
    graph = {tid: sorted(set(start_graph[tid] + dependency_ids(r, 'merge'))) for tid, r in records.items()}
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
            if re.fullmatch(r'GM-\d{2}', tid) and dep >= tid:
                errors.append(f'dependency must have a smaller task ID: {tid} -> {dep}')
            if tasks[tid].get('priority') == 'P0' and tasks[dep].get('priority') in {'P1', 'P2'}:
                errors.append(f'core blocked by extension: {tid} -> {dep}')
            required_now = tasks[tid].get('status') == 'done' or (
                tasks[tid].get('status') in {'in-progress', 'review'} and dep in start_graph[tid])
            if required_now and approval_errors(src, records[dep]):
                errors.append(f'active task with unreviewed dependency: {tid} -> {dep}')
            visit(dep)
        active.remove(tid)
        seen.add(tid)
    for tid in tasks:
        visit(tid)

    def ancestors(tid, seen=None, edges=None):
        seen = set() if seen is None else seen
        edges = graph if edges is None else edges
        for dep in edges.get(tid, []):
            if dep not in seen:
                seen.add(dep)
                ancestors(dep, seen, edges)
        return seen

    for tid, meta in tasks.items():
        if tid not in {'GM-00', 'GM-01'} and 'GM-01' not in ancestors(tid, edges=start_graph):
            errors.append(f'task bypasses current baseline gate: {tid}')
        for peer in re.findall(r'GM-\d{2}', meta.get('parallel_with', '')):
            if peer not in tasks:
                errors.append(f'unknown parallel task: {tid} -> {peer}')
            elif peer == tid or peer in ancestors(tid, edges=start_graph) or tid in ancestors(peer, edges=start_graph):
                errors.append(f'parallel tasks have dependency: {tid} / {peer}')
            elif tasks[peer].get('owner') == meta.get('owner'):
                errors.append(f'parallel tasks share owner: {tid} / {peer}')
            elif tid not in re.findall(r'GM-\d{2}', tasks[peer].get('parallel_with', '')):
                errors.append(f'asymmetric parallel declaration: {tid} / {peer}')
    # A well-numbered graph can still allow a screen before its components exist.
    stage_requirements = {
        ('UI', 'components'): {('UI', 'structure'), ('DATA', 'fields')},
        ('UI', 'screens'): {('UI', 'structure'), ('UI', 'components'), ('BE', 'api-contract')},
        ('DATA', 'database'): {('DATA', 'fields'), ('BE', 'structure')},
        ('DATA', 'import'): {('DATA', 'database'), ('DATA', 'fields')},
        ('BE', 'api-contract'): {('UI', 'structure'), ('BE', 'structure'), ('DATA', 'fields')},
        ('BE', 'implementation'): {('BE', 'structure'), ('BE', 'api-contract')},
    }
    for tid, meta in tasks.items():
        stage = (meta.get('track'), meta.get('stage'))
        available = {(tasks[a].get('track'), tasks[a].get('stage'))
                     for a in ancestors(tid, edges=start_graph) if a in tasks}
        for required in sorted(stage_requirements.get(stage, set()) - available):
            errors.append(f'{tid}: start gate missing foundation {required[0]}/{required[1]}')
        if stage == ('UI', 'screens'):
            if any((tasks[a].get('track'), tasks[a].get('stage')) == ('BE', 'implementation')
                   for a in ancestors(tid) if a in tasks):
                errors.append(f'{tid}: mock UI screen must not wait for backend implementation')
        if mapping and not mapping_errors and meta.get('status') == 'done':
            errors.extend(f'{tid}: {reason}' for reason in delivery_errors(src, records[tid]))
    release_task = mapping.get('release_task')
    if release_task in tasks:
        required_core = {tid for tid, meta in tasks.items()
                         if meta.get('priority') == 'P0' and tid != release_task}
        missing_core = required_core - ancestors(release_task)
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
