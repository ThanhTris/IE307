"""Prevent canonical migration/ledger collisions with independently merged producers."""
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]


class CanonicalMigrationIdentityTests(unittest.TestCase):
    def test_migration_prefixes_are_unique(self):
        paths=sorted((ROOT/'supabase/migrations').glob('*.sql'))
        versions=[p.name.split('_',1)[0] for p in paths]
        self.assertEqual(len(versions),len(set(versions)), 'Supabase ledger cannot distinguish duplicate numeric versions')

    def test_canonical_schema_identity_is_not_used_by_runtime_migrations(self):
        canonical=ROOT/'supabase/migrations/0032_canonical_result_storage.sql'
        insert=re.search(r"values\('([^']+)','(GM06[^']+)'",canonical.read_text())
        self.assertIsNotNone(insert)
        version,contract=insert.groups()
        for path in (ROOT/'supabase/migrations').glob('*.sql'):
            if path!=canonical:
                self.assertNotRegex(path.read_text(),r"values\s*\(\s*'"+re.escape(version)+r"'",path.name)
        self.assertEqual(contract,'GM06.3-canonical-storage')


if __name__=='__main__':
    unittest.main()
