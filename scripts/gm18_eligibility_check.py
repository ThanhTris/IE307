"""GM-18 SQL/TS parity and actual draft rejection in a process-owned test DB."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

food = module('food', 'supabase/seed/import_food_data.py')
real = module('real', 'scripts/gm08_real_bundle_check.py')

def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='strict')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    source_paths=[Path(__file__), ROOT/'scripts/gm18_domain_check.mjs',
        ROOT/'mobile/src/domain/eligibility/index.ts',ROOT/'mobile/tests/helpers/eligibilityFixtures.mjs',
        ROOT/'mobile/tests/eligibility.test.mjs',ROOT/'supabase/tests/food_eligibility.sql',
        ROOT/'.github/workflows/gm18-eligibility.yml',ROOT/'supabase/seed/import_food_data.py',
        ROOT/'scripts/gm08_real_bundle_check.py',ROOT/'tests/fixtures/food-data-v1/cases.json',
        ROOT/'tests/fixtures/food-data-v1/datasets.json',*sorted((ROOT/'supabase/migrations').glob('*.sql'))]
    protected_paths=[*source_paths,ROOT/'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json',
        ROOT/'supabase/seed/verified/manifest.json']
    if args.report.resolve() in [p.resolve() for p in protected_paths]:
        raise ValueError('Report must not overwrite source, fixture, input or verified manifest')
    source_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths}
    cases = json.loads(subprocess.check_output(['node', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        'scripts/gm18_domain_check.mjs'], cwd=ROOT, text=True, encoding='utf-8'))
    expected = food.load_json(ROOT / 'tests/fixtures/food-data-v1/cases.json')
    admin = food.LocalDB()
    # Reuse the importer allowlisted process-created DB namespace; do not widen its guard.
    database = 'gm08_check_' + uuid.uuid4().hex[:16]
    created = False
    checks = []
    results = []
    def check(name, actual, wanted=True):
        if actual != wanted:
            # Keep mismatch output short; no actual menu/provider payload in logs.
            def mismatch(a,b,path='root'):
                if type(a)!=type(b): return path+' (type)'
                if isinstance(a,dict):
                    if a.keys()!=b.keys(): return path+' keys '+str(sorted(a.keys()-b.keys()))+' / '+str(sorted(b.keys()-a.keys()))
                    for k in a:
                        if a[k]!=b[k]: return mismatch(a[k],b[k],path+'.'+k)
                if isinstance(a,list):
                    if len(a)!=len(b): return path+' (length)'
                    for i,(x,y) in enumerate(zip(a,b)):
                        if x!=y: return mismatch(x,y,path+f'[{i}]')
                return path+' (value)'
            raise AssertionError(name+': '+mismatch(actual,wanted))
        checks.append(dict(case=name, actual=actual, expected=wanted, result='Pass'))
    def query(db, expression):
        command=['docker','exec','-i',food.CONTAINER,'psql','-X','-q','-U','postgres',
            '-d',db.database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-At']
        result=subprocess.run(command,input='select to_jsonb('+expression+');',text=True,
            encoding='utf-8',capture_output=True,timeout=180)
        if result.returncode:
            state=re.search(r'ERROR:\s+([A-Z0-9]{5}):',result.stderr)
            identifier=re.search(r'column reference "([a-z_]+)" is ambiguous',result.stderr)
            raise RuntimeError('DB_ERROR '+(state.group(1) if state else 'PROCESS')
                + (' ambiguous '+identifier.group(1) if identifier else ' query rejected'))
        return json.loads(result.stdout.strip())
    def literal(value):
        return food.literal(json.dumps(value, ensure_ascii=False)) + '::jsonb'
    def evaluate(db, c):
        return query(db, f"gm18_private.evaluate({literal(c['bundle'])},{literal(c['input'])},"
            f"{food.literal(c['evaluatedAt'])}::timestamptz,{literal(c['policy'])})")
    report = dict(result='Fail', fixtureOnly=True, publicationPerformed=False, checkedAt=food.now(),
        testedBaseCommit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        workingTreePatchIncluded=True, cases=checks, fixtureResults=results,
        integration=dict(appRPC='Not run: GM-17 auth/RLS/rate-limit wrapper not yet delivered',
            verifiedCatalogue='Not run: GM-08 verified counts remain zero', androidAPI='Not run'))
    try:
        ddl = admin.run(['docker','exec',food.CONTAINER,'pg_dump','-U','postgres','-d','postgres',
            '--schema-only','--no-owner','--no-privileges','-t','auth.users'])
        ddl = '\n'.join(line for line in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm06_',line))
        admin.psql('create database ' + database + ' template template0;')
        created = True
        db = food.LocalDB(database)
        db.psql('create schema auth;\n' + ddl)
        for path in sorted((ROOT/'supabase/migrations').glob('*.sql')):
            if path.name == '0018_food_eligibility.sql':
                db.psql("create table public.gm18_sentinel(id int primary key,note text);insert into public.gm18_sentinel values(1,'keep');")
            db.psql(path.read_text(encoding='utf-8'))
        check('upgrade preserves unrelated table', db.psql('select note from public.gm18_sentinel;').strip(), 'keep')
        check('private schema denies all app roles', query(db,
            "not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(role) where has_schema_privilege(role,'gm18_private','USAGE'))"))
        check('all kernel functions deny all app roles', query(db,
            "not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join (values('anon'),('authenticated'),('service_role')) r(role) where n.nspname='gm18_private' and has_function_privilege(role,p.oid,'EXECUTE'))"))
        check('no security definer functions', query(db,
            "not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='gm18_private' and p.prosecdef)"))
        check('all original 42 fixture cases included', [c['id'] for c in cases[:42]], [c['id'] for c in expected['cases']])
        db.psql((ROOT/'supabase/tests/food_eligibility.sql').read_text(encoding='utf-8'))
        for c in cases:
            print('SQL case:', c['id'], flush=True)
            actual = evaluate(db, c)
            check('complete TS/SQL parity: ' + c['id'], actual, c['actual'])
            check('independent eligible offering set: ' + c['id'], actual['eligibleOfferingIds'], sorted(c['expectedEligibleOfferingIds']))
            results.append(dict(id=c['id'], evaluatedAt=c['evaluatedAt'], actual=actual, result='Pass'))
        # Winner filtering happens before the top-eight cap, including rank-nine winners.
        c = cases[0]
        ninth = next(row for row in c['bundle']['entities']['venueDishes'] if row['dishId'] not in [p['dishId'] for p in c['actual']['pool']])
        winner = query(db, f"gm18_private.refetch_winner({literal(c['bundle'])},{literal(c['input'])},"
            f"{food.literal(c['evaluatedAt'])}::timestamptz,{literal(c['policy'])},'{ninth['dishId']}'::uuid,null)")
        check('winner refetch finds rank-nine dish without substituting another', [row['dishId'] for row in winner], [ninth['dishId']])
        # Load the fixture once into the physical typed schema, still fixtureOnly.
        baseline = real.readback(db)
        db.transaction(real.load_sql(c['bundle']))
        snapshot = query(db, "gm18_private.snapshot('1.0.0')")
        physical = query(db, f"gm18_private.preview({literal(c['input'])},'1.0.0',{food.literal(c['evaluatedAt'])}::timestamptz,{literal(c['policy'])})")
        check('typed DB snapshot/preview matches complete TS fixture output', physical, c['actual'])
        check('physical snapshot retains fixture markers', snapshot['fixtureOnly'])
        try:
            query(db, f"gm18_private.evaluate({literal(snapshot)},{literal(c['input'])},{food.literal(c['evaluatedAt'])}::timestamptz,'{{\"maxRadiusM\":10000,\"maxFutureSeconds\":604800,\"fixtureMode\":false}}')")
        except RuntimeError as error:
            check('production mode rejects physical fixture snapshot', '22023' in str(error))
        else:
            raise AssertionError('Fixture snapshot accepted by production mode')
        db.transaction(real.remove_loaded_sql(c['bundle']))
        check('fixture cleanup returns empty baseline', real.readback(db), baseline)
        # Actual GM-08 input is not upgraded or promoted: query its actual draft rows.
        path = ROOT/'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json'
        bundle, bundle_hash, preflight = real.candidate(path)
        db.transaction(real.load_sql(bundle))
        readback = real.readback(db)
        check('actual draft counts match input', {table:len(rows) for table,rows in readback.items()},
            {table:len(rows) for table,rows in food.records(bundle).items()})
        policy = dict(maxRadiusM=10000,maxFutureSeconds=604800,fixtureMode=False)
        input_value = dict(context=dict(anchorId='00000000-0000-0000-0000-000000000000',radiusM=1000,
            desiredAt='2026-10-12T05:00:00Z',mealSlot='lunch',serviceMode='dine_in'),poolSeed='gm18-actual-draft-check')
        actual = query(db, f"gm18_private.preview({literal(input_value)},'0.4.1','2026-10-12T05:00:00Z'::timestamptz,{literal(policy)})")
        check('actual draft has zero eligible pool choices', actual['pool'], [])
        check('all actual draft offerings excluded without invented coverage', len(actual['excludedOfferings']), 190)
        check('actual draft empty reason is out of coverage', actual['reasonCodes'], ['OUT_OF_COVERAGE'])
        discovery = query(db, "gm18_private.discovery(gm18_private.snapshot('0.4.1'),'2026-10-12T05:00:00Z')")
        check('actual draft discovery returns no invented anchor or coverage', [discovery['anchors'],discovery['coverageAreas']], [[],[]])
        check('eligibility queries preserve every actual row/version', real.readback(db), readback)
        db.transaction(real.remove_loaded_sql(bundle))
        check('actual draft test cleanup returns empty baseline', real.readback(db), baseline)
        check('actual input bytes are unchanged', food.digest(path.read_bytes()), bundle_hash)
        report.update(caseCount=len(checks), fixtureCaseCount=len(cases),
            postgresVersion=db.psql("select current_setting('server_version');").strip(),
            actualDraft=dict(bundleSha256=bundle_hash,rowCounts=preflight['rowCounts'],query=actual,discovery=discovery),
            artifactHashes=source_hashes)
        check('tested source bytes unchanged during SQL run',
            {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths},source_hashes)
        report.update(result='Pass',caseCount=len(checks))
    finally:
        if created:
            admin.psql('drop database ' + database + ';')
        report['cleanup'] = 'process-created database dropped' if created else 'no database created'
        food.write_json(args.report, report)
    print(json.dumps({k:report[k] for k in ['result','caseCount','fixtureCaseCount','cleanup','publicationPerformed']}))

if __name__ == '__main__':
    main()
