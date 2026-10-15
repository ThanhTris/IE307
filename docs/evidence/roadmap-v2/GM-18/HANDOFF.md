# GM-18 — API catalogue/coverage/eligibility handoff

2026-10-13. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), Pending.
Branch `codex/gm-18-catalogue-eligibility` → main; no parent PR; existing PR #108.
Rebased HEAD `19aacc4186c78471893b4c052f67872f67ffb678` + working-tree patch,
base/fetched main `4a38588f515c6121a38c605bf50e209d570b90bd` (GM-17 PR111).
Start/merge gates Pass; merge checker READY_FOR_MERGE_REVIEW. This is a request
for revision review, not approval/Done. Agent did not commit/push/merge.

## Inputs received on target and branch

| Task | Artifact/version | Real target merge | Checked |
| --- | --- | --- | --- |
| GM-06 | 0001/schema0.1.0 + later forward0002/0003 | PR102, 7060b8825ad72ee9442d8890719f82451d473c33 | Typed actual load/SQL parity |
| GM-07 | client/contracts/guards GM-07.1; unchanged | PR104 07117821 + PR105 9f71bba6 | Actual transport/DTO/error mapping |
| GM-08 | actual0.4.1/hash/counts/importer; verified manifest0, ADR014 accepted test scope | PR103 3076c3deb2937223a007b82211a61a2d61b63c84; ADR014 on main4bb928e | Actual DB load/query/readback + HTTP empty reasons |
| GM-17 | frozen0004/access/retention GM-17.1/schema0.2.0 | PR111 4a38588f515c6121a38c605bf50e209d570b90bd | 93 regression assertions + real HTTP member/errors |

## Outputs and results

- [API migration0005](../../../../supabase/migrations/0005_gm18_discovery_rpc.sql):
  discovery/preview/result endpoints, authenticated-only, policy10km/7days,
  bounded private read limiter and explicit projection. Calls frozen0018 only at
  runtime after all migrations. No prefix0019 conflict with GM-19.
- [Kernel0018](../../../../supabase/migrations/0018_food_eligibility.sql) and
  [TS kernel](../../../../mobile/src/domain/eligibility/index.ts): unchanged;
  complete parity60cases. Private invoker, no direct app access.
- [Typed consumer](../../../../mobile/src/data/discovery/index.ts): compose with
  the existing GM-07/GM-16 client; reason/seed/offer refs and same-winner validation.
  No schema/DTO scaffold/auth replacement or production mock fallback.
- [API supplement](../../../architecture/GM18_DISCOVERY_API.md): exact fields,
  defaults/unknown/errors/projection/policy/grants and downstream requirements.
- [HTTP examples](../../../../supabase/tests/http/GM-18.http),
  [HTTP runner](../../../../scripts/gm18_http_check.mjs),
  [SQL runner](../../../../scripts/gm18_eligibility_check.py),
  [rollback](../../../../supabase/rollback/0005_gm18_discovery_rpc.down.sql).
- [CHECKS](CHECKS.md): SQL147/60, HTTP31, domain237, mobile382, Python550, GM17/93
  Pass; current results/hashes in integration/. Historical root logs remain.

## Clone-clean commands and expected output

Node>=24, Python>=3.11, Docker local. Use bundled Python when macOS system Python
lacks CA certificates or repository test dependencies. Do not disable TLS.

```sh
npm ci
npm ci --prefix mobile --no-audit --no-fund
npm run backend:start
node --test mobile/tests/eligibility.test.mjs mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
python3 scripts/gm18_eligibility_check.py --report /tmp/gm18-sql-results.json
GM18_PYTHON=python3 node scripts/gm18_http_check.mjs
npm run check --prefix mobile
python3 -m unittest discover -s tests -p "test_*.py"
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-18 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

SQL returns Pass147/60; HTTP returns Pass31 + container/DB/guest cleanup; mobile382
and Python550 tests. HTTP runner creates owned test DB/PostgREST on ephemeral
loopback port, uses real GoTrue identities and real GM-07 transport/guards/GM-18
adapter. Actual GM08 input is loaded first, then separately new synthetic rows
simulate published predicates. Auth.users DDL/UID copied, no real credentials/data
copied; namespace metadata/sentinel checked before mutation/cleanup. Tokens remain
in memory, artifacts contain no keys/JWTs/raw ballots/private GPS. Source bytes
must remain unchanged during tests. No remote deploy, no shared DB reset.

For a clean local project startup applies all migrations. Existing projects with
older migration history: inspect pending versions; apply pending migrations via
pinned Supabase CLI `migration up --local --include-all` without reset. Never
rewrite merged migrations. Final local development definitions/grants/policy were
compared with fresh0005; see integration/local-deployment.json. Only this turn's
own uncommitted local function drafts were refreshed after fixes.

## Semantics and consumers

Unknown/stale/schedules/service mode/coverage exclude eligibility; no radius
expansion or substitute region. Preview uses one offering's profile/price, <=8
unique dish/variant, soft ranking only after eligibility. Numeric budget is
VND/person; menu_item_unspecified is not silently normalized. Scheduled stock is
not confirmed. No artwork without rights/fresh source. Preview choice IDs are
not persisted round UUIDs; GM-19 assigns immutable UUID snapshots.

Result reads auth.uid/member/server expiry and persisted room/result winner.
Refetch returns eligible venues for that same dish/variant before100-card cap,
retains winner roundDishId/choiceId, [] if no longer available. Room/result/version
and winner never change. No-consensus/past target returns []. Kernel diagnostics,
source locators/private preferences/history are not public. Coverage adminAreaId
unknown is explicit missing linkage, not administrative identity.

- GM-19/20: receive kernel/public preview/version/offer refs and persisted winner
  read. Start-round still revalidates snapshot/context/ready and locks according
  to GM-17; do not reuse preview keys as stored UUIDs. Get recent/temperature/flavor
  trusted inputs from authorized producers; never bypass consent/publish guards.
- GM-24/25/27: receive discovery/preview/result fixtures, errors and exact HTTP
  suite. Compose existing authenticated client with createDiscoveryApi. Android
  cases: manual/public anchor, no coverage, radius, target/timezone, empty/unknown,
  8-limit, nullable price, scheduled stock, stale/auth/error, same-winner refresh.
  Record build/device/revision, app→request/status→UI/server assertions.
- GM-21: private recent-history ranking port remains domain input until the
  consent-aware history producer exists; not a reason to return histories here.

## Android connection and cleanup

Matrix: docs/testing/MOBILE_API_TEST_MATRIX.md. Desktop loopback is not automatically
phone loopback. For connected Android, `adb reverse tcp:54321 tcp:54321`, configure
API origin http://127.0.0.1:54321 and runtime public key (not service_role); cleanup
`adb reverse --remove tcp:54321`. Validate actual path from the consumer app.
Alternatively use separately reviewed HTTPS with trusted certificates. No LAN
HTTP/TLS bypass/public tunnel. HTTP test's ephemeral gateway is an isolated server
check, not a persisted phone endpoint. No Android screen/native Pass claimed here.

Rollback0005: stop consumers; administrator applies supplied down SQL. No CASCADE,
no food/core deletion, preserves0018/GM17; unexpected SQL dependencies block. Test
rollback ran in disposable DB. Production verified publish is separate and not
performed. Actual GM08 remains draft/null/unknown, manifest0/null per ADR014.

Pending: Trí review current revision and remote CI after push; Android consumers
verify their own integration tasks. No outstanding implementation dependency gate
at checked revision; do not infer approval/Done from successful tests.
Historical HANDOFF-2026-10-12.md records independent-stage limits, superseded here.
