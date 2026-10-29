#!/usr/bin/env python3
"""GM20.4: owned disposable QA, independent parity and authenticated HTTP.

No application DB reset/migrate. --keep/--against are owned QA only; --cleanup
stops the recorded worker/project and label-verified backup volume, not app data.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import uuid
import re
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.work/gm20-canonical'
import dish_v4_ci as runtime
from dish_policy_worker import verify as verify_worker
PRIVATE = OUTPUT / 'runtime.private.json'


def configure():
    os.environ.setdefault('RUNNER_TEMP',str(OUTPUT))
    os.environ.setdefault('GM_V4_PYTHON',sys.executable)
    runtime.REPORT=OUTPUT/'dish-v4-ci-report.json'


def literal(value):
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def parity(db):
    fixture = json.loads((ROOT / 'tests/fixtures/decision-v4/cases.json').read_text(encoding='utf8'))
    assert fixture['fixtureOnly'] is True and len(fixture['cases']) == 102
    sql = """create function pg_temp.gm20_evaluate(input jsonb) returns jsonb language plpgsql as $$
    begin return gm20_canonical_private.evaluate_v4(input);
    exception when sqlstate '22023' then return '{"error":"INVALID_INPUT"}'::jsonb; end $$;
    select jsonb_agg(jsonb_build_object('id',c->>'id','actual',pg_temp.gm20_evaluate(c->'input')) order by ord)
     from jsonb_array_elements(""" + literal(fixture['cases']) + ') with ordinality t(c,ord);'
    actual = json.loads(db.psql(sql))
    rows = []
    for case, result in zip(fixture['cases'], actual, strict=True):
        assert case['id'] == result['id']
        if result['actual'] != case['expected']:
            raise RuntimeError('Independent SQL parity mismatch: ' + case['id'])
        rows.append({'id': case['id'], 'input': case['input'], 'expected': case['expected'],
                     'actual': result['actual'], 'result': 'Pass'})
    report = {'fixtureOnly': True, 'result': 'Pass', 'caseCount': len(rows), 'cases': rows,
              'fixtureSha256': hashlib.sha256((ROOT / 'tests/fixtures/decision-v4/cases.json').read_bytes()).hexdigest(),
              'migrationSha256': hashlib.sha256((ROOT / 'supabase/migrations/0035_gm20_canonical_writer.sql').read_bytes()).hexdigest()}
    (OUTPUT / 'sql-parity.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print('PASS102 independent SQL/TypeScript expected vectors', flush=True)


def validate_state(state):
    if not isinstance(state,dict) or any(not isinstance(k,str) or not k.startswith('GM_V4_') or not isinstance(v,str) for k,v in state.items()):
        raise RuntimeError('GM20_QA_CONTROL_KEYS')
    project=state.get('GM_V4_QA_PROJECT_ID','');workdir=Path(state.get('GM_V4_QA_WORKDIR','')).resolve()
    if not runtime.PROJECT_RE.fullmatch(project) or not workdir.is_relative_to(ROOT / '.work/ci') or workdir.name!=project.removeprefix('ie307-'):
        raise RuntimeError('GM20_QA_OWNERSHIP_MISMATCH')
    try:uuid.UUID(state['GM_V4_OWNER_NAMESPACE'])
    except (KeyError,ValueError,TypeError):raise RuntimeError('GM20_QA_NAMESPACE_MISMATCH') from None
    return project,workdir


def restore():
    if PRIVATE.is_symlink():raise RuntimeError('GM20_QA_CONTROL_SYMLINK')
    state=json.loads(PRIVATE.read_text(encoding='utf8'))
    project,workdir=validate_state(state)
    os.environ.update(state)
    db = runtime.QAContainer(project, workdir)
    inspected = json.loads(runtime.run(['docker','inspect',db.container], timeout=20))[0]
    labels = inspected.get('Config',{}).get('Labels',{})
    if labels.get('com.supabase.cli.project') != project or Path(labels.get('com.supabase.cli.workdir','')).resolve() != workdir:
        raise RuntimeError('GM20_QA_LABEL_MISMATCH')
    if db.psql('select namespace::text from public.gm40_qa_owner') != state['GM_V4_OWNER_NAMESPACE']:
        raise RuntimeError('GM20_QA_NAMESPACE_MISMATCH')
    return db


def cleanup():
    project = os.environ.get('GM_V4_QA_PROJECT_ID') or runtime.load_report().get('projectId')
    runtime.cleanup()
    if project and runtime.PROJECT_RE.fullmatch(project):
        name = 'supabase_db_' + project
        result = subprocess.run(['docker','volume','inspect',name], capture_output=True, text=True)
        if result.returncode == 0:
            volume = json.loads(result.stdout)[0]
            if volume.get('Labels',{}).get('com.supabase.cli.project') != project:
                raise RuntimeError('GM20_QA_VOLUME_LABEL_MISMATCH')
            attached = runtime.run(['docker','ps','-a','--filter','volume='+name,'--format','{{.ID}}'], timeout=20).strip()
            if attached: raise RuntimeError('GM20_QA_VOLUME_IN_USE')
            runtime.run(['docker','volume','rm',name], timeout=30)
    bruno=ROOT/'supabase/tests/bruno/GM-20-canonical/environments/Local.runtime.private.bru'
    if bruno.exists():
        if bruno.is_symlink() or not re.search(r'(?m)^\s*runId:\s*'+re.escape(str(project))+r'\s*$',bruno.read_text(encoding='utf8')):
            raise RuntimeError('GM20_BRUNO_OWNER_MISMATCH')
        bruno.unlink()
    PRIVATE.unlink(missing_ok=True)
    runtime.record('gm20-cleanup','Pass',ownedBackupsRemoved=True,applicationDatabaseChanged=False)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--keep',action='store_true');p.add_argument('--against',action='store_true');p.add_argument('--cleanup',action='store_true');p.add_argument('--bruno',action='store_true')
    args=p.parse_args();configure();args.keep=args.keep or args.bruno
    if args.bruno:os.environ['GM20_CANONICAL_BRUNO']='1'
    OUTPUT.mkdir(parents=True,exist_ok=True)
    if args.cleanup:
        if PRIVATE.exists(): restore()
        cleanup();return
    # A failed run must not upload a previous successful HTTP/parity artifact.
    for name in ('http-results.json','sql-parity.json','dish-v4-api-results.json'):
        (OUTPUT/name).unlink(missing_ok=True)
    success=False
    try:
        if args.against:
            db=restore()
            prior=runtime.load_report()
            prior['stages']=[stage for stage in prior.get('stages',[]) if stage['stage'] in ('ownership-and-isolated-config','qa-bindings','migrations-and-catalogue-fixtures','worker-heartbeat','setup')]
            prior['result']='Not run';runtime.save_report(prior)
            verify_worker(db)
        else:
            runtime.setup()
            state={k:v for k,v in os.environ.items() if k.startswith('GM_V4_')}
            PRIVATE.write_text(json.dumps(state),encoding='utf8');PRIVATE.chmod(0o600)
            db=restore()
        parity(db)
        runtime.run_api()
        result=subprocess.run(['node','scripts/gm20_canonical_http.mjs'],cwd=ROOT,env=os.environ.copy(),capture_output=True,text=True,encoding='utf8',timeout=2400)
        if result.stdout:print(runtime.redact(result.stdout)[-12000:],flush=True)
        if result.stderr:print(runtime.redact(result.stderr)[-4000:],file=sys.stderr,flush=True)
        if result.returncode:raise RuntimeError('GM20_CANONICAL_HTTP_FAILED')
        runtime.record('gm20-canonical-http','Pass',report=str(OUTPUT/'http-results.json'),applicationDatabaseChanged=False)
        success=True
    except Exception as error:
        runtime.record('gm20-canonical-run','Fail',failure=runtime.redact(str(error)))
        raise
    finally:
        if not args.keep: cleanup()
        else:print('Owned QA retained; --against reruns, --cleanup stops only this project',flush=True)
    if success:print('PASS GM20 canonical candidate; not integration/production approval',flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        print(runtime.redact(str(error)),file=sys.stderr);raise SystemExit(1)
