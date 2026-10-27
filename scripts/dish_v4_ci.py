#!/usr/bin/env python3
"""Provision, verify, exercise, and clean one disposable GM-07.B CI project."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import tomllib
import uuid

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'node_modules/supabase/dist/supabase.js'
REPORT = Path(os.environ.get('RUNNER_TEMP', ROOT / '.work/ci')) / 'dish-v4-ci-report.json'
EXCLUDED = 'realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'
PROJECT_RE = re.compile(r'^ie307-dish-v4-qa-[0-9]{8}(?:-[0-9]+-[0-9]+)?$')


def redact(value):
    value = str(value)
    value = re.sub(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', '[REDACTED JWT]', value)
    value = re.sub(r'\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b', '[REDACTED KEY]', value)
    value = re.sub(r'(postgres(?:ql)?://[^:\s]+:)[^@\s]+@', r'\1[REDACTED]@', value, flags=re.I)
    value = re.sub(r'((?:anon[ _-]?key|service[ _-]?role[ _-]?key|secret[ _-]?key|publishable[ _-]?key|password|access[ _-]?token)["\']?\s*[:=]\s*)[^\r\n]+', r'\1[REDACTED]', value, flags=re.I)
    return value


def load_report():
    if REPORT.is_file():
        try:
            return json.loads(REPORT.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {'sha': git_sha(), 'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B',
            'schemaVersion': None, 'migrationHashes': {}, 'stages': [], 'result': 'Not run'}


def save_report(report):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def record(stage, result, **details):
    report = load_report()
    safe_details = json.loads(json.dumps(details, default=str))
    report['stages'].append({'stage': stage, 'result': result, **safe_details})
    if result == 'Fail':
        report['result'] = 'Fail'
    elif report['result'] != 'Fail':
        report['result'] = 'Pass'
    save_report(report)


def git_sha():
    result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return result.stdout.strip() if result.returncode == 0 else 'unavailable'


def run(args, *, timeout=900, quiet=True, cwd=ROOT, input_text=None):
    result = subprocess.run(args, cwd=cwd, input=input_text, capture_output=True, text=True,
                            encoding='utf-8', errors='replace', timeout=timeout)
    if result.returncode:
        detail = redact('stdout:\n' + result.stdout + '\nstderr:\n' + result.stderr)[-12000:]
        raise RuntimeError(f"command exited {result.returncode}: {Path(args[0]).name}\n{detail}")
    if not quiet and result.stdout.strip():
        print(redact(result.stdout.strip()))
    return result.stdout


def cli(*args, timeout=900):
    return run(['node', str(CLI), *args], timeout=timeout)


def get_state():
    data = json.loads(cli('status', '--output', 'json', '--workdir', os.environ['GM_V4_QA_WORKDIR']))
    api_url = data.get('API_URL') or data.get('api', {}).get('url')
    key = data.get('ANON_KEY') or data.get('PUBLISHABLE_KEY')
    if not api_url or not key:
        raise RuntimeError('Supabase status is missing the local API URL or publishable key')
    url = __import__('urllib.parse', fromlist=['urlparse']).urlparse(api_url)
    if url.scheme != 'http' or url.hostname not in ('127.0.0.1', 'localhost') or url.port != 54361:
        raise RuntimeError('QA API did not bind to loopback port 54361')
    return api_url.rstrip('/'), key


class QAContainer:
    def __init__(self, project, workdir):
        self.project_id = project
        self.container = 'supabase_db_' + project
        self.database = 'postgres'
        self.qa_project_id = project
        self.is_dish_v4_qa = True
        self.workdir = Path(workdir).resolve()

    def psql(self, sql):
        return run(['docker', 'exec', '-i', self.container, 'psql', '-X', '-q', '-U', 'postgres',
                    '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-At'],
                   timeout=60, input_text=sql).strip()

    def transaction(self, sql):
        return self.psql(sql)


def importer_module():
    sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
    sys.path.insert(0, str(ROOT / 'scripts'))
    path = ROOT / 'supabase/seed/import_dish_catalogue.py'
    spec = importlib.util.spec_from_file_location('ci_gm40_importer', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def assert_ports_free():
    for port in (54360, 54361, 54362):
        with socket.socket() as sock:
            try:
                sock.bind(('127.0.0.1', port))
            except OSError as error:
                raise RuntimeError(f'QA port {port} is already occupied; refusing to take over another service') from error


def approved_host_binding(binding, port, *, hosted_ci=False):
    allowed_hosts = {'127.0.0.1', '::1'}
    # Supabase CLI publishes Compose ports on wildcard interfaces by default.
    # Permit that only on an ephemeral GitHub-hosted runner, with no production
    # secrets and exact per-run container ownership; local execution stays loopback-only.
    if hosted_ci:
        allowed_hosts.update({'0.0.0.0', '::'})
    return str(binding.get('HostPort')) == str(port) and binding.get('HostIp') in allowed_hosts


def setup():
    assert_ports_free()
    docker = run(['docker', 'info', '--format', '{{.ServerVersion}}'], timeout=30).strip()
    run([sys.executable, '-c', 'import jsonschema; assert jsonschema.__version__ == "4.26.0"'], timeout=30)
    day = time.strftime('%Y%m%d', time.gmtime())
    run_id = os.environ.get('GITHUB_RUN_ID') or str(time.time_ns())[-12:]
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT', '1')
    if not run_id.isdigit() or not attempt.isdigit():
        raise RuntimeError('CI run identity must contain digits only')
    project = f'ie307-dish-v4-qa-{day}-{run_id}-{attempt}'
    if not PROJECT_RE.fullmatch(project):
        raise RuntimeError('Generated QA project id is invalid')
    workdir = ROOT / '.work/ci/review-results' / project.removeprefix('ie307-')
    if workdir.exists():
        raise RuntimeError('Unique QA workdir already exists; refusing reuse')
    workdir.mkdir(parents=True)
    os.environ.update({'GM_V4_QA_PROJECT_ID': project, 'GM_V4_QA_WORKDIR': str(workdir),
                       'GM_V4_QA_CONTAINER': 'supabase_db_' + project})
    # A new setup is a new evidence run. Never append stages from a previous
    # local/CI attempt, otherwise a failed setup can look like a later pass.
    report = {'sha': git_sha(), 'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B',
              'schemaVersion': None, 'migrationHashes': {}, 'stages': [], 'result': 'Not run',
              'projectId': project, 'workdir': str(workdir), 'apiPort': 54361,
              'dbPort': 54362, 'dockerServer': docker}
    save_report(report)
    export = os.environ.get('GITHUB_ENV')
    if export:
        with open(export, 'a', encoding='utf-8') as stream:
            for name in ('GM_V4_QA_PROJECT_ID', 'GM_V4_QA_WORKDIR', 'GM_V4_QA_CONTAINER'):
                stream.write(f'{name}={os.environ[name]}\n')
    supabase_dir = workdir / 'supabase'
    supabase_dir.mkdir()
    config = (ROOT / 'supabase/config.toml').read_text(encoding='utf-8')
    config, project_count = re.subn(r'^project_id\s*=\s*"gi-cung-duoc-local"\s*$', f'project_id = "{project}"', config, count=1, flags=re.M)
    config, api_count = re.subn(r'(?m)(\[api\][\s\S]*?^port\s*=\s*)54321\s*$', r'\g<1>54361', config, count=1)
    config, db_count = re.subn(r'(?m)(\[db\][\s\S]*?^port\s*=\s*)54322\s*$', r'\g<1>54362', config, count=1)
    config, shadow_count = re.subn(r'(?m)^shadow_port\s*=\s*54320\s*$', 'shadow_port = 54360', config, count=1)
    if (project_count, api_count, db_count, shadow_count) != (1, 1, 1, 1):
        raise RuntimeError('Could not derive the QA config from the checked-in Supabase baseline')
    (supabase_dir / 'config.toml').write_text(config, encoding='utf-8')
    shutil.copytree(ROOT / 'supabase/migrations', supabase_dir / 'migrations')
    output = os.environ.get('GITHUB_OUTPUT')
    if output:
        with open(output, 'a', encoding='utf-8') as stream:
            stream.write(f'project-id={project}\n')

    report = load_report()
    report.update({'sha': git_sha(), 'projectId': project, 'workdir': str(workdir), 'apiPort': 54361,
                   'dbPort': 54362, 'dockerServer': docker, 'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B',
                   'migrationHashes': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                       for p in sorted((ROOT / 'supabase/migrations').glob('*.sql'))},
                   'schemaSha256': hashlib.sha256((ROOT / 'docs/architecture/schemas/dish-session-v4b.schema.json').read_bytes()).hexdigest()})
    save_report(report)
    record('ownership-and-isolated-config', 'Pass', projectId=project, ports=[54361, 54362], workdirUnder='.work/ci')

    # Supabase status may contain keys. Keep it in process memory and never print or persist it.
    cli('start', '--exclude', EXCLUDED, '--workdir', str(workdir), timeout=900)
    cli('migration', 'up', '--local', '--workdir', str(workdir), timeout=900)
    api_url, _key = get_state()
    db = QAContainer(project, workdir)
    inspect = json.loads(run(['docker', 'inspect', db.container], timeout=30))[0]
    labels = inspect.get('Config', {}).get('Labels') or {}
    if (labels.get('com.supabase.cli.project') != project
            or Path(labels.get('com.supabase.cli.workdir', '')).resolve() != workdir.resolve()
            or inspect.get('State', {}).get('Running') is not True):
        raise RuntimeError('Started database container is missing exact QA ownership labels')
    db_bindings = inspect.get('NetworkSettings', {}).get('Ports', {}).get('5432/tcp') or []
    hosted_ci = os.environ.get('GITHUB_ACTIONS') == 'true'
    local_wildcard = os.environ.get('GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD') == '1'
    approved_wildcard = hosted_ci or local_wildcard
    if not any(approved_host_binding(binding, 54362, hosted_ci=approved_wildcard) for binding in db_bindings):
        raise RuntimeError('QA database port is not bound to an approved host interface on port 54362')
    api_inspect = json.loads(run(['docker', 'inspect', 'supabase_kong_' + project], timeout=30))[0]
    api_labels = api_inspect.get('Config', {}).get('Labels') or {}
    api_bindings = [binding for rows in (api_inspect.get('NetworkSettings', {}).get('Ports') or {}).values()
                    for binding in (rows or [])]
    if (api_labels.get('com.supabase.cli.project') != project
            or not any(approved_host_binding(binding, 54361, hosted_ci=approved_wildcard) for binding in api_bindings)):
        raise RuntimeError('QA Auth/REST API is not bound to an approved host interface on port 54361')
    record('qa-bindings', 'Pass', apiPort=54361, dbPort=54362,
           bindingPolicy='hosted-ci-wildcard' if hosted_ci else 'explicit-local-wildcard' if local_wildcard else 'loopback-only')
    ledger = db.psql("select schema_version||'/'||contract_id from public.schema_versions where schema_version in ('0.9.0','0.9.1','0.9.2') order by schema_version;")
    if any(version+'/dish-session-v4/roadmap-v2/GM-07.B' not in ledger for version in ('0.9.0','0.9.1','0.9.2')):
        raise RuntimeError('Migration ledger is missing the v4 policy or consent schema')
    db.psql('create table public.gm40_qa_owner(namespace uuid primary key);revoke all on public.gm40_qa_owner from public,anon,authenticated,service_role;')
    namespace = str(uuid.uuid4())
    db.psql(f"insert into public.gm40_qa_owner(namespace) values('{namespace}');")
    importer = importer_module()
    bundle_path, manifest_path = ROOT / importer.contract.BUNDLE_PATH, ROOT / importer.contract.MANIFEST_PATH
    real_bundle, real_sha = importer.candidate(bundle_path, manifest_path)
    real = importer.install(db, namespace, bundle_path, manifest_path, activate=True)
    real_id = real['id']

    # This second release is deliberately test-only and does not exercise the GM-40 importer.
    fixture_path = ROOT / 'tests/fixtures/dish-catalogue-v1/qa-v4-synthetic.json'
    fixture_raw = fixture_path.read_bytes()
    synthetic = json.loads(fixture_raw)
    cards = synthetic.get('cards')
    if (synthetic.get('fixtureOnly') is not True or len(cards or []) != 20
            or len({card.get('dishId') for card in cards}) != 20):
        raise RuntimeError('Committed synthetic fixture must contain exactly 20 unique fixture-only cards')
    synthetic_id = synthetic['profile'] + ':' + synthetic['datasetVersion']
    synthetic_sha = hashlib.sha256(fixture_raw).hexdigest()
    food = importer.food
    cards_json = json.dumps(cards, ensure_ascii=False, separators=(',', ':'))
    db.transaction('begin;update dish_v3_private.catalogues set active=false;\n'
                   + 'insert into dish_v3_private.catalogues(id,source_sha,cards,test_only,active) values('
                   + food.literal(synthetic_id) + ',' + food.literal(synthetic_sha) + ','
                   + food.literal(cards_json) + '::jsonb,true,true);commit;')
    real_slots = {slot: sum(slot in item.get('mealSlots', []) for item in importer.cards(real_bundle))
                  for slot in ('breakfast', 'lunch', 'dinner', 'snack')}
    report = load_report()
    report['schemaVersion'] = '0.9.2'
    report['catalogue'] = {'realRelease': real_id, 'realSourceSha256': real_sha,
                           'realDishCount': len(real['cards']), 'mealCounts': real_slots,
                           'syntheticRelease': synthetic_id, 'syntheticSha256': synthetic_sha,
                           'syntheticDishCount': len(cards), 'fixtureOnly': True}
    save_report(report)
    for name, value in {'GM_V4_REAL_RELEASE_ID': real_id,
                        'GM_V4_REAL_DISH_COUNT': str(len(real['cards'])),
                        'GM_V4_REAL_SOURCE_SHA256': real_sha,
                        'GM_V4_SYNTHETIC_RELEASE_ID': synthetic_id,
                        'GM_V4_SYNTHETIC_SHA256': synthetic_sha,
                        'GM_V4_OWNER_NAMESPACE': namespace}.items():
        os.environ[name] = value
    if export:
        with open(export, 'a', encoding='utf-8') as stream:
            for name in ('GM_V4_REAL_RELEASE_ID', 'GM_V4_REAL_DISH_COUNT', 'GM_V4_REAL_SOURCE_SHA256',
                         'GM_V4_SYNTHETIC_RELEASE_ID', 'GM_V4_SYNTHETIC_SHA256', 'GM_V4_OWNER_NAMESPACE'):
                stream.write(f'{name}={os.environ[name]}\n')
    record('migrations-and-catalogue-fixtures', 'Pass', schemaVersion='0.9.2',
           realRelease=real_id, realDishCount=len(real['cards']), syntheticRelease=synthetic_id,
           syntheticDishCount=len(cards), syntheticFixtureOnly=True, apiOrigin=api_url)

    pid_path = Path(os.environ.get('RUNNER_TEMP', ROOT / '.work/ci')) / 'dish-v4-worker.pid'
    stdout_path = pid_path.with_suffix('.stdout.log')
    stderr_path = pid_path.with_suffix('.stderr.log')
    worker = subprocess.Popen([sys.executable, str(ROOT / 'scripts/dish_policy_worker.py'),
                               '--qa-db-container', db.container, '--qa-project-id', project,
                               '--qa-workdir', str(workdir)], cwd=ROOT, stdout=stdout_path.open('w', encoding='utf-8'),
                              stderr=stderr_path.open('w', encoding='utf-8'), start_new_session=(os.name != 'nt'))
    pid_path.write_text(str(worker.pid), encoding='ascii')
    report = load_report()
    report.update({'workerPidFile': str(pid_path), 'workerStdout': str(stdout_path), 'workerStderr': str(stderr_path)})
    save_report(report)
    for _ in range(30):
        if worker.poll() is not None:
            raise RuntimeError('QA worker exited during startup; inspect sanitized worker logs artifact')
        if db.psql("select exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds');") == 't':
            record('worker-heartbeat', 'Pass', ready=True)
            record('setup', 'Pass', apiOrigin=api_url, databaseLedger=ledger.splitlines())
            return
        time.sleep(1)
    raise RuntimeError('QA worker heartbeat did not become ready')


def run_api():
    project, workdir = os.environ.get('GM_V4_QA_PROJECT_ID'), os.environ.get('GM_V4_QA_WORKDIR')
    if not project or not workdir:
        record('api-suite', 'Fail', failure='QA setup did not export project/workdir; see earlier stage')
        raise RuntimeError('QA project is unavailable; refusing to run against the default application database')
    api_report = Path(os.environ.get('GM_V4_REPORT_PATH', Path(os.environ.get('RUNNER_TEMP', '.')) / 'dish-v4-api-results.json'))
    env = os.environ.copy()
    env['GM_V4_REPORT_PATH'] = str(api_report)
    result = subprocess.run(['node', 'scripts/gm_v4_http_check.mjs'], cwd=ROOT, env=env,
                            capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=2400)
    stdout, stderr = redact(result.stdout), redact(result.stderr)
    if stdout.strip():
        print(stdout[-16000:])
    if stderr.strip():
        print(stderr[-8000:], file=sys.stderr)
    case_count = None
    if api_report.is_file():
        try:
            case_count = json.loads(api_report.read_text(encoding='utf-8')).get('caseCount')
        except Exception:
            case_count = None
    record('api-suite', 'Pass' if result.returncode == 0 else 'Fail', caseCount=case_count,
           reportCreated=api_report.is_file(), exitCode=result.returncode,
           failure=None if result.returncode == 0 else 'See redacted workflow output and per-case API report')
    if result.returncode:
        raise RuntimeError(f'GM-07.B API suite failed with exit code {result.returncode}')


def stop_worker(report):
    pid_file = Path(report['workerPidFile']) if report.get('workerPidFile') else None
    if not pid_file or not pid_file.is_file():
        return 'not-started'
    try:
        pid = int(pid_file.read_text(encoding='ascii').strip())
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(pid), '/T', '/F'], capture_output=True, timeout=20)
        else:
            os.kill(pid, signal.SIGTERM)
            for _ in range(30):
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    break
                time.sleep(0.2)
            else:
                os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    pid_file.unlink(missing_ok=True)
    return 'stopped'


def cleanup():
    report = load_report()
    worker_result = stop_worker(report)
    project = os.environ.get('GM_V4_QA_PROJECT_ID') or report.get('projectId')
    workdir_value = os.environ.get('GM_V4_QA_WORKDIR') or report.get('workdir')
    if not project and not workdir_value:
        record('cleanup', 'Pass', worker=worker_result, resources='none-created')
        return
    if not project or not workdir_value or not PROJECT_RE.fullmatch(project):
        record('cleanup', 'Fail', worker=worker_result, failure='Missing or invalid QA ownership metadata; left resources untouched')
        raise RuntimeError('Cannot prove ownership of resources for cleanup')
    workdir = Path(workdir_value).resolve()
    allowed = (ROOT / '.work/ci').resolve()
    if not workdir.is_relative_to(allowed) or workdir.name != project.removeprefix('ie307-'):
        record('cleanup', 'Fail', worker=worker_result, failure='QA workdir is outside the generated .work/ci namespace')
        raise RuntimeError('Refusing cleanup outside the owned QA workspace')
    container = 'supabase_db_' + project
    inspected = subprocess.run(['docker', 'inspect', container], capture_output=True, text=True, encoding='utf-8')
    if inspected.returncode == 0:
        info = json.loads(inspected.stdout)[0]
        labels = info.get('Config', {}).get('Labels') or {}
        if labels.get('com.supabase.cli.project') != project or Path(labels.get('com.supabase.cli.workdir', '')).resolve() != workdir:
            record('cleanup', 'Fail', worker=worker_result, failure='Container ownership labels differ; left resource untouched')
            raise RuntimeError('Refusing to stop a container not proven to belong to this run')
        cli('stop', '--project-id', project, '--workdir', str(workdir), timeout=180)
    elif workdir.exists():
        config_path = workdir / 'supabase/config.toml'
        if config_path.is_file() and tomllib.loads(config_path.read_text(encoding='utf-8')).get('project_id') != project:
            record('cleanup', 'Fail', worker=worker_result, failure='Orphan workdir does not carry the generated project marker')
            raise RuntimeError('Refusing to remove workdir without its generated ownership marker')
    if workdir.exists():
        shutil.rmtree(workdir)
    for name in ('GM_V4_QA_PROJECT_ID', 'GM_V4_QA_WORKDIR', 'GM_V4_QA_CONTAINER'):
        os.environ.pop(name, None)
    record('cleanup', 'Pass', worker=worker_result, projectId=project, qaContainerStopped=True, ownedWorkdirRemoved=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('setup', 'run-api', 'cleanup', 'run'))
    args = parser.parse_args()
    try:
        if args.phase == 'setup':
            setup()
        elif args.phase == 'run-api':
            run_api()
        elif args.phase == 'cleanup':
            cleanup()
        else:
            try:
                setup()
                run_api()
            finally:
                cleanup()
    except Exception as error:
        record(args.phase, 'Fail', failure=redact(error))
        print(redact(error), file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
