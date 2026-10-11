#!/usr/bin/env python3
"""Copy real frozen menu observations into a food1.1.0 draft; never verify/publish."""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from uuid import NAMESPACE_URL, uuid5

from gm08_prepare_draft import ROOT, adapt_food_legacy, load_json, module

BASE = ROOT / 'data-preparation/snapshots/thu_duc_base_dishes.csv'
CATALOGUE = ROOT / 'data-preparation/snapshots/editorial-v0.2.0/catalogue.json'
PRICES = ROOT / 'data-preparation/snapshots/editorial-v0.2.0/price_references.csv'
DAYS = {day: n for n, day in enumerate(
    ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), 1)}
DATASET_VERSION = '0.3.0'
ACTOR = 'gm08-survey-adapter'


def stable_id(entity, key):
    return str(uuid5(NAMESPACE_URL, f'ThanhTris/IE307/GM-08/{entity}/{key}'))


def metadata(source_ref, checked_at, groups=()):
    return dict(version=1, reviewStatus='draft', sourceRef=source_ref,
                fieldSources={group: source_ref for group in groups},
                checkedAt=datetime.fromisoformat(checked_at).astimezone(timezone.utc)
                .isoformat().replace('+00:00', 'Z'), validUntil=None,
                enteredBy=ACTOR, reviewedBy=None)


def venue_hours(item, venue_id, schedule_id, source_ref):
    """Source platform hours only; missing days remain unknown, never closed."""
    rows = []
    seen_days = set()
    for entry in json.loads(item['opening_hours_source_json']):
        start, end = entry['opens'], entry['closes']
        # A same-time pair is ambiguous, not proof of 24-hour service.
        if start == end:
            raise ValueError('Ambiguous equal opening/closing times; manual survey required')
        for day in entry['dayOfWeek']:
            number = DAYS[day.rsplit('/', 1)[-1]]
            seen_days.add(number)
            rows.append(dict(metadata(source_ref, item['checked_at'], ('hours',)),
                id=stable_id('weeklySchedules', f'{schedule_id}/{number}/{start}/{end}'),
                scheduleId=schedule_id, ownerType='venue', ownerId=venue_id,
                dayOfWeek=number, startTime=start, endTime=end,
                endDayOffset=int(end < start), is24Hours=False,
                timezone='Asia/Ho_Chi_Minh', status='open',
                lastOrder=None, lastOrderDayOffset=None))
    for number in sorted(set(range(1, 8)) - seen_days):
        rows.append(dict(metadata(source_ref, item['checked_at']),
            id=stable_id('weeklySchedules', f'{schedule_id}/{number}/unknown'),
            scheduleId=schedule_id, ownerType='venue', ownerId=venue_id,
            dayOfWeek=number, startTime=None, endTime=None, endDayOffset=None,
            is24Hours=False, timezone='Asia/Ho_Chi_Minh', status='unknown',
            lastOrder=None, lastOrderDayOffset=None))
    return rows


def capture_observations(capture_dir, historical):
    """Bind a fresh observation to captured HTML and the existing dish mapping.

    New/changed items are reported for review, never silently assigned a dish.
    A retrieval timestamp proves observation, not approval or a validity window.
    """
    capture_dir = Path(capture_dir)
    manifest = load_json(capture_dir / 'raw/source_manifest.json')
    checksums = load_json(capture_dir / 'reports/output_checksums.json')
    files = {}
    tables = {}
    for name in ('menu_items_raw', 'menu_dish_mapping'):
        path = capture_dir / f'processed/{name}.csv'
        files[str(path.relative_to(capture_dir))] = module.digest(path.read_bytes())
        if files[str(path.relative_to(capture_dir))] != checksums[name]:
            raise ValueError(f'Capture CSV checksum mismatch: {name}')
        with path.open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
        tables[name] = {r['menu_item_id']: r for r in rows}
        if len(rows) != len(tables[name]):
            raise ValueError(f'Duplicate captured menu item: {name}')
    for source_id, source in manifest['sources'].items():
        filename = source['snapshot_file']
        if Path(filename).name != filename:
            raise ValueError('Capture snapshot must be a filename')
        raw = (capture_dir / 'raw/html' / filename).read_bytes()
        if module.digest(raw) != source['sha256'] or len(raw) != source['bytes']:
            raise ValueError(f'Capture HTML checksum mismatch: {source_id}')
    selected, held = [], []
    raw_items, mappings = tables['menu_items_raw'], tables['menu_dish_mapping']
    for dish_id, old in historical:
        item = raw_items.get(old['menu_item_id'])
        mapping = mappings.get(old['menu_item_id'])
        reason = None
        if not item or not mapping:
            reason = 'not_observed_in_fresh_capture'
        elif mapping['mapping_status'] != 'candidate':
            reason = 'classifier_requires_review'
        elif any(item[k] != str(old[k]) for k in
                 ('venue_id', 'source_url', 'menu_name_raw', 'platform_item_id')):
            reason = 'source_identity_or_menu_name_changed'
        if reason:
            held.append(dict(dishId=dish_id, menuItemId=old['menu_item_id'], reason=reason))
            continue
        source = manifest['sources'].get(item['source_id'])
        if not source or any((source['source_url'] != item['source_url'],
                              source['sha256'] != item['snapshot_sha256'],
                              source['fetched_at'] != item['checked_at'])):
            raise ValueError('Captured item provenance does not match its HTML manifest')
        # Restore numeric JSON types; names, price units, hours and metadata stay literal.
        item = dict(item, latitude=json.loads(item['latitude']),
                    longitude=json.loads(item['longitude']),
                    mapping_reason=mapping['mapping_reason'])
        selected.append((dish_id, item))
    historical_ids = {item['menu_item_id'] for _, item in historical}
    unassigned = [dict(menuItemId=r['menu_item_id'], venueSurveyId=r['venue_id'],
                       menuName=r['menu_name_raw'], sourceUrl=r['source_url'],
                       mappingStatus=mappings[r['menu_item_id']]['mapping_status'])
                  for r in raw_items.values() if r['menu_item_id'] not in historical_ids]
    return selected, dict(sourceManifest=manifest, inputFiles=files,
        mappedHistoricalItems=len(selected), heldHistoricalItems=held,
        unassignedItems=unassigned, publicationPerformed=False)


def select_pilot(menu_items, count):
    """Choose a reproducible review scope covering every observed branch."""
    by_dish = defaultdict(set)
    for dish_id, item in menu_items:
        by_dish[dish_id].add(item['venue_id'])
    if not 15 <= count <= 20 or count > len(by_dish):
        raise ValueError('Pilot must contain 15–20 observed dishes')
    uncovered = set().union(*by_dish.values())
    selected = []
    while uncovered:
        candidate = min((d for d in by_dish if d not in selected),
                        key=lambda d: (-len(by_dish[d] & uncovered), d))
        selected.append(candidate)
        uncovered -= by_dish[candidate]
        if len(selected) > count:
            raise ValueError('Pilot dish limit cannot cover every observed branch')
    for dish_id in sorted(by_dish, key=lambda d: (-len(by_dish[d]), d)):
        if len(selected) == count:
            break
        if dish_id not in selected:
            selected.append(dish_id)
    return [(d, item) for d, item in menu_items if d in selected], selected


def prepare(as_of, capture_dir=None, pilot_dishes=None):
    bundle = adapt_food_legacy(load_json(CATALOGUE))
    data = bundle['entities']
    source_index = {row['locator']: row['sourceRef'] for row in data['dataSources']}
    csv.field_size_limit(10_000_000)
    with BASE.open(encoding='utf-8-sig', newline='') as stream:
        bases = list(csv.DictReader(stream))
    menu_items = []
    for dish in bases:
        for item in json.loads(dish['menuOfferings']):
            menu_items.append((dish['id'], item))
    capture = None
    if capture_dir is not None:
        menu_items, capture = capture_observations(capture_dir, menu_items)
        if not menu_items:
            raise ValueError('No mapped observations in fresh capture')
        by_url = {r['source_url']: r for r in capture['sourceManifest']['sources'].values()}
        for row in data['dataSources']:
            if row['locator'] in by_url:
                row['checkedAt'] = metadata(row['sourceRef'], by_url[row['locator']]['fetched_at'])['checkedAt']
    pilot = None
    if pilot_dishes is not None:
        if capture is None:
            raise ValueError('Pilot selection requires a fresh capture')
        menu_items, chosen = select_pilot(menu_items, pilot_dishes)
        omitted = [r['id'] for r in data['dishes'] if r['id'] not in chosen]
        data['dishes'] = [r for r in data['dishes'] if r['id'] in chosen]
        pilot = dict(selection='greedy branch coverage, then branch count and stable dish ID',
                     selectedDishIds=chosen, omittedDishIds=omitted,
                     verified=False, independentReview='Pending')
    groups = defaultdict(list)
    for _, item in menu_items:
        groups[item['venue_id']].append(item)
    if len({item['menu_item_id'] for _, item in menu_items}) != len(menu_items):
        raise ValueError('Duplicate source menu item; manual mapping required')
    source_records = {'branches': [], 'offerings': []}
    for survey_id, items in sorted(groups.items()):
        first = items[0]
        # Never silently merge conflicting branch/price-source metadata.
        fields = ('venue_name', 'address', 'latitude', 'longitude', 'source_url',
                  'source_id', 'checked_at', 'snapshot_sha256', 'opening_hours_source_json')
        if any(item[key] != first[key] for item in items for key in fields):
            raise ValueError(f'Conflicting branch observations: {survey_id}')
        source_ref = source_index[first['source_url']]
        venue_id = stable_id('venues', survey_id)
        schedule_id = stable_id('scheduleGroups', survey_id)
        data['venues'].append(dict(metadata(source_ref, first['checked_at'],
            ('name', 'address', 'coordinates', 'hours')), id=venue_id,
            branchName=first['venue_name'], address=first['address'], adminAreaId=None,
            lat=first['latitude'], lng=first['longitude'], timezone='Asia/Ho_Chi_Minh',
            status='unknown', serviceModes=[], scheduleId=schedule_id))
        data['weeklySchedules'].extend(venue_hours(first, venue_id, schedule_id, source_ref))
        source_records['branches'].append(dict(venueSurveyId=survey_id, venueId=venue_id,
            scheduleId=schedule_id, sourceRef=source_ref,
            observation={key: first[key] for key in fields},
            scope='Captured platform listing hours/coordinates; physical venue not independently verified'))
    for dish_id, item in sorted(menu_items, key=lambda pair: pair[1]['menu_item_id']):
        source_ref = source_index[item['source_url']]
        offering_id = stable_id('venueDishes', item['menu_item_id'])
        price = json.loads(item['price_value']) if isinstance(item['price_value'], str) else item['price_value']
        # Preserve the literal named menu variant, without inferring its portion.
        data['venueDishes'].append(dict(metadata(source_ref, item['checked_at'], ('menu', 'price')),
            offeringId=offering_id, venueId=stable_id('venues', item['venue_id']),
            dishId=dish_id, variant=item['menu_name_raw'], menuName=item['menu_name_raw'],
            menuSource=source_ref, scheduleId=None, serviceMode=None,
            priceMin=price, priceMax=price,
            unit=item['price_unit'], currency=item['currency'], servingSize=None,
            profileOverrides=None, artwork=None, status='draft'))
        source_records['offerings'].append(dict(offeringId=offering_id, dishId=dish_id,
            menuItemId=item['menu_item_id'], sourceRef=source_ref,
            observation={key: item[key] for key in (
                'venue_id', 'menu_name_raw', 'price_raw', 'price_value', 'price_unit',
                'currency', 'source_url', 'checked_at', 'snapshot_sha256',
                'mapping_reason', 'metadata_match_status', 'service_mode', 'availability')}))
    version = '0.4.1' if pilot else '0.4.0' if capture else DATASET_VERSION
    bundle['datasetVersion'] = version
    dataset = data['datasetVersions'][0]
    dataset.update(id=stable_id('datasetVersions', version),
                   datasetVersion=version, artifactLocator='bundle.json',
                   qualityReport='audit.json', enteredBy=ACTOR)
    report = module.preflight(bundle, as_of)
    if not report['valid']:
        raise ValueError(f"{len(report['errors'])} contract errors: {report['errors'][:5]}")
    report.update(state='survey_draft', verified=False,
        sourceFiles={str(path.relative_to(ROOT)): module.digest(path.read_bytes())
                     for path in (BASE, CATALOGUE, PRICES)},
        observations=dict(branches=len(groups), menuItems=len(menu_items)),
        missingOfferingSchedules=len(data['venueDishes']),
        unknownVenueWeekdays=sum(row['status'] == 'unknown' for row in data['weeklySchedules']),
        publishBlockers=module.preflight(bundle, as_of, publish=True)['errors'],
        limitations=[
            'Real historical menu observations, not synthetic or independently verified',
            'Source retrieval dates retained; no fresh survey or arbitrary validity extension',
            'Platform hours are draft venue observations; no offering hours or dine_in inferred',
            'Missing weekdays unknown; 23:59 not interpreted as 24 hours; last order unknown',
            'All rows draft; reviewer/expiry/license/coverage/anchor not invented',
            'All 39 draft dishes retained; pilot selection and quota need independent review',
            'Raw menu names retained as named variants; no portion/person-price inference'])
    report['publishBlockersByCode'] = dict(sorted(Counter(
        error['code'] for error in report['publishBlockers']).items()))
    if capture:
        source_records['freshCapture'] = capture
        report['state'] = 'fresh_survey_draft'
        report['captureInputFiles'] = capture['inputFiles']
        report['limitations'][0:2] = [
            'Fresh public HTML capture, not independent field verification',
            'Only observed source/venue/offering dates refreshed; editorial dish dates retained; no validity extension']
    if pilot:
        source_records['pilotSelection'] = pilot
        report['limitations'][5] = 'Pilot dishes selected from existing IDs to cover observed branches; selection/content still need independent review'
    return bundle, report, source_records


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='strict', newline='\n')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--as-of', default=None)
    parser.add_argument('--capture-dir', type=Path,
                        help='Fresh crawler output with HTML manifest and CSV checksums; no network')
    parser.add_argument('--pilot-dishes', type=int,
                        help='Select 15–20 observed dishes while retaining all observed branches')
    args = parser.parse_args()
    at = args.as_of or module.now()
    bundle, report, sources = prepare(at, args.capture_dir, args.pilot_dishes)
    args.output_dir.mkdir(parents=True, exist_ok=False)
    module.write_json(args.output_dir / 'bundle.json', bundle)
    report['candidateSha256'] = module.digest((args.output_dir / 'bundle.json').read_bytes())
    module.write_json(args.output_dir / 'audit.json', report)
    module.write_json(args.output_dir / 'source-records.json', sources)
    print('Draft survey only; no DB/network/publication: ' + str(args.output_dir))


if __name__ == '__main__':
    main()
