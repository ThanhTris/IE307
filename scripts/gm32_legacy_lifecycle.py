"""Legacy v2 HTTP lifecycle cases using the received synthetic GM-18 bundle."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from uuid import uuid4


def run(db, auth, fixture, check, literal):
    def rpc(name, who=0, expected=(200, None), **fields):
        status, body = auth.http('', fields, who=who, rpc=name)
        outcome = (status, body.get('messageKey') or body.get('message')) if status != 200 else (status, None)
        if outcome != expected or body.get('ok') != (status == 200):
            raise AssertionError(f'{name}: expected {expected}, got {outcome}')
        return body if status == 200 else outcome

    def change(key, version, **fields):
        return {'requestId': str(uuid4()), 'room_id': key, 'expected_version': version, **fields}

    def snapshot(key, who=0):
        return rpc('get_room_snapshot', who, room_id=key)['data']

    def lobby():
        made = rpc('create_room', requestId=str(uuid4()), display_name='GM32 legacy host',
                   anchor_id=fixture['entities']['publicAnchors'][0]['anchorId'], radius_m=1500,
                   desired_at=(datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
                   service_mode='dine_in', meal_slot='dinner', time_hint=None, budget=None, avoid_recent=False)
        key = made['roomId']
        joined = rpc('join_room', 1, requestId=str(uuid4()), code=made['data']['code'],
                     display_name='GM32 legacy guest')
        version = joined['version']
        for who in (0, 1):
            version = rpc('set_ready', who, **change(key, version, ready=True))['version']
        return key, version

    def started():
        key, version = lobby()
        check('v2 authenticated start', rpc('start_round', **change(key, version))['state'], 'ROUND_1')
        return key

    def ballot(snap, vote):
        return change(snap['roomId'], snap['version'], round=snap['round'],
                      pool_version=snap['poolVersion'], intent_id='intent_' + str(uuid4()),
                      votes=[{'roundDishId': item['roundDishId'], 'vote': vote} for item in snap['pool']])

    def counts(key):
        room_id = literal(key)
        return json.loads(db.psql(f"""
            select jsonb_build_array(
                (select count(*) from public.submissions where room_id={room_id}),
                (select count(*) from public.results where room_id={room_id}),
                (select count(*) from public.events where room_id={room_id})
            );
        """))

    key = started()
    invalid = ballot(snapshot(key), 'UNSET')
    check('v2 UNSET rejects', rpc('submit_ballot', expected=(400, 'INVALID_INPUT'), **invalid),
          (400, 'INVALID_INPUT'))
    check('v2 UNSET does not write', counts(key), [0, 0, 0])
    for who in (0, 1):
        rpc('submit_ballot', who, **ballot(snapshot(key, who), 'OK'))
    r2 = snapshot(key)
    check('v2 nonunanimous R1 opens R2 without result', [r2['state'], r2['round'], r2['result']],
          ['ROUND_2', 2, None])
    for who in (0, 1):
        rpc('submit_ballot', who, **ballot(snapshot(key, who), 'KEEP'))
    terminal = snapshot(key)
    check('v2 R2 result uses legacy tier', [terminal['state'], terminal['result']['matchTier']],
          ['DECIDED', 'COMPROMISE'])

    key = started()
    rpc('submit_ballot', **ballot(snapshot(key), 'WANT'))
    before = snapshot(key)
    request = ballot(before, 'WANT')
    db.psql(f"""
        create function public.gm32_legacy_fault() returns trigger language plpgsql as $$
        begin raise exception 'GM32 synthetic legacy event write failure'; end $$;
        create trigger gm32_legacy_fault before insert on public.events for each row
        when (new.room_id={literal(key)}::uuid) execute function public.gm32_legacy_fault();
    """)
    try:
        check('v2 failure reaches HTTP', rpc('submit_ballot', 1, expected=(503, 'UNKNOWN_ERROR'), **request),
              (503, 'UNKNOWN_ERROR'))
        check('v2 rollback preserves submission/result/event and version',
              [counts(key), snapshot(key)['version']], [[1, 0, 0], before['version']])
    finally:
        db.psql('drop trigger gm32_legacy_fault on public.events; drop function public.gm32_legacy_fault();')
    accepted = rpc('submit_ballot', 1, **request)
    check('v2 retry after rollback is idempotent',
          [rpc('submit_ballot', 1, **request) == accepted, counts(key)], [True, [2, 1, 1]])

    key = started()
    rpc('submit_ballot', **ballot(snapshot(key), 'WANT'))
    before = snapshot(key)
    # Both requests use the same version read from the live server.
    with ThreadPoolExecutor(max_workers=2) as threads:
        submit = threads.submit(auth.http, '', ballot(before, 'WANT'), who=1, rpc='submit_ballot')
        cancel = threads.submit(auth.http, '', change(key, before['version'], confirm_cancel=True),
                                who=0, rpc='cancel_room')
        status_codes = sorted([submit.result()[0], cancel.result()[0]])
    check('v2 cancel and last submit race exactly one success', status_codes, [200, 409])
    state = snapshot(key)['state']
    check('v2 race reaches one valid terminal state', state in ('DECIDED', 'CANCELLED'))
    check('v2 race result and event agree with terminal state',
          counts(key)[1:], [int(state == 'DECIDED')] * 2)

    key, version = lobby()
    before = snapshot(key)
    ids = ','.join(literal(item['offeringId']) for item in fixture['entities']['venueDishes'])
    db.psql(f"""
        update public.venue_dishes
        set valid_until=statement_timestamp()+interval '5 minutes',version=version+1
        where offering_id in ({ids});
    """)
    check('v2 start revalidates and blocks expired food',
          rpc('start_round', expected=(409, 'NO_ELIGIBLE_FOOD'), **change(key, version)),
          (409, 'NO_ELIGIBLE_FOOD'))
    after = snapshot(key)
    check('v2 invalidated pool increments versions and resets readiness',
          [after['state'], after['pool'], after['version'], after['poolVersion'],
           all(not member['ready'] for member in after['members'])],
          ['LOBBY', [], before['version'] + 1, before['poolVersion'] + 1, True])
