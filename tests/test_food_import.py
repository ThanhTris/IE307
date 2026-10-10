"""GM-08 import/preflight checks; all approvals/data here are synthetic in memory."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('food_import',ROOT/'supabase/seed/import_food_data.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)
AS_OF = '2026-10-11T00:00:00Z'


def synthetic_reviewed():
    """No human approval asserted; private test helper, never a verified seed."""
    bundle = importer.load_json(ROOT/'supabase/seed/templates/food-v1.template.json')
    bundle['fixtureOnly'] = False
    entities = bundle['entities']
    source = entities['dataSources'][0]['sourceRef']
    for name,rows in entities.items():
        for row in rows:
            row.update(reviewStatus='verified',enteredBy='synthetic-author',reviewedBy='synthetic-reviewer',
                       validUntil='2026-11-09T00:00:00Z')
            if row.get('status')=='draft':
                row['status']='verified'
            if name=='dataSources':
                row.update(locator='https://www.wikidata.org/wiki/Q10608',usageRights='public_domain',license='Synthetic CC0 test record; not provenance')
            if name=='dishes':
                row['classificationStatus']='reviewed'
            groups = {'venues':('address','coordinates','hours'),'venueDishes':('menu','hours','price'),
                      'weeklySchedules':('hours',),'dateExceptions':('hours',),'coverageAreas':('coverage',),
                      'publicAnchors':('coordinates',),'availabilityOverrides':('availability',)}
            row['fieldSources'].update({k:source for k in groups.get(name,())})
    schedules = []
    originals = {r['scheduleId']:r for r in entities['weeklySchedules']}
    for original in originals.values():
        for day in range(1,8):
            row=deepcopy(original)
            row.update(id=str(uuid.uuid5(uuid.NAMESPACE_URL,original['id']+str(day))),dayOfWeek=day,
                       startTime='22:00',endTime='02:00',endDayOffset=1,is24Hours=False,
                       lastOrder=None,lastOrderDayOffset=None)
            schedules.append(row)
    entities['weeklySchedules']=schedules
    return bundle


class FoodImportTests(unittest.TestCase):
    def setUp(self):
        self.bundle=synthetic_reviewed()

    def codes(self,bundle=None,publish=True):
        return {e['code'] for e in importer.preflight(bundle or self.bundle,AS_OF,publish)['errors']}

    def test_reviewed_structural_bundle_passes_without_asserting_real_approval(self):
        self.assertEqual(self.codes(),set())
        self.assertFalse(importer.preflight(self.bundle,AS_OF,True)['pilotTarget']['quotaMet'])

    def test_fixture_blocked_even_when_shape_valid(self):
        self.bundle['fixtureOnly']=True
        self.assertIn('FIXTURE',self.codes(publish=False))

    def test_missing_required_and_broken_reference_rejected(self):
        del self.bundle['entities']['venues'][0]['address']
        self.assertIn('SCHEMA',self.codes())
        bundle=synthetic_reviewed()
        bundle['entities']['venueDishes'][0]['venueId']=str(uuid.uuid4())
        self.assertIn('FOOD_CONTRACT',self.codes(bundle))

    def test_stale_child_not_hidden_by_dataset_validity(self):
        self.bundle['entities']['weeklySchedules'][0]['validUntil']=AS_OF
        self.assertTrue(self.codes())

    def test_draft_is_stagable_but_not_publishable(self):
        for rows in self.bundle['entities'].values():
            for row in rows:
                row.update(reviewStatus='draft',reviewedBy=None,validUntil=None)
                if row.get('status')=='verified':row['status']='draft'
        self.assertEqual(self.codes(publish=False),set())
        self.assertIn('UNREVIEWED',self.codes())

    def test_source_rights_image_rights_and_independence(self):
        self.bundle['entities']['dataSources'][0]['usageRights']='unknown'
        self.assertIn('RIGHTS',self.codes())
        bundle=synthetic_reviewed()
        bundle['entities']['dishes'][0]['reviewedBy']='synthetic-author'
        self.assertTrue(self.codes(bundle))
        bundle=synthetic_reviewed()
        bundle['entities']['dishes'][0]['artwork']={'url':'https://x.invalid/image','sourceRef':bundle['entities']['dataSources'][0]['sourceRef'],'usageRights':'denied','license':None,'attribution':None}
        # Publish transformation reuses GM-04's image rights validation.
        for rows in bundle['entities'].values():
            for r in rows:
                r['reviewStatus']='published'
                if r.get('status')=='verified':r['status']='published'
        bundle['entities']['datasetVersions'][0].update(checksum='a'*64,artifactLocator='synthetic',qualityReport='synthetic',rollbackLocator='synthetic')
        self.assertTrue(self.codes(bundle))

    def test_reserved_sources_outside_coverage_and_provenance(self):
        self.bundle['entities']['dataSources'][0]['locator']='https://example.invalid/menu'
        self.assertIn('SOURCE',self.codes())
        bundle=synthetic_reviewed();bundle['entities']['venues'][0]['lat']=21
        self.assertIn('COVERAGE',self.codes(bundle))
        bundle=synthetic_reviewed();del bundle['entities']['venues'][0]['fieldSources']['coordinates']
        self.assertIn('PROVENANCE',self.codes(bundle))

    def test_schedule_intersection_and_closed_exception_block_overnight(self):
        rows=self.bundle['entities']['weeklySchedules']
        group=self.bundle['entities']['venueDishes'][0]['scheduleId']
        exceptions=self.bundle['entities']['dateExceptions']
        import datetime
        day=datetime.date(2026,10,10)
        self.assertEqual(importer.windows([r for r in rows if r['scheduleId']==group],exceptions,day),[])
        self.assertIn((0,120),importer.windows([r for r in rows if r['scheduleId']==group],[],day))
        self.assertIn((1320,1440),importer.windows([r for r in rows if r['scheduleId']==group],[],day))

    def test_last_order_clips_overlap_and_interval_end_is_exclusive(self):
        row=deepcopy(self.bundle['entities']['weeklySchedules'][0])
        row.update(dayOfWeek=5,startTime='22:00',endTime='02:00',lastOrder='01:30',lastOrderDayOffset=1)
        import datetime
        self.assertEqual(importer.windows([row],[],datetime.date(2026,10,10)),[(0,90)])

    def test_unknown_incomplete_and_disjoint_hours_block_publish(self):
        self.bundle['entities']['weeklySchedules'].pop()
        self.assertIn('HOURS',self.codes())
        bundle=synthetic_reviewed()
        schedule=bundle['entities']['venueDishes'][0]['scheduleId']
        for row in bundle['entities']['weeklySchedules']:
            if row['scheduleId']==schedule:
                row.update(startTime='05:00',endTime='06:00',endDayOffset=0)
        self.assertIn('HOURS',self.codes(bundle))

    def test_polygon_hole_and_boundaries(self):
        polygon={'coordinates':[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[3,2],[3,3],[2,3],[2,2]]]}
        self.assertTrue(importer.in_polygon(0,5,polygon))
        self.assertFalse(importer.in_polygon(2.5,2.5,polygon))
        self.assertFalse(importer.in_polygon(11,5,polygon))

    def prepare_stage(self,directory):
        source=directory/'input.json';importer.write_json(source,self.bundle)
        stage_dir=directory/'stage'
        with patch.object(importer,'now',return_value='2026-10-10T00:00:00Z'):
            importer.stage(source,stage_dir,AS_OF)
        evidence=directory/'checks.txt';evidence.write_text('Synthetic reviewer test only\n',encoding='utf-8')
        review=importer.load_json(stage_dir/'review-template.json')
        review.update(decision='Approved',reviewer='synthetic-reviewer',reviewedAt=AS_OF,
                      evidence=[{'path':'checks.txt','sha256':importer.digest(evidence.read_bytes())}],
                      coverageShortfallAccepted=True,coverageShortfallReason="Synthetic one-venue fixture; NOT actual pilot coverage")
        review['checks']={k:True for k in review['checks']}
        path=directory/'review.json';importer.write_json(path,review)
        return stage_dir,path

    def test_reviewed_bytes_publish_conversion_and_checksum(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage,path=self.prepare_stage(Path(tmp))
            bundle,sha,review_sha,report=importer.reviewed(stage,path,AS_OF)
            self.assertTrue(report['valid'])
            self.assertEqual(bundle['entities']['datasetVersions'][0]['checksum'],sha)
            self.assertEqual(review_sha,importer.digest(path.read_bytes()))
            self.assertTrue(all(r['reviewStatus']=='published' for rows in bundle['entities'].values() for r in rows))
            self.assertEqual(importer.load_json(stage/'bundle.json'),self.bundle)

    def test_staging_immutable_and_hash_tamper_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage,path=self.prepare_stage(Path(tmp))
            with self.assertRaises(FileExistsError):importer.stage(Path(tmp)/'input.json',stage,AS_OF)
            with (stage/'bundle.json').open('ab') as f:f.write(b'\n')
            with self.assertRaisesRegex(ValueError,'STAGE_HASH'):importer.reviewed(stage,path,AS_OF)

    def test_pending_wrong_hash_reviewer_and_evidence_fail(self):
        for field,value in [('decision','Pending'),('bundleSha256','b'*64),('reviewer','synthetic-author'),('coverageShortfallAccepted',False)]:
            with self.subTest(field=field),tempfile.TemporaryDirectory() as tmp:
                stage,path=self.prepare_stage(Path(tmp))
                review=importer.load_json(path);review[field]=value;importer.write_json(path,review)
                with self.assertRaises(ValueError):importer.reviewed(stage,path,AS_OF)
        with tempfile.TemporaryDirectory() as tmp:
            stage,path=self.prepare_stage(Path(tmp))
            (Path(tmp)/'checks.txt').write_text('changed',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'evidence'):importer.reviewed(stage,path,AS_OF)

    def test_review_path_traversal_and_self_review_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage,path=self.prepare_stage(Path(tmp))
            review=importer.load_json(path);review['evidence'][0]['path']='../outside.txt';importer.write_json(path,review)
            with self.assertRaisesRegex(ValueError,'path'):importer.reviewed(stage,path,AS_OF)

    def test_duplicate_json_keys_nonfinite_and_utf8_lf(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'bundle.json';p.write_text('{"x":1,"x":2}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'Duplicate'):importer.load_json(p)
            p.write_text('{"x":NaN}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'Non-finite'):importer.load_json(p)
            importer.write_json(p,{'name':'Cơm gà'})
            self.assertNotIn(b'\r',p.read_bytes());self.assertIn('Cơm gà',p.read_text(encoding='utf-8'))

    def test_sql_dollar_delimiter_text_stays_in_data_literal(self):
        self.bundle['entities']['dishes'][0]['name']="Cơm '$body$'; rollback; --"
        sql=importer.publish_sql(self.bundle,'a'*64,'b'*64)
        prefix=sql.split('do $body$')[0]
        self.assertIn("Cơm ''$body$''; rollback; --",prefix)
        self.assertNotIn('Cơm',sql.split('do $body$')[1])

    def test_remote_docker_context_and_host_override_refused(self):
        with patch.object(importer.LocalDB,'run',return_value='ssh://remote'):
            with self.assertRaisesRegex(ValueError,'Local Docker'):importer.LocalDB()
        with patch.object(importer.LocalDB,'run',return_value='unix:///local.sock'),patch.dict(os.environ,{'DOCKER_HOST':'https://remote'}):
            with self.assertRaisesRegex(ValueError,'Local Docker'):importer.LocalDB()

    def test_cli_writes_reject_report_without_db_access(self):
        with tempfile.TemporaryDirectory() as tmp:
            report=Path(tmp)/'reject.json'
            result=subprocess.run([sys.executable,str(ROOT/'supabase/seed/import_food_data.py'),'validate',
                '--input',str(ROOT/'supabase/seed/templates/food-v1.template.json'),
                '--as-of',AS_OF,'--report',str(report)],capture_output=True,text=True,encoding='utf-8')
            self.assertEqual(result.returncode,1)
            actual=importer.load_json(report)
            self.assertIn('FIXTURE',{e['code'] for e in actual['errors']})
            self.assertFalse(actual['publicationPerformed'])

    def test_draft_review_status_not_promoted_by_approval_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            for rows in self.bundle['entities'].values():
                for row in rows:
                    row['reviewStatus']='draft'
                    if row.get('status')=='verified':row['status']='draft'
            stage,path=self.prepare_stage(Path(tmp))
            with self.assertRaisesRegex(ValueError,'UNREVIEWED'):
                importer.reviewed(stage,path,AS_OF)


if __name__=='__main__':unittest.main()
