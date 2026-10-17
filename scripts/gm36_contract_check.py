"""Offline GM36.1 draft/schema guard plus unchanged GM08 direct-import rejection."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'supabase/seed'))
from validate_field_contracts import audit_schema, schema_errors, load_json
from import_food_data import preflight


def validate_draft(draft):
    schema = load_json(ROOT / 'supabase/functions/menu-ocr/draft.schema.json')
    audit_schema(schema)
    errors = schema_errors(draft, schema)
    if errors:
        return errors

    def fail(index, field, message):
        errors.append({'code': 'OCR_DRAFT', 'path': f'$.items[{index}].{field}', 'message': message})

    for i, row in enumerate(draft['items']):
        if row['sourceRef'] != draft['sourceRef'] or row['fieldSources']['menu'] != draft['sourceRef']:
            fail(i, 'sourceRef', 'Source binding mismatch')
        name = row['name']
        if name is not None and (not name.strip() or name != unicodedata.normalize('NFC', name) or
                                 row['confidence']['name'] is None or row['confidence']['name'] < 0.85):
            fail(i, 'name', 'Unconfirmed/low-confidence name must remain null')
        fields = [row[k] for k in ('priceMin', 'priceMax', 'currency', 'unit')]
        if any(v is not None for v in fields):
            if any(v is None for v in fields):
                fail(i, 'priceMin', 'Known price requires bounds, currency and unit together')
            elif row['priceMin'] > row['priceMax']:
                fail(i, 'priceMax', 'Price range inverted')
            if row['confidence']['price'] is None or row['confidence']['price'] < 0.85:
                fail(i, 'confidence.price', 'Low-confidence price must remain null')
            if row['fieldSources']['price'] != draft['sourceRef']:
                fail(i, 'fieldSources.price', 'Known price requires its declared source')
        elif row['fieldSources']['price'] is not None:
            fail(i, 'fieldSources.price', 'Unknown price must not claim verified price evidence')
        if 'HUMAN_REVIEW_REQUIRED' not in row['issues']:
            fail(i, 'issues', 'Every OCR item still requires human review')
    return errors


def check(draft):
    errors = validate_draft(draft)
    # This calls the real existing importer without any DB/network invocation.
    direct = preflight(draft, '2026-10-16T00:00:00Z', publish=True)
    rejected = direct['valid'] is False and direct['publicationPerformed'] is False
    return {'contract': 'GM-36.1', 'validDraft': not errors, 'errors': errors,
            'gm08DirectImportRejected': rejected,
            'gm08ErrorCodes': sorted({e['code'] for e in direct['errors']}),
            'publicationPerformed': False, 'databaseAccessed': False,
            'result': 'Pass' if not errors and rejected else 'Fail'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--draft', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.report and args.report.resolve() in {
            args.draft.resolve(), (ROOT / 'supabase/functions/menu-ocr/draft.schema.json').resolve()}:
        raise ValueError('Report must not overwrite input/schema')
    report = check(load_json(args.draft))
    report['checkedAt'] = datetime.now(timezone.utc).isoformat()
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report['result'] == 'Pass' else 1


if __name__ == '__main__':
    sys.exit(main())
