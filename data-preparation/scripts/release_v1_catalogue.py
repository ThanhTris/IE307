"""Build the versioned GM-41 release candidate from reviewed-source observations."""
import csv
from collections import defaultdict
from urllib.parse import urlsplit

import gm41_catalogue as gm
import gm47_catalogue as editorial

dc = gm.dc
ft = gm.ft
ROOT = gm.ROOT
DIRECTORY = ROOT / 'supabase/seed/catalogue/release-v1'
BUNDLE = DIRECTORY / 'dishes.json'
MANIFEST = DIRECTORY / 'manifest.json'
INPUT = ROOT / 'data-preparation/editorial/release-v1'
DATASET = '1.3.0'
HEADERS = [*gm.HEADERS, 'checkedAt']


def read_batch(path):
    errors = ft.validate_csv(path)
    if errors:
        raise ValueError(errors)
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != HEADERS:
            raise ValueError(f'{path.name}: invalid headers')
        for number, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f'{path.name}:{number}: malformed observation')
            address = urlsplit(row['sourceRef'])
            if (address.scheme != 'https' or not address.hostname
                    or address.username or address.password or not row['note'].strip()):
                raise ValueError(f'{path.name}:{number}: HTTPS source and observation note required')
            dc.parse_utc(row['checkedAt'])
            yield row


def add_price(prices, dish, row, ref):
    name = row['menuName']
    amount = row['priceVnd']
    if not name and not any(row[field] for field in ('priceVnd', 'priceUnit', 'servingSize')):
        return
    if not name or not amount.isascii() or not amount.isdecimal() or int(amount) <= 0:
        raise ValueError(f'{dish["name"]}: expected exact menu line and positive VND amount')
    value = int(amount)
    menu_id = ft.stable_id('menuItem', row['sourceRef'] + '#' + name)
    unit = row['priceUnit'] or 'menu_item_unspecified'
    capture = dc.sha(dc.encoded({
        'source': row['sourceRef'], 'menuName': name, 'value': value, 'unit': unit,
        'servingSize': row['servingSize'], 'checkedAt': row['checkedAt'],
    }))
    prices.append({
        'id': dc.price_reference_id(dish['id'], menu_id, capture), 'dishId': dish['id'],
        'sourceMenuItemId': menu_id, 'menuName': name, 'priceRaw': f'{value} VND',
        'value': value, 'currency': 'VND', 'unit': unit, 'servingSize': row['servingSize'] or None,
        'sourceRef': ref, 'checkedAt': row['checkedAt'], 'validUntil': None,
        'snapshotSha256': capture, 'status': 'snapshot_observation',
    })


def validate(bundle):
    gm.validate(bundle)
    main_families, snack_families = (
        {ft.family_id(family) for _, _, families in groups for family in families}
        for groups in (ft.MAIN_GROUPS, ft.SNACK_GROUPS)
    )
    for dish in bundle['entities']['dishes']:
        categories = set(dish['categoryIds'])
        meals = set(dish['mealSlots'])
        if not ((meals - {'snack'} and categories & main_families)
                or ('snack' in meals and categories & snack_families)):
            raise ValueError(f'{dish["name"]}: no display group matches a supported meal')


def build():
    bundle, _ = editorial.build()
    bundle['datasetVersion'] = DATASET
    entities = bundle['entities']
    dishes = {dish['id']: dish for dish in entities['dishes']}
    existing = set(dishes)
    sources = {source['sourceRef']: source for source in entities['dataSources']}
    evidence = {(row['dishId'], row['field']): row for row in entities['fieldEvidence']}
    updates = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    batches = []
    latest = {}
    for path in sorted(INPUT.glob('batch-*.csv')):
        added = []
        rows = list(read_batch(path))
        for row in rows:
            key = row['dishId']
            date = row['checkedAt']
            note = row['note']
            url = row['sourceRef']
            ref = ft.stable_id('dataSource', f'gm41-release-v1:{date}:{url}')
            sources.setdefault(ref, {
                **gm.record(ref), 'checkedAt': date, 'locator': url,
                'usageRights': 'unknown', 'license': None, 'attribution': None,
            })
            if key not in dishes:
                dishes[key] = gm.empty_dish(row, ref)
                dishes[key]['checkedAt'] = date
                dishes[key]['fieldSources']['name'] = ref
                added.append({'dishId': key, 'name': row['name']})
                updates[key]['name'][row['name']].append({'value': row['name'], 'sourceRef': ref, 'note': note})
            if (not row['name'].strip() or dishes[key]['name'] != row['name']
                    or (key in existing and row['registryKey'])
                    or (key not in existing and key != ft.stable_id('dish', 'gm41:' + row['registryKey']))):
                raise ValueError(f'{path.name}: identity mismatch {key}')
            if (not any(row[field].strip() for field in gm.FIELDS) and not row['priceVnd']):
                raise ValueError(f'{path.name}: empty observation for {key}')
            latest[key] = max(latest.get(key, date), date)
            for column, field in gm.FIELDS.items():
                for label in ft.split(row[column]):
                    observations = updates[key][field][label]
                    value = {'value': label, 'sourceRef': ref, 'note': note}
                    if value in observations:
                        raise ValueError(f'{key}: duplicate observation {label}')
                    observations.append(value)
            add_price(entities['priceReferences'], dishes[key], row, ref)
        batches.append({'path': path.relative_to(ROOT).as_posix(), 'observations': len(rows),
                        'newDishes': sorted(added, key=lambda entry: entry['name'])})

    baseline = {dish['id']: dish for dish in dc.load_json(gm.BUNDLE)['entities']['dishes']}
    for key, fields in updates.items():
        dish = dishes[key]
        for field, labels in fields.items():
            if field != 'name':
                gm.apply_labels(dish, field, labels)
                if field == 'flavor':
                    for kind in ft.FLAVOR_KINDS:
                        dish[field].setdefault(kind, {'present': None, 'intensity': 'unknown'})
            observations = [value for values in labels.values() for value in values]
            ref = observations[0]['sourceRef']
            gm.add_evidence(evidence, dish, field, observations, ref)
    for key, original in baseline.items():
        dish = dishes[key]
        if key in updates or original != dish:
            dish['version'] = original['version'] + 1
            dish['checkedAt'] = max(dish['checkedAt'], latest.get(key, ''), *(
                sources[ref]['checkedAt'] for ref in dish['fieldSources'].values()
            ))

    entities.update(dishes=list(dishes.values()), dataSources=list(sources.values()),
                    fieldEvidence=list(evidence.values()))
    for name, rows in entities.items():
        rows.sort(key=lambda row: ((row['dishId'], row['field']) if name == 'fieldEvidence'
                                   else row['sourceRef'] if name == 'dataSources' else row['id']))
    validate(bundle)
    return bundle, batches


def outputs():
    bundle, batches = build()
    raw = dc.encoded(bundle)
    inputs = [gm.BUNDLE, gm.MANIFEST, gm.SCHEMA, ft.CONFIG, ft.V1, editorial.OVERLAY,
              editorial.IMAGE_SNAPSHOT, *(ROOT / batch['path'] for batch in batches)]
    return {
        BUNDLE: raw,
        MANIFEST: dc.encoded({
            'datasetVersion': DATASET, 'schemaVersion': gm.CONTRACT, 'status': 'draft',
            'usageScope': 'test_demo', 'fixtureOnly': False, 'bundleSha256': dc.sha(raw),
            'schemaSha256': dc.sha(gm.SCHEMA.read_bytes()), 'schemaPath': gm.SCHEMA.relative_to(ROOT).as_posix(),
            'counts': {key: len(rows) for key, rows in bundle['entities'].items()},
            'inputs': {path.relative_to(ROOT).as_posix(): dc.sha(path.read_bytes()) for path in inputs},
        }),
        INPUT / 'handoff.json': dc.encoded({'datasetVersion': DATASET, 'batches': batches}),
    }


def run(*, write=False, input_path=None):
    if input_path is not None:
        validate(dc.load_json(input_path))
        return 0
    stale = []
    for path, raw in outputs().items():
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        elif not path.exists() or path.read_bytes() != raw:
            stale.append(path.relative_to(ROOT).as_posix())
    print({'datasetVersion': DATASET, 'stale': stale})
    return int(bool(stale))
