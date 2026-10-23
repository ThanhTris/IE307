"""GM-40 offline data milestone. No database, network, activation or API calls.

The separate QA importer reuses the reviewed 0026 runtime without schema/API changes.
Run from any directory: python3 data-preparation/scripts/dish_catalogue.py --check
"""
from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
import csv
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import unicodedata
import uuid

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from validate_field_contracts import audit_schema, load_json, schema_errors
import data_contract as legacy

CONTRACT = 'dish-catalogue-v1/roadmap-v2/GM-40.1'
SCHEMA_PATH = 'supabase/seed/templates/dish-catalogue-v1.schema.json'
BUNDLE_PATH = 'supabase/seed/catalogue/dishes.json'
MANIFEST_PATH = 'supabase/seed/catalogue/manifest.json'
REPORT_PATH = 'supabase/seed/catalogue/QUALITY_REPORT.md'
INPUTS = [
    'supabase/seed/templates/food-v1.schema.json',
    'data-preparation/config/taxonomy_v1.json',
    'data-preparation/config/base_dish_registry.json',
    'data-preparation/config/base_dish_mapping_v1.json',
    'data-preparation/snapshots/editorial-v0.2.0/catalogue.json',
    'data-preparation/snapshots/editorial-v0.2.0/price_references.csv',
    'data-preparation/snapshots/editorial-v0.2.0/field_evidence.csv',
    'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json',
    'data-preparation/config/meal_slot_evidence_v1.json',
]


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode('utf-8')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def string():
    return {'type': 'string', 'minLength': 1, 'pattern': r'\S'}


def nullable(schema):
    return {'anyOf': [schema, {'type': 'null'}]}


def array(schema):
    return {'type': 'array', 'items': schema, 'uniqueItems': True}


def object_schema(properties):
    return {'type': 'object', 'properties': properties, 'required': list(properties),
            'additionalProperties': False}


def schema_document():
    # Copy upstream dish/support shapes without editing the legacy contract.
    old = load_json(ROOT / INPUTS[0])
    defs = deepcopy({k: old['$defs'][k] for k in ['dishes', 'taxonomy', 'dataSources']})

    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if not k.startswith('x-')}
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value

    defs = clean(defs)
    prep = list(load_json(ROOT / INPUTS[1])['categoryGroups']['preparation'])
    defs['dishes']['properties']['preparationMethods'] = nullable(array({'type': 'string', 'enum': prep}))
    defs['dishes']['required'].append('preparationMethods')
    uid = {'type': 'string', 'pattern': r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'}
    utc = {'type': 'string', 'pattern': r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$'}
    defs['priceReferences'] = object_schema({
        'id': uid, 'dishId': uid, 'sourceMenuItemId': string(), 'menuName': string(),
        'priceRaw': string(), 'value': nullable({'type': 'number', 'minimum': 0}),
        'currency': nullable({'type': 'string', 'enum': ['VND', 'USD', 'THB', 'KRW', 'JPY', 'CNY', 'EUR', 'other']}),
        'unit': nullable({'type': 'string', 'enum': ['portion', 'item', 'person', 'group', 'kg', 'menu_item_unspecified']}),
        'servingSize': nullable(string()), 'sourceRef': uid,
        'checkedAt': utc, 'validUntil': nullable(utc),
        'snapshotSha256': {'type': 'string', 'pattern': '^[0-9a-f]{64}$'},
        'status': {'const': 'snapshot_observation'},
    })
    defs['fieldEvidence'] = object_schema({
        'dishId': uid, 'field': {'type': 'string', 'enum': [
            'name', 'description', 'aliases', 'cuisineIds', 'categoryIds', 'mealSlots',
            'timeHints', 'origin', 'temperature', 'flavor', 'ingredientTags', 'preparationMethods']},
        'sourceRef': uid, 'basis': string(), 'note': string(),
        'sourceMenuItemIds': array(string()),
    })
    props = {
        'profile': {'const': 'dish-catalogue-v1'}, 'contractVersion': {'const': '1.0.0'},
        'datasetVersion': {'type': 'string', 'pattern': r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$'},
        'usageScope': {'const': 'test_demo'}, 'fixtureOnly': {'type': 'boolean'},
        'entities': object_schema({k: array({'$ref': '#/$defs/' + k}) for k in defs}),
    }
    return {'$schema': 'https://json-schema.org/draft/2020-12/schema',
            '$id': 'urn:anyfood:dish-catalogue-v1:1.0.0',
            'title': 'GM-40 dish-only test/demo data contract', 'x-contractId': CONTRACT,
            '$defs': defs, **object_schema(props)}


def utc(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timezone required')
    return parsed.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def normalize(value):
    # Retain accents. Never fuzzy-merge aliases, menu variants or distinct dishes.
    return ' '.join(unicodedata.normalize('NFC', value).casefold().split())


def parse_utc(value):
    # strptime supports 1..6 fractional digits consistently, including Python 3.9.
    pattern = '%Y-%m-%dT%H:%M:%S.%fZ' if '.' in value else '%Y-%m-%dT%H:%M:%SZ'
    return datetime.strptime(value, pattern).replace(tzinfo=timezone.utc)


def price_reference_id(dish_id, menu_item_id, snapshot_sha256):
    key = f'anyfood:gm40:price:{dish_id}:{menu_item_id}:{snapshot_sha256}'
    return str(uuid.uuid5(uuid.NAMESPACE_URL, key))


def meal_supplement(dishes, evidence, sources):
    """Apply only explicit, versioned editorial evidence; never infer from names."""
    supplement = load_json(ROOT / INPUTS[8])
    if supplement['version'] != '1.0.0' or supplement['status'] != 'draft':
        raise ValueError('Unsupported meal supplement version/review status')
    by_id = {d['id']: d for d in dishes}
    source_refs = {}
    common = dict(version=1, reviewStatus='draft', fieldSources={}, checkedAt=supplement['checkedAt'],
                  validUntil=None, enteredBy='gm40-meal-editorial-agent', reviewedBy=None, status='draft')
    for source in supplement['sources']:
        if source['key'] in source_refs or len(source['snapshotSha256']) != 64:
            raise ValueError('Duplicate source or missing capture hash')
        source_refs[source['key']] = source['sourceRef']
        sources.append({**common, 'sourceRef': source['sourceRef'], 'locator': source['url'],
                        'usageRights': source['usageRights'], 'license': None, 'attribution': None})
    editorial_ref = str(uuid.uuid5(uuid.NAMESPACE_URL, 'anyfood:gm40:meal-evidence:v1'))
    sources.append({**common, 'sourceRef': editorial_ref, 'locator': INPUTS[8],
                    'usageRights': 'unknown', 'license': None, 'attribution': None})
    seen = set()
    allowed = load_json(ROOT / INPUTS[1])['mealSlots']
    for update in supplement['updates']:
        dish_id = update['dishId']
        if dish_id not in by_id or dish_id in seen or not update['observations']:
            raise ValueError('Unknown/duplicate dish or absent meal evidence')
        seen.add(dish_id)
        d = by_id[dish_id]
        observations = deepcopy(update['observations'])
        for item in observations:
            if (item['mealSlot'] not in allowed or item['sourceKey'] not in source_refs
                    or item['basis'] != 'explicit_meal_context' or not item['locator'] or not item['observation']):
                raise ValueError('Meal label requires explicit source/context')
            item['sourceRef'] = source_refs[item['sourceKey']]
        prior = [e for e in evidence if e['dishId'] == dish_id and e['field'] == 'mealSlots']
        evidence[:] = [e for e in evidence if not (e['dishId'] == dish_id and e['field'] == 'mealSlots')]
        d['mealSlots'] = [slot for slot in allowed if slot in set(d['mealSlots']) | {e['mealSlot'] for e in observations}]
        d['version'] += 1
        d['checkedAt'] = supplement['checkedAt']
        evidence.append({'dishId': dish_id, 'field': 'mealSlots', 'sourceRef': editorial_ref,
                         'basis': 'explicit_meal_context_draft', 'sourceMenuItemIds': [],
                         'note': json.dumps({'supplement': INPUTS[8], 'observations': observations,
                                             'preservedLegacyEvidence': prior}, ensure_ascii=False)})
    return supplement['datasetVersion']


def validate(bundle, schema=None):
    schema = schema_document() if schema is None else schema
    audit_schema(schema)
    errors = schema_errors(bundle, schema)
    if errors:
        return errors
    data = bundle['entities']

    def err(path, code, message):
        errors.append({'path': path, 'code': code, 'message': message})

    indexes = {}
    for entity, rows in data.items():
        key = 'sourceRef' if entity == 'dataSources' else 'id'
        if entity == 'fieldEvidence':
            keys = [(r['dishId'], r['field']) for r in rows]
        else:
            keys = [r[key] for r in rows]
        if len(keys) != len(set(keys)):
            err('$.entities.' + entity, 'DUPLICATE', 'Duplicate identity')
        indexes[entity] = {k: r for k, r in zip(keys, rows)}
    sources, dishes, taxonomy = (indexes[k] for k in ['dataSources', 'dishes', 'taxonomy'])
    evidence = indexes['fieldEvidence']
    names = {}
    taxonomy_keys = [(r['type'], r['code']) for r in data['taxonomy']]
    if len(taxonomy_keys) != len(set(taxonomy_keys)):
        err('$.entities.taxonomy', 'DUPLICATE', 'Duplicate taxonomy type/code')
    codebook = load_json(ROOT / INPUTS[1])
    allowed_codes = {
        'cuisine': set(codebook['cuisines']),
        'origin': set(codebook['origins']),
        'category': {f'{namespace}:{code}'
                     for namespace, codes in codebook['categoryGroups'].items() for code in codes},
    }
    for i, row in enumerate(data['taxonomy']):
        if row['code'] not in allowed_codes[row['type']]:
            err(f'$.entities.taxonomy[{i}].code', 'TAXONOMY_CODE',
                'Code is outside the declared type/namespace vocabulary')
    for entity in ['dishes', 'taxonomy', 'dataSources']:
        for i, row in enumerate(data[entity]):
            path = f'$.entities.{entity}[{i}]'
            for ref in [row['sourceRef'], *row['fieldSources'].values()]:
                if ref not in sources:
                    err(path + '.sourceRef', 'FK', 'Source missing')
            times = {}
            for field in ['checkedAt', 'validUntil']:
                if row[field] is not None:
                    try:
                        times[field] = parse_utc(row[field])
                    except (ValueError, TypeError):
                        err(path + '.' + field, 'TIME', 'Invalid UTC timestamp')
            if 'validUntil' in times and 'checkedAt' in times:
                if times['validUntil'] <= times['checkedAt']:
                    err(path + '.validUntil', 'TIME', 'Expiry must follow observation')
            if row['reviewStatus'] != 'draft' or row['status'] != 'draft':
                err(path + '.reviewStatus', 'REVIEW', 'This profile is draft/test-demo only; no promotion')
            if row['reviewedBy'] is not None:
                err(path + '.reviewedBy', 'REVIEW', 'No human review is asserted by this data milestone')
    for i, row in enumerate(data['dishes']):
        path = f'$.entities.dishes[{i}]'
        for value in [row['name'], *row['aliases']]:
            key = normalize(value)
            if key in names:
                err(path + '.aliases', 'NAME_COLLISION', 'Equivalent name requires explicit reconciliation')
            names[key] = row['id']
        for field, kind in [('cuisineIds', 'cuisine'), ('categoryIds', 'category')]:
            for ref in row[field]:
                if ref not in taxonomy or taxonomy[ref]['type'] != kind:
                    err(path + '.' + field, 'FK', 'Missing or wrong-type taxonomy')
        try:
            if row['flavor'] is not None:
                legacy.flavor(row['flavor'])
        except (ValueError, KeyError, TypeError):
            err(path + '.flavor', 'FLAVOR', 'Inconsistent present/intensity')
        for field in ['name', 'description', 'aliases', 'cuisineIds', 'categoryIds', 'mealSlots',
                      'timeHints', 'origin', 'temperature', 'flavor', 'ingredientTags', 'preparationMethods']:
            value = row[field]
            if value is not None and value != [] and value != 'unknown' and (row['id'], field) not in evidence:
                err(path + '.' + field, 'EVIDENCE', 'Known value requires field evidence')
        art = row['artwork']
        if art is not None:
            source = sources.get(art['sourceRef'], {})
            if (art['sourceRef'] not in sources or art['usageRights'] not in ['licensed', 'granted', 'public_domain']
                    or not art['license'] or not art['attribution']
                    or source.get('usageRights') not in ['licensed', 'granted', 'public_domain']
                    or not source.get('license') or not source.get('attribution')):
                err(path + '.artwork', 'RIGHTS', 'Image requires source, usable rights, license and attribution')
    for i, row in enumerate(data['fieldEvidence']):
        if row['dishId'] not in dishes or row['sourceRef'] not in sources:
            err(f'$.entities.fieldEvidence[{i}]', 'FK', 'Unknown dish/source')
    price_keys = set()
    for i, row in enumerate(data['priceReferences']):
        path = f'$.entities.priceReferences[{i}]'
        key = (row['dishId'], row['sourceMenuItemId'], row['snapshotSha256'])
        if key in price_keys:
            err(path, 'DUPLICATE', 'Duplicate price observation dish/menu/snapshot')
        price_keys.add(key)
        if row['id'] != price_reference_id(*key):
            err(path + '.id', 'IDENTITY', 'Price ID must be the UUIDv5 of dish/menu/snapshot')
        if row['dishId'] not in dishes or row['sourceRef'] not in sources:
            err(path, 'FK', 'Unknown dish/source')
        if row['value'] is not None and (row['currency'] is None or row['unit'] is None):
            err(path + '.unit', 'UNIT', 'Observed amount requires currency and unit')
        times = {}
        for field in ['checkedAt', 'validUntil']:
            if row[field] is not None:
                try:
                    times[field] = parse_utc(row[field])
                except (ValueError, TypeError):
                    err(path + '.' + field, 'TIME', 'Invalid UTC timestamp')
        if 'validUntil' in times and 'checkedAt' in times and times['validUntil'] <= times['checkedAt']:
            err(path + '.validUntil', 'TIME', 'Expiry must follow observation')
    return errors


def build():
    old = load_json(ROOT / INPUTS[4])['entities']
    dishes = sorted(deepcopy(old['dishes']), key=lambda r: r['id'])
    for row in dishes:
        row['preparationMethods'] = None  # No new evidence or inference in GM-40.
    prices = []
    with (ROOT / INPUTS[5]).open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream):
            raw = row['priceValue']
            value = float(raw) if raw else None
            if value is not None and value.is_integer():
                value = int(value)
            prices.append({
                'id': price_reference_id(row['dishId'], row['menuItemId'], row['snapshotSha256']),
                'dishId': row['dishId'],
                'sourceMenuItemId': row['menuItemId'], 'menuName': row['menuName'],
                'priceRaw': row['priceRaw'], 'value': value, 'currency': row['currency'] or None,
                'unit': row['unit'] or None, 'servingSize': row['portion'] or None,
                'sourceRef': row['sourceRef'], 'checkedAt': utc(row['checkedAt']),
                'validUntil': utc(row['validUntil']) if row['validUntil'] else None,
                'snapshotSha256': row['snapshotSha256'], 'status': 'snapshot_observation',
            })
    evidence = []
    with (ROOT / INPUTS[6]).open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream):
            evidence.append({
                'dishId': row['dishId'], 'field': {'cuisineCodes': 'cuisineIds', 'categoryCodes': 'categoryIds'}.get(row['field'], row['field']),
                'sourceRef': row['sourceRef'], 'basis': row['basis'], 'note': row['note'],
                'sourceMenuItemIds': json.loads(row['menuItemIds']),
            })
    sources = deepcopy(old['dataSources'])
    version = meal_supplement(dishes, evidence, sources)
    bundle = {
        'profile': 'dish-catalogue-v1', 'contractVersion': '1.0.0', 'datasetVersion': version,
        'usageScope': 'test_demo', 'fixtureOnly': False,
        'entities': {'dishes': dishes, 'taxonomy': sorted(deepcopy(old['taxonomy']), key=lambda r: r['id']),
                     'dataSources': sorted(sources, key=lambda r: r['sourceRef']),
                     'priceReferences': sorted(prices, key=lambda r: r['id']),
                     'fieldEvidence': sorted(evidence, key=lambda r: (r['dishId'], r['field']))},
    }
    errors = validate(bundle)
    if errors:
        raise ValueError(json.dumps(errors, ensure_ascii=False, indent=2))
    mapping = load_json(ROOT / INPUTS[3])['mapping']
    mapping_counts = dict(sorted(Counter(r['status'] for r in mapping).items()))
    ids = {r['id'] for r in dishes}
    legacy_ids = {r['id'] for r in load_json(ROOT / INPUTS[7])['entities']['dishes']}
    if not legacy_ids <= ids or len(ids) != 39 or mapping_counts != {'excluded': 1, 'mapped': 216, 'needs_review': 2}:
        raise ValueError('Frozen identity/mapping reconciliation changed; manual review required')
    template = deepcopy(bundle)
    template['fixtureOnly'] = True
    # Empty template needs no fake food, source or venue UUID. Positive examples
    # live in clearly marked fixtures and the real draft bundle.
    template['entities'] = {key: [] for key in bundle['entities']}
    manifest = {
        'profile': bundle['profile'], 'contractId': CONTRACT, 'schemaVersion': '1.0.0',
        'datasetVersion': bundle['datasetVersion'], 'usageScope': 'test_demo',
        'status': 'draft', 'fixtureOnly': False, 'activation': 'not_activated_by_build; owned_QA_import_only',
        'reviewedBy': None, 'generatedFrom': 'frozen offline inputs; no wall clock or network',
        'bundlePath': BUNDLE_PATH, 'bundleSha256': sha(encoded(bundle)),
        'schemaSha256': sha(encoded(schema_document())),
        'counts': {k: len(v) for k, v in bundle['entities'].items()},
        'identityReconciliation': {'editorialDishes': len(ids), 'gm08SharedIds': len(legacy_ids),
                                   'gm08OnlyIds': sorted(legacy_ids - ids), 'mappingCounts': mapping_counts},
        'inputSha256': {path: sha((ROOT / path).read_bytes()) for path in INPUTS},
    }
    counts = {key: sum(row[key] not in [None, [], 'unknown'] for row in dishes)
              for key in ['description', 'aliases', 'cuisineIds', 'categoryIds', 'mealSlots', 'timeHints',
                          'origin', 'temperature', 'flavor', 'ingredientTags', 'preparationMethods', 'artwork']}
    missing = ['| Dish | Missing/unknown |', '| --- | --- |']
    for row in sorted(dishes, key=lambda r: r['name']):
        gaps = [key for key in counts if row[key] in [None, [], 'unknown']]
        missing.append('| ' + row['name'] + ' | ' + ', '.join(gaps) + ' |')
    report = '# GM-40 — Offline quality report\n\n'
    report += 'Draft/test-demo only. This offline build does not import/activate a DB or prove API/approval. Owned-QA importer/checks are separate. No nearby/open venue claim.\n\n'
    report += f'39 dishes; {len(legacy_ids)} shared GM-08 IDs; 0 GM-08-only IDs; mapping 216 mapped / 2 needs_review / 1 excluded.\n\n'
    report += f'{len(prices)} price observations, {sum(r["value"] is None for r in prices)} null amounts; no price/person conversion or dish average.\n\n'
    report += 'Equivalent-name collisions: 0 (accent-preserving NFC + case/whitespace normalization). Source menu names remain variants, not aliases.\n\n'
    report += '| Field | Known/nonempty dishes |\n| --- | --- |\n'
    report += '\n'.join(f'| {key} | {count}/39 |' for key, count in counts.items()) + '\n\n'
    report += 'Known/nonempty is structural coverage, not reviewed accuracy or current freshness. Empty arrays mean no evidenced labels.\n\n'
    report += 'Meal evidence supplement v1; historical snapshot unchanged; references include school menus and international publishers.\n\n'
    report += '| Meal | Unique dishes | Shortfall for 10 | Shortfall for 20 |\n| --- | --- | --- | --- |\n'
    for slot in load_json(ROOT / INPUTS[1])['mealSlots']:
        count = sum(slot in d['mealSlots'] for d in dishes)
        report += f'| {slot} | {count} | {max(0, 10-count)} | {max(0, 20-count)} |\n'
    report += '\nCounts overlap across meals; additional cuisine/category filters may reduce them. No unknown label matches all meals.\n\n'
    report += '\n'.join(missing) + '\n'
    return {
        SCHEMA_PATH: encoded(schema_document()), BUNDLE_PATH: encoded(bundle),
        'supabase/seed/templates/dish-catalogue-v1.template.json': encoded(template),
        MANIFEST_PATH: encoded(manifest), REPORT_PATH: report.encode('utf-8'),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Generate offline artifacts; never import/activate')
    parser.add_argument('--check', action='store_true', help='Check generated bytes against frozen inputs')
    parser.add_argument('--input', type=Path, help='Validate an arbitrary profile (no DB)')
    args = parser.parse_args()
    if args.input:
        errors = validate(load_json(args.input))
        print(json.dumps({'valid': not errors, 'errors': errors}, ensure_ascii=False, indent=2))
        return int(bool(errors))
    artifacts = build()
    stale = []
    for path, content in artifacts.items():
        destination = ROOT / path
        if args.write:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
        elif not destination.exists() or destination.read_bytes() != content:
            stale.append(path)
    print(json.dumps({'stage': 'offline-data-only', 'generatedArtifacts': len(artifacts), 'stale': stale}))
    return int(bool(stale))


if __name__ == '__main__':
    raise SystemExit(main())
