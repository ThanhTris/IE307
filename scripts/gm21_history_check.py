"""GM-21 disposable PostgreSQL checks. SQL claims are not JWT verification."""
from __future__ import annotations
import argparse
import copy
from datetime import datetime,timedelta,timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid
import gm18_http_fixture as shared

ROOT=shared.ROOT
food=shared.food
def literal(v): return food.literal(json.dumps(v,ensure_ascii=True))+'::jsonb'
def safe_run(args,sql=None):
    args=['VERBOSITY=verbose' if a=='VERBOSITY=sqlstate' else a for a in args]
    r=subprocess.run(args,input=sql,text=True,encoding='utf-8',capture_output=True,timeout=180)
    if r.returncode:
        state=re.search(r'ERROR:\s+([A-Z0-9]{5})',r.stderr)
        column=re.search(r'column reference "([a-z_]+)" is ambiguous',r.stderr)
        constraint=re.search(r'CONSTRAINT NAME:\s*([A-Za-z0-9_]+)',r.stderr)
        raise RuntimeError('GM21_SQL_'+(state.group(1) if state else 'PROCESS')+('_'+column.group(1) if column else '')+('_'+constraint.group(1) if constraint else ''))
    return r.stdout
food.LocalDB.run=staticmethod(safe_run)

class TestDB:
    def __init__(self,namespace=None,users=None):
        self.namespace=namespace or uuid.uuid4()
        self.users=users or [str(uuid.uuid5(self.namespace,'caller-'+str(n))) for n in range(3)]
        self.name='gm08_check_'+self.namespace.hex[:16]
        self.admin=food.LocalDB();self.db=None;self.created=False;self.marked=False
        self.now=datetime.now(timezone.utc)
        self.sql,self.bundles=shared.gm17.fixture_sql(self.namespace,users=self.users[:2],now=self.now)
        self.core=self.bundles['core']['entities'];self.room=self.core['rooms'][0]['id'];self.result=self.core['results'][0]['id']
    def create(self):
        ddl=self.admin.run(['docker','exec',food.CONTAINER,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-privileges','-t','auth.users'])
        ddl='\n'.join(x for x in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm\d+_',x))
        uid=self.admin.psql("select pg_get_functiondef('auth.uid()'::regprocedure);")
        self.admin.psql('create database '+self.name+' template template0;');self.created=True;self.db=food.LocalDB(self.name)
        self.db.psql('create schema auth;'+ddl+'\n'+uid+';grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;')
        for p in sorted((ROOT/'supabase/migrations').glob('*.sql')):self.db.psql(p.read_text(encoding='utf-8'))
        self.db.psql("create table public.gm21_test_owner(namespace uuid primary key);revoke all on public.gm21_test_owner from public,anon,authenticated,service_role;insert into public.gm21_test_owner values('"+str(self.namespace)+"');")
        self.marked=True
        for u in self.users:self.db.psql("insert into auth.users(id,is_anonymous) values('"+u+"',true);")
        self.db.psql(self.sql)
    def cleanup(self):
        if self.created:
            if self.marked:assert self.db.psql('select namespace::text from public.gm21_test_owner;').strip()==str(self.namespace)
            self.admin.psql('drop database '+self.name+';');self.created=False
    def scalar(self,expr):return json.loads(self.db.psql('select to_jsonb('+expr+');'))
    def call(self,user,expr,private=False):
        return json.loads(self.db.psql("begin;set local request.jwt.claims="+food.literal(json.dumps({'sub':user,'role':'authenticated'}))+';'+('' if private else 'set local role authenticated;')+'select to_jsonb('+expr+');commit;'))
    def consent(self,user,scope,enabled,request=None):
        return self.call(user,'public.update_history_consent('+food.literal(request or 'req_'+uuid.uuid4().hex)+','+food.literal(scope)+','+literal(enabled)+')')
    def history(self,user,scope='personal',cursor=None):
        return self.call(user,'public.get_history('+food.literal(scope)+','+('null' if cursor is None else food.literal(cursor))+')')
    def delete(self,user,id,request=None):
        return self.call(user,'public.delete_history('+food.literal(request or 'req_'+uuid.uuid4().hex)+','+food.literal(id)+')')
    def ids(self):
        return {'roomId':self.room,'resultId':self.result,'personalId':self.core['histories'][0]['id'],'groupId':self.core['histories'][1]['id']}
    def clone(self,label,lobby=False,age=timedelta(0),histories=True,finalize_now=False):
        n=uuid.uuid5(self.namespace,label);core=copy.deepcopy(self.core)
        entities=['rooms','members','roundDishes','consents','results','histories']
        remap={row['id']:str(uuid.uuid5(n,row['id'])) for e in entities for row in core[e]}
        def transform(v):
            if isinstance(v,dict):return {k:transform(x) for k,x in v.items()}
            if isinstance(v,list):return [transform(x) for x in v]
            if isinstance(v,str):
                if v in remap:return remap[v]
                if re.fullmatch(r'\d{4}-\d\d-\d\dT.*',v):
                    return (datetime.fromisoformat(v.replace('Z','+00:00'))-age).isoformat()
            return v
        core=transform(core);r=core['rooms'][0]
        alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';r['code']=''.join(alphabet[b%32] for b in hashlib.sha256(n.bytes).digest()[:6])
        if lobby:
            r.update(state='LOBBY',lockedAt=None,evaluatedAt=None,rosterUserIds=[],consentSnapshot=[])
            core['roundDishes']=[];core['results']=[];core['histories']=[];core['consents']=[]
            for member in core['members']:member['ready']=False
        elif not histories:core['histories']=[]
        for h in core['histories']:h['groupKey']=hashlib.sha256(('gm21-group-v1:'+','.join(sorted(self.users[:2]))).encode()).hexdigest()
        types={(f['contract'],f['path']):f['sqlType'] for f in food.load_json(ROOT/'docs/data/database-mapping.json')['fields']}
        lines=['begin;set constraints all deferred;']
        if finalize_now:lines.append('create temp table gm21_clock_count(value int);')
        for entity in entities:
            for row in core[entity]:
                statement='insert into public.'+food.snake(entity)+'('+','.join(food.snake(k) for k in row)+') values('+','.join('clock_timestamp()' if finalize_now and entity=='results' and k=='finalizedAt' else shared.gm17.sql_literal(v,types[('core',entity+'.'+k)]) for k,v in row.items())+');'
                if finalize_now and entity=='results':statement="do $gm21$begin "+statement+"insert into gm21_clock_count values(gm21_private.record_result('"+row['id']+"'));end$gm21$;"
                lines.append(statement)
        lines+=['set constraints all immediate;commit;']
        if finalize_now:lines.append('select value from gm21_clock_count;')
        output=self.db.psql('\n'.join(lines))
        return {'roomId':r['id'],'resultId':core['results'][0]['id'] if core['results'] else None,'historyIds':[h['id'] for h in core['histories']],**({'recordCount':json.loads(output)} if finalize_now else {})}

def exercise(t):
    checks=[]
    def check(name,actual,expected=True):
        if actual!=expected:raise AssertionError(name)
        checks.append({'case':name,'result':'Pass'});print('Pass:',name,flush=True)
    a,b,c=t.users
    check('personal owner can read own summary',len(t.history(a)['data']),1)
    check('other user cannot read owner personal summary',t.history(b)['data'],[])
    check('group member can read shared summary',len(t.history(b,'group')['data']),1)
    check('outsider sees no summaries',t.history(c,'group')['data'],[])
    check('wrong scope rejected',t.history(a,'other')['error']['messageKey'],'INVALID_INPUT')
    check('forged outsider cursor rejected',t.history(c,'group',t.ids()['groupId'])['error']['messageKey'],'INVALID_INPUT')
    check('private schemas deny every app role',t.scalar("not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(role) where has_schema_privilege(role,'gm21_private','USAGE'))"))
    check('private tables deny app reads and writes',t.scalar("not exists(select 1 from pg_tables t cross join (values('anon'),('authenticated'),('service_role')) r(role) where schemaname='gm21_private' and has_table_privilege(role,quote_ident(schemaname)||'.'||quote_ident(tablename),'SELECT,INSERT,UPDATE,DELETE'))"))
    check('private helpers deny all app roles',t.scalar("not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated'),('service_role')) r(role) where n.nspname='gm21_private' and has_function_privilege(role,p.oid,'EXECUTE'))"))
    check('public wrappers fixed path and restricted grants',t.scalar("(select count(*)=3 and bool_and(p.prosecdef and p.proconfig=array['search_path=pg_catalog'] and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_history','delete_history','update_history_consent'))"))
    check('canonical roster order and duplicates cannot change key',t.scalar("gm21_private.group_key(array['"+a+"','"+b+"']::uuid[])=gm21_private.group_key(array['"+b+"','"+a+"','"+a+"']::uuid[])"))
    private_fields=['groupKey','memberUserIds','consentIds','votes','anchorId','lat','mood','sourceRef']
    text=json.dumps(t.history(a));check('history DTO contains no private context',all('"'+k+'"' not in text for k in private_fields))
    before=t.scalar('(select count(*) from public.histories)');t.delete(c,t.ids()['personalId']);check('outsider delete is non-disclosing no-op',t.scalar('(select count(*) from public.histories)'),before)
    request='req_wire-format_123';r=t.consent(a,'personal',True,request)
    check('opaque GM07 request IDs accepted',r['ok'])
    stamp=t.scalar("(select version from gm21_private.settings where user_id='"+a+"' and scope='personal')")
    check('same request ACK is identical',t.consent(a,'personal',True,request),r)
    check('same request has no repeated mutation',t.scalar("(select version from gm21_private.settings where user_id='"+a+"' and scope='personal')"),stamp)
    check('reused request with another payload conflicts',t.consent(a,'personal',False,request)['error']['messageKey'],'REQUEST_ID_REUSED')
    check('boolean string rejected',t.consent(a,'personal','true')['error']['messageKey'],'INVALID_INPUT')
    lobby=t.clone('lobby',lobby=True);room=lobby['roomId']
    def recent():return t.call(a,"gm21_private.recent_dishes('"+room+"')",True)
    check('no consent means no recent penalty',recent(),[])
    t.consent(a,'group',True);t.consent(b,'group',True)
    version=t.scalar("(select version from public.rooms where id='"+room+"')")
    t.db.psql("begin;set local request.jwt.claims="+food.literal(json.dumps({'sub':a,'role':'authenticated'}))+";select gm21_private.prepare_consents('"+room+"',"+str(version)+');commit;')
    # Existing legacy fixture key is intentionally noncanonical and must not count.
    check('forged or legacy group key ignored for anti-repeat',recent(),[])
    for n in range(5):t.clone('recent-'+str(n),age=timedelta(minutes=n+1))
    check('recent reads at most3 results for exact group',len(recent()),3)
    other=t.clone('different-roster',lobby=True);other_room=other['roomId']
    t.db.psql("update public.members set left_at=statement_timestamp(),version=version+1 where room_id='"+other_room+"' and user_id='"+b+"';")
    check('other roster cannot borrow recent history',t.call(a,"gm21_private.recent_dishes('"+other_room+"')",True),[])
    frozen=t.clone('frozen-room',lobby=True);fr=frozen['roomId']
    fv=t.scalar("(select version from public.rooms where id='"+fr+"')")
    t.db.psql("begin;set local request.jwt.claims="+food.literal(json.dumps({'sub':a,'role':'authenticated'}))+";select gm21_private.prepare_consents('"+fr+"',"+str(fv)+');commit;')
    locked=t.call(a,"gm21_private.freeze_recent('"+fr+"',"+str(fv)+')',True)
    check('freeze stores the three canonical recent results',len(locked),3)
    t.db.psql("update public.rooms set state='ROUND_1',roster_user_ids=array['"+a+"','"+b+"']::uuid[],consent_snapshot="+literal([{'userId':a,'historyConsent':True},{'userId':b,'historyConsent':True}])+",locked_at=statement_timestamp(),evaluated_at=statement_timestamp(),version=version+1 where id='"+fr+"';")
    t.db.psql("update public.members set ready=true,version=version+1 where room_id='"+room+"';")
    t.consent(b,'group',False)
    check('withdrawal physically removes all that groups summaries',t.history(a,'group')['data'],[])
    check('withdrawal resets lobby ready',t.scalar("not exists(select 1 from public.members where room_id='"+room+"' and ready)"))
    check('withdrawal leaves persisted result unchanged',t.scalar("(select winner_round_dish_id is not null from public.results where id='"+t.result+"')"))
    check('withdrawal immediately stops recent penalty',recent(),[])
    check('started recent snapshot remains frozen after withdrawal',t.call(a,"gm21_private.recent_dishes('"+fr+"')",True),locked)
    t.consent(b,'group',True);check('reopt-in does not resurrect deleted summaries',recent(),[])
    # A trusted producer receives no permission to create retrospective consent.
    fresh=t.clone('record-result',histories=False,finalize_now=True)
    count=fresh['recordCount']
    check('producer accepts actual server finalization inside same outer statement',count,3)
    check('trusted record creates personal and fully consented group rows',count,3)
    check('trusted record is retry-idempotent',t.scalar("gm21_private.record_result('"+fresh['resultId']+"')"),0)
    target=t.scalar("(select id from public.histories where scope='group' and result_id='"+fresh['resultId']+"')")
    t.delete(a,target)
    check('producer retry cannot resurrect deleted summary',t.scalar("gm21_private.record_result('"+fresh['resultId']+"')"),0)
    t.delete(a,t.ids()['personalId']);check('personal delete does not delete another owner row',len(t.history(b)['data']),1)
    before_b=len(t.history(b)['data']);t.consent(a,'personal',False)
    check('personal opt-out clears own personal history',t.history(a)['data'],[])
    check('personal opt-out preserves others personal history',len(t.history(b)['data']),before_b)
    # Retention: authentic private display projection survives deletion of live parents.
    old=t.clone('retained-history',age=timedelta(hours=25))
    old2=t.clone('retained-history-2',age=timedelta(hours=26))
    t.scalar('gm17_private.cleanup()')
    check('two retained meals detach consents without collision',t.scalar("not exists(select 1 from public.rooms where id='"+old2['roomId']+"')"))
    check('retention deletes operational room',t.scalar("not exists(select 1 from public.rooms where id='"+old['roomId']+"')"))
    items=t.history(a,'group')['data'];check('history survives operational cleanup with authentic room ID/code',any(x['roomId']==old['roomId'] for x in items))
    check('retained presentation contains only minimal fields',set(t.scalar("(select to_jsonb(p) from gm21_private.presentations p where history_id='"+old['historyIds'][1]+"')")),{'history_id','room_id','room_code','member_count'})
    expired=t.clone('history-31days',age=timedelta(days=31));check('history beyond30days never read',not any(x['roomId']==expired['roomId'] for x in t.history(a,'group')['data']))
    t.scalar('gm17_private.cleanup()');check('expired presentations cascade with deleted history',t.scalar("not exists(select 1 from gm21_private.presentations where history_id='"+expired['historyIds'][0]+"')"))
    t.consent(a,'personal',True)
    for n in range(51):t.clone('page-'+str(n),age=timedelta(minutes=n+1))
    first=t.history(a)['data'];second=t.history(a,cursor=first[-1]['id'])['data']
    t.db.psql("insert into gm21_private.recordings values(gen_random_uuid(),statement_timestamp()-interval '1 second');")
    t.scalar('gm17_private.cleanup()')
    check('existing retention worker purges expired private completion receipts',t.scalar('not exists(select 1 from gm21_private.recordings where expires_at<=statement_timestamp())'))
    check('history page is capped at50',len(first),50)
    check('keyset cursor has no overlap and returns remaining rows',not(set(x['id'] for x in first)&set(x['id'] for x in second)) and len(second)>0)
    return checks

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',type=Path,required=True);args=parser.parse_args()
    report={'result':'Fail','contract':'GM-21.1','schemaVersion':'0.2.0','fixtureOnly':True,'mode':'disposable real PostgreSQL; SQL claims, not JWT','checkedAt':datetime.now(timezone.utc).isoformat(),'publicationPerformed':False}
    sources=[Path(__file__),ROOT/'supabase/migrations/0021_history.sql'];hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    if args.report.resolve() in [p.resolve() for p in sources]:raise ValueError('Report cannot overwrite tested source')
    t=TestDB()
    try:
        t.create();report['cases']=exercise(t);assert hashes=={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
        report.update(result='Pass',assertions=len(report['cases']),artifactHashes=hashes)
    finally:
        t.cleanup();report['cleanup']='owned disposable DB removed';food.write_json(args.report,report)
    print(json.dumps({'result':report['result'],'assertions':report['assertions'],'cleanup':report['cleanup']}))
if __name__=='__main__':main()
