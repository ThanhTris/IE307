from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest
from jsonschema import Draft202012Validator

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('gm18_projection',ROOT/'supabase/seed/import_gm18_catalogue.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)


class ProjectionTests(unittest.TestCase):
    def observation(self, **changes):
        return {'checkedAt':'2026-10-10T00:00:00Z','value':35000,'currency':'VND','unit':'portion','sourceRef':'source','servingSize':None,**changes}

    def test_latest_null_never_falls_back(self):
        selected=p.latest_observation([self.observation(),self.observation(checkedAt='2026-10-11T00:00:00Z',value=None)])
        self.assertIsNone(selected['amount']);self.assertIsNone(p.baseline_price(selected))

    def test_equivalent_offset_tie_hides_price(self):
        self.assertIsNone(p.latest_observation([self.observation(),self.observation(checkedAt='2026-10-10T07:00:00+07:00',value=40000)]))

    def test_unknown_date_cannot_win(self):
        self.assertEqual(p.latest_observation([self.observation(),self.observation(checkedAt=None,value=1)])['amount'],35000)
        for value in [None,'bad','2026-10-10T00:00:00','2026-02-30T00:00:00Z']:
            self.assertIsNone(p.stamp(value))

    def test_nullable_metadata_preserved_but_not_invented_on_baseline_wire(self):
        selected=p.latest_observation([self.observation(currency=None,unit=None,sourceRef=None)])
        self.assertEqual([selected[k] for k in ['currency','unit','sourceRef']],[None,None,None])
        self.assertIsNone(p.baseline_price(selected))

    def test_source_units_and_zero_are_preserved(self):
        selected=p.latest_observation([self.observation(value=0,unit='menu_item_unspecified')])
        self.assertEqual(p.baseline_price(selected)['amount'],0)
        self.assertEqual(p.baseline_price(selected)['unit'],'menu_item_unspecified')
        self.assertEqual(p.baseline_price(selected)['checkedAt'],'2026-10-10T00:00:00Z')

    def test_real_draft_projection_preserves_ids_meals_taxonomy_and_privacy(self):
        bundle,digest=p.upstream.candidate(ROOT/p.upstream.contract.BUNDLE_PATH,ROOT/p.upstream.contract.MANIFEST_PATH)
        original=deepcopy(bundle);cards=p.cards(bundle)
        self.assertEqual(bundle,original)
        self.assertEqual(len(cards),39)
        self.assertEqual({c['dishId'] for c in cards},{d['id'] for d in bundle['entities']['dishes']})
        for card in cards:
            dish=next(d for d in bundle['entities']['dishes'] if d['id']==card['dishId'])
            self.assertEqual(card['mealSlots'],dish['mealSlots'])
            self.assertEqual(card['cuisineLabels'],[t['label'] for t in card['cuisineTerms']])
            self.assertFalse({'enteredBy','reviewedBy','fieldSources','sourceDishIds'} & card.keys())
        self.assertNotEqual(p.release_id(bundle),p.upstream.release_id(bundle))
        self.assertEqual(len(digest),64)

    def test_default_importer_projection_stays_baseline(self):
        bundle,digest=p.upstream.candidate(ROOT/p.upstream.contract.BUNDLE_PATH)
        self.assertFalse(any('priceReference' in c for c in p.upstream.cards(bundle)))
        self.assertIn(p.release_id(bundle),p.upstream.import_sql(bundle,digest,projected_cards=p.cards(bundle),release_identifier=p.release_id(bundle)))
        self.assertNotIn(':gm18.2',p.upstream.import_sql(bundle,digest))

    def test_new_loader_refuses_application_db_before_any_write(self):
        class Application:
            database='postgres'
            def psql(self,sql):raise AssertionError('No application SQL allowed')
        with self.assertRaises(ValueError):p.install(Application(),'00000000-0000-0000-0000-000000000001',ROOT/p.upstream.contract.BUNDLE_PATH)

    def test_read_contract_has_exact_count_and_explicit_version(self):
        import json
        schema=json.loads((ROOT/'docs/architecture/schemas/gm18-dish-catalogue.schema.json').read_text())
        Draft202012Validator.check_schema(schema)
        validator=Draft202012Validator({**schema,'oneOf':[{'$ref':'#/$defs/previewRequest'}]})
        request={'payload':{'contractVersion':p.CONTRACT,'mealSlot':'lunch','dishCount':20}}
        for valid in [10,10.0,20,20.0]:
            self.assertTrue(validator.is_valid({'payload':{**request['payload'],'dishCount':valid}}))
        for invalid in [9,21,10.5,True,None,'10']:
            self.assertFalse(validator.is_valid({'payload':{**request['payload'],'dishCount':invalid}}))
        self.assertFalse(validator.is_valid({'payload':{**request['payload'],'contractVersion':'dish-session-v4/roadmap-v2/GM-07.B'}}))


if __name__=='__main__':unittest.main()
