#!/usr/bin/env python3
"""GM18.2 real draft + isolated PostgreSQL/HTTP, with v2/v4 compatibility baseline."""
import argparse
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import uuid
from jsonschema import Draft202012Validator, FormatChecker

import gm06_isolated_http_check as qa
from gm06_v4_compat import CONTRACT as BASE, EMPTY

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('gm18_import',ROOT/'supabase/seed/import_gm18_catalogue.py')
projection=importlib.util.module_from_spec(spec);spec.loader.exec_module(projection)
L=qa.literal


def exercise(db,rpc,check,users):
    schema=json.loads((ROOT/'docs/architecture/schemas/gm18-dish-catalogue.schema.json').read_text())
    Draft202012Validator.check_schema(schema)
    validator=Draft202012Validator(schema,format_checker=FormatChecker())
    def query(name,sql,expected='t'):check(name,db.psql(sql).strip(),expected)
    def read(name='preview_dish_pool',user=3,**payload):
        status,body=rpc(name,{'payload':{'contractVersion':projection.CONTRACT,**payload}},user)
        if not validator.is_valid(body):raise AssertionError('GM18 HTTP schema mismatch: '+name)
        return status,body
    def api(command,user=3,**payload):
        db.psql('select dish_v4_private.tick();')
        if command not in ('snapshot','result','history','getDefaultPreferences'):
            payload.setdefault('requestId',str(uuid.uuid4()))
        status,body=rpc('dish_session',{'command':command,'payload':{'contractVersion':BASE,**payload}},user)
        if status!=200 or body.get('ok') is not True:raise AssertionError('v4 '+command+' status '+str(status))
        return body['data']
    def sql_reject(name,sql,state):
        try:db.psql(sql)
        except RuntimeError as exc:check(name,state in str(exc))
        else:raise AssertionError(name+' unexpectedly accepted')
    legacy=json.loads(subprocess.check_output(['node','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','scripts/gm18_domain_check.mjs'],cwd=ROOT,text=True,encoding='utf-8'))
    db.psql((ROOT/'supabase/tests/food_eligibility.sql').read_text())
    for case in legacy:
        actual=json.loads(db.psql('select gm18_private.evaluate('+L(json.dumps(case['bundle']))+'::jsonb,'+L(json.dumps(case['input']))+'::jsonb,'+L(case['evaluatedAt'])+'::timestamptz,'+L(json.dumps(case['policy']))+'::jsonb);').strip())
        check('legacy complete TS/SQL parity '+case['id'],actual==case['actual'])
        check('legacy independent offering expectation '+case['id'],actual['eligibleOfferingIds']==sorted(case['expectedEligibleOfferingIds']))
    query('0033 ledger is distinct',"select contract_id='dish-catalogue/roadmap-v2/GM-18.2' from public.schema_versions where schema_version='0.11.0';")
    query('new RPC fixed path and grants',"""select count(*)=2 and bool_and(prosecdef and proconfig=array['search_path=pg_catalog']
     and has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute')
     and not has_function_privilege('service_role',p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in('get_dish_catalogue','preview_dish_pool');""")
    query('private selector and card projection not executable by app roles',"select not has_function_privilege('authenticated','gm18_api_private.dish_read(jsonb,boolean)','execute') and not has_function_privilege('authenticated','gm18_api_private.dish_card(jsonb)','execute');")
    bundle,digest=projection.upstream.candidate(ROOT/projection.upstream.contract.BUNDLE_PATH,ROOT/projection.upstream.contract.MANIFEST_PATH)
    db.psql(projection.upstream.import_sql(bundle,digest,True))
    baseline_id=projection.upstream.release_id(bundle)
    baseline_cards=db.psql('select cards from dish_v3_private.catalogues where id='+L(baseline_id)+';').strip()
    sql_reject('faulted rich import rolls back all activation/data',projection.import_sql(bundle,digest,True,True),'P0001')
    query('failed import leaves previous active catalogue and no partial rich release',
          'select (select active from dish_v3_private.catalogues where id='+L(baseline_id)+') and not exists(select 1 from dish_v3_private.catalogues where id='+L(projection.release_id(bundle))+');')
    db.psql(projection.import_sql(bundle,digest,True));db.psql(projection.import_sql(bundle,digest,True))
    query('real rich import replay has one release', 'select count(*)=1 from dish_v3_private.catalogues where id='+L(projection.release_id(bundle))+';')
    check('baseline catalogue stays byte-equivalent after opt-in rich import',db.psql('select cards from dish_v3_private.catalogues where id='+L(baseline_id)+';').strip()==baseline_cards)
    status,body=read('get_dish_catalogue');data=body['data']
    check('real39 dish catalogue HTTP readback',status==200 and len(data['dishes'])==39 and data['catalogueSha']==digest and data['testOnly'] is True)
    expected=projection.cards(bundle)
    for card in data['dishes']:
        source=next(x for x in expected if x['dishId']==card['dishId'])
        check('real source projection matches '+card['dishId'],all(card[k]==source[k] for k in ['dishId','name','description','mealSlots','cuisineIds','categoryIds','cuisineLabels','categoryLabels','temperature','flavor','priceReference','priceObservation','cuisineTerms','categoryTerms','taxonomyVersion']))
    check('catalogue omits raw provenance/editor/private fields',not any({'enteredBy','reviewedBy','fieldSources','sourceDishIds','snapshotSha256','rawBallots','preferences'} & x.keys() for x in data['dishes']))
    for meal in ['breakfast','lunch','dinner','snack']:
        available=sum(meal in x['mealSlots'] for x in expected)
        status,response=read(mealSlot=meal,dishCount=10)
        check('real meal exact count or honest shortage '+meal,
              status==200 and len(response['data']['dishes'])==10 if available>=10 else status==409 and response['error']['details']=={'available':available,'requested':10})
    # Synthetic release is separate and explicit; no real source/meal label is changed.
    sample=deepcopy(expected[0]);synthetic=[]
    for i in range(21):
        row={**sample,'dishId':str(uuid.uuid5(uuid.UUID(users[3]),'gm18-dish-'+str(i))),'name':'Synthetic GM18 '+str(i),'mealSlots':['dinner'] if i<20 else []}
        row['priceObservation']=None;row['priceReference']=None
        synthetic.append(row)
    observation={'amount':0,'currency':'VND','unit':'menu_item_unspecified','sourceRef':'qa-source','servingSize':None,'observedAt':'2026-10-29T00:00:00Z'}
    synthetic[0]['priceObservation']=observation;synthetic[0]['priceReference']=projection.baseline_price(observation)
    synthetic[1]['priceObservation']={**observation,'amount':None}
    synthetic[2]['priceObservation']={**observation,'currency':None,'unit':None,'sourceRef':None}
    synthetic[3]['cuisineIds']=[];synthetic[3]['cuisineLabels']=[];synthetic[3]['cuisineTerms']=[]
    synthetic[3]['temperature']=None;synthetic[3]['flavor']=None
    def activate(identifier,rows):
        db.psql('begin;update dish_v3_private.catalogues set active=false where active;insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values('+L(identifier)+','+L(hashlib.sha256(json.dumps(rows).encode()).hexdigest())+','+L(json.dumps(rows))+'::jsonb,true,true);commit;')
    activate('gm18-synthetic',synthetic)
    before=db.psql('select count(*) from public.rooms;').strip()
    for count in range(10,21):
        status,response=read(mealSlot='dinner',dishCount=count)
        cards=response['data']['dishes']
        check('requested count exact and unique '+str(count),status==200 and len(cards)==count and len({x['dishId'] for x in cards})==count and response['data']['available']==20 and response['data']['requested']==count)
    for count in [9,21,10.5,True,None,'10',{},1e100]:
        status,response=read(mealSlot='dinner',dishCount=count)
        check('invalid count rejected '+repr(count),status==400 and response['error']['messageKey']=='INVALID_INPUT')
    for meal in [None,True,[], 'late_night']:
        status,response=read(mealSlot=meal,dishCount=10)
        check('invalid meal rejected '+repr(meal),status==400 and response['error']['messageKey']=='INVALID_INPUT')
    for field in ['venueId','anchorId','radiusM','latitude','coverageId','cuisineIds']:
        status,response=read(mealSlot='dinner',dishCount=10,**{field:'not-a-filter'})
        check('unsupported hard filter rejected '+field,status==400 and response['error']['messageKey']=='UNSUPPORTED_FIELD')
    pref={**EMPTY,'cuisineIds':[str(uuid.uuid4())],'budget':{'maximum':1,'currency':'USD','unit':'person'},'avoidRecent':True}
    status,response=read(mealSlot='dinner',dishCount=20,preferences=pref)
    check('soft unknown/currency/unit/recent preferences never remove candidates or fabricate ranking',status==200 and response['data']['available']==20 and len(response['data']['dishes'])==20 and response['data']['preferenceRanking']=='UNSUPPORTED')
    check('preview has no persisted round IDs',not any('roundDishId' in c for c in response['data']['dishes']))
    check('read/preview creates no room or ballot',db.psql('select count(*) from public.rooms;').strip()==before)
    by_id={c['dishId']:c for c in response['data']['dishes']}
    check('zero and source unit preserved',by_id[synthetic[0]['dishId']]['priceReference']['amount']==0 and by_id[synthetic[0]['dishId']]['priceReference']['unit']=='menu_item_unspecified')
    check('null amount hidden without old fallback',by_id[synthetic[1]['dishId']]['priceReference'] is None and by_id[synthetic[1]['dishId']]['priceObservation']['amount'] is None)
    check('nullable latest metadata kept but baseline display unknown',by_id[synthetic[2]['dishId']]['priceReference'] is None and by_id[synthetic[2]['dishId']]['priceObservation']['unit'] is None)
    status,response=rpc('get_dish_catalogue',{'payload':{'contractVersion':projection.CONTRACT}},authenticated=False)
    check('HTTP without JWT denied',status in (401,403))
    for version in [BASE,'dish-session-v4/roadmap-v2/GM-07.B-supplement',None]:
        status,response=rpc('get_dish_catalogue',{'payload':{'contractVersion':version}},3)
        check('wrong version rejected '+str(version),status==400 and response['error']['messageKey']=='UNSUPPORTED_CONTRACT_VERSION')
    for payload in [None,[],{},True]:
        status,response=rpc('preview_dish_pool',{'payload':payload},3)
        check('malformed payload rejected '+repr(payload),status==400 and response['ok'] is False)
    sql_reject('anon cannot execute new RPC',"set role anon;select public.get_dish_catalogue('{}');",'42501')
    query('authenticated role with absent identity gets safe auth failure',"begin;set local role authenticated;select public.get_dish_catalogue('{}')->'error'->>'messageKey';rollback;",'AUTH_REQUIRED')
    # Existing actual v4 producer consumes the same enriched catalogue cards.
    api('updateDefaultPreferences',expectedRevision=0,preferences=pref)
    check('account defaults remain private per caller',api('getDefaultPreferences')['preferences']==pref and api('getDefaultPreferences',4)['preferences']==EMPTY)
    room=api('create',displayName='GM18 QA',settings={'dishCount':20,'mealSlot':'dinner','desiredAt':None},preferences=pref)
    api('join',4,code=room['code'],displayName='QA peer')
    snapshot=api('snapshot',roomId=room['roomId'])
    check('actual v4 create has20 enriched cards and zero/unknown prices',len(snapshot['pool'])==20 and any(x['dishId']==synthetic[0]['dishId'] and x['priceReference']['amount']==0 for x in snapshot['pool']))
    api('updateDefaultPreferences',expectedRevision=1,preferences=EMPTY)
    snapshot=api('snapshot',roomId=room['roomId'])
    check('room preferences stay separate from updated defaults',snapshot['ownPreferences']==pref)
    check('peer cannot read other raw preference',api('snapshot',4,roomId=room['roomId'])['ownPreferences']==EMPTY)
    api('start',roomId=room['roomId'],expectedVersion=snapshot['version'])
    for who in [3,4]:
        snapshot=api('snapshot',who,roomId=room['roomId'])
        votes=[{'roundDishId':c['roundDishId'],'choice':'WANT' if i==0 else 'OK'} for i,c in enumerate(snapshot['pool'])]
        api('submit',who,roomId=room['roomId'],expectedVersion=snapshot['version'],round=1,poolVersion=snapshot['poolVersion'],votes=votes)
    stored=api('result',roomId=room['roomId'])
    check('actual v4 finalize retains source winner card',stored['status']=='DECIDED' and stored['winner']==snapshot['pool'][0])
    activate('gm18-synthetic-next',[{**x,'name':'New catalogue name'} for x in synthetic])
    check('catalogue activation cannot recompute locked result/card/price',api('result',roomId=room['roomId'])==stored)
    # Request budget is bounded, not a way to enumerate private raw preference data.
    for _ in range(61):status,response=read('get_dish_catalogue',user=5)
    check('catalogue rate limiter returns429',status==429 and response['error']['messageKey']=='RATE_LIMITED')
    duplicate=deepcopy(synthetic)
    duplicate[1]['dishId']=duplicate[0]['dishId'].upper()
    activate('gm18-duplicate-identity',duplicate)
    status,response=read('get_dish_catalogue',user=6)
    check('case-equivalent UUIDs cannot create duplicate preview identities',status==503 and response['error']['messageKey']=='CATALOGUE_NOT_READY')
    oversized=[{**sample,'dishId':str(uuid.uuid5(uuid.UUID(users[6]),str(i)))} for i in range(1001)]
    activate('gm18-oversized',oversized)
    status,response=read('get_dish_catalogue',user=6)
    check('oversized catalogue fails explicitly instead of truncation',status==503 and response['error']['messageKey']=='CATALOGUE_NOT_READY')
    db.psql('update dish_v3_private.catalogues set active=false where active;')
    status,response=read('get_dish_catalogue',user=6)
    check('missing active catalogue fails explicitly',status==503 and response['error']['messageKey']=='CATALOGUE_NOT_READY')
    db.psql((ROOT/'supabase/rollback/0033_gm18_dish_catalogue.down.sql').read_text())
    query('QA down removes only new RPC and ledger',"select to_regprocedure('public.get_dish_catalogue(jsonb)') is null and not exists(select 1 from public.schema_versions where schema_version='0.11.0');")
    check('down keeps actual v4 result',api('result',roomId=room['roomId'])==stored)
    db.psql((ROOT/'supabase/migrations/0033_gm18_dish_catalogue.sql').read_text())
    query('forward reapply succeeds',"select exists(select 1 from public.schema_versions where schema_version='0.11.0');")


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',type=Path,required=True);args=parser.parse_args()
    destination=args.report.resolve()
    if destination.is_relative_to(ROOT) and not any(destination.is_relative_to(ROOT/p) for p in ('docs/evidence/roadmap-v2/GM-18','.work')):
        raise ValueError('Report must not overwrite repository source/data/fixtures')
    paths=[Path(__file__),ROOT/'supabase/seed/import_gm18_catalogue.py',ROOT/'supabase/seed/import_dish_catalogue.py',ROOT/'supabase/rollback/0033_gm18_dish_catalogue.down.sql',ROOT/projection.upstream.contract.BUNDLE_PATH,ROOT/projection.upstream.contract.MANIFEST_PATH,ROOT/'scripts/gm18_domain_check.mjs',ROOT/'mobile/src/domain/eligibility/index.ts',ROOT/'mobile/tests/helpers/eligibilityFixtures.mjs',ROOT/'supabase/tests/food_eligibility.sql',ROOT/'scripts/build_gm18_contract.py',ROOT/'docs/architecture/schemas/gm18-dish-catalogue.schema.json',ROOT/'docs/architecture/schemas/dish-session-v4b.schema.json']
    qa.run(args.report,exercise=exercise,scope='GM18.2 real draft and synthetic SQL/HTTP catalogue/preview; existing v2/v4 compatibility; no production or Android',extra_sources=paths)
    print('GM18.2 SQL/HTTP checks Pass; all owned resources cleaned.')


if __name__=='__main__':
    try:main()
    except Exception as exc:print('GM18.2 checks failed: '+str(exc)[:250],file=sys.stderr);raise SystemExit(1)
