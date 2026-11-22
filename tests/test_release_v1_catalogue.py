"""Protect the GM-41 expansion and its links to the merged catalogue releases."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'data-preparation/scripts'), str(ROOT / 'scripts')]
import release_catalogue_check as floor
import release_v1_catalogue as release


class ReleaseV1CatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle, cls.batches = release.build()

    def test_reproducible_bundle_keeps_ids_and_prices_from_merged_release(self):
        for path, content in release.outputs().items():
            self.assertEqual(path.read_bytes(), content, path.name)
        self.assertEqual(self.bundle['usageScope'], 'test_demo')
        base = release.dc.load_json(release.gm.BUNDLE)['entities']
        data = self.bundle['entities']
        dishes = {dish['id']: dish for dish in data['dishes']}
        for baseline in base['dishes']:
            candidate = dishes[baseline['id']]
            for field in ('name', 'aliases', 'sourceDishIds', 'origin'):
                self.assertEqual(candidate[field], baseline[field])
            self.assertGreaterEqual(candidate['version'], baseline['version'])
        self.assertTrue(all(price in data['priceReferences'] for price in base['priceReferences']))
        added = [row['dishId'] for batch in self.batches for row in batch['newDishes']]
        self.assertEqual(set(added), dishes.keys() - {dish['id'] for dish in base['dishes']})
        self.assertEqual(len(added), len(set(added)))

    def test_observations_have_individual_sources_and_dates(self):
        entities = self.bundle['entities']
        sources = {source['sourceRef']: source for source in entities['dataSources']}
        evidence = {(item['dishId'], item['field']): item for item in entities['fieldEvidence']}
        for batch in self.batches:
            for row in release.read_batch(ROOT / batch['path']):
                for column, field in release.gm.FIELDS.items():
                    for value in release.ft.split(row[column]):
                        note = json.loads(evidence[row['dishId'], field]['note'])
                        origins = [sources[item['sourceRef']] for item in note['observations'] if item['value'] == value]
                        self.assertTrue(any(source['locator'] == row['sourceRef']
                                            and source['checkedAt'] == row['checkedAt'] for source in origins),
                                        (row['name'], column, value))

    def test_merged_burger_category_alone_cannot_pass_display_group_check(self):
        bundle = deepcopy(self.bundle)
        burger = next(dish for dish in bundle['entities']['dishes'] if dish['name'] == 'Burger')
        burger['categoryIds'] = [release.ft.family_id('burger')]
        with self.assertRaisesRegex(ValueError, 'Burger: no display group'):
            release.validate(bundle)

    def test_all_data_thresholds_pass_before_gm47_editorial_review(self):
        report = floor.evaluate(release.BUNDLE)
        failures = {entry['check'] for entry in report['checks'] if not entry['pass']}
        self.assertEqual(failures, {'Món có mô tả', 'Món có ảnh hợp lệ (url, quyền, license, ghi công)'})


if __name__ == '__main__':
    unittest.main()
