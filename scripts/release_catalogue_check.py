"""Check a catalogue bundle against the release v1 floor in docs/data/RELEASE_V1_CATALOGUE_SPEC.md.

Usage:
  python scripts/release_catalogue_check.py [--bundle <dishes.json>] [--json <report.json>]

Exit 0 only when every required threshold passes. Offline: reads the bundle, never the network or a database.
Counting rules (same as the app filters and scripts/dish_filter_coverage.py):
- a dish belongs to a meal when its mealSlots contains that meal;
- a dish belongs to a display group when it has ANY family of the group; main groups count dishes that have a
  non-snack meal, snack groups count dishes that have the snack meal;
- a dish belongs to a region when cuisineIds contains the region ID;
- flavours: Cay = spicy.present, Chua / Chua cay = sour.present, Ngọt = sweet.present, Béo / Ngậy = fatty.present,
  Mặn / Đậm đà = salty.present with intensity medium or high, Thanh đạm = salty.present with intensity low.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import dish_filter_coverage as cov  # noqa: E402

DEFAULT_BUNDLE = ROOT.parent / 'supabase/seed/catalogue/gm41/dishes.json'

# Floor set by Trí on 2026-11-21 for the store release. Keep in sync with RELEASE_V1_CATALOGUE_SPEC.md.
FLOOR = {
    'total': 250,
    'meal': {'breakfast': 60, 'lunch': 60, 'dinner': 60, 'snack': 80},
    'group': 10,
    'region': 25,
    'flavour': 15,
    'description_ratio': 1.0,
    'artwork_ratio': 1.0,
}
ADVISORY = {'price_ratio': 0.8}
RIGHTS = {'licensed', 'public_domain', 'granted'}
# Spec section 5: a shared category illustration is told apart from a dish photo by its attribution prefix.
ILLUSTRATION_PREFIX = 'Ảnh minh họa nhóm'


def flavour_hits(flavor: dict | None) -> set[str]:
    flavor = flavor or {}
    present = lambda key: (flavor.get(key) or {}).get('present') is True
    intensity = (flavor.get('salty') or {}).get('intensity')
    hits = {label for label, key in (('Cay', 'spicy'), ('Chua / Chua cay', 'sour'), ('Ngọt', 'sweet'),
                                    ('Béo / Ngậy', 'fatty')) if present(key)}
    if present('salty') and intensity in ('medium', 'high'):
        hits.add('Mặn / Đậm đà')
    if present('salty') and intensity == 'low':
        hits.add('Thanh đạm')
    return hits


def artwork_ok(artwork: dict | None) -> bool:
    if not artwork or not artwork.get('url') or artwork.get('usageRights') not in RIGHTS or not artwork.get('license'):
        return False
    return bool(artwork.get('attribution')) or artwork.get('usageRights') == 'public_domain'


def is_illustration(artwork: dict | None) -> bool:
    return artwork_ok(artwork) and (artwork.get('attribution') or '').startswith(ILLUSTRATION_PREFIX)


def evaluate(bundle: Path) -> dict:
    data, rows = cov.build(bundle)
    n = len(rows)
    results: list[dict] = []

    def need(name: str, actual, floor, passed: bool | None = None, names: list[str] | None = None):
        ok = actual >= floor if passed is None else passed
        entry = {'check': name, 'actual': actual, 'required': floor, 'pass': ok}
        if names:
            entry['examples'] = names[:15]
        results.append(entry)

    need('Tổng số món', n, FLOOR['total'])
    for meal, floor in FLOOR['meal'].items():
        need(f'Bữa {meal}', sum(meal in r['meals'] for r in rows), floor)
    for label in cov.MAIN_GROUPS:
        need(f'Nhóm bữa chính · {label}', sum(label in r['main'] and bool(set(r['meals']) - {'snack'}) for r in rows), FLOOR['group'])
    for label in cov.SNACK_GROUPS:
        need(f'Nhóm ăn vặt · {label}', sum(label in r['snack'] and 'snack' in r['meals'] for r in rows), FLOOR['group'])
    for code, label in cov.REGIONS.items():
        need(f'Miền · {label}', sum(code in r['regions'] for r in rows), FLOOR['region'])
    for label in ('Cay', 'Chua / Chua cay', 'Ngọt', 'Mặn / Đậm đà', 'Thanh đạm', 'Béo / Ngậy'):
        need(f'Vị · {label}', sum(label in flavour_hits(r['dish'].get('flavor')) for r in rows), FLOOR['flavour'])

    no_meal = [r['dish']['name'] for r in rows if not r['meals']]
    need('Món thiếu mealSlots', len(no_meal), 0, passed=not no_meal, names=no_meal)
    no_group = [r['dish']['name'] for r in rows
                if not ((r['main'] and set(r['meals']) - {'snack'}) or (r['snack'] and 'snack' in r['meals']))]
    need('Món không thuộc nhóm hiển thị nào', len(no_group), 0, passed=not no_group, names=no_group)
    no_desc = [r['dish']['name'] for r in rows if not (r['dish'].get('description') or '').strip()]
    need('Món có mô tả', n - len(no_desc), n, passed=n > 0 and len(no_desc) <= n * (1 - FLOOR['description_ratio']), names=no_desc)
    no_art = [r['dish']['name'] for r in rows if not artwork_ok(r['dish'].get('artwork'))]
    need('Món có ảnh hợp lệ (url, quyền, license, ghi công)', n - len(no_art), n,
         passed=n > 0 and len(no_art) <= n * (1 - FLOOR['artwork_ratio']), names=no_art)

    illustrated = sum(is_illustration(r['dish'].get('artwork')) for r in rows)
    advisory = {
        'Món có ảnh chụp hợp lệ': {'actual': n - len(no_art) - illustrated, 'target': None},
        'Món dùng ảnh minh họa nhóm': {'actual': illustrated, 'target': None},
        'Món có giá quan sát': {'actual': sum(r['prices'] > 0 for r in rows), 'target': round(ADVISORY['price_ratio'] * n)},
        'Món có nhiệt độ': {'actual': sum(bool(r['temperature']) for r in rows), 'target': None},
    }
    return {
        'bundle': bundle.resolve().relative_to(ROOT.parent).as_posix() if bundle.resolve().is_relative_to(ROOT.parent) else str(bundle),
        'datasetVersion': data.get('datasetVersion'), 'usageScope': data.get('usageScope'),
        'pass': all(r['pass'] for r in results), 'checks': results, 'advisory': advisory,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--bundle', type=Path, default=DEFAULT_BUNDLE)
    parser.add_argument('--json', type=Path, help='write the full report as JSON')
    args = parser.parse_args()
    report = evaluate(args.bundle)
    print(f"Bundle {report['bundle']} · dataset {report['datasetVersion']} · {report['usageScope']}")
    for r in report['checks']:
        mark = 'PASS' if r['pass'] else 'FAIL'
        line = f"{mark}  {r['check']}: {r['actual']} (cần {r['required']})"
        if not r['pass'] and r.get('examples'):
            line += ' · ví dụ: ' + ', '.join(r['examples'])
        print(line)
    for name, a in report['advisory'].items():
        print(f"INFO  {name}: {a['actual']}" + (f" (mục tiêu {a['target']})" if a['target'] else ''))
    failed = sum(not r['pass'] for r in report['checks'])
    print('Release catalogue floor: ' + ('PASS' if report['pass'] else f'FAIL ({failed} mục chưa đạt)'))
    if args.json:
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return 0 if report['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
