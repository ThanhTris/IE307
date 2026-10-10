"""Source-backed draft curation; offline replay never imports the GPT pipeline."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from base_catalogue import BASE, load_json, read_csv, stable_id, write_csv
import data_contract as dc

CONFIG = BASE / 'config/editorial_catalogue_v1.json'
SOURCE_EVIDENCE = BASE / 'config/editorial_source_evidence_v1.json'
IMAGE_EVIDENCE = BASE / 'config/editorial_image_candidates_v1.json'
OUTPUT = BASE / 'snapshots/editorial-v0.2.0'
CACHE = BASE / 'datasets/editorial-catalogue/raw'


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def load_checked(path, expected):
    if sha256(path) != expected:
        raise ValueError(f'Snapshot checksum mismatch: {Path(path).name}')
    return load_json(path)


def refresh_metadata(requests, cache=CACHE, *, opener=urlopen, pause=time.sleep):
    """Explicit refresh only. Sequential, bounded, stop on 403/429; no auto retry.

    Saves response bytes and retrieval metadata, including failed attempts. Does
    not promote new content into the editorial config or approve an image.
    """
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    journal = []
    for entry in requests:
        url = entry['url']
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or parsed.hostname not in {'commons.wikimedia.org', 'en.wikipedia.org'}:
            raise ValueError('Refresh is restricted to configured Wikimedia metadata HTTPS endpoints')
        if parsed.path != '/w/api.php':
            raise ValueError('Refresh fetches metadata only, never image binaries')
        checked = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        key = hashlib.sha256(url.encode()).hexdigest()
        item = {'key': entry['key'], 'url': url, 'checkedAt': checked}
        try:
            request = Request(url, headers={'User-Agent': 'Anyfood-GM03-research/0.2 (manual metadata refresh)'})
            with opener(request, timeout=30) as response:
                raw = response.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError('Metadata response exceeds 4 MiB')
            decoded = json.loads(raw)
            if 'error' in decoded:
                raise ValueError(f'Wikimedia API error: {decoded["error"].get("code", "unknown")}')
            filename = f'refresh-{key}-{hashlib.sha256(raw).hexdigest()}.json'
            (cache / filename).write_bytes(raw)
            item.update(status='ok', file=filename, sha256=sha256(cache / filename))
        except HTTPError as exc:
            item.update(status='error', httpStatus=exc.code)
            journal.append(item)
            save_json(cache / 'refresh_journal.json', journal)
            if exc.code in {403, 429}:
                break
            pause(2)
            continue
        except (OSError, ValueError) as exc:
            item.update(status='error', error=type(exc).__name__)
        journal.append(item)
        save_json(cache / 'refresh_journal.json', journal)
        pause(2)
    return journal


def load_inputs():
    cfg = load_json(CONFIG)
    evidence = load_checked(SOURCE_EVIDENCE, cfg['inputChecksums'][SOURCE_EVIDENCE.name])
    images = load_checked(IMAGE_EVIDENCE, cfg['inputChecksums'][IMAGE_EVIDENCE.name])
    for capture in evidence['rawCaptures']:
        filename = capture['file']
        if Path(filename).name != filename:
            raise ValueError('Invalid cache filename')
        path = CACHE / filename
        # Extracted evidence is tracked so a fresh clone can replay without raw
        # captures. If an original capture exists, reject any checksum drift.
        if path.exists() and sha256(path) != capture['sha256']:
            raise ValueError(f'Raw cache changed: {filename}')
    for filename, expected in cfg['snapshotChecksums'].items():
        if sha256(BASE / 'snapshots' / filename) != expected:
            raise ValueError(f'Original snapshot changed: {filename}')
    bases = read_csv(BASE / 'snapshots/thu_duc_base_dishes.csv')
    for row in bases:
        for key in ['sourceDishIds', 'sourceNames', 'sourceProfiles', 'menuOfferings']:
            row[key] = json.loads(row[key])
    return bases, cfg, evidence, images


def common(source=None, checked=None):
    return dict(version=1, reviewStatus='draft', sourceRef=source, fieldSources={},
                checkedAt=checked, validUntil=None, enteredBy='gm03-editorial-agent', reviewedBy=None)


def source_record(key, locator, checked=None, rights='unknown', license=None, attribution=None):
    return dict(common(checked=checked), sourceRef=stable_id('dataSources', key), locator=locator,
                usageRights=rights, license=license, attribution=attribution, status='draft')


def build(bases, cfg, evidence, images):
    """No fuzzy grouping or inferred model values: all amendments are per UUID."""
    entries = cfg['dishes']
    if (cfg['datasetVersion'], cfg['contractVersion'], cfg['status']) != ('0.2.0', '1.0.0', 'draft'):
        raise ValueError('Unexpected editorial contract/version/status')
    base_ids = {r['id'] for r in bases}
    if len(bases) != 39 or len(base_ids) != 39 or len(entries) != 39 or {r['id'] for r in entries} != base_ids:
        raise ValueError('Curation must cover exactly the frozen 39 unique dish IDs')
    if len({r['id'] for r in entries}) != len(entries):
        raise ValueError('Duplicate editorial ID')
    edits = {r['id']: r for r in entries}
    source_index = {}
    for src in evidence['sources']:
        if src['key'] in source_index:
            raise ValueError('Duplicate source key')
        source_index[src['key']] = source_record(src['key'], src['url'], src['checkedAt'],
                                                 src.get('usageRights', 'unknown'), src.get('license'), src.get('attribution'))
    tax_registry = load_json(BASE / 'config/taxonomy_registry_v1.json')['entries']
    tax_index = {(r['type'], r['code']): r for r in tax_registry}
    taxonomy_used = set()
    dishes, prices, field_evidence, image_rows = [], [], [], []
    seen_menu = set()
    image_map = {r['dishId']: r for r in images['dishes']}
    if set(image_map) != base_ids or len(images['dishes']) != 39:
        raise ValueError('Image review table must cover 39 unique IDs')
    for base in bases:
        edit = edits[base['id']]
        if edit['name'] != base['name']:
            raise ValueError('Editorial label changed without source mapping review')
        refs = edit['evidence']
        menu_ids = {o['menu_item_id'] for o in base['menuOfferings']}
        for field, proof in refs.items():
            if proof['sourceKey'] not in source_index or not proof['note'].strip():
                raise ValueError(f'Missing field source: {base["name"]}/{field}')
            if set(proof.get('menuItemIds', [])) - menu_ids:
                raise ValueError('Field evidence points to another dish menu')
            if proof['basis'] not in {'menu_scope', 'reference', 'owner_grouping'}:
                raise ValueError('Model guesses cannot become editorial evidence')
            field_evidence.append(dict(dishId=base['id'], dishName=base['name'], field=field,
                                       sourceRef=source_index[proof['sourceKey']]['sourceRef'], **proof))
        for field in ['name', 'categoryCodes']:
            if field not in refs:
                raise ValueError(f'{field} needs explicit evidence')
        for field in ['description', 'aliases', 'cuisineCodes', 'mealSlots', 'timeHints', 'ingredientTags', 'flavor']:
            if edit.get(field) and field not in refs:
                raise ValueError(f'{field} needs explicit evidence')
        for field in ['temperature', 'origin']:
            if edit[field] not in [None, 'unknown'] and field not in refs:
                raise ValueError(f'{field} needs explicit evidence')
        if edit.get('ingredientTags') is not None:
            raise ValueError('Ingredient verification is outside this pilot; retain null')
        ids = {}
        for field, kind in [('cuisineCodes', 'cuisine'), ('categoryCodes', 'category')]:
            ids[field] = []
            for code in edit[field]:
                tax = tax_index[(kind, code)]
                ids[field].append(tax['id'])
                taxonomy_used.add((kind, code))
        primary = source_index[refs['name']['sourceKey']]['sourceRef']
        groups = {'name': primary, 'taxonomy': source_index[refs['categoryCodes']['sourceKey']]['sourceRef']}
        if edit['description']:
            groups['description'] = source_index[refs['description']['sourceKey']]['sourceRef']
        # Contract permits one source per group; field_evidence.csv supplies precise
        # per-field references when cuisine/temperature use a different source.
        dish = dict(common(primary, cfg['editedAt']), id=base['id'], version=int(base['version']) + 1,
                    name=base['name'], description=edit['description'], aliases=edit['aliases'],
                    cuisineIds=ids['cuisineCodes'], categoryIds=ids['categoryCodes'],
                    mealSlots=edit['mealSlots'], timeHints=edit['timeHints'], origin=edit['origin'],
                    ingredientTags=None, temperature=edit['temperature'], flavor=edit['flavor'],
                    artwork=None, classificationStatus='needs_review', sourceDishIds=base['sourceDishIds'], status='draft')
        dish['fieldSources'] = groups
        review = image_map[base['id']]
        for candidate in review['candidates']:
            image_rows.append(dict(dishId=base['id'], dishName=base['name'], searchStatus=review['searchStatus'], **candidate))
        if not review['candidates']:
            image_rows.append(dict(dishId=base['id'], dishName=base['name'], searchStatus=review['searchStatus'],
                                   status='no_eligible_image', reason=review['reason']))
        selected = [c for c in review['candidates'] if c['status'] == 'selected']
        if len(selected) > 1:
            raise ValueError('Multiple selected artworks')
        if selected:
            c = selected[0]
            required = ['fileUrl', 'pageUrl', 'author', 'license', 'licenseUrl', 'attribution', 'revision', 'checkedAt', 'visualNote', 'visualCheckedAt']
            if any(not c.get(k) for k in required) or not c.get('filePageCheckedAt'):
                raise ValueError('Artwork needs visual and per-file license evidence')
            if c['license'] not in ['CC0', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0']:
                raise ValueError('Unsupported image license in this pilot')
            key = 'commons-file:' + c['pageUrl']
            src = source_record(key, c['pageUrl'], c['checkedAt'], 'licensed', c['license'], c['attribution'])
            source_index[key] = src
            dish['artwork'] = dict(url=c['fileUrl'], sourceRef=src['sourceRef'], usageRights='licensed', license=c['license'], attribution=c['attribution'])
            dish['fieldSources']['image'] = src['sourceRef']
        dishes.append(dish)
        for item in base['menuOfferings']:
            key = item['menu_item_id']
            if key in seen_menu:
                raise ValueError('Duplicate menu item across dishes')
            seen_menu.add(key)
            source_key = 'menu:' + item['source_id']
            if source_key not in source_index:
                source_index[source_key] = source_record(source_key, item['source_url'],
                    datetime.fromisoformat(item['checked_at']).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
            prices.append(dict(dishId=base['id'], dishName=base['name'], menuItemId=key,
                venueSurveyId=item['venue_id'], venueName=item['venue_name'], address=item['address'],
                menuName=item['menu_name_raw'], priceRaw=item['price_raw'], priceValue=item['price_value'],
                currency=item['currency'], unit=item['price_unit'], sourceRef=source_index[source_key]['sourceRef'],
                sourceSurveyId=item['source_id'], sourceUrl=item['source_url'], checkedAt=item['checked_at'],
                snapshotSha256=item['snapshot_sha256'], platform=item['platform'], status='snapshot_observation',
                validUntil=None, portion=None))
    if len(prices) != 247:
        raise ValueError('Expected all 247 frozen mapped menu items')
    validate_prices(bases, prices)
    bundle = dict(contractVersion='1.0.0', datasetVersion='0.2.0', fixtureOnly=False,
                  entities={name: [] for name in dc.ENTITIES})
    bundle['entities']['dishes'] = dishes
    taxonomy_source = source_index['taxonomy-contract']['sourceRef']
    for kind, code in sorted(taxonomy_used):
        t = tax_index[(kind, code)]
        bundle['entities']['taxonomy'].append(dict(common(taxonomy_source, cfg['editedAt']),
            id=t['id'], version=t['version'], type=kind, code=code, label=t['label'], description=None,
            status='draft', origin=None))
    bundle['entities']['dataSources'] = sorted(source_index.values(), key=lambda r: r['sourceRef'])
    bundle['entities']['datasetVersions'] = [dict(common(primary, cfg['editedAt']),
        id=stable_id('datasetVersions', 'editorial:0.2.0'), datasetVersion='0.2.0', contractVersion='1.0.0',
        status='draft', checksum=None, artifactLocator='data-preparation/snapshots/editorial-v0.2.0/catalogue.json',
        previousVersionId=None, qualityReport='data-preparation/snapshots/editorial-v0.2.0/QUALITY_REPORT.md',
        rollbackLocator='data-preparation/snapshots/thu_duc_base_dishes.csv')]
    errors = dc.validate(bundle)
    if errors:
        raise ValueError(errors)
    return bundle, prices, image_rows, field_evidence


def validate_prices(bases, prices):
    """Validate every price observation against its source, never aggregate."""
    original = {o['menu_item_id']: (b['id'], o) for b in bases for o in b['menuOfferings']}
    if len(prices) != len(original) or len({r['menuItemId'] for r in prices}) != len(prices):
        raise ValueError('Price table lost or duplicated source items')
    fields = {'venueSurveyId': 'venue_id', 'venueName': 'venue_name', 'address': 'address',
              'menuName': 'menu_name_raw', 'priceRaw': 'price_raw', 'priceValue': 'price_value',
              'currency': 'currency', 'unit': 'price_unit', 'sourceSurveyId': 'source_id',
              'sourceUrl': 'source_url', 'checkedAt': 'checked_at', 'snapshotSha256': 'snapshot_sha256',
              'platform': 'platform'}
    for r in prices:
        if r['menuItemId'] not in original:
            raise ValueError('Price has no original menu item')
        base_id, o = original[r['menuItemId']]
        if r['dishId'] != base_id or any(r[k] != o[v] for k, v in fields.items()):
            raise ValueError('Price observation differs from original source/branch')
        if r['portion'] is not None or r['validUntil'] is not None:
            raise ValueError('Do not invent portion or expiry')
        if r['priceValue'] not in [None, '']:
            try:
                amount = Decimal(r['priceValue'])
            except InvalidOperation as exc:
                raise ValueError('Invalid price') from exc
            if not amount.is_finite() or amount < 0 or not r['unit'] or not r['currency']:
                raise ValueError('Price must be finite, nonnegative, with source unit/currency')


def quality(bundle, prices, image_rows):
    dishes = bundle['entities']['dishes']
    fields = ['description', 'aliases', 'cuisineIds', 'categoryIds', 'mealSlots', 'timeHints', 'artwork', 'ingredientTags', 'flavor']
    counts = {k: sum(bool(r[k]) for r in dishes) for k in fields}
    counts.update(temperature=sum(r['temperature'] not in [None, 'unknown'] for r in dishes),
                  origin=sum(r['origin'] not in [None, 'unknown'] for r in dishes))
    tax = {r['id']: r for r in bundle['entities']['taxonomy']}
    return dict(dishes=len(dishes), populated=counts,
        categoryCounts=dict(sorted(Counter(tax[k]['code'] for r in dishes for k in r['categoryIds']).items())),
        cuisineCounts=dict(sorted(Counter(tax[k]['code'] for r in dishes for k in r['cuisineIds']).items())),
        mealCounts=dict(sorted(Counter(k for r in dishes for k in r['mealSlots']).items())),
        missingDescriptions=[r['name'] for r in dishes if not r['description']],
        imageStatuses=dict(Counter(r['status'] for r in image_rows)), prices=len(prices),
        knownPrices=sum(p['priceValue'] not in [None, ''] for p in prices),
        venues=len({p['venueSurveyId'] for p in prices}),
        imageCandidates=sum(bool(p.get('fileUrl')) for p in image_rows),
        mapping=dict(Counter(r['status'] for r in read_csv(BASE / 'snapshots/source_to_base_mapping.csv'))),
        apiCallsDuringReplay=0, status='draft', target='60–80', expansionRequired=True)


def export(bundle, prices, image_rows, field_evidence, cfg, out=OUTPUT):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    save_json(out / 'catalogue.json', bundle)
    dc.write_csv_bundle(bundle, out / 'csv')
    for filename, rows in [('price_references.csv', prices), ('image_references.csv', image_rows), ('field_evidence.csv', field_evidence)]:
        fields = list(dict.fromkeys(k for r in rows for k in r))
        normalized = [{k: r.get(k) for k in fields} for r in rows]
        write_csv(out / filename, normalized, fields)
    if dc.read_csv_bundle(out / 'csv') != bundle:
        raise ValueError('CSV/JSON mismatch')
    stats = quality(bundle, prices, image_rows)
    save_json(out / 'quality.json', stats)
    missing = '\n'.join(f'| {r["name"]} | {"có" if r["description"] else "thiếu"} | {"có" if r["cuisineIds"] else "unknown"} | {", ".join(r["mealSlots"]) or "unknown"} | {r["temperature"]} | {"có" if r["artwork"] else "thiếu"} |'
                        for r in bundle['entities']['dishes'])
    report = f'''# Catalogue biên tập 0.2.0 — báo cáo chất lượng

Phạm vi: mẫu menu Thủ Đức cũ, 39 món gốc; **chưa đạt mục tiêu 60–80**. Draft, contract 1.0.0, bản ghi món version 2, chưa review độc lập. Không seed/publish hoặc chứng minh quán đang bán. GM-03 vẫn chờ GM-28; nơi bán đủ điều kiện thuộc GM-27.

- Mô tả: {stats['populated']['description']}/39; category: {stats['populated']['categoryIds']}/39; cuisine: {stats['populated']['cuisineIds']}/39.
- Meal slots: {stats['populated']['mealSlots']}/39; nhiệt độ: {stats['populated']['temperature']}/39; nguồn gốc: {stats['populated']['origin']}/39; vị: {stats['populated']['flavor']}/39.
- Alias: {stats['populated']['aliases']}/39; ingredientTags: 0/39. Không tự suy thành phần/an toàn dị ứng.
- Cuisine theo mã (đa nhãn): {stats['cuisineCounts']}. Meal slots: {stats['mealCounts']}. Category theo mã (đa nhãn): {stats['categoryCounts']}.
- Ảnh đã chọn đủ kiểm nội dung và license: {stats['populated']['artwork']}/39; {stats['imageCandidates']} ứng viên metadata. Wikimedia trả 429/403, chưa xem được ảnh; metadata có license không đủ để chọn artwork. Có ứng viên sai món/PDF bị loại. Giá: {stats['knownPrices']}/{stats['prices']} quan sát có giá, {stats['venues']} chi nhánh; đơn vị giữ theo nguồn, chưa biết khẩu phần.
- Mapping: {stats['mapping']}; thông tin chi tiết/giá/ảnh menu gốc giữ nguyên trong snapshot offering. Không tính giá chung/giá mỗi người.
- Phân loại theo nhóm owner/menu và nguồn tham khảo; tất cả classificationStatus=needs_review. field_evidence.csv dẫn từng trường; fieldSources taxonomy chỉ là nguồn nhóm, không thay bảng bằng chứng chi tiết. Nhãn GPT không được chuyển thành dữ liệu verified.
- JSON/11 CSV theo contract; venue/offering/lịch/coverage/anchor arrays rỗng. Giá tham chiếu không phải entity nơi bán đã đủ freshness/lịch. validUntil/reviewedBy=null. Quyền menu unknown. Checksum artifact trong manifest tránh vòng tự băm; datasetVersions.checksum=null (draft).

| Món | Mô tả | Cuisine | Buổi ăn | Nhiệt độ | Artwork |
| --- | --- | --- | --- | --- | --- |
{missing}

Nguồn và license ứng viên: image_references.csv; kiểm từng file theo [Commons reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia). Chưa tải ảnh vào assets. Nội dung mô tả menu nêu phạm vi nhóm, không khẳng định mọi biến thể có cùng nguyên liệu/cách phục vụ. Nguồn web tham khảo là evidence draft, chưa bằng chứng reviewer Approved. Kết quả kiểm bằng Python runner, chưa chạy trực tiếp Jupyter kernel.
'''
    (out / 'QUALITY_REPORT.md').write_text(report, encoding='utf-8')
    files = {str(p.relative_to(out)): {'sha256': sha256(p), 'bytes': p.stat().st_size}
             for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'manifest.json'}
    save_json(out / 'manifest.json', dict(datasetVersion='0.2.0', contractVersion='1.0.0',
        status='draft', editedAt=cfg['editedAt'], sourceSnapshots=cfg['snapshotChecksums'],
        evidenceInputs=cfg['inputChecksums'], configSha256=sha256(CONFIG), files=files, statistics=stats))
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    bases, cfg, evidence, images = load_inputs()
    bundle, prices, image_rows, field_evidence = build(bases, cfg, evidence, images)
    print(json.dumps(export(bundle, prices, image_rows, field_evidence, cfg, args.output), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
