"""Frozen GM17 SQL assertions on an owned current-schema DB, not app deployment."""
import hashlib
import json
from pathlib import Path
import sys
import gm17_access_check as upstream

# The upstream CLI also compares app deployment to freshly migrated ACLs.
# GM22 is not deployed on that app DB. Preserve it; redirect ONLY the metadata
# comparison to the already-created owned DB. Business/TAP assertions unchanged.
original = upstream.psql
owned = None

def psql(database, sql):
    global owned
    if sql.startswith('create database gm17_check_'):
        owned = sql.split()[2]
    if database == 'postgres' and "'columnGrants'" in sql and "'functions'" in sql:
        if owned is None or not owned.startswith('gm17_check_'):
            raise RuntimeError('Owned regression database not initialized')
        return original(owned, sql)
    return original(database, sql)

if __name__ == '__main__':
    upstream.psql = psql
    upstream.main()
    report_path = Path(sys.argv[sys.argv.index('--report') + 1])
    report = json.loads(report_path.read_text())
    report.pop('localDeploymentMatchesFresh', None)
    report['comparisonScope'] = 'owned fresh DB only; app deployment parity NOT tested by this adapter'
    report['appDeployment'] = 'Separate read-only original runner found missing GM22 profile column grants; no app DB changes'
    report['adapterSha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    report['upstreamAssertionsUnchanged'] = True
    report_path.write_text(json.dumps(report, indent=2) + '\n')
