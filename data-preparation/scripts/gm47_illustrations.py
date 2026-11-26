"""Load GM-47 category illustrations and map eligible dishes to the catalogue groups."""
from hashlib import sha256
from pathlib import Path
import json

import filter_taxonomy as taxonomy

DIRECTORY = Path(__file__).resolve().parents[1] / 'editorial/gm47-release/illustrations'
MANIFEST = DIRECTORY / 'manifest.json'
KIND = 'category_illustration'
GROUPS = taxonomy.MAIN_GROUPS + taxonomy.SNACK_GROUPS
GROUP_LABELS = {code: label for code, label, _ in GROUPS}
GROUP_FAMILIES = [(code, {taxonomy.family_id(family) for family in families}) for code, _, families in GROUPS]


def load():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    illustrations = {row['groupCode']: row for row in manifest['assets']}
    if (manifest['version'] != 1 or illustrations.keys() != GROUP_LABELS.keys()
            or len(illustrations) != len(manifest['assets'])):
        raise ValueError('Illustration manifest must cover the current catalogue groups')
    for group, row in illustrations.items():
        filename = f"{taxonomy.stable_id('gm47-illustration', group)}.webp"
        if (row['kind'] != KIND or row['groupLabel'] != GROUP_LABELS[group]
                or row['source'] != f"https://pictogrammers.com/library/mdi/icon/{row['icon']}/"
                or row['license'] != 'Apache-2.0' or row['usageRights'] != 'licensed'
                or not row['attribution'].startswith(f"Ảnh minh họa nhóm {row['groupLabel']} ·")):
            raise ValueError(f'Invalid illustration provenance for {group}')
        for asset, prefix, dimensions in (
            (row['image'], '', (800, 600)),
            (row['thumbnail'], 'thumbnails/', (400, 300)),
        ):
            key = f'illustrations/{prefix}{filename}'
            raw = (DIRECTORY / prefix / filename).read_bytes()
            if (asset['objectKey'] != key or (asset['width'], asset['height']) != dimensions
                    or len(raw) != asset['bytes'] or len(raw) > 200_000
                    or sha256(raw).hexdigest() != asset['sha256']):
                raise ValueError(f'Invalid illustration asset for {group}: {key}')
    return illustrations


def assignments(dishes):
    """Prefer a main meal group for mixed-meal dishes, using taxonomy order within it."""
    selected = {}
    for dish in dishes:
        meals = set(dish['mealSlots'])
        families = set(dish['categoryIds'])
        groups = [code for code, members in GROUP_FAMILIES if families & members and (
            ('snack' in meals) if code.startswith('snack:') else bool(meals - {'snack'})
        )]
        if not groups:
            raise ValueError(f"No illustration group for {dish['id']}")
        selected[dish['id']] = groups[0]
    return selected
