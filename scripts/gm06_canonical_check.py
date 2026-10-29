#!/usr/bin/env python3
"""GM06.3 real PostgreSQL storage checks in one namespace-owned disposable DB.

Application DB is read only (auth DDL + introspection). Never reset/reconcile it.
No user data, JWT, credentials or real ballots are copied into reports.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dish_policy_worker import verify as verify_v3
from gm06_v4_compat import V4Compatibility
from gm06_canonical_validation import exercise as validate_regressions
import gm06_schema_check as baseline
spec = importlib.util.spec_from_file_location('gm06_canonical_food', ROOT/'supabase/seed/import_food_data.py')
food = importlib.util.module_from_spec(spec)
spec.loader.exec_module(food)
MIGRATION = ROOT/'supabase/migrations/0032_canonical_result_storage.sql'
DOWN = ROOT/'supabase/rollback/0032_canonical_result_storage.down.sql'


def literal(value):
    return food.literal(value)


def typed(value):
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        return literal(json.dumps(value, ensure_ascii=False))+'::jsonb'
    return literal(value)


def source_hashes():
    paths = [MIGRATION, DOWN, Path(__file__), ROOT/'docs/data/GM06_CANONICAL_STORAGE.md', ROOT/'scripts/gm06_v4_compat.py', ROOT/'scripts/gm06_canonical_validation.py']
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.exists()}


def definitions(db):
    return json.loads(db.psql("""select coalesce(jsonb_object_agg(n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')',
    md5(p.prosrc||coalesce(array_to_string(p.proconfig,','),'')||p.prosecdef::text)),'{}') from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname in
    ('dish_v3_private','dish_v4_private','gm17_private','gm20_private','gm21_private','public') and p.prokind='f';"""))


def run(report_path, previous_ref=None):
    namespace = uuid.uuid4()
    database = 'gm08_check_'+namespace.hex[:16]
    admin = food.LocalDB()
    db = None
    created = False
    checks = []
    report = {'result': 'Fail', 'scope': 'independent GM06.3 model; existing dish_v4_private remains API authority',
              'schemaVersion': '0.10.0', 'dataMode': 'synthetic fixtures only',
              'applicationDatabaseChanged': False, 'productionPublished': False,
              'checkedAt': datetime.now(timezone.utc).isoformat(),
              'testedHeadBeforePatchCommit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              'workingTreePatchIncluded': True, 'sourceHashes': source_hashes(), 'cases': checks}
    app_before = definitions(admin)

    def check(label, actual, expected=True):
        if actual != expected:
            raise AssertionError(f'{label}: expected {expected!r}, actual {actual!r}')
        checks.append({'case': label, 'expected': expected, 'actual': actual, 'result': 'Pass'})

    def query(label, sql, expected='t'):
        check(label, db.psql(sql).strip(), expected)

    def rejects(label, sql, code='23514'):
        try:
            db.psql(sql)
        except RuntimeError as exc:
            if code not in str(exc):
                raise AssertionError(label+': unexpected error '+str(exc)) from None
            check(label, code, code)
        else:
            raise AssertionError(label+': statement was accepted')

    def uid(key):
        return str(uuid.uuid5(namespace, key))

    users = [uid('user-'+str(i)) for i in range(21)]
    cards = [{'dishId': uid('dish-'+str(i)), 'name': 'Món thử '+str(i),
              'description': None, 'artwork': None, 'mealSlots': ['dinner'],
              'cuisineIds': [], 'categoryIds': []} for i in range(20)]
    locked = [{**c, 'roundDishId': uid('round-'+str(i)), 'cuisineLabels': [],
               'categoryLabels': [], 'temperature': None, 'flavor': None,
               'priceReference': None} for i,c in enumerate(cards)]
    release = 'gm06-qa:'+namespace.hex
    sha = hashlib.sha256(json.dumps(cards).encode()).hexdigest()
    now = datetime.now(timezone.utc)
    final = now.isoformat()
    later = (now+timedelta(days=2)).isoformat()
    expiry = (now+timedelta(days=1)).isoformat()
    members = users[:20]
    result_id = uid('result')
    fingerprint = hashlib.sha256((result_id+':'+','.join(sorted(members))).encode()).hexdigest()

    def room(key='room'):
        payload = {'requestId': uid('create-'+key), 'displayName': 'GM06 QA', 'dishCount': 10, 'mealSlot': 'dinner'}
        lines = db.psql("begin;select dish_v3_private.tick();set local role authenticated;select set_config('request.jwt.claim.sub',"+literal(users[0])+",true);select public.dish_session('create',"+typed(payload)+");commit;").splitlines()
        response = json.loads(next(s for s in reversed(lines) if s.startswith('{')))
        if not response['ok']:
            raise AssertionError('V3 room setup failed: '+str(response))
        return response['data']['roomId']

    def result(overrides=None, selected_members=None):
        values = {'result_id': result_id, 'room_ref_id': room_id, 'catalogue_id': release,
                  'catalogue_sha': sha, 'storage_version': 'GM06.3',
                  'policy_version': 'dish-decision-v4/ADR-019-30PCT-MIN1',
                  'score_version': 'want2-ok1-round1-v1', 'ranking_version': 'score-desc-dense-rank-v1',
                  'status': 'DECIDED', 'reason': 'ACCEPTABLE_FINAL', 'terminal_round': 2,
                  'winner_dish_id': cards[1]['dishId'], 'locked_pool': locked,
                  'top_dishes': [{'dishId': cards[i]['dishId'], 'score': score, 'rank': rank, 'isWinner': i==1}
                                 for i,score,rank in [(0,8,1),(1,8,1),(2,7,2)]],
                  'member_count': 20, 'member_fingerprint': fingerprint, 'scored_r1_count': 4,
                  'meal_slot': 'dinner', 'planned_meal_at': None,
                  'finalized_at': final, 'retain_until': later}
        values.update(overrides or {})
        roster = members if selected_members is None else selected_members
        return ('begin;insert into gm06_canonical.results('+','.join(values)+') values('+','.join(typed(v) for v in values.values())+');'+
                ''.join('insert into gm06_canonical.result_members values('+literal(values['result_id'])+','+literal(u)+','+str(i<4).lower()+');' for i,u in enumerate(roster))+
                'set constraints all immediate;commit;')

    try:
        ddl = admin.run(['docker','exec',food.CONTAINER,'pg_dump','-U','postgres','-d','postgres',
                         '--schema-only','--no-owner','--no-privileges','-t','auth.users'])
        ddl = '\n'.join(line for line in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm\d+_',line))
        auth_uid = admin.psql("select pg_get_functiondef('auth.uid()'::regprocedure);")
        admin.psql('create database '+database+' template template0;')
        created = True
        db = food.LocalDB(database)
        db.psql('create table public.gm06_canonical_qa_owner(namespace uuid primary key);insert into public.gm06_canonical_qa_owner values('+literal(str(namespace))+');revoke all on public.gm06_canonical_qa_owner from public,anon,authenticated,service_role;')
        db.psql('create schema auth;'+ddl+'\n'+auth_uid+';grant usage on schema auth to anon,authenticated;')
        migrations = sorted((ROOT/'supabase/migrations').glob('*.sql'))
        target_version = int(MIGRATION.name.split('_',1)[0])
        baseline_migrations = [p for p in migrations if int(p.name.split('_',1)[0]) < target_version]
        downstream_migrations = [p for p in migrations if int(p.name.split('_',1)[0]) > target_version]
        # Test0032's own empty/down and populated upgrade against its real prior
        # baseline. Applying later adapters first requires the withheld schema.
        # All latest migrations remain covered by gm06_isolated_http_check.
        report['migrationHashes'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [*baseline_migrations,MIGRATION]}
        report['deferredMigrationHashes'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in downstream_migrations}
        report['migrationWindow'] = 'pre0032 baseline, then independent0032 upgrade/down/reapply; latest chain tested separately'
        for path in baseline_migrations:
            db.psql(path.read_text(encoding='utf-8'))
            if path.name=='0001_core_schema.sql':
                # Shift only synthetic fixture instants together so retention tests
                # are deterministic relative to this run, without editing templates.
                delta=now-timedelta(hours=1)-datetime(2026,10,9,14,20,tzinfo=timezone.utc)
                def shifted(match):
                    stamp=datetime.fromisoformat(match.group(1).replace('Z','+00:00'))
                    return "'"+(stamp+delta).isoformat()+"'::timestamptz"
                fixture=re.sub(r"'(\d{4}-\d\d-\d\dT[^']+Z)'::timestamptz",shifted,baseline.fixture_sql())
                db.psql('begin;'+fixture+'commit;')
        if previous_ref:
            if not re.fullmatch(r'[0-9a-f]{40}',previous_ref):
                raise ValueError('Previous source must be an exact commit SHA')
            old=subprocess.check_output(['git','show',previous_ref+':supabase/migrations/0027_canonical_result_storage.sql'],cwd=ROOT,text=True,encoding='utf-8')
            rejects('published0027/schema0.9.0 collision reproduced on current main',old,'23505')
            defs=[]
            for name in ('valid_price','valid_card','valid_terminal'):
                found=re.search(r'create function gm06_canonical\.'+name+r'\(.*?\$\$;',old,re.S)
                if not found: raise ValueError('Published validator definition unavailable')
                defs.append(found[0])
            broken_card={**locked[0],'priceReference':{}}
            broken_pool=[broken_card,*locked[1:]]
            probe="select jsonb_build_object('priceSQLNull',gm06_canonical.valid_price('{}'::jsonb) is null,'cardSQLNull',gm06_canonical.valid_card("+typed(broken_card)+") is null,'terminalAcceptedInvalidPrice',gm06_canonical.valid_terminal("+typed(broken_pool)+",'[]',null,'NO_CONSENSUS','EMPTY_INTERSECTION',1,1));"
            lines=db.psql('begin;create schema gm06_canonical;'+''.join(defs)+probe+'rollback;').splitlines()
            actual=json.loads(next(line for line in lines if line.startswith('{')))
            check('published SQL NULL bypass reproduced before fix',all(actual.values()))
            report['publishedRegressionBefore']={'commit':previous_ref,'actual':actual,'result':'Reproduced'}
        before = definitions(db)
        db.psql(MIGRATION.read_text(encoding='utf-8'))
        query('fresh empty canonical migration succeeds', "select exists(select 1 from public.schema_versions where schema_version='0.10.0');")
        db.psql(DOWN.read_text(encoding='utf-8'))
        check('empty down preserves all original definitions', definitions(db), before)
        checks[-1]={'case':'empty down preserves all original definitions','expected':True,'actual':True,'result':'Pass'}
        # Real v3 fixture before upgrade: does not use/enable a v4 session.
        for u in users:
            db.psql('insert into auth.users(id,is_anonymous) values('+literal(u)+',true);')
        db.psql('insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values('+literal(release)+','+literal(sha)+','+typed(cards)+',true,true);')
        db.psql('insert into dish_v3_private.runtime(singleton,last_tick,last_cleanup) values(true,statement_timestamp(),statement_timestamp());')
        v4=V4Compatibility(db,users,check,literal)
        v4.setup()
        room_id = room()
        existing_room = db.psql('select to_jsonb(r) from public.rooms r where id='+literal(room_id)+';').strip()
        legacy = db.psql("select jsonb_build_array((select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.results r),(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from public.histories h));").strip()
        # Upgrade with populated legacy winner/history + v3 room/catalogue/identities.
        db.psql(MIGRATION.read_text(encoding='utf-8'))
        query('v4 ledger versions and independent storage version coexist', "select count(*)=5 from public.schema_versions where schema_version in('0.8.0','0.9.0','0.9.1','0.9.2','0.10.0');")
        v4.after_upgrade()
        check('populated legacy result/history unchanged by upgrade', db.psql("select jsonb_build_array((select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.results r),(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from public.histories h));").strip()==legacy)
        check('populated v3 room unchanged by upgrade', db.psql('select to_jsonb(r) from public.rooms r where id='+literal(room_id)+';').strip()==existing_room)
        after = definitions(db)
        query('legacy winner/history fixture rows present after upgrade', 'select (select count(*) from public.results)=1 and (select count(*) from public.histories)=2;')
        unchanged = {k:v for k,v in before.items() if k!='gm17_private.cleanup()'}
        check('all preexisting decision/API/helper bodies unchanged except named cleanup bridge', all(after[k]==v for k,v in unchanged.items()))
        check('old cleanup body preserved under rename', after['gm17_private.cleanup_before_gm06_canonical()'], before['gm17_private.cleanup()'])
        verify_v3(db)
        check('v3 source-hash worker verifier still passes', True)
        query('all eight new tables force RLS', "select count(*)=8 and bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='gm06_canonical' and c.relkind='r';")
        for role in ['anon','authenticated','service_role','gm06_publisher']:
            query(role+' has no schema/table/function access', "select not has_schema_privilege('"+role+"','gm06_canonical','USAGE') and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='gm06_canonical' and c.relkind='r' and has_table_privilege('"+role+"',c.oid,'SELECT,INSERT,UPDATE,DELETE')) and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='gm06_canonical' and has_function_privilege('"+role+"',p.oid,'EXECUTE'));")
        rejects('authenticated direct raw preference read denied', 'set role authenticated;select * from gm06_canonical.account_preferences;', '42501')
        validate_regressions(query,rejects,result,locked,typed)
        rejects('canonical ID cannot collide with legacy registry', 'begin;insert into gm17_private.result_refs values('+literal(result_id)+');'+result().removeprefix('begin;'), '23505')
        rejects('catalogue SHA must match installed release', result({'catalogue_sha': '0'*64}))
        rejects('legacy dish ID outside catalogue rejected', result({'locked_pool': [{**locked[0],'dishId': uid('outside')},*locked[1:]]}))
        rejects('dangling room registry rejected', result({'room_ref_id': uid('unknown-room')}), '23503')
        rejects('only supported policy version may use new storage', result({'policy_version':'dish-decision-v3'}))
        rejects('21 participants rejected', result({'member_count':21},users))
        rejects('missing participant rejected at commit', result(selected_members=members[:19]))
        rejects('same count wrong roster fingerprint rejected', result(selected_members=[*members[:19],users[20]]))
        rejects('score above accepted R1 cohort bound rejected', result({'scored_r1_count':3}))
        rejects('scored R1 count must match actual stored accepted cohort', result({'scored_r1_count':5}))
        bad_podium = [{'dishId':cards[i]['dishId'],'score':s,'rank':r,'isWinner':i==1} for i,s,r in [(0,8,1),(1,8,2),(2,7,3)]]
        rejects('ties require dense equal ranks', result({'top_dishes':bad_podium}))
        rejects('winner must be present in stored podium', result({'winner_dish_id': cards[9]['dishId']}))
        rejects('noncanonical duplicate-capable round UUID rejected', result({'locked_pool': [{**locked[0],'roundDishId':locked[0]['roundDishId'].upper()},*locked[1:]]}))
        rejects('unknown raw ballot keys in card rejected', result({'locked_pool': [{**locked[0],'votes':{}},*locked[1:]]}))
        rejects('duplicate pool identities rejected', result({'locked_pool': [locked[0],locked[0],*locked[2:]]}))
        rejects('no consensus cannot retain a winner or podium', result({'status':'NO_CONSENSUS','reason':'EMPTY_INTERSECTION','terminal_round':1}))
        db.psql(result())
        query('20 members stored without public.dishes FK', 'select count(*)=20 from gm06_canonical.result_members where result_id='+literal(result_id)+';')
        rejects('roster cannot be appended in a later replay transaction', 'insert into gm06_canonical.result_members values('+literal(result_id)+','+literal(users[20])+',false);')
        query('shared result registry contains canonical result', 'select exists(select 1 from gm17_private.result_refs where id='+literal(result_id)+');')
        rejects('terminal projection cannot change after persistence', 'update gm06_canonical.results set top_dishes=\'[]\';')
        rejects('same result retry cannot reroll/overwrite', result(), '23505')
        query('winner/tie/ordered podium roundtrip exact', 'select top_dishes='+typed([{'dishId':cards[i]['dishId'],'score':s,'rank':r,'isWinner':i==1} for i,s,r in [(0,8,1),(1,8,1),(2,7,2)]])+' from gm06_canonical.results where result_id='+literal(result_id)+';')
        for round_no,reason in [(1,'EMPTY_INTERSECTION'),(2,'ALL_REMOVED')]:
            rid=uid('none-'+str(round_no)); rm=room('none-'+str(round_no))
            fp=hashlib.sha256((rid+':'+','.join(sorted(members))).encode()).hexdigest()
            db.psql(result({'result_id':rid,'room_ref_id':rm,'member_fingerprint':fp,'status':'NO_CONSENSUS','reason':reason,'terminal_round':round_no,'winner_dish_id':None,'top_dishes':[]}))
            query(reason+' persists no fake winner, no legacy result', 'select winner_dish_id is null and top_dishes=\'[]\'::jsonb from gm06_canonical.results where result_id='+literal(rid)+';')

        # Price observation selection: valid timestamps only, nulls and ties never fallback.
        def price(key,amount,when,**values):
            row={'observation_id':uid(key),'catalogue_id':release,'dish_id':cards[0]['dishId'],
                 'amount':amount,'currency':None,'unit':None,'source_ref':None,'serving_size':None,'observed_at':when}
            row.update(values)
            return 'insert into gm06_canonical.price_observations('+','.join(row)+') values('+','.join(typed(v) for v in row.values())+');'
        latest='gm06_canonical.latest_price('+literal(release)+','+literal(cards[0]['dishId'])+')'
        db.psql(price('old-price',35000,(now-timedelta(days=2)).isoformat(),currency='VND',unit='portion'))
        query('nullable source/unit/currency do not become fake values', 'select '+latest+"->'sourceRef'='null'::jsonb and "+latest+"->>'unit'='portion';")
        db.psql(price('unknown-date',999999,None))
        query('unknown timestamp is excluded', 'select ('+latest+"->>'amount')::numeric=35000;")
        db.psql(price('new-null',None,(now-timedelta(days=1)).isoformat()))
        query('latest null amount hides price without fallback', 'select '+latest+' is null;')
        db.psql(price('latest-known',45000,final))
        query('latest known amount preserves nullable metadata', 'select ('+latest+"->>'amount')::numeric=45000 and "+latest+"->'unit'='null'::jsonb;")
        db.psql(price('same-time',46000,final))
        query('tied newest timestamps hide price without fallback', 'select '+latest+' is null;')
        rejects('invalid infinite observation timestamp rejected', price('infinite',1,'infinity'))
        rejects('price cannot refer to unknown dish',price('bad-dish',1,final,dish_id=uid('bad-dish')),'23503')
        rejects('installed observation immutable', 'update gm06_canonical.price_observations set amount=1;')
        query('locked result does not read live price changes', 'select locked_pool->0->\'priceReference\'=\'null\'::jsonb from gm06_canonical.results where result_id='+literal(result_id)+';')

        # Defaults and snapshots are distinct rows, private, without ranking side effects.
        defaults='insert into gm06_canonical.account_preferences values('+literal(users[0])+",'{}','{}',null,'null','null',false,1,"+literal(final)+');'
        db.psql(defaults)
        flavor={k:{'present':None,'intensity':'unknown'} for k in ('spicy','salty','sweet','sour')}
        query('known flavor uses existing GM07 nested projection', 'select gm06_canonical.valid_card('+typed({**locked[0],'flavor':flavor})+');')
        query('contradictory flavor data rejected', 'select not gm06_canonical.valid_card('+typed({**locked[0],'flavor':{**flavor,'spicy':{'present':False,'intensity':'high'}}})+');')
        query('budget maximum/currency/unit matches proposed preferences', "select gm06_canonical.valid_preferences('{}','{}',null,'null',"+typed({'maximum':50000,'currency':'VND','unit':'portion'})+');')
        snapshot='insert into gm06_canonical.room_preferences values('+literal(room_id)+','+literal(users[0])+",'{}','{}',null,'null','null',false,1,1,"+literal(final)+');'
        db.psql(snapshot)
        db.psql('update gm06_canonical.account_preferences set temperature=\'hot\',version=2;')
        query('account change does not rewrite room snapshot', 'select temperature is null and source_account_version=1 from gm06_canonical.room_preferences;')
        rejects('preference version must increment', 'update gm06_canonical.account_preferences set temperature=\'cold\';')
        rejects('outsider cannot have raw room preference snapshot',snapshot.replace(literal(users[0]),literal(users[20])))
        rejects('duplicate taxonomy preference IDs rejected', 'update gm06_canonical.account_preferences set cuisine_ids=ARRAY['+literal(uid('tax'))+','+literal(uid('tax'))+']::uuid[],version=3;')
        db.psql("select set_config('dish_v3.writer','on',false);update public.rooms set state='CANCELLED',version=version+1 where id="+literal(room_id)+';')
        rejects('non-lobby preference changes rejected', 'update gm06_canonical.room_preferences set version=2;')

        # Consent-bound history for 20 people and both terminal outcomes.
        consents={}
        for scope in ['personal','group']:
            for i,u in enumerate(members if scope=='group' else members[:1]):
                cid=uid(scope+'-consent-'+str(i));consents[(scope,u)]=cid
                db.psql('insert into public.consents(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version) values('+literal(cid)+','+literal(u)+','+literal(room_id)+','+literal(scope+'_history')+',true,'+literal((now-timedelta(minutes=1)).isoformat())+',null,'+literal(later)+',1);')
        def history(key,scope='group',rid=result_id,people=members,consent_map=None):
            hid=uid(key);owner=users[0] if scope=='personal' else None
            sql='begin;insert into gm06_canonical.histories(history_id,result_id,scope,owner_user_id,expires_at) values('+literal(hid)+','+literal(rid)+','+literal(scope)+','+typed(owner)+','+literal(expiry)+');'
            for u in people:
                sql+='insert into gm06_canonical.history_audience values('+literal(hid)+','+literal(rid)+','+literal(u)+','+literal((consent_map or consents)[(scope,u)])+');'
            return sql+'set constraints all immediate;commit;'
        db.psql(history('group-history'))
        db.psql(history('personal-history','personal',people=members[:1]))
        hid=uid('group-history')
        visible='gm06_canonical.history_visible('+literal(hid)+','+literal(users[0])+','+literal(final)+'::timestamptz)'
        rejects('history audience cannot be rewritten by later insert', 'insert into gm06_canonical.history_audience values('+literal(hid)+','+literal(result_id)+','+literal(users[0])+','+literal(consents[('group',users[0])])+');')
        query('20-person group history uses canonical snapshot', 'select '+visible+';')
        query('outsider history predicate denied', 'select not gm06_canonical.history_visible('+literal(hid)+','+literal(users[20])+','+literal(final)+'::timestamptz);')
        query('history expiry hides summary', 'select not gm06_canonical.history_visible('+literal(hid)+','+literal(users[0])+','+literal(later)+'::timestamptz);')
        rejects('partial group audience rejected',history('partial','group',uid('none-1'),members[:19]))
        rejects('room-scoped consent cannot authorize another result room',history('wrong-room','group',uid('none-1')))
        # A separate global opt-in authorizes the independent no-consensus results;
        # leave the first history's room-scoped consents for actual cleanup to detach.
        global_consents={}
        for scope in ['personal','group']:
            for i,u in enumerate(members if scope=='group' else members[:1]):
                cid=uid('global-'+scope+str(i));global_consents[(scope,u)]=cid
                db.psql('insert into public.consents(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version) values('+literal(cid)+','+literal(u)+',null,'+literal(scope+'_history')+',true,'+literal((now-timedelta(minutes=1)).isoformat())+',null,'+literal(later)+',1);')
        db.psql(history('none-history','group',uid('none-1'),consent_map=global_consents))
        # A receipt's UNIQUE NULLS NOT DISTINCT edge serializes exact retries.
        from concurrent.futures import ThreadPoolExecutor
        def attempt(key):
            try:
                db.psql(history(key,'personal',uid('none-2'),members[:1],global_consents))
                return 'accepted'
            except RuntimeError as exc:
                if '23505' not in str(exc):
                    raise
                return 'duplicate'
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes=list(pool.map(attempt,['receipt-race-a','receipt-race-b']))
        check('concurrent history retry persists exactly one receipt/entry', sorted(outcomes), ['accepted','duplicate'])
        query('no-consensus history needs neither dish FK nor winner', "select r.status='NO_CONSENSUS' and r.winner_dish_id is null from gm06_canonical.histories h join gm06_canonical.results r using(result_id) where history_id="+literal(uid('none-history'))+';')
        # Run the actual existing cleanup chain, not a manual DELETE simulation.
        db.psql("select set_config('dish_v3.writer','on',false);update public.rooms set created_at=statement_timestamp()-interval '3 days',expires_at=statement_timestamp()-interval '2 days',version=version+1 where id="+literal(room_id)+';select gm17_private.cleanup();')
        query('actual cleanup deletes operational room/session', 'select not exists(select 1 from public.rooms where id='+literal(room_id)+') and not exists(select 1 from dish_v3_private.sessions where room_id='+literal(room_id)+');')
        query('history still readable after actual cleanup', 'select '+visible+';')
        query('room-bound consent detached without losing live authorization', 'select room_id is null and retention_detached from public.consents where id='+literal(consents[('group',users[0])])+';')
        query('canonical result/ref/consent survive cleanup', 'select exists(select 1 from gm17_private.result_refs where id='+literal(result_id)+') and exists(select 1 from gm17_private.room_refs where id='+literal(room_id)+') and (select count(*)=20 from gm06_canonical.history_audience where history_id='+literal(hid)+');')
        query('room preference cleans up, account default retained', 'select not exists(select 1 from gm06_canonical.room_preferences where room_id='+literal(room_id)+') and exists(select 1 from gm06_canonical.account_preferences where user_id='+literal(users[0])+');')
        db.psql('delete from gm06_canonical.histories where history_id='+literal(uid('personal-history'))+';')
        rejects('deleted personal history cannot be recreated by retry',history('retry-personal','personal',people=members[:1]),'23505')
        cid=consents[('group',users[0])]
        db.psql('update public.consents set enabled=false,revoked_at=statement_timestamp(),version=version+1 where id='+literal(cid)+';')
        query('revocation immediately hides history', 'select not '+visible+';')
        db.psql('select gm17_private.cleanup();')
        query('cleanup purges revoked history payload but keeps replay receipt', 'select not exists(select 1 from gm06_canonical.histories where history_id='+literal(hid)+') and exists(select 1 from gm06_canonical.history_receipts where result_id='+literal(result_id)+" and scope='group');")
        rejects('revoked/deleted group history cannot resurrect',history('recreated-group'),'23505')
        check('legacy history/results unchanged',db.psql("select jsonb_build_array((select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.results r),(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from public.histories h));").strip()==legacy)
        v4.after_storage_checks()
        rejects('rollback refuses retained canonical data', DOWN.read_text(encoding='utf-8'))
        # Only this namespace-owned QA DB is purged for empty rollback/reapply.
        db.psql('truncate gm06_canonical.history_audience,gm06_canonical.histories,gm06_canonical.history_receipts,gm06_canonical.result_members,gm06_canonical.results,gm06_canonical.room_preferences,gm06_canonical.account_preferences,gm06_canonical.price_observations;')
        db.psql(DOWN.read_text(encoding='utf-8'))
        check('rollback restores original cleanup function', definitions(db)['gm17_private.cleanup()'],before['gm17_private.cleanup()'])
        query('rollback removes only supplement schema/ledger', "select to_regnamespace('gm06_canonical') is null and exists(select 1 from public.schema_versions where schema_version='0.8.0') and not exists(select 1 from public.schema_versions where schema_version='0.10.0');")
        v4.after_down()
        query('rollback preserves baseline catalogue', 'select exists(select 1 from dish_v3_private.catalogues where id='+literal(release)+' and source_sha='+literal(sha)+');')
        db.psql(MIGRATION.read_text(encoding='utf-8'))
        query('empty reapply succeeds', "select exists(select 1 from public.schema_versions where schema_version='0.10.0');")
        check('application function definitions unchanged',definitions(admin),app_before)
        # Do not serialize all function hashes as expected/actual duplicated maps.
        checks[-1]={'case':'application function definitions unchanged','expected':True,'actual':True,'result':'Pass'}
        report['result']='Pass'
    except Exception as exc:
        report['failure']=str(exc)[:1600]
        raise
    finally:
        if created:
            if db is None:
                # A DB with no marker is deliberately left for inspection, never blindly dropped.
                report['cleanup']='Not run: marker unavailable'
            else:
                marker=db.psql('select namespace from public.gm06_canonical_qa_owner;').strip()
                if marker!=str(namespace) or not re.fullmatch(r'gm08_check_[a-f0-9]{16}',database):
                    raise RuntimeError('QA ownership mismatch; refusing cleanup')
                admin.psql('drop database '+database+';')
                report['cleanup']='namespace-owned QA database removed'
        report['assertions']=len(checks)
        report_path.parent.mkdir(parents=True,exist_ok=True)
        report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,default=Path('/tmp/gm06-canonical-results.json'))
    parser.add_argument('--previous-source-ref', help='Optional exact published SHA for local red regression reproduction')
    args=parser.parse_args()
    try:
        run(args.report,args.previous_source_ref)
    except Exception as exc:
        print('GM06.3 SQL check failed: '+str(exc)[:1600],file=sys.stderr)
        return 1
    print('GM06.3 SQL checks Pass; report: '+str(args.report))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
