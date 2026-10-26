import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator

from scripts.validate_dish_v4_schema import validate


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / 'docs/architecture/schemas/dish-session-v4b.schema.json'


class DishV4SchemaTests(unittest.TestCase):
    def test_contract_uses_valid_json_schema_2020_12(self):
        schema = json.loads(SCHEMA.read_text(encoding='utf-8'))
        self.assertEqual(schema['$schema'], 'https://json-schema.org/draft/2020-12/schema')
        Draft202012Validator.check_schema(schema)

    def test_unknown_request_command_is_rejected_without_echoing_payload(self):
        sample = [{
            'request': {'command': 'not-a-command', 'payload': {'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B'}},
            'response': {'ok': False, 'error': {'messageKey': 'INVALID_INPUT'}},
        }]
        with self.assertRaisesRegex(ValueError, r'sample\[0\]\.request schema error'):
            validate(sample, SCHEMA)

    def test_negative_request_can_skip_request_shape_but_still_validates_response(self):
        sample = [{
            'request': {'command': 'updateSettings', 'payload': {
                'contractVersion': 'dish-session-v4/roadmap-v2/GM-07.B',
                'settings': {'dishCount': 21},
            }},
            'requestValid': False,
            'response': {'ok': False, 'error': {'messageKey': 'INVALID_INPUT'}},
        }]
        self.assertEqual(validate(sample, SCHEMA), 1)

    def test_request_valid_must_be_boolean(self):
        sample = [{
            'request': {}, 'requestValid': 'false', 'response': {},
        }]
        with self.assertRaisesRegex(ValueError, r'requestValid must be boolean'):
            validate(sample, SCHEMA)


if __name__ == '__main__':
    unittest.main()
