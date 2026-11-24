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
        self.assertEqual(candidate['datasetVersion'], '1.4.2')
        self.assertEqual(candidate['usageScope'], 'test_demo')
        self.assertEqual(report['missingDescription'], [])
        self.assertEqual(len(report['descriptionSourceRefs']), 253)
        self.assertEqual(sum(len(row['dishIds']) for row in report['descriptionRightsReview']), 253)
        for row in report['descriptionRightsReview']:
            fully_reviewed = row['dishIds'] == row['reviewedDishIds']
            self.assertEqual(row['status'], editorial.FACT_REFERENCE if fully_reviewed else 'needs_confirmation')
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

    def test_shared_source_stays_pending_with_an_unreviewed_description(self):
        load = editorial.gm41.dc.load_json
        locator = 'https://vietnam.travel/vi/things-to-do/15-dreamy-desserts-try-vietnam/'

        def partial_review(path):
            result = load(path)
            if path == editorial.INPUT:
                row = next(row for row in result['descriptions'] if row['locator'] == locator)
                del row['factReview']
            return result

        _, report = editorial.build()
        complete = next(row for row in report['descriptionRightsReview'] if row['locator'] == locator)
        self.assertEqual(complete['status'], editorial.FACT_REFERENCE)
        with patch.object(editorial.gm41.dc, 'load_json', side_effect=partial_review):
            _, report = editorial.build()
        pending = next(row for row in report['descriptionRightsReview'] if row['locator'] == locator)
        self.assertEqual(pending['status'], 'needs_confirmation')
        self.assertEqual(len(pending['reviewedDishIds']), len(pending['dishIds']) - 1)

    def test_rejects_description_review_after_text_changes(self):
        row = next(row for row in editorial.gm41.dc.load_json(editorial.INPUT)['descriptions'] if 'factReview' in row)
        row['description'] += ' Nội dung thay đổi.'
        with self.assertRaisesRegex(ValueError, 'stale GM-47 description review'):
            editorial.description_review(row)

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

    def test_rejects_missing_or_flagged_photo_origin(self):
        artwork = editorial.gm41.dc.load_json(editorial.ARTWORK)
        row = artwork['images'][0]
        review = row.pop('aiCheck')
        with self.assertRaisesRegex(ValueError, 'GM-47 photo origin review'):
            editorial.build(artwork=artwork)
        row['aiCheck'] = {**review, 'aiCategory': True}
        with self.assertRaisesRegex(ValueError, 'GM-47 photo origin review'):
            editorial.build(artwork=artwork)
        row['aiCheck'] = {**review, 'cameraExif': False}
        row['license'] = 'Ảnh nhóm tự chụp'
        with self.assertRaisesRegex(ValueError, 'GM-47 photo origin review'):
            editorial.build(artwork=artwork)

    def test_storage_receipt_links_only_verified_pairs(self):
        artwork = editorial.gm41.dc.load_json(editorial.ARTWORK)
        photo = artwork['images'][0]
        receipt = {
            'bucketPublicUrl': 'https://staging.example.invalid/storage/v1/object/public/catalogue',
            'candidateDatasetVersion': '1.4.3',
            'checkedAt': '2026-11-24T14:00:00Z',
            'objects': [{key: row[key] for key in ('objectKey', 'sha256')} for row in (photo, photo['thumbnail'])],
        }
        candidate, report = editorial.build(artwork=artwork, storage_receipt=receipt)
        self.assertEqual(candidate['datasetVersion'], '1.4.3')
        attached = {row['id']: row['artwork'] for row in candidate['entities']['dishes'] if row['artwork'] is not None}
        self.assertEqual(set(attached), {photo['dishId']})
        art = attached[photo['dishId']]
        self.assertEqual(art['url'], f"{receipt['bucketPublicUrl']}/{photo['objectKey']}")
        self.assertEqual(art['license'], photo['license'])
        self.assertEqual(report['linkedArtwork'][photo['dishId']]['thumbnailUrl'],
                         f"{receipt['bucketPublicUrl']}/{photo['thumbnail']['objectKey']}")
        receipt['objects'][0]['storedObjectKey'] = photo['file']
        _, report = editorial.build(artwork=artwork, storage_receipt=receipt)
        self.assertEqual(report['linkedArtwork'][photo['dishId']]['url'],
                         f"{receipt['bucketPublicUrl']}/{photo['file']}")
        receipt['objects'][0]['storedObjectKey'] = f"../{photo['file']}"
        with self.assertRaisesRegex(ValueError, 'preserve the reviewed UUID filename'):
            editorial.build(artwork=artwork, storage_receipt=receipt)
        receipt['objects'][0]['storedObjectKey'] = photo['file']
        receipt['objects'][1]['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'missing a verified pair'):
            editorial.build(artwork=artwork, storage_receipt=receipt)


if __name__ == '__main__':
    unittest.main()
