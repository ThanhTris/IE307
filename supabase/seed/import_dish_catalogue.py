"""GM-40: validate/stage/load/readback existing 0026 storage on owned QA DB only.

No schema/API changes, new runtime authority, production publish or app DB writes.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path
import re
import sys
import uuid

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
sys.path.insert(0, str(ROOT / 'scripts'))
import dish_catalogue as contract
from dish_policy_worker import verify as verify_runtime

spec = importlib.util.spec_from_file_location('gm40_food_db', ROOT / 'supabase/seed/import_food_data.py')
food = importlib.util.module_from_spec(spec)
spec.loader.exec_module(food)


def candidate(path, manifest_path=None):
    raw = Path(path).read_bytes()
    bundle = contract.load_json(path)
    if raw != Path(path).read_bytes():
        raise ValueError('Input changed while validating')
    errors = contract.validate(bundle)
    if errors:
        raise ValueError(json.dumps(errors, ensure_ascii=False))
    if bundle['fixtureOnly'] or not bundle['entities']['dishes']:
        raise ValueError('Real draft test/demo catalogue required; no fixture or empty release')
    digest = contract.sha(raw)
    if manifest_path:
        manifest = contract.load_json(manifest_path)
        if (manifest['bundleSha256'] != digest or manifest['datasetVersion'] != bundle['datasetVersion']
                or manifest['schemaVersion'] != bundle['contractVersion']
                or manifest['counts'] != {k: len(v) for k, v in bundle['entities'].items()}
                or manifest['schemaSha256'] != contract.sha(contract.encoded(contract.schema_document()))
                or manifest['fixtureOnly'] or manifest['status'] != 'draft'):
            raise ValueError('Manifest does not match draft bundle/schema/counts')
    return bundle, digest


def cards(bundle):
    # Explicit runtime projection; no internal editor identities or invented tags.
    return [{'dishId': d['id'], **{k: d[k] for k in [
        'name', 'description', 'artwork', 'mealSlots', 'cuisineIds', 'categoryIds']}}
        for d in sorted(bundle['entities']['dishes'], key=lambda d: d['id'])]


def release_id(bundle):
    return bundle['profile'] + ':' + bundle['datasetVersion']


def stage(path, directory, manifest_path=None):
    bundle, digest = candidate(path, manifest_path)
    directory = Path(directory)
    if Path(path).resolve().is_relative_to(directory.resolve()):
        raise ValueError('Staging directory must not contain/overwrite source input')
    document = {'releaseId': release_id(bundle), 'profile': bundle['profile'],
                'contractVersion': bundle['contractVersion'], 'datasetVersion': bundle['datasetVersion'],
                'sourceSha256': digest, 'testOnly': True, 'cards': cards(bundle)}
    directory.mkdir(parents=True, exist_ok=True)
    # Retain complete validated provenance outside runtime cards, pinned by hash.
    raw = Path(path).read_bytes()
    if contract.sha(raw) != digest:
        raise ValueError('Input changed after validation')
    (directory / 'bundle.json').write_bytes(raw)
    (directory / 'stage.json').write_bytes(contract.encoded(document))
    return document


def owned(db, namespace):
    namespace = str(uuid.UUID(str(namespace)))
    if not re.fullmatch(r'gm08_check_[0-9a-f]{16}', db.database):
        raise ValueError('Only process-owned disposable QA database allowed')
    marker = db.psql('select namespace::text from public.gm40_qa_owner;').strip()
    if marker != namespace:
        raise ValueError('QA ownership marker mismatch')
    verify_runtime(db)


def readback(db, namespace, identifier):
    owned(db, namespace)
    sql = "select coalesce((select row_to_json(c) from dish_v3_private.catalogues c where id=" + food.literal(identifier) + "),'null'::json);"
    return json.loads(db.psql(sql).strip())


def do_block(body):
    # A source name/description may contain a dollar tag even inside a quoted
    # SQL literal. Choose an outer delimiter absent from the complete body.
    tag = '$gm40$'
    while tag in body:
        tag = '$' + tag[1:-1] + '_next$'
    return 'do ' + tag + '\n' + body + '\n' + tag + ';'


def import_sql(bundle, digest, activate=False, fail_after_insert=False):
    # Trusted literals only; all checks and activation in a single transaction.
    identifier = food.literal(release_id(bundle))
    sha = food.literal(digest)
    payload = food.literal(json.dumps(cards(bundle), ensure_ascii=False))
    failure = "raise exception using errcode='P0001',message='GM40_TEST_FAILURE';" if fail_after_insert else ''
    activation = f"update dish_v3_private.catalogues set active=false where active and id<>{identifier};update dish_v3_private.catalogues set active=true where id={identifier};" if activate else ''
    body = f"""declare existing dish_v3_private.catalogues%rowtype;
begin
 select * into existing from dish_v3_private.catalogues where id={identifier} for update;
 if found then
  if existing.source_sha<>{sha} or existing.cards<>{payload}::jsonb or not existing.test_only then
   raise exception using errcode='23505',message='GM40_RELEASE_CONFLICT';
  end if;
 else
  insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active)
  values({identifier},{sha},{payload}::jsonb,true,false);
 end if;
 {activation}
 {failure}
 if not exists(select 1 from dish_v3_private.catalogues where id={identifier}
   and source_sha={sha} and cards={payload}::jsonb and test_only) then
  raise exception using errcode='23514',message='GM40_READBACK_MISMATCH';
 end if;
end"""
    return ("begin;set local standard_conforming_strings=on;\n"
            "select pg_advisory_xact_lock(hashtextextended('gm40:catalogue-qa-import',0));\n"
            + do_block(body) + '\ncommit;\n')


def install(db, namespace, path, manifest_path=None, activate=False, fail_after_insert=False):
    owned(db, namespace)
    bundle, digest = candidate(path, manifest_path)
    db.transaction(import_sql(bundle, digest, activate, fail_after_insert))
    actual = readback(db, namespace, release_id(bundle))
    if actual['source_sha'] != digest or actual['cards'] != cards(bundle) or not actual['test_only']:
        raise RuntimeError('Readback differs from validated candidate')
    return actual


def activate(db, namespace, identifier):
    owned(db, namespace)
    # Restoring a known release changes only active; immutable cards/hash retained.
    key = food.literal(identifier)
    body = f"""begin
 if not exists(select 1 from dish_v3_private.catalogues where id={key} and test_only) then
  raise exception using errcode='23503',message='GM40_UNKNOWN_RELEASE';
 end if;
 update dish_v3_private.catalogues set active=false where active and id<>{key};
 update dish_v3_private.catalogues set active=true where id={key};
end"""
    db.transaction("begin;select pg_advisory_xact_lock(hashtextextended('gm40:catalogue-qa-import',0));\n"
                   + do_block(body) + '\ncommit;')
    return readback(db, namespace, identifier)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('operation', choices=['validate', 'stage', 'import', 'readback', 'activate'])
    p.add_argument('--input', type=Path, default=ROOT / contract.BUNDLE_PATH)
    p.add_argument('--manifest', type=Path)
    p.add_argument('--staging-dir', type=Path)
    p.add_argument('--database')
    p.add_argument('--namespace')
    p.add_argument('--release-id')
    p.add_argument('--activate', action='store_true')
    args = p.parse_args()
    if args.operation == 'validate':
        b, digest = candidate(args.input, args.manifest)
        result = {'valid': True, 'releaseId': release_id(b), 'sourceSha256': digest, 'count': len(cards(b))}
    elif args.operation == 'stage':
        if not args.staging_dir:
            p.error('--staging-dir required')
        result = stage(args.input, args.staging_dir, args.manifest)
    else:
        if not args.database or not args.namespace:
            p.error('Owned QA --database and --namespace required; app DB is never a target')
        db = food.LocalDB(args.database)
        if args.operation == 'import':
            result = install(db, args.namespace, args.input, args.manifest, args.activate)
        else:
            if not args.release_id:
                p.error('--release-id required')
            result = (activate if args.operation == 'activate' else readback)(db, args.namespace, args.release_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
