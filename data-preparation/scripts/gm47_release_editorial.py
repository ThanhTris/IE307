"""Build a test-demo editorial candidate without changing the merged bundles."""
import re
from urllib.parse import urlsplit

import release_v1_catalogue as upstream


ROOT = upstream.ROOT
gm41 = upstream.gm
INPUT = ROOT / 'data-preparation/editorial/gm47-release/descriptions.json'
ARTWORK = INPUT.with_name('artwork-candidates.json')
OUTPUT = ROOT / '.work/gm47-release-editorial'
HANDOFF = upstream.INPUT / 'handoff.json'


def load_baseline():
    raw = upstream.BUNDLE.read_bytes()
    manifest = gm41.dc.load_json(upstream.MANIFEST)
    bundle = gm41.dc.load_json(upstream.BUNDLE)
    digest = gm41.dc.sha(raw)
    if (digest != manifest['bundleSha256'] or bundle['datasetVersion'] != manifest['datasetVersion']
            or bundle['contractVersion'] != manifest['schemaVersion']
            or gm41.dc.sha(gm41.SCHEMA.read_bytes()) != manifest['schemaSha256']
            or {key: len(rows) for key, rows in bundle['entities'].items()} != manifest['counts']):
        raise ValueError('GM-41 release bundle does not match its manifest')
    return bundle, digest


def build(*, artwork=None):
    bundle, digest = load_baseline()
    edit = gm41.dc.load_json(INPUT)
    if artwork is None:
        artwork = gm41.dc.load_json(ARTWORK)
    if (edit['baseDatasetVersion'] != bundle['datasetVersion']
            or edit['baseSha256'] != digest
            or artwork['baseDatasetVersion'] != bundle['datasetVersion']
            or artwork['baseSha256'] != digest):
        raise ValueError('GM-47 release editorial input requires the pinned GM-41 release bundle')

    entities = bundle['entities']
    dishes = {row['id']: row for row in entities['dishes']}
    sources = {row['sourceRef']: row for row in entities['dataSources']}
    description_refs = {}
    new_evidence = []
    for row in edit['descriptions']:
        dish_id = row['dishId']
        dish = dishes.get(dish_id)
        description = row['description']
        locator = urlsplit(row['locator'])
        if (dish_id in description_refs or dish is None or dish['name'] != row['name']
                or description != description.strip() or not 80 <= len(description) <= 220
                or locator.scheme != 'https' or not locator.hostname
                or locator.username is not None or locator.password is not None):
            raise ValueError(f'Invalid release description or source for {dish_id}')

        checked_at = row['checkedAt']
        gm41.dc.parse_utc(checked_at)
        upstream_ref = gm41.ft.stable_id('dataSource', f"gm41-release-v1:{checked_at}:{row['locator']}")
        ref = upstream_ref if upstream_ref in sources else gm41.ft.stable_id(
            'source', f"gm47:description:{checked_at}:{row['locator']}"
        )
        if ref not in sources:
            source = {
                **gm41.record(ref), 'enteredBy': 'gm47-editorial', 'checkedAt': checked_at,
                'locator': row['locator'], 'usageRights': 'unknown', 'license': None, 'attribution': None,
            }
            entities['dataSources'].append(source)
            sources[ref] = source
        elif sources[ref]['locator'] != row['locator']:
            raise ValueError(f'GM-47 source identity collision for {dish_id}')
        dish['description'] = description
        dish['fieldSources']['description'] = ref
        new_evidence.append({
            'dishId': dish_id, 'field': 'description', 'sourceRef': ref,
            'basis': 'editorial_summary', 'note': 'Tự viết từ nguồn tham khảo về cách chế biến hoặc phục vụ.',
            'sourceMenuItemIds': [],
        })
        description_refs[dish_id] = ref

    entities['fieldEvidence'] = [
        row for row in entities['fieldEvidence']
        if row['field'] != 'description' or row['dishId'] not in description_refs
    ] + new_evidence
    available_artwork = {}
    for row in artwork['images']:
        dish_id = row['dishId']
        dish = dishes.get(dish_id)
        license_match = re.fullmatch(r'CC (BY|BY-SA) ([234]\.0)', row['license'])
        if license_match:
            rights = 'licensed'
            license_url = f'https://creativecommons.org/licenses/{license_match[1].lower()}/{license_match[2]}/'
        elif row['license'] == 'CC0 1.0':
            rights = 'public_domain'
            license_url = 'https://creativecommons.org/publicdomain/zero/1.0/'
        elif row['license'] == 'Public domain (author release)':
            rights = 'public_domain'
            license_url = row['source']
        else:
            raise ValueError(f'Unsupported GM-47 artwork license for {dish_id}')
        gm41.dc.parse_utc(row['checkedAt'])
        source = urlsplit(row['source'])
        thumbnail = row['thumbnail']
        if (dish_id in available_artwork or dish is None or dish['name'] != row['name']
                or row['file'] != f'{dish_id}.webp' or not row['author'] or not row['attribution']
                or row['objectKey'] != f'images/{dish_id}.webp'
                or thumbnail['objectKey'] != f'thumbnails/{dish_id}.webp'
                or (thumbnail['width'], thumbnail['height']) != (400, 300)
                or not 0 < thumbnail['bytes'] <= row['bytes']
                or not re.fullmatch(r'[a-f0-9]{64}', thumbnail['sha256'])
                or min(row['width'], row['height']) < 600 or not 0 < row['bytes'] <= 200_000
                or row['width'] * 3 != row['height'] * 4 or not re.fullmatch(r'[a-f0-9]{64}', row['sha256'])
                or source.scheme != 'https' or source.netloc != 'commons.wikimedia.org'
                or not source.path.startswith('/wiki/File:')
                or row['usageRights'] != rights or row['licenseUrl'] != license_url):
            raise ValueError(f'Invalid or stale GM-47 artwork evidence for {dish_id}')
        available_artwork[dish_id] = row
    total_bytes = sum(row['bytes'] for row in available_artwork.values())
    if total_bytes != artwork['totalBytes']:
        raise ValueError('GM-47 prepared artwork byte total does not match its evidence')
    pending = {row['dishId']: row for row in artwork['awaitingImage']}
    pending_ids = dishes.keys() - available_artwork.keys()
    if (len(pending) != len(artwork['awaitingImage']) or pending.keys() != pending_ids
            or any(row['name'] != dishes[key]['name'] for key, row in pending.items())):
        raise ValueError('GM-47 pending artwork list does not match the target catalogue')

    handoff = gm41.dc.load_json(HANDOFF)
    groups = {'baseline-72': {row['id'] for row in gm41.dc.load_json(gm41.BUNDLE)['entities']['dishes']}}
    for batch in handoff['batches']:
        name = batch['path'].rsplit('/', 1)[-1].removesuffix('.csv')
        groups[name] = {row['dishId'] for row in batch['newDishes']}
    if (handoff['datasetVersion'] != bundle['datasetVersion']
            or set().union(*groups.values()) != dishes.keys()
            or sum(map(len, groups.values())) != len(dishes)):
        raise ValueError('GM-41 handoff groups do not partition the pinned bundle')
    missing_artwork = [dict(pending[dish_id], batch=name) for name, ids in groups.items()
                       for dish_id in sorted(ids & pending.keys())]

    bundle['datasetVersion'] = edit['candidateDatasetVersion']
    upstream.validate(bundle)
    coverage = {}
    for meal in gm41.ft.MEALS:
        in_meal = [row for row in dishes.values() if meal in row['mealSlots']]
        coverage[meal] = {
            'dishes': len(in_meal),
            'withDescription': sum(bool(row['description']) for row in in_meal),
            'withArtwork': sum(row['artwork'] is not None for row in in_meal),
            'preparedArtwork': sum(row['id'] in available_artwork for row in in_meal),
        }
    report = {
        'baseDatasetVersion': edit['baseDatasetVersion'], 'baseSha256': edit['baseSha256'],
        'candidateDatasetVersion': bundle['datasetVersion'], 'candidateSha256': gm41.dc.sha(gm41.dc.encoded(bundle)),
        'usageScope': bundle['usageScope'], 'descriptionSourceRefs': description_refs, 'coverage': coverage,
        'preparedArtwork': len(available_artwork), 'preparedArtworkBytes': total_bytes,
        'thumbnailBytes': sum(row['thumbnail']['bytes'] for row in available_artwork.values()),
        'artworkBatches': {
            name: {'dishes': len(ids), 'prepared': len(ids & available_artwork.keys()),
                   'pending': len(ids & pending.keys())}
            for name, ids in groups.items()
        },
        'missingDescription': [
            {'dishId': row['id'], 'name': row['name']}
            for row in dishes.values() if not 80 <= len(row['description'] or '') <= 220
        ],
        'missingArtwork': missing_artwork,
    }
    return bundle, report


if __name__ == '__main__':
    candidate, report = build()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'dishes.json').write_bytes(gm41.dc.encoded(candidate))
    (OUTPUT / 'editorial-report.json').write_bytes(gm41.dc.encoded(report))
    paths = (upstream.BUNDLE, upstream.MANIFEST, gm41.SCHEMA, INPUT, ARTWORK, HANDOFF)
    manifest = {
        'schemaVersion': candidate['contractVersion'], 'datasetVersion': candidate['datasetVersion'],
        'usageScope': candidate['usageScope'], 'fixtureOnly': candidate['fixtureOnly'], 'status': 'draft',
        'bundleSha256': report['candidateSha256'], 'schemaSha256': gm41.dc.sha(gm41.SCHEMA.read_bytes()),
        'schemaPath': gm41.SCHEMA.relative_to(ROOT).as_posix(),
        'counts': {name: len(rows) for name, rows in candidate['entities'].items()},
        'inputs': {path.relative_to(ROOT).as_posix(): gm41.dc.sha(path.read_bytes()) for path in paths},
    }
    (OUTPUT / 'manifest.json').write_bytes(gm41.dc.encoded(manifest))
    print(f"GM-47 candidate {candidate['datasetVersion']}: "
          f"{len(report['descriptionSourceRefs'])} description edits, SHA {report['candidateSha256']}")
