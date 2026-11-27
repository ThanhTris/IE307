"""GM-51 hosted release builder and operator-only catalogue import."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import parse_qs, unquote, urlsplit

from import_gm18_catalogue import cards, release_id, upstream
from gm47_release_editorial import FACT_REFERENCE, build as editorial_build, gm41
from release_catalogue_check import evaluate

dc = gm41.dc
VERSION = '1.5.0'
UPSTREAM_VERSION = '1.4.5'
STAGING_RECEIPT_SHA = 'bc18830451f29c6ede9dd1b0979139a6b5062f1ea5bb528f4e3d0ecdbd0b1617'
STAGING_UPSTREAM_SHA = '2ec58cdcc81aba6df84656e5431d5e0465a40ffcf3e53ff8d61039db60cf5304'
PROJECTS = {'staging': 'cijknqhnmzdsturkzyiz', 'production': 'ijkuoizconywuddokdhh'}
MEALS = ('breakfast', 'lunch', 'dinner', 'snack')
TABLE = 'dish_v3_private.catalogues'
SHA = re.compile(r'[0-9a-f]{64}')
RELEASE_ID = re.compile(r'dish-catalogue-v1:[0-9]+(?:\.[0-9]+){2}(?::gm18\.2)?')
ERROR_CODES = (
    'GM51_ACTIVE_CHANGED', 'GM51_RELEASE_CONFLICT', 'GM51_UNKNOWN_RELEASE',
    'GM51_READBACK_MISMATCH',
)


def literal(value):
    return 'null::text' if value is None else upstream.food.literal(value)


def build(target, receipt_bytes):
    receipt_sha = dc.sha(receipt_bytes)
    if target == 'staging' and receipt_sha != STAGING_RECEIPT_SHA:
        raise ValueError('Staging receipt must match the reviewed GM-47 artifact')
    receipt = json.loads(receipt_bytes)
    bucket = f'https://{PROJECTS[target]}.supabase.co/storage/v1/object/public/dish-images'
    if (receipt['bucketPublicUrl'] != bucket or receipt['candidateDatasetVersion'] != UPSTREAM_VERSION
            or len(receipt['objects']) != 300):
        raise ValueError('Expected the target bucket and all 300 GM-47 image objects')
    bundle, report = editorial_build(storage_receipt=receipt)
    upstream_sha = report['candidateSha256']
    if target == 'staging' and upstream_sha != STAGING_UPSTREAM_SHA:
        raise ValueError('Staging input differs from the reviewed GM-47 bundle')

    dishes = bundle['entities']['dishes']
    dish_ids = {dish['id'] for dish in dishes}
    rights = report['descriptionRightsReview']
    reviewed = [dish_id for row in rights for dish_id in row['reviewedDishIds']]
    if (len(rights) != 188 or any(row['status'] != FACT_REFERENCE for row in rights)
            or len(reviewed) != len(dish_ids) or set(reviewed) != dish_ids
            or report['missingDescription'] or set(report['linkedArtwork']) != dish_ids):
        raise ValueError('Every dish requires reviewed description facts and licensed artwork')

    bundle['datasetVersion'] = VERSION
    bundle['usageScope'] = 'production'
    schema = gm41.schema_document()
    schema['properties']['usageScope']['const'] = 'production'
    errors = dc.validate(bundle, schema, codebook=gm41.codebook())
    if bundle['fixtureOnly'] or errors:
        raise ValueError('Invalid hosted release schema: ' + json.dumps(errors, ensure_ascii=False))
    raw = dc.encoded(bundle)
    manifest = {
        'target': target,
        'projectRef': PROJECTS[target],
        'releaseId': release_id(bundle),
        'schemaVersion': bundle['contractVersion'],
        'schemaSha256': dc.sha(dc.encoded(schema)),
        'datasetVersion': VERSION,
        'bundleSha256': dc.sha(raw),
        'counts': {key: len(rows) for key, rows in bundle['entities'].items()},
        'fixtureOnly': False,
        'testOnly': False,
        'usageScope': 'production',
        'upstreamVersion': UPSTREAM_VERSION,
        'upstreamBundleSha256': upstream_sha,
        'storageReceiptSha256': receipt_sha,
        'storageObjectCount': len(receipt['objects']),
        'descriptionRights': {'basis': FACT_REFERENCE, 'references': len(rights), 'dishes': len(reviewed)},
        'coverage': report['coverage'],
        'photos': len(dishes) - report['linkedIllustrations'],
        'illustrations': report['linkedIllustrations'],
    }
    return raw, manifest, report


def verify_bundle(target, input_path, manifest_path, receipt_path, expected_sha):
    raw, manifest, _ = build(target, receipt_path.read_bytes())
    if (expected_sha != manifest['bundleSha256'] or input_path.read_bytes() != raw
            or dc.load_json(manifest_path) != manifest):
        raise ValueError('Bundle, manifest or pinned SHA differs from the approved inputs')
    check = evaluate(input_path)
    if not check['pass'] or input_path.read_bytes() != raw:
        raise ValueError('Release catalogue floor failed or bundle changed during validation')
    return json.loads(raw), manifest


def connection_env(target, dsn):
    """Verify the project in the hostname, or in the tenant of a TLS session pooler."""
    try:
        parsed = urlsplit(dsn)
        project = PROJECTS[target]
        user = unquote(parsed.username or '')
        password = unquote(parsed.password or '')
        host = parsed.hostname or ''
        direct = host == f'db.{project}.supabase.co' and user == 'postgres'
        pooler = (re.fullmatch(r'[a-z0-9-]+\.pooler\.supabase\.com', host)
                  and user == 'postgres.' + project)
        query = parse_qs(parsed.query, keep_blank_values=True, strict_parsing=True)
        if (parsed.scheme not in ('postgres', 'postgresql') or parsed.path != '/postgres'
                or parsed.port not in (None, 5432) or parsed.fragment or not password
                or any(ord(char) < 32 for char in password)
                or query not in ({}, {'sslmode': ['verify-full']}) or not (direct or pooler)):
            raise ValueError
    except ValueError:
        raise ValueError('GM51_SUPABASE_DB_URL must use the confirmed project, database postgres and TLS verification') from None
    return {
        'PGHOST': host, 'PGPORT': '5432', 'PGDATABASE': 'postgres', 'PGUSER': user,
        'PGPASSWORD': password, 'PGSSLMODE': 'verify-full',
        'PGSSLROOTCERT': os.environ.get('GM51_SUPABASE_CA_FILE') or 'system',
        'PGCONNECT_TIMEOUT': '10', 'PGPASSFILE': os.devnull, 'PGCLIENTENCODING': 'UTF8',
        'PGAPPNAME': 'ie307-gm51-catalogue', 'PGGSSENCMODE': 'disable',
    }


def psql(target, sql):
    connection = connection_env(target, os.environ.get('GM51_SUPABASE_DB_URL', ''))
    env = {key: value for key, value in os.environ.items() if not key.startswith('PG') and key != 'GM51_SUPABASE_DB_URL'}
    try:
        result = subprocess.run(
            ['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1'],
            input=sql, capture_output=True, encoding='utf-8', env=env | connection, timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise RuntimeError('psql unavailable or timed out; read back the active release before retrying') from None
    if result.returncode:
        message = next((code for code in ERROR_CODES if 'ERROR:  ' + code in result.stderr), None)
        raise RuntimeError(message or 'Database command failed; verify TLS, access and migration 0067') from None
    return json.loads(result.stdout)


def reference(identifier, sha):
    if identifier == 'none' and sha is None:
        return None, None
    if not identifier or not RELEASE_ID.fullmatch(identifier) or not sha or not SHA.fullmatch(sha):
        raise ValueError('Provide a release ID and SHA-256, or use none without a SHA')
    return identifier, sha


def readback_sql():
    meals = ','.join(f"{literal(meal)},(select count(*) from jsonb_array_elements(c.cards) d "
                     f"where d->'mealSlots' ? {literal(meal)})" for meal in MEALS)
    return f"""select coalesce((select jsonb_build_object(
        'releaseId', c.id, 'sourceSha256', c.source_sha, 'count', jsonb_array_length(c.cards),
        'testOnly', c.test_only, 'active', c.active, 'coverage', jsonb_build_object({meals}))
        from {TABLE} c where c.active), 'null'::jsonb);"""


def switch_sql(desired, expected, *, bundle=None, target):
    identifier, sha = map(literal, desired)
    old_id, old_sha = map(literal, expected)
    production_only = 'and not test_only' if target == 'production' else ''
    install = ''
    if bundle is not None:
        payload = literal(json.dumps(cards(bundle), ensure_ascii=False))
        install = f"""
 insert into {TABLE}(id,source_sha,cards,test_only,active)
 values({identifier},{sha},{payload}::jsonb,false,false) on conflict (id) do nothing;
 if not exists(select 1 from {TABLE} where id={identifier} and source_sha={sha}
               and cards={payload}::jsonb and not test_only) then
  raise exception 'GM51_RELEASE_CONFLICT';
 end if;"""
    body = f"""declare current_id text; current_sha text;
begin
 select id,source_sha into current_id,current_sha from {TABLE} where active;
 if (current_id,current_sha) is distinct from ({identifier},{sha})
    and (current_id,current_sha) is distinct from ({old_id},{old_sha}) then
  raise exception 'GM51_ACTIVE_CHANGED';
 end if;
 {install}
 if {identifier} is not null and not exists(
   select 1 from {TABLE} where id={identifier} and source_sha={sha} {production_only}) then
  raise exception 'GM51_UNKNOWN_RELEASE';
 end if;
 update {TABLE} set active=false where active and id is distinct from {identifier};
 update {TABLE} set active=true where id={identifier} and not active;
 select id,source_sha into current_id,current_sha from {TABLE} where active;
 if (current_id,current_sha) is distinct from ({identifier},{sha}) then
  raise exception 'GM51_READBACK_MISMATCH';
 end if;
end"""
    return (
        'begin; set local standard_conforming_strings=on; set local lock_timeout=\'10s\';\n'
        f'lock table {TABLE} in share row exclusive mode;\n'
        + upstream.do_block(body) + '\n' + readback_sql() + '\ncommit;\n'
    )


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=('hosted-build', 'hosted-import', 'hosted-readback', 'hosted-rollback'))
    parser.add_argument('--target', choices=PROJECTS, required=True)
    parser.add_argument('--storage-receipt', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--input', type=Path)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--sha256')
    parser.add_argument('--release-id')
    parser.add_argument('--expect-active-id')
    parser.add_argument('--expect-active-sha')
    parser.add_argument('--confirm-project')
    parser.add_argument('--apply', action='store_true', help='Explicitly allow a hosted write')
    args = parser.parse_args(argv)
    target = args.target
    project = PROJECTS[target]
    try:
        if args.apply and args.operation not in ('hosted-import', 'hosted-rollback'):
            raise ValueError('--apply is only for hosted-import and hosted-rollback')
        if (args.apply or args.operation == 'hosted-readback') and args.confirm_project != project:
            raise ValueError('Confirm the exact project ref with --confirm-project')
        if args.operation == 'hosted-build':
            if not args.output or not args.storage_receipt:
                raise ValueError('--output and --storage-receipt required')
            raw, manifest, report = build(target, args.storage_receipt.read_bytes())
            args.output.mkdir(parents=True, exist_ok=True)
            bundle_path = args.output / 'dishes.json'
            bundle_path.write_bytes(raw)
            floor = evaluate(bundle_path)
            if not floor['pass']:
                raise ValueError('Release catalogue floor failed')
            for name, document in (
                ('manifest.json', manifest), ('release-floor.json', floor),
                ('description-rights.json', report['descriptionRightsReview']),
                ('linked-artwork.json', report['linkedArtwork']),
            ):
                (args.output / name).write_bytes(dc.encoded(document))
            result = manifest
        elif args.operation == 'hosted-readback':
            result = {'projectRef': project, 'activeRelease': psql(target, 'begin read only;\n' + readback_sql() + '\ncommit;')}
        else:
            expected = reference(args.expect_active_id, args.expect_active_sha)
            bundle = None
            if args.operation == 'hosted-import':
                if not all((args.input, args.manifest, args.storage_receipt, args.sha256)):
                    raise ValueError('--input, --manifest, --storage-receipt and --sha256 required')
                bundle, manifest = verify_bundle(target, args.input, args.manifest, args.storage_receipt, args.sha256)
                desired = manifest['releaseId'], manifest['bundleSha256']
            else:
                desired = reference(args.release_id, args.sha256)
                if expected == (None, None) or expected == desired:
                    raise ValueError('Rollback requires the current release and a different previous release or none')
            result = {
                'projectRef': project, 'dryRun': not args.apply,
                'expectedActive': dict(zip(('releaseId', 'sourceSha256'), expected)),
                'desiredActive': dict(zip(('releaseId', 'sourceSha256'), desired)),
            }
            if bundle is not None:
                result['count'] = len(bundle['entities']['dishes'])
            if args.apply:
                active = psql(target, switch_sql(desired, expected, bundle=bundle, target=target))
                if bundle is not None:
                    counts = {meal: row['dishes'] for meal, row in manifest['coverage'].items()}
                    if active != {
                        'releaseId': desired[0], 'sourceSha256': desired[1], 'count': result['count'],
                        'testOnly': False, 'active': True, 'coverage': counts,
                    }:
                        raise RuntimeError('Readback mismatch; inspect the active release before retrying')
                result['activeRelease'] = active
    except (ValueError, RuntimeError, KeyError, TypeError, OSError) as exc:
        parser.exit(1, f'GM-51: {exc}\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(sys.argv[1:])
