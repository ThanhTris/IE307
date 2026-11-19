import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

import test_cases as tc  # noqa: E402

REQS = """# Requirements

| ID | Ưu tiên | Yêu cầu | Nguồn | Trạng thái |
| --- | --- | --- | --- | --- |
| REQ-AUTH-01 | P0 | Khách vào app | GM-16 | Active |
| REQ-AUTH-02 | P1 | Phiên khôi phục | GM-16 | Active |
| REQ-OLD-01 | P0 | Yêu cầu cũ | ADR | Superseded |
"""


def case(cid='TC-AUTH-001', **over):
    base = {'id': cid, 'title': 'Khách vào app', 'req': ['REQ-AUTH-01'], 'priority': 'P0', 'type': 'functional', 'level': 'unit',
            'preconditions': 'Chưa có phiên', 'steps': ['Mở app'], 'expected': 'Vào Home', 'automation': ['tests/sample_test.py::test_guest'],
            'env': ['ci']}
    base.update(over)
    return base


class Fixture:
    """A throw-away repository with every module file present, so only the intended defect shows up."""

    def __init__(self, auth_cases=None, reqs=REQS):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'docs/testing/cases').mkdir(parents=True)
        (self.root / 'docs/testing/results').mkdir(parents=True)
        (self.root / 'docs/testing/REQUIREMENTS.md').write_text(reqs, encoding='utf-8')
        (self.root / 'tests').mkdir()
        (self.root / 'tests/sample_test.py').write_text('def test_guest():\n    pass\n', encoding='utf-8')
        for code, (stem, title) in tc.MODULES.items():
            cases = (auth_cases if code == 'AUTH' else [])
            self.write_cases(stem, code, title, cases or [])

    def write_cases(self, stem, code, title, cases):
        (self.root / f'docs/testing/cases/{stem}.json').write_text(json.dumps({'module': code, 'title': title, 'cases': cases}, ensure_ascii=False), encoding='utf-8')

    def result(self, run, rows):
        (self.root / f'docs/testing/results/{run}.json').write_text(json.dumps({'run': run, 'results': rows}), encoding='utf-8')

    def errors(self):
        return tc.Suite(self.root).validate()

    def cleanup(self):
        self.tmp.cleanup()


class RepositorySuiteTests(unittest.TestCase):
    def setUp(self):
        self.suite = tc.Suite(ROOT)

    def test_repository_cases_validate(self):
        self.assertEqual(self.suite.validate(), [])

    def test_every_module_has_cases_and_priority_zero_requirements_are_covered(self):
        by_module = {c['_module'] for c in self.suite.cases}
        self.assertEqual(by_module, set(tc.MODULES))
        covered = {r for c in self.suite.cases for r in c['req']}
        missing = [r['id'] for r in self.suite.requirements.values() if r['priority'] == 'P0' and r['status'] == 'Active' and r['id'] not in covered]
        self.assertEqual(missing, [])

    def test_superseded_requirements_are_not_used_by_cases(self):
        old = {r['id'] for r in self.suite.requirements.values() if r['status'] == 'Superseded'}
        self.assertTrue(old)
        self.assertFalse(old & {r for c in self.suite.cases for r in c['req']})

    def test_generated_files_match_the_committed_copies(self):
        for name, text in tc.generated(self.suite).items():
            self.assertEqual((ROOT / 'docs/testing' / name).read_text(encoding='utf-8'), text, name + ' is stale; run scripts/test_cases.py --write')

    def test_cli_check_and_check_docs_succeed(self):
        self.assertEqual(tc.main(['--check']), 0)
        self.assertEqual(tc.main(['--check-docs']), 0)

    def test_excel_export_is_a_valid_workbook_with_all_sheets(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'cases.xlsx'
            tc.write_xlsx(self.suite, target)
            with zipfile.ZipFile(target) as z:
                self.assertIsNone(z.testzip())
                names = set(z.namelist())
                for part in ('[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/_rels/workbook.xml.rels'):
                    self.assertIn(part, names)
                workbook = ElementTree.fromstring(z.read('xl/workbook.xml'))
                ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                sheets = [s.get('name') for s in workbook.find('m:sheets', ns)]
                self.assertEqual(sheets, ['Test cases', 'Traceability', 'Summary', 'Defects'])
                first = ElementTree.fromstring(z.read('xl/worksheets/sheet1.xml'))
                rows = first.findall('.//m:row', ns)
                self.assertEqual(len(rows), len(self.suite.cases) + 1)
                for i in range(1, 5):
                    ElementTree.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))


class ValidationTests(unittest.TestCase):
    def check(self, fixture):
        self.addCleanup(fixture.cleanup)
        return '\n'.join(fixture.errors())

    def test_minimal_valid_fixture_has_no_errors(self):
        fx = Fixture([case()])
        self.assertEqual(self.check(fx), '')

    def test_duplicate_id_unknown_and_superseded_requirements(self):
        fx = Fixture([case(), case(), case('TC-AUTH-002', req=['REQ-NOPE-01']), case('TC-AUTH-003', req=['REQ-OLD-01'])])
        out = self.check(fx)
        self.assertIn('TC-AUTH-001: duplicate id', out)
        self.assertIn('unknown requirement REQ-NOPE-01', out)
        self.assertIn('requirement REQ-OLD-01 is superseded', out)

    def test_priority_zero_requirement_without_case_is_reported(self):
        fx = Fixture([case(req=['REQ-AUTH-02'], priority='P1')])
        self.assertIn('REQ-AUTH-01: P0 requirement has no test case', self.check(fx))

    def test_automation_must_point_at_real_tests(self):
        fx = Fixture([case(automation=['tests/missing.py::test_x']), case('TC-AUTH-002', automation=['tests/sample_test.py::test_absent'])])
        out = self.check(fx)
        self.assertIn('automation path not found: tests/missing.py', out)
        self.assertIn('python test not found: tests/sample_test.py::test_absent', out)

    def test_case_without_automation_needs_a_gap_and_unit_cases_cannot_be_manual(self):
        fx = Fixture([case(automation=[]), case('TC-AUTH-002', automation=['manual'], level='unit'), case('TC-AUTH-003', automation=['manual'], level='e2e', env=['android'])])
        out = self.check(fx)
        self.assertIn('TC-AUTH-001: no automation and no `gap` explanation', out)
        self.assertIn('TC-AUTH-002: unit cases cannot be manual only', out)
        self.assertNotIn('TC-AUTH-003', out)

    def test_enums_and_steps_are_validated(self):
        fx = Fixture([case(priority='P9', type='odd', level='lab', env=['moon'], steps=[])])
        out = self.check(fx)
        for message in ('invalid priority', 'invalid type odd', 'invalid level lab', 'invalid env', 'steps must be a non-empty list'):
            self.assertIn(message, out)

    def test_id_must_match_module_and_file(self):
        fx = Fixture([case('TC-ROOM-001')])
        self.assertIn('id must look like TC-AUTH-NNN', self.check(fx))

    def test_tag_in_a_test_must_match_a_case(self):
        fx = Fixture([case()])
        (fx.root / 'tests/tagged_test.py').write_text('# TC-AUTH-099 covers something\n', encoding='utf-8')
        self.assertIn('tag TC-AUTH-099', self.check(fx))

    def test_tag_in_a_test_is_attached_to_its_case(self):
        fx = Fixture([case()])
        self.addCleanup(fx.cleanup)
        (fx.root / 'tests/tagged_test.py').write_text('def test_tagged():\n    """TC-AUTH-001"""\n', encoding='utf-8')
        suite = tc.Suite(fx.root)
        self.assertIn('tests/tagged_test.py (tag)', suite.automation_of(suite.cases[0]))

    def test_result_for_unknown_case_or_status_is_rejected(self):
        fx = Fixture([case()])
        fx.result('r1', [{'case': 'TC-AUTH-777', 'env': 'ci', 'status': 'Pass'}, {'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Maybe'}])
        out = self.check(fx)
        self.assertIn('unknown case TC-AUTH-777', out)
        self.assertIn('invalid status Maybe', out)


class StatusTests(unittest.TestCase):
    def status(self, rows, env):
        fx = Fixture([case(env=env)])
        self.addCleanup(fx.cleanup)
        fx.result('r1', rows)
        suite = tc.Suite(fx.root)
        return suite.case_status(suite.cases[0])

    def test_not_run_without_results(self):
        self.assertEqual(self.status([], ['ci']), 'Not run')

    def test_pass_needs_every_environment(self):
        self.assertEqual(self.status([{'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Pass'}], ['ci', 'avd']), 'Partial')
        both = [{'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Pass'}, {'case': 'TC-AUTH-001', 'env': 'avd', 'status': 'Pass'}]
        self.assertEqual(self.status(both, ['ci', 'avd']), 'Pass')

    def test_fail_and_blocked_dominate(self):
        rows = [{'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Pass'}, {'case': 'TC-AUTH-001', 'env': 'avd', 'status': 'Fail'}]
        self.assertEqual(self.status(rows, ['ci', 'avd']), 'Fail')
        rows[1]['status'] = 'Blocked'
        self.assertEqual(self.status(rows, ['ci', 'avd']), 'Blocked')

    def test_later_run_overrides_earlier_for_same_environment(self):
        fx = Fixture([case()])
        self.addCleanup(fx.cleanup)
        fx.result('a-first', [{'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Fail'}])
        fx.result('b-second', [{'case': 'TC-AUTH-001', 'env': 'ci', 'status': 'Pass'}])
        suite = tc.Suite(fx.root)
        self.assertEqual(suite.case_status(suite.cases[0]), 'Pass')


class ImportTests(unittest.TestCase):
    def test_title_matching_handles_jest_placeholders(self):
        self.assertTrue(tc.title_matches('plain title', 'describe plain title'))
        self.assertTrue(tc.title_matches('invalid code %s never previews', 'invalid code ABC never previews'))
        self.assertFalse(tc.title_matches('invalid code %s never previews', 'valid code never previews'))

    def test_jest_import_marks_matching_cases(self):
        fx = Fixture([case(automation=['mobile/tests/unit/sample.test.ts::works with %s'])])
        self.addCleanup(fx.cleanup)
        (fx.root / 'mobile/tests/unit').mkdir(parents=True)
        (fx.root / 'mobile/tests/unit/sample.test.ts').write_text("it('works with %s', () => {});\n", encoding='utf-8')
        suite = tc.Suite(fx.root)
        self.assertEqual(suite.validate(), [])
        data = {'testResults': [{'name': str(fx.root / 'mobile/tests/unit/sample.test.ts'),
                                 'assertionResults': [{'fullName': 'works with 7', 'status': 'passed'}]}]}
        rows = tc.import_results(suite, tc.jest_outcomes(data, fx.root), None, 'run', 'abc', '', '2026-11-20')
        self.assertEqual([(r['case'], r['status']) for r in rows], [('TC-AUTH-001', 'Pass')])
        data['testResults'][0]['assertionResults'][0]['status'] = 'failed'
        rows = tc.import_results(suite, tc.jest_outcomes(data, fx.root), None, 'run', 'abc', '', '2026-11-20')
        self.assertEqual(rows[0]['status'], 'Fail')

    def test_unittest_import_reads_verbose_output(self):
        log = ('test_guest (tests.sample_test.SampleTests.test_guest) ... ok\n'
               'test_other (tests.sample_test.SampleTests.test_other) ... FAIL\n')
        outcomes = tc.unittest_outcomes(log)
        self.assertEqual(outcomes['tests/sample_test.py'], {'test_guest': 'Pass', 'test_other': 'Fail'})
        fx = Fixture([case()])
        self.addCleanup(fx.cleanup)
        rows = tc.import_results(tc.Suite(fx.root), None, outcomes, 'run', 'abc', '', '2026-11-20')
        self.assertEqual(rows[0]['status'], 'Pass')

    def test_import_records_only_the_ci_environment(self):
        fx = Fixture([case(env=['ci', 'avd'])])
        self.addCleanup(fx.cleanup)
        rows = tc.import_results(tc.Suite(fx.root), None, {'tests/sample_test.py': {'test_guest': 'Pass'}}, 'run', 'abc', '', '2026-11-20')
        self.assertEqual([r['env'] for r in rows], ['ci'])


if __name__ == '__main__':
    unittest.main()
