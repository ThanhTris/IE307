#!/usr/bin/env python3
"""Real local PostgreSQL checks; never reset or connect to a remote database."""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import locale
import os
from pathlib import Path
import re
import platform
import subprocess
import sys
import time
import tomllib
import uuid

ROOT = Path(__file__).resolve().parents[1]
CONTAINER = 'supabase_db_gi-cung-duoc-local'


def run(args, sql=None):
    proc = subprocess.run(args, input=sql, text=True, encoding='utf-8',
                          capture_output=True, timeout=180)
    if proc.returncode:
        raise RuntimeError((proc.stderr or proc.stdout)[-6000:])
    return proc.stdout


def psql(database, sql):
    return run(['docker','exec','-i',CONTAINER,'psql','-X','-U','postgres','-d',database,
                '-v','ON_ERROR_STOP=1','-At'], sql)


def snake(s):
    return re.sub(r'(?<!^)(?=[A-Z])','_',s).lower()


def sql_literal(value, sql_type):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int,float)):
        return str(value)
    if sql_type.endswith('[]'):
        return 'ARRAY['+','.join(sql_literal(x,sql_type[:-2]) for x in value)+']::'+sql_type
    if sql_type == 'jsonb':
        value = json.dumps(value,ensure_ascii=False,separators=(',',':'))
    return "'"+str(value).replace("'","''")+"'::"+sql_type


def fixture_sql():
    """Synthetic fixtures only; not a general importer or publish command."""
    mapping = json.loads((ROOT/'docs/data/database-mapping.json').read_text(encoding='utf-8'))['fields']
    types = {(f['contract'],f['path']):f['sqlType'] for f in mapping}
    food = json.loads((ROOT/'supabase/seed/templates/food-v1.template.json').read_text(encoding='utf-8'))
    core = json.loads((ROOT/'supabase/seed/templates/core-v1.template.json').read_text(encoding='utf-8'))
    assert food['fixtureOnly'] is True and core['fixtureOnly'] is True
    statements = ['-- fixtureOnly=true; synthetic GM-04 IDs, no real records.']
    for row in core['entities']['profiles']:
        statements.append(f"insert into auth.users(id) values ({sql_literal(row['userId'],'uuid')});")
    groups = {}
    for r in food['entities']['weeklySchedules']:
        group = {k:r[k] for k in ['scheduleId','ownerType','ownerId','timezone','reviewStatus','version']}
        if r['scheduleId'] in groups and groups[r['scheduleId']] != group:
            raise ValueError('Fixture has conflicting schedule group')
        groups[r['scheduleId']] = group
    for r in groups.values():
        columns = ','.join(snake(k) for k in r)
        values = ','.join(sql_literal(v,'uuid' if k in ['scheduleId','ownerId'] else 'bigint' if k=='version' else 'text') for k,v in r.items())
        statements.append(f'insert into public.schedule_groups({columns}) values ({values});')
    for kind,bundle in [('food',food),('core',core)]:
        for entity,rows in bundle['entities'].items():
            for row in rows:
                columns = ','.join(snake(k) for k in row)
                values = ','.join(sql_literal(v,types[(kind,entity+'.'+k)]) for k,v in row.items())
                statements.append(f'insert into public.{snake(entity)}({columns}) values ({values});')
    statements += ['set constraints all immediate;','set constraints all deferred;']
    return '\n'.join(statements)+'\n'


def check_tap(output):
    # A command returning 0 does not prove TAP passed.
    failures = re.findall(r'^not ok .*$',output,re.M)
    plan = re.findall(r'^1\.\.(\d+)\s*$',output,re.M)
    cases = re.findall(r'^ok \d+.*$',output,re.M)
    if failures or len(plan)!=1 or int(plan[0])!=len(cases) or not cases:
        raise RuntimeError('SQL assertions failed:\n'+output[-12000:])
    return len(cases)


def schedule_race(database, day, isolation):
    template = json.loads((ROOT/'supabase/seed/templates/food-v1.template.json').read_text(encoding='utf-8'))
    row = template['entities']['weeklySchedules'][0]
    fields = json.loads((ROOT/'docs/data/database-mapping.json').read_text(encoding='utf-8'))['fields']
    types = {f['path']:f['sqlType'] for f in fields if f['contract']=='food'}

    def writer():
        race_row = dict(row,id=str(uuid.uuid4()),dayOfWeek=day,startTime='08:00',
                        endTime='09:00',endDayOffset=0,is24Hours=False,
                        lastOrder=None,lastOrderDayOffset=None)
        columns = ','.join(snake(k) for k in race_row)
        values = ','.join(sql_literal(v,types['weeklySchedules.'+k]) for k,v in race_row.items())
        sql = f"\\set VERBOSITY sqlstate\nbegin isolation level {isolation};select pg_sleep(1);insert into public.weekly_schedules({columns}) values({values});select pg_sleep(1);commit;"
        return subprocess.run(['docker','exec','-i',CONTAINER,'psql','-X','-U','postgres','-d',database,
                               '-v','ON_ERROR_STOP=1','-At'],input=sql,text=True,encoding='utf-8',capture_output=True,timeout=30)

    with ThreadPoolExecutor(max_workers=2) as pool:
        a, b = pool.submit(writer), pool.submit(writer)
        results = [a.result(),b.result()]
    if sum(r.returncode==0 for r in results)!=1:
        raise RuntimeError('Schedule race must accept exactly one writer: '+str([(r.returncode,r.stderr) for r in results]))
    failure = next(r for r in results if r.returncode)
    if not any(code in failure.stderr for code in ['23514','40001']):
        raise RuntimeError('Unexpected race rejection: '+failure.stderr)
    count = psql(database,f'select count(*) from public.weekly_schedules where day_of_week={day} and start_time=\'08:00\';').strip()
    if count!='1':
        raise RuntimeError('Race produced duplicate intervals')
    return {'isolation':isolation,'accepted':1,'rejected':1,'persistedIntervals':1,'result':'Pass'}


def reference_race(database, family, operation, isolation, first, parent_operation='delete'):
    """Two real sessions, including an old RR snapshot and early constraint flush.

    The contender must either block on a transaction lock or finish before the
    winner commits. Poll pg_stat_activity instead of assuming a sleep orders the
    writes. Flushing constraints early reproduces the READ COMMITTED failure too.
    """
    food = json.loads((ROOT/'supabase/seed/templates/food-v1.template.json').read_text(encoding='utf-8'))['entities']
    fields = json.loads((ROOT/'docs/data/database-mapping.json').read_text(encoding='utf-8'))['fields']
    types = {f['path']:f['sqlType'] for f in fields if f['contract']=='food'}
    parent_id, child_id = str(uuid.uuid4()), str(uuid.uuid4())
    parent_entity = 'dataSources' if family=='json' else 'taxonomy'
    parent_table, parent_key = ('data_sources','source_ref') if family=='json' else ('taxonomy','id')
    parent = dict(food[parent_entity][0])
    parent['sourceRef' if family=='json' else 'id'] = parent_id
    if family=='array':
        parent['code'] = 'gm06-race-'+parent_id
    child = dict(food['dishes'][0], id=child_id)

    def insert(entity, row):
        columns = ','.join(snake(k) for k in row)
        values = ','.join(sql_literal(v,types[entity+'.'+k]) for k,v in row.items())
        return f'insert into public.{snake(entity)}({columns}) values({values});'

    setup = insert(parent_entity,parent)
    if operation=='update':
        setup += insert('dishes',child)
    psql(database,'begin;'+setup+'commit;')
    if family=='json':
        child['fieldSources'] = {'name':parent_id}
        change = f"field_sources=jsonb_build_object('name','{parent_id}')"
        dangling = f"d.field_sources->>'name'='{parent_id}'"
    else:
        child['cuisineIds'] = [parent_id]
        change = f"cuisine_ids=ARRAY['{parent_id}']::uuid[]"
        dangling = f"'{parent_id}'::uuid=any(d.cuisine_ids)"
    reference_sql = insert('dishes',child) if operation=='insert' else (
        f"update public.dishes set {change},version=version+1 where id='{child_id}';")
    parent_sql = (f"delete from public.{parent_table} where {parent_key}='{parent_id}';"
                  if parent_operation=='delete' else
                  f"update public.{parent_table} set {parent_key}='{uuid.uuid4()}',version=version+1 where {parent_key}='{parent_id}';")
    steps = {'reference':reference_sql,'parent':parent_sql}
    contender = 'parent' if first=='reference' else 'reference'
    sessions = []

    def session(name):
        proc = subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-q','-X','-U','postgres',
            '-d',database,'-v','ON_ERROR_STOP=1','-At'],stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8')
        sessions.append(proc)
        proc.stdin.write(f"\\set VERBOSITY sqlstate\nset application_name='{name}';\n"
                         f"begin isolation level {isolation};\n"
                         f"select count(*) from public.{parent_table};\n\\echo GM06_SNAPSHOT\n")
        proc.stdin.flush()
        return proc

    def marker(proc, expected):
        for line in iter(proc.stdout.readline,''):
            if line.strip()==expected:
                return
        raise RuntimeError('Reference race session ended before '+expected+': '+proc.stderr.read())

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            name = 'gm06_ref_'+uuid.uuid4().hex
            # Snapshot B precedes A's mutation; relevant even if B has to wait.
            b = session(name)
            pool.submit(marker,b,'GM06_SNAPSHOT').result(timeout=15)
            a = session('gm06_ref_'+uuid.uuid4().hex)
            pool.submit(marker,a,'GM06_SNAPSHOT').result(timeout=15)
            a.stdin.write(steps[first]+'\nset constraints all immediate;\n\\echo GM06_READY\n')
            a.stdin.flush()
            pool.submit(marker,a,'GM06_READY').result(timeout=15)
            pending = pool.submit(b.communicate,steps[contender]+'\nset constraints all immediate;\ncommit;\n',timeout=30)
            blocked = False
            deadline = time.monotonic()+15
            while not pending.done():
                waiting = psql(database,f"select count(*) from pg_stat_activity where application_name='{name}' and wait_event_type='Lock';").strip()
                if waiting=='1':
                    blocked = True
                    break
                if time.monotonic()>deadline:
                    raise RuntimeError('Contender neither blocked nor completed')
                time.sleep(0.05)
            _, a_error = a.communicate('commit;\n',timeout=15)
            _, b_error = pending.result(timeout=30)
            errors = [a_error,b_error]
            accepted = sum(proc.returncode==0 for proc in [a,b])
        count = int(psql(database,f"select count(*) from public.dishes d where d.id='{child_id}' and {dangling} and not exists(select 1 from public.{parent_table} p where p.{parent_key}='{parent_id}');").strip())
        failure_states = re.findall(r'ERROR:\s+(\w{5})', '\n'.join(errors))
        result = {'family':family,'referenceOperation':operation,'parentOperation':parent_operation,
                  'isolation':isolation,'first':first,'accepted':accepted,'rejected':2-accepted,
                  'contenderBlocked':blocked,'rejectionStates':failure_states,'danglingReferences':count}
        if accepted!=1 or count!=0 or not blocked or not failure_states or not set(failure_states)<={'23503','23514','40001'}:
            raise RuntimeError('Reference race failed: '+json.dumps(result))
        result['result'] = 'Pass'
        return result
    finally:
        # Kill only these psql clients; a disconnected session rolls back its TX.
        for proc in sessions:
            if proc.poll() is None:
                proc.kill()
            proc.communicate(timeout=10)
        psql(database,f"begin;delete from public.dishes where id='{child_id}';delete from public.{parent_table} where {parent_key}='{parent_id}';commit;")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,required=True)
    args = parser.parse_args()
    endpoint = os.environ.get('DOCKER_HOST') or json.loads(run([
        'docker','context','inspect','--format','{{json .Endpoints.docker.Host}}']).strip())
    if not endpoint.startswith(('unix://','npipe://')):
        raise RuntimeError('Only a local Docker socket is allowed, never TCP/SSH')
    name, running, image = [json.loads(part) for part in run([
        'docker','inspect','--format','{{json .Name}}|{{json .State.Running}}|{{json .Config.Image}}',CONTAINER]).strip().split('|')]
    if not running or name!='/'+CONTAINER:
        raise RuntimeError('Expected the running GM-03 local container')
    if not image.startswith(('public.ecr.aws/supabase/postgres:17','ghcr.io/supabase/postgres:17','supabase/postgres:17')):
        raise RuntimeError('Expected the official Supabase PostgreSQL17 image')
    config = tomllib.loads((ROOT/'supabase/config.toml').read_text(encoding='utf-8'))
    if config.get('project_id')!='gi-cung-duoc-local' or config.get('db',{}).get('major_version')!=17 or config['db'].get('port')!=54322 or config.get('api',{}).get('port')!=54321:
        raise RuntimeError('GM-03 project/config must be reviewed with this runner')
    version = psql('postgres','select current_setting(\'server_version\');').strip()
    if not version.startswith('17.'):
        raise RuntimeError('PostgreSQL 17 required, received '+version)
    # Copy only the real Supabase auth.users DDL, never user rows/passwords/tokens.
    auth_ddl = run(['docker','exec',CONTAINER,'pg_dump','-U','postgres','-d','postgres',
                    '--schema-only','--no-owner','--no-privileges','-t','auth.users'])
    auth_ddl = '\n'.join(line for line in auth_ddl.splitlines()
                         if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm06_',line))
    database = 'gm06_check_'+uuid.uuid4().hex[:16]
    assert re.fullmatch(r'gm06_check_[0-9a-f]{16}',database)
    report = {'schemaVersion':'0.1.0','databaseMode':'isolated disposable DB; real Supabase auth.users DDL',
              'runnerEnvironment':{'platform':platform.system(),'python':platform.python_version(),
                                   'localeEncoding':locale.getencoding(),'utf8Mode':sys.flags.utf8_mode,
                                   'fileAndSubprocessEncoding':'utf-8'},
              'postgresVersion':version,'image':image,'fixtureOnly':True,'phases':[],
              'checkedAt':datetime.now(timezone.utc).isoformat(),
              'artifactHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in [Path(__file__),ROOT/'supabase/tests/schema_contract.sql',
                            ROOT/'docs/data/database-mapping.json',
                            ROOT/'supabase/rollback/0001_core_schema.down.sql']}}
    created = False
    try:
        psql('postgres',f'create database {database} template template0;')
        created = True
        psql(database,'create schema auth;\n'+auth_ddl)
        migration = (ROOT/'supabase/migrations/0001_core_schema.sql').read_text(encoding='utf-8')
        report['migrationSha256'] = hashlib.sha256(migration.encode()).hexdigest()
        psql(database,migration)
        report['phases'].append({'phase':'fresh migration','result':'Pass'})
        psql(database,'create schema extensions; create extension pgtap with schema extensions;')
        fixture = fixture_sql()
        tests = (ROOT/'supabase/tests/schema_contract.sql').read_text(encoding='utf-8').replace('-- GM06_FIXTURE_HERE',fixture)
        tap = psql(database,tests)
        report['sqlAssertions'] = check_tap(tap)
        report['tap'] = tap.splitlines()
        report['phases'].append({'phase':'SQL contract','result':'Pass'})
        fields = json.loads((ROOT/'docs/data/database-mapping.json').read_text(encoding='utf-8'))['fields']
        upstream = json.loads((ROOT/'docs/data/field-coverage.json').read_text(encoding='utf-8'))
        if {(f['contract'],f['path']) for f in fields} != {(f['contract'],f['path']) for f in upstream}:
            raise RuntimeError('Mapping misses or invents an upstream field')
        actual = psql(database,"select table_name||'.'||column_name||'|'||udt_name||'|'||is_nullable from information_schema.columns where table_schema='public';")
        actual_info = {line.split('|')[0]:line.split('|')[1:] for line in actual.splitlines()}
        actual_set = set(actual_info)
        columns = {f['target'].split(' → ')[0] for f in fields if f['sqlType']!='envelope'}
        if not columns <= actual_set:
            raise RuntimeError('Mapped columns missing in DB: '+str(sorted(columns-actual_set)))
        udts = {'uuid':'uuid','uuid[]':'_uuid','text':'text','text[]':'_text','bigint':'int8',
                'boolean':'bool','numeric':'numeric','jsonb':'jsonb','timestamptz':'timestamptz','date':'date'}
        for f in fields:
            if f['sqlType']=='envelope' or '.' in f['path'].split('.',1)[1]:
                continue
            target = f['target'].split(' → ')[0]
            expected = [udts[f['sqlType']],'YES' if f['nullable'] else 'NO']
            if actual_info[target]!=expected:
                raise RuntimeError('DB type/nullability differs from mapping: '+target)
        report['mappedPaths'] = len(fields)
        report['mappedColumns'] = len(columns)
        psql(database,'begin;\n'+fixture+'\ncommit;')
        report['scheduleRaces'] = [schedule_race(database,2,'read committed'),
                                   schedule_race(database,3,'repeatable read')]
        report['phases'].append({'phase':'concurrent schedule integrity','result':'Pass'})
        report['referenceRaces'] = [reference_race(database,family,operation,isolation,first,parent_operation)
            for family in ['json','array'] for operation in ['insert','update']
            for isolation in ['read committed','repeatable read']
            for first in ['reference','parent']
            for parent_operation in ['delete']]
        report['phases'].append({'phase':'concurrent nested reference integrity','result':'Pass'})
        # Upgrade from a previous local DB which already contains unrelated data.
        psql(database,'create table public.gm06_upgrade_sentinel(id int primary key, note text not null); insert into public.gm06_upgrade_sentinel values(1,\'preserve existing data\');')
        rollback = (ROOT/'supabase/rollback/0001_core_schema.down.sql').read_text(encoding='utf-8')
        psql(database,rollback)
        if psql(database,"select to_regclass('public.rooms') is null; select note from public.gm06_upgrade_sentinel where id=1;").splitlines()!=['t','preserve existing data']:
            raise RuntimeError('Rollback touched unrelated data or left schema behind')
        report['phases'].append({'phase':'rollback retains unrelated rows','result':'Pass'})
        psql(database,migration)
        if psql(database,'select count(*) from public.schema_versions; select note from public.gm06_upgrade_sentinel where id=1;').splitlines()!=['1','preserve existing data']:
            raise RuntimeError('Upgrade failed to preserve existing rows')
        report['phases'].append({'phase':'upgrade and reapply','result':'Pass'})
    finally:
        if created:
            # Only this process-created, randomized, disposable DB is dropped.
            psql('postgres',f'drop database {database};')
    report['result'] = 'Pass'
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({k:v for k,v in report.items() if k!='tap'},ensure_ascii=False))


if __name__=='__main__':
    try:
        main()
    except (ValueError,RuntimeError,subprocess.TimeoutExpired) as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
