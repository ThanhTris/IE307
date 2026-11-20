"""Prove the editorial overlay changes only its five descriptions and provenance."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'data-preparation/scripts'))
import gm47_catalogue as editorial


class CatalogueEditorialTest(unittest.TestCase):
    def test_overlay_preserves_identity_taxonomy_prices_and_null_artwork(self):
        candidate, report = editorial.build()
        base = editorial.gm41.dc.load_json(editorial.gm41.BUNDLE)
        self.assertEqual(len(report['descriptionSourceRefs']), 5)
        self.assertEqual(candidate['usageScope'], 'test_demo')
        self.assertEqual(candidate['datasetVersion'], '1.2.1')
        clean = deepcopy(candidate['entities'])
        for row in clean['dishes']:
            self.assertIsNone(row['artwork'])
            if row['id'] in report['descriptionSourceRefs']:
                ref = report['descriptionSourceRefs'][row['id']]
                self.assertTrue(row['description'])
                self.assertEqual(row['fieldSources'].pop('description'), ref)
                row['description'] = None
        for ref in report['descriptionSourceRefs'].values():
            self.assertTrue(any(s['sourceRef'] == ref for s in clean['dataSources']))
        for key, identities in [('dataSources', ('sourceRef',)), ('fieldEvidence', ('dishId', 'field'))]:
            baseline_ids = {tuple(row[k] for k in identities) for row in base['entities'][key]}
            clean[key] = [row for row in clean[key] if tuple(row[k] for k in identities) in baseline_ids]
        self.assertEqual(clean, base['entities'])
        self.assertTrue(all(item['withArtwork'] == 0 for item in report['coverage'].values()))

    def test_stale_baseline_is_rejected(self):
        load = editorial.gm41.dc.load_json

        def modified(path):
            result = load(path)
            if path == editorial.OVERLAY:
                result['baseSha256'] = '0' * 64
            return result

        with patch.object(editorial.gm41.dc, 'load_json', side_effect=modified):
            with self.assertRaisesRegex(ValueError, 'pinned GM-41'):
                editorial.build()


if __name__ == '__main__':
    unittest.main()
