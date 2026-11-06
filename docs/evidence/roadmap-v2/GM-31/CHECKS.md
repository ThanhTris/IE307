# GM-31 checks — local implementation

### Trí review follow-up — 2026-11-07 (local, pending PR update)

- Same-scope room version increases no longer delete pending or unknown ballot intents; unknown intents remain excluded from automatic replay.
- Failed SecureStore payload deletion now propagates and leaves the SQLite handle available for a later cleanup retry.
- Ballot submission captures user ID, repository identity revision and auth generation; it stops before dispatch and suppresses stale receipts if the session changes while persistence or the request is pending.
- History consumers enforce 24-hour snapshot age and canonical per-item `expiresAt`; consent invalidation is shared and serialized across repository instances.
- Full `mobile/npm run check`: 70 suites / 1138 tests passed; typecheck/lint/architecture passed. Android process restart, HTTP, server ACL/revocation and native persistence remain Not run.

Status: Review required; mandatory Android persistence/restart and Figma visual evidence are Not run.
Task / owner / reviewer / scope: GM-31 / Trung / Trí (ThanhTris) / identity-isolated cache and ballot outbox.
Branch / target / tested revision: PR #126 branch `codex/gm-28-social-inbox-history` / `main` / tested code commit `35f61ed` (published as `28bb31e`). Contract: `ui-figma-final/2026-10-25/GM-31.2`; local store schema version 1 (`gcd-private-v1.db`).

## Setup and repeat

From `mobile/`: `npm ci`, `npm run check:expo`, `npm run check`, `npm test -- --runInBand tests/unit/gm31Outbox.test.ts tests/unit/voteRepository.test.ts tests/unit/gm28Repositories.test.ts`.

SQLite holds opaque record IDs, kind/state and TTL only. Scope and private values use SecureStore. Snapshots are cached with fetchedAt and 24-hour TTL. Ballot intents retain request/intent IDs and are written before network submission; ACK scrubs the ballot payload. Logout clears the current identity's records. Retry reconciliation first fetches a canonical snapshot; stale scope/version is deleted and unknown ACK state is never auto-replayed.

## Cases / AC

| Case | Expected | Actual/evidence | Status | Limit |
| --- | --- | --- | --- | --- |
| SQLite metadata privacy | No identity, room, ballot or snapshot data in SQLite rows | Latest `npm run check`: 69 suites / 1129 tests pass; dedicated opaque metadata assertion passes | Pass | Unit test only |
| Idempotency and ACK cleanup | Duplicate request ID/same payload is stable; conflicting reuse rejected; ACK payload scrubbed | Dedicated `gm31Outbox.test.ts` assertions pass | Pass | No server/network proof |
| Scope and auth isolation | Identity and room/round/pool/contract isolation; logout removes that identity | Dedicated outbox identity isolation/clearIdentity assertions pass | Pass | Process/device restart not run |
| Canonical reconciliation | Refetch before replay candidate; stale scope removed; version increase alone preserved; unknown never automatically sent | Managed regression preserves same-scope pending/unknown intents on version 12→13; full mobile suite passes | Pass (unit) | No live API runtime |
| History stale cache | Offline fetch can show the last authorized history snapshot with its fetchedAt and stale label; consent invalidation clears snapshot; delete prunes the cached item | Persistent cache wired through `LiveHistoryScreen` / `historyRepository`; full mobile suite passes | Pass (unit/code) | Android kill/resume and live ACL revoke not run |
| TTL/cap/restart | Expired records removed; cap enforced; data survives process restart | TTL and combined cache/outbox cap unit tests pass; native restart not run. SecureStore deletion failure retains metadata for retry | Partial | Android device needed |
| Figma parity | Compare history offline/error states and session recovery at required sizes | Node IDs mapped below; screenshots not captured | Not run | Figma and Android screenshot evidence required |

Figma nodes: `277:2140`, `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768`; history states `801:9695`, `801:9846`, `801:9775`.

Repository checks: `validate_repository.py`, `task_readiness.py --check-docs`, `npm run check:expo` and `git diff --check` passed. Python unittest was rerun with the latest changes; record its final result in the companion GM-28 `CHECKS.md`. Android restart/offline, live API and Figma evidence remain Not run.

## Blockers

Android development device/process-kill testing and live API/auth/revoke scenarios were not available. Figma page screenshot/context could not be opened in this session. No Done/approval is recorded here.
