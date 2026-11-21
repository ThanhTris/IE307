"""Guard GM-40 compatibility and GM-41 draft provenance/coverage."""
from copy import deepcopy
import csv
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import gm41_catalogue as gm


class GM41CatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = gm.build_bundle()
        cls.base = gm.dc.load_json(ROOT / gm.dc.BUNDLE_PATH)

    def test_build_output_is_reproducible_and_retains_original_entities(self):
        for path, raw in gm.outputs().items():
            self.assertEqual(path.read_bytes(), raw, path.name)
        before, after = self.base['entities'], self.bundle['entities']
        dishes = {row['id']: row for row in after['dishes']}
        for row in before['dishes']:
            received = dishes[row['id']]
            self.assertEqual(received['name'], row['name'])
            self.assertEqual(received['sourceDishIds'], row['sourceDishIds'])
            self.assertEqual(received['origin'], row['origin'])
            self.assertTrue(set(row['categoryIds']) <= set(received['categoryIds']))
        self.assertTrue(all(row in after['priceReferences'] for row in before['priceReferences']))
        self.assertFalse(gm.dc.validate(self.base))
        self.assertTrue(gm.dc.validate(self.bundle))

    def test_rich_schema_rejects_inconsistent_fatty_and_duplicate_tags(self):
        bundle = deepcopy(self.bundle)
        candy = next(d for d in bundle['entities']['dishes'] if d['name'] == 'Kẹo dừa')
        candy['flavor']['fatty'] = {'present': None, 'intensity': 'high'}
        with self.assertRaisesRegex(ValueError, 'FLAVOR'):
            gm.validate(bundle)
        candy['flavor']['fatty']['intensity'] = 'unknown'
        candy['mealSlots'].append('snack')
        with self.assertRaisesRegex(ValueError, 'Duplicate array item'):
            gm.validate(bundle)

    def test_snack_threshold_counts_only_dishes_with_the_snack_slot(self):
        bundle = deepcopy(self.bundle)
        for dish in bundle['entities']['dishes']:
            if dish['name'] == 'Bánh nậm':
                dish['mealSlots'] = ['lunch']
        # Savory cake still has several other snacks, so use the exact-threshold dry group.
        next(d for d in bundle['entities']['dishes'] if d['name'] == 'Ô mai')['mealSlots'] = ['lunch']
        with self.assertRaisesRegex(ValueError, 'snack:dry: 2'):
            gm.validate(bundle)

    def test_meal_only_edit_without_a_source_is_rejected(self):
        row = dict.fromkeys(gm.HEADERS, '')
        row.update(dishId='base', name='Món', fillMealSlots='dinner')
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'enrichment.csv'
            with path.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=gm.HEADERS)
                writer.writeheader()
                writer.writerow(row)
            with self.assertRaisesRegex(ValueError, 'sourceRef'):
                gm.read_rows(path)


if __name__ == '__main__':
    unittest.main()
