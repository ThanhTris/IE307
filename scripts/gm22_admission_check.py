#!/usr/bin/env python3
"""Provision, verify, run, retain-for-Bruno, and clean an owned GM-22 QA project."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tomllib
import uuid

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'.work/gm22-admission'
PRIVATE=QA/'runtime.private.json'
REPORT=QA/'dish-v4-ci-report.json'
MANIFEST=ROOT/'docs/evidence/roadmap-v2/GM-22/admission-v4/MANIFEST.json'
TAP_OUTPUT=ROOT/'docs/evidence/roadmap-v2/GM-22/admission-v4/sql-run.txt'
HTTP_OUTPUT=ROOT/'docs/evidence/roadmap-v2/GM-22/admission-v4/http-results.json'
BRUNO_ENV=ROOT/'supabase/tests/bruno/GM-22/environments/Local.runtime.private.bru'
PROJECT_RE=re.compile(r'^ie307-dish-v4-qa-[0-9]{8}(?:-[0-9]+-[0-9]+)?$')
import dish_v4_ci as runtime

def module(name: str,path: Path):
    spec=importlib.util.spec_from_file_location(name,path)
    value=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

def configure():
    QA.mkdir(parents=True,exist_ok=True)
    os.environ['RUNNER_TEMP']=str(QA)
    runtime.REPORT=REPORT

def safe_text(value: str) -> str:
    value=runtime.redact(value)
    value=re.sub(r'(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b','<uuid>',value)
    return value

def source_hashes():
    paths=[
      'package.json','tasks/backlog/GM-22.md',
      'supabase/migrations/0019_room_lifecycle.sql','supabase/migrations/0022_social.sql',
      'supabase/migrations/0026_dish_session_policy.sql','supabase/migrations/0027_dish_session_v4.sql',
      'supabase/migrations/0033_gm18_dish_catalogue.sql','supabase/migrations/0034_gm19_settings_stability.sql',
      'supabase/migrations/0035_gm20_canonical_writer.sql','supabase/migrations/0036_gm21_canonical_history.sql',
      'supabase/migrations/0037_gm22_invitation_admission.sql','scripts/gm21_canonical_check.py',
      'scripts/gm21_canonical_http.mjs','supabase/tests/http/GM-21-canonical.http',
      'supabase/tests/database/GM-22_social.test.sql','scripts/gm22_http_check.mjs','scripts/gm22_http_stop.mjs','scripts/gm22_admission_check.py',
      'scripts/dish_v4_ci.py','scripts/dish_policy_worker.py','scripts/gm18_http_fixture.py',
      'scripts/gm08_real_bundle_check.py','tests/fixtures/dish-catalogue-v1/qa-v4-synthetic.json',
      'supabase/tests/bruno/GM-22/README.md',
      'supabase/tests/bruno/GM-22/environments/Local.runtime.bru',
    ]
    paths += ['supabase/tests/bruno/GM-22/'+p.name for p in sorted((ROOT/'supabase/tests/bruno/GM-22').glob('*.bru'))]
    return {path:hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in paths}

def save_private(state):
    PRIVATE.parent.mkdir(parents=True,exist_ok=True)
    PRIVATE.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
    if os.name!='nt': PRIVATE.chmod(0o600)

def read_private():
    if PRIVATE.is_symlink(): raise RuntimeError('GM22_QA_CONTROL_SYMLINK')
    state=json.loads(PRIVATE.read_text(encoding='utf-8'))
    if not isinstance(state,dict): raise RuntimeError('GM22_QA_CONTROL_INVALID')
    keys=set(state)
    expected={'GM_V4_QA_PROJECT_ID','GM_V4_QA_WORKDIR','GM_V4_QA_CONTAINER','GM_V4_OWNER_NAMESPACE','GM_V4_REAL_RELEASE_ID','GM_V4_REAL_DISH_COUNT','GM_V4_REAL_SOURCE_SHA256','GM_V4_SYNTHETIC_RELEASE_ID','GM_V4_SYNTHETIC_SHA256'}
    if not expected.issubset(keys) or keys-expected-{'GM22_QA_ANCHOR_ID','GM22_QA_DATASET_VERSION','GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD'}:
        raise RuntimeError('GM22_QA_CONTROL_KEYS')
    project=state['GM_V4_QA_PROJECT_ID'];workdir=Path(state['GM_V4_QA_WORKDIR']).resolve()
    if not PROJECT_RE.fullmatch(project) or state['GM_V4_QA_CONTAINER']!='supabase_db_'+project:
        raise RuntimeError('GM22_QA_OWNERSHIP_MISMATCH')
    allowed=(ROOT/'.work/ci').resolve()
    if not workdir.is_relative_to(allowed) or workdir.name!=project.removeprefix('ie307-'):
        raise RuntimeError('GM22_QA_WORKDIR_MISMATCH')
    try: uuid.UUID(state['GM_V4_OWNER_NAMESPACE'])
    except (KeyError,ValueError,TypeError): raise RuntimeError('GM22_QA_NAMESPACE_MISMATCH') from None
    if 'GM22_QA_ANCHOR_ID' in state:
        try: uuid.UUID(state['GM22_QA_ANCHOR_ID'])
        except (ValueError,TypeError): raise RuntimeError('GM22_QA_ANCHOR_MISMATCH') from None
    return state

def restore_env(state):
    os.environ.update(state)
    os.environ['RUNNER_TEMP']=str(QA)
    runtime.REPORT=REPORT

def verify_owned(state):
    restore_env(state)
    project,workdir=state['GM_V4_QA_PROJECT_ID'],Path(state['GM_V4_QA_WORKDIR']).resolve()
    container=state['GM_V4_QA_CONTAINER']
    inspected=json.loads(runtime.run(['docker','inspect',container],timeout=25))[0]
    labels=inspected.get('Config',{}).get('Labels') or {}
    if labels.get('com.supabase.cli.project')!=project or Path(labels.get('com.supabase.cli.workdir','')).resolve()!=workdir:
        raise RuntimeError('GM22_QA_CONTAINER_LABEL_MISMATCH')
    if inspected.get('State',{}).get('Running') is not True:
        raise RuntimeError('GM22_QA_DATABASE_NOT_RUNNING')
    db=runtime.QAContainer(project,workdir)
    if db.psql('select namespace::text from public.gm40_qa_owner')!=state['GM_V4_OWNER_NAMESPACE']:
        raise RuntimeError('GM22_QA_OWNER_MARKER_MISMATCH')
    return db

def seed_synthetic_legacy_dataset(db,state):
    fixture=module('gm22_gm18_fixture',ROOT/'scripts/gm18_http_fixture.py')
    real=module('gm22_gm08_real',ROOT/'scripts/gm08_real_bundle_check.py')
    namespace=uuid.UUID(state['GM_V4_OWNER_NAMESPACE'])
    fake_users=[str(uuid.uuid5(namespace,'GM22-data-only-user-'+str(i))) for i in range(3)]
    bundle,_,_=fixture.positive(namespace,fake_users)
    db.transaction(real.load_sql(bundle))
    anchor=bundle['entities']['publicAnchors'][0]['anchorId']
    if db.psql(f"select count(*) from public.public_anchors where anchor_id='{anchor}' and fixture_only=false")!='1':
        raise RuntimeError('GM22_SYNTHETIC_ANCHOR_READBACK_FAILED')
    state['GM22_QA_ANCHOR_ID']=anchor
    state['GM22_QA_DATASET_VERSION']=bundle['datasetVersion']
    return {'datasetVersion':bundle['datasetVersion'],'anchorId':'<synthetic-anchor>','bundleSha256':hashlib.sha256(json.dumps(bundle,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
            'syntheticPublishedRowsOnly':True,'rowCounts':{key:len(rows) for key,rows in bundle['entities'].items()}}

def run_tap(db):
    sql=(ROOT/'supabase/tests/database/GM-22_social.test.sql').read_text(encoding='utf-8')
    output=db.psql(sql)
    plans=re.findall(r'(?m)^1\.\.(\d+)\s*$',output)
    passed=re.findall(r'(?m)^ok\s+(\d+)\b',output)
    failures=re.findall(r'(?m)^not ok\s+(\d+)\b',output)
    if plans!=['35'] or len(passed)!=35 or failures or 'Bail out!' in output:
        TAP_OUTPUT.parent.mkdir(parents=True,exist_ok=True)
        TAP_OUTPUT.write_text(safe_text(output)+'\n',encoding='utf-8')
        raise RuntimeError(f'GM22_SQL_TAP_FAILED plan={plans} passed={len(passed)} failures={failures}')
    TAP_OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    TAP_OUTPUT.write_text(safe_text(output)+'\n',encoding='utf-8')
    print('PASS GM22 SQL TAP 35/35',flush=True)
    return {'result':'Pass','plan':35,'assertionsPassed':len(passed),'assertionsFailed':0,'output':str(TAP_OUTPUT.relative_to(ROOT))}

def run_http(state,prepare_bruno=False):
    env=os.environ.copy();env['GM22_QA_ANCHOR_ID']=state['GM22_QA_ANCHOR_ID']
    args=['node','scripts/gm22_http_check.mjs']+(['--prepare-bruno'] if prepare_bruno else [])
    result=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=2400)
    stdout,stderr=safe_text(result.stdout),safe_text(result.stderr)
    if stdout.strip(): print(stdout[-20000:],flush=True)
    if stderr.strip(): print(stderr[-10000:],file=sys.stderr,flush=True)
    if result.returncode: raise RuntimeError('GM22_HTTP_SUITE_FAILED: see redacted runner output')
    if prepare_bruno:return {'result':'Pass','brunoEnvironmentCreated':BRUNO_ENV.is_file(),'credentialsInEvidence':False}
    source=(QA/'http-results.json')
    if not source.is_file(): raise RuntimeError('GM22_HTTP_REPORT_MISSING')
    report=json.loads(source.read_text(encoding='utf-8'))
    if report.get('result')!='Pass' or not report.get('caseCount'):
        raise RuntimeError('GM22_HTTP_REPORT_NOT_PASS')
    HTTP_OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    HTTP_OUTPUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return {'result':'Pass','caseCount':report['caseCount'],'output':str(HTTP_OUTPUT.relative_to(ROOT))}

def manifest_for(state,dataset,sql_result,http_result=None):
    return {'task':'GM-22','supplement':'GM-22.2','fixtureOnly':True,'result':'Pass' if http_result and http_result.get('result')=='Pass' else 'Not run',
      'revision':runtime.git_sha(),'contractVersion':'food-v1/roadmap-v2/GM-22.1','supplementVersion':'food-v1/roadmap-v2/GM-22.2',
      'schemaVersion':'0.14.0','schemaContract':'food-v1/roadmap-v2/GM-22.2','qaProject':state['GM_V4_QA_PROJECT_ID'],
      'qaApiOrigin':'http://127.0.0.1:54361','qaDbPort':54362,'qaOwnerNamespace':state['GM_V4_OWNER_NAMESPACE'],
      'canonicalSessionCreationEnabledOnlyInOwnedQA':True,
      'migrationHashes':runtime.load_report().get('migrationHashes',{}),'sourceHashes':source_hashes(),'syntheticLegacyDataset':dataset,
      'checks':{'sql':sql_result,'http':http_result or {'result':'Not run'},'brunoDesktop':{'result':'Not run'},'android':{'result':'Not run'},'remotePush':{'result':'Not run'}},
      'applicationDatabaseChanged':False,'credentialsInEvidence':False}

def setup_run(bruno=False):
    if PRIVATE.exists(): raise RuntimeError('GM22_QA_RUNTIME_CONFLICT: cleanup the existing owned run first')
    configure()
    try:
        runtime.setup()
        state={k:v for k,v in os.environ.items() if k.startswith('GM_V4_')}
        save_private(state)
        db=verify_owned(state)
        db.psql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton;')
        if db.psql('select allow_new_sessions::text from gm20_canonical_private.configuration where singleton;')!='true':
            raise RuntimeError('GM22_QA_CANONICAL_CREATE_OPT_IN_FAILED')
        runtime.record('qa-canonical-session-create-opt-in','Pass',ownerVerified=True,canonicalCreationEnabled=True)
        dataset=seed_synthetic_legacy_dataset(db,state)
        # Persist owner data needed by the HTTP test without storing JWTs or API keys.
        state['GM22_QA_ANCHOR_ID']=dataset.pop('anchorIdInternal',None) or state.get('GM22_QA_ANCHOR_ID')
        state['GM22_QA_DATASET_VERSION']=state.get('GM22_QA_DATASET_VERSION')
        # The report may show only a placeholder; the actual UUID remains in private control state.
        save_private(state)
        sql_result=run_tap(db)
        http_result=run_http(state,prepare_bruno=bruno)
        manifest=manifest_for(state,dataset,sql_result,None if bruno else http_result)
        (MANIFEST.parent).mkdir(parents=True,exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if bruno:
            manifest['result']='Not run'
            manifest['checks']['sql']=sql_result
            manifest['checks']['brunoDesktop']={'result':'Not run','reason':'Runner prepared; actual Bruno desktop execution is pending'}
            MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            print('GM22_BRUNO_READY endpoint=http://127.0.0.1:54361 cleanup=python scripts/gm22_admission_check.py --cleanup',flush=True)
            return
        manifest['checks']['http']=http_result
        manifest['result']='Pass'
        MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    except Exception:
        # Keep any ownership metadata after setup succeeded so a failed cleanup can be retried.
        if not PRIVATE.exists() and REPORT.exists():
            report=runtime.load_report();state={k:v for k,v in report.items() if k.startswith('GM_V4_')}
            if state: save_private(state)
        if not PRIVATE.exists():
            try: runtime.cleanup()
            except Exception as cleanup_error: print('GM22 partial setup cleanup failed; inspect .work/gm22-admission: '+safe_text(str(cleanup_error)),file=sys.stderr)
        raise
    finally:
        if not bruno and PRIVATE.exists():cleanup_run()

def cleanup_run():
    state=read_private();verify_owned(state)
    restore_env(state)
    runtime.cleanup()
    if MANIFEST.is_file():
        manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
        if manifest.get('task')=='GM-22' and manifest.get('qaProject')==state['GM_V4_QA_PROJECT_ID']:
            manifest.setdefault('checks',{})['cleanup']={'result':'Pass','ownedProjectStopped':state['GM_V4_QA_PROJECT_ID'],'applicationDatabaseChanged':False}
            MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Only discard owner metadata after successful stop and owned resource cleanup.
    PRIVATE.unlink(missing_ok=True)
    if BRUNO_ENV.exists(): BRUNO_ENV.unlink()
    print(json.dumps({'cleanup':'Pass','ownedProjectStopped':state['GM_V4_QA_PROJECT_ID'],'applicationDatabaseChanged':False}),flush=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--bruno',action='store_true',help='create a fresh isolated runtime and private Bruno environment; keep runtime alive')
    group.add_argument('--cleanup',action='store_true',help='stop and remove only the recorded owned QA project; safe to retry')
    group.add_argument('--status',action='store_true',help='verify the recorded owned project without changing it')
    args=parser.parse_args();configure()
    try:
        if args.cleanup:cleanup_run()
        elif args.status:
            state=read_private();verify_owned(state);print(json.dumps({'status':'running','project':state['GM_V4_QA_PROJECT_ID'],'port':54361,'ownerVerified':True}))
        else:setup_run(bruno=args.bruno)
    except Exception as error:
        runtime.record('gm22-admission','Fail',failure=safe_text(str(error)))
        print(safe_text(str(error)),file=sys.stderr)
        raise SystemExit(1)

if __name__=='__main__':main()
