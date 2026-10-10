import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('base_catalogue',ROOT/'data-preparation/scripts/base_catalogue.py')
bc=importlib.util.module_from_spec(spec);spec.loader.exec_module(bc)

class BaseCatalogueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows=bc.read_csv(bc.BASE/'snapshots/thu_duc_dishes_taxonomy.csv')
        cls.rules=bc.load_json(bc.BASE/'config/base_dish_mapping_v1.json')
        cls.registry=bc.load_json(bc.BASE/'config/base_dish_registry.json')
        cls.output,cls.mapping=bc.build(cls.rows,cls.rules,cls.registry)
    def test_counts(self):
        from collections import Counter
        self.assertEqual(len(self.output),39)
        self.assertEqual(Counter(m['status'] for m in self.mapping),{'mapped':216,'needs_review':2,'excluded':1})
    def test_rename_stable_id(self):
        registry=copy.deepcopy(self.registry);registry['dishes'][0]['name']='Tên hiển thị mới'
        out,_=bc.build(self.rows,self.rules,registry)
        self.assertEqual({x['id'] for x in out},{x['id'] for x in self.output})
    def test_changed_source_requires_mapping(self):
        rows=copy.deepcopy(self.rows);rows[0]['dish_name']='Món mới'
        with self.assertRaises(ValueError):bc.build(rows,self.rules,self.registry)
    def test_unknown_source_requires_mapping(self):
        with self.assertRaises(ValueError):bc.build(self.rows[:-1],self.rules,self.registry)
    def test_offering_preserved(self):
        raw={o['menu_item_id']:o for r in self.rows for o in json.loads(r['menu_offerings_json'])}
        for b in self.output:
            self.assertIsNone(b['flavor']);self.assertEqual(b['temperature'],'unknown')
            for o in b['menuOfferings']:self.assertEqual(o,raw[o['menu_item_id']])
    def test_not_topping_aliases(self):
        for b in self.output:self.assertEqual(b['aliases'],[])
    def test_owner_groups(self):
        names={b['id']:b['name'] for b in self.output}
        mappings={m['sourceName']:names.get(m['baseDishId'],m['status']) for m in self.mapping}
        for source,target in [('Bún bò khô','Bún bò'),('Bún trộn bò lúc lắc','Bún bò'),('Phở gà','Phở gà'),('Bún bò chay','Bún bò chay'),('Cơm gapao','Cơm trộn'),('Phở bò gà','excluded'),('Phở thập cẩm','needs_review')]:
            self.assertEqual(mappings[source],target)
    def test_flavor_and_late_night(self):
        row=dict(self.rows[0]);row['taxonomy_flavors_json']=json.dumps({'spicy':'có vị này, chưa rõ mức','salty':'unknown','sweet':'không có — nguồn nói rõ','sour':'nhẹ'},ensure_ascii=False)
        row['taxonomy_meal_slots_json']='["khuya"]'
        p=bc.convert_profile(row)
        self.assertEqual(p['flavor']['spicy'],{'present':True,'intensity':'unknown'})
        self.assertEqual(p['flavor']['salty'],{'present':None,'intensity':'unknown'})
        self.assertEqual(p['flavor']['sweet'],{'present':False,'intensity':'none'})
        self.assertEqual(p['mealSlots'],[]);self.assertEqual(p['timeHints'],['late_night'])
    def test_repeat_exports(self):
        with tempfile.TemporaryDirectory() as d:
            bc.export(self.output,self.mapping,Path(d))
            before={p.name:p.read_bytes() for p in Path(d).iterdir()}
            bc.export(self.output,self.mapping,Path(d))
            self.assertEqual(before,{p.name:p.read_bytes() for p in Path(d).iterdir()})
