#!/usr/bin/env python3
"""Generate branch-specific Pending survey forms; never edit/import/approve a bundle."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys

from gm08_prepare_draft import module

DAYS = ('Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật')


def md(value):
    return str(value).replace('\\', '\\\\').replace('|', '\\|').replace('\n', ' ').replace('`', '\\`')


def prepare(input_path, notes_path, output):
    input_path, output = Path(input_path), Path(output)
    raw = input_path.read_bytes()
    sha = module.digest(raw)
    bundle = json.loads(raw)
    validation = module.preflight(bundle, module.now())
    if not validation['valid']:
        raise ValueError('Invalid input bundle; validate the candidate first')
    if bundle['fixtureOnly'] or any(row['reviewStatus'] != 'draft'
                                   for rows in bundle['entities'].values() for row in rows):
        raise ValueError('Survey packet requires an actual draft candidate, not fixture/approval')
    notes = json.loads(Path(notes_path).read_text(encoding='utf-8')) if notes_path else {}
    if notes and notes.get('bundleSha256') != sha:
        raise ValueError('Comparison notes must bind exact candidate bytes')
    entities = bundle['entities']
    venues = {row['id']: row for row in entities['venues']}
    annotations = notes.get('branches', {})
    if set(annotations) - venues.keys():
        raise ValueError('Comparison note refers to an unknown branch')
    sources = {row['sourceRef']: row for row in entities['dataSources']}
    offerings = defaultdict(list)
    schedules = defaultdict(list)
    for row in entities['venueDishes']:
        offerings[row['venueId']].append(row)
    for row in entities['weeklySchedules']:
        if row['ownerType'] == 'venue':
            schedules[row['ownerId']].append(row)
    output.mkdir(parents=True, exist_ok=False)
    entries = []
    for venue_id, venue in sorted(venues.items()):
        observations = sorted(offerings[venue_id], key=lambda r: r['offeringId'])
        note = annotations.get(venue_id, {})
        filename = f'venue-{venue_id}.md'
        sheet = dict(state='Pending', verified=False, publicationPerformed=False,
            bundleSha256=sha, venueId=venue_id, collector=None, checkedAt=None,
            independentReviewer=None, reviewedAt=None, evidence=[],
            confirmedVenue=dict(branchName=None, address=None, adminAreaId=None,
                coordinates=None, status='unknown', serviceModes=[], weeklySchedules=[],
                dateExceptions=[], fieldSources={}, validUntil=None),
            sourceRights=dict(sourceRef=venue['sourceRef'], usageRights='unknown',
                license=None, attribution=None, permittedUses=None, evidence=[], validUntil=None),
            offerings=[dict(label=f'M{i:02}', offeringId=row['offeringId'],
                dishId=row['dishId'], observedMenuName=row['menuName'],
                observedPrice=row['priceMin'], observedUnit=row['unit'],
                observedSourceRef=row['menuSource'], confirmedMenuName=None,
                priceMin=None, priceMax=None, unit=None, currency=None,
                serviceMode=None, weeklySchedules=[], sameAsVenueHoursEvidence=[],
                dateExceptions=[], fieldSources={}, checkedAt=None, validUntil=None)
                for i, row in enumerate(observations, 1)], comparisonNotes=note)
        module.write_json(output / f'venue-{venue_id}.json', sheet)
        lines = [f'# Phiếu khảo sát — {md(venue["branchName"])}', '',
            '**Pending — chưa xác nhận/verified/published. Không phải bundle import.**', '',
            f'Candidate SHA256: `{sha}`. Venue ID: `{venue_id}`.', '',
            f'Địa chỉ quan sát: {md(venue["address"])}.',
            f'Tọa độ nguồn: lat={venue["lat"]}, lng={venue["lng"]}; không phải GPS người dùng.',
            f'Nguồn menu: {sources[venue["sourceRef"]]["locator"]}.',
            f'Ngày quan sát nguồn: {venue["checkedAt"]}; chưa phải ngày khảo sát độc lập.', '',
            '## Người khảo sát và bằng chứng', '',
            '- Người thu thập/ngày kiểm: chưa điền.',
            '- Người đại diện quán/kênh xác nhận công khai: chưa điền; không lưu thông tin cá nhân không cần thiết.',
            '- Evidence được phép chia sẻ: đường dẫn/URL, ngày xác nhận, hash file; chưa điền.',
            '- Địa chỉ/tọa độ/mã hành chính/status đã xác nhận: chưa điền.',
            '- dine_in/takeaway/delivery của đúng chi nhánh: chưa điền, kèm evidence.', '',
            '## Đối chiếu nguồn công khai — chưa thay khảo sát', '']
        for observation in note.get('observations', []):
            lines.extend([f'- [{md(observation["kind"])}]({observation["url"]}): {md(observation["note"])}'])
        if not note.get('observations'):
            lines.append('Chưa tìm được nguồn bổ sung đủ cụ thể cho chi nhánh; không coi là đã xác minh.')
        lines.extend(['', '## Giờ chi nhánh', '',
            'Cột quan sát là giờ listing nền tảng. Cột xác nhận cần đủ 7 ngày, nhiều ca/ngày nếu có.',
            'Không suy closed từ thiếu ngày; 23:59 hoặc tên quán có 24h chưa là bằng chứng 24 giờ.', '',
            '| Ngày | Quan sát platform | Giờ physical venue đã xác nhận | Evidence |',
            '| --- | --- | --- | --- |'])
        for day in range(1, 8):
            rows = [r for r in schedules[venue_id] if r['dayOfWeek'] == day]
            intervals = '; '.join('unknown' if r['status'] == 'unknown' else
                f'{r["startTime"]}–{r["endTime"]} (+{r["endDayOffset"]})' for r in rows) or 'unknown'
            lines.append(f'| {DAYS[day-1]} | {intervals} | Chưa xác nhận | Chưa có |')
        lines.extend(['', 'Last order, overnight, ngày nghỉ/ngoại lệ: chưa xác nhận; không tự điền.', '',
            '## Menu và giờ bán từng món', '',
            'Giá dưới đây theo mục menu, chưa là giá/người hoặc một serving size đã kiểm.',
            'Mã Mxx liên kết offeringId đầy đủ trong JSON cùng tên file. Điền từng món/hình thức phục vụ.', '',
            '| Mã | Tên menu quan sát | Giá VND quan sát | Unit đã kiểm | Service mode | Lịch món/evidence |',
            '| --- | --- | --- | --- | --- | --- |'])
        for row in sheet['offerings']:
            lines.append(f'| {row["label"]} | {md(row["observedMenuName"])} | {row["observedPrice"]} | Chưa xác nhận | Chưa xác nhận | Chưa có |')
        lines.extend(['', 'Lịch món phải ghi đủ 7 ngày với start/end/endDayOffset/is24Hours và nguồn/ngày kiểm.',
            'Nếu một nhóm món bán suốt giờ quán, cần bằng chứng khẳng định rõ nhóm Mxx đó và lịch từng ngày.',
            'Khi chuyển bundle vẫn tạo lịch offering theo ownerId; không mượn scheduleId của venue.',
            'Không suy available/sold_out từ menu hoặc nhãn đóng cửa trong kết quả tìm kiếm.', '',
            '## Quyền nguồn và freshness', '',
            '- Căn cứ dùng menu/giá/địa chỉ/tọa độ/giờ, permitted uses/attribution/hạn quyền: Pending.',
            '- Không thu ảnh; artwork vẫn null. Nhãn tiện ích trên trang không tự xác nhận dine_in/takeaway.',
            '- Policy freshness chưa được chốt, validUntil chưa điền; không gán TTL theo ngày tạo phiếu.', '',
            '## Review độc lập', '',
            'Người kiểm khác người nhập, ngày kiểm, decision và evidence: **Pending**.',
            'Điền phiếu không tự publish/Approve GM-08; bổ sung facts vào candidate, validate/stage hash mới rồi review.', ''])
        (output / filename).write_text('\n'.join(lines), encoding='utf-8')
        entries.append(dict(venueId=venue_id, branchName=venue['branchName'],
            form=filename, json=filename.replace('.md', '.json'), offerings=len(observations),
            flags=note.get('flags', [])))
    report = dict(state='Pending', bundleSha256=sha, datasetVersion=bundle['datasetVersion'],
        createdAtUTC=module.now(), branches=len(entries), offerings=sum(e['offerings'] for e in entries),
        verified=False, publicationPerformed=False, independentReview='Pending', entries=entries)
    module.write_json(output / 'manifest.json', report)
    index = ['# GM-08 — Phiếu khảo sát theo chi nhánh', '',
        'User xác nhận chưa có khảo sát tại quán; tiếp tục đối chiếu công khai và chuẩn bị phiếu từng quán.', '',
        f'{report["branches"]} chi nhánh / {report["offerings"]} offering; candidate {bundle["datasetVersion"]}, SHA256 `{sha}`.',
        'Tất cả Pending. Không thay đổi candidate hoặc verified manifest, không gửi yêu cầu xác nhận ra ngoài.', '',
        '| Chi nhánh | Offering | Điểm cần ưu tiên |', '| --- | --- | --- |']
    for entry in entries:
        index.append(f'| [{md(entry["branchName"])}]({entry["form"]}) | {entry["offerings"]} | {md(", ".join(entry["flags"]) or "Giờ món/serviceMode/quyền nguồn còn thiếu")} |')
    index.extend(['', '## Sau khi nhận ghi nhận thật', '',
        '1. Lưu facts/evidence theo offeringId/venueId, xác nhận đúng chi nhánh, đủ 7 ngày và permitted uses.',
        '2. Chốt policy freshness/coverage/anchor với owner/reviewer; không biến ranh giới hành chính thành vùng đã khảo sát.',
        '3. Người nhập bổ sung bundle food1.1.0, tạo version mới, validate và stage directory mới.',
        '4. Reviewer độc lập kiểm classification/content/rights/freshness/coverage theo hash mới và evidence thật.',
        '5. Sau approval mới publish/query/idempotency/rollback DB thật và cập nhật manifest/HANDOFF.', '',
        'JSON ở đây là phiếu thu thập, không nhập thẳng vào importer và không chỉnh tay verified manifest.', ''])
    (output / 'README.md').write_text('\n'.join(index), encoding='utf-8')
    return report


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='strict', newline='\n')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--notes', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    report = prepare(args.input, args.notes, args.output_dir)
    print(json.dumps({k: report[k] for k in ('state', 'bundleSha256', 'branches', 'offerings')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
