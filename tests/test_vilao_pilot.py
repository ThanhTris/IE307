"""Pilot boundaries and secret handling; no test sends a real API request."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('anyfood_vilao_pilot', ROOT / 'data-preparation/scripts/vilao_pilot.py')
pilot = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = pilot
spec.loader.exec_module(pilot)
TAXONOMY = json.loads((ROOT / 'data-preparation/config/taxonomy_pilot_v1.json').read_text('utf-8'))


class ConfigTests(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / '.env'
            path.write_text(text, 'utf-8')
            return pilot.load_config(path)

    def test_js_and_dotenv_forms_without_executing_file(self):
        for text in ('apiKey: "sk-fake-fixture",\nbaseURL: "https\\://api.vilao.ai/v1"\\\nmodel: "vgpt/gpt-5.6-luna"\n',
                     'VILAO_API_KEY=sk-fake-fixture\nVILAO_BASE_URL=https://api.vilao.ai/v1\nVILAO_MODEL=vgpt/gpt-5.6-luna\n'):
            config = self.parse(text)
            self.assertEqual(config.model, pilot.MODEL)
            self.assertEqual(config.base_url, pilot.BASE_URL)
            self.assertNotIn('sk-fake-fixture', repr(config))

    def test_rejects_other_host_model_duplicate_and_empty_key(self):
        for text in ('apiKey=""', 'apiKey="sk-fake-fixture"\nbaseURL="https://evil.example/v1"',
                     'apiKey="sk-fake-fixture"\nmodel="another-model"',
                     'apiKey="sk-fake-fixture"\nVILAO_API_KEY="second-fixture"'):
            with self.assertRaises(ValueError) as ctx:
                self.parse(text)
            self.assertNotIn('sk-fake-fixture', str(ctx.exception))


class TransportTests(unittest.TestCase):
    def test_guards_before_network(self):
        client = pilot.PilotClient(pilot.Config('fake-fixture-key'))
        with patch.object(pilot, 'build_opener') as opener:
            for token_count in (0, 1401, True):
                with self.assertRaises(ValueError):
                    client.chat(pilot.SMOKE_MESSAGES, token_count)
            with self.assertRaises(ValueError):
                client.chat([{'role':'user','content':'x' * 16001}], 32)
            client.calls = 2
            with self.assertRaises(ValueError):
                client.chat(pilot.SMOKE_MESSAGES, 32)
            opener.assert_not_called()

    def test_no_redirect(self):
        self.assertIsNone(pilot.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.example'))

    def test_error_redacts_before_truncation_and_does_not_retry(self):
        secret = 'fixture-private-secret-' + 'x' * 400
        error = HTTPError(pilot.BASE_URL, 403, 'Forbidden', {},
                          io.BytesIO(json.dumps({'error': {'message': secret, 'code':'denied'}}).encode()))
        client = pilot.PilotClient(pilot.Config(secret))
        with patch.object(pilot, 'build_opener') as opener:
            opener.return_value.open.side_effect = error
            record = client.chat(pilot.SMOKE_MESSAGES, 32)
            self.assertFalse(record['ok'])
            self.assertEqual(record['http_status'], 403)
            self.assertEqual(record['error'], '[REDACTED]')
            self.assertNotIn('fixture-private', json.dumps(record))
            self.assertNotIn('Authorization', json.dumps(record))
            self.assertEqual(opener.return_value.open.call_count, 1)

    def test_cache_no_calls_and_changed_prompt_fails(self):
        client = pilot.PilotClient(pilot.Config('fixture-secret'))
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'smoke.json'
            with self.assertRaises(ValueError):
                pilot.cached_chat(client, path, pilot.SMOKE_MESSAGES, 32)
            with patch.object(client, 'chat') as chat:
                payload = {'model':pilot.MODEL,'messages':pilot.SMOKE_MESSAGES,'max_tokens':32,'stream':False}
                chat.return_value = {'request':payload,'request_sha256':pilot.sha(pilot.compact(payload)),
                                     'ok':True,'content':'OK'}
                first = pilot.cached_chat(client, path, pilot.SMOKE_MESSAGES, 32, allow_api=True)
                self.assertEqual(pilot.cached_chat(client, path, pilot.SMOKE_MESSAGES, 32), first)
                self.assertEqual(chat.call_count, 1)
                with self.assertRaises(ValueError):
                    pilot.cached_chat(client, path, [{'role':'user','content':'changed'}], 32)
                self.assertEqual(chat.call_count, 1)


class ArrayTests(unittest.TestCase):
    def row(self):
        return [0,[1],0,[2],[1],0,[-1,-1,-1,-1],[0],[2,0,1,1,0,0,0]]

    def validate(self, row):
        return pilot.validate_rows(json.dumps([row]), TAXONOMY, expected_count=1)

    def test_valid_and_all_unknown(self):
        self.assertEqual(self.validate(self.row()), [self.row()])
        row = [0,[0],0,[0],[0],0,[-1]*4,[0],[0]*7]
        self.assertEqual(self.validate(row), [row])

    def test_rejects_shape_indices_bool_enum_duplicates_and_evidence(self):
        bad = []
        for index, value in ((0,1),(0,False),(1,[True]),(1,[0,1]),(1,[1,1]),
                             (3,[99]),(3,[1,2,3,4]),(5,5),(6,[0,0,0]),
                             (6,[True,-1,-1,-1]),(8,[2,0,1,1,2,0,0]),
                             (8,[2,0,1,1,1,0,0])):
            row = self.row()
            row[index] = value
            bad.append(row)
        row = self.row(); row[5] = 1; row[8][4] = 2; bad.append(row)
        row = self.row(); row[6][0] = 3; row[8][5] = 2; bad.append(row)
        row = self.row(); row[7] = [1]; row[8][6] = 2; bad.append(row)
        row = self.row(); row[2] = 1; row[8][1] = 2; bad.append(row)
        row = self.row(); row[2] = 4; row[8][1] = 1; bad.append(row)
        for row in bad:
            with self.subTest(row=row), self.assertRaises(ValueError):
                self.validate(row)
        with self.assertRaises(ValueError):
            pilot.validate_rows('```json\n[]\n```', TAXONOMY)
        with self.assertRaises(ValueError):
            pilot.validate_rows(json.dumps([self.row()] * 11), TAXONOMY, expected_count=11)

    def test_decode_keeps_source_id_aliases_and_draft(self):
        samples = [{'dish_id':'fixture-id','dish_name':'Bún thịt nướng',
                    'aliases':['Bún thịt nướng (lớn)'],'source_url':'https://example.test/menu'}]
        decoded = pilot.decode_rows([self.row()], TAXONOMY, samples)
        self.assertEqual(decoded[0]['dish_id'], 'fixture-id')
        self.assertEqual(decoded[0]['existing_aliases'], samples[0]['aliases'])
        self.assertEqual(decoded[0]['temperature'], 'unknown')
        self.assertEqual(decoded[0]['flavors']['spicy'], 'unknown')
        self.assertEqual(decoded[0]['review_status'], 'draft_needs_human_review')

    def test_inspection_flags_unknown_with_evidence_without_repair(self):
        rows = [self.row(), self.row()]
        rows[1][0] = 1
        rows[1][8][5] = 1
        retained, checks = pilot.inspect_rows(json.dumps(rows), TAXONOMY, expected_count=2)
        self.assertEqual(retained, rows)
        self.assertTrue(checks[0]['schema_valid'])
        self.assertFalse(checks[1]['schema_valid'])
        self.assertIn('conflicts', checks[1]['errors'][0])


if __name__ == '__main__':
    unittest.main()
