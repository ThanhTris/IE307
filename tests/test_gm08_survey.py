"""Survey provenance and unknowns must survive adaptation without approval."""
import csv
from copy import deepcopy
from datetime import datetime
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import gm08_prepare_survey as survey

AT = '2026-10-11T04:00:00Z'


class SurveyDraftTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = {p: survey.module.digest(p.read_bytes()) for p in
                      (survey.BASE, survey.CATALOGUE, survey.PRICES)}
        cls.bundle, cls.report, cls.sources = survey.prepare(AT)
        with survey.PRICES.open(encoding='utf-8-sig', newline='') as stream:
            cls.prices = {r['menuItemId']: r for r in csv.DictReader(stream)}

    def test_real_menu_relations_and_prices_preserved(self):
        data = self.bundle['entities']
        self.assertEqual((len(data['venues']), len(data['venueDishes']), len(data['dishes'])),
                         (21, 247, 39))
        offerings = {r['offeringId']: r for r in data['venueDishes']}
        venues = {r['id']: r for r in data['venues']}
        for source in self.sources['offerings']:
            expected = self.prices[source['menuItemId']]
            actual = offerings[source['offeringId']]
            self.assertEqual(actual['dishId'], expected['dishId'])
            self.assertEqual(venues[actual['venueId']]['address'], expected['address'])
            self.assertEqual(actual['menuName'], expected['menuName'])
            self.assertEqual(actual['menuSource'], expected['sourceRef'])
            self.assertEqual(actual['priceMin'], json.loads(expected['priceValue']))
            self.assertEqual(actual['priceMax'], actual['priceMin'])
            self.assertEqual((actual['unit'], actual['currency']),
                             (expected['unit'], expected['currency']))

    def test_no_offering_hours_service_or_review_inference(self):
        data = self.bundle['entities']
        for rows in data.values():
            for row in rows:
                self.assertEqual(row['reviewStatus'], 'draft')
                self.assertIsNone(row['validUntil'])
                self.assertIsNone(row['reviewedBy'])
        for row in data['venueDishes']:
            for key in ('scheduleId', 'serviceMode', 'artwork', 'servingSize', 'profileOverrides'):
                self.assertIsNone(row[key])
        self.assertTrue(all(v['status'] == 'unknown' and not v['serviceModes']
                            for v in data['venues']))
        self.assertEqual(data['coverageAreas'], [])
        self.assertEqual(data['publicAnchors'], [])
        self.assertEqual(data['availabilityOverrides'], [])

    def test_missing_day_not_closed_and_2359_not_24_hours(self):
        rows = self.bundle['entities']['weeklySchedules']
        self.assertEqual(len(rows), 154)
        self.assertEqual(sum(r['status'] == 'unknown' for r in rows), 1)
        self.assertTrue(any(r['endTime'] == '23:59' for r in rows))
        for r in rows:
            self.assertFalse(r['is24Hours'])
            self.assertIsNone(r['lastOrder'])
            self.assertIsNone(r['lastOrderDayOffset'])
            if r['status'] == 'unknown':
                self.assertIsNone(r['startTime'])
                self.assertIsNone(r['endTime'])
                self.assertIsNone(r['endDayOffset'])
        for venue in self.bundle['entities']['venues']:
            self.assertEqual({r['dayOfWeek'] for r in rows if r['ownerId'] == venue['id']},
                             set(range(1, 8)))

    def test_source_coordinates_dates_and_checksums_preserved(self):
        venues = {r['id']: r for r in self.bundle['entities']['venues']}
        for source in self.sources['branches']:
            row, original = venues[source['venueId']], source['observation']
            self.assertEqual((row['lat'], row['lng']),
                             (original['latitude'], original['longitude']))
            self.assertEqual(survey.module.utc(row['checkedAt']),
                             datetime.fromisoformat(original['checked_at']))
            self.assertEqual(row['fieldSources']['coordinates'], source['sourceRef'])
        self.assertEqual(self.before,
                         {p: survey.module.digest(p.read_bytes()) for p in self.before})

    def test_draft_valid_but_publication_blocked(self):
        self.assertTrue(self.report['valid'])
        self.assertFalse(self.report['verified'])
        self.assertFalse(self.report['publicationPerformed'])
        codes = {r['code'] for r in self.report['publishBlockers']}
        self.assertTrue({'REVIEW', 'RIGHTS', 'HOURS', 'COVERAGE', 'STALE'} <= codes)
        # A forged status must not turn missing real survey fields into valid rows.
        forged = deepcopy(self.bundle)
        forged['entities']['venues'][0]['reviewStatus'] = 'verified'
        result = survey.module.preflight(forged, AT)
        self.assertFalse(result['valid'])

    def test_stable_identifiers_and_deterministic_bundle(self):
        bundle, _, sources = survey.prepare(AT)
        self.assertEqual(bundle, self.bundle)
        self.assertEqual(sources, self.sources)
        ids = [r['offeringId'] for r in bundle['entities']['venueDishes']]
        self.assertEqual(len(set(ids)), 247)
        old = survey.load_json(survey.CATALOGUE)
        self.assertEqual([r['id'] for r in bundle['entities']['dishes']],
                         [r['id'] for r in old['entities']['dishes']])

    def test_pilot_has_18_original_dishes_and_preserves_all_21_branches(self):
        with survey.BASE.open(encoding='utf-8-sig') as stream:
            items = [(r['id'], item) for r in csv.DictReader(stream)
                     for item in json.loads(r['menuOfferings'])]
        selected, ids = survey.select_pilot(items, 18)
        self.assertEqual(len(ids), 18)
        self.assertEqual({item['venue_id'] for _, item in selected},
                         {item['venue_id'] for _, item in items})
        self.assertTrue(all(item in items for item in selected))
        self.assertEqual(survey.select_pilot(items, 18), (selected, ids))
        with self.assertRaisesRegex(ValueError, '15–20'):
            survey.select_pilot(items, 14)
        with self.assertRaisesRegex(ValueError, 'fresh capture'):
            survey.prepare(AT, pilot_dishes=18)

    def test_ambiguous_hours_reject_and_overnight_remains_draft(self):
        item = {'checked_at': AT, 'opening_hours_source_json': json.dumps([
            {'dayOfWeek': ['Monday'], 'opens': '00:00', 'closes': '00:00'}])}
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            survey.venue_hours(item, 'v', 's', 'source')
        item['opening_hours_source_json'] = json.dumps([
            {'dayOfWeek': ['Monday'], 'opens': '22:00', 'closes': '02:00'}])
        rows = survey.venue_hours(item, 'v', 's', 'source')
        self.assertEqual(rows[0]['endDayOffset'], 1)
        self.assertEqual(rows[0]['reviewStatus'], 'draft')
        self.assertTrue(all(r['status'] == 'unknown' for r in rows[1:]))


class FreshCaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for folder in ('raw/html', 'processed', 'reports'):
            (self.root / folder).mkdir(parents=True)
        csv.field_size_limit(10_000_000)
        with survey.BASE.open(encoding='utf-8-sig') as stream:
            dish = next(csv.DictReader(stream))
        self.dish_id = dish['id']
        self.old = json.loads(dish['menuOfferings'])[0]
        self.fresh = {k: str(v) for k, v in self.old.items()}
        self.fresh['checked_at'] = AT
        self.raw = b'fixture capture only; no real source approval'
        self.fresh['snapshot_sha256'] = survey.module.digest(self.raw)
        self.filename = self.fresh['source_id'] + '.html'
        (self.root / 'raw/html' / self.filename).write_bytes(self.raw)
        self.manifest = {'schema_version':1, 'sources':{
            self.fresh['source_id']: dict(source_url=self.fresh['source_url'],
                snapshot_file=self.filename, fetched_at=AT,
                sha256=self.fresh['snapshot_sha256'], bytes=len(self.raw))}}
        survey.module.write_json(self.root / 'raw/source_manifest.json', self.manifest)
        self.mapping = dict(menu_item_id=self.old['menu_item_id'],
                            mapping_status='candidate', mapping_reason='Fixture exact mapping')
        self.write_tables()

    def write_tables(self):
        checksums = {}
        for name, row in [('menu_items_raw', self.fresh), ('menu_dish_mapping', self.mapping)]:
            path = self.root / f'processed/{name}.csv'
            with path.open('w', encoding='utf-8', newline='') as stream:
                writer = csv.DictWriter(stream, fieldnames=list(row))
                writer.writeheader()
                writer.writerow(row)
            checksums[name] = survey.module.digest(path.read_bytes())
        survey.module.write_json(self.root / 'reports/output_checksums.json', checksums)

    def test_fresh_dates_do_not_grant_rights_or_refresh_editorial_facts(self):
        bundle, report, sources = survey.prepare(AT, self.root)
        data = bundle['entities']
        self.assertEqual(bundle['datasetVersion'], '0.4.0')
        self.assertEqual(len(data['venueDishes']), 1)
        self.assertEqual(data['venueDishes'][0]['checkedAt'], AT)
        self.assertEqual(len(sources['freshCapture']['heldHistoricalItems']), 246)
        self.assertFalse(report['publicationPerformed'])
        self.assertFalse(report['verified'])
        self.assertTrue(all(r['reviewStatus'] == 'draft' and r['validUntil'] is None
                            for rows in data.values() for r in rows))
        original = survey.adapt_food_legacy(survey.load_json(survey.CATALOGUE))
        self.assertEqual(data['dishes'], original['entities']['dishes'])
        self.assertIsNone(data['venueDishes'][0]['serviceMode'])
        self.assertIsNone(data['venueDishes'][0]['scheduleId'])

    def test_capture_byte_csv_and_row_provenance_tampering_reject(self):
        history = [(self.dish_id, self.old)]
        path = self.root / 'raw/html' / self.filename
        path.write_bytes(b'modified')
        with self.assertRaisesRegex(ValueError, 'HTML checksum'):
            survey.capture_observations(self.root, history)
        path.write_bytes(self.raw)
        csv_path = self.root / 'processed/menu_items_raw.csv'
        csv_path.write_bytes(csv_path.read_bytes() + b'\n')
        with self.assertRaisesRegex(ValueError, 'CSV checksum'):
            survey.capture_observations(self.root, history)
        self.fresh['checked_at'] = '2026-10-10T00:00:00Z'
        self.write_tables()
        with self.assertRaisesRegex(ValueError, 'provenance'):
            survey.capture_observations(self.root, history)

    def test_renamed_missing_or_reclassified_item_never_inherits_old_dish(self):
        history = [(self.dish_id, self.old)]
        self.fresh['menu_name_raw'] = 'A different menu item'
        self.write_tables()
        selected, report = survey.capture_observations(self.root, history)
        self.assertEqual(selected, [])
        self.assertEqual(report['heldHistoricalItems'][0]['reason'],
                         'source_identity_or_menu_name_changed')
        self.fresh['menu_name_raw'] = self.old['menu_name_raw']
        self.mapping['mapping_status'] = 'needs_review'
        self.write_tables()
        selected, report = survey.capture_observations(self.root, history)
        self.assertEqual(selected, [])
        self.assertEqual(report['heldHistoricalItems'][0]['reason'], 'classifier_requires_review')
        selected, report = survey.capture_observations(self.root, [(self.dish_id,
                            dict(self.old, menu_item_id='missing'))])
        self.assertEqual(selected, [])
        self.assertEqual(len(report['unassignedItems']), 1)


if __name__ == '__main__':
    unittest.main()
