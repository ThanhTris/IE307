# PR143 CI repair — migration upgrade test boundary

PR143 run40888041948 failed in `GM-06 schema / schema` with SQLSTATE3F000.
`CI / required` only aggregated that failure; all other groups succeeded.

The canonical model runner withheld0032 for its empty/down and populated-upgrade
checks but still ran downstream0035 first. The new GM20 adapter requires the
withheld `gm06_canonical` schema. This is a test integration regression introduced
when adding0035, not a separate aggregate failure or a permission workaround.

The runner now applies only numeric versions before0032 as its prior baseline,
then exercises0032 itself. Its report hashes actual tested migrations separately
from deferred0033–0035. The unchanged isolated HTTP runner still applies **every**
current migration, including0035, in order. No SQL migration, runtime authority,
API, grant, workflow check or dependency approval was changed to obtain a pass.

## Actual local verification

Node24.22.1 / Python3.12.14 / macOS arm64 / pinned PostgreSQL17.11 and PostgREST16.4.
The source revision before this fix commit is recorded in checks.json; report
source hashes pin the working-tree runner. Original d224653 implementation evidence
and manifest remain historical and unchanged.

| Run | Actual |
| --- | --- |
| Before fix, canonical runner | Fail3F000,0 assertions; owned DB removed |
| After fix, same runner | Pass194; empty/down, populated upgrade, validation and rollback retained |
| Fresh latest-chain HTTP | Pass27, every current migration applied |
| Full backend:test pgTAP directory | Pass47 across3 unchanged files, in fresh owned DB |
| Baseline schema SQL runner | Pass67 SQL assertions |
| Python regression |646 tests OK,6 skipped |
| Repository, task indexes, diff | Pass |

Reproduce from repository root with existing dependencies:

```sh
python scripts/gm06_canonical_check.py --report /tmp/gm06-canonical-results.json
python scripts/gm06_isolated_http_check.py --report /tmp/gm06-isolated-http-results.json
python scripts/gm06_schema_check.py --report /tmp/gm06-schema-results.json
python -m unittest discover -s tests -p 'test_*.py'
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

The local TAP run used the isolated runner's `exercise(db,rpc,check,users)` hook
and `db.psql` for each unchanged `supabase/tests/database/*.test.sql`; it required
one complete TAP plan, no `not ok`/bailout, and exactly the planned assertions.
Its baseline27 compatibility assertions also passed. CI separately executes its
normal `npm run backend:test` against CI's disposable Supabase project.

The local application DB was read only for auth DDL/introspection, never migrated
or reset. Owned temporary databases/containers/networks were cleaned. Synthetic
fixtures only; no JWT/private runtime credentials are included. Bruno desktop,
Android, human approval and production deployment are not claimed. GM19 dependency
and Trí's authority review remain required; this repair does not mark tasks Done.
