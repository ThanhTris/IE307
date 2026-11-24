"""GM-52: compare a hosted Supabase project with a QA stack built from main. Read-only on both sides.

Reference: an owned GM-03 QA stack started from this checkout (npm run qa:start), read through its manifest.
Hosted:    SUPABASE_DB_URL set in the shell session (never written to a file or printed). Needs the psql client.

    python scripts/gm52_hosted_parity.py --qa-manifest .work/qa/<run>/manifest.json --project-ref <ref> [--json out.json]

Compares the migration ledger, the function inventory (identity, owner, security definer, search_path, ACL and the SHA-256 of
each definition) and the settings GM-52 depends on (pg_cron jobs, allow_new_sessions, schema version). Exit 1 on any difference.
Health of Auth or REST is not evidence that the deployed code matches main, so this never relies on it.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
INVENTORY_SQL = ROOT / 'scripts/gm03_function_inventory.sql'
# Windows checkouts leave carriage returns inside function bodies, and the CLI may keep or drop them depending on how the
# migration was read. They change no behaviour, so the definition hash is taken with them removed on both sides.
INVENTORY_NORMALISED_SQL = INVENTORY_SQL.read_text(encoding='utf-8').replace(
    "pg_get_functiondef(p.oid), 'UTF8'", "replace(pg_get_functiondef(p.oid), E'\\r', ''), 'UTF8'")
LEDGER_SQL = ("select coalesce(json_agg(json_build_object('version',version::text,'name',name) order by version),'[]'::json)::text "
              "from supabase_migrations.schema_migrations;")
SETTINGS_SQL = """
select json_build_object(
  'schemaVersion', (select schema_version from public.schema_versions order by installed_at desc, schema_version desc limit 1),
  'allowNewSessions', (select allow_new_sessions from gm20_canonical_private.configuration where singleton),
  'cronExtension', exists(select 1 from pg_extension where extname='pg_cron'),
  'cronJobs', coalesce((select json_agg(json_build_object('name',jobname,'schedule',schedule,'user',username,'active',active) order by jobname)
                        from cron.job where jobname in ('ie307-gm48-tick','ie307-gm48-prune')), '[]'::json)
)::text;
"""
# Same query without cron: QA stacks usually have no pg_cron extension (the worker replaces it there).
SETTINGS_SQL_NO_CRON = SETTINGS_SQL.split("'cronExtension'")[0] + "'cronExtension', false, 'cronJobs', '[]'::json\n)::text;"


class ParityError(Exception):
    pass


def diff_lists(reference, hosted, key):
    """Pure comparison used by the tests: returns missing, extra and changed items by key."""
    ref = {key(item): item for item in reference}
    host = {key(item): item for item in hosted}
    return {
        'missingOnHosted': sorted(k for k in ref if k not in host),
        'extraOnHosted': sorted(k for k in host if k not in ref),
        'changed': sorted(k for k in ref if k in host and ref[k] != host[k]),
    }


def compare(reference, hosted, *, expect_cron):
    ledger = diff_lists(reference['ledger'], hosted['ledger'], lambda r: r['version'])
    functions = diff_lists(reference['functions'], hosted['functions'],
                           lambda f: f"{f['schema']}.{f['name']}({f['identityArguments']})")
    problems = []
    if any(ledger.values()):
        problems.append('migration ledger differs')
    if any(functions.values()):
        problems.append('function definitions differ')
    settings = {}
    if reference['settings'].get('schemaVersion') != hosted['settings'].get('schemaVersion'):
        problems.append('schema version differs')
    settings['schemaVersion'] = {'main': reference['settings'].get('schemaVersion'), 'hosted': hosted['settings'].get('schemaVersion')}
    settings['allowNewSessions'] = hosted['settings'].get('allowNewSessions')
    jobs = {j['name']: j for j in hosted['settings'].get('cronJobs', [])}
    settings['cronJobs'] = list(jobs.values())
    if expect_cron:
        if not hosted['settings'].get('cronExtension'):
            problems.append('pg_cron extension is not enabled on hosted')
        tick, prune = jobs.get('ie307-gm48-tick'), jobs.get('ie307-gm48-prune')
        if not tick or not tick.get('active') or tick.get('user') != 'postgres' or '2 seconds' not in str(tick.get('schedule', '')):
            problems.append('ie307-gm48-tick is missing, inactive, not run by postgres or not every 2 seconds')
        if not prune or not prune.get('active'):
            problems.append('ie307-gm48-prune is missing or inactive')
    return {'ledger': ledger, 'functions': functions, 'settings': settings, 'problems': problems, 'result': 'Fail' if problems else 'Pass'}


def psql_url(url, sql):
    if shutil.which('psql'):
        process = subprocess.run(['psql', url, '-XqAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], input=sql, capture_output=True, text=True, timeout=120)
    else:
        # No local client: run psql from the postgres image. The URL goes in through the environment, never the command line.
        process = subprocess.run(['docker', 'run', '--rm', '-i', '-e', 'GM52_DB_URL', 'postgres:17-alpine', 'sh', '-c',
                                  'psql "$GM52_DB_URL" -XqAt -v ON_ERROR_STOP=1 -f -'],
                                 input=sql, capture_output=True, text=True, timeout=300, env={**os.environ, 'GM52_DB_URL': url})
    if process.returncode != 0:
        # The URL holds a password: report psql's own message, never the URL.
        message = re.sub(r'postgres(ql)?://\S+', '<db-url>', process.stderr.strip())
        raise ParityError('psql failed on hosted: ' + message[:300])
    return process.stdout.strip()


def read_state(run_sql):
    inventory = run_sql(INVENTORY_NORMALISED_SQL)
    # cron.job does not exist until Cron is enabled: asking for it would fail the whole query instead of reporting "no jobs".
    # psql prints t/f, the CLI returns a JSON boolean.
    has_cron = run_sql("select exists(select 1 from pg_extension where extname='pg_cron');").strip().lower() in ('t', 'true')
    return {'ledger': json.loads(run_sql(LEDGER_SQL) or '[]'),
            'functions': json.loads(inventory or '[]'),
            'settings': json.loads(run_sql(SETTINGS_SQL if has_cron else SETTINGS_SQL_NO_CRON) or '{}')}


def cli_runner(project_ref):
    """Runs SQL on the project through `supabase db query --linked` (Management API with the logged-in CLI session)."""
    import tempfile
    cli = ROOT / 'node_modules/supabase/dist/supabase.js'
    if not cli.exists():
        raise ParityError('run npm ci at the repository root first (Supabase CLI missing)')

    def run(sql):
        with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False, encoding='utf-8') as handle:
            handle.write(sql)
            path = handle.name
        try:
            process = subprocess.run(['node', str(cli), 'db', 'query', '--linked', '--project-ref', project_ref, '-f', path],
                                     capture_output=True, text=True, timeout=180)
        finally:
            os.unlink(path)
        text = process.stdout
        start = text.find('{')
        if process.returncode != 0 or start < 0:
            raise ParityError('supabase db query failed: ' + re.sub(r'\s+', ' ', (process.stderr or text))[:300])
        rows = json.loads(text[start:text.rindex('}') + 1]).get('rows', [])
        if not rows:
            return ''
        value = next(iter(rows[0].values()))
        return value if isinstance(value, str) else json.dumps(value)
    return run


def hosted_url(project_ref):
    url = os.environ.get('SUPABASE_DB_URL')
    if not url:
        raise ParityError('set SUPABASE_DB_URL in this shell session (Dashboard > Connect > session pooler)')
    host = urlparse(url).hostname or ''
    # Direct and pooler hosts both carry the project ref (db.<ref>.supabase.co, or the user name postgres.<ref> on the pooler).
    if project_ref not in url:
        raise ParityError('SUPABASE_DB_URL does not belong to --project-ref ' + project_ref)
    if not (host.endswith('.supabase.co') or host.endswith('.supabase.com')):
        raise ParityError('refusing a database host outside supabase.co / supabase.com')
    return url


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--qa-manifest', required=True)
    parser.add_argument('--project-ref', required=True)
    parser.add_argument('--no-cron', action='store_true', help='do not require the GM-48 cron jobs (hosted without Cron enabled yet)')
    parser.add_argument('--json', help='write the full report here')
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT / 'scripts'))
    from gm40_manifest_check import ManifestQAContainerDB, load_manifest, verify_manifest  # noqa: E402

    manifest, state = load_manifest(args.qa_manifest)
    verify_manifest(args.qa_manifest, manifest)
    qa = ManifestQAContainerDB(args.qa_manifest, state['worker']['nonce'])
    reference = {'ledger': json.loads(qa.psql(LEDGER_SQL) or '[]'),
                 'functions': json.loads(qa.psql(INVENTORY_NORMALISED_SQL) or '[]'),
                 'settings': json.loads(qa.psql(SETTINGS_SQL_NO_CRON) or '{}')}
    if os.environ.get('SUPABASE_DB_URL'):
        url = hosted_url(args.project_ref)
        hosted = read_state(lambda sql: psql_url(url, sql))
        report_via = 'psql (SUPABASE_DB_URL)'
    else:
        hosted = read_state(cli_runner(args.project_ref))
        report_via = 'supabase db query --linked'
    report = compare(reference, hosted, expect_cron=not args.no_cron)
    report['project'] = args.project_ref
    report['hostedRead'] = report_via
    report['counts'] = {'mainMigrations': len(reference['ledger']), 'hostedMigrations': len(hosted['ledger']),
                        'mainFunctions': len(reference['functions']), 'hostedFunctions': len(hosted['functions'])}
    text = json.dumps(report, indent=2)
    if args.json:
        Path(args.json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json).write_text(text + '\n', encoding='utf-8')
    print(text)
    return 0 if report['result'] == 'Pass' else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except ParityError as error:
        print('FAIL', error)
        sys.exit(2)
