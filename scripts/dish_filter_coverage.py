"""Coverage of the dish fields the preference filters need (ADR-024), offline and read-only.

Reads the catalogue bundle and writes:
- docs/data/DISH_FILTER_COVERAGE.md: per-filter coverage of the 39 dishes;
- data-preparation/templates/dish_filter_enrichment.csv: one row per dish with what the data has today and empty
  columns for the data team to fill (never guessed here).

Usage: python scripts/dish_filter_coverage.py [--check]
--check fails (exit 1) when the generated files are out of date.
"""
from __future__ import annotations

import csv
import io
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / 'supabase/seed/catalogue/dishes.json'
REPORT = ROOT / 'docs/data/DISH_FILTER_COVERAGE.md'
TEMPLATE = ROOT / 'data-preparation/templates/dish_filter_enrichment.csv'

# UI dish groups (mobile/src/features/context/services/dishSetupCatalogue.ts) and the catalogue families they cover.
MAIN_GROUPS = {
    'Cơm': ['family:rice'],
    'Bún / Phở': ['family:bun', 'family:pho'],
    'Mì / Miến / Hủ tiếu': ['family:noodles', 'family:mien', 'family:hu_tieu', 'family:nui'],
    'Lẩu & Nướng': [],
    'Bánh mì / Xôi': ['family:banh_mi', 'family:sticky_rice'],
    'Cháo / Súp': [],
}
SNACK_GROUPS = {
    'Đồ chiên & Xiên que': [],
    'Các loại bánh mặn': ['family:banh_bao', 'family:banh_cuon', 'family:banh_uot', 'family:banh_cuon_wrap'],
    'Món trộn & Cuốn': ['family:salad'],
    'Ốc & Hải sản': [],
    'Bánh ngọt': [],
    'Chè & Kem': [],
    'Trái cây & Đồ chua': [],
    'Đồ ăn vặt khô': [],
}
REGIONS = {'north': 'Miền Bắc', 'central': 'Miền Trung', 'south': 'Miền Nam', 'west': 'Miền Tây'}
FLAVOURS = ['spicy', 'sour', 'sweet', 'salty']


def load():
    data = json.loads(BUNDLE.read_text(encoding='utf-8'))
    entities = data['entities']
    taxonomy = {t['id']: t for t in entities['taxonomy']}
    prices = Counter(p.get('dishId') for p in entities.get('priceReferences', []))
    return data, entities['dishes'], taxonomy, prices


def groups_of(codes: set[str], groups: dict[str, list[str]]) -> list[str]:
    return [name for name, families in groups.items() if codes & set(families)]


def build():
    data, dishes, taxonomy, prices = load()
    rows = []
    for dish in dishes:
        codes = {taxonomy[c]['code'] for c in dish.get('categoryIds', []) if c in taxonomy}
        flavor = dish.get('flavor') or {}
        rows.append({
            'dish': dish,
            'codes': codes,
            'main': groups_of(codes, MAIN_GROUPS),
            'snack': groups_of(codes, SNACK_GROUPS),
            'origin': dish.get('origin') if dish.get('origin') in REGIONS else None,
            'flavor': {k: (flavor.get(k) or {}).get('present') for k in FLAVOURS},
            'meals': dish.get('mealSlots') or [],
            'temperature': dish.get('temperature') if dish.get('temperature') not in (None, 'unknown') else None,
            'artwork': bool(dish.get('artwork')),
            'prices': prices.get(dish['id'], 0),
        })
    return data, rows


def report(data, rows) -> str:
    n = len(rows)
    pct = lambda k: f'{k}/{n} ({round(100 * k / n)}%)' if n else '0/0'
    meal = Counter(m for r in rows for m in r['meals'])
    lines = [
        '# Độ phủ dữ liệu cho bộ lọc khẩu vị',
        '',
        f'Sinh bởi `python scripts/dish_filter_coverage.py` từ `supabase/seed/catalogue/dishes.json` '
        f'(dataset {data.get("datasetVersion")}, {data.get("usageScope")}). Không sửa tay; chạy lại script sau khi dữ liệu đổi.',
        '',
        '## Tổng quan',
        '',
        '| Trường | Có dữ liệu | Bộ lọc dùng |',
        '|---|---|---|',
        f'| Nhóm món (bữa chính) | {pct(sum(1 for r in rows if r["main"]))} | Loại món |',
        f'| Nhóm món (Ăn vặt) | {pct(sum(1 for r in rows if r["snack"]))} | Loại món khi chọn Ăn vặt |',
        f'| `origin` (miền) | {pct(sum(1 for r in rows if r["origin"]))} | Ẩm thực |',
        f'| `flavor` (ít nhất 1 vị đã biết) | {pct(sum(1 for r in rows if any(v is not None for v in r["flavor"].values())))} | Hương vị |',
        f'| Béo / Ngậy | 0/{n} (0%) | Hương vị |',
        f'| `mealSlots` | {pct(sum(1 for r in rows if r["meals"]))} | Chọn pool theo bữa |',
        f'| `temperature` | {pct(sum(1 for r in rows if r["temperature"]))} | Thẻ món |',
        f'| Giá quan sát | {pct(sum(1 for r in rows if r["prices"]))} | Thẻ món |',
        f'| Ảnh có quyền dùng | {pct(sum(1 for r in rows if r["artwork"]))} | Thẻ món |',
        '',
        f'Số món theo bữa: sáng {meal["breakfast"]}, trưa {meal["lunch"]}, tối {meal["dinner"]}, ăn vặt {meal["snack"]}. '
        'Một bữa cần ít nhất 10 món để tạo phòng bình thường (5 khi chấp nhận thiếu món).',
        '',
        '## Món theo từng mục lọc',
        '',
        '| Mục | Số món | Món |',
        '|---|---|---|',
    ]
    for title, groups, key in (('Bữa chính', MAIN_GROUPS, 'main'), ('Ăn vặt', SNACK_GROUPS, 'snack')):
        for name in groups:
            names = [r['dish']['name'] for r in rows if name in r[key]]
            lines.append(f'| {title} · {name} | {len(names)} | {", ".join(names) or "—"} |')
    for code, label in REGIONS.items():
        names = [r['dish']['name'] for r in rows if r['origin'] == code]
        lines.append(f'| Ẩm thực · {label} | {len(names)} | {", ".join(names) or "—"} |')
    for key, label in (('spicy', 'Cay'), ('sour', 'Chua / Chua cay'), ('sweet', 'Ngọt'), ('salty', 'Mặn / Thanh đạm')):
        names = [r['dish']['name'] for r in rows if r['flavor'][key] is True]
        lines.append(f'| Hương vị · {label} | {len(names)} | {", ".join(names) or "—"} |')
    unmatched = [r['dish']['name'] for r in rows if not r['main'] and not r['snack']]
    lines += ['', f'Món chưa thuộc nhóm nào: {", ".join(unmatched) or "không có"}.', '']
    return '\n'.join(lines)


def template(rows) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator='\n')
    writer.writerow(['dishId', 'name', 'currentFamilies', 'currentGroups', 'currentMealSlots', 'currentOrigin',
                     'fillGroup', 'fillMealSlots', 'fillOrigin', 'fillSpicy', 'fillSour', 'fillSweet', 'fillSalty',
                     'fillFatty', 'fillTemperature', 'sourceRef', 'note'])
    for r in sorted(rows, key=lambda r: r['dish']['name']):
        writer.writerow([r['dish']['id'], r['dish']['name'], ' '.join(sorted(r['codes'])),
                         ' | '.join(r['main'] + r['snack']), ' '.join(r['meals']), r['origin'] or '',
                         '', '', '', '', '', '', '', '', '', '', ''])
    return out.getvalue()


def main() -> int:
    data, rows = build()
    outputs = {REPORT: report(data, rows), TEMPLATE: template(rows)}
    if '--check' in sys.argv:
        stale = [str(p.relative_to(ROOT)) for p, text in outputs.items() if not p.exists() or p.read_text(encoding='utf-8') != text]
        if stale:
            print('out of date:', ', '.join(stale))
            return 1
        print('dish filter coverage up to date')
        return 0
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8', newline='\n')
        print('wrote', path.relative_to(ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
