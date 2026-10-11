"""Guard the real draft DB check and GM-04/SQL provenance vocabulary parity."""
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('real_bundle_check', ROOT/'scripts/gm08_real_bundle_check.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
PILOT = ROOT/'supabase/seed/draft/gm08-survey-v0.4.1/bundle.json'


class RealBundleGuardTests(unittest.TestCase):
    def with_candidate(self, bundle):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'input.json'
            runner.importer.write_json(path, bundle)
            return runner.candidate(path)

    def test_actual_candidate_retains_unknowns_and_exact_input_hash(self):
        before = PILOT.read_bytes()
        bundle, sha, preflight = runner.candidate(PILOT)
        self.assertEqual(sha, runner.importer.digest(before))
        self.assertEqual(preflight['rowCounts']['venueDishes'], 190)
        self.assertTrue(all(o['scheduleId'] is None and o['serviceMode'] is None
                            for o in bundle['entities']['venueDishes']))
        self.assertEqual(PILOT.read_bytes(), before)

    def test_fixture_cannot_be_called_actual_data(self):
        bundle = runner.importer.load_json(PILOT)
        bundle['fixtureOnly'] = True
        with self.assertRaises(ValueError):
            self.with_candidate(bundle)

    def test_verified_or_published_candidate_is_outside_test_load_mode(self):
        for status in ('verified', 'published'):
            bundle = runner.importer.load_json(PILOT)
            bundle['entities']['dishes'][0]['reviewStatus'] = status
            with self.subTest(status=status), self.assertRaises(ValueError):
                self.with_candidate(bundle)

    def test_broken_real_offering_fk_is_rejected_before_database(self):
        bundle = runner.importer.load_json(PILOT)
        bundle['entities']['venueDishes'][0]['venueId'] = '00000000-0000-0000-0000-000000000000'
        with self.assertRaises(ValueError):
            self.with_candidate(bundle)

    def test_duplicate_fixture_flag_cannot_hide_a_fixture(self):
        raw = PILOT.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'input.json'
            path.write_bytes(b'{"fixtureOnly":true,' + raw.lstrip()[1:])
            with self.assertRaisesRegex(ValueError, 'Duplicate JSON object key'):
                runner.candidate(path)

    def test_migration_matches_all_food_contract_provenance_keys_and_types(self):
        migration = (ROOT/'supabase/migrations/0003_food_provenance_description.sql').read_text()
        match = re.search(r"shape jsonb := '([^']+)'::jsonb;", migration)
        shape = json.loads(match[1])
        contract = runner.importer.load_json(ROOT/'supabase/seed/templates/food-v1.schema.json')
        for entity in runner.importer.ORDER:
            field = contract['$defs'][entity]['properties']['fieldSources']
            with self.subTest(entity=entity):
                self.assertEqual(shape, {k:field[k] for k in ('type','properties','additionalProperties')})
                self.assertIn("'"+runner.importer.snake(entity)+"'", migration)
        self.assertFalse(shape['additionalProperties'])


if __name__ == '__main__':
    unittest.main()
