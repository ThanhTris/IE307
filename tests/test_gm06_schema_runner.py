"""Regression for the runner's non-ASCII files and subprocess transport."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gm06_schema_check',ROOT/'scripts/gm06_schema_check.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class SchemaRunnerEncodingTests(unittest.TestCase):
    def test_fixture_under_windows_cp1252_default(self):
        original = Path.open

        def windows_open(path,mode='r',buffering=-1,encoding=None,errors=None,newline=None):
            if 'b' not in mode and encoding in (None,'locale'):
                encoding = 'cp1252'
            return original(path,mode,buffering,encoding,errors,newline)

        with patch.object(Path,'open',windows_open):
            # Locale fallback is active; the explicit UTF-8 runner must survive.
            probe = ROOT/'supabase/seed/templates/food-v1.template.json'
            try:
                wrong = probe.read_text()
            except UnicodeDecodeError:
                wrong = ''
            self.assertNotIn('Cơm gà',wrong)
            actual = runner.fixture_sql()
        self.assertIn('Cơm gà — fixture',actual)
        self.assertIn('Việt',actual)
        self.assertIn('set constraints all immediate;',actual)

    def test_utf8_sql_and_output_transport(self):
        payload = 'Cơm gà — Việt\n'
        # Real subprocess byte streams, independent of the child's console locale.
        echo = 'import os; data=b""; chunk=os.read(0,4096)\nwhile chunk: data+=chunk; chunk=os.read(0,4096)\nos.write(1,data)'
        self.assertEqual(runner.run([sys.executable,'-c',echo],payload),payload)


if __name__=='__main__':
    unittest.main()
