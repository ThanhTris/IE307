#!/usr/bin/env python3
"""Load an unchanged real draft bundle in a process-created test DB, never publish."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('food_import', ROOT / 'supabase/seed/import_food_data.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def candidate(path):
    raw = Path(path).read_bytes()
    bundle = importer.load_json(path)
    if Path(path).read_bytes() != raw:
        raise ValueError('Input changed while reading candidate')
    preflight = importer.preflight(bundle, importer.now())
    if not preflight['valid']:
        raise ValueError('Candidate must pass draft preflight')
    if bundle['fixtureOnly'] or any(row['reviewStatus'] != 'draft'
                                   for rows in bundle['entities'].values() for row in rows):
        raise ValueError('Real draft data only; no fixture or verified/published candidate')
    return bundle, importer.digest(raw), preflight


def load_sql(bundle, commit=True):
    # Reuse the actual importer's mapped columns, normalization, upsert and locking.
    # Do not call reviewed()/publish_sql(), change rows, or create a publish receipt.
    payload = importer.literal(json.dumps(importer.records(bundle), ensure_ascii=False))
    return importer.sql_prelude() + f'''
create temp table gm08_test_input(payload jsonb) on commit drop;
insert into gm08_test_input values ({payload}::jsonb);
do $load$
declare tbl record; row_value jsonb;
begin
  for tbl in select * from jsonb_each((select payload from gm08_test_input)) loop
    for row_value in select value from jsonb_array_elements(tbl.value) loop
      perform pg_temp.gm08_put(tbl.key, row_value);
    end loop;
  end loop;
  set constraints all immediate;
end$load$;
''' + ('commit;' if commit else 'rollback;')


def readback(db):
    result = {}
    for table, (key, columns) in importer.mapping().items():
        projection = ','.join(f"'{c}',to_jsonb(r.{c})" for c in columns)
        result[table] = json.loads(db.psql(
            f"select coalesce(jsonb_agg(jsonb_build_object({projection}) order by r.{key}), '[]'::jsonb) "
            f'from public.{table} r;').strip())
    return result


def normalized_input(db, bundle):
    result = {}
    for table, (key, columns) in importer.mapping().items():
        payload = importer.literal(json.dumps(importer.records(bundle)[table], ensure_ascii=False))
        projection = ','.join(f"'{c}',to_jsonb(r.{c})" for c in columns)
        result[table] = json.loads(db.psql(
            f"select coalesce(jsonb_agg(jsonb_build_object({projection}) order by r.{key}), '[]'::jsonb) "
            f'from jsonb_populate_recordset(null::public.{table},{payload}::jsonb) r;').strip())
    return result


def remove_loaded_sql(bundle):
    # The runner owns this fresh DB and requires an empty baseline. Delete only
    # the exact loaded keys; all deferred FKs are checked before commit.
    statements = [importer.sql_prelude()]
    for table, (key, _) in reversed(list(importer.mapping().items())):
        ids = [row[key] for row in importer.records(bundle)[table]]
        if ids:
            values = ','.join(importer.literal(v) + '::uuid' for v in ids)
            statements.append(f'delete from public.{table} where {key} in ({values});')
    statements.append('set constraints all immediate;commit;')
    return '\n'.join(statements)


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='strict', newline='\n')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--readback', type=Path, required=True)
    args = parser.parse_args()
    bundle, sha, preflight = candidate(args.input)
    if args.report.resolve() == args.readback.resolve() or args.input.resolve() in (
            args.report.resolve(), args.readback.resolve()):
        raise ValueError('Input, report and readback must be distinct files')
    admin = importer.LocalDB()
    name = 'gm08_check_' + uuid.uuid4().hex[:16]
    cases = []

    def check(title, actual, expected=True):
        if actual != expected:
            raise AssertionError(f'{title}: expected={expected!r}, actual={actual!r}')
        cases.append(dict(case=title, actual=actual, expected=expected, result='Pass'))

    def rejects(db, title, sql, state):
        try:
            db.transaction(sql)
        except RuntimeError as exc:
            check(title, state in str(exc))
        else:
            raise AssertionError(title + ': SQL unexpectedly accepted')

    created = False
    report = dict(result='Fail', dataMode='Unchanged real draft bundle; no fabricated review or facts',
                  fixtureOnly=False, verifiedDatasetPublished=False, publicationPerformed=False,
                  inputPath=str(args.input.resolve()), bundleSha256=sha,
                  datasetVersion=bundle['datasetVersion'], schemaVersion='0.1.0',
                  foodContractVersion='1.1.0', startedAt=importer.now(), cases=cases)
    try:
        ddl = admin.run(['docker', 'exec', importer.CONTAINER, 'pg_dump', '-U', 'postgres',
                         '-d', 'postgres', '--schema-only', '--no-owner', '--no-privileges', '-t', 'auth.users'])
        ddl = '\n'.join(line for line in ddl.splitlines()
                        if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm06_', line))
        admin.psql('create database ' + name + ' template template0;')
        created = True
        db = importer.LocalDB(name)
        db.psql('create schema auth;\n' + ddl)
        for filename in ('0001_core_schema.sql', '0002_food_import_receipts.sql'):
            db.psql((ROOT / 'supabase/migrations' / filename).read_text(encoding='utf-8'))
        db.psql("create table public.gm08_test_sentinel(id int primary key,note text);"
                "insert into public.gm08_test_sentinel values(1,'keep unrelated data');")
        baseline = readback(db)
        check('fresh test DB has no food/group rows', all(not rows for rows in baseline.values()))
        rejects(db, 'reproduce original description shape rejection', load_sql(bundle), '23514')
        check('failed original load rolls back every row', readback(db) == baseline)
        migration = ROOT / 'supabase/migrations/0003_food_provenance_description.sql'
        db.psql(migration.read_text(encoding='utf-8'))
        check('upgrade preserves unrelated row', db.psql('select note from public.gm08_test_sentinel;').strip(),
              'keep unrelated data')
        check('all eleven provenance checks include description', db.psql(
            "select count(*) from pg_constraint where conname like '%_field_sources_shape' "
            "and pg_get_constraintdef(oid) like '%\"description\"%';").strip(), '11')
        expected = normalized_input(db, bundle)
        # schedule_groups are storage-derived, not input records. The GM-06
        # weekly row lock increments each group once per inserted interval.
        for group in expected['schedule_groups']:
            group['version'] += sum(row['schedule_id'] == group['schedule_id']
                                    for row in expected['weekly_schedules'])
        db.transaction(load_sql(bundle, commit=False))
        check('successful draft load can transactionally ROLLBACK', readback(db) == baseline)
        db.transaction(load_sql(bundle))
        actual = readback(db)
        for table, rows in expected.items():
            check('exact typed roundtrip: ' + table, actual[table] == rows)
            check('row count: ' + table, len(actual[table]), len(rows))
        check('all loaded rows remain draft and nonfixture', all(
            row['review_status'] == 'draft' and row['fixture_only'] is False
            for rows in actual.values() for row in rows))
        query_sql = '''select coalesce(jsonb_agg(jsonb_build_object(
          'offeringId',o.offering_id,'venueId',v.id,'dishId',d.id,'venue',v.branch_name,
          'dish',d.name,'menuName',o.menu_name,'priceMin',o.price_min,'priceMax',o.price_max,
          'unit',o.unit,'currency',o.currency,'lat',v.lat,'lng',v.lng,
          'serviceMode',o.service_mode,'offeringScheduleId',o.schedule_id,
          'adminAreaId',v.admin_area_id,'validUntil',o.valid_until,'reviewedBy',o.reviewed_by
          ) order by o.offering_id),'[]'::jsonb)
          from public.venue_dishes o join public.venues v on v.id=o.venue_id
          join public.dishes d on d.id=o.dish_id;'''
        joined = json.loads(db.psql(query_sql).strip())
        check('query joins every actual venue-dish offering', len(joined), preflight['rowCounts']['venueDishes'])
        check('unknown offering hours/service mode stay null', all(
            row['serviceMode'] is None and row['offeringScheduleId'] is None for row in joined))
        check('draft does not create a publish receipt', db.psql('select count(*) from gm08_private.import_receipts;').strip(), '0')
        db.transaction(load_sql(bundle))
        check('committed reimport has identical rows, keys and versions', readback(db) == actual)
        null_counts = {table: {column: sum(row[column] is None for row in rows)
                              for column in importer.mapping()[table][1]}
                       for table, rows in actual.items()}
        source = bundle['entities']['dataSources'][0]['sourceRef']
        dish = bundle['entities']['dishes'][0]['id']
        for title, value, state in [
                ('invalid description UUID rejected', 'not-a-uuid', '23514'),
                ('null description source rejected', None, '23514'),
                ('dangling description source FK rejected', '00000000-0000-0000-0000-000000000000', '23503')]:
            payload = importer.literal(json.dumps({'description': value}))
            rejects(db, title, f"begin;update public.dishes set field_sources={payload}::jsonb,version=version+1 "
                    f"where id='{dish}';set constraints all immediate;rollback;", state)
        rejects(db, 'unknown provenance key still rejected',
                f"begin;update public.dishes set field_sources=jsonb_build_object('unsupported','{source}'),"
                f"version=version+1 where id='{dish}';set constraints all immediate;rollback;", '23514')
        check('rejected provenance changes leave actual bundle intact', readback(db) == actual)
        db.transaction(remove_loaded_sql(bundle))
        check('committed dataset rollback restores empty baseline', readback(db) == baseline)
        db.transaction(remove_loaded_sql(bundle))
        check('dataset rollback retry is idempotent', readback(db) == baseline)
        check('rollback preserves unrelated row and real auth baseline',
              db.psql('select note from public.gm08_test_sentinel;select count(*) from auth.users;').splitlines(),
              ['keep unrelated data', '0'])
        check('input bytes are unchanged', importer.digest(args.input.read_bytes()), sha)
        dump = dict(bundleSha256=sha, publicationPerformed=False, rowCounts={k:len(v) for k,v in actual.items()},
                    nullCounts=null_counts, rows=actual, joinedOfferings=joined, joinedQuerySQL=query_sql)
        importer.write_json(args.readback, dump)
        report.update(result='Pass', caseCount=len(cases), rowCounts=preflight['rowCounts'],
                      scheduleGroups=len(actual['schedule_groups']), nullCounts=null_counts,
                      postgresVersion=db.psql("select current_setting('server_version');").strip(),
                      databaseMode='process-created isolated database; real Supabase auth.users DDL',
                      readbackSha256=importer.digest(args.readback.read_bytes()),
                      readbackPath=str(args.readback.resolve()),
                      artifactHashes={str(p.relative_to(ROOT)):importer.digest(p.read_bytes()) for p in
                          (Path(__file__), ROOT/'supabase/seed/import_food_data.py',
                           *sorted((ROOT/'supabase/migrations').glob('*.sql')))},
                      checkedAt=importer.now())
    finally:
        if created:
            admin.psql('drop database ' + name + ';')
        report['cleanup'] = 'process-created database dropped' if created else 'no test database created'
        importer.write_json(args.report, report)
    print(json.dumps({k:report[k] for k in ('result','caseCount','rowCounts','publicationPerformed')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
