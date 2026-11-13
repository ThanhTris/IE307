"""Filter taxonomy for the preference screen (ADR-024 / ADR-025), offline and read-only.

One dish can carry many values for every filter: several meals (`mealSlots`), several dish families
(`categoryIds`), several regions (`cuisineIds`) and several flavours (`flavor`, including `fatty`).
This script is the single source of truth for:
- the extra taxonomy codes the filters need on top of `taxonomy_v1.json` (which stays pinned by the GM-40 manifest);
- which families make up each dish group on the screen, and the region cuisines;
- the IDs, generated with the same `stable_id` as every other taxonomy entry, so data and app always agree.

It writes `data-preparation/config/filter_taxonomy_v2.json` and the app file
`mobile/src/features/context/services/filterGroups.generated.ts`, and validates enrichment CSVs.

Usage:
  python data-preparation/scripts/filter_taxonomy.py --write
  python data-preparation/scripts/filter_taxonomy.py --check
  python data-preparation/scripts/filter_taxonomy.py --validate data-preparation/templates/dish_filter_enrichment.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from base_catalogue import stable_id  # noqa: E402

CONFIG = ROOT / 'data-preparation/config/filter_taxonomy_v2.json'
APP_FILE = ROOT / 'mobile/src/features/context/services/filterGroups.generated.ts'
V1 = ROOT / 'data-preparation/config/taxonomy_v1.json'

NEW_FAMILIES = {
    'grill': 'nướng', 'soup': 'súp', 'skewer': 'xiên que', 'fried_snack': 'đồ chiên',
    'savory_cake': 'bánh mặn', 'snail_seafood': 'ốc và hải sản', 'sweet_cake': 'bánh ngọt',
    'che': 'chè', 'ice_cream': 'kem', 'fruit_pickle': 'trái cây và đồ chua', 'dry_snack': 'đồ ăn vặt khô',
}
REGIONS = {  # cuisine code -> (label, legacy `origin` value)
    'vi_north': ('Miền Bắc', 'north'), 'vi_central': ('Miền Trung', 'central'),
    'vi_south': ('Miền Nam', 'south'), 'vi_west': ('Miền Tây', 'west'),
}
# UI code (icon key) -> label and the families that make the group; the first family is the group's main ID.
MAIN_GROUPS = [
    ('family:rice', 'Cơm', ['rice']),
    ('family:bun', 'Bún / Phở', ['bun', 'pho']),
    ('family:noodles', 'Mì / Miến / Hủ tiếu', ['noodles', 'mien', 'hu_tieu', 'nui', 'banh_canh']),
    ('family:hotpot', 'Lẩu & Nướng', ['hotpot', 'grill']),
    ('family:banh_mi', 'Bánh mì / Xôi', ['banh_mi', 'sticky_rice']),
    ('family:porridge', 'Cháo / Súp', ['porridge', 'soup']),
]
SNACK_GROUPS = [
    ('snack:fried', 'Đồ chiên & Xiên que', ['fried_snack', 'fried_chicken', 'skewer']),
    ('snack:savory_cake', 'Các loại bánh mặn', ['banh_bao', 'banh_cuon', 'banh_uot', 'banh_cuon_wrap', 'savory_cake']),
    ('snack:mixed', 'Món trộn & Cuốn', ['salad', 'rolls']),
    ('snack:seafood', 'Ốc & Hải sản', ['snail_seafood']),
    ('snack:sweet_cake', 'Bánh ngọt', ['sweet_cake']),
    ('snack:che', 'Chè & Kem', ['che', 'ice_cream']),
    ('snack:fruit', 'Trái cây & Đồ chua', ['fruit_pickle']),
    ('snack:dry', 'Đồ ăn vặt khô', ['dry_snack']),
]
FLAVOURS = {  # screen choice -> how it is stored in `flavor`
    'Cay': 'spicy present', 'Chua / Chua cay': 'sour present', 'Ngọt': 'sweet present',
    'Mặn / Đậm đà': 'salty present, intensity medium or high', 'Thanh đạm': 'salty present, intensity low',
    'Béo / Ngậy': 'fatty present',
}
FLAVOR_KINDS = ['spicy', 'salty', 'sweet', 'sour', 'fatty']
INTENSITIES = ['none', 'low', 'medium', 'high', 'unknown']
MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
GOOGLE_NOTE = 'Món có thể thuộc nhiều bữa, nhiều nhóm, nhiều miền và nhiều vị; ghi đủ mọi giá trị có nguồn.'


def family_id(code: str) -> str:
    return stable_id('taxonomy', f'category:family:{code}')


def region_id(code: str) -> str:
    return stable_id('taxonomy', f'cuisine:{code}')


def known_families() -> set[str]:
    return set(json.loads(V1.read_text(encoding='utf-8'))['categoryGroups']['family']) | set(NEW_FAMILIES)


def build() -> dict:
    families = known_families()
    for _, _, members in MAIN_GROUPS + SNACK_GROUPS:
        missing = [m for m in members if m not in families]
        if missing:
            raise SystemExit(f'unknown family code(s): {missing}')
    group = lambda code, label, members: {
        'code': code, 'label': label, 'id': family_id(members[0]),
        'linkedIds': [family_id(m) for m in members[1:]], 'families': members}
    return {
        'version': '2.0.0', 'extends': 'taxonomy_v1.json (unchanged, pinned by the GM-40 manifest)',
        'note': GOOGLE_NOTE,
        'newFamilies': {c: {'label': l, 'id': family_id(c)} for c, l in NEW_FAMILIES.items()},
        'regions': {c: {'label': l, 'id': region_id(c), 'origin': o} for c, (l, o) in REGIONS.items()},
        'flavorKinds': FLAVOR_KINDS, 'flavorIntensities': INTENSITIES, 'flavorChoices': FLAVOURS,
        'mealSlots': MEALS,
        'groups': {'main': [group(*g) for g in MAIN_GROUPS], 'snack': [group(*g) for g in SNACK_GROUPS]},
    }


def app_source(data: dict) -> str:
    def option(group: dict) -> str:
        linked = f", linkedIds: [{', '.join(repr(i) for i in group['linkedIds'])}]" if group['linkedIds'] else ''
        return f"  {{ id: '{group['id']}'{linked.replace(chr(34), chr(39))}, label: {json.dumps(group['label'], ensure_ascii=False)}, code: '{group['code']}' }},"
    lines = ['// Generated by data-preparation/scripts/filter_taxonomy.py from filter_taxonomy_v2.json. Do not edit by hand.',
             "import type { SetupOption } from './dishSetup';", '',
             '/** Dish groups for main meals: a dish belongs to a group when it has any of its family IDs. */',
             'export const MAIN_GROUPS: SetupOption[] = [']
    lines += [option(g) for g in data['groups']['main']] + ['];', '',
              '/** Dish groups for "Ăn vặt". */', 'export const SNACK_GROUPS: SetupOption[] = [']
    lines += [option(g) for g in data['groups']['snack']] + ['];', '',
              '/** Regions: cuisine IDs; a dish may carry several. `origin` is the legacy single value. */',
              'export const REGIONS: (SetupOption & { origin: string })[] = [']
    for code, region in data['regions'].items():
        lines.append(f"  {{ id: '{region['id']}', label: {json.dumps(region['label'], ensure_ascii=False)}, code: 'region:{code.split('_')[1]}', origin: '{region['origin']}' }},")
    lines += ['];', '']
    return '\n'.join(lines)


def outputs() -> dict[Path, str]:
    data = build()
    return {CONFIG: json.dumps(data, ensure_ascii=False, indent=2) + '\n', APP_FILE: app_source(data)}


def split(cell: str) -> list[str]:
    return [part for part in cell.replace(',', ' ').split() if part]


def validate_csv(path: Path) -> list[str]:
    data = build()
    families = known_families()
    regions = set(data['regions'])
    errors: list[str] = []
    with path.open(encoding='utf-8-sig', newline='') as handle:
        for number, row in enumerate(csv.DictReader(handle), start=2):
            where = f'{path.name}:{number} ({row.get("name", "?")})'
            for code in split(row.get('fillFamilies', '')):
                if code not in families:
                    errors.append(f'{where}: unknown family "{code}"')
            for code in split(row.get('fillRegions', '')):
                if code not in regions:
                    errors.append(f'{where}: unknown region "{code}" (use {", ".join(sorted(regions))})')
            for code in split(row.get('fillMealSlots', '')):
                if code not in MEALS:
                    errors.append(f'{where}: unknown meal "{code}"')
            for item in split(row.get('fillFlavors', '')):
                kind, _, level = item.partition('=')
                if kind not in FLAVOR_KINDS:
                    errors.append(f'{where}: unknown flavour "{kind}"')
                elif level not in ('present', 'none', 'unknown', 'low', 'medium', 'high'):
                    errors.append(f'{where}: flavour level "{level}" for {kind} must be present, none, low, medium, high or unknown')
            if (row.get('fillFamilies') or row.get('fillRegions') or row.get('fillFlavors')) and not row.get('sourceRef', '').strip():
                errors.append(f'{where}: filled values need a sourceRef')
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--validate', type=Path)
    args = parser.parse_args()
    if args.validate:
        errors = validate_csv(args.validate)
        print('\n'.join(errors) if errors else f'{args.validate.name}: OK')
        return 1 if errors else 0
    files = outputs()
    if args.check:
        stale = [str(p.relative_to(ROOT)) for p, text in files.items() if not p.exists() or p.read_text(encoding='utf-8') != text]
        print(json.dumps({'stale': stale}))
        return 1 if stale else 0
    for path, text in files.items():
        path.write_text(text, encoding='utf-8', newline='\n')
        print('wrote', path.relative_to(ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
