import json
from pathlib import Path
import unittest
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]


class ResultWireSchemaTests(unittest.TestCase):
    def test_bundled_definitions_match_authoritative_schemas(self):
        bundle = json.loads((ROOT / 'mobile/src/features/result/services/resultWireSchemas.json').read_text(encoding='utf8'))
        for version, suffix in [('baseline', ''), ('supplement', '-supplement')]:
            schema = json.loads((ROOT / f'docs/architecture/schemas/dish-session-v4b{suffix}.schema.json').read_text(encoding='utf8'))
            for name, definition in bundle[version].items():
                self.assertEqual(definition, schema['$defs'][name], name)
            self.assertIn('terminalResult', bundle[version])

    def test_matrix_expectations_are_independent_schema_results(self):
        schema = json.loads((ROOT / 'docs/architecture/schemas/dish-session-v4b-supplement.schema.json').read_text(encoding='utf8'))
        terminal = {'$ref': '#/$defs/terminalResult', '$defs': schema['$defs']}
        validator = Draft202012Validator(terminal, format_checker=FormatChecker())
        cases = json.loads((ROOT / 'mobile/tests/fixtures/gm27/wire-schema-cases.json').read_text(encoding='utf8'))
        for case in cases:
            with self.subTest(case=case['name']):
                version_schema = schema if case['input']['contractVersion'].endswith('-supplement') else json.loads((ROOT / 'docs/architecture/schemas/dish-session-v4b.schema.json').read_text(encoding='utf8'))
                oracle = Draft202012Validator({'$ref': '#/$defs/terminalResult', '$defs': version_schema['$defs']}, format_checker=FormatChecker())
                self.assertEqual(oracle.is_valid(case['input']), case['expectedValid'])
