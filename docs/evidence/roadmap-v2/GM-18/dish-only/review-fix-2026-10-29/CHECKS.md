# PR139 numeric-count review correction — 2026-10-29

Owner Tâm; reviewer Trí Pending. Addresses
[review6491172874](https://github.com/ThanhTris/IE307/pull/139#issuecomment-6491172874).
Tested source: published9e375cb plus exact working-tree hashes in the reports below;
target origin/main40feb9b. Contract GM18.2, schema0.11.0, dataset and source unchanged.

The first CI correction9e375cb passed all16 hosted checks in
[run40838552418](https://github.com/ThanhTris/IE307/actions/runs/40838552418).
Downloaded artifacts confirmed263 dish checks,148 legacy SQL checks and27 baseline
HTTP checks, with exact source hashes matching that revision; the runner used
GHCR PostgreSQL17.11.0.004 and PostgRESTv16.4. This proves the image/setup and
reverse-order rollback corrections; it does not cover the numeric bug found in
the review that arrived during that CI run.

## Review changes and actual verification

JSON Schema integers include numeric values represented as10.0/20.0. PostgreSQL
rejects a direct text-to-integer cast of those strings. Migration0033 now casts
the already range/integrality-checked numeric value to integer. The fractional
check remains before casting, so10.5 cannot be rounded into an accepted request.
Only the new, unmerged0033 SQL is edited; all main migrations and rollback0005
remain unchanged. No contract/schema relaxation or new migration version.

| Check | Actual result | Evidence / limits |
| --- | --- | --- |
| Red reproduction before SQL correction |Request10.0 passes request schema, but HTTP response fails the published envelope schema; run stops after222 successful assertions | `decimal-red.json`; actual PostgreSQL/PostgREST on9e375cb + expanded regression only |
| Exact-count and schema regression after correction |286 SQL/HTTP assertions Pass, including27 baseline checks; request schema accepts10..20,10.0,20.0; response schema/count/requested/unique agree | `sql-http-results.json`; no rounding or widened range |
| Invalid numeric/type requests |10.5,9,21,true,null,string,object,huge number fail request schema and return400 with contract-valid `ok:false`/INVALID_INPUT envelope | Same real HTTP suite; response schema checked on every `read` |
| Rollback review item |0033 down precedes0005 in legacy runner; unsupported order rejects2BP01, correct order preserves v4 result and restores authenticated API on reapply | Actual SQL + HTTP checks retained in the286 assertions; no CASCADE |
| Legacy parity, actual draft query and rollback |148 checks/60 TS–SQL vectors Pass on current0033 | `legacy-sql-summary.json`, `legacy-harness-results.json`; new owned QA container, synthetic auth DDL |
| Projection/schema unit and full Python regression |642 tests OK,5 existing skips; the existing schema test now covers10/10.0/20/20.0 | `python-regression.txt`; no new unit mirrors of SQL casting |
| Repository/index/diff |Pass | Required offline checks; do not confer runtime approval |
| Hosted CI at this correction revision |Pending at capture time; must be checked after push | The earlier green CI does not approve this new SQL revision |

Reproduce with `python3 scripts/gm18_dish_check.py --report /tmp/gm18-dish.json`;
run the repository/Python/index/diff commands listed in the parent CHECKS/HANDOFF.
The legacy rerun uses the same portable owned-QA adapter as the
[CI correction](../ci-fix-2026-10-29/CHECKS.md); its current report pins the updated
migration hash. Red and green reports both confirm cleanup of their own resources.
No existing app DB, credential or unrelated container was used or modified.

Source/price/privacy/legacy policy remain unchanged. Android/FE, GoTrue login,
production migration/publish and final Trí review are not claimed by local QA.
No Project status, approval or external review comment was written by this fix.
