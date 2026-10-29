# PR143 — decimal integer create correction

Review: [comment6500474678](https://github.com/ThanhTris/IE307/pull/143#issuecomment-6500474678).
Main fdee7fa; tested working-tree patch over588781c. Owner Vinh, reviewer Trí.
GM20.4/schema0.12.0 and the existing B-supplement contract are unchanged.

After unchanged number/integrality/range checks, create now converts via
`numeric::integer`. The earlier direct text→integer cast rejected10.0/20.0.
Only the still-unmerged0035 is edited; merged migrations and schema are unchanged.

## Actual raw HTTP cases

| dishCount JSON literal | Expected and actual |
| --- | --- |
|10 /10.0 | HTTP200; snapshot settings10 and pool exactly10 |
|20 /20.0 | HTTP200; snapshot settings20 and pool exactly20 |
|10.5 /9 /21 | HTTP400 INVALID_INPUT |
|"10" /null /true | HTTP400 INVALID_INPUT |
|20.0 with9 eligible fixture cards | HTTP409 INSUFFICIENT_DISHES, available9/requested20 |

All requests have fresh IDs. `input.rawRequest` in the HTTP reports is the exact
body passed to fetch (no auth headers). The serializer substitutes the controlled
literal and checks semantic equality. The schema runner receives these raw JSON
fragments directly: it sees10.0/20.0, rather than a normalized JS object. Invalid
fixtures remain marked requestValid=false; their error responses are validated.
The JSON Schema2020-12 files and validator were not relaxed or changed.

The shortage catalogue is a separate nine-card synthetic derivative with its own
content checksum. Its test-only insert is repeatable. Activation is restored to
the synthetic20-card release before the remaining cases; real39-card data is intact.

## Actual runs

- Fresh owned GoTrue/PostgREST/worker QA:125 assertions /705 schema envelopes Pass.
- Same populated namespace, no reset:125 assertions /703 envelopes Pass.
-102 independent SQL vectors Pass on both runs. Fresh rows exactly match the
  original detailed `../sql-parity-results.json` matrix; compact fresh-sql.json
  pins the new migration hash and references those unchanged input/expected/actual
  rows instead of duplicating them. The ignored runtime/CI artifact has full rows.
- Maintained baseline B also passes; fresh-baseline-http.json is a compact rerun
  summary with its full runtime report checksum, not a rewritten historical report.
- GM06 latest-chain isolated HTTP27 and canonical upgrade/down194 Pass.
- Python646 tests OK,6 skipped; repository, task indexes and diff checks Pass.

Node24.22.1, Python3.12.14/macOS arm64; pinned PostgreSQL17.11/PostgREST16.4/CLI2.120.0.
Only existing dependencies used. Poll/race-dependent envelope totals can vary.

```sh
# Existing lock/dependencies; run from repository root.
GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1 python scripts/gm20_canonical_check.py --keep
GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1 python scripts/gm20_canonical_check.py --against --keep
python scripts/gm20_canonical_check.py --cleanup
python scripts/gm06_isolated_http_check.py --report /tmp/gm06-latest-http.json
python scripts/gm06_canonical_check.py --report /tmp/gm06-upgrade.json
python -m unittest discover -s tests -p 'test_*.py'
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

No application DB migration/reset, production activation, API/schema scope change,
package/lock change, UI/device or Bruno desktop acceptance. Owned QA cleanup passed;
application containers remain running. Old candidate QA definitions must be recreated
through the owned cleanup/setup flow; Git pull does not update a running database.

Previous reports retain their original source hashes. previous-manifest.json is
historical metadata for source588781c, not a current-tree checksum assertion.
The parent MANIFEST pins the corrected source, docs and these review reports.
Live Project start/merge gates pass; Trí's PR/ADR review is pending. No automatic
Project status/approval change, merge or production deployment is claimed.
