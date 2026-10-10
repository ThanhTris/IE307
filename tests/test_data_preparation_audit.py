"""GM-03 handoff audit diagnostics and isolation; never run eligibility/network."""
import copy
import json
from pathlib import Path, PureWindowsPath
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'data-preparation/scripts'))
import validate_data_preparation as audit


class DataPreparationAuditTests(unittest.TestCase):
    def setUp(self):
        self.bundle = audit.ff.base_dataset()[0]

    def errors(self):
        return audit.check_bundle(self.bundle, 'broken.json', at=audit.ff.VALIDATION_AT)

    def test_offline_read_only_stable_audit(self):
        with patch.object(audit.ec, 'urlopen', side_effect=AssertionError('No network')):
            first = audit.audit()
            self.assertEqual(first, audit.audit())
        self.assertTrue(first['validStructure'], first['errors'])
        self.assertEqual(len(first['checks']), 9)
        self.assertFalse(first['readyForPublish'])
        self.assertFalse(first['eligibilityExecuted'])
        for filename, meta in first['inputFiles'].items():
            self.assertEqual(audit.ec.sha256(ROOT / filename), meta['sha256'])
        self.assertEqual(first['statistics']['editorial']['dishes'], 39)
        self.assertEqual(first['statistics']['fixtures']['cases'], 42)

    def test_duplicate_id_has_row_field_and_file(self):
        self.bundle['entities']['dishes'].append(copy.deepcopy(self.bundle['entities']['dishes'][0]))
        errors = self.errors()
        self.assertTrue(any(e['path'] == 'broken.json' and e['entity'] == 'dishes' and e['row'] == 11
                            and e['field'] == 'id' and 'Duplicate' in e['message'] for e in errors))

    def test_unknown_taxonomy_fk(self):
        self.bundle['entities']['dishes'][0]['categoryIds'] = [audit.bc.stable_id('taxonomy', 'missing')]
        self.assertTrue(any(e['field'] == 'categoryIds' for e in self.errors()))

    def test_missing_source_on_simulated_verified_record(self):
        self.bundle['entities']['venueDishes'][0]['sourceRef'] = None
        self.assertTrue(any(e['entity'] == 'venueDishes' and e['field'] == 'sourceRef' for e in self.errors()))

    def test_negative_price(self):
        self.bundle['entities']['venueDishes'][0]['priceMin'] = -1
        self.assertTrue(any(e['field'] == 'priceMin' for e in self.errors()))

    def test_invented_unit(self):
        self.bundle['entities']['venueDishes'][0]['unit'] = 'plate-per-person-guessed'
        self.assertTrue(any(e['field'] == 'unit' for e in self.errors()))

    def test_overnight_without_day_offset(self):
        self.bundle['entities']['weeklySchedules'][0].update(startTime='22:00', endTime='02:00', endDayOffset=0, is24Hours=False)
        self.assertTrue(any(e['entity'] == 'weeklySchedules' for e in self.errors()))

    def test_closed_exception_cannot_contain_open_interval(self):
        bundle = audit.ff.build_suite()[0]['night-closed-next-day']
        bundle['entities']['dateExceptions'][0]['intervals'] = [dict(startTime='10:00', endTime='11:00', endDayOffset=0)]
        self.assertTrue(audit.check_bundle(bundle, 'closed.json', at=audit.ff.VALIDATION_AT))

    def test_fixture_cannot_publish(self):
        self.bundle['entities']['dishes'][0]['reviewStatus'] = 'published'
        self.bundle['entities']['dishes'][0]['status'] = 'published'
        self.assertTrue(any('fixture' in e['message'].lower() for e in self.errors()))

    def test_draft_unknown_does_not_become_error_or_verified(self):
        bundle = audit.forms.example_bundle()
        self.assertEqual(audit.check_bundle(bundle, 'example.json'), [])
        self.assertIsNone(bundle['entities']['dishes'][0]['flavor'])
        self.assertEqual(bundle['entities']['dishes'][0]['temperature'], 'unknown')
        self.assertIsNone(bundle['entities']['dataSources'][0]['validUntil'])

    def test_corrupt_csv_detected_despite_valid_json(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            audit.dc.write_csv_bundle(self.bundle, directory)
            path = directory / 'dishes.csv'
            rows = audit.bc.read_csv(path)
            rows[0]['name'] = 'Wrong display name'
            audit.bc.write_csv(path, rows, list(rows[0]))
            errors = audit.check_bundle(self.bundle, 'base.json', csv_directory=directory, at=audit.ff.VALIDATION_AT)
            self.assertTrue(any(e['field'] == 'csv/json' for e in errors))

    def manifest(self, directory, filename='input.json'):
        path = directory / filename
        path.write_text('{}\n')
        value = dict(files={filename: dict(sha256=audit.ec.sha256(path), bytes=path.stat().st_size)})
        (directory / 'manifest.json').write_text(json.dumps(value))
        return value

    def test_checksum_size_missing_or_unlisted_file(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            self.manifest(directory)
            self.assertEqual(audit.check_manifest(directory), [])
            (directory / 'input.json').write_text('{"changed":true}\n')
            self.assertTrue(audit.check_manifest(directory))
            (directory / 'input.json').unlink()
            self.assertTrue(audit.check_manifest(directory))
            self.manifest(directory)
            (directory / 'unlisted.json').write_text('{}')
            self.assertTrue(audit.check_manifest(directory))

    def test_manifest_path_escape_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            (directory / 'manifest.json').write_text(json.dumps(dict(files={'../escape.json': dict(bytes=0, sha256='x')})))
            self.assertTrue(any('escapes' in e['message'] for e in audit.check_manifest(directory)))

    def test_nested_manifest_uses_posix_paths_on_windows(self):
        with tempfile.TemporaryDirectory() as d:
            directory=Path(d);(directory/'nested').mkdir()
            self.manifest(directory,'nested/input.json')
            original=Path.relative_to
            def windows_relative(path,*args,**kwargs):
                return PureWindowsPath(original(path,*args,**kwargs).as_posix())
            with patch.object(Path,'relative_to',windows_relative):
                self.assertEqual(audit.check_manifest(directory),[])

    def test_registry_duplicate_or_changed_uuid(self):
        registry = audit.bc.load_json(audit.bc.BASE / 'config/taxonomy_registry_v1.json')
        codebook = audit.bc.load_json(audit.bc.BASE / 'config/taxonomy_v1.json')
        registry['entries'].append(copy.deepcopy(registry['entries'][0]))
        self.assertTrue(audit.check_registry(registry, codebook))
        registry['entries'].pop()
        registry['entries'][0]['id'] = audit.bc.stable_id('taxonomy', 'wrong-key')
        self.assertTrue(audit.check_registry(registry, codebook))

    def test_report_cannot_overwrite_data(self):
        for directory in [audit.ec.OUTPUT, audit.ff.OUTPUT, audit.bc.BASE / 'templates/empty']:
            with self.assertRaises(ValueError):
                audit.save_report({}, directory)

    def test_broken_section_still_reports_other_sections(self):
        with patch.object(audit.bc, 'build', side_effect=ValueError('Source ID corrupted')):
            report = audit.audit()
        self.assertFalse(report['validStructure'])
        self.assertTrue(any('Source ID corrupted' in e['message'] for e in report['errors']))
        self.assertTrue(next(c for c in report['checks'] if c['name'] == 'fixture-contract-expected-replay')['passed'])

    def test_reports_reproducible_and_clock_explicit(self):
        with tempfile.TemporaryDirectory() as d:
            report = audit.audit()
            audit.save_report(report, d)
            before = {p.name: p.read_bytes() for p in Path(d).iterdir()}
            audit.save_report(audit.audit(), d)
            self.assertEqual(before, {p.name: p.read_bytes() for p in Path(d).iterdir()})
        with self.assertRaises(ValueError):
            audit.audit(at='yesterday')


if __name__ == '__main__':
    unittest.main()
