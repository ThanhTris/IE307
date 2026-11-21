"""Build the GM-41 test/demo catalogue offline from curated CSV observations."""
from collections import Counter, defaultdict
from copy import deepcopy
import csv
import io
import json
from pathlib import Path

import dish_catalogue as dc
import filter_taxonomy as ft

ROOT = dc.ROOT
INPUT = ROOT / 'data-preparation/editorial/gm41/dish_filter_enrichment.csv'
DIRECTORY = ROOT / 'supabase/seed/catalogue/gm41'
BUNDLE = DIRECTORY / 'dishes.json'
MANIFEST = DIRECTORY / 'manifest.json'
SCHEMA = ROOT / 'supabase/seed/templates/dish-catalogue-gm41.schema.json'
DATASET = '1.2.0'
CONTRACT = '1.1.0'
CHECKED_AT = '2026-11-20T06:30:00Z'
FIELDS = {
    'fillFamilies': 'categoryIds', 'fillMealSlots': 'mealSlots', 'fillRegions': 'cuisineIds',
    'fillFlavors': 'flavor', 'fillTemperature': 'temperature',
}
HEADERS = ['dishId', 'name', 'registryKey', *FIELDS, 'sourceRef', 'note', 'menuName', 'priceVnd', 'priceUnit', 'servingSize']


def codebook():
    data = dc.load_json(ft.V1)
    filters = dc.load_json(ft.CONFIG)
    data['categoryGroups']['family'].update({c: f['label'] for c, f in filters['newFamilies'].items()})
    data['cuisines'].update({c: r['label'] for c, r in filters['regions'].items()})
    data['flavorKinds'] = filters['flavorKinds']
    return data


def schema_document():
    schema = dc.schema_document()
    schema.update({'$id': f'urn:anyfood:dish-catalogue-v1:{CONTRACT}',
                   'title': 'GM-41 multi-label dish catalogue',
                   'x-contractId': 'dish-catalogue-v1/roadmap-v2/GM-41.1'})
    schema['properties']['contractVersion']['const'] = CONTRACT
    schema['properties']['fixtureOnly'] = {'const': False}
    props = schema['$defs']['dishes']['properties']
    for field in ('mealSlots', 'categoryIds', 'cuisineIds'):
        props[field]['uniqueItems'] = True
    for field in ('mealSlots', 'categoryIds'):
        props[field]['minItems'] = 1
    flavor = next(branch for branch in props['flavor']['anyOf'] if branch.get('type') == 'object')
    flavor['properties']['fatty'] = deepcopy(flavor['properties']['spicy'])
    return schema


def coverage(bundle):
    dishes = bundle['entities']['dishes']
    meals = Counter(slot for dish in dishes for slot in dish['mealSlots'])
    groups = {}
    for key, _, families in ft.MAIN_GROUPS + ft.SNACK_GROUPS:
        ids = {ft.family_id(family) for family in families}
        groups[key] = sum(bool(ids.intersection(d['categoryIds'])) and
                          ('snack' in d['mealSlots'] if key.startswith('snack:') else
                           bool(set(d['mealSlots']) - {'snack'})) for d in dishes)
    regions = {code: sum(ft.region_id(code) in d['cuisineIds'] for d in dishes) for code in ft.REGIONS}
    return {'meals': {meal: meals[meal] for meal in ft.MEALS}, 'groups': groups, 'regions': regions}


def validate(bundle):
    errors = dc.validate(bundle, schema_document(), codebook=codebook())
    if errors:
        raise ValueError(json.dumps(errors, ensure_ascii=False))
    counts = coverage(bundle)
    for meal, count in counts['meals'].items():
        if count < (24 if meal == 'snack' else 20):
            errors.append(f'{meal}: {count}')
    errors.extend(f'{key}: {count}' for key, count in counts['groups'].items() if count < 3)
    errors.extend(f'{key}: {count}' for key, count in counts['regions'].items() if count < 1)
    if errors:
        raise ValueError(f'Coverage below GM-41 targets: {errors}')
    return counts


def record(source):
    return dict(version=1, reviewStatus='draft', sourceRef=source, fieldSources={}, checkedAt=CHECKED_AT,
                validUntil=None, enteredBy='gm41-editorial', reviewedBy=None, status='draft')


def empty_dish(row, source):
    if not row['registryKey'] or row['dishId'] != ft.stable_id('dish', 'gm41:' + row['registryKey']):
        raise ValueError(f'Unregistered new dish: {row["name"]}')
    return {**record(source), 'id': row['dishId'], 'name': row['name'], 'description': None,
            'aliases': [], 'sourceDishIds': [], 'cuisineIds': [], 'categoryIds': [], 'mealSlots': [],
            'timeHints': [], 'origin': 'unknown', 'temperature': 'unknown', 'ingredientTags': None,
            'flavor': None, 'artwork': None, 'preparationMethods': None, 'classificationStatus': 'needs_review'}


def read_rows(path):
    raw = path.read_bytes()
    with io.StringIO(raw.decode('utf-8-sig')) as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != HEADERS:
            raise ValueError('GM-41 enrichment CSV header mismatch')
        rows = list(reader)
    if any(None in row or any(v is None for v in row.values()) for row in rows):
        raise ValueError('GM-41 enrichment CSV has malformed rows')
    errors = ft.validate_csv(path)
    if errors or raw != path.read_bytes():
        raise ValueError(errors or 'CSV changed during validation')
    return rows


def add_evidence(evidence, dish, field, observations, source):
    key = (dish['id'], field)
    previous = evidence.get(key)
    evidence[key] = {'dishId': dish['id'], 'field': field, 'sourceRef': source,
                     'basis': 'gm41_editorial_observation', 'sourceMenuItemIds': [],
                     'note': json.dumps({'preserved': previous, 'observations': observations}, ensure_ascii=False)}


def apply_labels(dish, field, labels):
    if field == 'categoryIds':
        dish[field] = sorted(set(dish[field]) | {ft.family_id(label) for label in labels})
    elif field == 'cuisineIds':
        dish[field] = sorted(set(dish[field]) | {ft.region_id(label) for label in labels})
    elif field == 'mealSlots':
        dish[field] = [meal for meal in ft.MEALS if meal in set(dish[field]) | labels.keys()]
    elif field == 'temperature':
        if len(labels) != 1:
            raise ValueError(f'Conflicting temperature on {dish["name"]}')
        dish[field] = next(iter(labels))
    else:
        base = dish[field] or {kind: {'present': None, 'intensity': 'unknown'} for kind in ('spicy', 'salty', 'sweet', 'sour')}
        seen = set()
        for label in sorted(labels):
            kind, level = label.split('=')
            if kind in seen:
                raise ValueError(f'Conflicting {kind} on {dish["name"]}')
            seen.add(kind)
            base[kind] = {'present': None if level == 'unknown' else level != 'none',
                          'intensity': 'unknown' if level == 'present' else level}
        dish[field] = base


def build_bundle(path=INPUT):
    base = dc.load_json(ROOT / dc.BUNDLE_PATH)
    base.update(datasetVersion=DATASET, contractVersion=CONTRACT)
    entities = base['entities']
    dishes = {r['id']: r for r in entities['dishes']}
    legacy_ids = set(dishes)
    sources = {r['sourceRef']: r for r in entities['dataSources']}
    evidence = {(r['dishId'], r['field']): r for r in entities['fieldEvidence']}
    editorial = ft.stable_id('dataSource', 'gm41-enrichment-v1')
    sources[editorial] = {**record(editorial), 'locator': INPUT.relative_to(ROOT).as_posix(),
                          'usageRights': 'unknown', 'license': None, 'attribution': None}
    updates = defaultdict(lambda: defaultdict(dict))
    for row in read_rows(path):
        key = row['dishId']
        if not row['name'] or not row['note'].strip() or not row['sourceRef'].startswith('https://'):
            raise ValueError(f'{key}: expected a name, source URL and observation')
        url = row['sourceRef']
        source = ft.stable_id('dataSource', url)
        sources.setdefault(source, {**record(source), 'locator': url, 'usageRights': 'unknown',
                                    'license': None, 'attribution': None})
        if key not in legacy_ids:
            new = empty_dish(row, source)
            if key not in dishes:
                dishes[key] = new
                add_evidence(evidence, new, 'name', [{'sourceRef': source, 'note': row['note']}], source)
        if dishes[key]['name'] != row['name'] or (key in legacy_ids and row['registryKey']):
            raise ValueError(f'{key}: CSV identity does not match registry')
        for column, field in FIELDS.items():
            for label in ft.split(row[column]):
                observations = updates[key][field].setdefault(label, [])
                observation = {'value': label, 'sourceRef': source, 'note': row['note']}
                if observation in observations:
                    raise ValueError(f'{key}: duplicate observation for {label}')
                observations.append(observation)
        if bool(row['priceVnd']) != bool(row['menuName']) or (not row['priceVnd'] and (row['priceUnit'] or row['servingSize'])):
            raise ValueError(f'{key}: price requires exact menu item and amount')
        if row['priceVnd']:
            amount = int(row['priceVnd'])
            name = row['menuName']
            menu_id = ft.stable_id('menuItem', url + '#' + name)
            unit = row['priceUnit'] or 'menu_item_unspecified'
            serving = row['servingSize'] or None
            capture = dc.sha(dc.encoded({'source': url, 'item': name, 'amountVnd': amount,
                                         'unit': unit, 'servingSize': serving,
                                         'checkedAt': CHECKED_AT, 'observation': row['note']}))
            entities['priceReferences'].append({
                'id': dc.price_reference_id(key, menu_id, capture), 'dishId': key, 'sourceMenuItemId': menu_id,
                'menuName': name, 'priceRaw': f'{amount} VND', 'value': amount, 'currency': 'VND',
                'unit': unit, 'servingSize': serving, 'sourceRef': source, 'checkedAt': CHECKED_AT,
                'validUntil': None, 'snapshotSha256': capture, 'status': 'snapshot_observation',
            })
    taxonomy = {row['id']: row for row in entities['taxonomy']}
    config = dc.load_json(ft.CONFIG)
    families = {code: {'id': ft.family_id(code), 'label': label}
                for code, label in codebook()['categoryGroups']['family'].items()}
    for kind, prefix, terms in [('category', 'family:', families), ('cuisine', '', config['regions'])]:
        for code, term in terms.items():
            key = term['id']
            taxonomy.setdefault(key, {**record(editorial), 'id': key, 'type': kind, 'code': prefix + code,
                             'label': term['label'], 'description': None, 'origin': None})
    for key, fields in updates.items():
        dish = dishes[key]
        for field, labels in fields.items():
            apply_labels(dish, field, labels)
            add_evidence(evidence, dish, field, [o for group in labels.values() for o in group], editorial)
        if key in legacy_ids:
            dish['version'] += 1
            dish['checkedAt'] = CHECKED_AT
    entities.update(dishes=list(dishes.values()), taxonomy=list(taxonomy.values()),
                    dataSources=list(sources.values()), fieldEvidence=list(evidence.values()))
    for name, rows in entities.items():
        rows.sort(key=lambda row: ((row['dishId'], row['field']) if name == 'fieldEvidence'
                                   else row['sourceRef'] if name == 'dataSources' else row['id']))
    return base


def outputs():
    bundle = build_bundle()
    counts = validate(bundle)
    schema = dc.encoded(schema_document())
    payload = dc.encoded(bundle)
    return {BUNDLE: payload, SCHEMA: schema, MANIFEST: dc.encoded({
        'datasetVersion': DATASET, 'schemaVersion': CONTRACT, 'status': 'draft', 'fixtureOnly': False,
        'usageScope': 'test_demo', 'bundleSha256': dc.sha(payload), 'schemaSha256': dc.sha(schema),
        'counts': {key: len(value) for key, value in bundle['entities'].items()}, 'coverage': counts,
        'inputs': {path.relative_to(ROOT).as_posix(): dc.sha(path.read_bytes()) for path in
                   (ROOT / dc.BUNDLE_PATH, ROOT / dc.MANIFEST_PATH, ft.CONFIG, ft.V1, INPUT)},
    })}


def run(*, write=False, input_path=None):
    if input_path is not None:
        print(json.dumps(validate(dc.load_json(input_path)), ensure_ascii=False))
        return 0
    stale = []
    for path, raw in outputs().items():
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        elif not path.exists() or path.read_bytes() != raw:
            stale.append(path.relative_to(ROOT).as_posix())
    print(json.dumps({'datasetVersion': DATASET, 'stale': stale}))
    return int(bool(stale))
