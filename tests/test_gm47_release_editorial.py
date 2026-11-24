from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'data-preparation/scripts'))

import gm47_release_editorial as editorial


class ReleaseEditorialTest(unittest.TestCase):
    def test_batch_changes_editorial_fields_only(self):
        base, digest = editorial.load_baseline()
        candidate, report = editorial.build()
        self.assertEqual(report['baseSha256'], digest)
        self.assertEqual(base['datasetVersion'], '1.3.0')
        self.assertEqual(candidate['datasetVersion'], '1.4.0')
        self.assertEqual(candidate['usageScope'], 'test_demo')
        self.assertEqual(report['missingDescription'], [])
        self.assertEqual(len(report['descriptionSourceRefs']), 253)
        self.assertEqual(len(report['missingArtwork']) + report['preparedArtwork'], 253)
        self.assertEqual(len(report['artworkBatches']), 7)
        self.assertEqual(sum(batch['pending'] for batch in report['artworkBatches'].values()),
                         len(report['missingArtwork']))

        expected = deepcopy(base['entities'])
        actual = deepcopy(candidate['entities'])
        sources = {source['sourceRef']: source for source in actual['dataSources']}
        evidence = {
            (row['dishId'], row['field']): row['sourceRef']
            for row in actual['fieldEvidence']
        }
        for old, new in zip(expected['dishes'], actual['dishes'], strict=True):
            dish_id = old['id']
            source_ref = report['descriptionSourceRefs'][dish_id]
            self.assertIn(len(new.pop('description')), range(80, 221))
            old.pop('description')
            self.assertEqual(new['fieldSources'].pop('description'), source_ref)
            old['fieldSources'].pop('description', None)
            self.assertEqual(evidence[dish_id, 'description'], source_ref)
            self.assertTrue(sources[source_ref]['locator'].startswith('https://'))
            self.assertEqual(new, old)

        self.assertEqual(
            [row for row in actual['fieldEvidence'] if row['field'] != 'description'],
            [row for row in expected['fieldEvidence'] if row['field'] != 'description'],
        )
        baseline_refs = {row['sourceRef'] for row in expected['dataSources']}
        actual['dataSources'] = [row for row in actual['dataSources'] if row['sourceRef'] in baseline_refs]
        self.assertEqual(actual['dataSources'], expected['dataSources'])
        for key in expected.keys() - {'dishes', 'dataSources', 'fieldEvidence'}:
            self.assertEqual(actual[key], expected[key], key)

    def test_rejects_descriptions_below_release_length(self):
        load = editorial.gm41.dc.load_json

        def invalid_length(path):
            result = load(path)
            if path == editorial.INPUT:
                result['descriptions'][0]['description'] = 'Too short'
            return result

        with patch.object(editorial.gm41.dc, 'load_json', side_effect=invalid_length):
            with self.assertRaisesRegex(ValueError, 'Invalid release description'):
                editorial.build()

    def test_rejects_artwork_for_a_different_base(self):
        load = editorial.gm41.dc.load_json

        def stale_artwork(path):
            result = load(path)
            if path == editorial.ARTWORK:
                result['baseSha256'] = '0' * 64
            return result

        with patch.object(editorial.gm41.dc, 'load_json', side_effect=stale_artwork):
            with self.assertRaisesRegex(ValueError, 'pinned GM-41 release bundle'):
                editorial.build()

    def test_rejects_thumbnail_key_for_a_different_dish(self):
        artwork = editorial.gm41.dc.load_json(editorial.ARTWORK)
        artwork['images'][0]['thumbnail']['objectKey'] = artwork['images'][1]['thumbnail']['objectKey']
        with self.assertRaisesRegex(ValueError, 'Invalid or stale GM-47 artwork evidence'):
            editorial.build(artwork=artwork)


if __name__ == '__main__':
    unittest.main()
