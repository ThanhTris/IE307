"""Synthetic Project responses: no network calls or real task approvals in unit tests."""
import contextlib
import copy
import io
import json
import os
import re
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import github_project_status as project
import task_readiness as gates
from test_repository_validator import MemorySource, deliver_in_memory


def item(config, tid, status='Done', **extra):
    return {'id': tid, 'isArchived': False, 'status': {'name': status},
            'content': {'__typename': 'Issue', 'number': config['issues'][tid],
                        'title': tid + ' — current task', 'url': 'https://github.com/ThanhTris/IE307/issues/' + str(config['issues'][tid]),
                        'repository': {'nameWithOwner': config['repository']}}, **extra}


def response(config, items, more=False, cursor=None):
    return {'data': {'user': {'projectV2': {
        'id': 'project-test', 'url': f'https://github.com/users/{config["owner"]}/projects/{config["number"]}',
        'items': {'nodes': items, 'pageInfo': {'hasNextPage': more, 'endCursor': cursor}}
    }}}}


class ProjectApiTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource()
        self.config = project.configuration(self.source)

    def snapshot(self, *items):
        return project.ProjectSnapshot(self.config, list(items), 'test', '2026-10-10T00:00:00Z')

    def test_done_is_approval_even_if_issue_open(self):
        value = item(self.config, 'GM-04')
        value['content']['state'] = 'OPEN'
        self.assertEqual(self.snapshot(value).approval_errors('GM-04'), [])

    def test_closed_issue_is_not_project_done(self):
        value = item(self.config, 'GM-04', 'Todo')
        value['content']['state'] = 'CLOSED'
        self.assertTrue(self.snapshot(value).approval_errors('GM-04'))

    def test_missing_wrong_repo_or_wrong_issue_never_approves(self):
        value = item(self.config, 'GM-04')
        for field, replacement in (('repository', {'nameWithOwner': 'other/IE307'}), ('number', 999)):
            altered = copy.deepcopy(value)
            altered['content'][field] = replacement
            self.assertTrue(self.snapshot(altered).approval_errors('GM-04'))
        self.assertTrue(self.snapshot().approval_errors('GM-04'))

    def test_draft_pr_redacted_and_archived_never_approve(self):
        for typename in ('DraftIssue', 'PullRequest'):
            value = item(self.config, 'GM-04')
            value['content']['__typename'] = typename
            self.assertTrue(self.snapshot(value).approval_errors('GM-04'))
        self.assertTrue(self.snapshot(item(self.config, 'GM-04', isArchived=True)).approval_errors('GM-04'))

    def test_duplicate_and_wrong_task_title_block(self):
        value = item(self.config, 'GM-04')
        self.assertTrue(self.snapshot(value, value).approval_errors('GM-04'))
        value['content']['title'] = 'GM-040 — old task'
        self.assertTrue(self.snapshot(value).approval_errors('GM-04'))

    def test_missing_status_or_different_option_blocks(self):
        for value in (item(self.config, 'GM-04', status=None), item(self.config, 'GM-04', status='done'),
                      item(self.config, 'GM-04', status='In Progress')):
            self.assertTrue(self.snapshot(value).approval_errors('GM-04'))

    def test_pagination_reads_all_pages_with_exact_status_field(self):
        pages = [response(self.config, [item(self.config, 'GM-03')], True, 'next'),
                 response(self.config, [item(self.config, 'GM-04')])]
        with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', side_effect=pages) as api:
            result = project.load_project(self.source, Path.cwd())
        self.assertEqual(result.approval_errors('GM-04'), [])
        self.assertEqual(api.call_args_list[1].args[1]['after'], 'next')
        self.assertEqual(api.call_args_list[0].args[1]['field'], 'Status')

    def test_incomplete_second_page_is_not_accepted(self):
        pages = [response(self.config, [item(self.config, 'GM-04')], True, 'next'), {}]
        with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', side_effect=pages):
            with self.assertRaises(project.ProjectUnavailable):
                project.load_project(self.source, Path.cwd())

    def test_repeated_cursor_blocks_not_partial_success(self):
        page = response(self.config, [item(self.config, 'GM-04')], True, 'repeat')
        with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', return_value=page):
            with self.assertRaises(project.ProjectUnavailable):
                project.load_project(self.source, Path.cwd())

    def test_wrong_project_or_null_project_blocks(self):
        for value in ({'data': {'user': {'projectV2': None}}}, response(self.config, [])):
            if value['data']['user']['projectV2']:
                value['data']['user']['projectV2']['url'] = 'https://github.com/users/other/projects/2'
            with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', return_value=value):
                with self.assertRaises(project.ProjectUnavailable):
                    project.load_project(self.source, Path.cwd())

    def test_redacted_content_is_not_approval_and_malformed_status_blocks_snapshot(self):
        with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', return_value=response(self.config, [{'content': None, 'status': None}])):
            result = project.load_project(self.source, Path.cwd())
            self.assertTrue(result.approval_errors('GM-04'))
        for invalid in ({'status': []}, {'content': []}, {'content': {'__typename': 'Issue', 'repository': None}}):
            with patch.object(project, 'credential', return_value='test-secret'), patch.object(project, 'graphql', return_value=response(self.config, [invalid])):
                with self.assertRaises(project.ProjectUnavailable):
                    project.load_project(self.source, Path.cwd())

    def test_invalid_mapping_blocks(self):
        for change in ('duplicate', 'missing'):
            value = copy.deepcopy(self.config)
            if change == 'duplicate':
                value['issues']['GM-03'] = value['issues']['GM-04']
            else:
                del value['issues']['GM-03']
            self.source.contents[project.CONFIG_PATH] = json.dumps(value)
            with self.assertRaises(project.ProjectUnavailable):
                project.configuration(self.source)

    def test_credentials_never_log_or_echo_helper_failure(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(project.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, 'password=TEST_SECRET', 'TEST_SECRET')):
            with self.assertRaises(project.ProjectUnavailable) as raised:
                project.credential(Path.cwd())
        self.assertNotIn('TEST_SECRET', str(raised.exception))

    def test_environment_token_skips_helper(self):
        with patch.dict(os.environ, {'GH_TOKEN': 'test-secret'}, clear=True), patch.object(project.subprocess, 'run') as helper:
            self.assertEqual(project.credential(Path.cwd()), 'test-secret')
            helper.assert_not_called()

    def test_permission_network_http_and_invalid_json_fail_closed_without_secrets(self):
        for error in (URLError('TEST_SECRET'), HTTPError('test', 403, 'TEST_SECRET', {}, None), ValueError('TEST_SECRET')):
            with patch.object(project, 'urlopen', side_effect=error):
                with self.assertRaises(project.ProjectUnavailable) as raised:
                    project.graphql('TEST_SECRET', {})
            self.assertNotIn('TEST_SECRET', str(raised.exception))
        stream = io.StringIO('{"errors":[{"message":"TEST_SECRET"}]}')
        with patch.object(project, 'urlopen', return_value=stream):
            with self.assertRaises(project.ProjectUnavailable) as raised:
                project.graphql('TEST_SECRET', {})
        self.assertNotIn('TEST_SECRET', str(raised.exception))


class ProjectGateTests(unittest.TestCase):
    def setUp(self):
        self.source = MemorySource(controlled_statuses=True)
        config = project.configuration(self.source)
        self.snapshot = project.ProjectSnapshot(config, [item(config, tid) for tid in ('GM-01', 'GM-03', 'GM-04')],
                                                'https://github.com/users/ThanhTris/projects/2', 'test-time')
        for tid in ('GM-01', 'GM-03', 'GM-04'):
            deliver_in_memory(self.source, tid)

    def gate(self, gate='start', base=None):
        return gates.readiness(self.source, gates.repository.task_records(self.source), 'GM-06', gate, base, self.snapshot)

    def test_project_done_unlocks_despite_stale_backlog_review_and_no_review_md(self):
        before = copy.deepcopy(self.source.contents)
        self.assertEqual(self.gate(), ('READY_TO_CLAIM', []))
        self.assertEqual(self.source.contents, before)
        self.assertEqual(gates.readiness(self.source, gates.repository.task_records(self.source), 'GM-06')[0], 'BLOCKED')

    def test_todo_on_project_overrides_local_approved_record(self):
        self.snapshot.items[1]['status']['name'] = 'Todo'
        self.assertEqual(self.gate(), ('BLOCKED', ['GM-03']))

    def test_done_without_output_or_handoff_blocks(self):
        self.source.files.remove('docs/evidence/roadmap-v2/GM-04/HANDOFF.md')
        self.assertEqual(self.gate(), ('BLOCKED_ARTIFACTS', ['GM-04']))

    def test_done_on_project_reports_source_not_ai_approval(self):
        record = gates.repository.task_records(self.source)
        self.assertEqual(gates.readiness(self.source, record, 'GM-04', project=self.snapshot), ('DONE_ON_PROJECT', []))

    def test_binary_fingerprints_are_used_without_text_decoding(self):
        source = type('BinarySource', (), {'digest': lambda self, path: 'blob-sha',
                                         'read': lambda self, path: self.fail()})()
        self.assertEqual(gates.artifact_fingerprint(source, 'binary.png'), 'blob-sha')

    def test_done_upstream_with_different_target_file_has_actionable_cli_output(self):
        base = copy.deepcopy(self.source)
        base.ref = 'synthetic-target-sha'
        artifact = gates.delivered_paths(self.source, 'GM-04')[0]
        base.contents[artifact] += 'changed'
        with patch.object(gates.repository, 'Source', side_effect=lambda ref: self.source if ref is None else base), patch.object(project, 'load_project', return_value=self.snapshot), patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-06', '--gate', 'merge', '--base-ref', 'target']), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(gates.main(), 1)
        self.assertIn('Project=Done', output.getvalue())
        self.assertIn('target artifact content differs: ' + artifact, output.getvalue())

    def test_merge_still_needs_base(self):
        self.assertEqual(self.gate('merge'), ('NEEDS_BASE_CHECK', []))

    def test_merge_matching_artifacts_and_versions_not_task_status_allows_review(self):
        base = copy.deepcopy(self.source)
        path = base.task_path('GM-03')
        base.contents[path] += '\nScheduling/review notes only.\n'
        self.assertEqual(self.gate('merge', base), ('READY_FOR_MERGE_REVIEW', []))

    def test_merge_changed_artifact_version_or_output_manifest_blocks(self):
        for kind in ('artifact', 'contract', 'manifest', 'handoff'):
            base = copy.deepcopy(self.source)
            if kind == 'artifact':
                base.contents[gates.delivered_paths(self.source, 'GM-04')[0]] += '\nchanged\n'
            elif kind == 'contract':
                path = base.task_path('GM-04')
                base.contents[path] = re.sub(r'^contract_version:.*$', 'contract_version: synthetic/older', base.read(path), flags=re.M)
            elif kind == 'manifest':
                mapping = json.loads(base.read('tasks/task-id-map.json'))
                next(e for e in mapping['entries'] if e['new_id'] == 'GM-04')['outputs'].append('other.json')
                base.contents['tasks/task-id-map.json'] = json.dumps(mapping)
            else:
                base.files.remove('docs/evidence/roadmap-v2/GM-04/HANDOFF.md')
            self.assertEqual(self.gate('merge', base), ('BLOCKED_ON_BASE', ['GM-04']), kind)

    def test_merge_includes_merge_only_dependencies(self):
        for tid in ('GM-02',):
            deliver_in_memory(self.source, tid)
            self.snapshot.items.append(item(self.snapshot.config, tid))
        records = gates.repository.task_records(self.source)
        self.assertEqual(gates.readiness(self.source, records, 'GM-07', project=self.snapshot)[0], 'READY_TO_CLAIM')
        self.assertEqual(gates.readiness(self.source, records, 'GM-07', 'merge', self.source, self.snapshot), ('BLOCKED', ['GM-06']))

    def test_cli_defaults_to_live_project_and_does_not_recheck_snapshot(self):
        output = io.StringIO()
        with patch.object(gates.repository, 'Source', return_value=self.source), patch.object(project, 'load_project', return_value=self.snapshot) as load, patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-06']), contextlib.redirect_stdout(output):
            self.assertEqual(gates.main(), 0)
        load.assert_called_once()
        self.assertIn('READY_TO_CLAIM', output.getvalue())
        self.assertIn('Approval source:', output.getvalue())

    def test_unavailable_project_does_not_fallback_even_when_local_approval_valid(self):
        with patch.object(project, 'load_project', side_effect=project.ProjectUnavailable('read:project missing')), patch.object(sys, 'argv', ['task_readiness.py', '--task', 'GM-00']), contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(gates.main(), 1)
        self.assertIn('BLOCKED_PROJECT_UNVERIFIED', output.getvalue())

    def test_doc_generation_never_requires_project_credentials(self):
        with patch.object(project, 'load_project', side_effect=AssertionError('must stay offline')), patch.object(sys, 'argv', ['task_readiness.py', '--check-docs']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(gates.main(), 0)

    def test_static_validation_delegates_live_dependency_review_but_not_structure(self):
        path = self.source.task_path('GM-06')
        self.source.contents[path] = self.source.read(path).replace('status: backlog', 'status: in-progress').replace('assignment_status: proposed', 'assignment_status: accepted')
        new = 'tasks/in-progress/GM-06.md'
        self.source.contents[new] = self.source.contents.pop(path)
        self.source.files.remove(path)
        self.source.files.add(new)
        self.source.contents.update(gates.task_link_updates(self.source))
        self.source.contents.update(gates.render_documents(self.source))
        self.assertTrue(any('unreviewed dependency: GM-06' in e for e in gates.repository.validate(self.source)))
        self.assertEqual(gates.repository.validate(self.source, check_dependency_approvals=False), [])


if __name__ == '__main__':
    unittest.main()
