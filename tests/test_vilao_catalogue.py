"""Resume and checkpoint tests use mock chat only, never real credentials/network."""
import csv
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'data-preparation/scripts'))
from vilao_catalogue import CatalogueRun, atomic_json, parse_batch_arrays
from vilao_pilot import MODEL, compact, sha

TAXONOMY = json.loads((ROOT/'data-preparation/config/taxonomy_pilot_v1.json').read_text())


class MockClient:
    def __init__(self, corrupt_first=False):
        self.calls, self.max_calls, self.corrupt_first = 0, 44, corrupt_first

    def chat(self, messages, max_tokens):
        self.calls += 1
        inputs = json.loads(messages[1]['content'].split(':',1)[1])
        rows = [[r[0],[0],0,[1],[0],0,[-1]*4,[0],[0,0,1,0,0,0,0]] for r in inputs]
        if self.corrupt_first and self.calls == 1:
            rows[0][8][5] = 1
        return dict(ok=True,content=compact(rows),http_status=200,finish_reason='stop',
                    max_tokens=max_tokens,requested_at='2026-10-10T00:00:00+00:00',response_model=MODEL,
                    usage={'prompt_tokens':10,'completion_tokens':10,'total_tokens':20})


class CatalogueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.source = self.base/'source.csv'
        records = []
        for i in range(12):
            offering = dict(menu_item_id=f'm{i}',menu_name_raw=f'Cơm {i}',description_raw='',
                            menu_groups_json='["Menu"]',source_url='https://example.test/public-menu')
            records.append(dict(dish_id=f'd{i:02}',dish_name=f'Cơm {i}',example_menu_item_id=f'm{i}',
                                example_source_url=offering['source_url'],example_description='',aliases_json='[]',
                                menu_offerings_json=compact([offering]),original_value=' 001.00 '))
        self.originals = records
        with self.source.open('w',encoding='utf-8-sig',newline='') as handle:
            writer = csv.DictWriter(handle,fieldnames=list(records[0]))
            writer.writeheader(); writer.writerows(records)

    def run_object(self,client=None,taxonomy=TAXONOMY):
        return CatalogueRun(self.base,client or MockClient(),self.source,taxonomy)

    def test_full_export_and_replay_no_api_calls_preserve_source(self):
        source_hash=sha(self.source.read_bytes())
        first=self.run_object()
        report=first.execute(allow_api=True,progress=lambda _:None)
        self.assertTrue(report['complete'])
        self.assertEqual(report['api_calls_this_run'],2)
        path=Path(report['output_file'])
        self.assertTrue(path.read_bytes().startswith(b'\xef\xbb\xbf'))
        with path.open(encoding='utf-8-sig',newline='') as h:
            rows=list(csv.DictReader(h))
        self.assertEqual([{k:r[k] for k in self.originals[0]} for r in rows],self.originals)
        second=self.run_object()
        replay=second.execute(allow_api=False,progress=lambda _:None)
        self.assertEqual(replay['output_sha256'],report['output_sha256'])
        self.assertEqual(second.client.calls,0)
        self.assertEqual(sha(self.source.read_bytes()),source_hash)

    def test_bad_evidence_gets_one_retry_and_raw_is_retained(self):
        run=self.run_object(MockClient(corrupt_first=True))
        report=run.execute(allow_api=True,progress=lambda _:None)
        self.assertTrue(report['complete'])
        item=run.states['d00']
        self.assertEqual(len(item['attempts']),2)
        records=[json.loads(p.read_text()) for p in (run.cache/'batches').glob('*.json')]
        first=next(x for x in records if len(x['dish_ids'])==10)
        self.assertEqual(json.loads(first['response']['content'])[0][8][5],1)

    def test_crash_after_response_recovers_missing_item_cache(self):
        run=self.run_object()
        run.execute(allow_api=True,progress=lambda _:None)
        for p in (run.cache/'items').glob('*.json'):
            p.unlink()  # disposable fixture only; simulates response saved before item writes
        recovered=self.run_object()
        self.assertEqual(len(recovered.states),12)
        self.assertTrue(recovered.execute(allow_api=False,progress=lambda _:None)['complete'])
        self.assertEqual(recovered.client.calls,0)

    def test_uncertain_journal_does_not_resend(self):
        run=self.run_object()
        atomic_json(run.cache/'batches'/'interrupted.json',{'scope':run.scope,'state':'in_flight',
                    'dish_ids':['d00'],'input_sha256':[run.fingerprints['d00']]})
        with self.assertRaises(RuntimeError):
            run.execute(allow_api=True,progress=lambda _:None)
        self.assertEqual(run.client.calls,0)

    def test_contract_change_invalidates_cache_namespace(self):
        first=self.run_object()
        first.execute(allow_api=True,progress=lambda _:None)
        other=json.loads(compact(TAXONOMY));other['version']='new-contract'
        changed=self.run_object(taxonomy=other)
        self.assertNotEqual(first.scope,changed.scope)
        self.assertEqual(len(changed.states),0)

    def test_network_error_checkpoint_then_resume(self):
        client=MockClient()
        def failed(messages,max_tokens):
            client.calls+=1
            return dict(ok=False,http_status=503,max_tokens=max_tokens,error='temporary')
        client.chat=failed
        run=self.run_object(client)
        incomplete=run.execute(allow_api=True,progress=lambda _:None)
        self.assertFalse(incomplete['complete'])
        self.assertTrue(Path(incomplete['output_file']).exists())
        client2=MockClient()
        resumed=self.run_object(client2)
        complete=resumed.execute(allow_api=True,progress=lambda _:None)
        self.assertTrue(complete['complete'])
        self.assertEqual(len(resumed.states['d00']['attempts']),2)

    def test_only_final_outer_bracket_repair(self):
        row=[0,[0],0,[1],[0],0,[-1]*4,[0],[0,0,1,0,0,0,0]]
        content=compact([row])
        for broken in (content[:-1],content+']'):
            rows,note=parse_batch_arrays(broken,1)
            self.assertEqual(rows,[row])
            self.assertTrue(note)
        for broken in ('```json\n'+content+'\n```',content+' text',content[:-2],content.replace(',-1,',',oops,',1)):
            with self.assertRaises(ValueError):parse_batch_arrays(broken,1)

    def test_recover_malformed_cached_wrapper_without_new_api(self):
        run=self.run_object()
        samples=run.samples[:10]
        response=run.client.chat(run.messages(samples),1400)
        response['content']=response['content'][:-1]
        envelope=dict(scope=run.scope,dish_ids=[s['dish_id'] for s in samples],
                      input_sha256=[run.fingerprints[s['dish_id']] for s in samples],state='completed',
                      response=response,response_sha256=sha(compact(response)))
        path=run.cache/'batches'/'wrapper-fixture.json';atomic_json(path,envelope)
        # Simulate the old parser rejecting the envelope and persisting the failure.
        ref=str(path.relative_to(run.root))
        for s in samples:
            run.save_item(dict(dish_id=s['dish_id'],input_sha256=run.fingerprints[s['dish_id']],scope=run.scope,
                               status='needs_review',attempts=[ref],errors=['JSON syntax'],row=None,raw_row=None,
                               batch_reference=ref,prompt_version='fixture'))
        recovered=self.run_object()
        self.assertEqual(sum(s['status']=='schema_valid_draft' for s in recovered.states.values()),10)
        self.assertEqual(recovered.client.calls,0)
        self.assertTrue(recovered.states[samples[0]['dish_id']]['json_wrapper_repair'])


if __name__=='__main__':
    unittest.main()
