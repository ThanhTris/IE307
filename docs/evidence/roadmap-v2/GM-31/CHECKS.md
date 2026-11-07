# GM-31 checks

### Local review follow-up — 2026-11-07

- Branch: `codex/gm-31-private-outbox`; this task is split from PR #126 into its own draft PR.
- Applied Contract B version reconciliation: a replay candidate must satisfy `1 <= expectedVersion <= snapshot.version`; future-version and invalid-version intents are removed.
- ACK reconciliation now checks both canonical `ownBallot.requestId` and legacy `ownSubmission.requestId`.
- Expo 58 baseline with `expo-sqlite@~58.0.15`; `npm run check:expo` passed.
- `npm run typecheck`: Pass. Focused `gm31Outbox.test.ts` + `voteRepository.test.ts`: 2 suites / 34 tests Pass. `npm run check:expo`: Pass on Expo 58.0.23; `git diff --check`: Pass.
- AVD persistence/restart, live backend, and Figma parity remain Not run. Keep the PR draft and do not claim merge readiness.

## Scope and behavior

SQLite stores opaque record identifiers, entry kind/state and TTL. Private scope and values remain in SecureStore. Reconciliation fetches canonical server state before producing candidates; unknown ACK state is never auto-replayed. Logout clears identity-scoped durable outbox/cache data before ending the session.

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
