"""GM18.2 opt-in rich projection of the validated GM40 draft, owned QA DB only."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('gm18_catalogue_upstream', ROOT/'supabase/seed/import_dish_catalogue.py')
upstream = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upstream)
VERSION = 'GM18.2'
CONTRACT = 'dish-catalogue/roadmap-v2/GM-18.2'


def stamp(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)', value):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.astimezone(timezone.utc) if parsed.tzinfo else None
    except (ValueError, OverflowError):
        return None


def latest_observation(rows):
    known = [(stamp(row.get('checkedAt')), row) for row in rows]
    known = [(at, row) for at, row in known if at is not None]
    if not known:
        return None
    newest = max(at for at, _ in known)
    tied = [row for at, row in known if at == newest]
    if len(tied) != 1:
        return None
    row = tied[0]
    return {'amount': row.get('value'), 'currency': row.get('currency'), 'unit': row.get('unit'),
            'sourceRef': row.get('sourceRef'), 'servingSize': row.get('servingSize'),
            'observedAt': newest.isoformat().replace('+00:00', 'Z')}


def baseline_price(observation):
    # B uses checkedAt and non-null amount/currency/unit/source. Never fill unknowns.
    if observation is None or observation['amount'] is None or any(observation[k] is None for k in ('currency', 'unit', 'sourceRef')):
        return None
    return {**{k: observation[k] for k in ('amount', 'currency', 'unit', 'sourceRef', 'servingSize')},
            'checkedAt': observation['observedAt']}


def cards(bundle):
    entities = bundle['entities']
    taxonomy = {row['id']: row for row in entities['taxonomy']}
    def terms(ids):
        return [{k: taxonomy[key][k] for k in ('id', 'type', 'code', 'label', 'version')} for key in ids]
    prices = {}
    for row in entities['priceReferences']:
        prices.setdefault(row['dishId'], []).append(row)
    result = []
    for dish in sorted(entities['dishes'], key=lambda row: row['id']):
        observation = latest_observation(prices.get(dish['id'], []))
        cuisines, categories = terms(dish['cuisineIds']), terms(dish['categoryIds'])
        result.append({'dishId': dish['id'], **{k: dish[k] for k in (
            'name', 'description', 'artwork', 'mealSlots', 'cuisineIds', 'categoryIds', 'temperature', 'flavor')},
            'cuisineLabels': [row['label'] for row in cuisines], 'categoryLabels': [row['label'] for row in categories],
            'cuisineTerms': cuisines, 'categoryTerms': categories,
            'taxonomyVersion': bundle['contractVersion'], 'projectionVersion': VERSION,
            'priceObservation': observation, 'priceReference': baseline_price(observation)})
    return result


def release_id(bundle):
    return upstream.release_id(bundle) + ':gm18.2'


def import_sql(bundle, digest, activate=False, fail_after_insert=False):
    return upstream.import_sql(bundle, digest, activate, fail_after_insert,
                               projected_cards=cards(bundle), release_identifier=release_id(bundle))


def install(db, namespace, path, manifest_path=None, activate=False, fail_after_insert=False):
    upstream.owned(db, namespace)
    bundle, digest = upstream.candidate(path, manifest_path)
    projection = cards(bundle)
    db.transaction(import_sql(bundle, digest, activate, fail_after_insert))
    actual = upstream.readback(db, namespace, release_id(bundle))
    if actual['cards'] != projection or actual['source_sha'] != digest or not actual['test_only']:
        raise RuntimeError('GM18_READBACK_MISMATCH')
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['validate', 'import'])
    parser.add_argument('--input', type=Path, default=ROOT/upstream.contract.BUNDLE_PATH)
    parser.add_argument('--manifest', type=Path, default=ROOT/upstream.contract.MANIFEST_PATH)
    parser.add_argument('--database')
    parser.add_argument('--namespace')
    parser.add_argument('--activate', action='store_true')
    args = parser.parse_args()
    bundle, digest = upstream.candidate(args.input, args.manifest)
    if args.operation == 'import':
        if not args.database or not args.namespace:
            parser.error('Owned QA --database and --namespace required')
        actual = install(upstream.food.LocalDB(args.database), args.namespace, args.input, args.manifest, args.activate)
        output = {'releaseId': actual['id'], 'count': len(actual['cards']), 'active': actual['active']}
    else:
        output = {'releaseId': release_id(bundle), 'sourceSha256': digest, 'count': len(cards(bundle)), 'projectionVersion': VERSION, 'testOnly': True}
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
