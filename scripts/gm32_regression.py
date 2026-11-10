#!/usr/bin/env python3
"""Run GM-32 regression against an explicitly owned GM-03 QA manifest."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

from dish_policy_worker import ManifestQAContainerDB
from gm40_manifest_check import AuthRest, ROOT, load_manifest, run as run_catalogue, verify_manifest

PRODUCER_SUITES = {
    'canonical': ('gm20_canonical_http.mjs', 'GM-20', 'canonical writer and races'),
    'history': ('gm21_canonical_http.mjs', 'GM-21', 'consent, history and retention'),
    'notifications': ('gm23_canonical_http.mjs', 'GM-23', 'event, inbox and fake-provider sender'),
}
LEGACY_BUNDLE = ROOT / 'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json'
DECISION_VECTORS = ROOT / 'tests/fixtures/decision-v4/cases.json'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def jsonb(value):
    return literal(json.dumps(value, ensure_ascii=False)) + '::jsonb'


def run_process(args, *, cwd=ROOT, env=None):
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True,
                            encoding='utf-8', timeout=900)
    if result.returncode:
        # Producer diagnostics may include request details. Leave them in memory.
        raise RuntimeError(f'{Path(args[0]).name} exited {result.returncode}')
    return result.stdout


def stage(report, name, owner, run):
    entry = {'stage': name, 'owner': owner, 'result': 'Fail'}
    report['stages'].append(entry)
    try:
        entry.update(run())
    except (AssertionError, KeyError, OSError, RuntimeError, ValueError, subprocess.TimeoutExpired) as exc:
        entry['failureType'] = type(exc).__name__
        if isinstance(exc, AssertionError):
            entry['failedAssertion'] = str(exc)
        raise
    entry['result'] = 'Pass'
    print(f'PASS {name}', flush=True)


def summarize(path, *, count_field='caseCount'):
    report = read_json(path)
    assert report['result'].lower() == 'pass', 'Producer report must pass'
    count = report[count_field]
    assert type(count) is int and count > 0, 'Producer must execute assertions'
    return {'assertionCount': count, 'producerReportSha256': sha256(path)}


def check_rows():
    rows = []

    def check(case, actual, expected=True):
        equal = actual == expected
        rows.append({'case': case, 'expected': expected, 'actual': actual,
                     'result': 'Pass' if equal else 'Fail'})
        if not equal:
            raise AssertionError(case)

    return rows, check


def legacy_regression(db, manifest, node):
    from gm18_http_fixture import positive, real
    from gm32_legacy_lifecycle import run as run_legacy

    rows, check = check_rows()
    legacy_cases = json.loads(run_process([node, 'scripts/gm18_domain_check.mjs']))
    inputs = [{key: case[key] for key in ('bundle', 'input', 'evaluatedAt', 'policy')}
              for case in legacy_cases]
    query = f'''
        select jsonb_agg(gm18_private.evaluate(
            c->'bundle', c->'input', (c->>'evaluatedAt')::timestamptz, c->'policy'
        ) order by ord)
        from jsonb_array_elements({jsonb(inputs)}) with ordinality t(c, ord);
    '''
    for case, actual in zip(legacy_cases, json.loads(db.psql(query)), strict=True):
        check(case['id'] + ' SQL/domain parity', actual == case['actual'])
        check(case['id'] + ' independent eligible set', actual['eligibleOfferingIds'],
              sorted(case['expectedEligibleOfferingIds']))

    draft, digest, _ = real.candidate(LEGACY_BUNDLE)
    # Insert only on the verified disposable database and roll back the whole
    # import/query probe. This does not upgrade the draft to published data.
    load = real.load_sql(draft, commit=False).removesuffix('rollback;')
    request = {'context': {'anchorId': str(uuid.UUID(int=0)), 'radiusM': 1000,
                           'desiredAt': '2026-10-12T05:00:00Z', 'mealSlot': 'lunch',
                           'serviceMode': 'dine_in'}, 'poolSeed': 'gm32-draft'}
    policy = {'maxRadiusM': 10000, 'maxFutureSeconds': 604800, 'fixtureMode': False}
    actual = json.loads(db.psql(load + f'''
        select gm18_private.preview({jsonb(request)},'0.4.1',
            '2026-10-12T05:00:00Z'::timestamptz,{jsonb(policy)});
        rollback;
    ''').strip().splitlines()[-1])
    check('real GM-08 draft is not eligible without coverage', actual['pool'], [])
    check('real GM-08 draft reports out of coverage', actual['reasonCodes'], ['OUT_OF_COVERAGE'])
    check('real GM-08 draft rows were evaluated', len(actual['excludedOfferings']), 190)
    check('draft probe rolls back all version rows',
          db.psql("select count(*) from public.dataset_versions where dataset_version='0.4.1';").strip(), '0')

    auth = AuthRest(manifest)
    for _ in range(3):
        auth.signup()
    fixture, core_sql, core = positive(uuid.uuid4(), auth.users)
    db.transaction(real.load_sql(fixture))
    user_ids = ','.join(literal(user) for user in auth.users[:2])
    db.psql(f'delete from public.profiles where user_id in ({user_ids});')
    db.psql(core_sql)
    request = {'room_id': core['rooms'][0]['id']}
    status, member = auth.http('', request, rpc='get_room_snapshot')
    check('legacy v2 member receives persisted result', {
        'status': status, 'ok': member.get('ok'),
        'expectedResultId': member.get('data', {}).get('result', {}).get('resultId') == core['results'][0]['id'],
    }, {'status': 200, 'ok': True, 'expectedResultId': True})
    status, outsider = auth.http('', request, who=2, rpc='get_room_snapshot')
    check('legacy v2 outsider is denied the room', {'status': status, 'hasData': bool(outsider.get('data'))},
          {'status': 403, 'hasData': False})
    status, _ = auth.http('', request, authenticated=False, rpc='get_room_snapshot')
    check('legacy v2 anonymous caller is denied', status in (401, 403))
    run_legacy(db, auth, fixture, check, literal)
    return {'assertionCount': len(rows), 'cases': rows, 'legacyDraftSha256': digest,
            'sourceSha256': sha256(ROOT / 'scripts/gm32_legacy_lifecycle.py'),
            'dataModes': ['synthetic eligibility vectors', 'real draft rollback probe', 'synthetic v2 room']}


def decision_parity(db, node):
    fixture = read_json(DECISION_VECTORS)
    assert fixture['fixtureOnly'] is True, 'Expected synthetic decision vectors'
    vectors = fixture['cases']
    query = f'''
        create function pg_temp.gm32_evaluate(input jsonb) returns jsonb language plpgsql as $$
        begin return gm20_canonical_private.evaluate_v4(input);
        exception when sqlstate '22023' then return '{{"error":"INVALID_INPUT"}}'::jsonb; end $$;
        select jsonb_agg(pg_temp.gm32_evaluate(c->'input') order by ord)
        from jsonb_array_elements({jsonb(vectors)}) with ordinality t(c, ord);
    '''
    rows, check = check_rows()
    for case, actual in zip(vectors, json.loads(db.psql(query)), strict=True):
        check(case['id'], actual == case['expected'])
    run_process([node, '--test', 'mobile/tests/dishPolicyV4.test.mjs'])
    return {'assertionCount': len(rows), 'cases': rows, 'fixtureSha256': sha256(DECISION_VECTORS),
            'typescriptVectorSuite': 'Pass'}


def legacy_decision_parity(db, node):
    directory = ROOT / 'tests/fixtures/decision-v2'
    vectors = []
    fixture_hashes = {}
    for name in ('cases', 'roster-cases', 'seeded-cases'):
        path = directory / (name + '.json')
        fixture_hashes[name] = sha256(path)
        for case in read_json(path)['cases']:
            seed_selection = name == 'seeded-cases'
            value = case['input']
            if seed_selection and isinstance(value, dict) and 'seed' in case:
                value = value | {'seed': case['seed']}
            vectors.append({'id': name + '/' + case['id'], 'input': value,
                            'expected': case['expected'], 'seeded': seed_selection})
    query = f"""
        select jsonb_agg(case when (v->>'seeded')::boolean
            then gm20_private.decide(v->'input') else gm20_private.evaluate(v->'input') end
            order by ord) from jsonb_array_elements({jsonb(vectors)}) with ordinality t(v, ord);
    """
    rows, check = check_rows()
    for vector, actual in zip(vectors, json.loads(db.psql(query)), strict=True):
        check(vector['id'], actual == vector['expected'])
    run_process([node, '--test', 'mobile/tests/decision.test.mjs', 'mobile/tests/decisionSeeded.test.mjs'])
    return {'assertionCount': len(rows), 'cases': rows, 'fixtureSha256': fixture_hashes,
            'typescriptVectorSuite': 'Pass'}


def producer_env(manifest_path, manifest, output):
    excluded = ('GM03_QA_', 'GM_V4_', 'GM20_', 'GM21_', 'GM23_', 'GM_CANONICAL_')
    return {key: value for key, value in os.environ.items() if not key.startswith(excluded)} | {
        'GM03_QA_MANIFEST': str(manifest_path), 'GM03_QA_WORKDIR': manifest['workdir'],
        'GM_V4_PYTHON': sys.executable,
        'GM_V4_SYNTHETIC_RELEASE_ID': manifest['catalogues']['synthetic']['releaseId'],
        'GM_CANONICAL_REPORT_DIRECTORY': str(output),
    }


def run_group(group, manifest_path):
    manifest, state = load_manifest(manifest_path)
    manifest_path = manifest_path.absolute()
    verify_manifest(manifest_path, manifest)
    db = ManifestQAContainerDB(manifest_path, state['worker']['nonce'])
    node = os.environ.get('GM40_NODE', 'node')
    output = ROOT / '.work/gm32' / manifest['runId']
    if output.resolve() != output or output.exists():
        raise ValueError('Use a fresh dedicated QA run ID for GM-32')
    output.mkdir(parents=True, mode=0o700)
    env = producer_env(manifest_path, manifest, output)
    report = {
        'result': 'Fail', 'group': group, 'sourceRevision': manifest['sourceRevision'],
        'manifestSealSha256': manifest['sealSha256'], 'runnerSha256': sha256(Path(__file__)),
        'migrations': manifest['migrations'], 'functionInventorySha256': manifest['functionInventorySha256'],
        'schemaVersions': [row['schema_version'] for row in manifest['schemaVersions']],
        'catalogues': {key: manifest['catalogues'][key] for key in ('real', 'synthetic')},
        'credentialsInEvidence': False, 'stages': [],
    }

    def run_catalogue_stage():
        path = output / 'catalogue.json'
        run_catalogue(path, qa_manifest=manifest_path)
        return summarize(path, count_field='assertionCount')

    def run_baseline_http():
        run_process([node, 'scripts/backend-qa.mjs', 'test', '--run-id', manifest['runId']], env=env)
        workdir = Path(manifest['workdir'])
        return {'auth': summarize(workdir / 'gm03-auth-rest-report.json', count_field='assertionCount'),
                'wireB': summarize(workdir / 'api-check-results.json')}

    def run_outbox():
        # Canonical room creation is an explicit QA capability on this owned stack.
        db.psql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton;')
        try:
            raw = run_process([node, 'node_modules/jest/bin/jest.js', '--runInBand', '--no-watchman', '--json',
                               '--runTestsByPath', 'tests/unit/gm31Outbox.test.ts',
                               'tests/integration/gm32OutboxLive.test.ts'], cwd=ROOT / 'mobile',
                              env=env | {'GM32_OUTBOX_LIVE': '1'})
            result = json.loads(raw)
            live_suite = next((suite for suite in result['testResults']
                               if suite['name'].endswith('gm32OutboxLive.test.ts')), {})
            assert result['success'] and any(test['status'] == 'passed'
                                             for test in live_suite.get('assertionResults', [])), (
                'GM-32 live HTTP test must pass'
            )
            return {'assertionCount': result['numPassedTests'], 'nativeStore': 'Node SQLite and in-memory secure store',
                    'liveHttp': True}
        finally:
            db.psql('update gm20_canonical_private.configuration set allow_new_sessions=false where singleton;')

    try:
        if group == 'outbox':
            stage(report, 'GM-31 replay and live canonical ACK reconciliation', 'GM-31', run_outbox)
            verify_manifest(manifest_path, manifest)
        elif group == 'legacy-decision':
            stage(report, 'legacy evaluator and seeded selector vectors', 'GM-15/GM-20',
                  lambda: legacy_decision_parity(db, node))
        elif group == 'boundaries':
            from gm32_decision_boundaries import run as run_boundaries

            def boundary_stage():
                rows, check = check_rows()
                run_boundaries(db, manifest, check, literal)
                return {'assertionCount': len(rows), 'cases': rows,
                        'sourceSha256': sha256(ROOT / 'scripts/gm32_decision_boundaries.py')}

            stage(report, 'R2 survivor, majority and timeout boundaries', 'GM-19/GM-20', boundary_stage)
        elif group == 'baseline':
            stage(report, 'real dish catalogue and v3 continuity', 'GM-40', run_catalogue_stage)
            stage(report, 'GoTrue and baseline B wire/settings/admission', 'GM-03/GM-07/GM-19', run_baseline_http)
            stage(report, 'legacy eligibility SQL/domain and v2 ACL', 'GM-17/GM-18',
                  lambda: legacy_regression(db, manifest, node))
            verify_manifest(manifest_path, manifest)
        else:
            script, owner, description = PRODUCER_SUITES[group]
            if group == 'canonical':
                stage(report, 'independent SQL and TypeScript decision vectors', 'GM-15/GM-20',
                      lambda: decision_parity(db, node))

            def run_producer():
                run_process([node, script_path(script)], env=env)
                return summarize(output / 'http-results.json') | {'sourceSha256': sha256(ROOT / script_path(script))}

            stage(report, description, owner, run_producer)
        report['result'] = 'Pass'
    finally:
        # These suites use disposable fixture state. The caller owns the GM-03
        # project and must stop that run even after a failing assertion.
        path = output / 'summary.json'
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'GM-32 report: {path.relative_to(ROOT)}', flush=True)


def script_path(name):
    return 'scripts/' + name


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('group', choices=('baseline', 'legacy-decision', *PRODUCER_SUITES, 'boundaries', 'outbox'))
    parser.add_argument('--qa-manifest', required=True, type=Path)
    args = parser.parse_args()
    run_group(args.group, args.qa_manifest)
