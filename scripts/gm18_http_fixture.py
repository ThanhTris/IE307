"""Owned disposable HTTP DB. Synthetic published state never touches the app DB."""
import argparse
from datetime import datetime,timedelta,timezone
import importlib.util
import hashlib
import json
from pathlib import Path
import re
import subprocess
import uuid
import gm17_access_check as gm17

ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
food=module('food','supabase/seed/import_food_data.py')
real=module('real','scripts/gm08_real_bundle_check.py')
def diagnostic_run(args,sql=None):
    args=['VERBOSITY=verbose' if a=='VERBOSITY=sqlstate' else a for a in args]
    result=subprocess.run(args,input=sql,text=True,encoding='utf-8',capture_output=True,timeout=180)
    if result.returncode:
        code=re.search(r'ERROR:\s+([A-Z0-9]{5})',result.stderr)
        constraint=re.search(r'CONSTRAINT NAME:\s*([A-Za-z0-9_]+)',result.stderr)
        raise RuntimeError('GM18_DB_'+(code.group(1) if code else 'PROCESS')
            +('_'+constraint.group(1) if constraint else ''))
    return result.stdout
food.LocalDB.run=staticmethod(diagnostic_run)
def database(namespace): return 'gm08_check_'+namespace.hex[:16]
def check_users(admin,namespace,users):
    ids=','.join(food.literal(u)+'::uuid' for u in users)
    count=admin.psql(f"select count(*) from auth.users where id=any(array[{ids}]) and is_anonymous and raw_user_meta_data->>'gm18_test_namespace'='{namespace}';").strip()
    if count!=str(len(users)): raise RuntimeError('Synthetic identity namespace not verified')
def owned(admin,namespace,users):
    db=food.LocalDB(database(namespace))
    if db.psql('select namespace::text from public.gm18_http_owner;').strip()!=str(namespace): raise RuntimeError('DB ownership not verified')
    check_users(admin,namespace,users)
    return db

def positive(namespace,users):
    now=datetime.now(timezone.utc)
    _,bundles=gm17.fixture_sql(namespace,users=users[:2],now=now)
    b=bundles['food'];version='0.18.'+str(int(namespace.hex[:8],16));b['datasetVersion']=version
    # NEW synthetic rows in this disposable DB simulate production ACL predicates.
    # No actual GM-08 row is relabeled, no production publish/receipt is created.
    b['fixtureOnly']=False
    for entity,rows in b['entities'].items():
        for row in rows:
            row['reviewStatus']='published';row['enteredBy']='GM18 simulated author';row['reviewedBy']='GM18 simulated reviewer';row['checkedAt']=(now-timedelta(days=1)).isoformat();row['validUntil']=(now+timedelta(days=6)).isoformat()
            if entity in ['taxonomy','dishes','venueDishes','dataSources','datasetVersions']: row['status']='published'
    for row in b['entities']['datasetVersions']+b['entities']['coverageAreas']: row['datasetVersion']=version
    for row in b['entities']['datasetVersions']:
        row.update(checksum=hashlib.sha256(str(namespace).encode()).hexdigest(),
            artifactLocator='tests://gm18/'+str(namespace)+'/synthetic',
            qualityReport='Synthetic HTTP fixture only; no real verification or rights',
            rollbackLocator='tests://gm18/'+str(namespace)+'/owned-db-cleanup')
    for row in b['entities']['venues']: row['serviceModes']=['dine_in','takeaway'];row['branchName']='GM18 synthetic venue A'
    for row in b['entities']['venueDishes']: row['serviceMode']='dine_in'
    for row in b['entities']['dataSources']: row['usageRights']='granted';row['license']='Synthetic test permission only; no real rights granted'
    for row in b['entities']['dishes']: row['classificationStatus']='reviewed';row['mealSlots']=['breakfast','lunch','dinner','snack'];row['name']='GM18 synthetic dish'
    b['entities']['dateExceptions']=[];b['entities']['availabilityOverrides']=[]
    venue=json.loads(json.dumps(b['entities']['venues'][0]));offer=json.loads(json.dumps(b['entities']['venueDishes'][0]))
    venue['id']=str(uuid.uuid5(namespace,'venue-b'));venue['scheduleId']=str(uuid.uuid5(namespace,'schedule-b'));venue['branchName']='GM18 synthetic venue B'
    offer['offeringId']=str(uuid.uuid5(namespace,'offering-b'));offer['venueId']=venue['id'];offer['scheduleId']=str(uuid.uuid5(namespace,'offering-schedule-b'))
    offer['priceMin']=offer['priceMax']=20000;offer['unit']='person';offer['currency']='VND';offer['profileOverrides']={'temperature':'cold'}
    b['entities']['venues'].append(venue);b['entities']['venueDishes'].append(offer)
    groups={r['scheduleId']:r for r in b['entities']['weeklySchedules']}
    for typ,row in [('venue',venue),('offering',offer)]:
        prototype=json.loads(json.dumps(next(iter(groups.values()))));prototype.update(scheduleId=row['scheduleId'],ownerType=typ,ownerId=row.get('id',row.get('offeringId')));groups[row['scheduleId']]=prototype
    weekly=[]
    for sid,proto in groups.items():
        for day in range(1,8):
            row=json.loads(json.dumps(proto));row.update(id=str(uuid.uuid5(namespace,sid+':'+str(day))),dayOfWeek=day,startTime='00:00',endTime='00:00',endDayOffset=1,is24Hours=True,lastOrder=None,lastOrderDayOffset=None,status='open')
            weekly.append(row)
    b['entities']['weeklySchedules']=weekly
    core=bundles['core']['entities']
    for r in core['rooms']:
        r['desiredAt']=(now+timedelta(minutes=30)).isoformat();r['expiresAt']=(now+timedelta(hours=2)).isoformat();r['serviceMode']='dine_in';r['datasetVersion']=version
    for r in core['roundDishes']: r['datasetVersion']=version
    types={(f['contract'],f['path']):f['sqlType'] for f in food.load_json(ROOT/'docs/data/database-mapping.json')['fields']}
    lines=['begin;set constraints all deferred;']
    for entity,rows in core.items():
        for row in rows:
            lines.append('insert into public.'+food.snake(entity)+'('+','.join(food.snake(k) for k in row)+') values('+','.join(gm17.sql_literal(v,types[('core',entity+'.'+k)]) for k,v in row.items())+');')
    lines+=['set constraints all immediate;commit;']
    return b,'\n'.join(lines),core

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['create','positive','pause','unpause','member-left','expire','capture','rate-reset','cleanup'])
    parser.add_argument('namespace',type=uuid.UUID);parser.add_argument('users',nargs='+',type=uuid.UUID)
    args=parser.parse_args();users=[str(x) for x in args.users]
    if not 1<=len(users)<=3 or len(set(users))!=len(users): raise ValueError('Distinct synthetic guests required')
    admin=food.LocalDB();check_users(admin,args.namespace,users);name=database(args.namespace)
    if args.mode=='cleanup':
        if admin.psql(f"select count(*) from pg_database where datname='{name}';").strip()=='1':
            owned(admin,args.namespace,users);admin.psql('drop database '+name+';')
        ids=','.join(food.literal(u)+'::uuid' for u in users)
        # GM-22 creates a profile for every synthetic auth identity. Remove
        # those owned test profiles before deleting auth.users because the
        # core FK is intentionally deferrable without ON DELETE CASCADE.
        admin.psql(f"delete from public.profiles where user_id=any(array[{ids}]);")
        admin.psql(f"delete from auth.users where id=any(array[{ids}]) and is_anonymous and raw_user_meta_data->>'gm18_test_namespace'='{args.namespace}';")
        print(json.dumps({'cleanup':'owned DB and synthetic guests removed'}));return
    if len(users)!=3: raise ValueError('Three guests required before setup')
    if args.mode=='create':
        created=False
        try:
            ddl=admin.run(['docker','exec',food.CONTAINER,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-privileges','-t','auth.users'])
            ddl='\n'.join(line for line in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm\d+_',line))
            uid=admin.psql("select pg_get_functiondef('auth.uid()'::regprocedure);")
            admin.psql('create database '+name+' template template0;');created=True;db=food.LocalDB(name)
            db.psql('create schema auth;\n'+ddl+'\n'+uid+';grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;')
            for path in sorted((ROOT/'supabase/migrations').glob('*.sql')): db.psql(path.read_text(encoding='utf-8'))
            db.psql("create table public.gm18_http_owner(namespace uuid primary key);revoke all on public.gm18_http_owner from public,anon,authenticated,service_role;insert into public.gm18_http_owner values('"+str(args.namespace)+"');")
            for user in users: db.psql(f"insert into auth.users(id,is_anonymous) values('{user}',true);")
            bundle,sha,preflight=real.candidate(ROOT/'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json')
            db.transaction(real.load_sql(bundle))
            print(json.dumps({'database':name,'actualBundleSha256':sha,'actualCounts':preflight['rowCounts']}));return
        except Exception:
            if created: admin.psql('drop database '+name+';')
            raise
    db=owned(admin,args.namespace,users);b,core_sql,core=positive(args.namespace,users)
    if args.mode=='positive':
        db.transaction(real.load_sql(b));db.psql(core_sql)
        print(json.dumps({'simulationOnly':True,'syntheticPublishedState':True,'datasetVersion':b['datasetVersion'],
            'anchorId':b['entities']['publicAnchors'][0]['anchorId'],'areaId':b['entities']['coverageAreas'][0]['areaId'],
            'dishId':b['entities']['dishes'][0]['id'],'offeringIds':[r['offeringId'] for r in b['entities']['venueDishes']],
            'roomId':core['rooms'][0]['id'],'resultId':core['results'][0]['id'],'winnerId':core['results'][0]['winnerRoundDishId'],
            'categoryId':b['entities']['taxonomy'][-1]['id']}));return
    if args.mode=='rate-reset':
        ids=','.join(food.literal(u)+'::uuid' for u in users)
        db.psql(f"delete from gm18_api_private.read_windows where user_id=any(array[{ids}]);")
        print(json.dumps({'mode':'owned test read-window reset'}));return
    if args.mode=='capture':
        # Hash-only output; never print private room/result fields or ballot data.
        import hashlib
        value=db.psql(f"select jsonb_build_object('room',to_jsonb(r),'result',to_jsonb(s)) from public.rooms r join public.results s on s.room_id=r.id where r.id='{core['rooms'][0]['id']}';")
        print(json.dumps({'immutableDecisionSha256':hashlib.sha256(value.encode()).hexdigest()}));return
    if args.mode in ['pause','unpause']:
        lines=['begin;set constraints all deferred;']
        for offer in b['entities']['venueDishes']:
            oid=str(uuid.uuid5(args.namespace,'stock:'+offer['offeringId']))
            if args.mode=='unpause': lines.append(f"delete from public.availability_overrides where id='{oid}';")
            else:
                now=datetime.now(timezone.utc)
                row=dict(id=oid,offeringId=offer['offeringId'],state='sold_out',source=offer['sourceRef'],observedAt=(now-timedelta(seconds=1)).isoformat(),expiresAt=(now+timedelta(hours=2)).isoformat(),version=1,reviewStatus='published',sourceRef=offer['sourceRef'],fieldSources={},checkedAt=(now-timedelta(seconds=1)).isoformat(),validUntil=(now+timedelta(hours=2)).isoformat(),enteredBy='GM18 simulated author',reviewedBy='GM18 simulated reviewer',fixtureOnly=False)
                row=food.records(dict(fixtureOnly=False,entities={**{key:[] for key in food.ORDER},'availabilityOverrides':[row]}))['availability_overrides'][0]
                cols=','.join(food.snake(k) for k in row)
                lines.append(f"insert into public.availability_overrides({cols}) select {cols} from jsonb_populate_record(null::public.availability_overrides,{food.literal(json.dumps(row))}::jsonb);")
        lines+=['set constraints all immediate;commit;'];db.psql('\n'.join(lines))
    elif args.mode=='member-left': db.psql(f"update public.members set left_at=statement_timestamp(),version=version+1 where room_id='{core['rooms'][0]['id']}' and user_id='{users[1]}';")
    elif args.mode=='expire': db.psql(f"update public.rooms set expires_at=statement_timestamp()-interval '1 second',version=version+1 where id='{core['rooms'][0]['id']}';")
    print(json.dumps({'mode':args.mode,'result':'Pass'}))

if __name__=='__main__': main()
