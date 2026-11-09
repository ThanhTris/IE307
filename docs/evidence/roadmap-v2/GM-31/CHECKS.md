# GM-31 checks

### Local review follow-up — 2026-11-08

- Branch: `codex/gm-31-private-outbox` (PR #158); this task is split from PR #126 into its own draft PR.
- Historical checks below were run at `bb662d9`. Follow-up fixes are at `031d99f`; focused follow-up tests were rerun locally on 2026-11-08.
- Replay candidates must satisfy `1 <= expectedVersion <= snapshot.version`; retry now independently rejects a future version against the just-fetched snapshot.
- ACK reconciliation accepts the canonical `ownBallot` array only when the current member is `ACCEPTED`, and keeps legacy `ownSubmission.requestId` support.
- Snapshot responses are bound to the identity captured before the request; offline/time-out reads may restore only a valid, unexpired private cache for that same identity and room.
- Logout records opaque row IDs in SQLite before SecureStore deletion; pending cleanup is retried during provider startup. A SecureStore deletion error no longer blocks local logout. A migration also drains identity markers from the short-lived version-2 schema.
- Expo 58 baseline with `expo-sqlite@~58.0.15`; `npm run check:expo` passed.
- Focused `gm31Outbox.test.ts` + `voteRepository.test.ts`: 2 suites / 43 tests Pass. Coverage includes canonical ballot ACK gated on `ACCEPTED`, late snapshot rejection after identity switch/logout, other-room intent retention, future expected-version rejection, retry after SecureStore read failure across restart, and preservation of another identity's rows.
- Unknown-intent replay requires a fresh live snapshot; stale cache fallback is marked for read paths and cannot authorize a mutation retry. Offline recovery leaves the intent intact without submitting.
- Identity cleanup marks all matching rows before attempting independent secure deletes. Rows pending deletion are hidden from reads/replay and startup retry continues across failures.
- Logout first persists an opaque identity fingerprint cleanup marker. If a SecureStore read fails, rows for that identity stay hidden and writes are blocked until startup can resolve ownership and delete them; other identities remain visible. SQLite never stores the raw identity ID.
- `npm run typecheck` and `git diff --check`: Pass. AVD persistence/restart, live backend and Figma parity remain Not run. The readiness checker cannot verify Project #2 because the GitHub token lacks `read:project`; do not claim merge readiness.

## Scope and behavior

SQLite stores opaque record identifiers, entry kind/state, TTL, pending deletion record IDs, and an opaque identity fingerprint only while cleanup is pending. Private identity scope and values remain in SecureStore. Reconciliation fetches canonical server state before producing candidates; unknown ACK state is never auto-replayed. Logout invalidates the local session even if SecureStore read/delete fails; cleanup markers retry identity-scoped deletion on startup.

## Required next evidence

| Case | Current result | Remaining evidence |
| --- | --- | --- |
| Expected-version range and stale/future intent pruning | Pass | Focused Jest: future expected-version case rejected; `gm31Outbox.test.ts` |
| Canonical and legacy ACK recognition | Pass | Focused Jest: canonical ballot requires `ACCEPTED`; legacy request ID stays supported |
| SQLite metadata privacy, cap, TTL, identity isolation | Pass | Focused `gm31Outbox.test.ts` coverage; full mobile suite not run |
| Room-scoped reconciliation and restart cleanup retry | Pass | Focused `gm31Outbox.test.ts`: other-room intent retained; new outbox retries opaque deletion marker |
| Process restart/persistence | Not run | Android development build + AVD |
| Server reconciliation/auth | Not run | Local Backend QA with canonical API |
| Figma parity | Not run | Screenshots at 412dp, 360dp and 200% text |

Figma nodes from the task map: `277:2140`, `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768`, `801:9695`, `801:9846`, `801:9775`.

## PR #158 review regressions — 2026-11-09

Addressed Trí's two latest findings with identity-scoped write serialization and awaited schema initialization before checking cleanup markers.

| Regression | Result | Evidence / limit |
| --- | --- | --- |
| Logout races a SecureStore outbox write | Pass | `gm31Outbox.test.ts`: holds the private payload write, starts `clearIdentity(A)`, then releases the write; a new store instance reads no A intent and both SQLite metadata and SecureStore payloads are empty. |
| Logout races a SecureStore snapshot-cache write | Pass | Same deferred-write setup for `cacheSnapshot`; after logout and reopening the store, the cache is absent and no private row/payload remains. |
| First operation races schema migration on a fresh DB | Pass (memory adapter) | Concurrent first `enqueue` and `cacheSnapshot` fail if the test adapter sees cleanup-table queries before schema version 4; both succeed after initialization. This is a deterministic adapter regression, not a real SQLite/AVD run. |
| Focused tests and typecheck | Pass | `npm test -- --runTestsByPath tests/unit/gm31Outbox.test.ts`: 18/18; `npm run typecheck`: exit 0. |
| Android/QA API and merge readiness | Not run / blocked | No AVD, live QA reconciliation or Figma evidence was produced in this follow-up. Re-run `task_readiness.py --task GM-31 --gate merge --base-ref origin/main --verify-outputs` after syncing main and confirming GM-26 ownership. |
