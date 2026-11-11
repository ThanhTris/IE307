"""Response-driven boundary cases against the disposable GM-03 QA stack."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
from uuid import uuid4

from gm40_manifest_check import AuthRest

CONTRACT = 'dish-session-v4/roadmap-v2/GM-07.B-supplement'
PREFERENCES = {
    'cuisineIds': [], 'categoryIds': [], 'temperature': None, 'flavor': None,
    'budget': None, 'avoidRecent': False,
}


def run(db, manifest, check, literal):
    auth = AuthRest(manifest)
    for _ in range(20):
        auth.signup()
    release = manifest['catalogues']['synthetic']
    check('synthetic input count and label', [release['count'], release['fixtureOnly']], [20, True])
    db.psql(f"""
        begin;
        update dish_v3_private.catalogues set active=false where active;
        update dish_v3_private.catalogues set active=true where id={literal(release['releaseId'])}
            and source_sha={literal(release['sourceSha256'])} and test_only;
        update gm20_canonical_private.configuration set allow_new_sessions=true where singleton;
        commit;
    """)

    def call(command, who=0, expected=(200, None), **fields):
        if command not in ('snapshot', 'getDefaultPreferences'):
            fields.setdefault('requestId', str(uuid4()))
        status, body = auth.http(command, {'contractVersion': CONTRACT, **fields}, who=who)
        outcome = (status, body.get('error', {}).get('messageKey'))
        if outcome != expected or body.get('ok') != (status == 200):
            # Only emit contract codes, never payload/identities.
            raise AssertionError(f'{command}: expected {expected}, got {outcome}')
        return body.get('data') if status == 200 else outcome

    def snapshot(room, who=0):
        return call('snapshot', who, roomId=room)

    qa_users = ','.join(literal(user) for user in auth.users)

    def lobby(size=2, count=20):
        # Independent cases reuse these synthetic accounts. Leave quotas
        # enabled during each case, including all concurrent requests.
        db.psql(f"delete from gm19_private.rate_windows where user_id in ({qa_users});")
        made = call('create', displayName='GM32 host',
                    settings={'dishCount': count, 'mealSlot': 'lunch', 'desiredAt': None},
                    preferences=PREFERENCES)
        for who in range(1, size):
            call('join', who, code=made['code'], displayName='GM32 member')
        return made['roomId']

    def room(size=2, count=20):
        key = lobby(size, count)
        call('start', roomId=key, expectedVersion=snapshot(key)['version'])
        return key

    def scoped(command, key, who, current, **fields):
        return call(command, who, roomId=key, round=current['round'],
                    poolVersion=current['poolVersion'], expectedVersion=current['version'], **fields)

    def submit(key, who, choice, prefix=None, limit=0, expected=(200, None)):
        snap = snapshot(key, who)
        votes = [{'roundDishId': item['roundDishId'],
                  'choice': prefix if index < limit else choice}
                 for index, item in enumerate(snap['pool'])]
        return scoped('submit', key, who, snap, votes=votes, expected=expected)

    def waiting(key, who):
        return scoped('waiting', key, who, snapshot(key, who))

    def finalize(key, expected=(200, None), who=0):
        return call('finalize', who, expected=expected, roomId=key,
                    expectedVersion=snapshot(key, who)['version'])

    for count in range(10, 21):
        key = lobby(count=count)
        pool = snapshot(key)['pool']
        check(f'exact initial count and distinct dish IDs for {count}',
              [len(pool), len({item['dishId'] for item in pool})], [count, count])

    peer_preference = call('getDefaultPreferences', 1)
    preference = call('getDefaultPreferences')
    spicy = PREFERENCES | {'flavor': {
        'spicy': {'present': True, 'intensity': 'high'},
        'salty': {'present': None, 'intensity': 'unknown'},
        'sweet': {'present': False, 'intensity': 'none'},
        'sour': {'present': False, 'intensity': 'none'},
    }}
    call('updateDefaultPreferences', expectedRevision=preference['revision'], preferences=spicy)
    check('canonical account preference only returned to its owner',
          [call('getDefaultPreferences')['preferences'] == spicy,
           call('getDefaultPreferences', 1) == peer_preference], [True, True])
    key = lobby(count=10)
    call('updatePreferences', roomId=key, expectedVersion=snapshot(key)['version'], preferences=spicy)
    check('canonical room caller preference is private and ranking is optional',
          [snapshot(key)['ownPreferences'] == spicy,
           snapshot(key, 1)['ownPreferences'] == peer_preference['preferences'],
           snapshot(key)['preferenceRanking']], [True, True, 'UNSUPPORTED'])
    call('start', roomId=key, expectedVersion=snapshot(key)['version'])

    def legacy_ok(rpc, who, **fields):
        status, body = auth.http('', fields, who=who, rpc=rpc)
        if status != 200 or not body.get('ok', rpc == 'get_my_social_identity'):
            raise AssertionError(f'{rpc}: expected 200, got {status}')
        return body.get('data', body)

    key = lobby(count=10)
    friend = legacy_ok('get_my_social_identity', 2)
    invite = legacy_ok('invite_partner', 0, requestId=str(uuid4()),
                       friend_code=friend['friendCode'], partner_id=None)
    legacy_ok('accept_partner', 2, requestId=str(uuid4()), invitation_id=invite['id'])
    invite = legacy_ok('invite_to_room', 0, requestId=str(uuid4()), room_id=key,
                       partner_id=auth.users[2], expected_version=snapshot(key)['version'])
    before = snapshot(key)
    with ThreadPoolExecutor(max_workers=2) as threads:
        start = threads.submit(auth.http, 'start', {
            'contractVersion': CONTRACT, 'requestId': str(uuid4()), 'roomId': key,
            'expectedVersion': before['version'],
        })
        accept = threads.submit(auth.http, '', {
            'requestId': str(uuid4()), 'invitation_id': invite['id'], 'display_name': 'GM32 invitee',
        }, who=2, rpc='accept_room_invite')
        start_status, accept_status = start.result()[0], accept.result()[0]
    check('canonical invitation admission and start serialize', sorted([start_status, accept_status]), [200, 409])
    after = snapshot(key)
    check('admission/start race preserves winner roster and version',
          [after['state'], after['memberCount'], after['version']],
          ['ROUND_1' if start_status == 200 else 'LOBBY', 2 if start_status == 200 else 3, before['version']+1])

    # Equal first-round OK scores mean any eligible candidate may win.
    # Assert the exact survivor set and the set of allowed podium IDs.
    for survivors in range(21):
        key = room()
        initial = snapshot(key)
        check(f'N={survivors} initial count/hash', [len(initial['pool']), initial['catalogueSha']],
              [20, release['sourceSha256']])
        allowed = {item['dishId'] for item in initial['pool'][20-survivors:]}
        if survivors == 0:
            check('UNSET rejects full ballot without ACK',
                  submit(key, 0, 'UNSET', expected=(400, 'INCOMPLETE_BALLOT')),
                  (400, 'INCOMPLETE_BALLOT'))
            check('UNSET leaves accepted count zero', snapshot(key)['submittedCount'], 0)
        submit(key, 0, 'OK', 'NO', 20-survivors)
        submit(key, 1, 'OK')
        waiting(key, 0)
        waiting(key, 1)
        next_state = snapshot(key)
        if survivors == 0:
            check('N=0 terminates in R1', [next_state['round'], next_state['state'],
                  next_state['result']['reasonCode']], [1, 'NO_CONSENSUS', 'EMPTY_INTERSECTION'])
            continue

        cap = max(1, 3 * survivors // 10)
        check(f'N={survivors} R2 count/cap/state', [len(next_state['pool']), next_state['removalCap'],
              next_state['state'], next_state['submittedCount'], next_state['poolVersion']],
              [survivors, cap, 'ROUND_2', 0, initial['poolVersion'] + 1])
        check(f'N={survivors} exact survivor IDs', {item['dishId'] for item in next_state['pool']} == allowed)
        check(f'N={survivors} disjoint round row IDs', not (
            {item['roundDishId'] for item in initial['pool']}
            & {item['roundDishId'] for item in next_state['pool']}))
        if survivors > cap:
            check(f'N={survivors} cap+1 rejected', submit(key, 0, 'KEEP', 'REMOVE', cap+1,
                  expected=(409, 'REMOVE_LIMIT')), (409, 'REMOVE_LIMIT'))
            after = snapshot(key)
            check(f'N={survivors} rejected ballot leaves version/count', [after['version'], after['submittedCount']],
                  [next_state['version'], 0])
        submit(key, 0, 'KEEP', 'REMOVE', cap)
        submit(key, 1, 'KEEP')
        waiting(key, 0)
        waiting(key, 1)
        terminal = snapshot(key)
        if survivors == 1:
            check('N=1 remove-all terminal', [terminal['state'], terminal['result']['reasonCode'],
                  terminal['result']['winner'], terminal['result']['topDishes']],
                  ['NO_CONSENSUS', 'ALL_REMOVED', None, []])
            continue
        retained = {item['dishId'] for item in next_state['pool'][cap:]}
        result = terminal['result']
        podium = result['topDishes']
        check(f'N={survivors} exact cap accepted and decided', [terminal['state'], terminal['round'], len(podium)],
              ['DECIDED', 2, min(3, len(retained))])
        check(f'N={survivors} podium eligibility/score/dense rank', all(
            item['dish']['dishId'] in retained and item['score'] == 2 and item['rank'] == 1 for item in podium))
        check(f'N={survivors} winner belongs to podium', result['winner']['dishId'] in
              {item['dish']['dishId'] for item in podium})

    for size, required in [(2, 2), (3, 2), (4, 3), (5, 3), (20, 11)]:
        key = room(size, count=10)
        for round_number, choice in [(1, 'OK'), (2, 'KEEP')]:
            for who in range(required-1):
                submit(key, who, choice)
            acked = snapshot(key)
            check(f'M={size} R{round_number} ACK does not start clock',
                  [acked['waitingStartedAt'], acked['submittedCount']], [None, required-1])
            waiting(key, 0)
            snap = snapshot(key)
            elapsed = datetime.fromisoformat(snap['deadline']) - datetime.fromisoformat(snap['waitingStartedAt'])
            check(f'M={size} R{round_number} deadline and locked roster',
                  [elapsed.total_seconds(), snap['memberCount']], [60.0, size])
            check(f'M={size} R{round_number} host below majority rejected',
                  finalize(key, (409, 'NOT_READY')), (409, 'NOT_READY'))
            check(f'M={size} R{round_number} peer cannot finalize',
                  finalize(key, (403, 'NOT_HOST'), who=1), (403, 'NOT_HOST'))
            submit(key, required-1, choice)
            snap = snapshot(key)
            check(f'M={size} R{round_number} host has majority',
                  [snap['canEndWaiting'], snap['submittedCount']], [True, required])
            finalize(key)
            after = snapshot(key)
            check(f'M={size} R{round_number} majority advances', after['state'],
                  'ROUND_2' if round_number == 1 else 'DECIDED')
            if round_number == 1:
                check(f'M={size} R1 ACKs do not authorize R2',
                      [after['submittedCount'], after['canEndWaiting']], [0, False])

    for round_number, elapsed in [(round_number, elapsed)
                                   for round_number in (1, 2) for elapsed in (59, 60, 61)]:
        key = room(3, count=10)
        if round_number == 2:
            for who in (0, 1):
                submit(key, who, 'OK')
            waiting(key, 0)
            finalize(key)
        submit(key, 0, 'OK' if round_number == 1 else 'KEEP')
        waiting(key, 0)
        check(f'R{round_number} +{elapsed}s fixture has one ballot below majority',
              [snapshot(key)['submittedCount'], snapshot(key)['canEndWaiting']], [1, False])

        # Serialize against the worker with the same reference-epoch lock.
        # Age only this test session and run the deployed tick in the same
        # transaction. No fake clock, migration edits or production timing.
        room_key = literal(key)
        actual = json.loads(db.psql(f"""
            begin;
            update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
            update dish_v4_private.sessions
              set waiting_started_at=clock_timestamp()-make_interval(secs => {elapsed})
              where room_id={room_key};
            select dish_v4_private.tick();
            select jsonb_build_object('state',state,'resultCount',
                (select count(*) from gm06_canonical.results where room_ref_id={room_key}))
                from public.rooms where id={room_key};
            rollback;
        """).strip())
        expected = (f'WAITING_{round_number}' if elapsed == 59
                    else 'ROUND_2' if round_number == 1 else 'DECIDED')
        check(f'R{round_number} +{elapsed}s deployed tick', actual,
              {'state': expected, 'resultCount': int(round_number == 2 and elapsed >= 60)})
        check(f'R{round_number} +{elapsed}s rollback preserves live HTTP state',
              snapshot(key)['state'], f'WAITING_{round_number}')
