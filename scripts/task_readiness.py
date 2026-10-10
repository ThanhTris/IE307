"""Read-only task gates and reproducible task indexes; no external services.

--write-docs regenerates task/handoff indexes and repairs links after task moves.
No task status, approval or assignment is ever changed by this script.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import subprocess
import sys

import validate_repository as repository


def dependencies(record, gate='merge'):
    ids = repository.dependency_ids(record, gate)
    if gate == 'merge':
        ids = sorted(set(ids + repository.dependency_ids(record, 'start')))
    return ids


def readiness(src, records, tid, gate='start', base=None):
    record = records[tid]
    status = record['meta']['status']
    if status == 'done' and gate == 'start':
        reasons = repository.approval_errors(src, record)
        reasons.extend(repository.delivery_errors(src, record))
        return ('INVALID_APPROVAL', reasons) if reasons else ('DONE_REVIEWED', [])
    blocked = [dep for dep in dependencies(record, gate)
               if dep not in records or repository.approval_errors(src, records[dep])]
    if blocked:
        return 'BLOCKED', blocked
    missing = [dep for dep in dependencies(record, gate)
               if repository.delivery_errors(src, records[dep])]
    if missing:
        return 'BLOCKED_ARTIFACTS', missing
    if gate == 'merge' and base is None:
        return 'NEEDS_BASE_CHECK', []
    if base is not None:
        base_records = repository.task_records(base)
        for dep in dependencies(record, gate):
            target = base_records.get(dep)
            if (not target or repository.approval_errors(base, target)
                    or repository.delivery_errors(base, target)):
                blocked.append(dep)
                continue
            # Do not accept an older baseline/evidence revision just because it is Approved.
            local = records[dep]
            evidence = re.search(r'^Review-evidence:[ \t]*([^\n]+)', local['text'], re.M).group(1)
            if (target['text'] != local['text'] or evidence not in base.files
                    or base.read(evidence) != src.read(evidence)):
                blocked.append(dep)
        if blocked:
            return 'BLOCKED_ON_BASE', blocked
    if gate == 'merge':
        return 'READY_FOR_MERGE_REVIEW', []
    if status == 'review':
        return 'IN_REVIEW', []
    if status == 'in-progress':
        return 'IN_PROGRESS', []
    return ('READY_TO_START' if record['meta'].get('assignment_status') == 'accepted'
            else 'READY_TO_CLAIM'), []


def layers(records, gate='merge'):
    remaining, completed, result = set(records), set(), []
    while remaining:
        layer = sorted(tid for tid in remaining if set(dependencies(records[tid], gate)) <= completed)
        if not layer:
            raise ValueError('dependency cycle or unknown dependency')
        result.append(layer)
        completed.update(layer)
        remaining.difference_update(layer)
    return result


def task_link_updates(src):
    """Retarget local Markdown task links after a status-directory move."""
    records = repository.task_records(src)
    changes = {}
    for path in sorted(src.files):
        if not path.endswith('.md'):
            continue
        original = src.read(path)

        def replace(match):
            target = match.group(1)
            if re.match(r'^[a-z]+:', target):
                return match.group(0)
            base, mark, anchor = target.partition('#')
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), base))
            task = re.fullmatch(r'tasks/(?:backlog|in-progress|review|done)/(GM-\d{2})\.md', resolved)
            if not task or task.group(1) not in records:
                return match.group(0)
            actual = records[task.group(1)]['path']
            if resolved == actual:
                return match.group(0)
            corrected = posixpath.relpath(actual, posixpath.dirname(path)) + (mark + anchor if mark else '')
            offset = match.start(1) - match.start(0)
            return match.group(0)[:offset] + corrected + match.group(0)[offset + len(target):]

        revised = repository.LINK.sub(replace, original)
        if revised != original:
            changes[path] = revised
    return changes


def render_documents(src):
    records = repository.task_records(src)
    ids = sorted(set(records) - {'GM-00'})
    outputs = {}

    def link(tid, path):
        return f"[{tid}]({posixpath.relpath(records[tid]['path'], posixpath.dirname(path))})"

    def links(tids, path):
        return ', '.join(link(tid, path) for tid in tids) or '—'

    notice = ('Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. '
              '`--check-docs` kiểm độ mới. Đây là metadata local, không phải trạng thái GitHub.\n\n')
    counts = {p: sum(records[t]['meta']['priority'] == p for t in ids) for p in ('P0', 'P1', 'P2')}
    summary = (f"{len(ids)} task sau GM-00: {counts['P0']} P0 (gồm GM-01), "
               f"{counts['P1']} P1, {counts['P2']} P2. Mã roadmap-v2 tăng theo lộ trình; "
               'mọi dependency có số nhỏ hơn task. Owner/reviewer là đề xuất; không kế thừa approval khi đổi scope.\n\n')
    for path, title in (
        ('tasks/backlog/MASTER_BACKLOG.md', 'Master backlog — food-v1'),
        ('docs/project/TASK_SUMMARY.md', 'Tổng hợp task — food-v1'),
    ):
        rows = ['| Task | Luồng / bước | Phạm vi | Owner / reviewer | Mức/cỡ | Status | Gate bắt đầu | Start deps | Merge deps | Song song |',
                '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
        for tid in ids:
            m = records[tid]['meta']
            peers = re.findall(r'GM-\d{2}', m.get('parallel_with', ''))
            rows.append(f"| {link(tid,path)} | {m.get('track', '')} / {m.get('stage', '')} | {m['title']} | {m['owner']} / {m['reviewer']} | {m['priority']}/{m['size']} | {m['status']} | {readiness(src,records,tid)[0]} | {links(dependencies(records[tid],'start'),path)} | {links(repository.dependency_ids(records[tid],'merge'),path)} | {links(peers,path)} |")
        dep_path = posixpath.relpath('docs/project/TASK_DEPENDENCIES.md', posixpath.dirname(path))
        mapping_path = posixpath.relpath('docs/project/TASK_RENUMBERING.md', posixpath.dirname(path))
        handoff_path = posixpath.relpath('docs/project/TASK_HANDOFFS.md', posixpath.dirname(path))
        outputs[path] = f'# {title}\n\n' + notice + summary + '\n'.join(rows) + f'\n\n[Hai gate và thứ tự merge]({dep_path}) · [Đầu vào/đầu ra]({handoff_path}) · [Mã cũ–mới]({mapping_path}). Merge cần cả start deps và merge deps. Song song chỉ áp dụng phần độc lập được ghi trong task; không tự xác nhận nhận việc.\n'

    path = 'docs/project/TASK_HANDOFFS.md'
    mapping = repository.roadmap(src)
    text = '# Bảng nhận đầu vào và bàn giao — roadmap-v2\n\n' + notice
    text += ('Path dưới đây là đầu ra dự kiến, không chứng minh file đã có. Người nhận đối chiếu HANDOFF/PR/commit/version và chạy smoke sau khi cập nhật nhánh. '
             'Trước start dùng readiness; thêm --base-ref origin/main để kiểm target. Merge bắt buộc --gate merge --base-ref origin/main. '
             'Checker kiểm sự hiện diện file, không chứng minh nội dung chạy đúng.\n\n'
             '| Task / owner | Nhận trước start | Nhận trước merge (ngoài start) | Bàn giao cho task sau |\n'
             '| --- | --- | --- | --- |\n')
    for entry in mapping['entries']:
        tid = entry['new_id']
        inputs = {gate: '<br>'.join(f"{link(i['task'],path)}: `{i['artifact']}`" for i in entry['inputs'] if i['gate'] == gate) or '—'
                  for gate in ('start', 'merge')}
        artifacts = '<br>'.join(f'`{p}`' for p in entry['outputs'])
        text += f"| {link(tid,path)} — {records[tid]['meta']['owner']} | {inputs['start']} | {inputs['merge']} | {artifacts} |\n"
    text += '\n[Mẫu HANDOFF](../../tasks/templates/HANDOFF_TEMPLATE.md) · [Lộ trình](IMPLEMENTATION_ROADMAP.md).\n'
    outputs[path] = text

    path = 'docs/project/TASK_DEPENDENCIES.md'
    text = '# Làm song song, merge theo dependency — food-v1\n\n' + notice + summary
    text += (
        '## Hai gate khác nhau\n\n'
        '- `start_dependencies`: đầu vào phải Done/Approved trước viết phần độc lập. Mặc định checker dùng gate start.\n'
        '- `merge_dependencies`: đầu vào phải Done/Approved và có trên nhánh đích trước tích hợp/merge; luôn cộng thêm start deps. Có thể viết branch/draft PR trong khi các task này đang làm.\n'
        '- `parallel_with`: cặp làm phần độc lập trên nhánh riêng, có thể có quan hệ merge trước/sau. Không được có quan hệ start trước/sau hoặc cùng owner.\n\n'
        '```text\n'
        'python scripts/task_readiness.py --task GM-20\n'
        'python scripts/task_readiness.py --task GM-20 --base-ref origin/main\n'
        'python scripts/task_readiness.py --task GM-20 --gate merge --base-ref origin/main\n'
        'python scripts/task_readiness.py --all\n'
        '```\n\n'
        'Trước kiểm merge, cập nhật ref nhánh đích bằng fetch phù hợp remote đã xác nhận. Checker không tự fetch/merge. '
        'Nó in SHA snapshot và kiểm task/evidence của dependency trên ref đó khớp bản local được review; '
        'không chứng minh code của PR đã merge hoặc remote ref còn mới. Người merge phải kiểm PR/merge commit thực tế, ancestry, cập nhật nhánh và chạy lại integration tests.\n\n'
        'READY_TO_CLAIM: đủ start deps, chưa nhận việc; READY_TO_START: đã nhận; IN_PROGRESS: đang làm; '
        'IN_REVIEW: chờ reviewer; DONE_REVIEWED: bản ghi review đạt, không đồng nghĩa đã merge. '
        'BLOCKED: thiếu review dependency; BLOCKED_ARTIFACTS: upstream thiếu file bàn giao/HANDOFF; BLOCKED_ON_BASE: đầu vào thiếu/khác revision trên nhánh đích; '
        'NEEDS_BASE_CHECK: metadata local đạt nhưng chưa kiểm ref đích; READY_FOR_MERGE_REVIEW: đầu vào trên ref đạt, vẫn cần reviewer của chính PR và AC/test thật. '
        'Exit 0 của --task chỉ là gate tương ứng đạt; 1 là chờ; 2 là dữ liệu/lệnh lỗi. --all exit 0 chỉ là báo cáo chạy được.\n\n'
        '## Trạng thái hiện tại\n\n'
        '| Task | Start | Chờ start | Merge local | Chờ merge (gồm start) |\n| --- | --- | --- | --- | --- |\n')
    for tid in sorted(records):
        state, blocked = readiness(src, records, tid)
        merge_state, merge_blocked = readiness(src, records, tid, 'merge')
        text += f'| {link(tid,path)} | {state} | {links([t for t in blocked if t in records],path)} | {merge_state} | {links([t for t in merge_blocked if t in records],path)} |\n'
    for gate, heading in (('start', 'Lớp mở khóa bắt đầu'), ('merge', 'Thứ tự merge / tích hợp')):
        text += (f'\n## {heading}\n\n'
                 'Lớp topo không là barrier cả nhóm hay deadline. Chỉ chờ dependency của task mình. '
                 'Cùng owner xếp ca; các lớp start cho phép soạn phần độc lập, không bảo đảm đã có runner/API để test thật.\n\n'
                 '| Lớp | Tasks | Owner cần điều phối |\n| --- | --- | --- |\n')
        for number, layer in enumerate(layers(records, gate)):
            owners = '; '.join(f"{tid}: {records[tid]['meta']['owner']}" for tid in layer)
            text += f'| {number} | {links(layer,path)} | {owners} |\n'
    text += '\n## Cặp song song cụ thể\n\n| Tasks | Điều kiện |\n| --- | --- |\n'
    pairs = sorted({tuple(sorted((tid, peer))) for tid in ids
                    for peer in re.findall(r'GM-\d{2}', records[tid]['meta'].get('parallel_with', ''))})
    for first, second in pairs:
        text += f'| {links([first,second],path)} | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |\n'
    text += (
        '\nKhông liệt kê mọi cặp có thể song song. Chốt interface và file ownership trong draft PR trước viết; '
        'GM-02 UI structure / GM-03 BE structure / GM-04 fields là ba nhánh nền. '
        'GM-05 components và GM-07 client/mock có thể làm đồng thời sau đầu vào riêng; GM-08 import chờ schema GM-06. '
        'GM-09..14 màn mock nghiệm thu riêng sau components+contract, không chờ API nghiệp vụ. '
        'GM-15..23 hoàn thiện BE; GM-24..31 tích hợp UI/API/native; GM-32..34 kiểm thử và release. '
        'GM-35..38 chỉ merge sau core. GM-01 vẫn review. Mock không đóng AC native/SQL/dataset thật của task tích hợp.\n\n'
        '[Lộ trình](IMPLEMENTATION_ROADMAP.md) · [Đầu vào/đầu ra](TASK_HANDOFFS.md) · [Workflow](TEAM_WORKFLOW.md) · [Mapping](TASK_RENUMBERING.md) · [ADR-009](../architecture/decisions/ADR-009-foundation-first-task-slicing.md).\n')
    outputs[path] = text

    path = 'docs/project/TEAM_AND_RESPONSIBILITIES.md'
    handles = {'Trí': 'ThanhTris', 'Trang': 'rosy179', 'Tâm': 'HoaiTam', 'Vinh': 'Vinh5905', 'Trung': 'TrungNQ2645', 'Tuấn': 'mtuan2491'}
    text = '# Phân công đề xuất — food-v1\n\n' + notice + 'Một task chính/người; reviewer khác owner. Phân công vẫn proposed tới khi thành viên xác nhận.\n\n| Thành viên | Task đề xuất | GitHub |\n| --- | --- | --- |\n'
    for owner, handle in handles.items():
        owned = [tid for tid in ids if records[tid]['meta']['owner'] == owner]
        text += f'| {owner} | {links(owned,path)} | [@{handle}](https://github.com/{handle}) |\n'
    text += (
        '\nCodex soạn GM-01, Trí review baseline. Đợt nền: Tuấn GM-02 UI structure, Trí GM-03 BE structure, Vinh GM-04 fields. '
        'Trang chuẩn bị inventory UI mẫu; Tâm/Trung review data/API plan. Sau đầu vào tương ứng: Trang GM-05 components, '
        'Tâm GM-06 database, Trung GM-07 client/mock, Vinh GM-08 import. Trang/Tuấn chia màn GM-09..14 theo ca; '
        'BE và tích hợp theo task/owner trong bảng. Không yêu cầu người chưa có nền tự tạo scaffolding riêng. '
        'Đặt lịch review sớm, cùng owner xếp ca. Xem [lộ trình](IMPLEMENTATION_ROADMAP.md), [handoff](TASK_HANDOFFS.md) '
        'và [dependency](TASK_DEPENDENCIES.md).\n')
    outputs[path] = text
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gate', choices=('start', 'merge'), default='start')
    parser.add_argument('--base-ref', help='Compare upstream task/evidence/artifacts with this local target ref; required for merge, optional for start')
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--task')
    choice.add_argument('--all', action='store_true')
    choice.add_argument('--write-docs', action='store_true')
    choice.add_argument('--check-docs', action='store_true')
    choice.add_argument('--render-docs', action='store_true')
    args = parser.parse_args()
    if args.gate == 'merge' and (args.task or args.all) and not args.base_ref:
        parser.error('--gate merge requires --base-ref (for example origin/main)')
    if args.base_ref and not (args.task or args.all):
        parser.error('--base-ref is only for --task/--all')
    src = repository.Source(None)
    records = repository.task_records(src)
    # Generation also repairs stale indexes after task edits; validate gates afterwards.
    if args.write_docs or args.check_docs or args.render_docs:
        try:
            documents = {**task_link_updates(src), **render_documents(src)}
        except (KeyError, ValueError) as error:
            print(f'Cannot generate indexes: {error}')
            return 2
        if args.render_docs:
            print(json.dumps(documents, ensure_ascii=False))
            return 0
        stale = []
        for name, expected in documents.items():
            file = repository.ROOT / name
            if args.write_docs:
                file.write_text(expected, encoding='utf-8')
            elif not file.exists() or file.read_text(encoding='utf-8-sig') != expected:
                stale.append(name)
        if stale:
            print('Stale indexes; run python scripts/task_readiness.py --write-docs:\n' + '\n'.join(stale))
            return 1
        print('Task indexes regenerated.' if args.write_docs else 'Task indexes match task metadata.')
        return 0
    errors = repository.validate(src)
    if errors:
        print('\n'.join(errors))
        return 2
    if args.task and args.task not in records:
        print('Unknown task ID: ' + args.task)
        return 2
    try:
        base = repository.Source(args.base_ref) if args.base_ref else None
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'Cannot read target Git ref: {error}')
        return 2
    if base:
        print(f'Target snapshot: {args.base_ref} = {base.ref} (local ref; freshness not verified)')
    for tid in ([args.task] if args.task else sorted(records)):
        state, blocked = readiness(src, records, tid, args.gate, base)
        m = records[tid]['meta']
        print(f"{tid}: {state} | owner={m['owner']} reviewer={m['reviewer']} | {records[tid]['path']}")
        for dep in blocked:
            if dep in records:
                print(f"  WAIT {dep}: {records[dep]['meta']['status']} | {records[dep]['path']}")
                if state == 'BLOCKED_ARTIFACTS':
                    for reason in repository.delivery_errors(src, records[dep]):
                        print('    ' + reason)
            else:
                print('  ' + dep)
    print('Recorded approval only; confirm assignment/contracts for start. Merge still requires independent review, exact PR/commit ancestry and real integration tests; no remote verification.')
    if args.task:
        return 0 if readiness(src, records, args.task, args.gate, base)[0] in {'READY_TO_CLAIM', 'READY_TO_START', 'IN_PROGRESS', 'DONE_REVIEWED', 'READY_FOR_MERGE_REVIEW'} else 1
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
