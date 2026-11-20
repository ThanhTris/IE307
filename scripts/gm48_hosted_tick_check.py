"""Run GM-48 against a fresh, owned GM-03 QA stack. Never connects to a hosted DB."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import time
import uuid

from gm32_decision_boundaries import CONTRACT, PREFERENCES
from gm40_manifest_check import AuthRest, ManifestQAContainerDB, command, load_manifest, verify_manifest


ROOT = Path(__file__).resolve().parents[1]
UP = ROOT / 'supabase/migrations/0065_gm48_hosted_tick_schedule.sql'
DOWN = ROOT / 'supabase/rollback/0065_gm48_hosted_tick_schedule.down.sql'
JOBS = "jobname in ('ie307-gm48-tick', 'ie307-gm48-prune')"


def require(condition, label):
    if not condition:
        raise AssertionError(label)
    print('Pass:', label, flush=True)


def await_sql(db, query, deadline):
    while time.monotonic() < deadline:
        if db.psql(query).strip() == 't':
            return
        time.sleep(0.5)
    raise AssertionError('Timed out waiting for QA database observation')


def exercise(path, *, test_cron):
    manifest, state = load_manifest(path)
    verify_manifest(path, manifest)
    db = ManifestQAContainerDB(path, state['worker']['nonce'])
    deploy = UP.read_text(encoding='utf-8')
    require(db.psql("select count(*) from pg_extension where extname='pg_cron';").strip() == '0',
            'Fresh QA without cron applies migration and worker is healthy')
    db.psql(deploy)
    privileges_sql = """
      select not bool_or(has_function_privilege(role, function, 'EXECUTE'))
      from unnest(array['anon','authenticated','service_role']) as r(role)
      cross join unnest(array['dish_v3_private.tick()','dish_v4_private.tick()']) as f(function);
    """
    require(db.psql(privileges_sql).strip() == 't', 'Client roles cannot execute either tick')

    auth = AuthRest(manifest)
    auth.signup()
    auth.signup()

    def call(who, name, *, request_id=None, **payload):
        if name != 'snapshot':
            payload['requestId'] = request_id or uuid.uuid4().hex
        status, body = auth.http(name, {'contractVersion': CONTRACT, **payload}, who=who)
        require(status == 200 and body.get('ok') is True, f'{name} HTTP ACK')
        return body['data']

    def waiting_room():
        room = call(0, 'create', displayName='GM48 QA host',
                    settings={'dishCount': 10, 'mealSlot': 'lunch', 'desiredAt': None},
                    preferences=PREFERENCES)
        key = str(uuid.UUID(room['roomId']))
        call(1, 'join', code=room['code'], displayName='GM48 QA member')
        call(1, 'setReady', roomId=key, ready=True)
        snap = call(0, 'snapshot', roomId=key)
        call(0, 'start', roomId=key, expectedVersion=snap['version'])
        snap = call(0, 'snapshot', roomId=key)
        args = {'roomId': key, 'round': 1, 'poolVersion': snap['poolVersion']}
        votes = [{'roundDishId': row['roundDishId'], 'choice': 'WANT'} for row in snap['pool']]
        submit = {'expectedVersion': snap['version'], 'votes': votes, **args}
        req = uuid.uuid4().hex
        ack = call(0, 'submit', request_id=req, **submit)
        snap = call(0, 'snapshot', roomId=key)
        call(0, 'waiting', expectedVersion=snap['version'], **args)
        return key, submit, req, ack

    def check_timeout(kind, *, near_deadline=False, overlap=False):
        key, submit, req, ack = waiting_room()
        require(db.psql(f"""select state='WAITING_1' and cardinality(roster_user_ids)=2
          from public.rooms where id='{key}';""").strip() == 't', f'{kind}: two-person roster waits')
        if near_deadline:
            # Move only this QA room's clock boundary. The API and scheduler still
            # evaluate the unchanged 60-second business threshold.
            elapsed = 61 if overlap else 56
            db.psql(f"update dish_v4_private.sessions set waiting_started_at=clock_timestamp()-interval '{elapsed} seconds' where room_id='{key}';")
        if overlap:
            # Live worker and cron stay running. Start two more simultaneous
            # transactions against the same epoch lock and waiting room.
            with ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(db.psql, 'select dish_v4_private.tick();') for _ in range(2)]
                for future in futures:
                    future.result()
        await_sql(db, f"select state='DECIDED' from public.rooms where id='{key}';",
                  time.monotonic() + (15 if near_deadline else 75))
        require(db.psql(f"""select count(*)=1
          from dish_v4_private.ballots where room_id='{key}' and round=1;""").strip() == 't',
                f'{kind}: timeout uses one ballot without fabricating the second')
        require(db.psql(f"""select cardinality(roster_user_ids)=2
          from public.rooms where id='{key}';""").strip() == 't', f'{kind}: roster kept')
        result = call(0, 'result', roomId=key)
        require(result['status'] == 'DECIDED', f'{kind}: terminal result visible through REST')
        require(call(0, 'submit', request_id=req, **submit) == ack,
                f'{kind}: original submit ACK replays after timeout')

    check_timeout('Worker-only local fallback', near_deadline=True)
    if not test_cron:
        return

    require('pg_cron' in db.psql('show shared_preload_libraries;'), 'pg_cron loaded by disposable Postgres')
    # Supabase preloads the library. Extension install and synthetic log
    # setup need supabase_admin in this verified disposable container.
    def fixture_admin(sql):
        command(['docker', 'exec', db.container, 'psql', '-Xq', '-U', 'supabase_admin',
                 '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql])

    fixture_admin('create extension pg_cron;')
    try:
        db.psql(deploy)
        jobs_query = f"select jobid, jobname, schedule, username from cron.job where {JOBS} order by jobname;"
        original_jobs = db.psql(jobs_query)
        db.psql(deploy)
        require(db.psql(jobs_query) == original_jobs and len(original_jobs.strip().splitlines()) == 2,
                'Applying migration again preserves both job IDs and schedules')
        require('|ie307-gm48-tick|2 seconds|postgres' in original_jobs, '2-second job is owned by postgres')
        require(db.psql(privileges_sql).strip() == 't', 'Install does not grant client tick privileges')
        check_timeout('Worker plus cron', near_deadline=True, overlap=True)

        command(['node', str(ROOT/'scripts/backend-qa.mjs'), 'worker-stop', '--run-id', manifest['runId']])
        db.psql("update dish_v4_private.runtime set last_tick='-infinity' where singleton;")
        await_sql(db, "select last_tick>clock_timestamp()-interval '5 seconds' from dish_v4_private.runtime where singleton;",
                  time.monotonic()+12)
        check_timeout('Cron only')
        require(db.psql("""select count(*)>=2 from cron.job_run_details
          where jobid=(select jobid from cron.job where jobname='ie307-gm48-tick')
          and status='succeeded';""").strip() == 't', 'Real sub-minute job history records successful runs')

        fixture_admin("""insert into cron.job_run_details(jobid,status,start_time,end_time)
          select jobid,'succeeded',now()-interval '3 days',now()-interval '3 days'
          from cron.job where jobname='ie307-gm48-tick';""")
        prune = db.psql("select command from cron.job where jobname='ie307-gm48-prune';")
        db.transaction('begin;\n' + prune + '\ncommit;')
        require(db.psql("""select not exists(select 1 from cron.job_run_details
          where jobid=(select jobid from cron.job where jobname='ie307-gm48-tick')
          and end_time < now()-interval '1 day');""").strip() == 't', 'Prune removes old finished GM-48 log')
    finally:
        db.psql(DOWN.read_text(encoding='utf-8'))
        require(db.psql(f"select count(*)=0 from cron.job where {JOBS};").strip() == 't',
                'Rollback removes both schedules')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-manifest', required=True, type=Path)
    parser.add_argument('--cron', action='store_true', help='Also enable pg_cron in this disposable stack')
    args = parser.parse_args()
    exercise(args.qa_manifest, test_cron=args.cron)


if __name__ == '__main__':
    main()
