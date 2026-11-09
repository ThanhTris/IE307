# GM-31 handoff

Task: GM-31 — private offline cache and ballot outbox. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm-31-private-outbox` (PR #158). Status: implementation, strict 1-Task-1-PR ownership refactor, and Stage 3A AVD (`Medium_Phone_API_37.0`) + QA backend verification completed; ready for merge review by Trí.

## Artifacts

- `mobile/src/data/local/migrations.ts` — private SQLite schema migration, including durable row deletion markers and pending identity fingerprint markers.
- `mobile/src/data/local/outbox.ts` — SecureStore payloads, opaque SQLite metadata (with `SecureStoreMetadataDatabase` fallback when native `ExpoSQLite` is absent), identity isolation, TTL/cap, cache and replay reconciliation, and automatic `retryPendingPrivateDeletions()` on initialization.
- `mobile/src/features/voting/services/durableVoteRepository.ts` — `acknowledgedRequestIds`, `createDurableVoteRepository`, and `DurableLiveVoteRepository` wrapping GM-26's `createLiveVoteRepository` for persist-before-send ballot idempotency and canonical ACK reconciliation without modifying GM-26 owned files.
- `mobile/src/features/voting/services/voteSessionState.ts` — invokes `getDurableOutbox().clearIdentity(identityId)` when clearing a vote session on logout/revocation without modifying GM-29's `RoomRepositoryProvider.tsx`.
- `mobile/src/app/room/vote.tsx`, `mobile/src/app/room/final-round.tsx`, `mobile/src/app/history.tsx` — default live composition wiring for `createDurableVoteRepository` and `getDurableOutbox()` durable history cache.
- `mobile/tests/unit/gm31Outbox.test.ts` — isolated-store behavior, canonical ACK reconciliation, and identity isolation regression cases (18 tests in `gm31Outbox.test.ts`, 43 tests combined with `voteRepository.test.ts`).

## Configuration and run

Expo baseline: SDK 58 from `origin/main` (with `expo-sqlite@~58.0.15` declared in GM-02 maintenance PR #161). From `mobile/` run `npm ci`, `npm run check:expo`, `npm run typecheck`, `npm run lint`, `npm run check:architecture`, and `npx jest --runInBand tests/unit/gm31Outbox.test.ts tests/unit/voteRepository.test.ts`.

SQLite stores opaque record identifiers, entry kind/state, TTL, opaque deletion markers, and a non-reversible-format identity fingerprint while cleanup is pending. Identity, room, ballot and snapshot payloads remain in SecureStore. A pending mutation is written securely before network submission. Unknown outcomes remain for explicit reconciliation; they are not automatically replayed. ACK scrubs the private ballot. Offline snapshot recovery is identity/room scoped and used only after network/time-out failure. Logout invalidates the local session even when SecureStore read or deletion fails; same-identity reads/replay remain blocked until startup resolves cleanup, while unrelated identity data is retained.

## Verification & Stage 3B Boundary

On 2026-11-09, `python scripts/task_readiness.py --task GM-31 --gate merge --base-ref origin/main --verify-outputs` passed with `READY_FOR_MERGE_REVIEW`. On AVD `Medium_Phone_API_37.0` (`emulator-5554`) connected to the local QA backend (`127.0.0.1:54381`), process restart (`am force-stop`), offline session recovery, G03 `/history` durable cache fallback, and `412dp`/`360dp`/`200%` font scale checks were verified and recorded in [`CHECKS.md`](CHECKS.md) and [`FIGMA_PARITY.md`](FIGMA_PARITY.md). Physical USB Android phone testing remains deferred to Stage 3B (`GM-33`/`GM-34`). No Project status or approval was changed.
