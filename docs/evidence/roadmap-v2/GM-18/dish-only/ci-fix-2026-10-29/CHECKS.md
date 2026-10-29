# PR139 CI correction — 2026-10-29

Owner Tâm; reviewer Trí Pending. Tested revision: published991b7a3 plus the
working-tree source hashes in `sql-http-results.json` and `legacy-sql-summary.json`.
Target origin/main40feb9b. This supplements the initial257-assertion report; that
historical report is retained. No API/contract/schema/dataset version changes.

## Failure and correction

CI run [40812141626](https://github.com/ThanhTris/IE307/actions/runs/40812141626)
on PR139/head991b7a3 failed two jobs and the required aggregate. There were no
review comments at inspection time.

- GM06 isolated HTTP stopped with `OWNED_QA_COMMAND_FAILED 125`, zero assertions.
  Its runner required ECR image tags, while CI's Supabase startup cached GHCR
  tags (the successful schema report records GHCR PostgreSQL17.11.0.004).
  The runner now preflights only the exact pinned ECR/GHCR mirrors for PostgreSQL
  17.11.0.004 and PostgRESTv16.4. Missing images fail with an explicit pull hint
  before allocating resources. It still uses `--pull never`; no image upgrade,
  service-container environment, credential or network configuration is read.
- Legacy GM18 parity reached its0005 rollback and failed `DB_ERROR 2BP01`.
  Migration0033 adds helpers inside the0005-owned schema. The legacy runner now
  unwinds0033 before0005 and asserts that0033 down preserves the callable legacy
  API. Both migrations and the0005 no-CASCADE rollback remain byte-identical.

## Actual verification

| Check | Actual result | Evidence / limits |
| --- | --- | --- |
| GM18 rich catalogue/preview SQL and JWT HTTP |263 assertions Pass, including27 inherited v2/v4 compatibility assertions and6 new ordered-rollback checks | `sql-http-results.json`; fresh PostgreSQL17.11/PostgREST, internal network, new random QA credentials, no host ports |
| Parent rollback protection |0005 down while0033 exists rejects2BP01 and leaves both APIs intact | Actual PostgreSQL rejection, not a mock |
| Reverse rollback/reapply |0033 down →0005 down succeeds; v4 result persists;0005 →0033 restores all5 authenticated RPCs | Actual SQL + HTTP, included above |
| Original legacy SQL CLI entrypoint |148 checks/60 full TS–SQL vectors Pass, actual GM08 draft read/query/cleanup preserved | `legacy-sql-summary.json`; same patched entrypoint, own fresh QA container/auth DDL, synthetic auth instead of GoTrue |
| Wrapper compatibility and cleanup for legacy run |27 baseline +3 nested-run assertions Pass | `legacy-harness-results.json`; own DB/container/network removed |
| ECR/GHCR cache resolution, absent images, daemon failure |4 unit tests Pass; same-version fallback only, no resources allocated on cache miss, private daemon output omitted | `tests/test_gm06_isolated_images.py`; GHCR fallback simulated at subprocess boundary; real hosted CI still required |
| Full Python regression |642 tests OK,5 existing skips | `python-regression.txt`; expected notebook-error fixture output is not a unittest failure |
| Repository / generated indexes / whitespace |Pass | `validate_repository.py`, `task_readiness.py --check-docs`, `git diff --check` |
| Main migrations and rollback0005 |Unchanged from origin/main | No migration rewrite or CASCADE bypass |
| Hosted CI on correction revision |Pending until the correction is pushed and CI completes | Local tests do not imply hosted CI Pass |

Local reproduction of the isolated suite:

```sh
python3 -m unittest discover -s tests -p 'test_gm06_isolated_images.py' -v
python3 scripts/gm18_dish_check.py --report /tmp/gm18-dish-results.json
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
git diff --check
```

The full legacy CLI test used a temporary adapter pointing its guarded local
container name at the harness's newly allocated namespace-owned PostgreSQL. A
Unix-socket symlink was created only inside that disposable container; the runner
itself and its database guard were not weakened. The adapter source/hash is saved
in `legacy-owned-driver.py`; its nested report is summarized to avoid duplicating
large fixture/menu payloads. Existing app DBs, credentials and unrelated containers
were not used or modified. Hosted CI exercises the original local-Supabase path.

No mobile/Android, GoTrue signup, production deployment or verified-data publication
is claimed by these local checks. Final review and Project Done remain Trí's work.
