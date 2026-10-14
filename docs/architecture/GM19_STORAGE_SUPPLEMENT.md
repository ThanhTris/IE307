# GM-19 storage supplement — schema0.3.0

Contract remains `food-v1/roadmap-v2/GM-19.1`; no mobile DTO change.
Migration0019 is unmerged GM-19 code; upstream migrations stay intact.

- `gm19_private.pool_snapshots` stores the allowlisted GM-18 card projection,
  cascade deleted with `round_dishes`. It freezes offering/price/name data
  across catalogue changes after start.
- `rooms.anchor_display_name` pins the displayed public anchor name. Column
  grants stay unchanged; snapshot returns the existing `anchorName` DTO.
- Private ACK references the public idempotency row with `ON DELETE CASCADE`;
  the public response remains the GM-06 minimal reference. Cleanup leaves no
  private ACK alive after its public row is removed.
- ACK lookup acquires the GM-06 reference lock before the room lock. Concurrent
  retries serialize through lookup, mutation and commit. Atomic quotas use the
  caller/operation; ACK replay precedes quota checks.
- GM-17 guards return the GM-07 messageKey/status envelope. Optional null
  preference/context fields are omitted to satisfy existing runtime guards.
- GM-07 request IDs remain opaque strings, including its default req_* form.
  A deterministic SHA-256-derived UUID stores non-UUID IDs in GM-06's UUID
  column; the wire ACK echoes the original request ID. UUID inputs remain
  compatible. This changes no public DTO or client ID generator.

Synthetic published predicates exist only in an owned disposable DB. The
gateway/control routes belong to local runner tooling, not deployed APIs.
# Verification follow-up (2026-10-14)

The private pool port calls the GM-18 kernel with server-loaded preferences and
validated context; lifecycle writes do not consume the public preview quota.
When a projected choice contains offerings from multiple venues, persistence
selects an offering matching the projected venue and dish. Array position does
not identify the selected venue. This preserves the pool across start checks.
