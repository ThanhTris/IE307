"""GM40.2 received projection adoption; extends owned GM40 legacy QA only."""
from copy import deepcopy
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import uuid
from jsonschema import Draft202012Validator, FormatChecker
import gm40_catalogue_check as baseline

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('gm40_data_projection',ROOT/'data-preparation/scripts/catalogue_projection.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)


def exercise(db,namespace,http,check):
    bundle_path=ROOT/p.contract.BUNDLE_PATH;manifest_path=ROOT/p.contract.MANIFEST_PATH
    bundle,sha=p.candidate(bundle_path,manifest_path)
    wanted=p.document(bundle,sha)
    def rejects(label,fn):
        try:fn()
        except (ValueError,RuntimeError):check(label,True)
        else:raise AssertionError(label)
    def saved():
        return db.psql("select md5(coalesce(jsonb_agg(to_jsonb(s) order by room_id)::text,'')) from dish_v3_private.sessions s;select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'')) from public.results r;").strip()
    # Existing B runtime, not the new GM20 capability: freeze an actual reduced
    # R2 before activation so Data cannot accidentally refill from all39 cards.
    base_wire='dish-session-v4/roadmap-v2/GM-07.B'
    def v4(command,who=0,**fields):
        db.psql('select dish_v4_private.tick();')
        if command not in ['snapshot','result']:fields.setdefault('requestId',uuid.uuid4().hex)
        status,body=http(command,{'contractVersion':base_wire,**fields},who=who)
        if status!=200 or body.get('ok') is not True:raise AssertionError('Locked B fixture '+command+' failed: '+str(status)+' '+str(body.get('error',{}).get('messageKey')))
        return body['data']
    pref={'cuisineIds':[],'categoryIds':[],'temperature':None,'flavor':None,'budget':None,'avoidRecent':False}
    locked=v4('create',displayName='QA locked host',settings={'dishCount':20,'mealSlot':'lunch','desiredAt':None},preferences=pref)
    v4('join',1,code=locked['code'],displayName='QA locked member')
    snap=v4('snapshot',roomId=locked['roomId'])
    v4('start',roomId=locked['roomId'],expectedVersion=snap['version'])
    for who in [0,1]:
        snap=v4('snapshot',who,roomId=locked['roomId'])
        votes=[{'roundDishId':c['roundDishId'],'choice':'NO' if who==0 and n>=2 else 'OK'} for n,c in enumerate(snap['pool'])]
        v4('submit',who,roomId=locked['roomId'],expectedVersion=snap['version'],round=1,poolVersion=snap['poolVersion'],votes=votes)
    for who in [0,1]:
        snap=v4('snapshot',who,roomId=locked['roomId'])
        if snap['round']!=1:break  # Follow the pinned B lifecycle; do not resubmit old-round waiting.
        v4('waiting',who,roomId=locked['roomId'],expectedVersion=snap['version'],round=1,poolVersion=snap['poolVersion'])
    pinned=v4('snapshot',roomId=locked['roomId'])
    check('existing B fixture locks exactly2 R2 survivors',pinned['round']==2 and len(pinned['pool'])==2)
    def locked_state():
        snap=v4('snapshot',roomId=locked['roomId'])
        return {k:snap[k] for k in ['round','poolVersion','pool','catalogueVersion','catalogueSha']}
    frozen=locked_state()
    old_state=saved()
    venue_counts=db.psql('select (select count(*) from public.venues)+(select count(*) from public.venue_dishes)+(select count(*) from public.public_anchors);').strip()
    old_active=json.loads(db.psql("select row_to_json(c) from dish_v3_private.catalogues c where active;"))
    samples=[]
    schema=json.loads(p.API_SCHEMA.read_text());validator=Draft202012Validator(schema,format_checker=FormatChecker())
    def read(name='get_dish_catalogue',authenticated=True,**fields):
        status,body=http('',{'payload':{'contractVersion':p.received.CONTRACT,**fields}},rpc=name,authenticated=authenticated)
        if authenticated:validator.validate(body)
        if authenticated and (not fields or fields in [{'mealSlot':'lunch','dishCount':20},{'mealSlot':'dinner','dishCount':20}]):
            samples.append({'endpoint':'/rpc/'+name,'input':{'payload':{'contractVersion':p.received.CONTRACT,**fields}},'status':status,'output':body})
        return status,body
    with tempfile.TemporaryDirectory() as directory:
        tmp=Path(directory)
        staged=p.stage(bundle_path,tmp/'stage',manifest_path)
        check('rich stage uses received release suffix and39 stable IDs',staged['releaseId']==p.release_id(bundle) and len(staged['cards'])==39)
        check('rich stage retains exact full provenance bytes',(tmp/'stage/bundle.json').read_bytes()==bundle_path.read_bytes())
        check('rich stage equals deterministic published projection',staged==json.loads((p.DIRECTORY/'projection.json').read_text()))
        row=p.install(db,namespace,bundle_path,manifest_path,activate=True)
        check('rich importer readback exact cards/hash/test-only',row['cards']==staged['cards'] and row['source_sha']==sha and row['active'] and row['test_only'])
        db.psql((ROOT/'supabase/tests/dish_catalogue.sql').read_text(encoding='utf8'))
        check('rich SQL metadata/privacy/latest-price assertions',True)
        check('rich activation cannot refill or rewrite reduced locked R2',locked_state()==frozen)
        check('rich reimport is exact no-op',p.install(db,namespace,bundle_path,manifest_path,activate=True)==row)
        previous=p.readback(db,namespace,old_active['id'])
        check('baseline release metadata/cards/hash immutable',all(previous[k]==old_active[k] for k in [k for k in old_active if k!='active']))
        changed=deepcopy(bundle);changed['entities']['priceReferences'][0]['value']+=1
        conflict=tmp/'conflict.json';conflict.write_bytes(p.contract.encoded(changed))
        rejects('rich same version changed source rejected',lambda:p.install(db,namespace,conflict,activate=True))
        check('rich conflict does not alter release',p.readback(db,namespace,row['id'])==row)
        status,body=read();data=body['data']
        check('received catalogue RPC returns39 dishes pinned to rich release',status==200 and data['catalogueVersion']==row['id'] and data['catalogueSha']==sha and data['testOnly'] and len(data['dishes'])==39)
        expected={c['dishId']:{k:v for k,v in c.items() if k!='projectionVersion'} for c in staged['cards']}
        for card in data['dishes']:
            check('SQL/API rich card equals received Data projection '+card['dishId'],card==expected[card['dishId']])
        check('rich catalogue includes no source editors/room/venue identities',not any({'enteredBy','reviewedBy','sourceDishIds','venueId','offeringId','preferences'} & c.keys() for c in data['dishes']))
        for meal,available in [('breakfast',14),('lunch',23),('dinner',7),('snack',1)]:
            status,body=read(mealSlot=meal)
            check('rich catalogue independent meal coverage '+meal,status==200 and body['data']['available']==available)
            for count in [10,20]:
                status,body=read('preview_dish_pool',mealSlot=meal,dishCount=count)
                if available<count:
                    check('rich honest shortage '+meal+'/'+str(count),status==409 and body['error']['messageKey']=='INSUFFICIENT_DISHES' and body['error']['details']=={'available':available,'requested':count})
                else:
                    got=body['data']['dishes']
                    check('rich exact preview '+meal+'/'+str(count),status==200 and len(got)==count and len({c['dishId'] for c in got})==count and all(c==expected[c['dishId']] and meal in c['mealSlots'] for c in got))
        status,_=read(authenticated=False);check('rich read without identity denied',status in [401,403])
        for payload in [{'venueId':'forbidden'},{'contractVersion':'old-wire'},{'dishCount':9,'mealSlot':'lunch'}]:
            endpoint='preview_dish_pool' if 'dishCount' in payload else 'get_dish_catalogue'
            status,body=read(endpoint,**payload);check('rich API rejects unsupported context '+next(iter(payload)),status==400 and body['ok'] is False)
        next_bundle=deepcopy(bundle);next_bundle['datasetVersion']='1.1.1'
        next_path=tmp/'qa-next.json';next_path.write_bytes(p.contract.encoded(next_bundle))
        rejects('rich fault rolls back new release and activation',lambda:p.install(db,namespace,next_path,activate=True,fail_after_insert=True))
        check('rich failed candidate absent; previous stays active',p.readback(db,namespace,p.release_id(next_bundle)) is None and p.readback(db,namespace,row['id'])['active'])
        next_row=p.install(db,namespace,next_path,activate=True)
        check('rich version activation is explicit',next_row['active'] and not p.readback(db,namespace,row['id'])['active'])
        p.activate(db,namespace,row['id']);check('rich restore switches only pointer',p.readback(db,namespace,row['id'])['active'] and not p.readback(db,namespace,next_row['id'])['active'])
        rejects('rich unknown restore rejected',lambda:p.activate(db,namespace,'absent:gm18.2'))
        p.activate(db,namespace,old_active['id'])
        check('release restore retains exactly2 locked R2 cards',locked_state()==frozen)
        check('baseline active release fully restored',p.readback(db,namespace,old_active['id'])==old_active)
        check('locked legacy snapshots/results remain byte-equivalent',saved()==old_state)
        check('rich source bundle/manifest unchanged',hashlib.sha256(bundle_path.read_bytes()).hexdigest()==sha)
        check('no venue/offering/public-anchor rows introduced',db.psql('select (select count(*) from public.venues)+(select count(*) from public.venue_dishes)+(select count(*) from public.public_anchors);').strip()==venue_counts)

    return {'sourceBundleSha256':sha,'releaseId':wanted['releaseId'],'publicApiSamples':samples}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--report',type=Path,default=ROOT/'.work/gm40-rich-results.json');args=parser.parse_args()
    target=args.report.resolve()
    if target.is_relative_to(ROOT) and not any(target.is_relative_to(ROOT/q) for q in ['.work','docs/evidence/roadmap-v2/GM-40']):
        raise ValueError('Report cannot overwrite repository source/data')
    target.unlink(missing_ok=True)
    baseline.run(args.report,extension=exercise,extra_sources=[Path(__file__),ROOT/'data-preparation/scripts/catalogue_projection.py',ROOT/'supabase/seed/import_gm18_catalogue.py',p.API_SCHEMA,*p.build().keys()])
