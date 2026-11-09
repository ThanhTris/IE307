"""Manifest admission/ownership failures must precede import or app access."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import gm40_manifest_check as qa


def seal(value):
    value.pop('sealSha256', None)
    value['sealSha256'] = hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return value


class ManifestAdmissionTests(unittest.TestCase):
    def setUp(self):
        (ROOT/'.work/qa').mkdir(parents=True, exist_ok=True)
        self.directory = ROOT/'.work/qa'/('gm40-test-'+uuid.uuid4().hex[:12])
        self.directory.mkdir()
        self.addCleanup(shutil.rmtree, self.directory)
        self.path = self.directory/'manifest.json'
        run = self.directory.name
        self.manifest = seal({'format':'gm03-qa-manifest-v1','schemaVersion':'0.9.2',
                              'contractVersion':'dish-session-v4/roadmap-v2/GM-07.B',
                              'runId':run,'ownerUuid':str(uuid.uuid4()),'workdir':str(self.directory),
                              'projectId':'gm03qa-'+run,'containerName':'supabase_db_gm03qa-'+run,
                              'endpoint':{'baseUrl':'http://127.0.0.1:54371','apiPort':54371,'dbPort':54372}})
        self.state = {'phase':'ready','ownerUuid':self.manifest['ownerUuid'],'manifestSha256':self.manifest['sealSha256'],
                      'runId':run,'workdir':str(self.directory),'projectId':self.manifest['projectId'],
                      'containerName':self.manifest['containerName'],'worker':{'nonce':str(uuid.uuid4())}}
        self.write()

    def write(self):
        self.path.write_text(json.dumps(self.manifest), encoding='utf-8')
        (self.directory/'state.json').write_text(json.dumps(self.state), encoding='utf-8')

    def test_valid_manifest_is_admitted_offline_only(self):
        with patch.object(qa,'command',side_effect=AssertionError('No processes during file admission')):
            self.assertEqual(qa.load_manifest(self.path),(self.manifest,self.state))

    def test_tampered_seal_rejected_before_database(self):
        self.manifest['ownerUuid']=str(uuid.uuid4());self.write()
        with self.assertRaisesRegex(ValueError,'SEAL'):qa.load_manifest(self.path)

    def test_foreign_checkout_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            other=Path(directory)/'manifest.json';other.write_text(self.path.read_text())
            with self.assertRaisesRegex(ValueError,'CHECKOUT|SYMLINK'):qa.load_manifest(other)
            alias=Path(directory)/'alias.json';alias.symlink_to(self.path)
            with self.assertRaisesRegex(ValueError,'SYMLINK'):qa.load_manifest(alias)

    def test_invalid_run_and_stopped_or_owner_changed_state(self):
        for key,value in [('phase','stopped'),('ownerUuid',str(uuid.uuid4())),('manifestSha256','bad'),('projectId','application')]:
            original=self.state[key];self.state[key]=value;self.write()
            with self.assertRaisesRegex(ValueError,'STATE'):qa.load_manifest(self.path)
            self.state[key]=original
        self.manifest['runId']='../app';self.write()
        with self.assertRaisesRegex(ValueError,'RUN_ID'):qa.load_manifest(self.path)

    def test_no_app_remote_or_redirect_endpoint(self):
        for url in ['http://127.0.0.1:54321','https://example.com','http://localhost:54371','http://127.0.0.1:54371/path','http://x:secret@127.0.0.1:54371','http://127.0.0.1:54371?x=1']:
            self.manifest['endpoint']['baseUrl']=url
            seal(self.manifest);self.state['manifestSha256']=self.manifest['sealSha256'];self.write()
            with self.assertRaisesRegex(ValueError,'ENDPOINT'):qa.load_manifest(self.path)
        with self.assertRaisesRegex(ValueError,'REDIRECT'):qa.NoRedirect().redirect_request(None,None,302,'',{},'https://example.com')

    def test_missing_worker_fails_closed(self):
        self.state['worker']={};self.write()
        with self.assertRaisesRegex(ValueError,'WORKER'):qa.load_manifest(self.path)

    def test_remote_docker_and_failed_producer_verify_stop_before_inspect(self):
        with patch.object(qa,'command',return_value='tcp://remote:2375') as cmd:
            with self.assertRaisesRegex(ValueError,'LOCAL_DOCKER'):qa.verify_manifest(self.path,self.manifest)
            self.assertEqual(cmd.call_count,1)
        with patch.object(qa,'command',side_effect=['unix:///tmp/docker.sock',RuntimeError('drift')]) as cmd:
            with self.assertRaisesRegex(RuntimeError,'drift'):qa.verify_manifest(self.path,self.manifest)
            self.assertEqual(cmd.call_count,2)

    def test_service_ownership_and_wildcard_binding_rejected(self):
        def commands(args):
            if args[1:3]==['context','inspect']:return 'unix:///tmp/docker.sock'
            if args[0] != 'docker':return json.dumps({'result':'PASS','runId':self.manifest['runId']})
            service=args[-1]
            return json.dumps([{'Name':'/'+service,'State':{'Running':True},'Config':{'Labels':{
                'com.supabase.cli.project':self.manifest['projectId'],
                'com.supabase.cli.workdir':self.manifest['workdir']}},
                'NetworkSettings':{'Ports':{'8000/tcp':[{'HostIp':'0.0.0.0','HostPort':'54371'}]}}}])
        with patch.object(qa,'command',side_effect=commands):
            with self.assertRaisesRegex(ValueError,'BINDING'):qa.verify_manifest(self.path,self.manifest)

    def test_report_cannot_target_source_or_qa_state(self):
        with self.assertRaisesRegex(ValueError,'overwrite'):qa.validate_report(ROOT/'supabase/seed/catalogue/dishes.json')
        with self.assertRaisesRegex(ValueError,'producer QA workdir'):
            qa.run(self.directory/'manifest.json',qa_manifest=self.path)

    def test_cli_requires_manifest_no_default_fallback(self):
        for script in ['gm40_catalogue_check.py','gm40_rich_projection_check.py']:
            result=subprocess.run([sys.executable,str(ROOT/'scripts'/script)],capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('--qa-manifest is required',result.stderr)

    def test_fake_postgres_connection_cannot_import(self):
        class Fake:
            database='postgres';is_dish_v4_qa=True;qa_project_id='gm03qa-fake'
            def psql(self,sql):raise AssertionError('Must not read app')
        with self.assertRaises(ValueError):qa.p.upstream.owned(Fake(),uuid.uuid4())

    def test_concrete_adapter_still_checks_namespace_and_private_owner_marker(self):
        db=object.__new__(qa.ManifestQAContainerDB)
        db.database='postgres';db.owner_uuid=self.manifest['ownerUuid'];db.run_id=self.manifest['runId']
        db.qa_project_id=self.manifest['projectId'];db.container=self.manifest['containerName']
        with patch.object(db,'psql',return_value=str(uuid.uuid4())),patch.object(qa.p.upstream,'verify_runtime') as verify:
            with self.assertRaisesRegex(ValueError,'marker'):qa.p.upstream.owned(db,db.owner_uuid)
            verify.assert_not_called()
        with patch.object(db,'psql',side_effect=AssertionError('No SQL for wrong namespace')):
            with self.assertRaisesRegex(ValueError,'ownership'):qa.p.upstream.owned(db,uuid.uuid4())

    def test_credential_origin_must_match_manifest(self):
        (self.directory/'credentials.private.json').write_text(json.dumps({'apiUrl':'http://127.0.0.1:54321','anonKey':'public-placeholder'}))
        with self.assertRaisesRegex(ValueError,'ORIGIN'):qa.AuthRest(self.manifest)

    def test_cleanup_failure_does_not_claim_pass(self):
        # No cleanup SQL is permitted until the importer revalidates ownership.
        with patch.object(qa.p.upstream,'owned',side_effect=ValueError('marker changed')):
            with self.assertRaisesRegex(ValueError,'marker'):qa.restore_inventory(None,uuid.uuid4(),[],[])


if __name__=='__main__':unittest.main()
