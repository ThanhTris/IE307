"""GM-04 field contract assertions. Synthetic inputs; no eligibility/RPC/SQL."""
from copy import deepcopy
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_field_contracts as build
import gm04_contract_model as model
import validate_field_contracts as check


class FieldContractTests(unittest.TestCase):
    def test_templates_have_all_entities_and_no_real_survey_ids(self):
        food,core=build.templates()
        self.assertTrue(food['fixtureOnly']);self.assertTrue(core['fixtureOnly'])
        self.assertEqual(set(food['entities']),set(model.FOOD))
        self.assertEqual(set(core['entities']),set(model.CORE))
        self.assertTrue(all(core['entities'].values()))
        self.assertTrue(all(food['entities'].values()))
        survey=json.loads((ROOT/'data-preparation/config/base_dish_registry.json').read_text(encoding='utf-8'))
        survey_ids={r['id'] for r in survey['dishes']}
        self.assertEqual(len(survey_ids),39)
        self.assertTrue(survey_ids.isdisjoint({r['id'] for r in food['entities']['dishes']}))
        self.assertIsNone(food['entities']['dishes'][0]['artwork'])
        self.assertTrue(all('example.invalid' in r['locator'] for r in food['entities']['dataSources']))

    def test_committed_artifacts_match_deterministic_offline_builder(self):
        with patch.object(socket,'socket',side_effect=AssertionError('offline')):
            first=build.artifacts();second=build.artifacts()
        self.assertEqual(first,second)
        for path,content in first.items():self.assertEqual((ROOT/path).read_bytes(),content.encode(),path)

    def test_adapter_keeps_legacy_input_and_unknowns(self):
        old=check.load_json(ROOT/'data-preparation/templates/examples/dataset.json');before=deepcopy(old)
        new=model.adapt_food_legacy(old)
        self.assertEqual(old,before);self.assertEqual(new['contractVersion'],'1.1.0')
        self.assertEqual(new['entities']['dishes'],old['entities']['dishes'])
        self.assertIsNone(new['entities']['venues'][0]['scheduleId'])
        self.assertIsNone(new['entities']['weeklySchedules'][0]['lastOrder'])
        self.assertEqual(check.validate_food(new,'2026-10-10T00:00:00Z'),[])
        old['entities']['dateExceptions'][0]['lastOrder']='23:00'
        with self.assertRaisesRegex(ValueError,'day-offset review'):model.adapt_food_legacy(old)

    def test_adapter_real_catalogue_preserves_dish_ids_and_data(self):
        paths=list((ROOT/'data-preparation/snapshots').glob('**/catalogue.json'))
        if not paths:
            paths=list((ROOT/'data-preparation/snapshots').glob('**/dataset.json'))
        self.assertTrue(paths)
        for path in paths:
            old=check.load_json(path)
            if 'entities' not in old:continue
            new=model.adapt_food_legacy(old)
            self.assertEqual(new['entities']['dishes'],old['entities']['dishes'])
            self.assertEqual(new['datasetVersion'],old['datasetVersion'])
            self.assertEqual(check.validate_food(new,'2026-10-10T03:00:00Z'),[])

    def test_schema_unknown_keyword_and_external_ref_fail_closed(self):
        with self.assertRaisesRegex(ValueError,'Unsupported'):check.audit_schema({'type':'object','not':{}})
        with self.assertRaisesRegex(ValueError,'local-only'):check.audit_schema({'$ref':'https://example.invalid/schema'})
        with self.assertRaisesRegex(ValueError,'local-only'):check.audit_schema({'$ref':'#/$defs/missing'})
        for kind in ['food','core']:check.audit_schema(model.schema(kind))

    def test_required_nullable_additional_properties_distinct(self):
        schema=model.obj({'a':model.nullable({'type':'string'})})
        self.assertEqual(check.schema_errors({'a':None},schema),[])
        self.assertTrue(check.schema_errors({},schema))
        self.assertTrue(check.schema_errors({'a':None,'b':None},schema))
        self.assertTrue(check.schema_errors({'a':False},schema))
        self.assertTrue(check.schema_errors(True,{'enum':[1]}))
        self.assertEqual(check.schema_errors(1.0,{'type':'integer'}),[])
        self.assertTrue(check.schema_errors(True,{'type':'integer'}))

    def test_json_duplicate_keys_nonfinite_values_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'input.json'
            for content in ['{"a":1,"a":2}','{"a":NaN}','{"a":Infinity}']:
                path.write_text(content)
                with self.assertRaises(ValueError):check.load_json(path)

    def test_validator_readonly_offline_repeatable(self):
        food,core=build.templates();before=deepcopy((food,core))
        with patch.object(socket,'socket',side_effect=AssertionError('offline')):
            self.assertEqual(check.validate_food(food,'2026-10-10T00:00:00Z'),[])
            self.assertEqual(check.validate_core(core,food,'2026-10-10T00:00:00Z'),[])
            self.assertEqual(check.run_cases(),check.run_cases())
        self.assertEqual((food,core),before)

    def test_field_coverage_complete_and_privacy_specific(self):
        records=check.load_json(ROOT/'docs/data/field-coverage.json')
        required={'type','required','nullable','default','enum','unit','timezone','fk','unique','privacy','version','source','validExample','invalidExample','unknownExample'}
        for kind,definitions in [('food',model.FOOD),('core',model.CORE)]:
            index={r['path']:r for r in records if r['contract']==kind}
            for entity,d in definitions.items():
                for field in d['fields']:
                    self.assertIn(entity+'.'+field,index)
                    self.assertTrue(required<=index[entity+'.'+field].keys())
            if kind=='core':
                self.assertEqual(index['rooms.consentSnapshot']['privacy'],'server_only')
                self.assertIn('never shared',index['results.tiedChoiceIds']['privacy'])
                self.assertIn('never log',index['devices.pushToken']['privacy'])

    def test_use_case_coverage_resolves_fields_cases_schema_and_template(self):
        document=check.load_json(ROOT/'docs/data/use-case-coverage.json')
        self.assertEqual(document['contractId'],model.CONTRACT_ID)
        cases={c['id'] for c in check.load_json(ROOT/'tests/fixtures/food-v1/contract-cases.json')['cases']}
        self.assertEqual(len(document['useCases']),20)
        for use_case in document['useCases']:
            self.assertTrue({'GM-06','GM-07'}<=set(use_case['consumers']))
            self.assertTrue(set(use_case['caseIds'])<=cases)
            for artifact in use_case['artifacts']:
                for key in ['schema','template']:
                    path,pointer=artifact[key].split('#',1)
                    value=check.load_json(ROOT/path)
                    for part in pointer.strip('/').split('/'):
                        value=value[int(part)] if isinstance(value,list) else value[part]

    def test_operation_mapping_covers_existing_p0_writes_without_guessing_version(self):
        existing={'create_room','join_room','update_preferences','update_context','set_ready','start_round',
                  'submit_ballot','cancel_room','leave_room','invite_partner','accept_partner','reject_partner',
                  'unfriend','invite_to_room','accept_room_invite','register_push_device','unregister_push_device',
                  'delete_history','update_history_consent'}
        self.assertEqual({rpc for rpc,_,_ in model.OPERATION_RULES.values() if rpc},existing)
        for op in ['join_room','accept_room_invite','update_history_consent','accept_friend_invite']:
            self.assertFalse(model.OPERATION_RULES[op][1])
        self.assertTrue(model.OPERATION_RULES['submit_ballot'][1])

    def test_generated_bytes_survive_autocrlf_checkout_and_legacy_csv_stays_exact(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)
            def git(*args):
                return subprocess.run(['git',*args],cwd=out,check=True,capture_output=True)
            git('init','--quiet');git('config','core.autocrlf','true')
            (out/'.gitattributes').write_bytes((ROOT/'.gitattributes').read_bytes())
            path=out/'supabase/seed/templates/core-v1.template.json';path.parent.mkdir(parents=True)
            value=build.artifacts()['supabase/seed/templates/core-v1.template.json'].encode('utf-8');path.write_bytes(value)
            csv=out/'data-preparation/snapshots/sample.csv';csv.parent.mkdir(parents=True)
            raw=b'\xef\xbb\xbfID,name\r\n1,unchanged\r\n';csv.write_bytes(raw)
            git('add','.');path.unlink();csv.unlink();git('checkout-index','--all')
            self.assertEqual(path.read_bytes(),value)
            self.assertEqual(csv.read_bytes(),raw)

    def test_explicit_utf8_loader_preserves_vietnamese_under_non_utf8_locale(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'input.json';path.write_bytes('{"món":"Bún bò"}'.encode('utf-8'))
            with patch('locale.getencoding',return_value='cp1252'):
                self.assertEqual(check.load_json(path),{'món':'Bún bò'})

    def test_effective_profile_can_inherit_base_but_not_another_offering(self):
        food,core=build.templates()
        core['entities']['roundDishes'][0]['effectiveProfile']={'temperature':food['entities']['dishes'][0]['temperature']}
        self.assertEqual(check.validate_core(core,food,'2026-10-10T00:00:00Z'),[])
        core['entities']['roundDishes'][0]['effectiveProfile']['temperature']='cold'
        self.assertTrue(any(e['code']=='POOL' for e in check.validate_core(core,food,'2026-10-10T00:00:00Z')))

    def test_dictionary_valid_and_invalid_examples_against_each_field_schema(self):
        records=check.load_json(ROOT/'docs/data/field-coverage.json')
        for kind in ['food','core']:
            index={r['path']:r for r in records if r['contract']==kind}
            def walk(s,path):
                record=index[path]
                self.assertEqual(check.schema_errors(record['validExample'],s),[],path)
                self.assertTrue(check.schema_errors(record['invalidExample'],s),path)
                shape=next((p for p in s.get('anyOf',[]) if p.get('type')!='null'),s)
                for key,child in shape.get('properties',{}).items():walk(child,path+'.'+key)
                if shape.get('items',{}).get('type')=='object':walk(shape['items'],path+'[]')
            schema=model.schema(kind)
            for entity,definition in schema['$defs'].items():
                for key,field in definition['properties'].items():walk(field,entity+'.'+key)
            for key,field in schema['properties'].items():
                if key!='entities':walk(field,'bundle.'+key)

    def test_consent_cannot_be_granted_after_history_result(self):
        food,core=build.templates()
        core['entities']['consents'][1]['grantedAt']='2026-10-09T14:30:00Z'
        self.assertTrue(any(e['code']=='CONSENT' and e['path']=='$.entities.histories[1].consentIds' for e in check.validate_core(core,food,'2026-10-10T00:00:00Z')))

    def test_suite_rejects_empty_unmarked_duplicate_and_unasserted_cases(self):
        suite=check.load_json(ROOT/'tests/fixtures/food-v1/contract-cases.json')
        check.validate_case_suite(suite)
        for change in [lambda s:s.update(cases=[]),lambda s:s.update(fixtureOnly=False),
                       lambda s:s['cases'].append(deepcopy(s['cases'][0])),
                       lambda s:s['cases'][0].update(expected={'valid':False,'errors':[]})]:
            broken=deepcopy(suite);change(broken)
            with self.assertRaises(ValueError):check.validate_case_suite(broken)


def make_case_test(case):
    def test(self):
        food,core=build.templates()
        target=check.case_input(food if case['contract']=='food' else core,case)
        errors=check.validate_food(target,case['validationAt']) if case['contract']=='food' else check.validate_core(target,food,case['validationAt'])
        self.assertEqual(not errors,case['expected']['valid'],errors)
        for expected in case['expected']['errors']:
            self.assertTrue(any(e['code']==expected['code'] and e['path']==expected['path'] for e in errors),errors)
    return test

for _case in check.load_json(ROOT/'tests/fixtures/food-v1/contract-cases.json')['cases']:
    setattr(FieldContractTests,'test_case_'+_case['id'].replace('-','_'),make_case_test(_case))

if __name__=='__main__':unittest.main()
