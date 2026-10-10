#!/usr/bin/env python3
"""Real SQL import checks in a process-created DB; simulated data/review only."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import argparse
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import uuid

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from test_food_import import importer,synthetic_reviewed
sys.path.insert(0,str(ROOT/'scripts'))
import gm06_schema_check as gm06


def core_sql(dataset_version):
    core=importer.load_json(ROOT/'supabase/seed/templates/core-v1.template.json')
    def version(v):
        if isinstance(v,dict):
            return {k:dataset_version if k=='datasetVersion' else version(x) for k,x in v.items()}
        if isinstance(v,list):return [version(x) for x in v]
        return v
    core=version(core)
    fields=importer.load_json(ROOT/'docs/data/database-mapping.json')['fields']
    types={f['path']:f['sqlType'] for f in fields if f['contract']=='core'}
    statements=[f"insert into auth.users(id) values('{row['userId']}');" for row in core['entities']['profiles']]
    for entity,rows in core['entities'].items():
        for row in rows:
            cols=','.join(importer.snake(k) for k in row)
            vals=','.join(gm06.sql_literal(v,types[entity+'.'+k]) for k,v in row.items())
            statements.append(f'insert into public.{importer.snake(entity)}({cols}) values({vals});')
    return '\n'.join(statements)+'\nset constraints all immediate;set constraints all deferred;\n'


def core_fingerprint(db):
    names=importer.load_json(ROOT/'supabase/seed/templates/core-v1.template.json')['entities']
    return importer.digest(('\n'.join(db.psql(f'select to_jsonb(r) from public.{importer.snake(name)} r order by id;') for name in names)).encode('utf-8'))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--report',type=Path,required=True)
    args=p.parse_args()
    admin=importer.LocalDB()
    name='gm08_check_'+uuid.uuid4().hex[:16]
    assert re.fullmatch(r'gm08_check_[0-9a-f]{16}',name)
    tests=[]
    def check(title,actual,expected=True):
        if actual!=expected:raise AssertionError(f'{title}: expected={expected!r}, actual={actual!r}')
        tests.append({'case':title,'expected':expected,'actual':actual,'result':'Pass'})
    def reject(db,sql,state):
        try:db.transaction(sql)
        except RuntimeError as exc:
            check('reject '+state,state in str(exc))
            return
        raise AssertionError('Unexpected SQL acceptance')
    created=False
    try:
        ddl=admin.run(['docker','exec',importer.CONTAINER,'pg_dump','-U','postgres','-d','postgres',
                       '--schema-only','--no-owner','--no-privileges','-t','auth.users'])
        ddl='\n'.join(line for line in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm06_',line))
        admin.psql('create database '+name+' template template0;');created=True
        db=importer.LocalDB(name)
        db.psql('create schema auth;\n'+ddl)
        for file in ('0001_core_schema.sql','0002_food_import_receipts.sql'):
            db.psql((ROOT/'supabase/migrations'/file).read_text(encoding='utf-8'))
        check('journal enabled/forced RLS',db.psql("select relrowsecurity and relforcerowsecurity from pg_class where oid='gm08_private.import_receipts'::regclass;").strip(),'t')
        for role in ('anon','authenticated','gm06_publisher'):
            reject(db,f'begin;set local role {role};select count(*) from gm08_private.import_receipts;rollback;','42501')
        db.psql("create table public.gm08_sentinel(id int primary key,note text);insert into public.gm08_sentinel values(1,'keep unrelated data');")
        raw=synthetic_reviewed()
        at=importer.now()
        for rows in raw['entities'].values():
            for row in rows:
                row['checkedAt']=(datetime.now(timezone.utc)-timedelta(days=1)).isoformat().replace('+00:00','Z')
                row['validUntil']=(datetime.now(timezone.utc)+timedelta(days=5)).isoformat().replace('+00:00','Z')
        # All stages/approvals are explicitly synthetic and live only in tmp.
        with tempfile.TemporaryDirectory(prefix='gm08-synthetic-') as tmp:
            directory=Path(tmp)
            source=directory/'input.json';importer.write_json(source,raw)
            stage_dir=directory/'stage';importer.stage(source,stage_dir,at)
            evidence=directory/'synthetic-checks.txt';evidence.write_text('Simulated reviewer for isolated test; NOT real approval\n',encoding='utf-8')
            review=importer.load_json(stage_dir/'review-template.json')
            review.update(decision='Approved',reviewer='synthetic-reviewer',reviewedAt=importer.now(),coverageShortfallAccepted=True,coverageShortfallReason="Synthetic one-venue fixture; NOT actual pilot coverage",
                          evidence=[{'path':evidence.name,'sha256':importer.digest(evidence.read_bytes())}])
            review['checks']={k:True for k in review['checks']}
            review_path=directory/'review.json';importer.write_json(review_path,review)
            bundle,sha,review_sha,preflight=importer.reviewed(stage_dir,review_path,importer.now())
            check('review binds staged input and current publish preflight',preflight['valid'])
            bad=deepcopy(bundle);bad['entities']['venueDishes'][0]['venueId']=str(uuid.uuid4())
            reject(db,importer.publish_sql(bad,'c'*64,review_sha),'23503')
            check('failed FK import leaves zero food rows and zero receipts',db.psql('select count(*) from public.data_sources;select count(*) from gm08_private.import_receipts;').splitlines(),['0','0'])
            # Real concurrency: same reviewed import retried in separate transactions.
            sql=importer.publish_sql(bundle,sha,review_sha)
            with ThreadPoolExecutor(max_workers=2) as pool:
                outputs=list(pool.map(lambda _:db.transaction(sql),range(2)))
            check('concurrent identical imports both converge',len(outputs),2)
            check('exactly one import receipt and one offering',db.psql('select count(*) from gm08_private.import_receipts;select count(*) from public.venue_dishes;').splitlines(),['1','1'])
            check('schedule groups and all weekly days imported',db.psql('select count(*) from public.schedule_groups;select count(*) from public.weekly_schedules;').splitlines(),['2','14'])
            version_before=db.psql('select version from public.dishes;').strip()
            db.transaction(sql)
            check('reimport preserves row version',db.psql('select version from public.dishes;').strip(),version_before)
            query=json.loads(db.psql(importer.query_sql(sha)).strip())
            check('receipt-bound query returns actual synthetic offering',query['offeringCount'],1)
            # Dollar quote / apostrophe text is DATA, never executable PL/pgSQL.
            modified=deepcopy(bundle)
            modified['entities']['dishes'][0]['name']="Cơm '$body$'; rollback; --"
            reject(db,importer.publish_sql(modified,'d'*64,review_sha),'23505')
            check('version collision preserves original dish',db.psql('select name from public.dishes;').strip(),bundle['entities']['dishes'][0]['name'])
            drift=f"update public.dishes set name='external drift',version=version+1 where id='{bundle['entities']['dishes'][0]['id']}';"
            # Nested test statement is one psql transaction; an error rolls it all back.
            rollback=importer.rollback_sql(sha)
            reject(db,'begin;'+drift+rollback.removeprefix('begin;'),'23514')
            check('drift refusal preserves receipt and unrelated sentinel',db.psql("select state from gm08_private.import_receipts;select note from public.gm08_sentinel;").splitlines(),['published','keep unrelated data'])
            reject(db,'begin;'+core_sql('0.1.0')+rollback.removeprefix('begin;'),'23503')
            check('FK-protected rollback refuses referenced dataset atomically',db.psql('select count(*) from public.rooms;select count(*) from public.venue_dishes;').splitlines(),['0','1'])
            db.transaction(rollback)
            check('rollback removes only imported food/group rows',db.psql('select count(*) from public.dishes;select count(*) from public.schedule_groups;select count(*) from auth.users;').splitlines(),['0','0','0'])
            db.transaction(rollback)
            check('rollback retry converges',db.psql('select state from gm08_private.import_receipts;').strip(),'rolled_back')
            reject(db,sql,'23514')
            # New dataset version, same stable IDs, then a reviewed changed version.
            first=deepcopy(bundle)
            first['datasetVersion']='0.2.0'
            first['entities']['datasetVersions'][0].update(id=str(uuid.uuid4()),datasetVersion='0.2.0')
            first['entities']['coverageAreas'][0]['datasetVersion']='0.2.0'
            first_sha='e'*64
            db.transaction(importer.publish_sql(first,first_sha,review_sha))
            db.psql('begin;'+core_sql('0.2.0')+'commit;')
            core_before=core_fingerprint(db)
            second=deepcopy(first);second['datasetVersion']='0.3.0'
            second['entities']['datasetVersions'][0].update(id=str(uuid.uuid4()),datasetVersion='0.3.0',previousVersionId=first['entities']['datasetVersions'][0]['id'])
            second['entities']['coverageAreas'][0].update(datasetVersion='0.3.0',version=2)
            second['entities']['dishes'][0]['name']="Cơm '$body$'; rollback; --"
            reject(db,importer.publish_sql(second,'f'*64,review_sha),'23514')
            check('content change without version increment rolls back new dataset',db.psql("select count(*) from public.dataset_versions where dataset_version='0.3.0';").strip(),'0')
            second['entities']['dishes'][0]['version']=2
            db.transaction(importer.publish_sql(second,'f'*64,review_sha))
            check('publish does not alter locked rooms/results/history',core_fingerprint(db),core_before)
            check('quoted SQL-looking text persisted literally',db.psql('select name from public.dishes;').strip(),second['entities']['dishes'][0]['name'])
            reject(db,importer.rollback_sql(first_sha),'23514')
            db.transaction(importer.rollback_sql('f'*64))
            check('rollback does not alter locked rooms/results/history',core_fingerprint(db),core_before)
            check('newest version rollback restores previous content monotonically',db.psql('select name from public.dishes;select version from public.dishes;').splitlines(),[first['entities']['dishes'][0]['name'],'3'])
            check('rollback preserves previous dataset and core snapshots',db.psql("select count(*) from public.dataset_versions;select count(*) from public.rooms;select note from public.gm08_sentinel;").splitlines(),['1','1','keep unrelated data'])
            reject(db,importer.query_sql(first_sha),'23514')
            # Journal cannot be down-migrated destructively by production tooling.
            check('food schema version unchanged',db.psql('select schema_version from public.schema_versions;').strip(),'0.1.0')
        report={'result':'Pass','dataMode':'synthetic fixtures and simulated independent review ONLY',
                'verifiedDatasetPublished':False,'databaseMode':'process-created isolated database; real Supabase auth.users DDL',
                'postgresVersion':db.psql("select current_setting('server_version');").strip(),
                'checkedAt':importer.now(),'cases':tests,'caseCount':len(tests),
                'artifactHashes':{str(path.relative_to(ROOT)):importer.digest(path.read_bytes()) for path in
                    (ROOT/'supabase/seed/import_food_data.py',Path(__file__),ROOT/'tests/test_food_import.py',
                     ROOT/'supabase/migrations/0001_core_schema.sql',ROOT/'supabase/migrations/0002_food_import_receipts.sql')},
                'cleanup':'pending'}
    finally:
        if created:
            admin.psql('drop database '+name+';')
    report['cleanup']='process-created database dropped; unrelated containers/data untouched'
    importer.write_json(args.report,report)
    print(json.dumps({'result':report['result'],'caseCount':len(tests),'verifiedDatasetPublished':False}))


if __name__=='__main__':main()
