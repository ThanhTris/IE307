"""Actual GM-40 import/SQL/JWT HTTP checks; only owns a disposable local QA DB.

Never migrates/reset the application database. No token/ballot output.
"""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import time
from urllib import request, error
from urllib.parse import urlsplit, urlunsplit
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('gm40_import', ROOT / 'supabase/seed/import_dish_catalogue.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)


def run(report_path):
    admin = imp.food.LocalDB()
    namespace = uuid.uuid4()
    name = 'gm08_check_' + namespace.hex[:16]
    db = None
    container = None
    stop = threading.Event()
    thread = None
    worker_errors = []
    checks = []
    bundle_path = ROOT / imp.contract.BUNDLE_PATH
    manifest_path = ROOT / imp.contract.MANIFEST_PATH
    bundle, digest = imp.candidate(bundle_path, manifest_path)
    expected = imp.cards(bundle)
    users = [str(uuid.uuid5(namespace, 'guest-' + str(i))) for i in range(3)]
    report = {'result': 'Fail', 'dataMode': 'real draft test/demo; separate synthetic legacy fixture',
              'datasetVersion': bundle['datasetVersion'], 'sourceSha256': digest,
              'schemaVersion': '0.8.0', 'wire': 'dish-session-v3/ADR-019',
              'applicationDatabaseChanged': False, 'productionPublished': False, 'cases': checks}
    report['checkedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    report['testedHeadBeforePatchCommit'] = admin.run(['git', 'rev-parse', 'HEAD']).strip()
    report['sourceSha256ByPath'] = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in [
        'scripts/gm40_catalogue_check.py', 'supabase/seed/import_dish_catalogue.py',
        'supabase/tests/dish_catalogue.sql', 'data-preparation/config/meal_slot_evidence_v1.json']}

    def check(label, actual, expected_value=True):
        if actual != expected_value:
            raise AssertionError(label)
        checks.append({'case': label, 'expected': expected_value, 'actual': actual, 'result': 'Pass'})

    def rejects(label, operation):
        try:
            operation()
        except (ValueError, RuntimeError):
            check(label, True)
        else:
            raise AssertionError(label)

    try:
        ddl = admin.run(['docker', 'exec', imp.food.CONTAINER, 'pg_dump', '-U', 'postgres',
                         '-d', 'postgres', '--schema-only', '--no-owner', '--no-privileges', '-t', 'auth.users'])
        ddl = '\n'.join(line for line in ddl.splitlines() if not re.match(r'CREATE (?:CONSTRAINT )?TRIGGER gm\d+_', line))
        uid = admin.psql("select pg_get_functiondef('auth.uid()'::regprocedure);")
        admin.psql('create database ' + name + ' template template0;')
        db = imp.food.LocalDB(name)
        db.psql("create table public.gm40_qa_owner(namespace uuid primary key);revoke all on public.gm40_qa_owner from public,anon,authenticated,service_role;insert into public.gm40_qa_owner values('" + str(namespace) + "');")
        db.psql('create schema auth;\n' + ddl + '\n' + uid + ';grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;')
        migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
        for path in migrations:
            db.psql(path.read_text(encoding='utf-8'))
        imp.owned(db, namespace)  # verifies schema 0.8 and deployed function hashes
        report['migrations'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in migrations}
        check('deployed runtime definitions/schema verified', True)
        for u in users:
            db.psql("insert into auth.users(id,is_anonymous) values('" + u + "',true);")
        check('profile starts without venues/offerings/anchors', db.psql('select (select count(*) from public.venues)+(select count(*) from public.venue_dishes)+(select count(*) from public.public_anchors);').strip(), '0')
        with tempfile.TemporaryDirectory() as scratch:
            scratch = Path(scratch)
            staged = imp.stage(bundle_path, scratch / 'stage', manifest_path)
            check('stage pins exact source bytes', hashlib.sha256((scratch / 'stage/bundle.json').read_bytes()).hexdigest(), digest)
            check('staged cards equal explicit projection', staged['cards'] == expected)
            row = imp.install(db, namespace, bundle_path, manifest_path, activate=True)
            check('committed typed readback equals all real cards', row['cards'] == expected)
            check('release/source version and QA flag pinned', row['id'] == imp.release_id(bundle) and row['source_sha'] == digest and row['test_only'] and row['active'])
            repeated = imp.install(db, namespace, bundle_path, manifest_path, activate=True)
            check('reimport no duplicate or timestamp mutation', row == repeated)
            check('one installed release', db.psql('select count(*) from dish_v3_private.catalogues;').strip(), '1')
            conflict = json.loads(json.dumps(bundle))
            conflict['entities']['priceReferences'][0]['value'] += 1
            path = scratch / 'conflict.json'
            path.write_bytes(imp.contract.encoded(conflict))
            rejects('same version different contents rejected', lambda: imp.install(db, namespace, path, activate=True))
            check('conflict retains previous release', imp.readback(db, namespace, row['id']) == row)

            # Disposable REST is isolated from the local application's endpoint.
            info = json.loads(admin.run(['docker', 'inspect', 'supabase_rest_gi-cung-duoc-local']))[0]
            env = dict(x.split('=', 1) for x in info['Config']['Env'] if '=' in x)
            secret = env['PGRST_JWT_SECRET']
            signing_key = secret.encode()
            if secret.startswith('{'):
                key = next(k for k in json.loads(secret)['keys'] if k.get('kty') == 'oct' and k.get('k'))
                signing_key = base64.urlsafe_b64decode(key['k'] + '=' * (-len(key['k']) % 4))
            original = urlsplit(env['PGRST_DB_URI'])
            uri = urlunsplit((original.scheme, original.netloc, '/' + name, '', ''))
            container = 'gm40-http-' + namespace.hex[:12]
            proc = subprocess.run(['docker', 'run', '--rm', '--pull', 'never', '-d', '--name', container,
                '--network', next(iter(info['NetworkSettings']['Networks'])), '-p', '127.0.0.1::3000',
                '-e', 'PGRST_DB_URI', '-e', 'PGRST_JWT_SECRET', '-e', 'PGRST_DB_ANON_ROLE=anon',
                '-e', 'PGRST_DB_SCHEMAS=public', info['Config']['Image']],
                env={**os.environ, 'PGRST_DB_URI': uri, 'PGRST_JWT_SECRET': secret}, capture_output=True, text=True, timeout=40)
            if proc.returncode:
                raise RuntimeError('Owned QA REST startup failed')
            binding = json.loads(admin.run(['docker', 'inspect', container]))[0]['NetworkSettings']['Ports']['3000/tcp'][0]
            if binding['HostIp'] != '127.0.0.1':
                raise RuntimeError('QA endpoint must stay loopback')
            endpoint = 'http://127.0.0.1:' + binding['HostPort']
            for attempt in range(60):
                try:
                    request.urlopen(endpoint + '/', timeout=2).close()
                    break
                except (OSError, error.URLError):
                    if attempt == 59:
                        raise RuntimeError('QA REST not ready')
                    time.sleep(.25)

            def b64(value):
                return base64.urlsafe_b64encode(value).rstrip(b'=').decode()

            def http(command, payload, who=0, authenticated=True, rpc='dish_session'):
                headers = {'Content-Type': 'application/json'}
                if authenticated:
                    message = b64(b'{"alg":"HS256","typ":"JWT"}') + '.' + b64(json.dumps({'sub': users[who], 'role': 'authenticated', 'aud': 'authenticated', 'exp': int(time.time()) + 600}).encode())
                    headers['Authorization'] = 'Bearer ' + message + '.' + b64(hmac.new(signing_key, message.encode(), hashlib.sha256).digest())
                body = {'command': command, 'payload': payload} if rpc == 'dish_session' else payload
                req = request.Request(endpoint + '/rpc/' + rpc, data=json.dumps(body).encode(), headers=headers, method='POST')
                try:
                    with request.urlopen(req, timeout=20) as response:
                        return response.status, json.load(response)
                except error.HTTPError as exc:
                    return exc.code, json.load(exc)

            db.psql('select dish_v3_private.tick();')
            def worker():
                while not stop.wait(.5):
                    try:
                        db.psql('select dish_v3_private.tick();')
                    except Exception as exc:
                        worker_errors.append(type(exc).__name__)
                        return
            thread = threading.Thread(target=worker, daemon=True)
            thread.start()
            by_id = {c['dishId']: c for c in expected}
            for count in [10, 20]:
                create_request = {'requestId': str(uuid.uuid4()), 'displayName': 'GM40 QA host', 'dishCount': count, 'mealSlot': 'lunch'}
                status, response = http('create', create_request)
                check('HTTP real lunch pool exact ' + str(count), status == 200 and response['ok'] and len(response['data']['pool']) == count)
                room = response['data']
                check('HTTP distinct actual source dishes ' + str(count), len({c['dishId'] for c in room['pool']}) == count and all(c == by_id[c['dishId']] for c in room['pool']))
                check('HTTP meal filter/release/hash ' + str(count), all('lunch' in c['mealSlots'] for c in room['pool']) and room['catalogueSha'] == digest and room['testData'])
                status, replayed = http('create', create_request)
                check('HTTP create retry retains room/pool ' + str(count), status == 200 and replayed['ok']
                      and replayed['data']['roomId'] == room['roomId'] and replayed['data']['pool'] == room['pool'])
            status, response = http('create', {'requestId': str(uuid.uuid4()), 'displayName': 'QA', 'dishCount': 20, 'mealSlot': 'dinner'})
            check('HTTP shortage never truncates or fills unknown', status == 200 and not response['ok'] and response['error']['messageKey'] == 'INSUFFICIENT_DISHES')
            status, response = http('create', {'requestId': str(uuid.uuid4()), 'displayName': 'QA', 'dishCount': 20, 'mealSlot': 'lunch', 'categoryIds': [bundle['entities']['taxonomy'][0]['id']]})
            check('HTTP restrictive filter shortage', status == 200 and not response['ok'] and response['error']['messageKey'] == 'INSUFFICIENT_DISHES')
            status, _ = http('snapshot', {'roomId': room['roomId']}, authenticated=False)
            check('HTTP unauthenticated denied', status in [401, 403])
            status, response = http('snapshot', {'roomId': room['roomId']}, who=2)
            check('HTTP outsider denied', status == 200 and response['error']['messageKey'] == 'NOT_MEMBER')
            status, response = http('snapshot', {'roomId': room['roomId']})
            check('HTTP readback current member pool', status == 200 and response['ok'] and response['data']['pool'] == room['pool'])

            # Freeze a real room then switch releases; old snapshot must not move.
            status, joined = http('join', {'requestId': str(uuid.uuid4()), 'code': room['code'], 'displayName': 'QA member'}, who=1)
            check('HTTP second member joins', status == 200 and joined['ok'])
            current = http('snapshot', {'roomId': room['roomId']})[1]['data']
            status, started = http('start', {'requestId': str(uuid.uuid4()), 'roomId': room['roomId'], 'expectedVersion': current['version']})
            check('HTTP locks imported pool', status == 200 and started['ok'] and started['data']['state'] == 'ROUND_1')
            next_bundle = json.loads(json.dumps(bundle))
            next_bundle['datasetVersion'] = '1.1.1'
            second = scratch / 'next.json'
            second.write_bytes(imp.contract.encoded(next_bundle))
            rejects('injected failure rolls back insertion/activation', lambda: imp.install(db, namespace, second, activate=True, fail_after_insert=True))
            check('failed release absent', imp.readback(db, namespace, imp.release_id(next_bundle)) is None)
            check('previous active release retained on failure', imp.readback(db, namespace, row['id'])['active'])
            installed = imp.install(db, namespace, second, activate=True)
            check('switch release active atomically', installed['active'] and not imp.readback(db, namespace, row['id'])['active'])
            frozen = http('snapshot', {'roomId': room['roomId']})[1]['data']
            check('locked room retains old cards/source hash', frozen['pool'] == room['pool'] and frozen['catalogueSha'] == digest)
            # Exercise the already-merged two-round runtime using real imported
            # cards. No new decision/timer rules are implemented in GM-40.
            for who in [0, 1]:
                status, submitted = http('submit', {'requestId': str(uuid.uuid4()), 'roomId': room['roomId'],
                    'round': 1, 'poolVersion': 1, 'votes': {c['dishId']: 'OK' for c in room['pool']}}, who=who)
                check('HTTP real cards r1 accepted member ' + str(who), status == 200 and submitted['ok'])
            current = http('snapshot', {'roomId': room['roomId']})[1]['data']
            if current['round'] == 1:
                current = http('finalize', {'requestId': str(uuid.uuid4()), 'roomId': room['roomId'],
                    'expectedVersion': current['version']})[1]['data']
            check('HTTP imported cards retained in round two', current['round'] == 2
                  and {c['dishId']: c for c in current['pool']} == {c['dishId']: c for c in room['pool']}
                  and current['catalogueSha'] == digest)
            for who in [0, 1]:
                status, submitted = http('submit', {'requestId': str(uuid.uuid4()), 'roomId': room['roomId'],
                    'round': 2, 'poolVersion': 2,
                    'votes': {c['dishId']: 'KEEP' for c in current['pool']}}, who=who)
                check('HTTP real cards r2 accepted member ' + str(who), status == 200 and submitted['ok'])
            final = http('snapshot', {'roomId': room['roomId']})[1]['data']
            if final['state'] != 'DECIDED':
                final = http('finalize', {'requestId': str(uuid.uuid4()), 'roomId': room['roomId'],
                    'expectedVersion': final['version']})[1]['data']
            check('HTTP winner is exact imported card', final['state'] == 'DECIDED'
                  and final['result']['winner'] == by_id[final['result']['winner']['dishId']])
            restored = imp.activate(db, namespace, row['id'])
            check('restore previous active release', restored['active'] and not imp.readback(db, namespace, installed['id'])['active'])
            reconnected = http('snapshot', {'roomId': room['roomId']}, who=1)[1]['data']
            check('terminal result stable after restore/reconnect', reconnected['result'] == final['result']
                  and reconnected['catalogueSha'] == digest)
            rejects('restore unknown release rejected', lambda: imp.activate(db, namespace, 'absent'))
            rejects('ownership mismatch blocked', lambda: imp.readback(db, uuid.uuid4(), row['id']))

            # Existing legacy fixture supplies actual old identities/references.
            import gm18_http_fixture as legacy
            legacy_bundle, core_sql, core = legacy.positive(namespace, users)
            db.transaction(legacy.real.load_sql(legacy_bundle))
            db.psql("delete from public.profiles where user_id in ('" + users[0] + "','" + users[1] + "');")
            db.psql(core_sql)
            legacy_ids = [c['id'] for c in core['rooms']]
            def legacy_hash():
                return db.psql("select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'')) from public.rooms r where policy_version='decision-v2';select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'')) from public.results r;select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'')) from public.round_dishes r;").strip()
            before = legacy_hash()
            status, old_snapshot = http('', {'room_id': legacy_ids[0]}, rpc='get_room_snapshot')
            check('legacy authenticated snapshot/result still readable', status == 200 and old_snapshot['ok']
                  and old_snapshot['data']['result']['resultId'] == core['results'][0]['id'])
            imp.install(db, namespace, bundle_path, manifest_path, activate=True)
            imp.activate(db, namespace, installed['id'])
            imp.activate(db, namespace, row['id'])
            check('legacy rooms/results/round refs unchanged by import/switch/restore', legacy_hash(), before)
            status, after_snapshot = http('', {'room_id': legacy_ids[0]}, rpc='get_room_snapshot')
            check('legacy result stable through release restore', status == 200 and after_snapshot['ok']
                  and after_snapshot['data']['result'] == old_snapshot['data']['result'])
            check('legacy FK and IDs retained', db.psql('set constraints all immediate;select count(*) from public.results;').strip(), str(len(core['results'])))
            check('legacy fixtures separate from real catalogue', not any(c['dishId'] in {d['id'] for d in legacy_bundle['entities']['dishes']} for c in expected))
            db.psql((ROOT / 'supabase/tests/dish_catalogue.sql').read_text(encoding='utf-8'))
            check('SQL ACL/consistency assertions', True)
            check('QA worker healthy', not worker_errors)
            report['mealCounts'] = {slot: sum(slot in c['mealSlots'] for c in expected) for slot in ['breakfast', 'lunch', 'dinner', 'snack']}
            report['result'] = 'Pass'
    finally:
        stop.set()
        if thread:
            thread.join(timeout=10)
        if container:
            admin.run(['docker', 'stop', container])
        if db:
            if db.psql('select namespace::text from public.gm40_qa_owner;').strip() != str(namespace):
                raise RuntimeError('Refusing cleanup: ownership marker changed')
            admin.psql('drop database ' + name + ' with (force);')
        report['ownedResourcesCleaned'] = True
        Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        Path(report_path).write_bytes(imp.contract.encoded(report))
    print(json.dumps({'result': report['result'], 'cases': len(checks), 'applicationDatabaseChanged': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/evidence/roadmap-v2/GM-40/qa-results.json')
    run(parser.parse_args().report)
