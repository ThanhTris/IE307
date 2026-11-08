# GM-31 checks

### Local review follow-up — 2026-11-08

- Branch: `codex/gm-31-private-outbox` (PR #158); this task is split from PR #126 into its own draft PR.
- Historical checks below were run at `bb662d9`. Follow-up fixes are at `031d99f` and have not been rerun locally.
- Replay candidates must satisfy `1 <= expectedVersion <= snapshot.version`; retry now independently rejects a future version against the just-fetched snapshot.
- ACK reconciliation accepts the canonical `ownBallot` array only when the current member is `ACCEPTED`, and keeps legacy `ownSubmission.requestId` support.
- Snapshot responses are bound to the identity captured before the request; offline/time-out reads may restore only a valid, unexpired private cache for that same identity and room.
- Logout records identity cleanup in SQLite before SecureStore deletion; pending cleanup is retried during provider startup. A SecureStore deletion error no longer blocks local logout.
- Expo 58 baseline with `expo-sqlite@~58.0.15`; `npm run check:expo` passed.
- `npm run typecheck`: Pass. Focused `gm31Outbox.test.ts` + `voteRepository.test.ts`: 2 suites / 34 tests Pass. `npm run check:expo`: Pass on Expo 58.0.23; `git diff --check`: Pass.
- AVD persistence/restart, live backend, and Figma parity remain Not run. Keep the PR draft and do not claim merge readiness.

## Scope and behavior

SQLite stores opaque record identifiers, entry kind/state, TTL and pending cleanup identity markers. Private scope and values remain in SecureStore. Reconciliation fetches canonical server state before producing candidates; unknown ACK state is never auto-replayed. Logout invalidates the local session even if SecureStore cleanup fails; a durable marker retries identity-scoped deletion on startup.

## Required next evidence

| Case | Current result | Remaining evidence |
| --- | --- | --- |
| Expected-version range and stale/future intent pruning | Unit regression added | Focused Jest result below |
| Canonical and legacy ACK recognition | Unit regression added | Focused Jest result below |
| SQLite metadata privacy, cap, TTL, identity isolation | Existing unit coverage | Full GM-31 suite on this PR revision |
| Process restart/persistence | Not run | Android development build + AVD |
| Server reconciliation/auth | Not run | Local Backend QA with canonical API |
| Figma parity | Not run | Screenshots at 412dp, 360dp and 200% text |

Figma nodes from the task map: `277:2140`, `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768`, `801:9695`, `801:9846`, `801:9775`.
