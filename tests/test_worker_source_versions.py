"""Worker verification follows migration replacements and renamed wrappers."""
import hashlib
import importlib.util
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('worker_versions', ROOT / 'scripts/dish_policy_worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class MigratedDefinitions:
    """Replay checked SQL definitions without trusting the worker's source map."""
    def __init__(self, through):
        self.bodies = {}
        self.versions = set()
        self.checked = set()
        pattern = re.compile(
            r'alter function ([\w.]+)\([^;]*?\) rename to (\w+);'
            r'|create(?: or replace)? function ([\w.]+)\(.*? as \$\$(.*?)\$\$;', re.S)
        for path in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
            if int(path.name[:4]) > through:
                break
            sql = path.read_text(encoding='utf-8')
            self.versions.update(re.findall(r"values\s*\(\s*'([0-9]+\.[0-9]+\.[0-9]+)'", sql, re.I))
            for match in pattern.finditer(sql):
                old, new, name, body = match.groups()
                if old:
                    if old in self.bodies:
                        self.bodies[old.rsplit('.', 1)[0] + '.' + new] = self.bodies.pop(old)
                else:
                    self.bodies[name] = body

    def psql(self, query):
        if 'schema_version=' in query:
            version = re.search(r"schema_version='([^']+)'", query)[1]
            return '1' if version in self.versions else '0'
        if 'to_regprocedure' in query:
            return 't'
        namespace = re.search(r"n.nspname='([^']+)'", query)[1]
        name = namespace + '.' + re.search(r"p.proname='([^']+)'", query)[1]
        self.checked.add(name)
        if 'p.prosecdef' in query:
            return 't'
        return hashlib.sha256(self.bodies[name].encode()).hexdigest()


class WorkerSourceVersionsTests(unittest.TestCase):
    def test_baseline_and_each_forward_version(self):
        for migration in (35, 46, 47, 48, 49, 50, 54, 55, 56, 57):
            with self.subTest(migration=migration):
                self.assertTrue(worker.verify(MigratedDefinitions(migration)))

    def test_latest_verifies_the_entire_entrypoint_wrapper_chain(self):
        database = MigratedDefinitions(57)
        worker.verify(database)
        for name in ('dish_session', 'dish_session_before_pace',
                     'dish_session_before_rejoin', 'dish_session_before_ready'):
            self.assertIn('public.' + name, database.checked)

    def test_tampering_is_not_accepted_as_a_new_baseline(self):
        for name in ('public.dish_session', 'public.dish_session_before_pace',
                     'dish_v4_private.finish_baseline_0111',
                     'gm20_canonical_private.finish', 'gm20_canonical_private.dispatch'):
            with self.subTest(function=name):
                database = MigratedDefinitions(57)
                database.bodies[name] += '\n-- unreviewed deployed change'
                with self.assertRaisesRegex(RuntimeError, 'Deployed function differs'):
                    worker.verify(database)


if __name__ == '__main__':
    unittest.main()
