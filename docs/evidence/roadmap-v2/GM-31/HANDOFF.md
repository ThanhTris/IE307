# GM-31 handoff

Task: GM-31 — UI cache, outbox và phục hồi phiên. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm29-31-local`. Status: implementation prepared locally; review and mandatory native evidence remain outstanding.

## Artifacts

| Artifact | Purpose / receiver |
| --- | --- |
| `mobile/src/data/local/migrations.ts` | Creates versioned private SQLite metadata table with TTL index |
| `mobile/src/data/local/outbox.ts` | SecureStore payload storage, opaque SQLite metadata, cache/outbox TTL, scope isolation, ACK cleanup, canonical reconciliation |
| `mobile/src/features/voting/services/voteRepository.ts` | Persists ballot before sending; preserves idempotency key; canonical refetch before retry and no automatic replay of unknown outcomes |
| `mobile/src/features/history/services/historyRepository.ts` | Persists authorized history snapshot privately and invalidates on consent changes; delete removes the corresponding cached item |
| `mobile/src/features/history/screens/LiveHistoryScreen.tsx` | Uses durable cache on network errors and labels stale cache with fetchedAt |
| `mobile/src/bootstrap/RoomRepositoryProvider.tsx` | Clears identity-scoped durable data as part of explicit logout |
| `mobile/tests/unit/gm31Outbox.test.ts` | Isolated SQLite/SecureStore behavior tests |

## Data and retry rules

Do not expose cached room state as authoritative or enable writes from it. The outbox does not auto-send after reconnect: the UI/user must retry, and repository reconciliation requires a canonical server snapshot first. Unknown server outcomes retain the immutable request until explicitly reconciled; stale round/pool/version records are discarded. Cache/outbox payloads are identity scoped, TTL-limited and cleared at logout. Keep winner/Top 3/pool authority on the server.

Run Android restart/offline/realtime-gap/auth-switch/expiry/revoke tests and API multi-user ACL checks before review. Figma parity screenshots are outstanding. This handoff does not change status or approval.
