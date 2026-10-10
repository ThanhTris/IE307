"""Boundary tests for the public-menu research notebook; never downloads data."""
import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import unicodedata
import unittest
from collections import defaultdict
from urllib.parse import urljoin


NOTEBOOK = Path(__file__).resolve().parents[1] / 'data-preparation/notebooks/prepare_thu_duc_menus.ipynb'


def load_functions():
    namespace = dict(hashlib=hashlib, json=json, re=re, unicodedata=unicodedata,
                     defaultdict=defaultdict, urljoin=urljoin)
    if importlib.util.find_spec('lxml'):
        from lxml import html
        namespace['html'] = html
    if importlib.util.find_spec('pandas'):
        import pandas as pd
        namespace['pd'] = pd
    names = {'SPELLING', 'ROOTS', 'DRINK', 'SIDE', 'SIDE_EXACT', 'NON_MEAL'}
    functions = {'digest', 'stable_id', 'norm', 'text', 'as_json', 'classify',
                 'jsonld_restaurant', 'parse_menu', 'build_final_catalogue'}
    for cell in json.loads(NOTEBOOK.read_text('utf-8'))['cells']:
        if cell['cell_type'] != 'code':
            continue
        tree = ast.parse(cell['source'])
        selected = [node for node in tree.body if
                    (isinstance(node, ast.FunctionDef) and node.name in functions) or
                    (isinstance(node, ast.Assign) and any(
                        isinstance(t, ast.Name) and t.id in names for t in node.targets))]
        exec(compile(ast.Module(body=selected, type_ignores=[]), str(NOTEBOOK), 'exec'), namespace)
    return namespace


class MenuNameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_functions()

    def classify(self, name, **extra):
        return self.ns['classify']({**dict(menu_name_raw=name, menu_groups_json='[]',
                                         venue_name='Quán thử', scope_status='selected_address_matches'),
                                   **extra})

    def test_accents_do_not_merge_different_dishes(self):
        for a, b in [('phở', 'phô'), ('cốm', 'cơm'), ('chạo', 'cháo')]:
            self.assertNotEqual(self.ns['norm'](a), self.ns['norm'](b))
        self.assertEqual(self.classify('Cá cơm chiên')['mapping_status'], 'needs_review')

    def test_fish_cake_and_pork_noodles_stay_separate(self):
        self.assertNotEqual(self.classify('Bún chả cá')['normalized_name'], self.classify('Bún chả')['normalized_name'])

    def test_size_can_share_dish_but_toppings_and_soup_cannot(self):
        small, large = self.classify('Bánh mì heo quay - nhỏ'), self.classify('Bánh mì heo quay - lớn')
        self.assertEqual(small['dish_id'], large['dish_id'])
        self.assertNotEqual(small['size_variant'], large['size_variant'])
        self.assertNotEqual(self.classify('Hủ tiếu khô')['dish_id'], self.classify('Hủ tiếu nước')['dish_id'])
        self.assertNotEqual(self.classify('Cơm sườn')['dish_id'], self.classify('Cơm sườn trứng')['dish_id'])

    def test_combo_and_group_prices_are_not_individual_meals(self):
        for name in ('Combo cơm sườn + Coca', 'Set 2 người', 'Lẩu gà ớt hiểm'):
            result = self.classify(name)
            self.assertEqual(result['mapping_status'], 'needs_review')
            self.assertFalse(result['dish_id'])

    def test_sides_and_sauce_do_not_create_main_dishes(self):
        for name in ('Cơm thêm', 'Cơm trắng', 'Mắm tôm', 'Trứng', 'Phở thêm', 'Bánh cuốn trứng thêm'):
            self.assertEqual(self.classify(name)['mapping_status'], 'excluded')

    def test_short_ambiguous_names_need_review(self):
        for name in ('Tái', 'Đặc biệt', 'Nạm', 'Gà chiên nước mắm', 'Cơm', 'Phở'):
            self.assertEqual(self.classify(name)['mapping_status'], 'needs_review')

    def test_vegetarian_context_is_not_merged_into_meat(self):
        row = dict(menu_name_raw='Bún bò', menu_groups_json='[]', venue_name='Quán chay',
                   scope_status='selected_address_matches')
        self.assertEqual(self.ns['classify'](row)['mapping_status'], 'needs_review')
        self.assertNotEqual(self.classify('Bún bò')['dish_id'], self.classify('Bún bò chay')['dish_id'])

    def test_wrong_address_prevents_candidate(self):
        row = dict(menu_name_raw='Cơm sườn', menu_groups_json='[]', venue_name='Quán thử',
                   scope_status='needs_address_review')
        result = self.ns['classify'](row)
        self.assertEqual(result['mapping_status'], 'needs_review')
        self.assertFalse(result['dish_id'])

    def test_unicode_equivalence_and_ids_are_stable(self):
        composed = self.classify('Cơm sườn')
        decomposed = self.classify(unicodedata.normalize('NFD', 'CƠM SƯỜN'))
        self.assertEqual(composed['dish_id'], decomposed['dish_id'])

    def test_explicit_menu_groups_prevent_drinks_and_sides_from_entering_meals(self):
        for name, group in [('Cam vắt lớn', 'Nước Uống'), ('Nem lụi cây', 'Món thêm'),
                            ('Cơm lam', 'MÓN ĂN CHƠI')]:
            self.assertEqual(self.classify(name, menu_groups_json=json.dumps([group]))['mapping_status'],
                             'excluded')
        self.assertEqual(self.classify('Bún thịt nướng')['mapping_status'], 'candidate')
        self.assertEqual(self.classify('Bún thêm')['mapping_status'], 'excluded')

    def test_chay_group_is_explicit_evidence_and_stays_separate(self):
        row = dict(menu_name_raw='Bún bò', menu_groups_json='["Bún Chay Thập Phương"]',
                   venue_name='Quán thử', scope_status='selected_address_matches')
        chay = self.ns['classify'](row)
        self.assertEqual(chay['canonical_name'], 'Bún bò chay')
        self.assertEqual(chay['mapping_status'], 'candidate')
        self.assertNotEqual(chay['dish_id'], self.classify('Bún bò')['dish_id'])
        self.assertEqual(self.ns['classify']({**row, 'scope_status':'needs_address_review'})['mapping_status'],
                         'needs_review')

    def test_quantity_and_size_never_strip_a_combo_into_a_single_meal(self):
        small, large = self.classify('1 Mì Ý Jolly vừa'), self.classify('1 Mì Ý Jolly lớn')
        self.assertEqual(small['dish_id'], large['dish_id'])
        self.assertNotEqual(small['size_variant'], large['size_variant'])
        self.assertEqual(self.classify('1 Mì Ý Jolly + 1 Nước ngọt lớn')['mapping_status'], 'needs_review')
        self.assertEqual(self.classify('2 Mì Ý Jolly')['mapping_status'], 'needs_review')


@unittest.skipUnless(importlib.util.find_spec('pandas'), 'Use the documented runtime with pandas for export tests')
class FinalCatalogueTests(unittest.TestCase):
    def test_merged_dish_preserves_each_venue_price_description_and_image(self):
        import pandas as pd
        ns = load_functions()
        raw = pd.DataFrame([
            dict(menu_item_id='m1', venue_id='v1', source_url='https://example.test/a',
                 menu_name_raw='Cơm sườn nhỏ', survey_cluster='A', venue_name='Quán A',
                 address='Địa chỉ A', description_raw='Mô tả A', price_value='30000',
                 currency='VND', price_unit='menu_item_unspecified', image_url='',
                 checked_at='2026-10-09T00:00:00Z', snapshot_sha256='hash-a'),
            dict(menu_item_id='m2', venue_id='v2', source_url='https://example.test/b',
                 menu_name_raw='Cơm sườn lớn', survey_cluster='B', venue_name='Quán B',
                 address='Địa chỉ B', description_raw='Mô tả B', price_value='60000',
                 currency='VND', price_unit='menu_item_unspecified', image_url='https://example.test/b.jpg',
                 checked_at='2026-10-09T01:00:00Z', snapshot_sha256='hash-b'),
            dict(menu_item_id='excluded', venue_id='v3', source_url='https://example.test/c',
                 menu_name_raw='Cơm thêm', survey_cluster='C', venue_name='Quán C',
                 address='Địa chỉ C', description_raw='', price_value='10000',
                 currency='VND', price_unit='menu_item_unspecified', image_url='',
                 checked_at='2026-10-09T01:00:00Z', snapshot_sha256='hash-c')])
        mapping = pd.DataFrame([
            dict(menu_item_id=m, dish_id='d1' if m != 'excluded' else '',
                 mapping_status='candidate' if m != 'excluded' else 'excluded',
                 mapping_reason='Fixture', alias_changes_json='[]') for m in raw.menu_item_id])
        catalogue = pd.DataFrame([dict(dish_id='d1', canonical_name='Cơm sườn', root_dish='cơm',
            category='cơm', aliases_json='["Cơm sườn nhỏ","Cơm sườn lớn"]',
            size_variants_json='["nhỏ","lớn"]', venue_count=2, menu_item_count=2,
            source_urls_json='["https://example.test/a","https://example.test/b"]',
            images_json='[]', descriptions_json='[]', cuisine='unknown', origin='unknown',
            temperature='unknown', flavor='unknown', meal_slots='needs_review')])
        result = ns['build_final_catalogue'](raw, mapping, catalogue)
        self.assertEqual(len(result), 1)
        dish = result.iloc[0]
        self.assertEqual(dish.example_menu_item_id, 'm2')
        self.assertEqual(dish.example_price_value, '60000')
        self.assertEqual(dish.example_description, 'Mô tả B')
        self.assertEqual(dish.example_source_url, 'https://example.test/b')
        offerings = json.loads(dish.menu_offerings_json)
        self.assertEqual({o['menu_item_id'] for o in offerings}, {'m1','m2'})
        self.assertEqual({o['snapshot_sha256'] for o in offerings}, {'hash-a','hash-b'})
        self.assertEqual(offerings[0]['price_value'], '30000')
        with self.assertRaises(AssertionError):
            ns['build_final_catalogue'](raw[raw.menu_item_id.ne('m2')], mapping, catalogue)


class SnapshotIntegrityTests(unittest.TestCase):
    def test_modified_snapshot_is_rejected_before_it_can_feed_catalogue(self):
        cells = json.loads(NOTEBOOK.read_text('utf-8'))['cells']
        retrieval = next(c['source'] for c in cells if c['cell_type'] == 'code'
                         and "manifest = json.loads" in c['source'])
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'html').mkdir()
            (root / 'html/src.html').write_bytes(b'modified source')
            manifest_path = root / 'source_manifest.json'
            manifest_path.write_text(json.dumps({'schema_version':1, 'sources':{
                'src': {'sha256':hashlib.sha256(b'original source').hexdigest()}}}))
            ns = dict(json=json, MANIFEST_PATH=manifest_path, RAW_DIR=root,
                      sources=[{'source_id':'src'}], REFRESH=False, ALLOW_NETWORK=False,
                      digest=lambda data: hashlib.sha256(data).hexdigest())
            with self.assertRaisesRegex(ValueError, 'Snapshot không đúng manifest'):
                exec(compile(retrieval, str(NOTEBOOK), 'exec'), ns)


@unittest.skipUnless(importlib.util.find_spec('lxml'), 'Use the documented Python runtime with lxml for parser tests')
class MenuParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_functions()

    def test_featured_duplicate_keeps_groups_images_and_unknown_stock(self):
        fixture = '''<html><h1>Quán thử</h1><section aria-label="Thực đơn của nhà hàng">
        <div><h3>Món phải thử</h3><article><h4>Cơm sườn</h4><p>Sườn nướng</p><data value="50000">50.000 ₫</data></article></div>
        <div><h3>Cơm</h3><article><h4>Cơm sườn</h4><p>Sườn nướng</p><data value="50000">50.000 ₫</data></article></div></section>
        <article data-dish-id="42" aria-disabled="true"><h3>Cơm sườn</h3><img src="/food.jpg" alt="Cơm sườn"/><span>50.000 ₫</span></article></html>'''
        source = dict(platform='befood', source_id='source', url='https://food.be.com.vn/ho-chi-minh/test')
        rows, _, diagnostics = self.ns['parse_menu'](fixture.encode(), source)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['source_occurrence_count'], 2)
        self.assertEqual(set(json.loads(rows[0]['menu_groups_json'])), {'Cơm','Món phải thử'})
        self.assertEqual(rows[0]['image_url'], 'https://food.be.com.vn/food.jpg')
        self.assertEqual(rows[0]['availability'], 'unknown')
        self.assertEqual(diagnostics['seo_occurrences'], 2)

    def test_identical_name_with_distinct_platform_ids_is_not_lost(self):
        fixture = '''<h1>Quán thử</h1><section aria-label="Thực đơn của nhà hàng"><div><h3>Cơm</h3>
        <article><h4>Cơm sườn</h4><data value="50000">50.000 ₫</data></article></div></section>
        <article data-dish-id="1"><h3>Cơm sườn</h3><span>50.000 ₫</span></article>
        <article data-dish-id="2"><h3>Cơm sườn</h3><span>50.000 ₫</span></article>'''
        source = dict(platform='befood', source_id='source', url='https://food.be.com.vn/test')
        rows, _, _ = self.ns['parse_menu'](fixture.encode(), source)
        self.assertEqual({r['platform_item_id'] for r in rows}, {'1','2'})
        self.assertEqual(len({r['menu_item_id'] for r in rows}), 2)
        self.assertTrue(all(r['metadata_match_status'] == 'ambiguous_name_price' for r in rows))

    def test_discount_price_does_not_drop_image_or_overwrite_source_price(self):
        fixture = '''<h1>Quán thử</h1><section aria-label="Thực đơn của nhà hàng"><div><h3>Cơm</h3>
        <article><h4>Cơm sườn</h4><data value="50000">50.000 ₫</data></article></div></section>
        <article data-dish-id="42"><h3>Cơm sườn</h3><img src="/dish.jpg"/>
        <span>50.000 ₫</span><span>40.000 ₫</span></article>'''
        source = dict(platform='befood', source_id='source', url='https://food.be.com.vn/test')
        rows, _, _ = self.ns['parse_menu'](fixture.encode(), source)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['platform_item_id'], '42')
        self.assertEqual(rows[0]['price_value'], '50000')
        self.assertEqual(json.loads(rows[0]['ui_price_labels_json']), ['50.000 ₫','40.000 ₫'])
        self.assertTrue(rows[0]['image_url'])

    def test_card_missing_from_seo_menu_is_retained_for_review(self):
        fixture = '''<h1>Quán thử</h1><section aria-label="Thực đơn của nhà hàng"><div><h3>Cơm</h3>
        <article><h4>Cơm sườn</h4><data value="50000">50.000 ₫</data></article></div></section>
        <article data-dish-id="99"><h3>Cơm gà</h3><span>60.000 ₫</span></article>'''
        source = dict(platform='befood', source_id='source', url='https://food.be.com.vn/test')
        rows, _, diagnostics = self.ns['parse_menu'](fixture.encode(), source)
        self.assertEqual(len(rows), 2)
        self.assertEqual(diagnostics['unmatched_cards_kept'], 1)
        ui_row = next(r for r in rows if r['platform_item_id'] == '99')
        self.assertEqual(ui_row['metadata_match_status'], 'ui_only_needs_review')
        self.assertEqual(ui_row['price_value'], '')

    def test_no_menu_is_reported_instead_of_silent_success(self):
        source = dict(platform='befood', source_id='source', url='https://food.be.com.vn/test')
        rows, _, diagnostics = self.ns['parse_menu'](b'<h1>Shop</h1>', source)
        self.assertFalse(rows)
        self.assertEqual(diagnostics['parse_state'], 'menu_missing')


if __name__ == '__main__':
    unittest.main()
