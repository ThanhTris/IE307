"""Read-only offline audit of GM-03 artifacts, not a publication/eligibility engine."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path

import base_catalogue as bc
import data_contract as dc
import editorial_catalogue as ec
import food_fixtures as ff
import prepare_contract_templates as forms

ROOT = bc.BASE.parent
AUDIT_AT = '2026-10-10T03:00:00Z'


def issue(path, field, message, *, entity='artifact', row=0):
    return dict(path=str(path), entity=entity, row=row, field=field, message=str(message))


def check_manifest(directory, *, generator=None):
    """Check bytes and hash; never accept a path escaping the artifact folder."""
    directory = Path(directory)
    manifest = bc.load_json(directory / 'manifest.json')
    errors = []
    files = manifest['files']
    if not isinstance(files, dict) or not files:
        raise ValueError('Nonempty manifest.files required')
    for filename, meta in files.items():
        path = directory / filename
        if Path(filename).is_absolute() or not path.resolve().is_relative_to(directory.resolve()):
            errors.append(issue('manifest.json', filename, 'Artifact path escapes manifest directory'))
        elif not path.is_file():
            errors.append(issue(filename, 'file', 'Missing artifact'))
        elif path.stat().st_size != meta['bytes'] or ec.sha256(path) != meta['sha256']:
            errors.append(issue(filename, 'sha256/bytes', 'Artifact differs from manifest'))
    # Missing entries also fail: otherwise a newly added file could escape checksum checks.
    actual = {str(p.relative_to(directory)) for p in directory.rglob('*') if p.is_file() and p.name != 'manifest.json'}
    # The base snapshots directory contains the separate editorial subdirectory.
    if directory == bc.BASE / 'snapshots':
        actual = {p.name for p in directory.iterdir() if p.is_file() and p.name != 'manifest.json'}
    if actual != set(files):
        errors.append(issue('manifest.json', 'files', 'Manifest does not list exactly the artifact files'))
    if generator and manifest.get('generatorSha256') != ec.sha256(generator):
        errors.append(issue('manifest.json', 'generatorSha256', 'Generator changed; review/regenerate required'))
    return errors


def check_bundle(bundle, location, *, csv_directory=None, at=AUDIT_AT):
    errors = [dict(e, path=str(location)) for e in dc.validate(bundle, dc.utc(at))]
    if csv_directory is not None:
        back = dc.read_csv_bundle(csv_directory)
        if back != bundle:
            errors.append(issue(location, 'csv/json', 'CSV/JSON semantic mismatch'))
    return errors


def check_csv(path, expected):
    fields = list(dict.fromkeys(k for row in expected for k in row))
    def cell(value):
        if isinstance(value, (list, dict)):
            return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
        return '' if value is None else str(value)
    normalized = [{key: cell(row.get(key)) for key in fields} for row in expected]
    return [] if bc.read_csv(path) == normalized else [issue(path, 'rows', 'CSV differs from offline authored inputs')]


def check_registry(registry, codebook):
    entries = registry['entries']
    expected = {('cuisine', k): v for k, v in codebook['cuisines'].items()}
    expected.update({('origin', k): v for k, v in codebook['origins'].items()})
    expected.update({('category', f'{group}:{k}'): label for group, values in codebook['categoryGroups'].items() for k, label in values.items()})
    errors, ids, keys = [], set(), set()
    for number, row in enumerate(entries, 1):
        key = (row['type'], row['code'])
        if row['id'] in ids or key in keys:
            errors.append(issue('taxonomy_registry_v1.json', 'id/code', 'Duplicate registry identity', entity='taxonomy', row=number))
        ids.add(row['id']); keys.add(key)
        immutable = ':'.join(key)
        if row['registryKey'] != immutable or row['id'] != bc.stable_id('taxonomy', immutable) or expected.get(key) != row['label']:
            errors.append(issue('taxonomy_registry_v1.json', 'registryKey', 'Registry differs from canonical taxonomy/key/UUID', entity='taxonomy', row=number))
    if keys != set(expected):
        errors.append(issue('taxonomy_registry_v1.json', 'entries', 'Missing/extra canonical codes'))
    return errors


def audit(*, at=AUDIT_AT):
    """Independent sections keep useful diagnostics even when one artifact is broken."""
    dc.utc(at)  # Reject malformed clock before doing any work.
    report = dict(reportVersion='1.0.0', auditAt=at, fixtureValidationAt=ff.VALIDATION_AT,
        scope='Historical offline structure/integrity; not current freshness or human review',
        validStructure=False, readyForPublish=False, reviewDecision='Pending',
        checks=[], errors=[], warnings=[], statistics={}, sources=[], inputFiles={},
        networkCalls=0, eligibilityExecuted=False, publicationPerformed=False)

    def run(name, location, operation):
        before = len(report['errors'])
        try:
            errors = operation() or []
            report['errors'].extend(errors)
        except (OSError, ValueError, TypeError, KeyError, IndexError, AttributeError) as exc:
            report['errors'].append(issue(location, 'root', exc))
        report['checks'].append(dict(name=name, path=location, passed=len(report['errors']) == before))

    snapshots = bc.BASE / 'snapshots'
    run('base-manifest', 'data-preparation/snapshots/manifest.json', lambda: check_manifest(snapshots))

    def mapping():
        source = bc.read_csv(snapshots / 'thu_duc_dishes_taxonomy.csv')
        bases, mappings = bc.build(source, bc.load_json(bc.BASE / 'config/base_dish_mapping_v1.json'),
                                    bc.load_json(bc.BASE / 'config/base_dish_registry.json'))
        counts = dict(Counter(row['status'] for row in mappings))
        if len(source) != 219 or len(bases) != 39 or counts != {'mapped': 216, 'needs_review': 2, 'excluded': 1}:
            raise ValueError('Frozen 219/39/216/2/1 mapping changed')
        report['statistics']['mapping'] = dict(sourceNames=len(source), baseDishes=len(bases), states=counts,
            originalColumns=len(source[0]), menuItems=sum(r['menuItemCount'] for r in bases))
        return check_csv(snapshots / 'thu_duc_base_dishes.csv', bases) + check_csv(snapshots / 'source_to_base_mapping.csv', mappings)
    run('owner-mapping-lossless-replay', 'data-preparation/snapshots', mapping)
    run('taxonomy-registry', 'data-preparation/config/taxonomy_registry_v1.json',
        lambda: check_registry(bc.load_json(bc.BASE / 'config/taxonomy_registry_v1.json'), bc.load_json(bc.BASE / 'config/taxonomy_v1.json')))

    for name, expected in [('empty', forms.empty_bundle()), ('examples', forms.example_bundle())]:
        def form_check(name=name, expected=expected):
            directory = bc.BASE / 'templates' / name
            bundle = bc.load_json(directory / 'dataset.json')
            errors = check_bundle(bundle, f'templates/{name}/dataset.json', csv_directory=directory, at=at)
            if bundle != expected:
                errors.append(issue(f'templates/{name}', 'rows', 'Forms differ from authored empty/synthetic examples'))
            return errors
        run('form-' + name, 'data-preparation/templates/' + name, form_check)

    run('editorial-manifest', 'data-preparation/snapshots/editorial-v0.2.0', lambda: check_manifest(ec.OUTPUT))
    def editorial():
        bases, cfg, evidence, images = ec.load_inputs()
        expected, prices, image_rows, proofs = ec.build(bases, cfg, evidence, images, as_of=dc.utc(at))
        actual = bc.load_json(ec.OUTPUT / 'catalogue.json')
        errors = check_bundle(actual, 'catalogue.json', csv_directory=ec.OUTPUT / 'csv', at=at)
        if actual != expected:
            errors.append(issue('catalogue.json', 'rows', 'Catalogue differs from sourced editorial configuration'))
        manifest = bc.load_json(ec.OUTPUT / 'manifest.json')
        if manifest['configSha256'] != ec.sha256(ec.CONFIG) or manifest['sourceSnapshots'] != cfg['snapshotChecksums'] or manifest['evidenceInputs'] != cfg['inputChecksums']:
            errors.append(issue('editorial/manifest.json', 'input pins', 'Manifest/config source pins differ'))
        for filename, rows in [('price_references.csv', prices), ('image_references.csv', image_rows), ('field_evidence.csv', proofs)]:
            errors.extend(check_csv(ec.OUTPUT / filename, rows))
        stats = ec.quality(actual, prices, image_rows)
        if stats != bc.load_json(ec.OUTPUT / 'quality.json') or stats != manifest['statistics']:
            errors.append(issue('editorial/quality.json', 'statistics', 'Quality totals differ from actual data'))
        report['statistics']['editorial'] = stats
        report['sources'] = [dict(sourceRef=r['sourceRef'], locator=r['locator'], usageRights=r['usageRights'],
            license=r['license'], checkedAt=r['checkedAt'], validUntil=r['validUntil'], reviewedBy=r['reviewedBy'])
            for r in actual['entities']['dataSources']]
        return errors
    run('editorial-contract-source-price-replay', 'data-preparation/snapshots/editorial-v0.2.0', editorial)

    run('fixture-manifest', 'tests/fixtures/food-data-v1', lambda: check_manifest(ff.OUTPUT, generator=Path(ff.__file__)))
    def fixtures():
        datasets, suite, registry = [bc.load_json(ff.OUTPUT / p) for p in ['datasets.json', 'cases.json', 'registry.json']]
        errors = [issue(e['location'], e['field'], e['message'], entity='fixture') for e in ff.validate_suite(datasets, suite, registry)]
        if (datasets, suite, registry) != ff.build_suite():
            errors.append(issue('food-data-v1', 'authored replay', 'Fixtures differ from authored generator'))
        if bc.load_json(ff.OUTPUT / 'base.json') != datasets['base']:
            errors.append(issue('base.json', 'rows', 'Base differs from suite'))
        errors.extend(check_bundle(datasets['base'], 'base.json', csv_directory=ff.OUTPUT / 'base-csv', at=ff.VALIDATION_AT))
        stats = bc.load_json(ff.OUTPUT / 'quality.json')
        if stats != bc.load_json(ff.OUTPUT / 'manifest.json')['statistics'] or stats['cases'] != len(suite['cases']) or stats['datasets'] != len(datasets):
            errors.append(issue('fixture/quality.json', 'statistics', 'Fixture summary differs from actual cases'))
        report['statistics']['fixtures'] = stats
        return errors
    run('fixture-contract-expected-replay', 'tests/fixtures/food-data-v1', fixtures)

    warnings = [
        ('review_gate', 'GM-28 review, accepted assignment and independent Tâm review remain pending.'),
        ('catalogue_target', '39 base dishes; the 60–80 target is not met.'),
        ('artwork', '0 selected artworks; 28 metadata candidates do not prove visual suitability or permission review.'),
        ('missing_fields', '5 descriptions missing; cuisine/meal/flavor/origin/ingredients remain mostly unknown. See editorial statistics.'),
        ('price_scope', '247 snapshot prices from 21 branches; menu_item_unspecified, portion/expiry unknown; no current or per-person price claim.'),
        ('source_rights_freshness', '24/27 draft sources have unknown usage rights; 3 reference-text sources record licenses. All lack expiry/reviewer. Historical audit does not establish current freshness or reuse permission.'),
        ('real_offerings', 'Real venue/offering/schedule/coverage arrays are empty; GM-27 must supply verified selling data.'),
        ('algorithm', 'Fixtures validate input/expected integrity only; GM-30 execution and TypeScript/SQL parity not run.'),
        ('runner', 'Notebook tested through Python exec, not a Jupyter kernel; native/SQL and human review not run.')]
    report['warnings'] = [dict(code=k, message=v) for k, v in warnings]
    # Every tracked input consumed by the audit and its generators has a byte/hash record.
    paths = set()
    for directory in [bc.BASE / 'config', snapshots, bc.BASE / 'templates', ff.OUTPUT]:
        paths.update(p for p in directory.rglob('*') if p.is_file())
    paths.update((bc.BASE / 'scripts' / name) for name in ['base_catalogue.py', 'data_contract.py',
        'editorial_catalogue.py', 'prepare_contract_templates.py', 'food_fixtures.py', 'validate_data_preparation.py'])
    for path in sorted(paths):
        relative = str(path.relative_to(ROOT))
        try:
            report['inputFiles'][relative] = dict(sha256=ec.sha256(path), bytes=path.stat().st_size)
        except OSError as exc:
            report['errors'].append(issue(relative, 'read', exc))
    report['validStructure'] = not report['errors']
    return report


def report_markdown(report):
    lines = ['# GM-03 — kết quả kiểm dữ liệu (draft)', '',
        f"Clock lịch sử: `{report['auditAt']}`; fixture validationAt: `{report['fixtureValidationAt']}`.", '',
        f"Structure valid: **{report['validStructure']}**; lỗi: {len(report['errors'])}; cảnh báo: {len(report['warnings'])}.",
        'Review: Pending. Không xác nhận publish, freshness hiện tại hoặc thuật toán GM-30.', '',
        '| Kiểm | Kết quả |', '|---|---|']
    lines += [f"| {r['name']} | {'Pass' if r['passed'] else 'Fail'} |" for r in report['checks']]
    lines += ['', '## Lỗi', '', '```json', json.dumps(report['errors'], ensure_ascii=False, indent=2), '```', '', '## Giới hạn', '']
    lines += [f"- `{r['code']}`: {r['message']}" for r in report['warnings']]
    lines += ['', 'Số liệu, inventory SHA-256 và nguồn/license chi tiết nằm trong report.json cùng thư mục.', '']
    return '\n'.join(lines)


def save_report(report, directory):
    directory = Path(directory).resolve()
    # Deliberately cannot write reports into fixtures, frozen snapshots or templates.
    allowed = [bc.BASE / 'datasets/data-validation', ROOT / 'docs/evidence/GM-03/validation']
    if directory.is_relative_to(ROOT) and not any(directory.is_relative_to(p.resolve()) for p in allowed):
        raise ValueError('Reports inside repo must use isolated audit reports/evidence directories')
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (directory / 'REPORT.md').write_text(report_markdown(report), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--at', default=AUDIT_AT, help='Explicit UTC historical audit clock; fixtures use their own validationAt')
    parser.add_argument('--report-dir', type=Path, help='Opt in to writing isolated reports; default is read-only')
    args = parser.parse_args()
    report = audit(at=args.at)
    if args.report_dir:
        save_report(report, args.report_dir)
    print(json.dumps({k: report[k] for k in ['validStructure', 'readyForPublish', 'auditAt', 'checks', 'errors', 'warnings']}, ensure_ascii=False, indent=2))
    raise SystemExit(not report['validStructure'])


if __name__ == '__main__':
    main()
