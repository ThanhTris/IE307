"""Offline importer boundaries. Real DB/HTTP assertions use gm40_catalogue_check.py."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gm40_import_test', ROOT / 'supabase/seed/import_dish_catalogue.py')
imp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imp)


class ImportTests(unittest.TestCase):
    def test_manifest_candidate_and_runtime_projection(self):
        bundle, digest = imp.candidate(ROOT / imp.contract.BUNDLE_PATH, ROOT / imp.contract.MANIFEST_PATH)
        cards = imp.cards(bundle)
        self.assertEqual(len(cards), 39)
        self.assertEqual(imp.release_id(bundle), 'dish-catalogue-v1:1.1.0')
        self.assertTrue(all(set(c) == {'dishId', 'name', 'description', 'artwork', 'mealSlots', 'cuisineIds', 'categoryIds'} for c in cards))
        self.assertEqual({c['dishId'] for c in cards}, {d['id'] for d in bundle['entities']['dishes']})
        self.assertEqual(digest, imp.contract.sha((ROOT / imp.contract.BUNDLE_PATH).read_bytes()))

    def test_staging_preserves_bytes_and_provenance_outside_cards(self):
        with tempfile.TemporaryDirectory() as tmp:
            staged = imp.stage(ROOT / imp.contract.BUNDLE_PATH, Path(tmp), ROOT / imp.contract.MANIFEST_PATH)
            self.assertEqual((Path(tmp) / 'bundle.json').read_bytes(), (ROOT / imp.contract.BUNDLE_PATH).read_bytes())
            self.assertEqual(json.loads((Path(tmp) / 'stage.json').read_text(encoding='utf-8')), staged)
            self.assertTrue(staged['testOnly'])

    def test_manifest_conflict_and_fixture_rejected(self):
        bundle = imp.contract.load_json(ROOT / imp.contract.BUNDLE_PATH)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'bad.json'
            fixture = deepcopy(bundle)
            fixture['fixtureOnly'] = True
            path.write_bytes(imp.contract.encoded(fixture))
            with self.assertRaises(ValueError): imp.candidate(path)
            changed = deepcopy(bundle)
            changed['datasetVersion'] = '1.1.1'
            path.write_bytes(imp.contract.encoded(changed))
            with self.assertRaises(ValueError): imp.candidate(path, ROOT / imp.contract.MANIFEST_PATH)

    def test_source_cannot_be_overwritten_by_stage(self):
        with self.assertRaises(ValueError):
            imp.stage(ROOT / imp.contract.BUNDLE_PATH, ROOT / 'supabase/seed/catalogue')

    def test_source_dollar_tags_cannot_terminate_sql_block(self):
        bundle, digest = imp.candidate(ROOT / imp.contract.BUNDLE_PATH)
        bundle['entities']['dishes'][0]['description'] = "It's $gm40$ and $gm40_next$ text"
        sql = imp.import_sql(bundle, digest)
        self.assertIn('do $gm40_next_next$', sql)
        self.assertEqual(sql.count('$gm40_next_next$'), 2)
        self.assertIn("It''s $gm40$", sql)

    def test_owned_db_guards_refuse_application_and_wrong_namespace(self):
        class Fake:
            database = 'postgres'
            def psql(self, sql): return str(uuid.UUID(int=1))
        db = Fake()
        with self.assertRaises(ValueError): imp.owned(db, uuid.UUID(int=1))
        db.database = 'gm08_check_' + 'a' * 16
        with self.assertRaises(ValueError): imp.owned(db, uuid.UUID(int=2))


if __name__ == '__main__':
    unittest.main()
