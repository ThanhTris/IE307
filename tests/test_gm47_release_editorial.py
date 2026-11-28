from copy import deepcopy
from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'data-preparation/scripts'))

import gm47_release_editorial as editorial
import gm47_storage_receipt as receipt_cli


class ReleaseEditorialTest(unittest.TestCase):
    def test_followup_adds_only_approved_illustrated_dishes(self):
        additions = editorial.ARTWORK.with_name('photo-additions-2026-11-28.json')
        baseline = editorial.load_artwork()
        extended = editorial.load_artwork(additions)
        photos = editorial.gm41.dc.load_json(additions)['images']
        added_ids = {row['dishId'] for row in photos}
        self.assertEqual(len(photos), 3)
        self.assertEqual({row['dishId'] for row in extended['images']} -
                         {row['dishId'] for row in baseline['images']}, added_ids)
        old_pending = {row['dishId'] for row in baseline['awaitingImage']}
        self.assertEqual({row['dishId'] for row in extended['awaitingImage']}, old_pending - added_ids)
        self.assertEqual(len(extended['images']), 139)
        self.assertEqual(len(extended['awaitingImage']), 114)
        receipt = {
            'bucketPublicUrl': 'https://staging.example.invalid/storage/v1/object/public/dish-images',
            'candidateDatasetVersion': '1.4.6',
            'checkedAt': '2026-11-28T03:00:00Z',
            'objects': [{k: asset[k] for k in ('objectKey','sha256')}
                        for row in photos for asset in (row, row['thumbnail'])],
        }
        _, report = editorial.build(artwork=extended, storage_receipt=receipt)
        self.assertEqual({key for key, row in report['linkedArtwork'].items() if row['kind']=='photo'},
                         added_ids)
        with self.assertRaisesRegex(ValueError, 'must be newer'):
            editorial.build(artwork=extended, storage_receipt={**receipt, 'candidateDatasetVersion': '1.4.5'})
        broken = deepcopy(extended)
        flickr = next(row for row in broken['images'] if 'flickr.com' in row['source'])
        flickr['license'] = 'CC BY-NC 2.0'
        with self.assertRaisesRegex(ValueError, 'Unsupported GM-47 artwork license'):
            editorial.build(artwork=broken)

    def test_flickr_requires_exact_origin_photo_id(self):
        source = 'https://www.flickr.com/photos/51930963@N02/5095256061/'
        image = 'https://live.staticflickr.com/4087/5095256061_8f6cf0bef2_b.jpg'
        self.assertTrue(editorial.valid_flickr_photo(urlsplit(source), image))
        for bad_source, bad_image in (
            (source+'?other=1', image),
            (source.replace('www.flickr.com','www.flickr.com.invalid'), image),
            (source, image.replace('5095256061','5095256062')),
            (source, image.replace('live.staticflickr.com','images.invalid')),
        ):
            self.assertFalse(editorial.valid_flickr_photo(urlsplit(bad_source), bad_image))

    def test_followup_second_batch_validates_pexels_and_usda_evidence(self):
        additions = editorial.ARTWORK.with_name('photo-additions-batch2-2026-11-28.json')
        stock = editorial.load_artwork(additions)
        _, report = editorial.build(artwork=stock)
        self.assertEqual(report['preparedArtwork'], 147)
        self.assertEqual(len(report['illustrationPlan']), 106)
        for license, replacement in (
            ('Pexels License', ('upstreamImage', 'https://images.pexels.com/photos/12/pexels-photo-12.jpeg')),
            ('Public Domain Work', ('source', 'https://www.flickr.com/photos/unknown/54093424635/')),
        ):
            with self.subTest(license=license):
                modified = deepcopy(stock)
                row = next(row for row in modified['images'] if row['license'] == license)
                key, value = replacement
                row[key] = value
                with self.assertRaisesRegex(ValueError, 'Invalid or stale GM-47 artwork evidence'):
                    editorial.build(artwork=modified)

    def test_storage_receipt_only_checks_the_uploaded_batch(self):
        inventory = editorial.gm41.dc.load_json(editorial.ARTWORK)
        approved, unreviewed = inventory['images'][:2]
        unreviewed['aiCheck'].update(verdict='pending_human_review', checkedBy=None, checkedAt=None)
        bucket = 'https://staging.example.invalid/storage/v1/object/public/catalogue'
        assets = (approved, approved['thumbnail'])
        paths = (approved['file'], approved['thumbnail']['objectKey'])
        payloads = {f'{bucket}/{paths[0]}': b'main image bytes', f'{bucket}/{paths[1]}': b'thumbnail'}
        for asset, key in zip(assets, paths, strict=True):
            content = payloads[f'{bucket}/{key}']
            asset.update(bytes=len(content), sha256=editorial.gm41.dc.sha(content))
        inventory['totalBytes'] = sum(row['bytes'] for row in inventory['images'])

        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            inventory_path = root / 'artwork-candidates.json'
            inventory_path.write_bytes(editorial.gm41.dc.encoded(inventory))
            uuid_file = root / 'reviewed-dish-ids.txt'
            uuid_file.write_text(approved['dishId'] + '\n', encoding='utf-8')
            args = [
                'receipt', '--bucket-url', bucket, '--candidate-version', '1.4.5',
                '--dish-list', str(uuid_file), '--image-prefix', '',
            ]
            with (patch.object(sys, 'argv', args),
                  patch.object(receipt_cli, 'ARTWORK', inventory_path),
                  patch.object(receipt_cli, 'OUTPUT', root),
                  patch.object(receipt_cli, 'build_opener') as make_opener):
                opener = make_opener.return_value
                opener.open.side_effect = lambda request, timeout: BytesIO(payloads[request.full_url])
                receipt_cli.main()
                receipt_path = root / 'storage-receipt.json'
                receipt = receipt_path.read_bytes()
                self.assertEqual(
                    [row['storedObjectKey'] for row in editorial.gm41.dc.load_json(receipt_path)['objects']],
                    list(paths),
                )
                self.assertEqual(opener.open.call_count, 2)
                uuid_file.write_text(approved['dishId'] + '\n' + unreviewed['dishId'] + '\n', encoding='utf-8')
                with patch('sys.stderr'), self.assertRaises(SystemExit):
                    receipt_cli.main()
                self.assertEqual(opener.open.call_count, 2)
                self.assertEqual(receipt_path.read_bytes(), receipt)

    def test_illustrations_require_matching_storage_pairs_and_cover_missing_photos(self):
        artwork = editorial.gm41.dc.load_json(editorial.ARTWORK)
        assets = editorial.illustrations.load()
        _, offline = editorial.build(artwork=artwork)
        self.assertEqual(set(offline['illustrationPlan']), {row['dishId'] for row in offline['missingArtwork']})
        self.assertEqual(offline['linkedIllustrations'], 0)
        receipt = {
            'bucketPublicUrl': 'https://staging.example.invalid/storage/v1/object/public/dish-images',
            'candidateDatasetVersion': '1.4.5',
            'checkedAt': '2026-11-26T00:00:00Z',
            'objects': [
                {key: asset[key] for key in ('objectKey', 'sha256')}
                for row in assets.values() for asset in (row['image'], row['thumbnail'])
            ],
        }
        artwork_row = artwork['images'][0]
        artwork_row['aiCheck'].update(
            verdict='real_photo', checkedBy='Người kiểm fixture', checkedAt='2026-11-26T00:00:00Z',
        )
        receipt['objects'].extend({key: asset[key] for key in ('objectKey', 'sha256')}
                                  for asset in (artwork_row, artwork_row['thumbnail']))
        bundle, report = editorial.build(artwork=artwork, storage_receipt=receipt)
        self.assertEqual(report['linkedIllustrations'], len(offline['illustrationPlan']))
        self.assertEqual(report['linkedArtwork'][artwork_row['dishId']]['kind'], 'photo')
        for dish in bundle['entities']['dishes']:
            plan = offline['illustrationPlan'].get(dish['id'])
            if plan:
                linked = report['linkedArtwork'][dish['id']]
                self.assertEqual(linked['kind'], 'category_illustration')
                self.assertEqual(linked['groupCode'], plan['groupCode'])
                self.assertEqual(dish['artwork']['url'], f"{receipt['bucketPublicUrl']}/{plan['objectKey']}")
                self.assertTrue(dish['artwork']['attribution'].startswith('Ảnh minh họa nhóm '))
        broken = deepcopy(receipt)
        broken['objects'][1]['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'verified illustration pair'):
            editorial.build(artwork=artwork, storage_receipt=broken)

    def test_batch_changes_editorial_fields_only(self):
        base, digest = editorial.load_baseline()
        candidate, report = editorial.build()
        self.assertEqual(report['baseSha256'], digest)
        self.assertEqual(base['datasetVersion'], '1.3.0')
        self.assertEqual(candidate['datasetVersion'], '1.4.4')
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
        def record_signoff(path, *, confirmed):
            result = load(path)
            if path == editorial.INPUT:
                rows = [row for row in result['descriptions'] if row['locator'] == locator]
                for index, row in enumerate(rows):
                    review = row['factReview']
                    review.update(checkedBy='Người kiểm fixture' if index < confirmed else None,
                                  checkedAt=review['assistance']['checkedAt'] if index < confirmed else None)
            return result

        with patch.object(editorial.gm41.dc, 'load_json', side_effect=lambda path: record_signoff(path, confirmed=0)):
            _, report = editorial.build()
        assisted = next(row for row in report['descriptionRightsReview'] if row['locator'] == locator)
        self.assertEqual(assisted['status'], 'needs_confirmation')
        self.assertFalse(assisted['reviewedDishIds'])
        self.assertEqual(len(assisted['prechecks']), len(assisted['dishIds']))

        count = len(assisted['dishIds'])
        with patch.object(editorial.gm41.dc, 'load_json', side_effect=lambda path: record_signoff(path, confirmed=count)):
            _, report = editorial.build()
        complete = next(row for row in report['descriptionRightsReview'] if row['locator'] == locator)
        self.assertEqual(complete['status'], editorial.FACT_REFERENCE)
        with patch.object(editorial.gm41.dc, 'load_json', side_effect=lambda path: record_signoff(path, confirmed=count - 1)):
            _, report = editorial.build()
        pending = next(row for row in report['descriptionRightsReview'] if row['locator'] == locator)
        self.assertEqual(pending['status'], 'needs_confirmation')
        self.assertEqual(len(pending['reviewedDishIds']), len(pending['dishIds']) - 1)

    def test_rejects_description_review_after_text_changes(self):
        row = next(row for row in editorial.gm41.dc.load_json(editorial.INPUT)['descriptions'] if 'factReview' in row)
        row['description'] += ' Nội dung thay đổi.'
        with self.assertRaisesRegex(ValueError, 'stale GM-47 description review'):
            editorial.description_review(row)

    def test_rejects_tool_as_named_reviewer(self):
        row = next(row for row in editorial.gm41.dc.load_json(editorial.INPUT)['descriptions'] if 'factReview' in row)
        row['factReview'].update(checkedBy='Codex (hỗ trợ Tâm)', checkedAt='2026-11-25T00:00:00Z')
        with self.assertRaisesRegex(ValueError, 'named human reviewer'):
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
        photo['aiCheck'].update(verdict='pending_human_review', checkedBy=None, checkedAt=None)
        receipt = {
            'bucketPublicUrl': 'https://staging.example.invalid/storage/v1/object/public/catalogue',
            'candidateDatasetVersion': '1.4.5',
            'checkedAt': '2026-11-25T01:00:00Z',
            'objects': [{key: row[key] for key in ('objectKey', 'sha256')} for row in (photo, photo['thumbnail'])],
        }
        with self.assertRaisesRegex(ValueError, 'requires human photo review'):
            editorial.build(artwork=artwork, storage_receipt=receipt)
        photo['aiCheck'].update(verdict='real_photo', checkedBy='Người kiểm fixture',
                                checkedAt='2026-11-25T00:00:00Z')
        candidate, report = editorial.build(artwork=artwork, storage_receipt=receipt)
        self.assertEqual(candidate['datasetVersion'], '1.4.5')
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
