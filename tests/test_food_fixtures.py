"""Fixture integrity and authored boundaries; does not run a GM-30 algorithm."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import food_fixtures as ff


class FoodFixtureTests(unittest.TestCase):
    def setUp(self):
        self.datasets, self.suite, self.registry = ff.build_suite()
        self.cases = {r['id']: r for r in self.suite['cases']}

    def errors(self):
        return ff.validate_suite(self.datasets, self.suite, self.registry)

    def test_suite_complete(self):
        self.assertEqual(self.errors(), [])
        self.assertEqual(len(self.suite['cases']), 42)
        self.assertEqual(len(self.datasets), 27)
        self.assertEqual({r['group'] for r in self.suite['cases']}, ff.GROUPS)

    def test_pool_counts_and_soft_conflict(self):
        for name, size in [('pool-ten', 8), ('pool-eight', 8), ('pool-three', 3), ('pool-empty', 0)]:
            pool = self.cases[name]['expected']['pool']
            self.assertEqual((pool['minSize'], pool['maxSize']), (size, size))
        conflict = self.cases['preferences-conflict']
        self.assertEqual(len(conflict['expected']['eligibleOfferingIds']), 3)
        self.assertEqual(conflict['expected']['pool']['requiredCategoryCodes'], ['preparation:grilled', 'family:hotpot'])

    def test_handwritten_overnight_boundaries(self):
        expected = [
            ('night-before-open', '2026-10-09T14:59:59Z', False),
            ('night-at-open', '2026-10-09T15:00:00Z', True),
            ('night-after-midnight', '2026-10-09T17:30:00Z', True),
            ('night-before-close', '2026-10-09T18:59:59Z', True),
            ('night-at-close', '2026-10-09T19:00:00Z', False),
        ]
        for name, timestamp, has_eligible in expected:
            self.assertEqual(self.cases[name]['input']['context']['desiredAt'], timestamp)
            self.assertEqual(bool(self.cases[name]['expected']['eligibleOfferingIds']), has_eligible)
        closed = self.cases['schedule-closed-next-day']
        self.assertEqual(closed['expected']['excludedOfferings'][0]['reason'], 'closed_date_exception')
        self.assertEqual(self.datasets['night-closed-next-day']['entities']['dateExceptions'][0]['localDate'], '2026-10-10')

    def test_freshness_at_separate_clocks(self):
        self.assertEqual(self.suite['validationAt'], '2026-10-08T00:00:00Z')
        expiry = ff.find(self.datasets['source-expiry'], 'dataSources', 'menu')['validUntil']
        self.assertEqual(expiry, '2026-10-10T05:00:00Z')
        self.assertTrue(self.cases['freshness-before-expiry']['expected']['eligibleOfferingIds'])
        self.assertFalse(self.cases['freshness-at-expiry']['expected']['eligibleOfferingIds'])
        self.assertFalse(self.cases['freshness-after-expiry']['expected']['eligibleOfferingIds'])
        at_expiry = datetime(2026, 10, 10, 5, tzinfo=timezone.utc)
        self.assertTrue(ff.dc.validate(self.datasets['source-expiry'], at_expiry))
        self.assertEqual(ff.dc.validate(self.datasets['source-expiry'], ff.dc.utc(self.suite['validationAt'])), [])

    def test_unknown_and_expired_stock_are_different(self):
        for name in ['freshness-menu-unknown', 'freshness-hours-unknown', 'meal-unknown']:
            self.assertTrue(self.cases[name]['expected']['needsConfirmationOfferings'])
            self.assertFalse(self.cases[name]['expected']['eligibleOfferingIds'])
        expired = self.cases['availability-expired']['expected']
        self.assertTrue(expired['eligibleOfferingIds'])
        self.assertEqual(expired['details']['availabilityExpectation']['state'], 'unknown')
        self.assertFalse(expired['details']['availabilityExpectation']['liveStockClaim'])

    def test_alias_variant_and_two_venues(self):
        alias = self.cases['identity-alias']['expected']['details']['aliasResolutions']
        self.assertEqual(len({r['dishId'] for r in alias}), 1)
        self.assertEqual(self.cases['identity-variants']['expected']['pool']['maxSize'], 2)
        self.assertEqual(self.cases['identity-two-venues']['expected']['pool']['maxSize'], 1)
        self.assertEqual(len(self.cases['identity-two-venues']['expected']['eligibleOfferingIds']), 2)

    def test_do_not_merge_offering_profiles(self):
        rows = self.datasets['profile-split']['entities']['venueDishes']
        self.assertEqual([(r['profileOverrides']['temperature'], r['profileOverrides']['flavor']['spicy']['present'], r['priceMax']) for r in rows],
                         [('hot', False, 70000), ('cold', True, 20000)])
        self.assertEqual(self.cases['profile-no-merge']['expected']['pool']['maxSize'], 1)

    def test_unknown_price_and_group_unit(self):
        price = ff.find(self.datasets['missing-price'], 'venueDishes', 'grill-chicken')
        self.assertIsNone(price['priceMin'])
        self.assertIsNone(price['priceMax'])
        self.assertEqual(self.cases['price-missing']['expected']['pool']['maxSize'], 1)
        group = ff.find(self.datasets['group-price'], 'venueDishes', 'grill-chicken')
        self.assertEqual((group['priceMin'], group['priceMax'], group['unit']), (240000, 240000, 'group'))
        self.assertFalse(self.cases['price-group-unit']['expected']['details']['budgetComparable'])
        self.assertIsNone(self.cases['price-budget-null']['input']['context']['budget'])

    def test_context_has_explicit_normalized_time(self):
        for name in ['context-scheduled', 'context-now-buffer']:
            self.assertEqual(self.cases[name]['expected']['details']['normalizedDesiredAt'], '2026-10-10T05:00:00Z')
            self.assertEqual(self.cases[name]['input']['timeSelection']['bufferMinutes'], 15)
        self.assertTrue(self.cases['context-past']['expected']['details']['resetReady'])

    def test_identity_survives_label_change(self):
        before, _ = ff.base_dataset()
        renamed = [(k, 'Đổi tên ' + name, labels) for k, name, labels in ff.DISH_DEFINITIONS]
        with patch.object(ff, 'DISH_DEFINITIONS', renamed):
            after, _ = ff.base_dataset()
        self.assertEqual([r['id'] for r in before['entities']['dishes']], [r['id'] for r in after['entities']['dishes']])
        self.assertNotEqual(before['entities']['dishes'][0]['name'], after['entities']['dishes'][0]['name'])

    def test_real_ids_and_images_not_used(self):
        real = {r['id'] for r in json.loads((ff.BASE / 'config/base_dish_registry.json').read_text(encoding='utf-8'))['dishes']}
        for data in self.datasets.values():
            self.assertTrue(data['fixtureOnly'])
            for row in data['entities']['dishes']:
                self.assertNotIn(row['id'], real)
                self.assertIsNone(row['artwork'])
                self.assertIsNone(row['ingredientTags'])

    def test_draft_verified_simulation_cannot_publish(self):
        base = copy.deepcopy(self.datasets['base'])
        base['entities']['dishes'][0].update(reviewStatus='published', status='published')
        errors = ff.dc.validate(base, ff.dc.utc(ff.VALIDATION_AT))
        self.assertTrue(any(e['message'] == 'Fixtures cannot publish' for e in errors))
        self.datasets['base'] = base
        self.assertTrue(self.errors())

    def test_reject_duplicate_case(self):
        self.suite['cases'].append(copy.deepcopy(self.suite['cases'][0]))
        self.assertTrue(any(e['field'] == 'id' for e in self.errors()))

    def test_reject_unknown_dataset(self):
        self.suite['cases'][0]['datasetKey'] = 'missing'
        self.assertTrue(self.errors())

    def test_reject_expected_duplicate_and_unknown_fk(self):
        case = self.suite['cases'][0]['expected']
        case['eligibleOfferingIds'].append(case['eligibleOfferingIds'][0])
        self.assertTrue(self.errors())
        case['eligibleOfferingIds'][-1] = ff.fixture_id('venueDishes', 'missing')
        self.assertTrue(self.errors())

    def test_reject_pool_over_eight(self):
        self.suite['cases'][0]['expected']['pool']['maxSize'] = 9
        self.assertTrue(any(e['field'] == 'expected.pool' for e in self.errors()))

    def test_reject_false_simulation_flag(self):
        self.suite['fixtureOnly'] = False
        self.assertTrue(self.errors())
        self.suite['fixtureOnly'] = True
        self.datasets['base']['fixtureOnly'] = False
        self.assertTrue(self.errors())

    def test_reject_real_source_url(self):
        self.datasets['base']['entities']['dataSources'][0]['locator'] = 'https://food.be.com.vn/real-menu'
        self.assertTrue(any(e['field'] == 'locator' for e in self.errors()))

    def test_reject_raw_gps_context(self):
        self.suite['cases'][0]['input']['context']['hostGps'] = [10, 106]
        self.assertTrue(self.errors())

    def test_reject_missing_coverage(self):
        self.suite['cases'] = [r for r in self.suite['cases'] if r['group'] != 'overnight']
        self.assertTrue(any(e['field'] == 'groups' for e in self.errors()))

    def test_reject_malformed_price_expected(self):
        self.cases['price-missing']['expected']['details']['priceExpectation']['priceMin'] = 0
        self.assertTrue(any(e['field'] == 'expected.details.priceExpectation' for e in self.errors()))

    def test_reject_seed_comparison_drift(self):
        self.cases['determinism-repeat']['input']['poolSeed'] = 'changed-seed'
        self.assertTrue(any(e['location'] == 'comparisons' for e in self.errors()))

    def test_reject_source_change_in_order_only_comparison(self):
        self.datasets['base-reordered']['entities']['venues'][0]['lng'] = 0.01
        self.assertTrue(any(e['field'] == 'datasetKey' for e in self.errors()))

    def test_csv_roundtrip_and_deterministic_export(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            stats = ff.export(self.datasets, self.suite, self.registry, out)
            before = {str(p.relative_to(out)): p.read_bytes() for p in out.rglob('*') if p.is_file()}
            ff.export(self.datasets, self.suite, self.registry, out)
            self.assertEqual(before, {str(p.relative_to(out)): p.read_bytes() for p in out.rglob('*') if p.is_file()})
            self.assertEqual(ff.dc.read_csv_bundle(out / 'base-csv'), self.datasets['base'])
            self.assertEqual(stats['networkCalls'], 0)
            self.assertFalse(stats['eligibilityExecuted'])
            for p in (out / 'base-csv').glob('*.csv'):
                self.assertTrue(p.read_bytes().startswith(b'\xef\xbb\xbf'))

    def test_no_export_into_real_snapshot_or_seed(self):
        for path in [ff.BASE / 'snapshots/editorial-v0.2.0', ff.ROOT / 'supabase/seed']:
            with self.assertRaisesRegex(ValueError, 'restricted'):
                ff.export(self.datasets, self.suite, self.registry, path)

    def test_tracked_snapshots_match_generator(self):
        for name, expected in [('datasets.json', self.datasets), ('cases.json', self.suite), ('registry.json', self.registry)]:
            self.assertEqual(json.loads((ff.OUTPUT / name).read_text(encoding='utf-8')), expected)
        self.assertEqual(ff.dc.read_csv_bundle(ff.OUTPUT / 'base-csv'), self.datasets['base'])
        manifest = json.loads((ff.OUTPUT / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['generatorSha256'], ff.hash_file(Path(ff.__file__)))
        for filename, metadata in manifest['files'].items():
            self.assertEqual(ff.hash_file(ff.OUTPUT / filename), metadata['sha256'])


if __name__ == '__main__':
    unittest.main()
