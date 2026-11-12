"""Read-only Stage 3B preparation checks for the GM-33 Android pilot."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import github_project_status as project_status
import task_readiness
import validate_repository as repository

ROOT = repository.ROOT
READY = {'READY_TO_CLAIM', 'READY_TO_START', 'IN_PROGRESS', 'DONE_ON_PROJECT'}
GM32_RUNS = 'docs/evidence/roadmap-v2/GM-32/manifest-regression/RUNS.json'
GM32_GROUPS = {'baseline', 'legacy-decision', 'canonical', 'boundaries', 'history', 'notifications', 'outbox'}


def run_command(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=60)


def device_transports(output):
    """Return transport classes for explicit selection. Keep this inventory private."""
    devices = {}
    _, header, rows = output.partition('List of devices attached')
    if not header:
        raise ValueError('Unexpected ADB device inventory')
    for line in rows.splitlines():
        fields = line.split()
        if len(fields) < 2:
            continue
        serial, state, *details = fields
        if state != 'device':
            devices[serial] = 'unavailable'
        elif serial.startswith('emulator-'):
            devices[serial] = 'emulator'
        elif any(detail.startswith('usb:') for detail in details):
            devices[serial] = 'usb'
        else:
            devices[serial] = 'other'
    return devices


def classify_devices(output):
    counts = {'usb': 0, 'emulator': 0, 'other': 0, 'unavailable': 0}
    for kind in device_transports(output).values():
        counts[kind] += 1
    return counts


def check_project():
    src = repository.Source(None)
    base = repository.Source('origin/main')
    records = repository.task_records(src)
    upstream = repository.task_records(base).get('GM-40')
    catalogue = {
        'artifactsOnMain': bool(upstream and not repository.delivery_errors(base, upstream)
                                and not task_readiness.project_revision_errors(
                                    src, base, records['GM-40'], upstream)),
        'projectStatus': None,
        'projectDone': False,
    }
    try:
        project = project_status.load_project(src, ROOT)
    except project_status.ProjectUnavailable:
        return {'state': 'BLOCKED_PROJECT_UNVERIFIED', 'catalogue': catalogue}
    state, reasons = task_readiness.readiness(src, records, 'GM-33', base=base, project=project)
    catalogue.update(projectStatus=project.status_for('GM-40'),
                     projectDone=not project.dependency_errors('GM-40'))
    return {'state': state, 'reasons': reasons, 'checkedAt': project.checked_at, 'catalogue': catalogue}


def check_qa(path):
    # Import only for explicit QA verification; device and Project inventory
    # also work without the optional QA Python dependencies.
    from gm40_manifest_check import load_manifest, verify_manifest

    manifest, _ = load_manifest(path)
    verify_manifest(path, manifest)
    return {'state': 'Verified', 'runId': manifest['runId'], 'sourceRevision': manifest['sourceRevision'],
            'sealSha256': manifest['sealSha256'], 'apiPort': manifest['endpoint']['apiPort'],
            'catalogues': {key: manifest['catalogues'][key] for key in ('real', 'synthetic')},
            'migrations': manifest['migrations'],
            'schemaVersions': [row['schema_version'] for row in manifest['schemaVersions']],
            'functionInventorySha256': manifest['functionInventorySha256']}


def check_gm32(qa):
    """Pin the received evidence to Git and compare its runtime to the verified QA."""
    source = run_command('git', 'show', 'HEAD:' + GM32_RUNS)
    if source.returncode:
        return {'state': 'Missing', 'runtimeMatch': None}
    try:
        receipt = json.loads(source.stdout)
        runs = receipt['runs']
        if (receipt['credentialsInEvidence'] is not False or len(runs) != len(GM32_GROUPS)
                or {run['group'] for run in runs} != GM32_GROUPS
                or any(run['result'] != 'Pass' or not run['stages']
                       or any(stage['result'] != 'Pass' for stage in run['stages']) for run in runs)):
            raise ValueError('Incomplete GM-32 evidence')
        functions = {run['functionInventorySha256'] for run in runs}
        runtime_match = None
        if qa['state'] == 'Verified':
            runtime_match = (
                functions == {qa['functionInventorySha256']}
                and all(qa[key] == receipt[key] for key in ('catalogues', 'migrations', 'schemaVersions'))
            )
        return {'state': 'Received', 'runtimeMatch': runtime_match,
                'sha256': hashlib.sha256(source.stdout.encode('utf-8')).hexdigest(),
                'baseRevision': receipt['baseRevision'], 'groups': sorted(GM32_GROUPS)}
    except (KeyError, TypeError, ValueError):
        return {'state': 'Invalid', 'runtimeMatch': None}


def preflight(adb, manifest):
    head = run_command('git', 'rev-parse', 'HEAD')
    head.check_returncode()
    revision = head.stdout.strip()
    local_main = run_command('git', 'rev-parse', 'origin/main')
    remote_main = run_command('git', 'ls-remote', '--exit-code', 'origin', 'refs/heads/main')
    upstream = local_main.stdout.strip()
    fresh = (local_main.returncode == remote_main.returncode == 0
             and remote_main.stdout.split()[:1] == [upstream])
    based_on_main = fresh and run_command(
        'git', 'merge-base', '--is-ancestor', upstream, 'HEAD').returncode == 0

    mobile_status = run_command('git', 'status', '--porcelain', '--', 'mobile')
    mobile_clean = mobile_status.returncode == 0 and not mobile_status.stdout.strip()
    project = check_project()
    try:
        devices = run_command(adb, 'devices', '-l')
        device_state = 'Enumerated' if devices.returncode == 0 else 'ADB command failed'
        counts = classify_devices(devices.stdout) if devices.returncode == 0 else {}
    except (OSError, ValueError, subprocess.TimeoutExpired):
        device_state, counts = 'ADB unavailable', {}

    qa = {'state': 'Not checked'}
    if manifest is not None:
        try:
            qa = check_qa(manifest)
        except (ImportError, KeyError, OSError, RuntimeError, ValueError, subprocess.SubprocessError):
            # Producer exceptions may carry private filesystem paths or SQL.
            qa = {'state': 'Verification failed'}

    regression = check_gm32(qa)
    blockers = []
    if not based_on_main:
        blockers.append('Fetch origin/main and update the pilot checkout')
    if not mobile_clean:
        blockers.append('Commit or isolate mobile changes before pinning a pilot build')
    if project['state'] not in READY:
        blockers.append('GM-33 start gate is blocked')
    if not project['catalogue']['artifactsOnMain']:
        blockers.append('The delivered GM-40 catalogue artifacts are required on main')
    if not project['catalogue']['projectDone']:
        status = project['catalogue']['projectStatus'] or 'unverified'
        blockers.append(f'GM-40 must be Done on Project #2 (current status: {status})')
    if regression['state'] != 'Received':
        blockers.append('Complete GM-32 regression evidence is required in this checkout')
    elif regression['runtimeMatch'] is False:
        blockers.append('QA migrations, function inventory or catalogue differ from GM-32 evidence')
    if not counts.get('usb'):
        blockers.append('An authorized physical Android USB device is required')
    if qa['state'] != 'Verified' or qa.get('sourceRevision') != revision:
        blockers.append('A verified GM-03 QA manifest from this revision is required')

    return {'checkedAt': datetime.now(timezone.utc).isoformat(),
            'appSourceRevision': revision, 'mainRevision': upstream,
            'mainFresh': fresh, 'basedOnMain': based_on_main, 'mobileSourcesClean': mobile_clean,
            'project': project, 'regression': regression,
            'adb': {'state': device_state, 'counts': counts}, 'qa': qa,
            'preflight': 'Blocked' if blockers else 'Ready for manual setup',
            'blockers': blockers, 'pilotExecuted': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--adb', default='adb', help='ADB executable or absolute path')
    parser.add_argument('--qa-manifest', type=Path, help='Explicit GM-03 QA manifest from this checkout')
    args = parser.parse_args()
    try:
        report = preflight(args.adb, args.qa_manifest)
    except (KeyError, OSError, ValueError, subprocess.SubprocessError):
        print('GM-33 preflight could not verify the checkout or gate', file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2))
    return int(bool(report['blockers']))


if __name__ == '__main__':
    sys.exit(main())
