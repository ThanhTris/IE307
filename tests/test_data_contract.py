import copy
from datetime import datetime,timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'data-preparation/scripts'))
import data_contract as dc
from prepare_contract_templates import empty_bundle,example_bundle

NOW=datetime(2026,10,10,tzinfo=timezone.utc)
class DataContractTests(unittest.TestCase):
    def setUp(self):self.b=example_bundle()
    def errors(self):return dc.validate(self.b,NOW)
    def row(self,name):return self.b['entities'][name][0]
    def assert_invalid(self,entity,field=None):
        errors=self.errors();self.assertTrue(errors)
        self.assertTrue(any(e['entity']==entity and (field is None or e['field']==field) for e in errors),errors)
    def test_empty(self):self.assertEqual(dc.validate(empty_bundle(),NOW),[])
    def test_example(self):self.assertEqual(self.errors(),[])
    def test_csv_json_equivalent(self):
        with tempfile.TemporaryDirectory() as d:
            dc.write_csv_bundle(self.b,d);self.assertEqual(dc.read_csv_bundle(d),self.b)
            for p in Path(d).glob('*.csv'):self.assertTrue(p.read_bytes().startswith(b'\xef\xbb\xbf'))
    def test_tracked_forms_current(self):
        for folder,bundle in [('empty',empty_bundle()),('examples',example_bundle())]:
            self.assertEqual(dc.read_csv_bundle(dc.BASE/'templates'/folder),bundle)
            self.assertEqual(json.loads((dc.BASE/'templates'/folder/'dataset.json').read_text(encoding='utf-8')),bundle)
    def test_unknown_draft_allowed(self):
        self.assertIsNone(self.row('venues')['lat']);self.assertIsNone(self.row('venueDishes')['servingSize']);self.assertEqual(self.errors(),[])
    def test_duplicate_id(self):
        self.b['entities']['dishes'].append(copy.deepcopy(self.row('dishes')));self.assert_invalid('dishes','id')
    def test_fk(self):self.row('venueDishes')['dishId']=dc.stable_id('dishes','missing');self.assert_invalid('venueDishes','dishId')
    def test_taxonomy_type(self):self.row('dishes')['cuisineIds']=self.row('dishes')['categoryIds'];self.assert_invalid('dishes','cuisineIds')
    def test_taxonomy_code(self):self.row('taxonomy')['code']='invented';self.assert_invalid('taxonomy','code')
    def test_price_negative(self):self.row('venueDishes')['priceMin']=-1;self.assert_invalid('venueDishes','priceMin')
    def test_price_bounds(self):self.row('venueDishes')['priceMin']=40000;self.assert_invalid('venueDishes','priceMax')
    def test_price_unit(self):self.row('venueDishes')['unit']=None;self.assert_invalid('venueDishes','unit')
    def test_lat_bounds(self):self.row('venues')['lat']=91;self.assert_invalid('venues','lat')
    def test_coordinate_pair(self):self.row('venues')['lat']=10.8;self.assert_invalid('venues','lat')
    def test_boolean_not_number(self):self.row('venues')['lat']=True;self.assert_invalid('venues','lat')
    def test_timezone(self):self.row('venues')['timezone']='Invented/Zone';self.assert_invalid('venues','timezone')
    def test_overnight_positive(self):self.assertEqual(self.errors(),[])
    def test_overnight_missing_offset(self):self.row('weeklySchedules')['endDayOffset']=0;self.assert_invalid('weeklySchedules','startTime')
    def test_24h_requires_flag(self):
        s=self.row('weeklySchedules');s.update(startTime='00:00',endTime='00:00',endDayOffset=1,is24Hours=False);self.assert_invalid('weeklySchedules','startTime')
    def test_24h_explicit(self):
        s=self.row('weeklySchedules');s.update(startTime='00:00',endTime='00:00',endDayOffset=1,is24Hours=True);self.assertEqual(self.errors(),[])
    def test_duplicate_interval(self):
        s=copy.deepcopy(self.row('weeklySchedules'));s['id']=dc.stable_id('weeklySchedules','new-row');self.b['entities']['weeklySchedules'].append(s);self.assert_invalid('weeklySchedules','startTime')
    def test_schedule_owner(self):self.row('weeklySchedules')['ownerId']=dc.stable_id('venueDishes','wrong');self.assert_invalid('venueDishes','scheduleId')
    def test_closed_date_empty(self):self.assertEqual(self.row('dateExceptions')['status'],'closed');self.assertEqual(self.row('dateExceptions')['intervals'],[])
    def test_closed_date_intervals_invalid(self):
        self.row('dateExceptions')['intervals']=[{'startTime':'22:00','endTime':'02:00','endDayOffset':1,'is24Hours':False}];self.assert_invalid('dateExceptions','intervals')
    def test_closed_schedule_times_invalid(self):self.row('weeklySchedules')['status']='closed';self.assert_invalid('weeklySchedules','startTime')
    def test_availability_expiry(self):self.row('availabilityOverrides')['expiresAt']=self.row('availabilityOverrides')['observedAt'];self.assert_invalid('availabilityOverrides','expiresAt')
    def test_origin_not_location(self):self.row('dishes')['origin']='south';self.assertEqual(self.errors(),[])
    def test_meal_late_night_invalid(self):self.row('dishes')['mealSlots']=['late_night'];self.assert_invalid('dishes','mealSlots')
    def test_flavor_unknown_not_false(self):
        f={k:{'present':None,'intensity':'unknown'} for k in ['spicy','salty','sweet','sour']};self.row('dishes')['flavor']=f;self.assertEqual(self.errors(),[])
        f['spicy']['intensity']='none';self.assert_invalid('dishes','flavor')
    def test_servicemodes_delivery_not_dinein(self):self.row('venueDishes')['serviceMode']='dine_in';self.assert_invalid('venueDishes','serviceMode')
    def test_reviewer_independent(self):self.row('dishes')['reviewedBy']='fixture-author';self.assert_invalid('dishes','reviewedBy')
    def test_verified_missing_metadata(self):self.row('dishes').update(reviewStatus='verified',status='verified');self.assert_invalid('dishes','validUntil')
    def test_fixtures_never_publish(self):self.row('dishes').update(reviewStatus='published',status='published');self.assert_invalid('dishes','reviewStatus')
    def test_unknown_image_rights_block_publish(self):
        self.row('dishes').update(reviewStatus='published',status='published',artwork={'url':'https://example.invalid/image','sourceRef':self.row('dataSources')['sourceRef'],'usageRights':'unknown','license':None,'attribution':None});self.assert_invalid('dishes','artwork')
    def test_dataset_expiry_no_cover_child(self):
        self.row('dishes').update(reviewStatus='verified',status='verified',reviewedBy='other',validUntil='2026-10-09T01:00:00Z');self.assert_invalid('dishes','validUntil')
    def test_source_rights_license(self):self.row('dataSources')['usageRights']='licensed';self.assert_invalid('dataSources','license')
    def test_coverage_polygon(self):self.row('coverageAreas')['boundary']={'type':'Polygon','coordinates':[[[106,10],[107,10],[106,11]]]};self.assert_invalid('coverageAreas','boundary')
    def test_public_anchor(self):self.row('publicAnchors')['isPublic']=False;self.assert_invalid('publicAnchors','isPublic')
    def test_bad_field_source_no_crash(self):self.row('dishes')['fieldSources']={'menu':{}};self.assert_invalid('dishes','fieldSources')
    def test_duplicate_offering(self):
        r=copy.deepcopy(self.row('venueDishes'));r['offeringId']=dc.stable_id('venueDishes','copy');r['scheduleId']=None;self.b['entities']['venueDishes'].append(r);self.assert_invalid('venueDishes','offeringId')
    def test_csv_malformed_error_field(self):
        with tempfile.TemporaryDirectory() as d:
            dc.write_csv_bundle(self.b,d);p=Path(d)/'venues.csv';s=p.read_text(encoding='utf-8-sig').replace('Asia/Ho_Chi_Minh','Unknown/Zone');p.write_text(s,encoding='utf-8-sig')
            with self.assertRaisesRegex(dc.ContractError,'venues row 1 field timezone'):dc.read_csv_bundle(d)
    def reviewed_bundle(self):
        for name,rows in self.b['entities'].items():
            for row in rows:
                row.update(reviewStatus='verified',reviewedBy='independent-fixture-reviewer',validUntil='2026-11-01T00:00:00Z')
                if row.get('status')=='draft':row['status']='verified'
        self.row('dataSources').update(usageRights='granted',license='Synthetic agreement for validation test only')
        self.row('dishes')['classificationStatus']='reviewed'
        self.row('venues').update(lat=10.85,lng=106.76,adminAreaId='fixture-area',status='active')
        self.row('coverageAreas')['boundary']={'type':'Polygon','coordinates':[[[106.7,10.8],[106.8,10.8],[106.8,10.9],[106.7,10.9],[106.7,10.8]]]}
    def test_valid_verified_bundle(self):
        self.reviewed_bundle();self.assertEqual(self.errors(),[])
    def test_valid_publish_checks_do_not_publish(self):
        self.reviewed_bundle();self.b['fixtureOnly']=False
        self.row('dishes').update(reviewStatus='published',status='published')
        self.assertEqual(self.errors(),[])
    def test_published_draft_child_rejected(self):
        self.reviewed_bundle();self.b['fixtureOnly']=False
        self.row('dishes').update(reviewStatus='published',status='published')
        self.row('taxonomy').update(reviewStatus='draft',status='draft',reviewedBy=None)
        self.assert_invalid('dishes','cuisineIds')
    def test_publish_unknown_source_rights(self):
        self.reviewed_bundle();self.b['fixtureOnly']=False
        self.row('dishes').update(reviewStatus='published',status='published')
        self.row('dataSources').update(usageRights='unknown',license=None)
        self.assert_invalid('dishes','sourceRef')
    def test_schedule_multiple_ca_same_group(self):
        schedules=self.b['entities']['weeklySchedules']
        self.assertEqual(schedules[0]['scheduleId'],schedules[1]['scheduleId'])
        self.assertNotEqual(schedules[0]['id'],schedules[1]['id'])
        self.assertEqual(self.errors(),[])
    def test_taxonomy_registry_ids(self):
        registry=json.loads((dc.BASE/'config/taxonomy_registry_v1.json').read_text(encoding='utf-8'))['entries']
        self.assertEqual(len({x['id'] for x in registry}),len(registry))
        for x in registry:self.assertEqual(x['id'],dc.stable_id('taxonomy',x['registryKey']))
    def test_utc_requires_full_datetime(self):
        self.row('dishes')['checkedAt']='2026-10-09Z';self.assert_invalid('dishes','checkedAt')
    def test_unknown_array_without_placeholder(self):
        d=self.row('dishes');d.update(cuisineIds=[],categoryIds=[],mealSlots=[],classificationStatus='unknown');self.assertEqual(self.errors(),[])
