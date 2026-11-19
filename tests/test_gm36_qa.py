"""Fail closed before DB access; cleanup uses only the sealed owned QA."""
import sys
from pathlib import Path
from unittest import TestCase, mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import gm36_qa


class OcrQATests(TestCase):
    def test_invalid_namespace_or_guest_list_never_opens_database(self):
        uid = '00000000-0036-4000-8000-000000000001'
        for namespace, users in [('invalid', [uid]), (uid, []), (uid, [uid, uid]),
                                 (uid, ['invalid']), (uid, [uid] * 3)]:
            with self.subTest(users=users), mock.patch.object(gm36_qa, 'verify') as verify:
                with self.assertRaises(ValueError):
                    gm36_qa.cleanup('unused', namespace, users)
                verify.assert_not_called()

    def test_rejected_manifest_never_opens_database(self):
        uid = '00000000-0036-4000-8000-000000000001'
        with mock.patch.object(gm36_qa, 'verify', side_effect=ValueError('invalid')):
            with mock.patch.object(gm36_qa, 'ManifestQAContainerDB') as db:
                with self.assertRaises(ValueError):
                    gm36_qa.cleanup('bad-manifest', uid, [uid])
                db.assert_not_called()

    def test_cleanup_checks_namespace_and_deletes_in_one_owned_transaction(self):
        uid = '00000000-0036-4000-8000-000000000001'
        with mock.patch.object(gm36_qa, 'verify', return_value=({}, {'worker': {'nonce': uid}})):
            with mock.patch.object(gm36_qa, 'ManifestQAContainerDB') as db:
                gm36_qa.cleanup('sealed-manifest', uid, [uid])
                db.assert_called_once_with('sealed-manifest', uid)
                sql = db.return_value.psql.call_args.args[0]
                self.assertIn("gm36_test_namespace'='" + uid, sql)
                self.assertIn('and is_anonymous', sql)
                self.assertIn('GM36_OWNERSHIP_REQUIRED', sql)
                self.assertTrue(sql.strip().startswith('begin;'))
                self.assertTrue(sql.strip().endswith('commit;'))
