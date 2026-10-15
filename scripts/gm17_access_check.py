#!/usr/bin/env python3
"""GM-17 isolated real PostgreSQL multi-identity/retention verification."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import uuid
from gm06_schema_check import ROOT, CONTAINER, run, psql, sql_literal, snake, check_tap


def guard_local():
    from gm06_schema_check import tomllib
    endpoint = os.environ.get('DOCKER_HOST') or json.loads(run(['docker','context','inspect','--format','{{json .Endpoints.docker.Host}}']).strip())
    if not endpoint.startswith(('unix://','npipe://')):
        raise RuntimeError('Only a local Docker socket is permitted')
    config = tomllib.loads((ROOT/'supabase/config.toml').read_text(encoding='utf-8'))
    if config['project_id']!='gi-cung-duoc-local' or config['db']['port']!=54322 or config['api']['port']!=54321:
        raise RuntimeError('Unexpected local config')
    info = json.loads(run(['docker','inspect','--format','{{json .}}',CONTAINER]))
    if not info['State']['Running'] or not info['Config']['Image'].startswith(('public.ecr.aws/supabase/postgres:17','ghcr.io/supabase/postgres:17','supabase/postgres:17')):
        raise RuntimeError('Expected running local Supabase PostgreSQL17')


def fixture_sql(namespace, users=None, now=None):
    """Only synthetic data; never promote an imported or real dataset."""
    now = now or datetime.now(timezone.utc)
    baseline = datetime(2026,10,9,14,20,tzinfo=timezone.utc)
    delta = now-baseline
    templates = {k:json.loads((ROOT/f'supabase/seed/templates/{k}-v1.template.json').read_text(encoding='utf-8')) for k in ['food','core']}
    identity = {}
    if users:
        identity.update({r['userId']:u for r,u in zip(templates['core']['entities']['profiles'],users)})
    def transform(v):
        if isinstance(v,dict): return {k:transform(x) for k,x in v.items()}
        if isinstance(v,list): return [transform(x) for x in v]
        if isinstance(v,str):
            if re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',v):
                return identity.setdefault(v,str(uuid.uuid5(namespace,v)))
            if re.fullmatch(r'\d{4}-\d\d-\d\dT.*Z',v):
                return (datetime.fromisoformat(v.replace('Z','+00:00'))+delta).isoformat()
        return v
    bundles = transform(templates)
    for r in bundles['core']['entities']['friends']:
        r['lowUserId'],r['highUserId']=sorted([r['lowUserId'],r['highUserId']])
    # Unique natural keys allow a test namespace to coexist with local fixtures.
    tag=hashlib.sha256(namespace.bytes).hexdigest()[:8]
    for r in bundles['food']['entities']['taxonomy']: r['code']+='_'+tag
    bundles['food']['entities']['datasetVersions'][0]['datasetVersion']='0.17.'+str(int(tag,16))
    bundles['food']['entities']['coverageAreas'][0]['datasetVersion']=bundles['food']['entities']['datasetVersions'][0]['datasetVersion']
    for r in bundles['core']['entities']['rooms']:
        alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        r['code']=''.join(alphabet[x%len(alphabet)] for x in hashlib.sha256(namespace.bytes).digest()[:6])
        r['datasetVersion']=bundles['food']['entities']['datasetVersions'][0]['datasetVersion']
    for r in bundles['core']['entities']['roundDishes']: r['datasetVersion']=bundles['core']['entities']['rooms'][0]['datasetVersion']
    types = {(f['contract'],f['path']):f['sqlType'] for f in json.loads((ROOT/'docs/data/database-mapping.json').read_text(encoding='utf-8'))['fields']}
    lines=['begin; set constraints all deferred;']
    if not users:
        for r in bundles['core']['entities']['profiles']: lines.append(f"insert into auth.users(id) values('{r['userId']}');")
    groups={r['scheduleId']:r for r in bundles['food']['entities']['weeklySchedules']}
    for r in groups.values():
        row={k:r[k] for k in ['scheduleId','ownerType','ownerId','timezone','reviewStatus','version']}
        lines.append('insert into public.schedule_groups('+','.join(snake(k) for k in row)+') values('+','.join(sql_literal(v,'uuid' if k in ['scheduleId','ownerId'] else 'bigint' if k=='version' else 'text') for k,v in row.items())+');')
    for kind,b in bundles.items():
        for entity,rows in b['entities'].items():
            # GM-22 provisions profiles from auth.users. When a caller
            # supplies existing synthetic identities, keep those trigger-owned
            # profiles instead of inserting a second row for the same user.
            if users and kind == 'core' and entity == 'profiles':
                continue
            for row in rows:
                # UUID-free group/dedupe hashes are test namespace scoped too.
                if 'groupKey' in row: row['groupKey']=hashlib.sha256(namespace.bytes).hexdigest()
                if 'dedupeKey' in row: row['dedupeKey']+='-'+namespace.hex
                lines.append('insert into public.'+snake(entity)+'('+','.join(snake(k) for k in row)+') values('+','.join(sql_literal(v,types[(kind,entity+'.'+k)]) for k,v in row.items())+');')
    lines+=['set constraints all immediate; commit;']
    return '\n'.join(lines),bundles


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args()
    guard_local()
    database='gm17_check_'+uuid.uuid4().hex[:16]
    created=False
    report={'contractVersion':'food-v1/roadmap-v2/GM-17.1','schemaVersion':'0.2.0','fixtureOnly':True,
            'checkedAt':datetime.now(timezone.utc).isoformat(),'mode':'disposable real PostgreSQL; SQL claims do not prove JWT validation'}
    try:
        auth=run(['docker','exec',CONTAINER,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-privileges','-t','auth.users'])
        auth='\n'.join(line for line in auth.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm\d+_',line))
        uid=psql('postgres',"select pg_get_functiondef('auth.uid()'::regprocedure);")
        psql('postgres',f'create database {database} template template0;')
        created=True
        psql(database,'create schema auth;\n'+auth+'\n'+uid+';\ngrant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create schema extensions; create extension pgtap with schema extensions; grant usage on schema extensions to anon,authenticated;')
        paths=sorted((ROOT/'supabase/migrations').glob('*.sql'))
        fixture_namespace=uuid.UUID('17000000-0000-4000-8000-000000000017')
        old_fixture_namespace=uuid.UUID('17000000-0000-4000-8000-000000000018')
        for path in paths:
            if path.name.startswith('0004_'):
                fixture,bundles=fixture_sql(fixture_namespace)
                psql(database,fixture)
                old_fixture,old=fixture_sql(old_fixture_namespace,now=datetime.now(timezone.utc)-timedelta(hours=24,seconds=1))
                psql(database,old_fixture)
            psql(database,path.read_text(encoding='utf-8'))
        # The local draft may have been applied while it was being edited. Check
        # deployed security definitions against this freshly applied final file,
        # rather than assuming the migration version number proves equivalence.
        snapshot="""select jsonb_build_object(
          'functions',(select jsonb_agg(jsonb_build_array(p.proname,pg_get_function_identity_arguments(p.oid),replace(p.prosrc,E'\\r\\n',E'\\n'),p.prosecdef,p.proconfig,
            has_function_privilege('anon',p.oid,'EXECUTE'),has_function_privilege('authenticated',p.oid,'EXECUTE'),has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname)
            from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='gm17_private'),
          'policies',(select jsonb_agg(jsonb_build_array(tablename,policyname,roles,qual,with_check) order by tablename,policyname) from pg_policies where policyname like 'gm17_%'),
          'columnGrants',(select jsonb_agg(jsonb_build_array(table_name,column_name,grantee,privilege_type) order by table_name,column_name,grantee,privilege_type)
            from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated')
            and table_name in ('taxonomy','dishes','venues','venue_dishes','weekly_schedules','date_exceptions','availability_overrides','coverage_areas','public_anchors','data_sources','dataset_versions','profiles','rooms','members','preferences','round_dishes','submissions','votes','results','consents','histories','friends','friend_invitations','room_invitations','inbox','devices','events','deliveries','idempotency','schedule_groups','schema_versions')));"""
        fresh=json.loads(psql(database,snapshot))
        local=json.loads(psql('postgres',snapshot))
        report['localDeploymentMatchesFresh']=local==fresh
        if local!=fresh:
            differences={}
            for key in fresh:
                if local[key]!=fresh[key]:
                    # Names/privilege metadata only, never function bodies/data.
                    a={json.dumps(r,sort_keys=True) for r in fresh[key] or []}
                    b={json.dumps(r,sort_keys=True) for r in local[key] or []}
                    differences[key]={'freshOnly':[json.loads(r)[:2] for r in sorted(a-b)][:20],
                                      'localOnly':[json.loads(r)[:2] for r in sorted(b-a)][:20]}
            raise RuntimeError('Local deployment differs: '+json.dumps(differences))
        sql=(ROOT/'supabase/tests/rls.sql').read_text(encoding='utf-8')
        for token,value in {
          '__USER_A__':bundles['core']['entities']['profiles'][0]['userId'],
          '__USER_B__':bundles['core']['entities']['profiles'][1]['userId'],
          '__ROOM__':bundles['core']['entities']['rooms'][0]['id'],
          '__RESULT__':bundles['core']['entities']['results'][0]['id'],
          '__SUB_A__':bundles['core']['entities']['submissions'][0]['id'],
          '__SUB_B__':bundles['core']['entities']['submissions'][1]['id'],
          '__HISTORY__':bundles['core']['entities']['histories'][0]['id'],
          '__CONSENT__':bundles['core']['entities']['consents'][0]['id'],
          '__GROUP_HISTORY__':bundles['core']['entities']['histories'][1]['id'],
          '__OLD_ROOM__':old['core']['entities']['rooms'][0]['id'],
          '__OLD_HISTORY__':old['core']['entities']['histories'][0]['id'],
          '__OLD_RESULT__':old['core']['entities']['results'][0]['id'],
        }.items(): sql=sql.replace(token,value)
        output=psql(database,sql)
        report['assertions']=check_tap(output)
        report['tap']=output
        # A second independent psql connection holds the cleanup advisory lock.
        import subprocess,time
        lock=subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-X','-U','postgres','-d',database,'-At'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8')
        try:
            lock.stdin.write('begin;select pg_advisory_xact_lock(170017);select pg_sleep(5);rollback;\n'); lock.stdin.close()
            time.sleep(1)
            report['concurrentCleanup']=json.loads(psql(database,'select gm17_private.cleanup();').strip())
            if report['concurrentCleanup']!={'skipped':True}: raise RuntimeError('Concurrent cleanup did not skip')
        finally:
            lock.wait(timeout=15)
        report['artifactHashes']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths+[ROOT/'supabase/tests/rls.sql',Path(__file__)]}
        report['result']='Pass'
    finally:
        if created: psql('postgres',f'drop database {database};')
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ['tap','artifactHashes']}))


if __name__=='__main__':
    try: main()
    except Exception as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
