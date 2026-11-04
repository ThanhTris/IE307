#!/usr/bin/env python3
"""Prove GM-23 migration 0038 upgrades an owned 0037 database with live outbox rows."""
from __future__ import annotations
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import gm20_canonical_check as qa

BASE = qa.ROOT / '.work/gm23-upgrade'
qa.OUTPUT = BASE
qa.PRIVATE = BASE / 'runtime.private.json'
qa.BRUNO = qa.ROOT / 'supabase/tests/bruno/GM-23-canonical/environments/Local.runtime.private.bru'
MIRROR = BASE / 'migrations-0037'
MIGRATION = qa.ROOT / 'supabase/migrations/0038_gm23_canonical_notifications.sql'
FIXTURE = BASE / 'upgrade-fixture.json'
REPORT = BASE / 'upgrade-results.json'


def prepare_migrations() -> Path:
    source = (qa.ROOT / 'supabase/migrations').resolve()
    if MIRROR.is_symlink() or not MIRROR.resolve().is_relative_to(BASE.resolve()):
        raise RuntimeError('GM23_UPGRADE_MIGRATION_SNAPSHOT_UNSAFE')
    expected = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted(source.glob('*.sql')) if p.name < MIGRATION.name}
    if not expected or '0037_gm22_invitation_admission.sql' not in expected:
        raise RuntimeError('GM23_UPGRADE_0037_BASELINE_MISSING')
    if MIRROR.exists():
        actual = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in sorted(MIRROR.glob('*.sql'))}
        if actual != expected:
            raise RuntimeError('GM23_UPGRADE_MIGRATION_SNAPSHOT_DRIFT')
    else:
        MIRROR.mkdir(parents=True)
        for name in expected:
            shutil.copy2(source / name, MIRROR / name)
    return MIRROR


def persist_owner() -> None:
    if qa.PRIVATE.exists() or qa.PRIVATE.is_symlink():
        raise RuntimeError('GM23_UPGRADE_RUNTIME_CONFLICT: run --cleanup before another setup')
    state = {key: value for key, value in os.environ.items() if key.startswith('GM_V4_')}
    if not state:
        raise RuntimeError('GM23_UPGRADE_OWNER_ENVIRONMENT_MISSING')
    qa.PRIVATE.write_text(json.dumps(state, sort_keys=True), encoding='utf-8')
    qa.PRIVATE.chmod(0o600)
    qa.restore()


def run_node(mode: str) -> dict:
    result = subprocess.run(['node', 'scripts/gm23_upgrade_http.mjs', mode], cwd=qa.ROOT,
                            env=os.environ.copy(), capture_output=True, text=True,
                            encoding='utf-8', errors='replace', timeout=900)
    if result.stdout:
        print(qa.runtime.redact(result.stdout[-6000:]), flush=True)
    if result.stderr:
        print(qa.runtime.redact(result.stderr[-4000:]), file=sys.stderr, flush=True)
    if result.returncode:
        raise RuntimeError('GM23_UPGRADE_HTTP_' + mode.upper() + '_FAILED')
    return json.loads(FIXTURE.read_text(encoding='utf-8'))


def run(*, keep: bool = False) -> None:
    qa.configure()
    qa.OUTPUT.mkdir(parents=True, exist_ok=True)
    migration_dir = prepare_migrations()
    if REPORT.exists():
        REPORT.unlink()
    FIXTURE.unlink(missing_ok=True)
    success = False
    result = {'result': 'Not run', 'sourceMigration': '0037', 'targetMigration': '0038',
              'schemaVersion': '0.15.0', 'applicationDatabaseChanged': False,
              'expected': {'liveTerminalRowsBackfilledOnce': True,
                           'expiredTerminalRowsBackfilled': False,
                           'rerunDoesNotDuplicateEventOrInbox': True}}
    try:
        qa.runtime.setup(migration_dir=migration_dir)
        persist_owner()
        run_node('--create')
        fixture = json.loads(FIXTURE.read_text(encoding='utf-8'))
        worker = qa.runtime.load_report().get('workerPidFile')
        worker_result = qa.runtime.stop_worker(qa.runtime.load_report())
        if worker and worker_result != 'stopped':
            raise RuntimeError('GM23_UPGRADE_WORKER_STOP_FAILED')
        db = qa.restore()
        db.psql("begin;alter table gm20_canonical_private.terminal_outbox disable trigger gm20_outbox_frozen;update gm20_canonical_private.terminal_outbox set expires_at=clock_timestamp()-interval '1 second' where result_id='" + fixture['expiredResultId'] + "';alter table gm20_canonical_private.terminal_outbox enable trigger gm20_outbox_frozen;commit;")
        if db.psql("select expires_at<=clock_timestamp() from gm20_canonical_private.terminal_outbox where result_id='" + fixture['expiredResultId'] + "'") != 't':
            raise RuntimeError('GM23_UPGRADE_EXPIRED_FIXTURE_MISSING')
        fixture['expiredFixture'] = 'synthetic expiry adjustment after stopping the owned GM-20 worker; immutable trigger restored in the same transaction'
        FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        qa_workdir = Path(os.environ['GM_V4_QA_WORKDIR'])
        migration_copy = qa_workdir / 'supabase/migrations' / MIGRATION.name
        shutil.copy2(MIGRATION, migration_copy)
        qa.runtime.cli('migration', 'up', '--local', '--workdir', str(qa_workdir), timeout=900)
        run_node('--verify')
        qa.runtime.cli('migration', 'up', '--local', '--workdir', str(qa_workdir), timeout=900)
        run_node('--verify')
        db = qa.restore()
        ledger = db.psql("select count(*) from supabase_migrations.schema_migrations where version='0038'")
        schema = db.psql("select count(*) from public.schema_versions where schema_version='0.15.0' and contract_id='food-v1/roadmap-v2/GM-23.2'")
        if ledger != '1' or schema != '1':
            raise RuntimeError('GM23_UPGRADE_LEDGER_MISMATCH')
        actual = json.loads(FIXTURE.read_text(encoding='utf-8'))
        result.update({'result': 'Pass', 'actual': actual['upgradeActual'],
                       'qaProject': os.environ['GM_V4_QA_PROJECT_ID'],
                       'databaseLedger': {'migration0038': ledger, 'schema0150': schema},
                       'sourceHashes': {
                           '0037_gm22_invitation_admission.sql': hashlib.sha256((qa.ROOT / 'supabase/migrations/0037_gm22_invitation_admission.sql').read_bytes()).hexdigest(),
                           '0038_gm23_canonical_notifications.sql': hashlib.sha256(MIGRATION.read_bytes()).hexdigest(),
                           'dish_v4_ci.py': hashlib.sha256((qa.ROOT / 'scripts/dish_v4_ci.py').read_bytes()).hexdigest(),
                           'gm23_upgrade_http.mjs': hashlib.sha256((qa.ROOT / 'scripts/gm23_upgrade_http.mjs').read_bytes()).hexdigest()},
                       'fixtureResults': {'live': fixture['liveResultId'], 'expired': fixture['expiredResultId']},
                       'expiredFixture': fixture['expiredFixture'], 'workerStoppedBeforeExpiryMutation': worker_result,
                       'credentialsInEvidence': False})
        REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        qa.runtime.record('gm23-upgrade-0037-to-0038', 'Pass', reportPath=str(REPORT), applicationDatabaseChanged=False)
        success = True
    except Exception as error:
        result.update({'result': 'Fail', 'failure': qa.runtime.redact(str(error)),
                       'qaProject': os.environ.get('GM_V4_QA_PROJECT_ID'), 'credentialsInEvidence': False})
        REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        qa.runtime.record('gm23-upgrade-0037-to-0038', 'Fail', failure=qa.runtime.redact(str(error)))
        raise
    finally:
        if not keep:
            cleanup()
        else:
            print('Owned GM23 upgrade QA retained; run scripts/gm23_upgrade_check.py --cleanup to stop it.', flush=True)
    if success:
        print('PASS GM-23 0037 to 0038 backfill and idempotency', flush=True)


def cleanup() -> None:
    qa.configure()
    qa.runtime.run(['docker', 'info', '--format', '{{.ServerVersion}}'], timeout=20)
    if qa.PRIVATE.is_symlink():
        raise RuntimeError('GM23_UPGRADE_CONTROL_SYMLINK')
    if qa.PRIVATE.exists():
        state = json.loads(qa.PRIVATE.read_text(encoding='utf-8'))
        qa.validate_state(state)
        os.environ.update(state)
        qa.restore()
    qa.cleanup()


if __name__ == '__main__':
    try:
        if '--cleanup' in sys.argv:
            cleanup()
        else:
            run(keep='--keep' in sys.argv)
    except KeyboardInterrupt:
        cleanup()
        raise SystemExit(130)
    except Exception as error:
        print(qa.runtime.redact(str(error)), file=sys.stderr)
        raise SystemExit(1)
