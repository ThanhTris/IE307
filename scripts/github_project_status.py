"""Read a fresh GitHub Project snapshot. No mutations, cached approvals or secrets on disk."""
from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


CONFIG_PATH = 'tasks/project-gate.json'


class ProjectUnavailable(RuntimeError):
    pass


def configuration(src):
    try:
        config = json.loads(src.read(CONFIG_PATH))
        if config['version'] != 1 or config['authority'] != 'github-project':
            raise ValueError('unsupported authority/version')
        if not re.fullmatch(r'[A-Za-z0-9-]+', config['owner']):
            raise ValueError('invalid owner')
        if type(config['number']) is not int or config['number'] < 1:
            raise ValueError('invalid project number')
        if not re.fullmatch(r'[\w.-]+/[\w.-]+', config['repository']):
            raise ValueError('invalid repository')
        if any(not isinstance(config[k], str) or not config[k] for k in ('status_field', 'done_option')):
            raise ValueError('missing status field/option')
        issues = config['issues']
        if set(issues) != {f'GM-{n:02}' for n in range(1, 39)}:
            raise ValueError('issue mapping must cover GM-01..38 exactly')
        if any(type(n) is not int or n < 1 for n in issues.values()):
            raise ValueError('invalid issue number')
        if len(set(issues.values())) != len(issues):
            raise ValueError('duplicate issue number')
        return config
    except (KeyError, OSError, TypeError, ValueError) as exc:
        raise ProjectUnavailable('Invalid tasks/project-gate.json; cannot verify Project.') from exc


def credential(root):
    for name in ('GH_TOKEN', 'GITHUB_TOKEN'):
        if os.environ.get(name):
            return os.environ[name]
    # Disable interactive prompts; never display credential-helper stdout/stderr.
    try:
        result = subprocess.run(
            ['git', '-c', 'credential.interactive=false', 'credential', 'fill'],
            input='protocol=https\nhost=github.com\n\n', text=True, encoding='utf-8',
            capture_output=True, cwd=root, timeout=15,
            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'never'})
        fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
        if result.returncode == 0 and fields.get('password'):
            return fields['password']
    except (OSError, subprocess.TimeoutExpired):
        pass
    raise ProjectUnavailable('No GitHub credential. Set GH_TOKEN with read:project permission; do not commit it.')


QUERY = '''query($owner:String!, $number:Int!, $after:String, $field:String!) {
  user(login:$owner) { projectV2(number:$number) {
    id url
    items(first:100, after:$after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id isArchived
        status:fieldValueByName(name:$field) {
          ... on ProjectV2ItemFieldSingleSelectValue { name }
        }
        content {
          __typename
          ... on Issue { number title url repository { nameWithOwner } }
        }
      }
    }
  } }
}'''


def graphql(token, variables):
    request = Request('https://api.github.com/graphql',
                      data=json.dumps({'query': QUERY, 'variables': variables}).encode('utf-8'),
                      headers={'Authorization': 'Bearer ' + token,
                               'Content-Type': 'application/json',
                               'User-Agent': 'IE307-task-readiness'})
    try:
        with urlopen(request, timeout=20) as response:
            result = json.load(response)
    except HTTPError as exc:
        exc.close()
        raise ProjectUnavailable(f'GitHub HTTP {exc.code}; verify read:project access. No local fallback.') from None
    except (URLError, OSError, ValueError) as exc:
        raise ProjectUnavailable('Cannot read GitHub Project (network/response error). No local fallback.') from None
    if not isinstance(result, dict) or result.get('errors'):
        # Do not echo raw response bodies, credentials or arbitrary remote error text.
        raise ProjectUnavailable('GitHub rejected Project query. Verify token read:project permission and Project access.')
    return result


class ProjectSnapshot:
    def __init__(self, config, items, project_url, checked_at):
        self.config, self.url, self.checked_at = config, project_url, checked_at
        self.items = items

    def approval_errors(self, tid):
        issue = self.config['issues'].get(tid)
        matches = [item for item in self.items
                   if item.get('content', {}).get('__typename') == 'Issue'
                   and item['content'].get('repository', {}).get('nameWithOwner') == self.config['repository']
                   and item['content'].get('number') == issue]
        if len(matches) != 1:
            return ['Project item missing or duplicated for mapped issue']
        item = matches[0]
        if item.get('isArchived') is not False:
            return ['Project item archived or archive state unknown']
        if not re.match(r'^' + re.escape(tid) + r'(?:\s|[—:\-]|$)', item['content'].get('title', '')):
            return ['Project issue title does not match current task ID']
        status = (item.get('status') or {}).get('name')
        if status != self.config['done_option']:
            return [f'Project {self.config["status_field"]} is {status or "unset"}, not {self.config["done_option"]}']
        return []


def load_project(src, root):
    config = configuration(src)
    token = credential(root)
    expected_url = f'https://github.com/users/{config["owner"]}/projects/{config["number"]}'
    cursor, seen, items, project_id = None, set(), [], None
    for _ in range(100):
        result = graphql(token, {'owner': config['owner'], 'number': config['number'],
                                 'after': cursor, 'field': config['status_field']})
        try:
            project = result['data']['user']['projectV2']
            if project['url'] != expected_url or not project['id']:
                raise ValueError('wrong project')
            if project_id and project_id != project['id']:
                raise ValueError('project changed during pagination')
            project_id = project['id']
            connection = project['items']
            nodes = connection['nodes']
            if not isinstance(nodes, list) or any(not isinstance(n, dict) for n in nodes):
                raise ValueError('invalid items')
            for node in nodes:
                status, content = node.get('status'), node.get('content')
                if status is not None and (not isinstance(status, dict) or not isinstance(status.get('name'), str)):
                    raise ValueError('invalid status')
                if content is not None and not isinstance(content, dict):
                    raise ValueError('invalid content')
                if content and content.get('__typename') == 'Issue':
                    if (not isinstance(content.get('repository'), dict)
                            or not isinstance(content.get('title'), str)
                            or type(content.get('number')) is not int):
                        raise ValueError('invalid issue')
            # Redacted/deleted content is never considered an approved issue.
            items.extend({**n, 'content': n.get('content') or {}} for n in nodes)
            page = connection['pageInfo']
            if page['hasNextPage'] is False:
                return ProjectSnapshot(config, items, expected_url,
                                       datetime.now(timezone.utc).isoformat())
            if page['hasNextPage'] is not True or not page['endCursor'] or page['endCursor'] in seen:
                raise ValueError('invalid pagination')
            cursor = page['endCursor']
            seen.add(cursor)
        except (KeyError, TypeError, ValueError):
            raise ProjectUnavailable('Incomplete or invalid Project response. No local fallback.') from None
    raise ProjectUnavailable('Project pagination limit exceeded; no partial approvals accepted.')
