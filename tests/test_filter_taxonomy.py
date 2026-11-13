"""Filter taxonomy (ADR-025): ids agree with the pipeline, files are generated, enrichment CSVs are validated."""
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import base_catalogue  # noqa: E402
import filter_taxonomy as ft  # noqa: E402


class FilterTaxonomyTests(unittest.TestCase):
    def test_ids_use_the_pipeline_stable_id_and_match_the_bundle(self):
        bundle = json.loads((ROOT / 'supabase/seed/catalogue/dishes.json').read_text(encoding='utf-8'))
        for entry in bundle['entities']['taxonomy']:
            if entry['code'].startswith('family:'):
                self.assertEqual(ft.family_id(entry['code'].split(':', 1)[1]), entry['id'], entry['code'])
        self.assertEqual(ft.region_id('vi_south'), base_catalogue.stable_id('taxonomy', 'cuisine:vi_south'))

    def test_generated_files_are_up_to_date(self):
        for path, text in ft.outputs().items():
            self.assertEqual(path.read_text(encoding='utf-8'), text, f'{path.name} is stale: run filter_taxonomy.py --write')

    def test_every_group_family_exists_and_ids_are_unique(self):
        data = ft.build()
        ids = [g['id'] for g in data['groups']['main'] + data['groups']['snack']]
        linked = [i for g in data['groups']['main'] + data['groups']['snack'] for i in g['linkedIds']]
        self.assertEqual(len(ids + linked), len(set(ids + linked)), 'a family sits in two groups')
        self.assertEqual(len(data['groups']['main']), 6)
        self.assertEqual(len(data['groups']['snack']), 8)
        self.assertEqual(len(data['regions']), 4)
        self.assertIn('fatty', data['flavorKinds'])

    def test_enrichment_csv_validation(self):
        header = ['dishId', 'name', 'fillFamilies', 'fillMealSlots', 'fillRegions', 'fillFlavors', 'sourceRef']
        def check(rows):
            with tempfile.TemporaryDirectory() as folder:
                path = Path(folder) / 'rows.csv'
                with path.open('w', encoding='utf-8', newline='') as handle:
                    writer = csv.writer(handle)
                    writer.writerow(header)
                    writer.writerows(rows)
                return ft.validate_csv(path)
        good = ['1', 'Cơm', 'rice porridge', 'breakfast lunch dinner', 'vi_south vi_west', 'spicy=high fatty=medium sour=present', 'src-1']
        self.assertEqual(check([good]), [])
        self.assertTrue(any('unknown family' in e for e in check([[*good[:2], 'cheese', *good[3:]]])))
        self.assertTrue(any('unknown region' in e for e in check([[*good[:4], 'vi_east', *good[5:]]])))
        self.assertTrue(any('unknown meal' in e for e in check([[*good[:3], 'brunch', *good[4:]]])))
        self.assertTrue(any('flavour level' in e for e in check([[*good[:5], 'spicy=very', good[6]]])))
        self.assertTrue(any('sourceRef' in e for e in check([[*good[:6], '']])))


if __name__ == '__main__':
    unittest.main()
