"""Coverage of the dish fields the preference filters need (ADR-024), offline and read-only.

Reads the catalogue bundle and writes:
- docs/data/DISH_FILTER_COVERAGE.md: per-filter coverage of the 39 dishes;
- data-preparation/templates/dish_filter_enrichment.csv: one row per dish with what the data has today and empty
  columns for the data team to fill (never guessed here). Validate a filled copy with
  `python data-preparation/scripts/filter_taxonomy.py --validate <csv>`.

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
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import filter_taxonomy as ft  # noqa: E402
BUNDLE = ROOT / 'supabase/seed/catalogue/dishes.json'
REPORT = ROOT / 'docs/data/DISH_FILTER_COVERAGE.md'
TEMPLATE = ROOT / 'data-preparation/templates/dish_filter_enrichment.csv'

# Dish groups and regions come from the single source of truth (data-preparation/scripts/filter_taxonomy.py).
MAIN_GROUPS = {label: members for _, label, members in ft.MAIN_GROUPS}
SNACK_GROUPS = {label: members for _, label, members in ft.SNACK_GROUPS}
REGIONS = {code: label for code, (label, _) in ft.REGIONS.items()}
REGION_BY_ID = {ft.region_id(code): code for code in REGIONS}
LEGACY_ORIGIN = {origin: code for code, (_, origin) in ft.REGIONS.items()}
FLAVOURS = ['spicy', 'sour', 'sweet', 'salty', 'fatty']


def load():
    data = json.loads(BUNDLE.read_text(encoding='utf-8'))
    entities = data['entities']
    taxonomy = {t['id']: t for t in entities['taxonomy']}
    prices = Counter(p.get('dishId') for p in entities.get('priceReferences', []))
    return data, entities['dishes'], taxonomy, prices


def groups_of(codes: set[str], groups: dict[str, list[str]]) -> list[str]:
    # A dish is in a group when it has ANY family of the group (one dish can be in several groups).
    return [name for name, families in groups.items() if codes & {f'family:{f}' for f in families}]


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
            'regions': sorted({REGION_BY_ID[c] for c in dish.get('cuisineIds', []) if c in REGION_BY_ID}
                              | ({LEGACY_ORIGIN[dish['origin']]} if dish.get('origin') in LEGACY_ORIGIN else set())),
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
        f'| Miền (`cuisineIds` miền hoặc `origin` cũ) | {pct(sum(1 for r in rows if r["regions"]))} | Ẩm thực |',
        f'| `flavor` (ít nhất 1 vị đã biết) | {pct(sum(1 for r in rows if any(v is not None for v in r["flavor"].values())))} | Hương vị |',
        f'| Béo / Ngậy (`flavor.fatty`) | {pct(sum(1 for r in rows if r["flavor"]["fatty"] is not None))} | Hương vị |',
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
        names = [r['dish']['name'] for r in rows if code in r['regions']]
        lines.append(f'| Ẩm thực · {label} | {len(names)} | {", ".join(names) or "—"} |')
    for key, label in (('spicy', 'Cay'), ('sour', 'Chua / Chua cay'), ('sweet', 'Ngọt'), ('salty', 'Mặn / Thanh đạm'), ('fatty', 'Béo / Ngậy')):
        names = [r['dish']['name'] for r in rows if r['flavor'][key] is True]
        lines.append(f'| Hương vị · {label} | {len(names)} | {", ".join(names) or "—"} |')
    multi = lambda key, minimum=2: sum(1 for r in rows if len(r[key]) >= minimum)
    lines += ['', f'Món đa nhãn (≥ 2 giá trị): bữa {multi("meals")}/{n}, nhóm món {sum(1 for r in rows if len(r["main"]) + len(r["snack"]) >= 2)}/{n}, miền {multi("regions")}/{n}. '
              'Một món được thuộc nhiều bữa, nhiều nhóm, nhiều miền và nhiều vị; ghi đủ mọi giá trị có nguồn.']
    unmatched = [r['dish']['name'] for r in rows if not r['main'] and not r['snack']]
    lines += ['', f'Món chưa thuộc nhóm nào: {", ".join(unmatched) or "không có"}.', '']
    return '\n'.join(lines)


def template(rows) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator='\n')
    # Several values go in one cell separated by spaces. Codes: families from taxonomy_v1 + filter_taxonomy_v2,
    # regions vi_north vi_central vi_south vi_west, meals breakfast lunch dinner snack,
    # flavours kind=level (spicy sour sweet salty fatty; level present none low medium high unknown).
    writer.writerow(['dishId', 'name', 'currentFamilies', 'currentGroups', 'currentMealSlots', 'currentRegions',
                     'fillFamilies', 'fillMealSlots', 'fillRegions', 'fillFlavors', 'fillTemperature', 'sourceRef', 'note'])
    for r in sorted(rows, key=lambda r: r['dish']['name']):
        writer.writerow([r['dish']['id'], r['dish']['name'], ' '.join(sorted(c.replace('family:', '') for c in r['codes'] if c.startswith('family:'))),
                         ' | '.join(r['main'] + r['snack']), ' '.join(r['meals']), ' '.join(r['regions']),
                         '', '', '', '', '', '', ''])
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
