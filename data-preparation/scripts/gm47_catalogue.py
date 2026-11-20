"""Apply the GM-47 editorial overlay to the pinned GM-41 test/demo bundle offline."""
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

import gm41_catalogue as gm41

ROOT = gm41.ROOT
OVERLAY = ROOT / 'data-preparation/editorial/gm47/descriptions.json'
IMAGE_SNAPSHOT = ROOT / 'data-preparation/config/editorial_image_candidates_v1.json'
OUTPUT = ROOT / '.work/gm47-editorial'


def build():
    dc = gm41.dc
    edit = dc.load_json(OVERLAY)
    base_bytes = gm41.BUNDLE.read_bytes()
    base_hash = dc.sha(base_bytes)
    base = dc.load_json(gm41.BUNDLE)
    manifest = dc.load_json(gm41.MANIFEST)
    if (base_hash != edit['baseSha256'] or base_hash != manifest['bundleSha256']
            or base['datasetVersion'] != edit['baseDatasetVersion']):
        raise ValueError('GM-47 editorial overlay does not match pinned GM-41 bundle')

    entities = base['entities']
    dishes = {row['id']: row for row in entities['dishes']}
    sources = {row['sourceRef']: row for row in entities['dataSources']}
    refs = {}
    for row in edit['descriptions']:
        dish_id = row['dishId']
        dish = dishes.get(dish_id)
        if (dish_id in refs or not dish or dish['name'] != row['name']
                or dish['description'] is not None or not row['description'].strip()
                or not row['note'].strip()):
            raise ValueError(f'Invalid or stale GM-47 description for {dish_id}')
        locator = urlsplit(row['locator'])
        if locator.scheme != 'https' or not locator.hostname or locator.username or locator.password:
            raise ValueError(f'Invalid GM-47 reference locator for {dish_id}')
        ref = gm41.ft.stable_id('source', 'gm47:description:' + row['locator'])
        if ref not in sources:
            source = {
                **gm41.record(ref), 'enteredBy': 'gm47-editorial', 'checkedAt': edit['checkedAt'],
                'locator': row['locator'], 'usageRights': 'unknown', 'license': None, 'attribution': None,
            }
            entities['dataSources'].append(source)
            sources[ref] = source
        dish['description'] = row['description']
        dish['fieldSources']['description'] = ref
        entities['fieldEvidence'].append({
            'dishId': dish_id, 'field': 'description', 'sourceRef': ref,
            'basis': 'editorial_summary', 'note': row['note'], 'sourceMenuItemIds': [],
        })
        refs[dish_id] = ref

    base['datasetVersion'] = edit['candidateDatasetVersion']
    gm41.validate(base)
    image_review = dc.load_json(IMAGE_SNAPSHOT)
    cached = {row['dishId']: row for row in image_review['dishes']}
    image_decisions = []
    for dish in entities['dishes']:
        if dish['artwork'] is not None:
            raise ValueError('Upstream artwork changed. Reconcile editorial rights before rebuilding.')
        snapshot = cached.get(dish['id'])
        candidates = len(snapshot['candidates']) if snapshot else 0
        reason = ('visual_review_blocked' if candidates else
                  'source_error' if snapshot and snapshot['searchStatus'] == 'error' else
                  'no_cached_candidates')
        image_decisions.append({
            'dishId': dish['id'], 'name': dish['name'], 'artwork': None,
            'cachedCandidates': candidates, 'reason': reason,
        })
    coverage = {
        meal: {
            'dishes': sum(meal in row['mealSlots'] for row in entities['dishes']),
            'withDescription': sum(meal in row['mealSlots'] and row['description'] is not None
                                   for row in entities['dishes']),
            'withArtwork': sum(meal in row['mealSlots'] and row['artwork'] is not None
                               for row in entities['dishes']),
        } for meal in gm41.ft.MEALS
    }
    summary = {
        'baseDatasetVersion': edit['baseDatasetVersion'], 'baseSha256': base_hash,
        'candidateDatasetVersion': base['datasetVersion'],
        'candidateSha256': dc.sha(dc.encoded(base)), 'usageScope': base['usageScope'],
        'descriptionSourceRefs': refs, 'coverage': coverage,
        'imageSnapshotSha256': dc.sha(IMAGE_SNAPSHOT.read_bytes()),
        'visualInspection': image_review['visualInspection'],
        'imageDecisionCounts': dict(sorted(Counter(d['reason'] for d in image_decisions).items())),
        'imageDecisions': image_decisions,
    }
    return base, summary


if __name__ == '__main__':
    bundle, report = build()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'dishes.json').write_bytes(gm41.dc.encoded(bundle))
    (OUTPUT / 'editorial-report.json').write_bytes(gm41.dc.encoded(report))
    print(f"GM-47 candidate {bundle['datasetVersion']}: {len(report['descriptionSourceRefs'])} "
          f"descriptions, {len(report['imageDecisions'])} artwork decisions, SHA {report['candidateSha256']}")
