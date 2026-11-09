# GM-31 handoff

Task: GM-31 — private offline cache and ballot outbox. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm-31-private-outbox`. Status: implementation prepared in a separate draft PR; device/backend acceptance is outstanding.

## Artifacts

- `mobile/src/data/local/migrations.ts` — private SQLite schema migration, including durable row deletion markers and pending identity fingerprint markers.
- `mobile/src/data/local/outbox.ts` — SecureStore payloads, opaque SQLite metadata, identity isolation, TTL/cap, cache and replay reconciliation.
- `mobile/src/features/voting/services/voteRepository.ts` — persist-before-send ballot idempotency and canonical ACK reconciliation.
- `mobile/src/bootstrap/RoomRepositoryProvider.tsx` — clear the signed-in identity's durable records during logout and retry failed SecureStore cleanup at startup; remote push/history UI wiring stays with GM-29/GM-28.
- `mobile/tests/unit/gm31Outbox.test.ts` — isolated-store behavior and reconciliation regression cases.

The 2026-11-09 PR #158 regression follow-up serializes same-identity outbox/cache writes with logout cleanup. Deferred SecureStore tests verify an in-flight A write is removed before logout completes; fresh-database tests verify the first outbox/cache operations wait for migration. Focused suite: 18/18; TypeScript typecheck passed. The fresh-schema test uses the deterministic memory adapter, not SQLite on Android.

## Configuration and run

Expo baseline: SDK 58 from `origin/main`; `expo-sqlite@~58.0.15` is added for this task, with the `expo-sqlite` config plugin. From `mobile/` run `npm ci`, `npm run check:expo`, `npm run typecheck`, and `npm test -- --runInBand tests/unit/gm31Outbox.test.ts tests/unit/voteRepository.test.ts`.

SQLite stores opaque record identifiers, entry kind/state, TTL, opaque deletion markers, and a non-reversible-format identity fingerprint while cleanup is pending. Identity, room, ballot and snapshot payloads remain in SecureStore. A pending mutation is written securely before network submission. Unknown outcomes remain for explicit reconciliation; they are not automatically replayed. ACK scrubs the private ballot. Offline snapshot recovery is identity/room scoped and used only after network/time-out failure. Logout invalidates the local session even when SecureStore read or deletion fails; same-identity reads/replay remain blocked until startup resolves cleanup, while unrelated identity data is retained.

## Limits

Android process restart, AVD + local Backend QA, live consent/revocation behavior, and Figma screenshot parity have not been run in this workspace. Do not claim these acceptance criteria as passed or change Project status/approval.
