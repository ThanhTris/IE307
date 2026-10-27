# GM-21 — Current integration checks

2026-10-15. Owner Tâm, reviewer Trí, Pending. Branch codex/gm-21-history-consent.
Target991de6620715d1219da900499f4aa2d683b01bb4; rebased HEAD06d1d5b plus patch.
GM21.2 / GM07.1 / GM20.3 / food-core1.1.0 / schema0.6.0. Source hashes and exact
execution scope in PATCH_MANIFEST.json and gm20-integration/*.json.
macOS, Node26, PostgreSQL17.11, Python3.13.3; live Project checker bundled Python.
No self approval, commit/push, Project edits, production publish or native claim.

| AC/output | Actual assertions | Evidence | Scope/result |
| --- | --- | --- | --- |
| Own/group history and privacy | Owner/member/outsider/cursor, forged/missing JWT, no roster/ballot/location, <=50/page | sql-results.json45, http-results.json21 | Real PG/JWT/client; synthetic positive data; Pass |
| Scoped opt-in and deletion | Default none, partial personal, all-member group, withdraw/delete peers unaffected | lifecycle-results.json10 + API suite | Actual lifecycle/finalize; Pass |
| ACK/retry/rate | Opaque IDs, concurrent8 writes/one mutation, payload409,61 reads60success+1HTTP429 | HTTP21 | Real network/unchanged GM07; Pass |
| Actual producer | Real create/join/prefs/ready/start/submit/result/history, one atomic receipt, pinned name, shortest consent TTL | lifecycle-results.json | Ten actual HTTP scenario groups; Pass |
| Recent/lobby/start | <=3 matching server recents, kernel rank parity and same eligible set, consent/roster invalidation, stale version, frozen snapshot after withdrawal | lifecycle-results.json + SQL45 | Actual GM19→GM18 and GM20; Pass |
| Withdrawal/reopt-in | Physically remove group, never regenerate old summaries, preserve locked pool/winner; detached consents cannot authorize new history | lifecycle + HTTP + upstream regression | Real SQL/HTTP; Pass |
| Atomic failure | Force history insert failure: final ballot/result/event/receipt rollback; retry succeeds with3 histories | lifecycle-results.json | Owned disposable fault injection; Pass |
| TTL/retention | Operational24h cleanup, multiple detached meals, authentic display,30day ceiling, receipts/windows expiry, paging51+ | SQL45 + original GM17 assertions | Real PG cleanup; no production scheduler claim |
| GM20 regression | Original22 business scenario groups unchanged, SQL assertions and all decision parity vectors | upstream-gm20/http-results.json, adapter.json, parity.json, sql-run.txt | Owned test setup adapted consent-before-ready; Pass |
| GM17 regression | Original93 RLS/retention assertions and cleanup lock contention | access-results.json, access-run.txt | Owned fresh DB; Pass; app deployment comparison explicitly excluded by adapter |
| App database parity | Original runner found missing GM22 profiles avatar_seed/friend_code column grants; app ledger only0001..0005/0018 | app-deployment-check.txt | Drift found; app DB preserved, no claim that new migration is deployed |
| Mobile regression | Typecheck/lint/unit382/architecture on PR116 dependencies | mobile-check.txt | Static/unit; no device claim; baseline lint warnings recorded |
| Domain |237 eligibility/recent-rank/decision tests | domain-regression.txt | Existing fixtures; Pass |
| Python |550 tests,5 existing skips | python-regression.txt | Offline; Pass with stated skips |
| Repository/index/diff | Links/JSON/task contracts/index freshness/whitespace | repository-check.txt, docs-check.txt, diff-check.txt | Offline; not approval |
| Expo dependency check | Dependencies up to date using bundled local map; remote versions endpoint unavailable/offline | expo-check-offline.txt | Local validation only; no online compatibility claim |
| Start/merge gate | Live Project Done inputs + fetched target artifacts | start-gate.txt / merge-gate.txt | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW |
| Android / new remote CI / Trí review | Device integration/build, pushed CI, reviewer acceptance | Not run / Not run / Pending | Consumers GM25/28/31; not inferred from server tests |

Paths in the table are relative to gm20-integration/. Historical integration/
evidence records the earlier independent phase and its old blocked merge gate;
it is not the current status. Runners hash tested sources and clean only their own
DB/REST/namespace-tagged GoTrue guests. No real user tokens/keys/ballots/GPS in evidence.

GM20 regression setup now applies every roster preference before any ready
confirmation. This is necessary because GM21 invalidates all ready flags when a
room consent changes; the frozen tests() business assertions remain byte-identical.
Adapter/source/scenario hashes document this adjustment. Production GM20 continues
calling its existing writer;0024 extends it instead of using the old fixture port.

The GM17 original runner combines regression with a comparison of app deployment.
That comparison failed due to existing GM22 column-grant drift. The GM21 adapter
runs the unchanged assertion SQL on its own freshly migrated DB and explicitly
labels app parity untested. App DB was neither reset nor reconciled. Deploying the
PR needs ledger/definitions/grants/backup review, including any stale draft objects.

One initial mobile run under concurrent setup load timed out2 component tests;
a rerun passed382/382, followed by full checks after installing PR116 dependencies.
Keep the initial failure log for traceability; it is not a hidden or skipped test.
Current patch remote CI will run only after the user pushes. Trí reviews the current
revision and output; READY_FOR_MERGE_REVIEW does not authorize automatic merge/Done.

## Consent wrapper security fix — 2026-10-27 (local)

Reproduced the main/PR #137 CI failure at `public wrappers fixed path and restricted grants` on owned disposable PostgreSQL. Migration `0030_history_consent_search_path.sql` changes only `public.update_history_consent(text,text,jsonb)` to `search_path=pg_catalog`; the existing function body, grants, consent behavior and contract are preserved. Earlier migrations and the security assertion are unchanged.

The unchanged GM-21 `exercise()` assertions passed **45/45** after the fix, including private schemas/helpers, authenticated/anon grants, replay, revoke/delete, pagination and retention. The local transport adapter binds TestDB to an ownership-verified QA container instead of the application container; this is real SQL with claims, not JWT or Android evidence. Before/after JSON and TAP logs are local under `review-results/ci-sql-fix-20261027/`. Both disposable history databases were removed. Remote CI, application deployment and human approval are not claimed by this local check.

A subsequent fresh `python scripts/dish_v4_ci.py run` applied all source migrations, including 0030, and passed **83/83 real Auth+REST assertions**, validating 439 contract envelopes and cleaning its owned worker/container/workdir. Full offline Python regression: **604 tests, OK, 6 skipped**. Validator, generated indexes and diff checks passed. These are local uncommitted-source results, not CI on a pushed commit.

## Legacy history compatibility follow-up — 2026-10-27

CI on `4677f6b` passed GM-06 TAP and GM-21 SQL/JWT/lifecycle stages, then failed the frozen GM-20 history scenario at `History count valid: 0/3`. A separate local regression reproduced a legacy room's explicit opt-in being overwritten when no account default exists. The v4 account-default helper in migration 0029 was unintentionally applied to legacy rooms as well.

Migration 0031/schema 0.9.2 makes that behavior policy-specific. New checks fail before the migration and pass afterwards: explicit legacy opt-in survives absent account defaults, and an account opt-in cannot enable an opted-out legacy room. The full history SQL exercise now passes **47/47**; database TAP remains **47/47**. Real Auth+REST v4 passes **83/83**, 439 schema envelopes, with the runtime schema patch read back as 0.9.2. GM-17 access/privacy/retention passes **93 assertions** against the owned QA deployment (its optional concurrent cleanup branch is skipped). Worker definition verification passes against deployed 0031. Full Python regression: **604 tests OK, 6 skipped**. Evidence is local under `review-results/ci-legacy-consent-fix-20261027/`; no application DB migration or reset is claimed.

The complete frozen GM-20 HTTP business scenarios also passed **22/22**, including the previously failing valid/partial/expired/revoked history cases, delete/retry, fault rollback, concurrent finalize/cancel and lost-response replay. The local adapter changes only QA Auth/REST/fixture transport, evidence destination and the already reviewed GM-21 fixture ordering (all preferences before ready). It asserts that the `tests()` scenario body is unchanged and records its hash. It uses real GoTrue JWTs and a namespace-owned PostgREST/database; owned fixture DB/guests were removed. See local `gm20-after/http-results.json`, `gm20-adapter.json` and `gm20-after.log`. This local pass does not claim remote CI success before the patch is pushed and executed there.
