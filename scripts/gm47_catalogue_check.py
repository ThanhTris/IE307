"""Check GM-47 exact projection/readback in a disposable GM-03 QA database."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import UUID

from gm40_manifest_check import ManifestQAContainerDB, load_manifest, p, verify_manifest
from gm47_catalogue import build, gm41
import gm47_release_editorial as release_editorial


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-manifest', type=Path, required=True)
    parser.add_argument('--release-editorial', action='store_true',
                        help='Check the GM-47 editorial overlay against the GM-41 release bundle')
    parser.add_argument('--storage-receipt', type=Path,
                        help='Use verified Storage objects when checking the release candidate')
    args = parser.parse_args()
    if args.storage_receipt and not args.release_editorial:
        parser.error('--storage-receipt requires --release-editorial')
    if args.release_editorial:
        base, _ = release_editorial.load_baseline()
        receipt = gm41.dc.load_json(args.storage_receipt) if args.storage_receipt else None
        bundle, report = release_editorial.build(storage_receipt=receipt)
    else:
        base = gm41.dc.load_json(gm41.BUNDLE)
        bundle, report = build()
    manifest, state = load_manifest(args.qa_manifest)
    verify_manifest(args.qa_manifest, manifest)
    db = ManifestQAContainerDB(args.qa_manifest, state['worker']['nonce'])
    owner = UUID(manifest['ownerUuid'])
    p.upstream.owned(db, owner)

    old_cards = {card['dishId']: card for card in p.received.cards(base)}
    cards = p.received.cards(bundle)
    changes = report['descriptionSourceRefs']
    linked = report.get('linkedArtwork', {})
    assert len(cards) == len(old_cards)
    for card in cards:
        old = old_cards[card['dishId']]
        diff = {key for key in card if card[key] != old[key]}
        expected = {'description'} if card['dishId'] in changes and card['description'] != old['description'] else set()
        if card['dishId'] in linked:
            assert card['artwork']['url'] == linked[card['dishId']]['url']
            expected.add('artwork')
        assert diff == expected, card['dishId']
    active_before = db.psql('select id from dish_v3_private.catalogues where active;')
    release = p.received.release_id(bundle)
    digest = report['candidateSha256']
    db.transaction(p.upstream.import_sql(bundle, digest, activate=False,
                                         projected_cards=cards, release_identifier=release))
    readback = p.readback(db, owner, release)
    assert readback['cards'] == cards and readback['source_sha'] == digest
    assert readback['test_only'] and not readback['active']
    assert db.psql('select id from dish_v3_private.catalogues where active;') == active_before
    result = {
        'result': 'Pass', 'checkedAt': datetime.now(timezone.utc).isoformat(),
        'repositoryRevision': manifest['sourceRevision'], 'qaSealSha256': manifest['sealSha256'],
        'releaseId': release, 'candidateSha256': digest, 'cardCount': len(cards),
        'editorialDescriptions': len(changes),
        'changedDescriptions': sum(card['description'] != old_cards[card['dishId']]['description'] for card in cards),
        'selectedArtwork': len(linked),
        'exactReadback': True, 'activeReleaseUnchanged': True, 'testOnly': True,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
