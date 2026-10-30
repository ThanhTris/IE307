"""Admission and artifact contract for adoption of the received GM18 projection."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from jsonschema import Draft202012Validator, FormatChecker

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('gm40_projection_tests',ROOT/'data-preparation/scripts/catalogue_projection.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class ProjectionAdoptionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle,cls.sha=p.candidate(ROOT/p.contract.BUNDLE_PATH,ROOT/p.contract.MANIFEST_PATH)
        cls.projection=p.document(cls.bundle,cls.sha)

    def test_no_new_source_version_or_identity(self):
        self.assertEqual(self.sha,'776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f')
        self.assertEqual(self.projection['releaseId'],'dish-catalogue-v1:1.1.0:gm18.2')
        self.assertEqual({c['dishId'] for c in self.projection['cards']},{d['id'] for d in self.bundle['entities']['dishes']})
        self.assertEqual(len(self.projection['cards']),39)
        self.assertTrue(all(not {'enteredBy','reviewedBy','sourceDishIds','venueId'} & c.keys() for c in self.projection['cards']))

    def test_two_builds_are_byte_identical_without_database(self):
        with patch.object(p.food,'LocalDB',side_effect=AssertionError('No DB in offline build')):
            self.assertEqual(p.build(),p.build())
        for path,raw in p.build().items():self.assertEqual(path.read_bytes(),raw)

    def test_stage_keeps_full_source_and_rich_projection(self):
        with tempfile.TemporaryDirectory() as directory:
            d=Path(directory)
            result=p.stage(ROOT/p.contract.BUNDLE_PATH,d,ROOT/p.contract.MANIFEST_PATH)
            self.assertEqual(result,self.projection)
            self.assertEqual((d/'bundle.json').read_bytes(),(ROOT/p.contract.BUNDLE_PATH).read_bytes())
            self.assertEqual(json.loads((d/'stage.json').read_text()),self.projection)
        with self.assertRaises(ValueError):p.stage(ROOT/p.contract.BUNDLE_PATH,ROOT/'supabase/seed/catalogue')

    def test_stage_refuses_symlink_output(self):
        with tempfile.TemporaryDirectory() as directory:
            d=Path(directory);(d/'stage.json').symlink_to(ROOT/p.contract.BUNDLE_PATH)
            with self.assertRaisesRegex(ValueError,'symlink'):p.stage(ROOT/p.contract.BUNDLE_PATH,d)

    def test_schema_preserves_received_nullable_metadata_and_rejects_extra_fields(self):
        v=Draft202012Validator(p.schema_document(),format_checker=FormatChecker())
        row=deepcopy(self.projection);card=row['cards'][0]
        card['priceObservation']={'amount':35000,'currency':None,'unit':None,'sourceRef':None,'servingSize':None,'observedAt':'2026-10-10T00:00:00Z'}
        card['priceReference']=None;card['temperature']=None;card['flavor']=None;card['artwork']=None
        self.assertTrue(v.is_valid(row))
        card['venueId']='fake-venue';self.assertFalse(v.is_valid(row))
        del card['venueId'];card['priceObservation']['amount']=-1;self.assertFalse(v.is_valid(row))

    def test_coverage_is_honest_and_not_a_new_filter(self):
        report=p.coverage(self.bundle,self.projection)
        self.assertEqual({k:v['available'] for k,v in report['meals'].items()},{'breakfast':14,'lunch':23,'dinner':7,'snack':1})
        self.assertEqual(report['unlabelledMeals'],9)
        self.assertEqual(report['meals']['dinner']['shortfall20'],13)
        self.assertEqual(report['price']['displayable'],17)
        self.assertEqual(len(report['price']['latestTimestampTieDishIds']),22)
        self.assertTrue(all(c['priceReference'] is None for c in self.projection['cards'] if c['dishId'] in report['price']['latestTimestampTieDishIds']))

    def test_source_manifest_conflict_still_rejected(self):
        changed=deepcopy(self.bundle);changed['entities']['priceReferences'][0]['value']+=1
        with tempfile.TemporaryDirectory() as directory:
            q=Path(directory)/'changed.json';q.write_bytes(p.contract.encoded(changed))
            with self.assertRaises(ValueError):p.candidate(q,ROOT/p.contract.MANIFEST_PATH)

    def test_report_cannot_overwrite_source_before_allocating_qa(self):
        import subprocess,sys
        source=ROOT/p.contract.BUNDLE_PATH
        before=source.read_bytes()
        run=subprocess.run([sys.executable,str(ROOT/'scripts/gm40_rich_projection_check.py'),'--report',str(source)],capture_output=True,text=True)
        self.assertNotEqual(run.returncode,0)
        self.assertIn('Report cannot overwrite',run.stderr)
        self.assertEqual(source.read_bytes(),before)

    def test_application_database_is_refused_before_sql(self):
        class Application:
            database='postgres'
            def psql(self,sql):raise AssertionError('No app SQL')
        for action in [lambda:p.install(Application(),'00000000-0000-4000-8000-000000000001',ROOT/p.contract.BUNDLE_PATH),lambda:p.readback(Application(),'00000000-0000-4000-8000-000000000001',self.projection['releaseId']),lambda:p.activate(Application(),'00000000-0000-4000-8000-000000000001',self.projection['releaseId'])]:
            with self.assertRaises(ValueError):action()

if __name__=='__main__':unittest.main()
