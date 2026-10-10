"""Editorial pipeline invariants; no network access or paid API calls."""
import copy
from datetime import datetime, timezone
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import editorial_catalogue as ec


class EditorialCatalogueTests(unittest.TestCase):
    def setUp(self):
        self.bases, self.cfg, self.sources, self.images = ec.load_inputs()

    def build(self):
        return ec.build(self.bases, self.cfg, self.sources, self.images)

    def test_frozen_ids_versions_and_contract(self):
        bundle, prices, _, _ = self.build()
        self.assertEqual({r['id'] for r in bundle['entities']['dishes']}, {r['id'] for r in self.bases})
        self.assertTrue(all(r['version'] == 2 for r in bundle['entities']['dishes']))
        self.assertEqual(bundle['datasetVersion'], '0.2.0')
        self.assertEqual(ec.dc.validate(bundle, datetime(2026, 10, 11, tzinfo=timezone.utc)), [])
        self.assertEqual(len(prices), 247)

    def test_prices_preserve_every_source_field(self):
        _, prices, _, _ = self.build()
        ec.validate_prices(self.bases, prices)
        self.assertEqual(len({r['menuItemId'] for r in prices}), 247)
        self.assertEqual({r['unit'] for r in prices}, {'menu_item_unspecified'})
        self.assertTrue(all(r['portion'] is None for r in prices))

    def test_reject_cross_branch_price(self):
        _, prices, _, _ = self.build()
        prices[0]['venueSurveyId'] = prices[-1]['venueSurveyId']
        with self.assertRaisesRegex(ValueError, 'differs'):
            ec.validate_prices(self.bases, prices)

    def test_reject_dropped_price(self):
        _, prices, _, _ = self.build()
        with self.assertRaisesRegex(ValueError, 'lost or duplicated'):
            ec.validate_prices(self.bases, prices[:-1])

    def test_reject_unsourced_classification(self):
        row = self.cfg['dishes'][0]
        row['mealSlots'] = ['lunch']
        with self.assertRaisesRegex(ValueError, 'mealSlots needs explicit evidence'):
            self.build()

    def test_reject_model_proof(self):
        self.cfg['dishes'][0]['evidence']['name']['basis'] = 'model_inferred_draft'
        with self.assertRaisesRegex(ValueError, 'Model guesses'):
            self.build()

    def test_model_proposals_cannot_change_catalogue(self):
        before = self.build()
        for r in self.bases:
            r['sourceProfiles'] = [{'profile': {'cuisineCodes': ['ja'], 'temperature': 'cold', 'flavor': 'invented'}}]
        self.assertEqual(before, self.build())

    def test_group_variation_retains_unknowns(self):
        bundle, _, _, _ = self.build()
        rows = {r['name']: r for r in bundle['entities']['dishes']}
        for name in ['Bún bò', 'Cơm gà', 'Cơm trộn', 'Miến', 'Mì']:
            self.assertEqual(rows[name]['temperature'], 'unknown')
            self.assertEqual(rows[name]['cuisineIds'], [])
            self.assertIsNone(rows[name]['flavor'])
        self.assertEqual(rows['Bánh cuốn']['aliases'], ['Bánh quấn'])
        self.assertNotIn('Bánh ướt', rows['Bánh cuốn']['aliases'])

    def test_no_allergy_or_menu_image_promotion(self):
        bundle, _, _, _ = self.build()
        self.assertTrue(all(r['artwork'] is None and r['ingredientTags'] is None for r in bundle['entities']['dishes']))

    def test_image_license_alone_is_insufficient(self):
        candidate = next(r['candidates'][0] for r in self.images['dishes'] if r['candidates'])
        candidate['status'] = 'selected'
        with self.assertRaisesRegex(ValueError, 'visual and per-file'):
            self.build()

    def test_reject_outside_dish_evidence(self):
        self.cfg['dishes'][0]['evidence']['name']['menuItemIds'] = ['unrelated-menu']
        with self.assertRaisesRegex(ValueError, 'another dish'):
            self.build()

    def test_reject_duplicate_edit_id(self):
        self.cfg['dishes'][1]['id'] = self.cfg['dishes'][0]['id']
        with self.assertRaisesRegex(ValueError, '39 unique'):
            self.build()

    def test_reject_cache_drift(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'cache.json'
            ec.save_json(p, {'value': 1})
            checksum = ec.sha256(p)
            ec.save_json(p, {'value': 2})
            with self.assertRaisesRegex(ValueError, 'checksum'):
                ec.load_checked(p, checksum)

    def test_fresh_clone_no_raw_cache_needed(self):
        with tempfile.TemporaryDirectory() as d, patch.object(ec, 'CACHE', Path(d)), patch.object(ec, 'urlopen', side_effect=AssertionError('Network prohibited')):
            self.assertEqual(ec.load_inputs()[:2], (self.bases, self.cfg))
            self.build()

    def test_deterministic_csv_json_and_offline_export(self):
        with tempfile.TemporaryDirectory() as d, patch.object(ec, 'urlopen', side_effect=AssertionError('Network prohibited')):
            bundle, prices, images, proofs = self.build()
            out = Path(d)
            ec.export(bundle, prices, images, proofs, self.cfg, out)
            first = {str(p.relative_to(out)): p.read_bytes() for p in out.rglob('*') if p.is_file()}
            ec.export(bundle, prices, images, proofs, self.cfg, out)
            self.assertEqual(first, {str(p.relative_to(out)): p.read_bytes() for p in out.rglob('*') if p.is_file()})
            self.assertEqual(bundle, ec.dc.read_csv_bundle(out / 'csv'))
            for p in out.rglob('*.csv'):
                self.assertTrue(p.read_bytes().startswith(b'\xef\xbb\xbf'))

    def test_no_real_venue_schedule_or_approval(self):
        bundle, _, _, _ = self.build()
        for name in ['venues', 'venueDishes', 'weeklySchedules', 'dateExceptions', 'availabilityOverrides', 'coverageAreas', 'publicAnchors']:
            self.assertEqual(bundle['entities'][name], [])
        for rows in bundle['entities'].values():
            self.assertTrue(all(r['reviewStatus'] == 'draft' and r['reviewedBy'] is None and r['validUntil'] is None for r in rows))
        promoted = copy.deepcopy(bundle)
        promoted['entities']['dishes'][0].update(status='published', reviewStatus='published')
        self.assertTrue(ec.dc.validate(promoted))

    def test_refresh_stops_on_429_without_retry(self):
        calls = []
        def limited(request, timeout):
            calls.append(request.full_url)
            raise HTTPError(request.full_url, 429, 'Rate limit', {}, io.BytesIO())
        requests = self.sources['refreshRequests'][:3]
        with tempfile.TemporaryDirectory() as d:
            result = ec.refresh_metadata(requests, d, opener=limited, pause=lambda _: self.fail('No sleep/retry after 429'))
            self.assertEqual(len(calls), 1)
            self.assertEqual(result[0]['httpStatus'], 429)
            self.assertEqual(ec.load_json(Path(d) / 'refresh_journal.json'), result)

    def test_refresh_writes_checked_response_bytes(self):
        raw = b'{"query":{"pages":{}}}'
        with tempfile.TemporaryDirectory() as d:
            result = ec.refresh_metadata(self.sources['refreshRequests'][:1], d,
                opener=lambda *a, **k: io.BytesIO(raw), pause=lambda _: None)
            p = Path(d) / result[0]['file']
            self.assertEqual(p.read_bytes(), raw)
            self.assertEqual(ec.sha256(p), result[0]['sha256'])

    def test_refresh_rejects_other_hosts_and_binary_paths(self):
        with tempfile.TemporaryDirectory() as d:
            for url in ['https://example.invalid/w/api.php', 'https://commons.wikimedia.org/photo.jpg']:
                with self.assertRaises(ValueError):
                    ec.refresh_metadata([{'key': 'invalid', 'url': url}], d, opener=lambda *a, **k: self.fail('Network'))

    def test_tracked_outputs_match_curation(self):
        bundle, prices, images, _ = self.build()
        self.assertEqual(ec.load_json(ec.OUTPUT / 'catalogue.json'), bundle)
        manifest = ec.load_json(ec.OUTPUT / 'manifest.json')
        for filename, metadata in manifest['files'].items():
            self.assertEqual(ec.sha256(ec.OUTPUT / filename), metadata['sha256'])
        self.assertEqual(manifest['statistics'], ec.quality(bundle, prices, images))


if __name__ == '__main__':
    unittest.main()
