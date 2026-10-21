"""Offline GM-40 contract tests; these do not claim SQL/API or approval evidence."""
from copy import deepcopy
import csv
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import dish_catalogue as catalogue


class DishCatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = catalogue.load_json(ROOT / 'tests/fixtures/dish-catalogue-v1/minimal.json')
        cls.artifacts = catalogue.build()
        cls.real = json.loads(cls.artifacts[catalogue.BUNDLE_PATH])

    def setUp(self):
        self.bundle = deepcopy(self.fixture)
        self.data = self.bundle['entities']
        self.dish = self.data['dishes'][0]
        self.source = self.data['dataSources'][0]

    def errors(self):
        return catalogue.validate(self.bundle)

    def test_real_bundle_and_empty_template_without_venues(self):
        self.assertEqual(catalogue.validate(self.real), [])
        self.assertEqual(self.errors(), [])
        template = json.loads(self.artifacts['supabase/seed/templates/dish-catalogue-v1.template.json'])
        self.assertEqual(catalogue.validate(template), [])
        self.assertTrue(template['fixtureOnly'])
        self.assertEqual(set(self.real['entities']), {'dishes', 'taxonomy', 'dataSources', 'priceReferences', 'fieldEvidence'})

    def test_all_legacy_dish_values_and_ids_preserved(self):
        old = catalogue.load_json(ROOT / catalogue.INPUTS[4])['entities']['dishes']
        expected = {r['id']: r for r in old}
        actual = {r['id']: {k: v for k, v in r.items() if k != 'preparationMethods'} for r in self.real['entities']['dishes']}
        self.assertEqual(expected, actual)
        self.assertEqual(len(actual), 39)
        gm08 = catalogue.load_json(ROOT / catalogue.INPUTS[7])['entities']['dishes']
        self.assertEqual(len(gm08), 18)
        self.assertTrue({r['id'] for r in gm08} <= actual.keys())

    def test_mapping_219_rows_and_no_variant_promoted_to_alias(self):
        mapping = catalogue.load_json(ROOT / catalogue.INPUTS[3])['mapping']
        self.assertEqual(len(mapping), 219)
        dishes = {r['id']: r for r in self.real['entities']['dishes']}
        for row in mapping:
            if row['status'] == 'mapped':
                self.assertIn(row['sourceDishId'], dishes[row['baseDishId']]['sourceDishIds'])
        self.assertEqual(sum(r['status'] == 'mapped' for r in mapping), 216)
        self.assertEqual(sum(r['status'] == 'needs_review' for r in mapping), 2)
        self.assertEqual(sum(r['status'] == 'excluded' for r in mapping), 1)

    def test_price_observations_preserve_amount_unit_and_source(self):
        with (ROOT / catalogue.INPUTS[5]).open(encoding='utf-8-sig', newline='') as stream:
            source = list(csv.DictReader(stream))
        expected = {(r['dishId'], r['menuItemId'], r['snapshotSha256']): r for r in source}
        actual = self.real['entities']['priceReferences']
        self.assertEqual(len(expected), 247)
        self.assertEqual(len(actual), 247)
        for row in actual:
            old = expected[(row['dishId'], row['sourceMenuItemId'], row['snapshotSha256'])]
            self.assertEqual(row['value'], float(old['priceValue']) if old['priceValue'] else None)
            for key in ['unit', 'currency', 'sourceRef', 'priceRaw']:
                self.assertEqual(row[key], old[key] or None)
            self.assertEqual(row['checkedAt'], catalogue.utc(old['checkedAt']))
            self.assertNotIn('venueId', row)
            self.assertNotIn('venueName', row)

    def test_two_offline_builds_identical_and_saved_artifacts_current(self):
        self.assertEqual(self.artifacts, catalogue.build())
        for path, content in self.artifacts.items():
            self.assertEqual((ROOT / path).read_bytes(), content, path)
        manifest = json.loads(self.artifacts[catalogue.MANIFEST_PATH])
        self.assertEqual(manifest['bundleSha256'], catalogue.sha(self.artifacts[catalogue.BUNDLE_PATH]))
        self.assertEqual(manifest['schemaSha256'], catalogue.sha(self.artifacts[catalogue.SCHEMA_PATH]))

    def test_null_missing_price_image_and_unknown_labels_valid(self):
        self.assertIsNone(self.dish['artwork'])
        self.assertIsNone(self.dish['flavor'])
        self.assertEqual(self.dish['mealSlots'], [])
        self.assertEqual(self.errors(), [])

    def test_required_name_and_wrong_primitive_types(self):
        for field, value in [('name', None), ('version', True), ('aliases', None), ('temperature', False)]:
            with self.subTest(field=field):
                self.bundle = deepcopy(self.fixture)
                self.data = self.bundle['entities']
                self.data['dishes'][0][field] = value
                self.assertTrue(self.errors())
        del self.data['dishes'][0]['name']
        self.assertTrue(self.errors())

    def test_duplicate_id_rejected(self):
        row = deepcopy(self.dish)
        row['name'] = 'Món khác'
        self.data['dishes'].append(row)
        self.assertIn('DUPLICATE', {e['code'] for e in self.errors()})

    def test_alias_same_id_and_rename_do_not_create_identity(self):
        original = self.dish['id']
        self.dish['name'] = 'Tên mới mô phỏng'
        self.dish['aliases'] = ['Tên khác tương đương']
        self.data['fieldEvidence'].append({**self.data['fieldEvidence'][0], 'field': 'aliases'})
        self.assertEqual(self.errors(), [])
        self.assertEqual(self.dish['id'], original)
        self.assertEqual(len(self.data['dishes']), 1)

    def test_accent_case_whitespace_and_unicode_alias_collisions(self):
        for alias in ['  MÓN MÔ PHỎNG A ', 'Món mô phỏng A']:
            self.dish['aliases'] = [alias]
            self.assertIn('NAME_COLLISION', {e['code'] for e in self.errors()})
        self.assertNotEqual(catalogue.normalize('cốm'), catalogue.normalize('cơm'))
        self.assertNotEqual(catalogue.normalize('chạo'), catalogue.normalize('cháo'))

    def test_unknown_taxonomy_and_wrong_type_rejected(self):
        self.dish['cuisineIds'] = [self.dish['id']]
        self.assertIn('FK', {e['code'] for e in self.errors()})
        taxonomy = deepcopy(self.real['entities']['taxonomy'][0])
        taxonomy.update(sourceRef=self.source['sourceRef'], fieldSources={})
        self.data['taxonomy'] = [taxonomy]
        self.dish['cuisineIds'] = [taxonomy['id']]
        self.assertEqual(taxonomy['type'], 'category')
        self.assertIn('FK', {e['code'] for e in self.errors()})

    def test_missing_source_and_field_evidence_rejected(self):
        self.data['dataSources'] = []
        self.assertIn('FK', {e['code'] for e in self.errors()})
        self.data['dataSources'] = [self.source]
        self.data['fieldEvidence'] = []
        self.assertIn('EVIDENCE', {e['code'] for e in self.errors()})

    def test_no_automatic_review_promotion(self):
        for value in ['verified', 'published']:
            self.dish['reviewStatus'] = value
            self.assertIn('REVIEW', {e['code'] for e in self.errors()})
        self.dish['reviewStatus'] = 'draft'
        self.dish['reviewedBy'] = 'invented-reviewer'
        self.assertIn('REVIEW', {e['code'] for e in self.errors()})

    def test_images_need_rights_on_both_image_and_source(self):
        self.dish['artwork'] = {'url': 'https://example.invalid/picture.jpg',
                               'sourceRef': self.source['sourceRef'], 'usageRights': 'unknown',
                               'license': None, 'attribution': None}
        self.assertIn('RIGHTS', {e['code'] for e in self.errors()})
        self.dish['artwork'].update(usageRights='licensed', license='CC0-1.0', attribution='Simulated author')
        self.assertIn('RIGHTS', {e['code'] for e in self.errors()})
        self.source.update(usageRights='licensed', license='CC0-1.0', attribution='Simulated author')
        self.assertEqual(self.errors(), [])

    def price(self):
        row = deepcopy(self.real['entities']['priceReferences'][0])
        row.update(dishId=self.dish['id'], sourceRef=self.source['sourceRef'])
        self.data['priceReferences'] = [row]
        return row

    def test_null_price_is_not_zero_and_no_per_person_conversion(self):
        row = self.price()
        row.update(value=None, currency=None, unit=None)
        self.assertEqual(self.errors(), [])
        self.assertIsNone(row['value'])
        row.update(value=0, currency='VND', unit='menu_item_unspecified')
        self.assertEqual(self.errors(), [])
        self.assertEqual(row['unit'], 'menu_item_unspecified')

    def test_negative_nonfinite_or_missing_price_unit_rejected(self):
        row = self.price()
        for value in [-1, float('nan'), float('inf')]:
            row['value'] = value
            self.assertTrue(self.errors())
        row.update(value=50000, unit=None)
        self.assertIn('UNIT', {e['code'] for e in self.errors()})

    def test_datetime_invalid_or_expiry_before_observation_rejected(self):
        self.dish['checkedAt'] = '2026-02-30T00:00:00Z'
        self.assertIn('TIME', {e['code'] for e in self.errors()})
        self.dish['checkedAt'] = '2026-01-01T00:00:00Z'
        self.dish['validUntil'] = '2025-12-31T00:00:00Z'
        self.assertIn('TIME', {e['code'] for e in self.errors()})

    def test_expired_source_is_structural_data_not_current_availability(self):
        self.source['validUntil'] = '2026-01-02T00:00:00Z'
        self.assertEqual(self.errors(), [])  # no clock-dependent eligibility/publish claim

    def test_expiry_comparison_handles_fractional_seconds(self):
        self.dish['checkedAt'] = '2026-01-01T00:00:00Z'
        self.dish['validUntil'] = '2026-01-01T00:00:00.1Z'
        self.assertEqual(self.errors(), [])
        self.dish['checkedAt'], self.dish['validUntil'] = self.dish['validUntil'], self.dish['checkedAt']
        self.assertIn('TIME', {e['code'] for e in self.errors()})

    def test_no_restaurant_entities_or_fake_venue_fields_accepted(self):
        for name in ['venues', 'venueDishes', 'weeklySchedules', 'coverageAreas', 'publicAnchors']:
            self.data[name] = []
            self.assertTrue(self.errors())
            del self.data[name]
        self.dish['venueId'] = self.dish['id']
        self.assertTrue(self.errors())

    def test_duplicate_json_keys_and_nonfinite_tokens_rejected_at_read_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'invalid.json'
            for text in ['{"name": "a", "name": "b"}', '{"price": NaN}']:
                path.write_text(text)
                with self.assertRaises(ValueError):
                    catalogue.load_json(path)


if __name__ == '__main__':
    unittest.main()
