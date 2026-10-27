#!/usr/bin/env python3
"""Write a small, secret-free per-job CI record even when a preceding step failed."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def version(command):
    executable = shutil.which(command)
    if not executable:
        return None
    result = subprocess.run([executable, '--version'], capture_output=True, text=True, timeout=10)
    return (result.stdout or result.stderr).strip()[:160] if result.returncode == 0 else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    hashed = [ROOT / 'docs/architecture/schemas/dish-session-v4b.schema.json']
    hashed += sorted((ROOT / 'supabase/migrations').glob('*.sql'))
    record = {
        'name': args.name,
        'result': os.environ.get('CI_JOB_RESULT', 'unknown'),
        'sha': os.environ.get('GITHUB_SHA', 'local'),
        'ref': os.environ.get('GITHUB_REF', 'local'),
        'runId': os.environ.get('GITHUB_RUN_ID', 'local'),
        'runAttempt': os.environ.get('GITHUB_RUN_ATTEMPT', '1'),
        'os': platform.platform(),
        'python': sys.version.split()[0],
        'node': version('node'),
        'schemaAndMigrationSha256': {
            path.relative_to(ROOT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in hashed if path.is_file()
        },
        'credentialsIncluded': False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
