#!/usr/bin/env python3
"""Fresh PostgreSQL/PostgREST QA, new credentials, private HTTP network.

Uses local images only. No existing container environment, DB credentials, user
rows or network details are read. Synthetic auth identities; not GoTrue login.
"""
import argparse
import base64
from datetime import datetime,timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time
import uuid

from gm06_v4_compat import V4Compatibility,CONTRACT

ROOT=Path(__file__).resolve().parents[1]
PG_IMAGE='public.ecr.aws/supabase/postgres:17.11.0.004'
REST_IMAGE='public.ecr.aws/supabase/postgrest:v16.4'
IMAGE_MIRRORS={image:(image,image.replace('public.ecr.aws/','ghcr.io/'),image.removeprefix('public.ecr.aws/'))
               for image in (PG_IMAGE,REST_IMAGE)}


def local_image(image):
    """Use an exact-version local mirror; never pull or inspect service config."""
    for candidate in IMAGE_MIRRORS[image]:
        result=subprocess.run(['docker','image','inspect','--format','{{.Id}}',candidate],
                              text=True,encoding='utf-8',capture_output=True,timeout=15)
        if result.returncode==0 and result.stdout.strip():
            return candidate
        if result.returncode and not re.search(r'no such (?:image|object)',result.stderr,re.I):
            raise RuntimeError('OWNED_QA_IMAGE_INSPECTION_FAILED '+candidate)
    raise RuntimeError('OWNED_QA_IMAGE_NOT_CACHED '+image+'; docker pull '+IMAGE_MIRRORS[image][1])


def command(args, *, sql=None, env=None, timeout=120):
    p=subprocess.run(args,input=sql,env=env,text=True,encoding='utf-8',capture_output=True,timeout=timeout)
    if p.returncode:
        code=re.search(r'ERROR:\s+([A-Z0-9]{5})(?:[:\s]|$)',p.stderr)
        raise RuntimeError('OWNED_QA_COMMAND_FAILED '+(code.group(1) if code else str(p.returncode)))
    return p.stdout


def literal(value):
    return "'"+str(value).replace("'","''")+"'"


def git_ref(ref):
    result=subprocess.run(['git','rev-parse','--verify',ref],cwd=ROOT,text=True,capture_output=True)
    return result.stdout.strip() if result.returncode==0 else None


class Database:
    def __init__(self, container):
        self.container=container

    def psql(self, sql):
        return command(['docker','exec','-i',self.container,'psql','-X','-q','-h','/tmp','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-At'],sql=sql)


def run(report_path, *, exercise=None, scope=None, extra_sources=()):
    namespace=str(uuid.uuid4()); tag=namespace.replace('-','')[:12]
    network='gm06-isolated-'+tag; pg='gm06-pg-'+tag; rest='gm06-rest-'+tag
    resources=[]; cases=[]
    report={'result':'Fail','checkedAt':datetime.now(timezone.utc).isoformat(),
            'scope':'fresh migration and real v4 HTTP compatibility; synthetic auth schema/users, not GoTrue',
            'existingCredentialsRead':False,'applicationDatabaseChanged':False,
            'network':'new internal per-run Docker network','httpBinding':'none; HTTP client inside owned network',
            'credentialMode':'new random PostgreSQL password and JWT secret, process/container memory only',
            'publishedReviewedHead':'a7f54d8e404a2d988d390fbd724938fea623e98b',
            'testedHeadBeforePatchCommit':git_ref('HEAD'),'workingTreePatchIncluded':True,
            'mergeTarget':git_ref('origin/main'),
            'cases':cases,'images':[PG_IMAGE,REST_IMAGE]}
    parity_files=[ROOT/'tests/fixtures/decision-v2'/name for name in ('cases.json','roster-cases.json','seeded-cases.json')]
    report['sourceHashes']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),ROOT/'scripts/gm06_v4_compat.py',*sorted((ROOT/'supabase/migrations').glob('*.sql')),*parity_files]}
    if scope is not None:
        report['scope']=scope
    report['sourceHashes'].update({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in extra_sources})
    password=secrets.token_urlsafe(32); jwt_secret=secrets.token_urlsafe(48)
    def check(name, actual, expected=True):
        if actual!=expected: raise AssertionError(name)
        cases.append({'case':name,'expected':expected,'actual':actual,'result':'Pass'})
    def owned(kind,name,missing_ok=False):
        inspected=subprocess.run(['docker',kind,'inspect',name],text=True,capture_output=True,timeout=15)
        if inspected.returncode:
            if missing_ok and ('No such' in inspected.stderr or 'not found' in inspected.stderr):
                return None
            raise RuntimeError('QA_OWNERSHIP_INSPECTION_FAILED')
        info=json.loads(inspected.stdout)[0]
        labels=info.get('Config',{}).get('Labels',{}) if kind=='container' else info.get('Labels',{})
        if labels.get('com.gm06.namespace')!=namespace: raise RuntimeError('QA_OWNERSHIP_MISMATCH')
        return info
    try:
        # Supabase CLI caches pinned ECR, GHCR or Docker Hub image spellings.
        # Resolve only those pinned mirrors before allocating any QA resources.
        pg_image=local_image(PG_IMAGE);rest_image=local_image(REST_IMAGE)
        report['images']=[pg_image,rest_image]
        command(['docker','network','create','--internal','--label','com.gm06.namespace='+namespace,network])
        resources.append(('network',network))
        # Override image entrypoint; init a completely fresh PGDATA in disposable tmpfs.
        bootstrap="install -d -o postgres -g postgres /tmp/gm06-data; printf '%s' \"$GM06_DB_PASSWORD\" > /tmp/gm06-password; chown postgres /tmp/gm06-password; exec gosu postgres /bin/sh -c 'initdb -D /tmp/gm06-data --auth-local=trust --auth-host=scram-sha-256 --pwfile=/tmp/gm06-password >/tmp/gm06-init.log && printf \"\\nhost all postgres samenet scram-sha-256\\n\" >> /tmp/gm06-data/pg_hba.conf && exec postgres -D /tmp/gm06-data -c listen_addresses=0.0.0.0 -c unix_socket_directories=/tmp'"
        command(['docker','run','--rm','--pull','never','-d','--name',pg,'--network',network,
                 '--label','com.gm06.namespace='+namespace,'--tmpfs','/tmp:rw','-e','GM06_DB_PASSWORD',
                 '--entrypoint','/bin/sh',pg_image,'-c',bootstrap],env={**os.environ,'GM06_DB_PASSWORD':password})
        resources.append(('container',pg))
        db=Database(pg)
        for n in range(120):
            ready=subprocess.run(['docker','exec',pg,'pg_isready','-h','/tmp','-U','postgres'],capture_output=True,timeout=5)
            if ready.returncode==0: break
            if n==119: raise RuntimeError('OWNED_POSTGRES_STARTUP_TIMEOUT')
            time.sleep(.25)
        db.psql('''create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
        create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean not null default true,raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$
         select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
        $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;''')
        migrations=sorted((ROOT/'supabase/migrations').glob('*.sql'))
        versions=[p.name.split('_',1)[0] for p in migrations]
        check('fresh Supabase migration numeric versions are unique',len(versions)==len(set(versions)))
        db.psql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text not null,sha256 text not null);')
        for path in migrations:
            db.psql(path.read_text(encoding='utf-8'))
            db.psql('insert into supabase_migrations.schema_migrations values('+literal(path.name.split('_',1)[0])+','+literal(path.stem)+','+literal(hashlib.sha256(path.read_bytes()).hexdigest())+');')
        check('fresh all repository migrations applied',db.psql('select count(*) from supabase_migrations.schema_migrations;').strip(),str(len(migrations)))
        check('runtime0.9.0/0.9.1/0.9.2 and independent0.10.0 ledger coexist',db.psql("select count(*)=4 from public.schema_versions where schema_version in('0.9.0','0.9.1','0.9.2','0.10.0');").strip(),'t')
        report['v2ParityVectors']={}
        for path in parity_files:
            vectors=[]
            for row in json.loads(path.read_text(encoding='utf-8'))['cases']:
                value=row['input']
                if path.name=='seeded-cases.json' and isinstance(value,dict) and 'seed' in row:
                    value={**value,'seed':row['seed']}
                function='decide' if path.name=='seeded-cases.json' else 'evaluate'
                vectors.append('(gm20_private.'+function+'('+literal(json.dumps(value))+'::jsonb)='+literal(json.dumps(row['expected']))+'::jsonb)')
            report['v2ParityVectors'][path.name]=len(vectors)
            check('pinned decision-v2 SQL parity '+path.name,db.psql('select bool_and(ok) from (values '+','.join('('+v+')' for v in vectors)+') v(ok);').strip(),'t')
        users=[str(uuid.uuid5(uuid.UUID(namespace),'user-'+str(i))) for i in range(21)]
        for user in users: db.psql('insert into auth.users(id) values('+literal(user)+');')
        cards=[{'dishId':str(uuid.uuid5(uuid.UUID(namespace),'dish-'+str(i))),'name':'Synthetic GM06 '+str(i),'description':None,'artwork':None,'mealSlots':['dinner'],'cuisineIds':[],'categoryIds':[]} for i in range(20)]
        db.psql("insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values('gm06-isolated',"+literal(hashlib.sha256(json.dumps(cards).encode()).hexdigest())+','+literal(json.dumps(cards))+"::jsonb,true,true);")
        compat=V4Compatibility(db,users,check,literal);compat.setup()
        uri='postgresql://postgres:'+password+'@'+pg+':5432/postgres'
        command(['docker','run','--rm','--pull','never','-d','--name',rest,'--network',network,
                 '--label','com.gm06.namespace='+namespace,'-e','PGRST_DB_URI','-e','PGRST_JWT_SECRET',
                 '-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public',rest_image],
                env={**os.environ,'PGRST_DB_URI':uri,'PGRST_JWT_SECRET':jwt_secret})
        resources.append(('container',rest))
        check('owned REST has no published host port',not owned('container',rest)['HostConfig']['PortBindings'])
        check('owned PostgreSQL has no published host port',not owned('container',pg)['HostConfig']['PortBindings'])
        check('owned network is internal',owned('network',network)['Internal'])
        endpoint='http://'+rest+':3000'
        for n in range(100):
            try:
                status=command(['docker','exec',pg,'curl','--noproxy','*','--silent','--max-time','2',
                                '--output','/dev/null','--write-out','%{http_code}',endpoint+'/']).strip()
                if status in ('200','401','403'):
                    break
            except RuntimeError:
                pass
            if n==99: raise RuntimeError('OWNED_REST_STARTUP_TIMEOUT')
            time.sleep(.2)
        def rpc(name,args,user=0,authenticated=True):
            def b64(v): return base64.urlsafe_b64encode(v).rstrip(b'=').decode()
            headers=['Content-Type: application/json']
            if authenticated:
                message=b64(b'{"alg":"HS256","typ":"JWT"}')+'.'+b64(json.dumps({'sub':users[user],'role':'authenticated','aud':'authenticated','exp':int(time.time())+900}).encode())
                headers.append('Authorization: Bearer '+message+'.'+b64(hmac.new(jwt_secret.encode(),message.encode(),hashlib.sha256).digest()))
            # New QA JWT/config goes over stdin, never argv, reports or logs.
            config='url = '+json.dumps(endpoint+'/rpc/'+name)+'\n'
            config+=''.join('header = '+json.dumps(h)+'\n' for h in headers)
            config+='data = '+json.dumps(json.dumps(args))+'\n'
            output=command(['docker','exec','-i',pg,'curl','--noproxy','*','--silent','--show-error','--max-time','15',
                            '--request','POST','--write-out','\n%{http_code}','--config','-'],sql=config)
            body,status=output.rsplit('\n',1)
            return int(status),json.loads(body)
        def api(cmd,user=0,**payload):
            if cmd not in ('history','result','snapshot','getDefaultPreferences'): payload.setdefault('requestId',str(uuid.uuid4()))
            status,body=rpc('dish_session',{'command':cmd,'payload':{'contractVersion':CONTRACT,**payload}},user)
            if status!=200 or not body.get('ok'): raise AssertionError('HTTP '+cmd+' failed with status '+str(status))
            return body['data']
        for saved in compat.rooms:
            check('HTTP stored '+saved['result']['status']+' result matches writer',api('result',roomId=saved['room'])==saved['result'])
        check('HTTP history reuses stored result/Top3',api('history')['items']==compat.saved_history)
        check('HTTP default preferences match writer',api('getDefaultPreferences')==compat.saved_defaults)
        status,body=rpc('dish_session',{'command':'result','payload':{'contractVersion':CONTRACT,'roomId':compat.rooms[0]['room']}},20)
        check('HTTP outsider cannot read result',status==403 and body.get('error',{}).get('messageKey')=='NOT_MEMBER')
        status,_=rpc('dish_session',{'command':'history','payload':{'contractVersion':CONTRACT}},authenticated=False)
        check('HTTP unauthenticated denied',status in (401,403))
        second=compat.rooms[1]
        hi=next(x for x in api('history')['items'] if x['roomId']==second['room'] and x['scope']=='group')
        api('deleteHistory',historyId=hi['historyId']);api('submit',second['lastUser'],**second['lastSubmit'])
        check('HTTP delete and terminal retry do not resurrect history',not any(x['historyId']==hi['historyId'] for x in api('history')['items']))
        first=compat.rooms[0]
        clock=db.psql("select set_config('dish_v4.writer','on',false);update public.rooms set created_at=statement_timestamp()-interval '3 days',expires_at=statement_timestamp()-interval '2 days',version=version+1 where id="+literal(first['room'])+";select set_config('dish_v4.writer','off',false);select gm17_private.cleanup();select current_setting('dish_v4.writer',true)='off';").strip().splitlines()[-1]
        check('cleanup restores v4 guard in same SQL session',clock,'t')
        check('operational v4 room actually removed',db.psql('select not exists(select 1 from public.rooms where id='+literal(first['room'])+');').strip(),'t')
        retained=next(x for x in api('history')['items'] if x['roomId']==first['room'] and x['scope']=='group')
        check('HTTP retained history after cleanup preserves result',retained['result']==first['result'])
        status,body=rpc('update_history_consent',{'requestId':str(uuid.uuid4()),'scope':'group','consent':False},1)
        check('HTTP group revoke accepted',status==200 and body.get('ok') is True)
        after=api('history',1)['items']
        check('HTTP revoked group history disappears after cleanup',not any(x['scope']=='group' and x['roomId']==first['room'] for x in after))
        check('HTTP separate personal consent survives group revoke',any(x['scope']=='personal' and x['roomId']==first['room'] for x in after))
        check('v4 API never writes independent canonical table',db.psql('select count(*) from gm06_canonical.results;').strip(),'0')
        if exercise is not None:
            baseline_count=len(cases)
            exercise(db,rpc,check,users)
            report['baselineCompatibilityAssertions']=baseline_count
            report['extensionAssertions']=len(cases)-baseline_count
        report['result']='Pass'
    except Exception as exc:
        report['failure']=str(exc)[:250]
        if ('container',rest) in resources:
            owned('container',rest)
            diagnostic=subprocess.run(['docker','logs','--tail','8',rest],text=True,encoding='utf-8',capture_output=True,timeout=10)
            report['ownedRestDiagnostic']=(diagnostic.stdout+diagnostic.stderr).replace(password,'[REDACTED]').replace(jwt_secret,'[REDACTED]')[-2000:]
        raise
    finally:
        cleanup_errors=[]
        for kind,name in reversed(resources):
            try:
                if owned(kind,name,missing_ok=True) is not None:
                    command(['docker','stop',name] if kind=='container' else ['docker','network','rm',name],timeout=45)
            except Exception:
                cleanup_errors.append(kind+':'+name)
        report['cleanup']='own containers/tmpfs and network removed' if not cleanup_errors else 'Fail: '+','.join(cleanup_errors)
        if cleanup_errors:
            report['result']='Fail'
        report['assertions']=len(cases)
        report_path.parent.mkdir(parents=True,exist_ok=True)
        report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        if cleanup_errors:
            raise RuntimeError('OWNED_QA_CLEANUP_FAILED')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',type=Path,required=True);args=parser.parse_args()
    try:
        run(args.report)
    except Exception as exc:
        print('GM06 isolated HTTP failed: '+str(exc)[:250],file=sys.stderr);raise SystemExit(1)
    print('GM06 isolated HTTP Pass; owned resources cleaned.')
