import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import release_catalogue_check as rc  # noqa: E402


class ReleaseCatalogueCheckTests(unittest.TestCase):
    def test_current_bundle_reports_known_gaps(self):
        report = rc.evaluate(rc.DEFAULT_BUNDLE)
        by_name = {c['check']: c for c in report['checks']}
        self.assertFalse(report['pass'])
        self.assertEqual(by_name['Tổng số món']['actual'], 72)
        self.assertEqual(by_name['Món thiếu mealSlots']['actual'], 0)
        self.assertIn('Burger', by_name['Món không thuộc nhóm hiển thị nào']['examples'])
        self.assertEqual(by_name['Vị · Mặn / Đậm đà']['actual'], 0)

    def test_flavour_rules_follow_the_app_filters(self):
        salty = lambda level: {'salty': {'present': True, 'intensity': level}}
        self.assertEqual(rc.flavour_hits(salty('high')), {'Mặn / Đậm đà'})
        self.assertEqual(rc.flavour_hits(salty('low')), {'Thanh đạm'})
        self.assertEqual(rc.flavour_hits(salty('unknown')), set())
        self.assertEqual(rc.flavour_hits({'spicy': {'present': True}, 'fatty': {'present': True}}), {'Cay', 'Béo / Ngậy'})
        self.assertEqual(rc.flavour_hits(None), set())

    def test_artwork_requires_rights_license_and_attribution(self):
        base = {'url': 'https://example.test/a.webp', 'usageRights': 'licensed', 'license': 'CC BY 4.0', 'attribution': 'A'}
        self.assertTrue(rc.artwork_ok(base))
        self.assertFalse(rc.artwork_ok({**base, 'usageRights': 'unknown'}))
        self.assertFalse(rc.artwork_ok({**base, 'license': None}))
        self.assertFalse(rc.artwork_ok({**base, 'attribution': None}))
        self.assertTrue(rc.artwork_ok({**base, 'usageRights': 'public_domain', 'attribution': None}))
        self.assertFalse(rc.artwork_ok(None))

    def test_category_illustration_is_counted_apart_from_photos(self):
        base = {'url': 'https://example.test/a.webp', 'usageRights': 'licensed', 'license': 'Apache-2.0',
                'attribution': 'Ảnh minh họa nhóm Cơm · biểu tượng rice (Apache-2.0)'}
        self.assertTrue(rc.is_illustration(base))
        self.assertFalse(rc.is_illustration({**base, 'attribution': 'Ảnh: A / Wikimedia Commons, CC BY 4.0'}))
        self.assertFalse(rc.is_illustration({**base, 'url': None}))
        self.assertFalse(rc.is_illustration(None))
        advisory = rc.evaluate(rc.DEFAULT_BUNDLE)['advisory']
        self.assertEqual(advisory['Món dùng ảnh minh họa nhóm']['actual'], 0)

    def test_json_report_and_exit_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'report.json'
            sys.argv = ['release_catalogue_check.py', '--json', str(out)]
            self.assertEqual(rc.main(), 1)
            data = json.loads(out.read_text(encoding='utf-8'))
            self.assertFalse(data['pass'])
            self.assertEqual(data['datasetVersion'], '1.2.0')


if __name__ == '__main__':
    unittest.main()
