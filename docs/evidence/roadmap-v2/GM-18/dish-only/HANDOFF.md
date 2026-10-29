# GM18.2 dish catalogue/preview handoff

Current follow-up for [PR139](https://github.com/ThanhTris/IE307/pull/139):
[CI correction and rerun evidence](ci-fix-2026-10-29/CHECKS.md). Exact-version ECR/GHCR
cache resolution and0033-before0005 rollback are corrected; API/schema/source data
are unchanged. The initial pre-publication handoff below is retained as a snapshot.

Owner Tâm, reviewer Trí Pending. Requested2026-10-29. Worktree gm18-dish-catalogue,
branch codex/gm-18-dish-catalogue, base/fetched main40feb9bf66f4bad67074601d8d49ffe587bfef93.
GM21 work in the original checkout is preserved. No new commit/push/PR, Project
status change, production activation or app DB migration/reset. Existing legacy
GM18 acceptance is retained; this supplement requires review at its new revision.

## Received inputs and output

GM06/0032/schema0.10.0 helpers; GM07/PR138 B card/error types and separate B-supplement
proposal; GM08 accepted real test-data scope/ADR014; GM17 authenticated/ACL boundary.
All start dependencies Done on live Project. New forward0033/schema0.11.0 delivers
get_dish_catalogue/preview_dish_pool under an explicit GM18.2 read contract, not a
new dish_session version or implicit activation of the GM07.B-supplement producer.

[API specification](../../../../architecture/GM18_DISH_CATALOGUE_API.md),
[JSON Schema](../../../../architecture/schemas/gm18-dish-catalogue.schema.json),
[checks](CHECKS.md) and manifest pin contract/source/actual assertions. 257 SQL/HTTP assertions,237 domain tests and638 Python tests (5 skips) passed. The rich
opt-in importer reuses existing validated GM40 source and the same catalogue table.
Default importer/release ID unchanged; new :gm18.2 suffix freezes new projection
bytes without rewriting old releases. No GM40 dataset/schema/verified flags changed.

## Reproduce and expected behavior

```sh
python3 supabase/seed/import_gm18_catalogue.py validate
python3 scripts/build_gm18_contract.py
python3 -m unittest discover -s tests -p 'test_gm18_catalogue_projection.py' -v
python3 scripts/gm18_dish_check.py --report /tmp/gm18-dish-results.json
node --test mobile/tests/eligibility.test.mjs mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-18 --gate merge --base-ref origin/main
git diff --check
```

Python jsonschema uses the existing scripts/ci-requirements.txt pin; no new package
or lockfile. Docker must have the pinned PG17/PostgREST images locally; no pull by
the isolated runner. It provisions tmpfs PostgreSQL/auth fixtures, applies every
migration and tests actual HTTP inside a new internal network with fresh random
QA credentials and no host port. Existing application/container credentials/data
are not used. All owned resources are removed; synthetic identity/JWT differs from
GoTrue signup and Android evidence. Real catalogue draft data is loaded separately
from synthetic cases and its source bytes/hashes remain unchanged.

## Consumers and limits

- GM19/20 receive exact count/shortage/card/taxonomy/price semantics. v4 already
  consumes rich cards if that QA release is explicitly activated. Its existing
  selection, locked IDs, writer/result/history/outbox and v2/v3 behavior are not
  rewritten. Known GM19 settings/no-op pool issues remain that task's scope.
- GM24/25/27 receive the new RPC request suite in supabase/tests/http/GM-18.http,
  schema and safe errors. Preview rows are not stored room/round IDs or a reservation
  of the later seeded selection. New version is explicit; legacy client types must
  not parse it as an offering response. No mobile code changes in this delivery.
- GM40 can review/adopt the opt-in projection path. Source contains39 draft IDs,
  breakfast14/lunch23/dinner7/snack1; shortages remain honest. No production/freshness/
  source-rights approval inferred from menu observations or test success.
- GM21 remains responsible for new canonical history integration. This task returns
  no histories/rosters and applies no recent penalty from unauthorized data.

PriceObservation keeps nullable metadata and observedAt; baseline B priceReference
uses checkedAt and non-null display metadata, so it stays null if unrepresentable.
Timestamp ties/latest null never fall back. No serving-unit conversion. Account
preferences and room copies are existing v4 storage; ranking remains explicitly
UNSUPPORTED/advanced, not silently implemented with an unreviewed formula.

QA down0033 drops only new functions/ledger; it does not remove catalogue or existing
results/history. When also rolling back legacy0005 in a disposable DB, apply0033
down before0005 down; reapply0005 before0033. The legacy no-CASCADE guard remains.
Deployment into a retained DB requires reviewed ledger/definitions,
backup/restore and release activation. The runner does not migrate/reset/reconcile
an app DB. Trí reviews schema/API/storage delta; gate Pass is not approval/Done.

Android cases per MOBILE_API_TEST_MATRIX remain consumer-stage Not run: configure
an owner-reviewed reachable HTTPS endpoint/public key/guest auth, compare request/
status/schema/available/requested to UI, check login/identity/cache/error behavior.
The isolated network has no phone endpoint and no TLS/host-publication bypass.
