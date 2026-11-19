#!/usr/bin/env python3
"""Test-case suite tooling (GM-55).

Source of truth: docs/testing/REQUIREMENTS.md (requirement table), docs/testing/cases/*.json (test cases)
and docs/testing/results/*.json (executed results). Everything else is generated.

  python scripts/test_cases.py --check            validate cases, requirements, links to automated tests
  python scripts/test_cases.py --write            regenerate TEST_CASES.md, TRACEABILITY.md, TEST_REPORT.md
  python scripts/test_cases.py --check-docs       fail when generated files are stale
  python scripts/test_cases.py --xlsx FILE        export an Excel workbook (standard library only)
  python scripts/test_cases.py --import-jest JSON --run-id ID --commit SHA     record automated Jest results
  python scripts/test_cases.py --import-unittest LOG --run-id ID --commit SHA  record automated unittest results

No network, no dependencies, never changes product code or Project status.
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
TESTING = Path('docs/testing')

MODULES = {  # code -> (file, title)
    'AUTH': ('auth', 'Tài khoản và phiên'),
    'ENTRY': ('entry', 'Khởi động, hướng dẫn và quyền'),
    'ROOM': ('room', 'Phòng, lobby và tham gia'),
    'PREF': ('preferences', 'Khẩu vị và bộ lọc'),
    'VOTE1': ('vote_round1', 'Bình chọn vòng 1 và chờ kết quả'),
    'VOTE2': ('vote_round2', 'Bình chọn vòng 2'),
    'RES': ('result', 'Kết quả, Top 3 và Places'),
    'SOC': ('social', 'Bạn bè, lời mời và hộp thư'),
    'HIS': ('history', 'Lịch sử và đồng ý lưu'),
    'RT': ('realtime', 'Realtime, phục hồi và ngoại tuyến'),
    'SEC': ('security', 'Bảo mật và quyền riêng tư'),
    'DATA': ('data', 'Dữ liệu món ăn'),
    'UI': ('ui_accessibility', 'Giao diện và trợ năng'),
    'REL': ('release', 'Phát hành và nâng cấp'),
    'IOS': ('ios', 'iOS'),
}
PRIORITIES = {'P0', 'P1', 'P2'}
TYPES = {'functional', 'negative', 'boundary', 'security', 'privacy', 'accessibility', 'compatibility', 'resilience'}
LEVELS = {'unit', 'component', 'sql', 'api', 'e2e'}
ENVS = {'ci', 'qa-local', 'staging', 'avd', 'android', 'ios'}
STATUSES = ['Pass', 'Fail', 'Blocked', 'Partial', 'Not run']
RESULT_STATUSES = {'Pass', 'Fail', 'Blocked', 'N/A'}
REQUIRED_CASE_FIELDS = ('id', 'title', 'req', 'priority', 'type', 'level', 'preconditions', 'steps', 'expected', 'automation', 'env')
GENERATED = ('TEST_CASES.md', 'TRACEABILITY.md', 'TEST_REPORT.md')
TAG = re.compile(r'\bTC-[A-Z0-9]+-\d{3}\b')


class Suite:
    def __init__(self, root: Path = ROOT):
        self.root = Path(root)
        self.dir = self.root / TESTING
        self.requirements = self._requirements()
        self.cases = self._cases()
        self.results = self._results()

    # ---- loading -------------------------------------------------------------------------
    def _requirements(self) -> dict:
        path = self.dir / 'REQUIREMENTS.md'
        reqs = {}
        if not path.exists():
            return reqs
        for line in path.read_text(encoding='utf-8').splitlines():
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) >= 5 and re.fullmatch(r'REQ-[A-Z0-9]+-\d{2}', cells[0]):
                reqs[cells[0]] = dict(id=cells[0], priority=cells[1], text=cells[2], source=cells[3], status=cells[4])
        return reqs

    def _cases(self) -> list:
        cases = []
        for path in sorted((self.dir / 'cases').glob('*.json')):
            data = json.loads(path.read_text(encoding='utf-8'))
            for case in data.get('cases', []):
                case = dict(case)
                case['_module'] = data.get('module')
                case['_file'] = path.name
                cases.append(case)
        return cases

    def _results(self) -> list:
        out = []
        for path in sorted((self.dir / 'results').glob('*.json')):
            data = json.loads(path.read_text(encoding='utf-8'))
            for item in data.get('results', []):
                row = dict(item)
                row['run'] = data.get('run', path.stem)
                row.setdefault('build', data.get('build'))
                row.setdefault('commit', data.get('commit'))
                row.setdefault('date', data.get('date'))
                out.append(row)
        return out

    # ---- results -------------------------------------------------------------------------
    def case_status(self, case: dict) -> str:
        latest = {}
        for row in self.results:  # later files override earlier ones per (case, env)
            if row['case'] == case['id']:
                latest[row.get('env') or '*'] = row
        if not latest:
            return 'Not run'
        statuses = {r['status'] for r in latest.values()}
        if 'Fail' in statuses:
            return 'Fail'
        if 'Blocked' in statuses:
            return 'Blocked'
        covered = {e for e in latest} if '*' not in latest else set(case['env'])
        if all(e in covered for e in case['env']) and statuses <= {'Pass', 'N/A'} and 'Pass' in statuses:
            return 'Pass'
        return 'Partial'

    # ---- validation ----------------------------------------------------------------------
    def tagged_tests(self) -> dict:
        """Tags like TC-AUTH-001 found in test sources: {tag: [paths]} (scanned once per Suite)."""
        if getattr(self, '_tags', None) is not None:
            return self._tags
        found: dict = {}
        for base in ('mobile/tests', 'tests', 'supabase/tests', 'scripts'):
            folder = self.root / base
            if not folder.exists():
                continue
            for path in folder.rglob('*'):
                if not path.is_file() or path.suffix not in {'.ts', '.tsx', '.mjs', '.js', '.py', '.sql', '.http'}:
                    continue
                if 'node_modules' in path.parts:
                    continue
                try:
                    text = path.read_text(encoding='utf-8')
                except (UnicodeDecodeError, OSError):
                    continue
                rel = path.relative_to(self.root).as_posix()
                if rel == 'scripts/test_cases.py' or rel.startswith('tests/test_test_cases'):
                    continue
                for tag in set(TAG.findall(text)):
                    found.setdefault(tag, []).append(rel)
        self._tags = found
        return found

    def check_automation(self, entry: str) -> str | None:
        if entry == 'manual':
            return None
        path, _, title = entry.partition('::')
        file = self.root / path
        if not file.is_file():
            return f'automation path not found: {path}'
        if title:
            text = file.read_text(encoding='utf-8')
            if path.endswith('.py'):
                if not re.search(r'def ' + re.escape(title) + r'\b', text):
                    return f'python test not found: {entry}'
            elif title not in text:
                return f'test title not found in {path}: {title}'
        return None

    def validate(self) -> list:
        errors = []
        if not self.requirements:
            errors.append('no requirements found in docs/testing/REQUIREMENTS.md')
        for req in self.requirements.values():
            if req['priority'] not in PRIORITIES:
                errors.append(f'{req["id"]}: invalid priority {req["priority"]}')
            if req['status'] not in {'Active', 'Superseded'}:
                errors.append(f'{req["id"]}: invalid status {req["status"]}')
        seen = set()
        covered = set()
        files = {p.name for p in (self.dir / 'cases').glob('*.json')}
        for code, (stem, _) in MODULES.items():
            if f'{stem}.json' not in files:
                errors.append(f'missing case file for module {code}: {stem}.json')
        for case in self.cases:
            cid = case.get('id', '<no id>')
            for field in REQUIRED_CASE_FIELDS:
                if field not in case or case[field] in (None, '', []) and field not in ('automation',):
                    errors.append(f'{cid}: missing {field}')
            module = case.get('_module')
            if module not in MODULES or MODULES[module][0] + '.json' != case['_file']:
                errors.append(f'{cid}: module {module} does not match file {case["_file"]}')
            if not re.fullmatch(r'TC-' + re.escape(str(module)) + r'-\d{3}', cid):
                errors.append(f'{cid}: id must look like TC-{module}-NNN')
            if cid in seen:
                errors.append(f'{cid}: duplicate id')
            seen.add(cid)
            if case.get('priority') not in PRIORITIES:
                errors.append(f'{cid}: invalid priority')
            if case.get('type') not in TYPES:
                errors.append(f'{cid}: invalid type {case.get("type")}')
            if case.get('level') not in LEVELS:
                errors.append(f'{cid}: invalid level {case.get("level")}')
            envs = case.get('env') or []
            if not isinstance(envs, list) or not envs or any(e not in ENVS for e in envs):
                errors.append(f'{cid}: invalid env')
            if not isinstance(case.get('steps'), list) or not case.get('steps') or any(not isinstance(s, str) or not s.strip() for s in case.get('steps', [])):
                errors.append(f'{cid}: steps must be a non-empty list of text')
            reqs = case.get('req') or []
            if not isinstance(reqs, list) or not reqs:
                errors.append(f'{cid}: req must be a non-empty list')
            for req in reqs if isinstance(reqs, list) else []:
                if req not in self.requirements:
                    errors.append(f'{cid}: unknown requirement {req}')
                elif self.requirements[req]['status'] != 'Active':
                    errors.append(f'{cid}: requirement {req} is superseded')
                else:
                    covered.add(req)
            automation = case.get('automation')
            if not isinstance(automation, list):
                errors.append(f'{cid}: automation must be a list')
                automation = []
            for entry in automation:
                problem = self.check_automation(entry)
                if problem:
                    errors.append(f'{cid}: {problem}')
            if not automation and not case.get('gap'):
                errors.append(f'{cid}: no automation and no `gap` explanation')
            if automation == ['manual'] and case.get('level') in {'unit', 'component', 'sql'}:
                errors.append(f'{cid}: {case.get("level")} cases cannot be manual only')
        for req in self.requirements.values():
            if req['priority'] == 'P0' and req['status'] == 'Active' and req['id'] not in covered:
                errors.append(f'{req["id"]}: P0 requirement has no test case')
        for tag, paths in self.tagged_tests().items():
            if tag not in seen:
                errors.append(f'tag {tag} in {paths[0]} does not match any case')
        valid_ids = seen
        for row in self.results:
            if row['case'] not in valid_ids:
                errors.append(f'result for unknown case {row["case"]} in run {row["run"]}')
            if row.get('status') not in RESULT_STATUSES:
                errors.append(f'result {row["case"]}: invalid status {row.get("status")}')
        return errors

    # ---- statistics ----------------------------------------------------------------------
    def automation_of(self, case: dict) -> list:
        entries = [a for a in case.get('automation', []) if a != 'manual']
        tags = self.tagged_tests().get(case['id'], [])
        return entries + [f'{p} (tag)' for p in tags if p not in {e.partition('::')[0] for e in entries}]

    def summary(self) -> dict:
        data = {'total': len(self.cases), 'status': {}, 'priority': {}, 'type': {}, 'level': {}, 'module': {}, 'automated': 0, 'gaps': []}
        for case in self.cases:
            status = self.case_status(case)
            for key, value in (('status', status), ('priority', case['priority']), ('type', case['type']), ('level', case['level'])):
                data[key][value] = data[key].get(value, 0) + 1
            module = data['module'].setdefault(case['_module'], {'total': 0, **{s: 0 for s in STATUSES}})
            module['total'] += 1
            module[status] += 1
            if self.automation_of(case):
                data['automated'] += 1
            else:
                data['gaps'].append(case)
        return data


# ---- rendering -----------------------------------------------------------------------------
def md_cell(text) -> str:
    return str(text).replace('|', '&#124;').replace('\n', '<br>')


def render_cases(suite: Suite) -> str:
    out = ['# Bộ test case', '',
           'Sinh từ `docs/testing/cases/*.json` bằng `python scripts/test_cases.py --write`; không sửa tay. '
           'Trạng thái lấy từ `docs/testing/results/*.json` (mặc định `Not run`, không suy từ việc có test tự động). '
           'Yêu cầu xem [REQUIREMENTS](REQUIREMENTS.md), truy vết xem [TRACEABILITY](TRACEABILITY.md), thống kê xem [TEST_REPORT](TEST_REPORT.md).', '',
           f'Tổng cộng {len(suite.cases)} test case, {len(MODULES)} module.', '']
    for code, (stem, title) in MODULES.items():
        cases = [c for c in suite.cases if c['_module'] == code]
        out += [f'## {code} — {title} ({len(cases)} ca)', '',
                '| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
        for c in cases:
            auto = len(suite.automation_of(c))
            out.append(f'| {c["id"]} | {c["priority"]} | {c["type"]} | {c["level"]} | {md_cell(c["title"])} | {", ".join(c["req"])} | {auto if auto else "—"} | {suite.case_status(c)} |')
        out.append('')
        for c in cases:
            out += [f'### {c["id"]} — {c["title"]}', '',
                    f'- **Yêu cầu:** {", ".join(c["req"])} · **Ưu tiên:** {c["priority"]} · **Loại:** {c["type"]} · **Tầng:** {c["level"]} · **Môi trường:** {", ".join(c["env"])}',
                    f'- **Tiền điều kiện:** {c["preconditions"]}']
            if c.get('data'):
                out.append(f'- **Dữ liệu:** {c["data"]}')
            out.append('- **Các bước:**')
            out += [f'  {i}. {s}' for i, s in enumerate(c['steps'], 1)]
            expected = c['expected'] if isinstance(c['expected'], list) else [c['expected']]
            out.append('- **Kết quả mong đợi:** ' + ('; '.join(expected)))
            auto = suite.automation_of(c)
            out.append('- **Tự động hóa:** ' + (', '.join(f'`{a}`' for a in auto) if auto else 'chưa có' + (f' — {c["gap"]}' if c.get('gap') else '')))
            out.append('')
    return '\n'.join(out).rstrip('\n') + '\n'


def render_traceability(suite: Suite) -> str:
    out = ['# Truy vết yêu cầu → test case → test tự động', '',
           'Sinh bằng `python scripts/test_cases.py --write`; không sửa tay. Yêu cầu Superseded không bắt buộc có test case.', '',
           '| Yêu cầu | Ưu tiên | Nội dung | Test case | Có tự động | Pass | Fail |', '| --- | --- | --- | --- | --- | --- | --- |']
    for req in suite.requirements.values():
        cases = [c for c in suite.cases if req['id'] in c['req']]
        auto = sum(1 for c in cases if suite.automation_of(c))
        passed = sum(1 for c in cases if suite.case_status(c) == 'Pass')
        failed = sum(1 for c in cases if suite.case_status(c) == 'Fail')
        ids = ', '.join(c['id'] for c in cases) if cases else ('—' if req['status'] == 'Superseded' else '**thiếu**')
        out.append(f'| {req["id"]} | {req["priority"]} | {md_cell(req["text"])} ({req["status"]}) | {ids} | {auto}/{len(cases)} | {passed} | {failed} |')
    out += ['', '## Test case → test tự động', '', '| Test case | Test tự động |', '| --- | --- |']
    for c in suite.cases:
        auto = suite.automation_of(c)
        if auto:
            out.append(f'| {c["id"]} | {md_cell("<br>".join("`" + a + "`" for a in auto))} |')
    return '\n'.join(out) + '\n'


def render_report(suite: Suite) -> str:
    s = suite.summary()
    def row(label, counts):
        return f'| {label} | ' + ' | '.join(str(counts.get(st, 0)) for st in STATUSES) + f' | {counts.get("total", sum(counts.get(st, 0) for st in STATUSES))} |'
    out = ['# Báo cáo kết quả test case', '',
           'Sinh bằng `python scripts/test_cases.py --write` từ `docs/testing/cases` và `docs/testing/results`; không sửa tay. '
           '`Not run` nghĩa là chưa có kết quả được ghi, không phải đạt.', '',
           f'- Tổng số test case: **{s["total"]}** ({len(MODULES)} module)',
           f'- Có liên kết test tự động: **{s["automated"]}**; chưa có: **{len(s["gaps"])}**',
           '- Trạng thái: ' + ', '.join(f'{k} {s["status"].get(k, 0)}' for k in STATUSES), '',
           '## Theo module', '', '| Module | ' + ' | '.join(STATUSES) + ' | Tổng |', '| --- | ' + ' | '.join('---' for _ in STATUSES) + ' | --- |']
    for code, (_, title) in MODULES.items():
        out.append(row(f'{code} — {title}', s['module'].get(code, {})))
    for key, label in (('priority', 'Theo ưu tiên'), ('type', 'Theo loại'), ('level', 'Theo tầng')):
        out += ['', f'## {label}', '', '| Giá trị | Số ca |', '| --- | --- |']
        out += [f'| {k} | {v} |' for k, v in sorted(s[key].items())]
    runs = {}
    for r in suite.results:
        runs.setdefault(r['run'], {'commit': r.get('commit'), 'date': r.get('date'), 'build': r.get('build'), 'n': 0})['n'] += 1
    out += ['', '## Các lượt chạy đã ghi', '']
    if runs:
        out += ['| Lượt | Commit | Ngày | Build | Số kết quả |', '| --- | --- | --- | --- | --- |']
        out += [f'| {k} | {v["commit"] or "—"} | {v["date"] or "—"} | {md_cell(v["build"] or "—")} | {v["n"]} |' for k, v in sorted(runs.items())]
    else:
        out.append('Chưa có lượt chạy nào. Kết quả tự động ghi bằng `--import-jest` và `--import-unittest`; kết quả thiết bị do GM-58 ghi.')
    out += ['', '## Ca chưa có test tự động', '']
    if s['gaps']:
        out += ['| ID | Tầng | Lý do |', '| --- | --- | --- |']
        out += [f'| {c["id"]} | {c["level"]} | {md_cell(c.get("gap", ""))} |' for c in s['gaps']]
    else:
        out.append('Không có.')
    failed = [c for c in suite.cases if suite.case_status(c) == 'Fail']
    out += ['', '## Ca Fail', '']
    if failed:
        out += ['| ID | Tiêu đề | Kết quả thực tế | Lỗi |', '| --- | --- | --- | --- |']
        for c in failed:
            rows = [r for r in suite.results if r['case'] == c['id'] and r['status'] == 'Fail']
            last = rows[-1]
            out.append(f'| {c["id"]} | {md_cell(c["title"])} | {md_cell(last.get("actual", ""))} | {md_cell(last.get("defect", ""))} |')
    else:
        out.append('Không có.')
    return '\n'.join(out) + '\n'


def generated(suite: Suite) -> dict:
    return {'TEST_CASES.md': render_cases(suite), 'TRACEABILITY.md': render_traceability(suite), 'TEST_REPORT.md': render_report(suite)}


# ---- xlsx (SpreadsheetML written by hand: no dependencies) -------------------------------------
def col(n: int) -> str:
    s = ''
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def sheet_xml(rows: list, widths: list) -> str:
    cells = []
    for r, row in enumerate(rows, 1):
        parts = []
        for c, value in enumerate(row):
            style = ' s="1"' if r == 1 else ' s="2"'
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                parts.append(f'<c r="{col(c)}{r}"{style}><v>{value}</v></c>')
            else:
                text = escape(str(value))
                parts.append(f'<c r="{col(c)}{r}"{style} t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>')
        cells.append(f'<row r="{r}">{"".join(parts)}</row>')
    cols = ''.join(f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths, 1))
    last = f'{col(max(len(r) for r in rows) - 1)}{len(rows)}'
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
            f'<cols>{cols}</cols><sheetData>{"".join(cells)}</sheetData>'
            f'<autoFilter ref="A1:{last}"/></worksheet>')


def workbook_rows(suite: Suite) -> list:
    cases = [['ID', 'Module', 'Ưu tiên', 'Loại', 'Tầng', 'Tiêu đề', 'Yêu cầu', 'Tiền điều kiện', 'Dữ liệu', 'Các bước', 'Kết quả mong đợi',
              'Môi trường', 'Tự động hóa', 'Trạng thái', 'Kết quả thực tế', 'Bằng chứng', 'Lỗi']]
    for c in suite.cases:
        rows = [r for r in suite.results if r['case'] == c['id']]
        last = rows[-1] if rows else {}
        expected = c['expected'] if isinstance(c['expected'], list) else [c['expected']]
        cases.append([c['id'], c['_module'], c['priority'], c['type'], c['level'], c['title'], ', '.join(c['req']), c['preconditions'], c.get('data', ''),
                      '\n'.join(f'{i}. {s}' for i, s in enumerate(c['steps'], 1)), '\n'.join(expected), ', '.join(c['env']),
                      '\n'.join(suite.automation_of(c)) or c.get('gap', 'chưa có'), suite.case_status(c),
                      last.get('actual', ''), last.get('evidence', ''), last.get('defect', '')])
    trace = [['Yêu cầu', 'Ưu tiên', 'Nội dung', 'Trạng thái yêu cầu', 'Test case', 'Số ca', 'Có tự động', 'Pass', 'Fail']]
    for req in suite.requirements.values():
        cs = [c for c in suite.cases if req['id'] in c['req']]
        trace.append([req['id'], req['priority'], req['text'], req['status'], ', '.join(c['id'] for c in cs), len(cs),
                      sum(1 for c in cs if suite.automation_of(c)), sum(1 for c in cs if suite.case_status(c) == 'Pass'),
                      sum(1 for c in cs if suite.case_status(c) == 'Fail')])
    s = suite.summary()
    summary = [['Module', 'Tên', *STATUSES, 'Tổng']]
    for code, (_, title) in MODULES.items():
        m = s['module'].get(code, {})
        summary.append([code, title, *[m.get(st, 0) for st in STATUSES], m.get('total', 0)])
    summary.append(['', 'Tổng', *[s['status'].get(st, 0) for st in STATUSES], s['total']])
    defects = [['Test case', 'Môi trường', 'Kết quả thực tế', 'Lỗi (issue/PR)', 'Lượt chạy', 'Thiết bị', 'Ngày']]
    for r in suite.results:
        if r['status'] in {'Fail', 'Blocked'}:
            defects.append([r['case'], r.get('env', ''), r.get('actual', ''), r.get('defect', ''), r['run'], r.get('device', ''), r.get('date', '')])
    return [('Test cases', cases, [12, 9, 9, 13, 10, 44, 18, 36, 28, 60, 48, 18, 44, 11, 40, 30, 24]),
            ('Traceability', trace, [14, 9, 60, 16, 50, 8, 11, 8, 8]),
            ('Summary', summary, [10, 40, 8, 8, 9, 9, 10, 8]),
            ('Defects', defects, [14, 14, 50, 28, 22, 20, 12])]


def write_xlsx(suite: Suite, target: Path) -> None:
    sheets = workbook_rows(suite)
    names = ''.join(f'<sheet name="{escape(n)}" sheetId="{i}" r:id="rId{i}"/>' for i, (n, _, _) in enumerate(sheets, 1))
    overrides = ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, len(sheets) + 1))
    rels = ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1))
    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
              '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
              '<fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/></patternFill></fill></fills>'
              '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
              '<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>'
              '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
              '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
              '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>'
              '</styleSheet>')
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + overrides + '</Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{names}</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   + rels + f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
        z.writestr('xl/styles.xml', styles)
        for i, (_, rows, widths) in enumerate(sheets, 1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', sheet_xml(rows, widths))


# ---- importing automated results ---------------------------------------------------------------
def jest_outcomes(data: dict, root: Path) -> dict:
    """{relative test file: [(title, status)]} from `jest --json` output."""
    out: dict = {}
    for suite in data.get('testResults', []):
        name = Path(suite['name'])
        try:
            rel = name.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            rel = name.as_posix()
        rows = out.setdefault(rel, [])
        for a in suite.get('assertionResults', []):
            rows.append((a.get('fullName') or a.get('title') or '', a.get('status')))
    return out


def unittest_outcomes(log: str) -> dict:
    """{python test file: {test_name: status}} from `python -m unittest -v` output."""
    out: dict = {}
    for m in re.finditer(r'^(test_\w+) \(([\w.]+)\)(?:\n[^\n]*)? \.\.\. (ok|FAIL|ERROR|skipped[^\n]*)', log, re.M):
        name, dotted, status = m.groups()
        module = dotted.split('.')[0] if dotted.startswith('tests.') is False else dotted.split('.')[1]
        out.setdefault(f'tests/{module}.py', {})[name] = 'Pass' if status == 'ok' else ('N/A' if status.startswith('skipped') else 'Fail')
    return out


PLACEHOLDER = re.compile(r'(%[sdifjoOp]|\$\{?[\w.]+\}?)')


def title_matches(template: str, full: str) -> bool:
    """Jest substitutes %s / $name in test.each titles; match the literal parts around them."""
    parts = PLACEHOLDER.split(template)
    if len(parts) == 1:
        return template in full
    pattern = ''.join('.+?' if PLACEHOLDER.fullmatch(p) else re.escape(p) for p in parts)
    return re.search(pattern, full) is not None


def import_results(suite: Suite, jest: dict | None, unit: dict | None, run: str, commit: str, build: str, date: str) -> list:
    results = []
    for case in suite.cases:
        if 'ci' not in case['env']:
            continue
        verdicts = []
        for entry in case['automation']:
            path, _, title = entry.partition('::')
            if jest is not None and path in jest and title:
                matched = [s for t, s in jest[path] if title_matches(title, t)]
                if matched:
                    verdicts.append('Pass' if all(s == 'passed' for s in matched) else 'Fail' if any(s == 'failed' for s in matched) else 'N/A')
            elif unit is not None and path in unit and title in unit[path]:
                verdicts.append(unit[path][title])
        expected = [e for e in case['automation'] if '::' in e and (e.partition('::')[0].startswith(('mobile/', 'tests/')))]
        if verdicts and len(verdicts) == len(expected) and len(expected) == len(case['automation']):
            status = 'Fail' if 'Fail' in verdicts else 'Pass' if 'Pass' in verdicts else 'N/A'
            results.append({'case': case['id'], 'env': 'ci', 'status': status, 'actual': f'{len(verdicts)} automated test(s) {status.lower()}'})
    return results


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true')
    g.add_argument('--write', action='store_true')
    g.add_argument('--check-docs', action='store_true')
    g.add_argument('--xlsx', metavar='FILE')
    g.add_argument('--import-jest', metavar='JSON')
    g.add_argument('--import-unittest', metavar='LOG')
    p.add_argument('--root', default=str(ROOT))
    p.add_argument('--run-id')
    p.add_argument('--commit', default='')
    p.add_argument('--build', default='')
    args = p.parse_args(argv)
    suite = Suite(Path(args.root))
    errors = suite.validate()
    if args.check or args.write or args.check_docs or args.xlsx:
        if errors:
            print('\n'.join(errors))
            print(f'{len(errors)} problem(s)')
            return 1
    if args.check:
        s = suite.summary()
        print(f'OK: {s["total"]} cases, {len(suite.requirements)} requirements, {s["automated"]} with automation, {len(s["gaps"])} without')
        return 0
    if args.write:
        for name, text in generated(suite).items():
            (suite.dir / name).write_text(text, encoding='utf-8', newline='\n')
        print('Regenerated ' + ', '.join(GENERATED))
        return 0
    if args.check_docs:
        stale = [n for n, t in generated(suite).items() if not (suite.dir / n).exists() or (suite.dir / n).read_text(encoding='utf-8') != t]
        if stale:
            print('Stale generated files; run python scripts/test_cases.py --write: ' + ', '.join(stale))
            return 1
        print('Generated test-case files are current')
        return 0
    if args.xlsx:
        write_xlsx(suite, Path(args.xlsx))
        print(f'Wrote {args.xlsx}')
        return 0
    if errors:
        print('\n'.join(errors))
        return 1
    if not args.run_id:
        print('--run-id is required for imports')
        return 2
    date = datetime.date.today().isoformat()
    jest = unit = None
    if args.import_jest:
        jest = jest_outcomes(json.loads(Path(args.import_jest).read_text(encoding='utf-8')), suite.root)
    else:
        unit = unittest_outcomes(Path(args.import_unittest).read_text(encoding='utf-8', errors='replace'))
    rows = import_results(suite, jest, unit, args.run_id, args.commit, args.build, date)
    out = suite.dir / 'results' / f'{args.run_id}.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({'run': args.run_id, 'commit': args.commit, 'build': args.build, 'date': date, 'results': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Recorded {len(rows)} case result(s) in {out.relative_to(suite.root).as_posix()}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
