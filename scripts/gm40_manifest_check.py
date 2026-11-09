"""GM40 QA consumer of an explicit sealed GM03 Auth/REST/worker manifest.

No default stack, provisioning, migration, fabricated JWT or application DB access.
The owner stops the disposable project using the received GM03 qa:stop command.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib import request, error
from urllib.parse import urlsplit
import uuid

from dish_policy_worker import ManifestQAContainerDB

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gm40_manifest_projection', ROOT/'data-preparation/scripts/catalogue_projection.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


def command(args):
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', timeout=180,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    if result.returncode:
        # Never echo subprocess bodies/SQL/credentials, including on startup failure.
        reason = re.search(r'\b(?:QA|GM40)_[A-Z0-9_]+\b', result.stderr)
        raise RuntimeError('GM40_QA_COMMAND_FAILED' + (': ' + reason.group() if reason else ''))
    return result.stdout


def validate_report(path):
    path = Path(path)
    target = path.resolve()
    if target.is_relative_to(ROOT/'.work/qa'):
        raise ValueError('GM40 report must be outside the producer QA workdir')
    if path.is_symlink() or (target.is_relative_to(ROOT) and not any(
            target.is_relative_to(ROOT/q) for q in ['.work', 'docs/evidence/roadmap-v2/GM-40'])):
        raise ValueError('Report cannot overwrite repository source/data')
    return target


def load_manifest(path):
    """Path, seal and local-state checks run before Docker, HTTP or any SQL."""
    given = Path(path).absolute()
    if any(part.is_symlink() for part in [given, *given.parents]):
        raise ValueError('GM40_QA_MANIFEST_SYMLINK')
    manifest = json.loads(given.read_text(encoding='utf-8'))
    run_id = manifest.get('runId', '')
    if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?', run_id):
        raise ValueError('GM40_QA_RUN_ID_INVALID')
    workdir = ROOT/'.work/qa'/run_id
    if given != workdir/'manifest.json' or manifest.get('workdir') != str(workdir):
        raise ValueError('GM40_QA_MANIFEST_NOT_IN_THIS_CHECKOUT')
    # Reuse the producer's seal/contract verifier without opening a DB.
    probe = object.__new__(ManifestQAContainerDB)
    probe.manifest = manifest
    probe._verify_manifest_file()
    state = json.loads((workdir/'state.json').read_text(encoding='utf-8'))
    if (state.get('phase') != 'ready' or state.get('ownerUuid') != manifest.get('ownerUuid')
            or state.get('manifestSha256') != manifest['sealSha256']
            or state.get('runId') != run_id or state.get('workdir') != str(workdir)
            or state.get('projectId') != 'gm03qa-' + run_id
            or state.get('containerName') != 'supabase_db_gm03qa-' + run_id):
        raise ValueError('GM40_QA_STATE_MISMATCH')
    if not re.fullmatch(r'[0-9a-f-]{36}', state.get('worker', {}).get('nonce', '')):
        raise ValueError('GM40_QA_WORKER_REQUIRED')
    origin = urlsplit(manifest.get('endpoint', {}).get('baseUrl', ''))
    if (origin.scheme != 'http' or origin.hostname != '127.0.0.1' or origin.username or origin.password
            or origin.path or origin.query or origin.fragment
            or origin.port != manifest['endpoint']['apiPort']
            or origin.port in [54321, 54322] or manifest['endpoint']['dbPort'] in [54321, 54322]):
        raise ValueError('GM40_QA_ENDPOINT_INVALID')
    return manifest, state


def verify_manifest(path, manifest):
    # Producer verifies PID/nonce, heartbeat, labels, marker, source/config/ledger,
    # function ACL/hash and catalogue inventory. No cache or reseal on failure.
    docker_host = command(['docker', 'context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']).strip()
    override = os.environ.get('DOCKER_HOST', '')
    if not docker_host.startswith(('unix://', 'npipe://')) or (override and not override.startswith(('unix://', 'npipe://'))):
        raise ValueError('GM40_QA_LOCAL_DOCKER_REQUIRED')
    node = os.environ.get('GM40_NODE', 'node')
    raw = command([node, str(ROOT/'scripts/backend-qa.mjs'), 'verify', '--run-id', manifest['runId']])
    result = json.loads(raw)
    if result.get('result') != 'PASS' or result.get('runId') != manifest['runId']:
        raise ValueError('GM40_QA_VERIFY_FAILED')
    # Check the effective Auth, REST and gateway targets, not only a DB label.
    for service in ['auth', 'rest', 'kong']:
        name = 'supabase_' + service + '_' + manifest['projectId']
        info = json.loads(command(['docker', 'inspect', name]))[0]
        labels = info.get('Config', {}).get('Labels') or {}
        normalize = lambda value: str(value).replace('\\', '/').rstrip('/').casefold()
        if (info.get('Name') != '/' + name or not info.get('State', {}).get('Running')
                or labels.get('com.supabase.cli.project') != manifest['projectId']
                or normalize(labels.get('com.supabase.cli.workdir')) != normalize(manifest['workdir'])):
            raise ValueError('GM40_QA_SERVICE_OWNERSHIP_MISMATCH')
        if service == 'kong':
            bindings = info['NetworkSettings']['Ports'].get('8000/tcp') or []
            if not bindings or any(b['HostIp'] not in ['127.0.0.1', '::1']
                                   or int(b['HostPort']) != manifest['endpoint']['apiPort'] for b in bindings):
                raise ValueError('GM40_QA_GATEWAY_BINDING_MISMATCH')
    return result


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('GM40_QA_REDIRECT_FORBIDDEN')


class AuthRest:
    def __init__(self, manifest):
        credential_path = Path(manifest['workdir'])/'credentials.private.json'
        if credential_path.is_symlink():
            raise ValueError('GM40_QA_CREDENTIAL_SYMLINK')
        credentials = json.loads(credential_path.read_text(encoding='utf-8'))
        self.origin = manifest['endpoint']['baseUrl']
        if credentials.get('apiUrl') != self.origin or not credentials.get('anonKey'):
            raise ValueError('GM40_QA_CREDENTIAL_ORIGIN_MISMATCH')
        self.anon_key = credentials['anonKey']
        self.tokens = []
        self.users = []
        self.opener = request.build_opener(request.ProxyHandler({}), NoRedirect())

    def request(self, path, body=None, who=None):
        headers = {'apikey': self.anon_key, 'Content-Type': 'application/json'}
        if who is not None:
            headers['Authorization'] = 'Bearer ' + self.tokens[who]
        req = request.Request(self.origin + path, data=json.dumps(body).encode() if body is not None else None,
                              headers=headers, method='POST' if body is not None else 'GET')
        try:
            with self.opener.open(req, timeout=30) as response:
                return response.status, json.load(response)
        except error.HTTPError as exc:
            return exc.code, json.load(exc)

    def signup(self):
        status, body = self.request('/auth/v1/signup', {'data': {'display_name': 'GM40 simulated QA guest'}})
        if status != 200 or body.get('user', {}).get('is_anonymous') is not True or not body.get('access_token'):
            raise AssertionError('GM40_QA_REAL_GUEST_SIGNUP_FAILED')
        self.tokens.append(body['access_token'])
        self.users.append(body['user']['id'])
        status, user = self.request('/auth/v1/user', who=len(self.tokens)-1)
        if status != 200 or user.get('id') != self.users[-1]:
            raise AssertionError('GM40_QA_REAL_GUEST_JWT_FAILED')

    def http(self, command_name, payload, who=0, authenticated=True, rpc='dish_session'):
        body = {'command': command_name, 'payload': payload} if rpc == 'dish_session' else payload
        return self.request('/rest/v1/rpc/' + rpc, body, who if authenticated else None)


def restore_inventory(db, namespace, initial, candidates):
    """Restore only known test releases; never delete existing or referenced rows."""
    p.upstream.owned(db, namespace)
    existing = {row['id'] for row in initial}
    keep = [row['id'] for row in initial if row['active']]
    if len(keep) != 1:
        raise ValueError('GM40_QA_ORIGINAL_ACTIVE_INVALID')
    literal = p.food.literal
    sql = 'begin;select pg_advisory_xact_lock(hashtextextended(\'gm40:catalogue-qa-import\',0));'
    sql += 'update dish_v3_private.catalogues set active=false where active;'
    sql += 'update dish_v3_private.catalogues set active=true where id=' + literal(keep[0]) + ';'
    for identifier, source_sha, cards in candidates:
        if identifier in existing:
            continue
        # Source/version/hash/card predicate prevents deleting any foreign release.
        # Catalogue snapshots in either policy pin the release in public.rooms.
        sql += ('delete from dish_v3_private.catalogues c where id=' + literal(identifier)
                + ' and source_sha=' + literal(source_sha) + ' and test_only and not active'
                + ' and cards=' + literal(json.dumps(cards, ensure_ascii=False)) + '::jsonb'
                + ' and not exists(select 1 from public.rooms r where r.catalogue_version=c.id);')
    sql += 'commit;'
    db.transaction(sql)
    after = json.loads(db.psql('select coalesce(json_agg(to_jsonb(c) order by id),\'[]\'::json) from dish_v3_private.catalogues c;'))
    if after != initial:
        raise AssertionError('GM40_QA_CATALOGUE_RESTORE_MISMATCH')


def run(report_path, *, qa_manifest, extension=None, extra_sources=()):
    target = validate_report(report_path)
    target.unlink(missing_ok=True)  # A failed preflight cannot leave an old Pass.
    manifest, state = load_manifest(qa_manifest)
    checks = []
    report = {'result': 'Fail', 'runnerVersion': 'GM40.3', 'applicationDatabaseChanged': False,
              'productionPublished': False, 'credentialsRecorded': False, 'cases': checks,
              'checkedAt': datetime.now(timezone.utc).isoformat(),
              'qaManifest': {'runId': manifest['runId'], 'sealSha256': manifest['sealSha256'],
                             'sourceRevision': manifest['sourceRevision'], 'contractVersion': manifest['contractVersion'],
                             'schemaVersion': manifest['schemaVersion'], 'migrations': manifest['migrations'],
                             'functionInventorySha256': manifest['functionInventorySha256'],
                             'catalogues': manifest['catalogues']},
              'testedHead': command(['git', '-C', str(ROOT), 'rev-parse', 'HEAD']).strip()}
    paths = [Path(__file__), ROOT/'scripts/gm40_rich_projection_check.py',
             ROOT/'supabase/seed/import_dish_catalogue.py', ROOT/'supabase/seed/import_gm18_catalogue.py',
             ROOT/'data-preparation/scripts/catalogue_projection.py', p.API_SCHEMA,
             ROOT/'supabase/tests/http/GM-40.http', ROOT/'supabase/tests/dish_catalogue.sql',
             *p.build(), *extra_sources]
    report['sourceSha256ByPath'] = {str(q.relative_to(ROOT)): hashlib.sha256(q.read_bytes()).hexdigest() for q in paths}
    def check(label, actual, expected=True):
        checks.append({'case': label, 'expected': expected, 'actual': actual, 'result': 'Pass' if actual == expected else 'Fail'})
        if actual != expected:
            raise AssertionError(label)
    lock = Path(manifest['workdir'])/'.gm40-import.lock'
    lock_acquired = False
    try:
        with lock.open('x', encoding='utf-8') as stream:
            stream.write(manifest['ownerUuid'])
        lock_acquired = True
        verified = verify_manifest(qa_manifest, manifest)
        check('received producer verification: source/ledger/ACL/ownership/worker', verified['result'], 'PASS')
        check('generated projection/schema/template match received source',
              all(path.read_bytes() == raw for path, raw in p.build().items()))
        db = ManifestQAContainerDB(qa_manifest, state['worker']['nonce'])
        namespace = uuid.UUID(manifest['ownerUuid'])
        check('concrete manifest adapter admitted without creating another owner marker', p.upstream.owned(db, namespace) is None)
        auth = AuthRest(manifest)
        status, health = auth.request('/auth/v1/health')
        check('supplied QA GoTrue health', status == 200 and health.get('name') == 'GoTrue')
        for who in range(3):
            auth.signup()
            check('real anonymous signup/JWT verified guest ' + str(who), True)
        bundle, sha = p.candidate(ROOT/p.contract.BUNDLE_PATH, ROOT/p.contract.MANIFEST_PATH)
        check('manifest pins real source39, distinct from synthetic fixture',
              manifest['catalogues']['real'] == {'releaseId': p.upstream.release_id(bundle), 'sourceSha256': sha, 'count':39, 'fixtureOnly':False}
              and manifest['catalogues']['synthetic']['fixtureOnly'] is True
              and manifest['catalogues']['synthetic']['sourceSha256'] != sha)
        initial = json.loads(db.psql("select coalesce(json_agg(to_jsonb(c) order by id),'[]'::json) from dish_v3_private.catalogues c;"))
        before = p.upstream.readback(db, namespace, p.upstream.release_id(bundle))
        row = p.upstream.install(db, namespace, ROOT/p.contract.BUNDLE_PATH, ROOT/p.contract.MANIFEST_PATH, activate=True)
        check('real baseline importer reimport/readback equals sealed source', row == before and row['source_sha'] == sha and len(row['cards']) == 39)
        if extension is None:
            from gm40_rich_projection_check import exercise
            extension = exercise
        details = extension(db, namespace, auth.http, check)
        report['richProjection'] = details
        report['coverage'] = p.coverage(bundle, p.document(bundle, sha))
        # The suite creates only rich1.1.0 and QA-next1.1.1; restore exact sealed
        # inventory before the producer's post-suite drift check. No resealing.
        next_bundle = json.loads(json.dumps(bundle)); next_bundle['datasetVersion'] = '1.1.1'
        candidates = [(p.release_id(bundle), sha, p.cards(bundle)),
                      (p.release_id(next_bundle), p.contract.sha(p.contract.encoded(next_bundle)), p.cards(next_bundle))]
        restore_inventory(db, namespace, initial, candidates)
        check('exact original catalogue inventory restored without changing manifest', True)
        verified = verify_manifest(qa_manifest, manifest)
        check('post-suite producer verification: unchanged source/runtime/catalogue and healthy worker', verified['result'], 'PASS')
        report['result'] = 'Pass'
    except Exception as exc:
        reason = re.search(r'\b(?:QA|GM40)_[A-Z0-9_]+\b', str(exc))
        report['failure'] = {'type': type(exc).__name__, 'reasonCode': reason.group() if reason else None,
                             'message': str(exc) if isinstance(exc, AssertionError) else 'QA preflight or operation failed; no fallback',
                             'cleanup': 'Use owned qa:stop for this run; never reseal a failed/mutated runtime'}
        raise
    finally:
        if lock_acquired:
            if lock.read_text(encoding='utf-8') != manifest['ownerUuid']:
                raise RuntimeError('GM40_QA_LOCK_OWNERSHIP_CHANGED')
            lock.unlink()
        report['assertionCount'] = len(checks)
        report['qaLifecycle'] = 'producer-owned; consumer does not stop/reset supplied infrastructure'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(p.contract.encoded(report))
    print(json.dumps({'result': report['result'], 'cases': len(checks), 'report': str(target), 'credentialsRecorded':False}))


def main(extension=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-manifest', type=Path)
    parser.add_argument('--report', type=Path, default=ROOT/'.work/gm40-manifest-results.json')
    args = parser.parse_args()
    validate_report(args.report)
    if not args.qa_manifest:
        parser.error('--qa-manifest is required; no default/application stack fallback')
    run(args.report, qa_manifest=args.qa_manifest, extension=extension)


if __name__ == '__main__':
    main()
