# GM-21 — History/consent integration handoff

2026-10-15. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), review Pending.
Branch `codex/gm-21-history-consent` → main / PR113. Rebased onto target
`991de6620715d1219da900499f4aa2d683b01bb4` (GM20 PR115 + Expo fix PR116).
Tested rebased HEAD06d1d5b plus working-tree patch; exact hashes in PATCH_MANIFEST.json.
Contract GM21.2 / GM07.1 / GM20.3 / food-core1.1.0 / schema0.6.0.
Live merge gate READY_FOR_MERGE_REVIEW; no self approval/Done/commit/push/merge.

## Inputs received

| Producer | Actual target artifact | Verification |
| --- | --- | --- |
| GM06 PR102 / GM17 PR111 | frozen0001..0005, schema0.2.0, ADR015 retention/locks | Typed SQL, original93 RLS assertions on owned DB |
| GM07 PR104/105 | unchanged client/contracts/guards GM07.1 | Real client over HTTP/JWT; unit/typecheck |
| GM18 PR108/a33d5e8 |0018 eligibility, recentDishIds soft rank,10km/7days |237 domain tests; actual lobby kernel parity |
| GM19 PR112/5b148de |0019 lifecycle/schema0.3.0, private pool port/pinned cards | Actual create/join/prefs/ready/start/leave |
| GM20 PR115/ad8478d |0023/schema0.5.0/GM20.3, submit/finalize atomic writer | Actual ballots/result/history; frozen22 regression scenarios |
| PR116/991de66 | Expo versions/lockfile from main | Install pinned dependencies and mobile checks |

## Output and current behavior

-0021 provides authenticated get_history/update_history_consent/delete_history,
private settings/presentations/receipts/recent ports.0024 is the new forward
integration, without editing upstream migrations or GM07 DTOs/packages.
- GM19's private pool wrapper derives <=3 valid group histories for the exact
canonical roster, prepares explicit scoped consent only in LOBBY, and passes IDs
to the existing GM18 ranking. Create has no complete roster, so starts with no
recents. Missing catalogue metadata preserves the existing FK-backed room version
and an empty pool; no fabricated venue/availability.
- Consent/roster changes invalidate materialized lobby/ready/context/version;
global consent/delete also refresh eligible pool. Start atomically freezes recent
IDs/roster/contextVersion. Later withdrawal cannot mutate locked pool or winner.
- Existing GM20 finalize calls its own writer, extended in0024: pinned winner name,
TTL=min(30days, relevant consent expiry), scoped frozen consent/global opt-out,
exclude detached grants, atomic completion receipt. No deleted history resurrection.
The old private0021 record_result is retained for historical synthetic-port tests;
production does not call it. No decision-engine replacement or new public endpoint.
- history projections retain authentic roomId/code/memberCount after operational
cleanup, omit GPS/anchor/mood/raw roster/consent/votes, cap50 rows/page.

## Reproduce

Use supported Node24+, Python3.11+, Docker and the pinned repository lockfiles.
Live gate on this Mac uses the bundled Python with CA certificates; never disable TLS.

```sh
npm ci
npm ci --prefix mobile --no-audit --no-fund
npm run backend:start
python3 scripts/gm21_history_check.py --report /tmp/gm21-sql.json
GM21_PYTHON=python3 node scripts/gm21_http_check.mjs
GM21_PYTHON=python3 node scripts/gm21_lifecycle_check.mjs
GM20_PYTHON=python3 node scripts/gm21_upstream_regression.mjs gm20
python3 scripts/gm21_access_regression.py --report /tmp/gm21-access.json
npm run check --prefix mobile
node --test mobile/tests/eligibility.test.mjs mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-21 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

Expected SQL45, history HTTP21, actual lifecycle10 scenario groups; original GM20
22 scenarios plus its SQL/parity vectors; GM17 original93 assertions; all cleanup
owned DB/REST/guests. HTTP suites use real GoTrue anonymous JWTs and actual verifier,
loopback PostgREST/gateway with the actual unchanged GM07 client. Food is synthetic
positive data; the real GM08 bundle is imported by upstream setup but never promoted.
No actual users, real ballots, secrets, GPS or verified publication in evidence.

GM20 regression adapter keeps the complete tests() business assertions unchanged;
its setup first sets every member's preferences, then confirms everyone's ready.
This respects GM21 invalidating ready on consent edits. Adapter hash/scenario hash
and adaptations are recorded. No upstream assertion is weakened or skipped.

GM17 original runner separately detected app deployment drift: missing GM22 profile
column grants. The GM21 adapter redirects only its deployment-comparison metadata
read to the owned fresh DB, then executes unchanged RLS/retention assertions. Its
report explicitly does NOT claim app deployment parity. No reset/reconciliation or
migration apply was performed on the app database. CHECKS records that limitation.

## Deployment / rollback

Git pull and healthy GoTrue do not prove deployed RPC/schema parity. Runners apply
all exact migrations only to owned disposable DBs. Inspect the app migration ledger,
function definitions and grants; review a backup/reconciliation plan for stale draft
objects before deploying0019/0021/0022/0023/0024. Do not reset or edit merged files.
Stop/revoke consumer execution before rollback; preserve retained summaries and
consent IDs. Reverting null-consent uniqueness cannot represent multiple detached
meals, so full down requires a reviewed forward migration/backup, not data deletion.
Existing GM17 worker must run continuously in deployed environments; tests invoke
cleanup but do not prove an installed production scheduler.

## Consumers and remaining review

GM25/28/31 receive consent/ready/locked-recents/history/delete/pagination/auth-isolated
cache cases. `supabase/tests/http/GM-21.http` supplies routes/request/error examples;
`GM21_HISTORY_API.md` defines exact nullable/error/storage semantics. Native Android
app→API→UI/build/cache isolation remains consumer-stage Not run; server HTTP does
not claim device success or create a reverse dependency on those tasks.

For a phone, configure the unchanged GM07 real client with a reachable reviewed
HTTPS endpoint and public key/guest session; laptop localhost is not a phone endpoint.
A local Android harness may use the documented adb reverse54321 setup, but the
owned ephemeral runner endpoints disappear after cleanup. Never embed tokens in
source or use service_role on the phone. Consumer verifies request/status/server
state and UI/refetch behavior with build/device/revision evidence.

Trí must review this PR revision, storage delta, both gates and execution evidence.
Remote CI for the updated unpublished patch and app deployment remain unverified.
Historical `integration/` outputs describe the old independent phase; current
results are under `gm20-integration/`. This is review readiness, not permission to merge.

## v4 account-consent supplement — 2026-10-26 (local QA candidate)

The historical “explicit scoped consent only in LOBBY” flow above is the earlier GM-21 baseline. For v4, users set independent `personal` and `group` choices at account scope; v4 admission/start inherits enabled settings, while a missing setting remains opt-out. Start atomically locks each enabled scope for each member. Post-start opt-in applies only to future rooms; revocation before finalize deletes/suppresses the affected scope. Personal rows belong to each opted-in member; group requires all locked members. History must return the persisted result projection with the same `resultId` and podium, and continue honoring ACL/delete/TTL. Do not rewrite v2/v3 or already-started v4 snapshots, and do not backfill completed rooms. Migration 0029/schema 0.9.1 and the expanded 82-case run are local QA evidence only, not PR approval or deployed runtime.

### Security follow-up — 2026-10-27

Apply forward migration `0030_history_consent_search_path.sql` through the normal migration ledger. It removes the unnecessary `public` search path from the v4 consent SECURITY DEFINER wrapper without replacing its body, changing grants, adding endpoints or changing the GM-07.B DTO/schema identity. Do not edit migration 0027 or weaken the existing GM-21 fixed-path assertion. The same 45 history SQL assertions passed on owned QA after reproducing the earlier failure; see CHECKS. Existing application databases were not migrated in this local verification.
