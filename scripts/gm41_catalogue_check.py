"""Validate, import, and exercise GM-41 on a fresh disposable GM-03 QA run."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
from uuid import UUID, uuid4

from gm32_decision_boundaries import CONTRACT, PREFERENCES
from gm40_manifest_check import AuthRest, ManifestQAContainerDB, load_manifest, p, validate_report, verify_manifest
import gm41_catalogue as gm
import release_v1_catalogue as release


def exercise(read_manifest, check, *, release_v1=False):
    catalogue = release if release_v1 else gm
    manifest, state = load_manifest(read_manifest)
    verified = verify_manifest(read_manifest, manifest)
    check('sealed QA source, migrations, ACL, ownership and worker', verified['result'], 'PASS')
    db = ManifestQAContainerDB(read_manifest, state['worker']['nonce'])
    namespace = UUID(manifest['ownerUuid'])
    p.upstream.owned(db, namespace)

    for path, raw in catalogue.outputs().items():
        check(f'reproducible {path.name}', path.read_bytes() == raw)
    bundle = gm.dc.load_json(catalogue.BUNDLE)
    sha = gm.dc.sha(catalogue.BUNDLE.read_bytes())
    identifier = p.received.release_id(bundle)
    cards = p.received.cards(bundle)
    by_id = {card['dishId']: card for card in cards}
    check('GM18.2 projection preserves every dish identity', len(by_id), len(bundle['entities']['dishes']))
    previous = json.loads(db.psql('select row_to_json(c) from dish_v3_private.catalogues c where active;'))

    def install(*, fail=False):
        db.transaction(p.upstream.import_sql(bundle, sha, activate=True, fail_after_insert=fail,
                                             projected_cards=cards, release_identifier=identifier))
        return p.readback(db, namespace, identifier)

    with tempfile.TemporaryDirectory() as directory:
        stage = Path(directory)
        (stage / 'bundle.json').write_bytes(catalogue.BUNDLE.read_bytes())
        (stage / 'cards.json').write_bytes(gm.dc.encoded(cards))
        check('staged bundle bytes and projected cards', gm.dc.sha((stage / 'bundle.json').read_bytes()) == sha
              and gm.dc.load_json(stage / 'cards.json') == cards)
        try:
            install(fail=True)
        except RuntimeError as exc:
            check('injected import failure', str(exc), 'QA_PSQL_ERROR_P0001')
        else:
            raise AssertionError('Import unexpectedly succeeded after injected fault')
        check('failed import rolled back', p.readback(db, namespace, identifier), None)
        try:
            loaded = install()
            check('exact readback of rich cards, hash and testOnly', loaded['cards'] == cards
                  and loaded['source_sha'] == sha and loaded['active'] and loaded['test_only'])
            check('reimport no-op', install() == loaded)
            verify_rooms(db, manifest, identifier, sha, by_id, check, release_v1=release_v1)
        finally:
            p.activate(db, namespace, previous['id'])
            check('original release restored', p.readback(db, namespace, previous['id']) == previous)
    return {'runId': manifest['runId'], 'sealSha256': manifest['sealSha256'],
            'sourceRevision': manifest['sourceRevision'], 'functionInventorySha256': manifest['functionInventorySha256'],
            'migrations': len(manifest['migrations']), 'releaseId': identifier, 'bundleSha256': sha}


def verify_rooms(db, manifest, identifier, sha, by_id, check, *, release_v1=False):
    auth = AuthRest(manifest)
    guest_count = len(gm.ft.MEALS) if release_v1 else 7
    for _ in range(guest_count):
        auth.signup()
    check('real anonymous JWTs verified through GoTrue', len(auth.tokens), guest_count)
    db.psql('update gm20_canonical_private.configuration set allow_new_sessions=true where singleton;')

    def call(command, who, **fields):
        if command != 'snapshot':
            fields['requestId'] = uuid4().hex
        status, body = auth.http(command, {'contractVersion': CONTRACT, **fields}, who=who)
        check(f'{command} HTTP ACK', [status, body.get('ok'), body.get('error', {}).get('messageKey')],
              [200, True, None])
        return body['data']

    def room(meal, count, who, preferences):
        made = call('create', who, displayName='GM41 QA host',
                    settings={'dishCount': count, 'mealSlot': meal, 'desiredAt': None}, preferences=preferences)
        room_id = made['roomId']
        snapshot = call('snapshot', who, roomId=room_id)
        check(f'{meal}/{count} pinned release', [snapshot['catalogueVersion'], snapshot['catalogueSha']],
              [identifier, sha])
        check_pool(snapshot['pool'], meal, count)
        return made

    def check_pool(pool, meal, count):
        dish_ids = [card['dishId'] for card in pool]
        check(f'{meal}/{count} pool ID count and meal membership', len(dish_ids) == len(set(dish_ids)) == count
              and all(key in by_id and meal in by_id[key]['mealSlots'] for key in dish_ids))

    if release_v1:
        for who, meal in enumerate(gm.ft.MEALS):
            room(meal, 20, who, PREFERENCES)
        return

    for who, (meal, count) in enumerate((meal, count) for meal in gm.ft.MEALS for count in (10, 20)):
        # Two requests by one guest still stay within the real per-user quota.
        room(meal, count, who % 7, PREFERENCES)

    def ranked(who, meal, pref, matches, label, witness):
        count = 10
        made = room(meal, count, who, PREFERENCES | pref)
        call('join', 6, code=made['code'], displayName='GM41 QA member')
        call('setReady', 6, roomId=made['roomId'], ready=True)
        current = call('snapshot', who, roomId=made['roomId'])
        started = call('start', who, roomId=made['roomId'], expectedVersion=current['version'])
        check(f'{label} starts voting', started['state'], 'ROUND_1')
        pool = started['pool']
        check_pool(pool, meal, count)
        available = {key for key, card in by_id.items() if meal in card['mealSlots'] and matches(card)}
        got = {card['dishId'] for card in pool} & available
        check(f'{label} has both matching and nonmatching options', 0 < len(available) < count)
        check(f'{label} ranked pool contains every eligible match', sorted(got), sorted(available))
        check(f'{label} includes named witness', any(by_id[key]['name'] == witness for key in got))

    grill = gm.ft.family_id('grill')
    ranked(0, 'lunch', {'categoryIds': [grill]}, lambda c: grill in c['categoryIds'],
           'Grill family, including Bún chả with bun + grill', 'Bún chả')
    west = gm.ft.region_id('vi_west')
    ranked(1, 'dinner', {'cuisineIds': [west]}, lambda c: west in c['cuisineIds'],
           'Miền Tây, including Hủ tiếu with two regions', 'Hủ tiếu')
    fatty = {key: {'present': key == 'fatty' or None, 'intensity': 'unknown'}
             for key in ('spicy', 'sour', 'sweet', 'salty', 'fatty')}
    ranked(2, 'snack', {'flavor': fatty}, lambda c: (c['flavor'] or {}).get('fatty', {}).get('present') is True,
           'Béo / Ngậy, including Kẹo dừa with two flavors', 'Kẹo dừa')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-manifest', type=Path, required=True)
    parser.add_argument('--release-v1', action='store_true', help='Verify the release v1 data candidate')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    report_path = validate_report(args.report)
    report_path.unlink(missing_ok=True)
    report = {'result': 'Fail', 'environment': 'owned local QA', 'checkedAt': datetime.now(timezone.utc).isoformat(),
              'credentialsRecorded': False, 'cases': []}

    def check(case, actual, expected=True):
        report['cases'].append({'case': case, 'expected': expected, 'actual': actual, 'pass': actual == expected})
        if actual != expected:
            raise AssertionError(case)

    manifest, _ = load_manifest(args.qa_manifest)
    lock = Path(manifest['workdir']) / '.gm40-import.lock'
    with lock.open('x', encoding='utf-8') as stream:
        stream.write(manifest['ownerUuid'])
    try:
        paths = [Path(__file__), Path(gm.__file__), gm.INPUT, gm.MANIFEST]
        if args.release_v1:
            paths.extend([Path(release.__file__), release.MANIFEST, *sorted(release.INPUT.glob('batch-*.csv'))])
        report['sourceSha256ByPath'] = {path.relative_to(gm.ROOT).as_posix(): gm.dc.sha(path.read_bytes())
                                         for path in paths}
        report['qa'] = exercise(args.qa_manifest, check, release_v1=args.release_v1)
        report['result'] = 'Pass'
    finally:
        lock.unlink()
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_bytes(gm.dc.encoded(report))
    print(f'GM-41: {len(report["cases"])} assertions passed. Stop the disposable QA run using qa:stop.')


if __name__ == '__main__':
    main()
