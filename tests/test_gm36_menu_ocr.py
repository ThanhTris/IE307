"""Independent Python schema/semantic and existing importer boundary checks."""
from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gm36_contract', ROOT / 'scripts/gm36_contract_check.py')
gm36 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gm36)


class MenuOcrContractTests(unittest.TestCase):
    def setUp(self):
        self.draft = gm36.load_json(ROOT / 'tests/fixtures/menu-ocr-v1/expected-draft.json')

    def test_golden_draft_matches_schema_and_semantics(self):
        self.assertEqual(gm36.validate_draft(self.draft), [])

    def test_real_gm08_preflight_refuses_standalone_ocr_draft(self):
        result = gm36.check(self.draft)
        self.assertEqual(result['result'], 'Pass')
        self.assertTrue(result['gm08DirectImportRejected'])
        self.assertFalse(result['databaseAccessed'])
        self.assertFalse(result['publicationPerformed'])

    def test_verified_publish_or_location_claims_are_forbidden(self):
        for key, value in [('reviewStatus', 'verified'), ('publishable', True),
                           ('sourceRightsVerified', True), ('venueId', self.draft['sourceRef']),
                           ('coverageId', self.draft['sourceRef']), ('scheduleId', self.draft['sourceRef'])]:
            with self.subTest(field=key):
                draft = deepcopy(self.draft)
                draft[key] = value
                self.assertTrue(gm36.validate_draft(draft))

    def test_low_confidence_cannot_leak_known_fields(self):
        for key in ('name', 'price'):
            draft = deepcopy(self.draft)
            draft['items'][0]['confidence'][key] = 0.84
            self.assertTrue(gm36.validate_draft(draft))

    def test_unknown_price_is_null_never_zero_or_partial_price(self):
        draft = deepcopy(self.draft)
        draft['items'][1]['priceMin'] = 0
        self.assertTrue(gm36.validate_draft(draft))
        for key in ('priceMax', 'currency', 'unit'):
            draft = deepcopy(self.draft)
            draft['items'][0][key] = None
            self.assertTrue(gm36.validate_draft(draft))

    def test_source_bindings_and_manual_review_marker_required(self):
        for field in ('sourceRef', 'fieldSources', 'issues'):
            draft = deepcopy(self.draft)
            if field == 'sourceRef':
                draft['items'][0][field] = '00000000-0036-4000-8000-000000000099'
            elif field == 'fieldSources':
                draft['items'][0][field]['price'] = None
            else:
                draft['items'][0][field] = []
            self.assertTrue(gm36.validate_draft(draft))

    def test_no_empty_arrays_raw_images_or_additional_fields(self):
        for mutate in (lambda d: d.update(items=[]), lambda d: d.update(dataBase64='private image'),
                       lambda d: d['items'][0].update(allergenSafe=True)):
            draft = deepcopy(self.draft)
            mutate(draft)
            self.assertTrue(gm36.validate_draft(draft))

    def test_price_range_and_nfc_must_be_consistent(self):
        draft = deepcopy(self.draft)
        draft['items'][0]['priceMax'] = 1000
        self.assertTrue(gm36.validate_draft(draft))
        draft = deepcopy(self.draft)
        draft['items'][0]['name'] = 'Pho\u031b\u0309'
        self.assertTrue(gm36.validate_draft(draft))


if __name__ == '__main__':
    unittest.main()
