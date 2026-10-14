# GM-21 — Independent history/consent handoff

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), review Pending,2026-10-14.
Branch codex/gm-21-history-consent → main; not stacked. Base/tested HEAD
**a33d5e85f1aeb7c7bda02310e02880a3af5e77da + working-tree patch**.
GM21.1 / GM07.1 / GM18.1 / food1.1.0 / schema0.2.0 +0021 supplement.
Start gate READY_TO_CLAIM; merge BLOCKED GM20 Todo. No commit/push/Project edits.

## Inputs and output

| Input | Version/artifact on main and branch | Smoke |
| --- | --- | --- |
| GM06 PR1027060b882 + forward0004 | schema0.2.0, frozen0001..0005; dictionary/core/food1.1.0 | Real typed fixtures/constraints |
| GM07 PR10407117821 / PR1059f71bba6 | unchanged contracts/client/responseGuards GM07.1 | Actual client HTTP21; mobile382 |
| GM18 PR108a33d5e8 | frozen0018 eligibility/private input.recentDishIds +10km/7days boundary | Existing domain237, new canonical recent ports |
| GM17 PR1114a38588, ADR015 | auth.uid/require_room/retention/reference lock |93 frozen SQL assertions Pass |
| GM20 |0020_finalize.sql not delivered/Done | Not run, merge blocker; do not recreate producer |

- supabase/migrations/0021_history.sql: public get_history/update_history_consent/
  delete_history and private settings/projection/idempotent producer/recent ports.
  Existing public histories/consents/idempotency reused, no replacement schema.
- supabase/tests/history.sql, supabase/tests/http/GM-21.http: admin smoke and
  runnable request examples; actual runners scripts/gm21_history_check.py,
  gm21_http_check.mjs/gm21_http_fixture.py and new CI gm21-history.yml.
- docs/architecture/GM21_HISTORY_API.md: exact request/output/error/unknown/cursor,
  opaque IDs→UUID ACK storage, storage delta/retention/ports/lifecycle contract.
- CHECKS.md / integration/: SQL45, HTTP21, GM17/93, domain237, mobile382, Python550
  Pass; real upstream finalize/device/remote CI still Not run.

## Reproduce from clean clone

Node>=24, Python>=3.11/Docker local. Python used for full regression needs repository
runtime dependencies; bundled3.12.14 is available on the current machine. Do not
disable TLS if macOS system Python lacks CA certificates for live Project checks.

```sh
npm ci
npm ci --prefix mobile --no-audit --no-fund
npm run backend:start
python3 scripts/gm21_history_check.py --report /tmp/gm21-sql.json
GM21_PYTHON=python3 node scripts/gm21_http_check.mjs
python3 scripts/gm17_access_check.py --report /tmp/gm21-access.json
node --test mobile/tests/eligibility.test.mjs mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
npm run check --prefix mobile
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-21 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

Expected SQL Pass45, HTTP Pass21 + owned cleanup, GM17 Pass93. Merge checker is
expected to block until GM20 is Done/delivered and the branch receives0020.
Tests use process-created gm08_check_<namespace> DBs via unchanged local importer
guards, copy auth.users DDL/auth.uid only, load synthetic fixtures (no real publish).
SQL fake users exist only in scratch; HTTP guests are real GoTrue anonymous tokens,
namespace-verified before copying IDs/deleting them. Fresh PostgREST uses the actual
local verifier, ephemeral loopback port and real HTTP gateway for /rest/v1. No
shared DB reset, remote deploy, token logs or provider calls. Source bytes are
hashed before/after run; no test may mark a changed revision Pass.

0021 is not explicitly deployed to a pre-existing app DB by the test runners. Clean
startup applies pending migrations; existing projects can use the pinned Supabase
CLI migration up --local --include-all after review/backup, without reset. Future
lower-numbered0020 may be applied with include-all;0021 has no install-time0020 call.
Keep all merged migrations immutable. Operator runs the existing GM17 retention
worker continuously for physical TTL; local test cleanup does not prove production
scheduler/quota. Backend was stopped with backup after this turn's test run.

## Producer ports and pending integration

GM19/20 must read the API supplement before wiring these private functions:

1. GM19 locks reference_epoch before room; authenticated existing-member mutations
   use GM17 guard. Prepare explicit scoped consents from global settings and room
   historyConsent; no default permission. recent_dishes derives exact current
   roster/group server-side, all consent and<=3/30day results. No client group key.
2. GM19 feeds those IDs into existing GM18 input.recentDishIds with its trusted
   context.avoidRecent. Rank remains soft after eligibility; no NO/coverage/time
   override. Initial no-history behaves like baseline. Invalidation hooks reset
   evaluated/cached/ready lobby state and bump context/version; producer reads the
   final version, not a guessed old counter.
3. In the same actual start transaction, revalidate pool/context/roster/consent,
   reset ready if changed, call freeze_recent before transition. Frozen snapshots
   are not recomputed after start or changed by later history withdrawal.
4. GM20 persists actual winner/result once and calls record_result in the same
   finalize transaction. It derives canonical frozen roster and valid scoped
   consents, records personal/group with30day expiry. Current explicit opt-out
   suppresses even stale grants. Completion receipts prevent retry from restoring
   deleted summaries. Do not use fixture finalize as integration evidence.

Current tests exercise all private port logic using synthetic persisted results,
not the absent GM19/20 business endpoints. Their real request→start/finalize→history
integration remains required before merge/completion. No reverse dependency on UI.

## Storage/privacy and rollout

0021 corrects detached consent uniqueness so two retained meals for the same user
can survive operational cleanup without combining permission IDs. Room-scoped
uniqueness/named constraint remains, active global room-null rows stay unique by a
partial index. New global settings are private and do not reuse detached records.
See supplement for upsert rules. Existing GM06/GM17 files/DTOs are byte-identical.

HistoryItem requires authentic roomId/code/memberCount after room deletion. A
private minimal presentation is captured while parents exist and cascades with
history; no live-parent FK/GPS/anchor/mood/ballot kept. Legacy missing presentation
is503/UNKNOWN_ERROR, never a fabricated code or silently dropped valid summary.
Scope/caller/cursor use current auth, not cache or client metadata. History pages
<=50; local cache cap/identity isolation is GM31's responsibility.

To disable rollout, stop consumers and revoke execute on the three public RPCs.
Full down is not automatic: old null uniqueness cannot represent retained multiple
meals without loss. Preserve history/consent and use reviewed forward migration or
backup; never reset/drop summaries to roll back. Trí reviews this storage delta.

## Mobile handoff — GM25/28/31

Use unchanged authenticated GM07/GM16 client getHistory/updateHistoryConsent/
deleteHistory. Preserve request IDs across unknown-outcome retry, handle409/429,
refetch first page if cursor expires/deletes. Tests already prove real transport
and DTO guards, not Android UI. Device cases: opt-in/partial/group withdraw,
personal/group delete, auth switch/cache clear, TTL<=30days/cache<=50, pagination,
network/timeout/ACK retry, no exposing who withdrew, no raw location/ballot.

For connected Android: adb reverse tcp:54321 tcp:54321, runtime API origin
http://127.0.0.1:54321 and public key/actual session; cleanup
adb reverse --remove tcp:54321. Validate app→HTTP→UI/server state on real build/device.
Alternatively separately reviewed trusted HTTPS; no LAN HTTP/TLS bypass/tunnel.
The ephemeral test gateway is not a persistent phone endpoint. Record revision/
Android version/model/runtime/build and redacted evidence. Device Not run here.

Integration ownership: the remaining adaptation of delivered GM19/20 transactions
is GM21 work after their real outputs are available. The port signatures above
do not add a dependency/AC to GM19/20 or block their completion on this task.
GM21 will receive those producers, wire its own callbacks/adapters and rerun real
create/lobby/start/finalize assertions before final completion.
