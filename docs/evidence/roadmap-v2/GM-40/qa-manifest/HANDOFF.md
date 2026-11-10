# GM40.3 — Manifest-driven Data QA

Owner Vinh; reviewer Trí. Supplement requested by issue125/comment6647238694 on
2026-11-05. Branch `codex/gm-40-qa-manifest` is based on main
`bc5a0629c0d1050ef3256ec9fa73bd669019fb84`. Trí reviews the supplement and records acceptance on the Project.
See [plan](PLAN.md), [checks](CHECKS.md) and [manifest](MANIFEST.json).

## Change and received contracts

The previous importer runner depended on a personal application stack's container
names/auth DDL and signed synthetic JWTs. Both GM40 entrypoints now require
`--qa-manifest PATH`, pointing to a fresh GM03 `gm03-qa-manifest-v1` run in this
checkout. They share `scripts/gm40_manifest_check.py`; no default stack fallback.
Provision/verify/worker/stop stay with `scripts/backend-qa.mjs`.

The received GM18.2 importer/projection/API and source dataset1.1.0 remain pinned:
39 real draft/test-demo dishes; source SHA
`776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`.
No migration, schema/RPC/DTO, decision policy, production flag or source edits.
The sole importer change admits the concrete received `ManifestQAContainerDB`
with exact namespace/project/container and private GM03 owner marker, then runs
existing runtime verification. Arbitrary postgres connections/boolean flags are
still rejected. Legacy process-owned adapters keep their existing guards.

The producer's seal now includes the GM40 consumer, received rich importer/schema
and generated rich artifacts. A manifest made before these source changes must
be replaced by a newly provisioned run; do not edit/reseal it to bless drift.

## Run from a fresh checkout

Use Node24, root `npm ci`, Python3.12 with existing
`scripts/ci-requirements.txt` (jsonschema4.26.0). No application dependency change.
Docker must run Linux containers and publish QA ports only on loopback; see the
received [GM03 runbook](../../GM-03/RUNBOOK_QA.md). Choose unused explicit ports,
never stop a different project to free them. This example uses a new unique run ID:

```sh
python data-preparation/scripts/catalogue_projection.py build --check
PYTHON=python npm run qa:start -- --run-id gm40-review-01 --api-port 54371 --db-port 54372
npm run qa:verify -- --run-id gm40-review-01
python scripts/gm40_catalogue_check.py --qa-manifest .work/qa/gm40-review-01/manifest.json --report .work/gm40-review-01-results.json
npm run qa:verify -- --run-id gm40-review-01
npm run qa:stop -- --run-id gm40-review-01
python scripts/task_readiness.py --task GM-40 --gate merge --base-ref origin/main --verify-outputs
```

On PowerShell use `$env:PYTHON='python'` before the start command instead of the
POSIX environment assignment. `gm40_rich_projection_check.py` accepts the identical
arguments and executes the same consumer. `GM40_NODE` selects an explicit Node
executable when it is not on PATH. Report must be outside producer `.work/qa/`
and must not overwrite repository source. Requests use the manifest's gateway
origin, anon key and three fresh real GoTrue signup sessions. Credentials stay
in memory/private ignored QA files; reports omit tokens and raw ballots.

CI's GM40 importer job follows the same explicit GM03 manifest flow and stops
only its marked project in `always()`. Hosted CI results appear on the pull request. The former standalone 47-case JWT/legacy harness is historical; the
new suite reuses the rich import/locked-B assertions with real GoTrue instead of
pretending those old 125 assertions were rerun unchanged. Broader legacy/domain/
canonical API acceptance stays with the respective maintained producers/GM32.

## Verification and lifecycle

Before import: validate manifest path/seal/local state, local Docker, current
source/config/migration hashes, actual ledger, function body/ACL/search_path,
catalogue inventory, network/container/DB marker, worker PID/nonce/heartbeat,
Auth/REST/gateway ownership and effective loopback bindings. Drift fails closed.
The public rich RPC contract is `dish-catalogue/roadmap-v2/GM-18.2`; the producer
manifest's B/0.9.2 label is its pinned worker compatibility baseline, not a claim
that later installed migrations are absent. Full ledger/inventory are verified.

An exclusive consumer lock rejects concurrent runs on the same manifest. Validate
and stage the exact source; execute actual baseline/rich import, typed readback,
no-op reimport, changed-same-version conflict, injected rollback, explicit
activation/restore and all four meal filters' 10/20 shortage assertions. The
runner executes the three declared cases in `supabase/tests/http/GM-40.http`
with the real guest token. It checks that a persisted v3 winner and its
catalogue pin survive reimport and restore. A v4 room retains its two locked
R2 survivors across activation. No new
voting/time rules are implemented. New test releases are deleted only by exact
id/hash/cards/test-only predicates, never if public room snapshots reference them.
The entire original catalogue inventory must match afterward, followed by the
producer's unchanged manifest verification and live worker check.

Consumer leaves the supplied QA infrastructure/users/rooms available for review;
it does not stop/reset the project it received. It only removes its matching
owner-UUID lock. `qa:stop` performs resource cleanup by the producer's project,
network/volume labels and owner markers. If a suite fails after mutation, retain
the Fail report, stop that run and provision a fresh one. Do not reseal, delete
foreign resources or claim restored/cleaned when verification failed. Interrupted
runs may retain a consumer lock; stop the owned QA project rather than bypassing it.

## Coverage and remaining limits

Data remains 39 dishes, breakfast14/lunch23/dinner7/snack1;9 unlabelled meals.
Shortage is genuine for breakfast20, dinner10/20 and snack10/20. No fillers,
production quota, new labels/images or price conversion. The synthetic20-card
producer fixture is separately identified by release/hash/fixtureOnly; it is not
counted toward real catalogue coverage. Complete coverage is in the unchanged
`supabase/seed/catalogue/gm18.2/coverage.json` and emitted in the runtime report.

The 2026-11-09 run used a fresh checkout of main bc5a062 with the candidate
patch applied and the pinned npm dependencies installed from the lockfile.
Docker Desktop 4.55.0 initially reported wildcard bindings. A temporary private
Docker socket forwarded the Supabase CLI calls and set explicit HostIp
127.0.0.1 for this run's Kong and DB publish requests. Direct Docker inspection
confirmed both actual bindings before the suite. The normal GM03 ownership,
manifest and binding checks ran against the resulting stack.

The sealed run produced a real GoTrue/SQL/REST result. See [checks](CHECKS.md)
and [runtime evidence](runtime-1109.json) for the report, hashes and cleanup.
