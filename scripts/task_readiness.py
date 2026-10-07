"""Read-only task gates and reproducible task indexes; no external services.

--write-docs regenerates four Markdown indexes and repairs links after task moves.
No task status, approval or assignment is ever changed by this script.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys

import validate_repository as repository


def dependencies(record):
    return re.findall(r'GM-\d{2}', record['meta'].get('dependencies', ''))


def readiness(src, records, tid):
    record = records[tid]
    status = record['meta']['status']
    if status == 'done':
        reasons = repository.approval_errors(src, record)
        return ('INVALID_APPROVAL', reasons) if reasons else ('DONE_REVIEWED', [])
    blocked = [dep for dep in dependencies(record)
               if dep not in records or repository.approval_errors(src, records[dep])]
    if blocked:
        return 'BLOCKED', blocked
    if status == 'review':
        return 'IN_REVIEW', []
    if status == 'in-progress':
        return 'IN_PROGRESS', []
    return ('READY_TO_START' if record['meta'].get('assignment_status') == 'accepted'
            else 'READY_TO_CLAIM'), []


def layers(records):
    remaining, completed, result = set(records), set(), []
    while remaining:
        layer = sorted(tid for tid in remaining if set(dependencies(records[tid])) <= completed)
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

    notice = ('Bảng sinh từ frontmatter task bằng `python scripts/task_readiness.py --write-docs` '
              '(đồng thời sửa link task sau khi chuyển thư mục); '
              'không sửa tay. Kiểm độ mới: `python scripts/task_readiness.py --check-docs`. '
              'Đây là trạng thái local, không xác minh GitHub hay review ngoài repo.\n\n')
    counts = {p: sum(records[t]['meta']['priority'] == p for t in ids) for p in ('P0', 'P1', 'P2')}
    summary = (f"{len(ids)} task sau GM-00: {counts['P0']} P0 (gồm gate tài liệu GM-28), "
               f"{counts['P1']} P1, {counts['P2']} P2. Baseline food-v1; reviewer độc lập mới mở khóa.\n\n")
    for path, title in (
        ('tasks/backlog/MASTER_BACKLOG.md', 'Master backlog — food-v1'),
        ('docs/project/TASK_SUMMARY.md', 'Tổng hợp task — food-v1'),
    ):
        rows = ['| Task | Phạm vi | Owner / reviewer | Mức/cỡ | Status | Gate | Phải xong trước | Song song có điều kiện |',
                '| --- | --- | --- | --- | --- | --- | --- | --- |']
        for tid in ids:
            m = records[tid]['meta']
            state, _ = readiness(src, records, tid)
            peers = re.findall(r'GM-\d{2}', m.get('parallel_with', ''))
            rows.append(f"| {link(tid,path)} | {m['title']} | {m['owner']} / {m['reviewer']} | {m['priority']}/{m['size']} | {m['status']} | {state} | {links(dependencies(records[tid]),path)} | {links(peers,path)} |")
        dep_path = posixpath.relpath('docs/project/TASK_DEPENDENCIES.md', posixpath.dirname(path))
        outputs[path] = f'# {title}\n\n' + notice + summary + '\n'.join(rows) + f'\n\n[Thứ tự, song song và gate]({dep_path}). Dependency có quyền ưu tiên hơn lịch tuần; assignee đề xuất không chứng minh đã nhận việc.\n'

    path = 'docs/project/TASK_DEPENDENCIES.md'
    text = '# Thứ tự và điều kiện bắt đầu task — food-v1\n\n' + notice + summary
    text += ('## Cách tự kiểm trước khi làm\n\n'
             'Chạy `python scripts/task_readiness.py --task GM-08` (đổi ID cần nhận). Exit 0 chỉ khi dependency đã Done với Reviewed-by đúng reviewer khác owner, Reviewed-at hợp lệ, Decision: Approved và Review-evidence tồn tại; assignment vẫn cần thành viên xác nhận. Exit 1 = đang bị chặn/chờ review, exit 2 = metadata không hợp lệ. `--all` là báo cáo tổng, exit 0 của báo cáo không có nghĩa mọi task đã sẵn sàng.\n\n'
             'READY_TO_CLAIM: có thể nhận; READY_TO_START: đã nhận và gate đạt; BLOCKED: các dependency liệt kê chưa đạt; IN_REVIEW: chờ reviewer; IN_PROGRESS: đang làm; DONE_REVIEWED: đủ bản ghi review. Script không chứng minh người review có thật hoặc AC đạt thật; người nhận phải mở evidence/PR.\n\n'
             'Một dependency merge PR nhưng task còn review chưa mở khóa. Đổi status Done mà thiếu Approved/evidence không mở khóa. Review là cho scope/revision đã giao; đổi contract sau nghiệm thu phải review lại và rà tác động task con.\n\n'
             '## Trạng thái hiện tại\n\n'
             '| Task | Gate | Chờ trực tiếp |\n| --- | --- | --- |\n')
    for tid in sorted(records):
        state, blocked = readiness(src, records, tid)
        text += f'| {link(tid,path)} | {state} | {links([t for t in blocked if t in records],path)} |\n'
    text += ('\n## Các lớp dependency\n\n'
             'Đây là thứ tự topo, không phải deadline hoặc barrier toàn nhóm. Task ở lớp sau bắt đầu ngay khi dependency riêng đạt, không cần chờ task không liên quan ở lớp trước. Các task cùng lớp có thể độc lập về dependency, nhưng cùng owner/reviewer/file phải xếp ca hoặc chia lại người. Một task chính/người tại một thời điểm.\n\n'
             '| Lớp | Tasks | Owner cần điều phối |\n| --- | --- | --- |\n')
    for number, layer in enumerate(layers(records)):
        owners = '; '.join(f"{tid}: {records[tid]['meta']['owner']}" for tid in layer)
        text += f'| {number} | {links(layer,path)} | {owners} |\n'
    text += '\n## Cặp song song đã khai báo\n\n| Cặp task | Điều kiện |\n| --- | --- |\n'
    pairs = sorted({tuple(sorted((tid, peer))) for tid in ids
                    for peer in re.findall(r'GM-\d{2}', records[tid]['meta'].get('parallel_with', ''))})
    for first, second in pairs:
        text += f'| {links([first,second],path)} | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |\n'
    text += ('\nCác cặp trên là gợi ý cụ thể, không liệt kê mọi khả năng độc lập. Validator cấm khai báo song song với ancestor/descendant hoặc cùng owner. Mỗi task có checklist đầu vào và đầu ra bàn giao; không dùng mock để đóng AC tích hợp.\n\n'
             'GM-27 data quán/giờ là P0 trước GM-30 eligibility và GM-08 room. GM-29 location/context chạy trước GM-07, tách khỏi GM-20 QR/review sau result. GM-28 review scope mới chặn mọi task triển khai food-v1; GM-00 chỉ chứng minh baseline cũ đã review. Weather/mood GM-31 và account/OCR/AI chờ GM-22.\n')
    outputs[path] = text

    path = 'docs/project/TEAM_AND_RESPONSIBILITIES.md'
    handles = {'Trí': 'ThanhTris', 'Trang': 'rosy179', 'Tâm': 'HoaiTam', 'Vinh': 'Vinh5905', 'Trung': 'TrungNQ2645', 'Tuấn': 'mtuan2491'}
    text = '# Phân công đề xuất — food-v1\n\n' + notice + 'Một task chính/người; reviewer khác owner. Tên là đề xuất tới khi assignment_status=accepted. Không suy đã nhận từ Assignee GitHub.\n\n| Thành viên | Task đề xuất | GitHub |\n| --- | --- | --- |\n'
    for owner, handle in handles.items():
        owned = [tid for tid in ids if records[tid]['meta']['owner'] == owner]
        text += f'| {owner} | {links(owned,path)} | [@{handle}](https://github.com/{handle}) |\n'
    text += ('\nCodex soạn bộ nền GM-00 và bản sửa GM-28; Trí review độc lập, không tự duyệt. GM-28 vẫn chờ review bản mới.\n\n'
             'Vinh làm taxonomy/dataset/engine và QA; Tâm schema/eligibility/room/history; Trí security/submit/outbox/release; Tuấn bootstrap/location/lobby/result/QR; Trang primitives/context/card; Trung identity/friends/push rồi phần mở rộng. Data quán phải làm sớm. GM-11 và GM-27 cùng Vinh nên xếp ca dù có thể độc lập về dependency. Cân tải/reviewer hằng tuần theo [dependency map](TASK_DEPENDENCIES.md).\n')
    outputs[path] = text
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument('--task')
    choice.add_argument('--all', action='store_true')
    choice.add_argument('--write-docs', action='store_true')
    choice.add_argument('--check-docs', action='store_true')
    choice.add_argument('--render-docs', action='store_true')
    args = parser.parse_args()
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
    for tid in ([args.task] if args.task else sorted(records)):
        state, blocked = readiness(src, records, tid)
        m = records[tid]['meta']
        print(f"{tid}: {state} | owner={m['owner']} reviewer={m['reviewer']} | {records[tid]['path']}")
        for dep in blocked:
            print(f"  WAIT {dep}: {records[dep]['meta']['status']} | {records[dep]['path']}")
    print('Recorded approval only; inspect evidence and confirm assignment before starting.')
    if args.task:
        return 0 if readiness(src, records, args.task)[0] in {'READY_TO_CLAIM', 'READY_TO_START', 'IN_PROGRESS', 'DONE_REVIEWED'} else 1
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
