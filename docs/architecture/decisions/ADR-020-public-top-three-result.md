# ADR-020 — Aggregate Top 3 result projection

- Status: **Accepted by project owner Trí (`ThanhTris`) on 2026-10-24**.
- Scope: new dish-session v4.B sessions only. Existing v2/v3 sessions and stored results retain their pinned behavior.
- Runtime status: **not implemented or deployed**. This ADR records product rules; it is not API/Android evidence.
- Related: [ADR-019 dish-first room policy](ADR-019-dish-first-room-policy.md), [GM-07.B contract](../DISH_SESSION_API_CONTRACT_B.md), [Figma–BE–Data alignment](../../project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md).

## Context

Figma has a podium with up to three dishes and aggregate points. The current deployed result projection returns only the selected winner. Recomputing points in a client would expose ballot data and would allow old results to change when catalogue or client code changes. The server must persist one allowlisted aggregate result atomically with finalization.

## Decisions

1. **Score:** for each eligible dish, `score = 2 × WANT + OK`, summed across complete round-one ballots that the server accepted. A missing, draft, partial, rejected, or unacknowledged ballot contributes nothing. Round-two KEEP does not add points.
2. **Eligibility:** remove every dish marked NO in any accepted complete round-one ballot. If the session reaches round two, also remove every dish removed by the completed round-two decision. Never rank NO/REMOVE dishes.
3. **Count and order:** return one to three eligible dishes, ordered by descending score. Return fewer than three when fewer eligible dishes exist. `NO_CONSENSUS` returns no podium and no winner.
4. **Ranks:** equal scores share a dense rank: scores `8, 8, 7` map to ranks `1, 1, 2`. At a tie across the third-place boundary, persist one deterministic subset of at most three dishes. The persisted winner must be in the subset.
5. **Winner:** keep the existing server decision/winner policy. Scores and podium rendering do not change winner selection. For the current decision rules, a decided winner is among the top-scoring eligible dishes; server parity tests must assert this invariant for each supported policy version.
6. **Persistence:** store `scoreVersion`, `rankingVersion`, the locked dish projections, points, ranks, winner flag, and fixed display order in the terminal result transaction. Replays, reconnect, history and inbox-linked reads return the persisted projection; they do not recalculate against the current catalogue.
7. **Visibility:** after terminal finalization, every authenticated room member may read the aggregate podium, including a room where only one or two members submitted. The owner accepts that a small group can infer more from aggregate totals. Do not expose individual ballots, per-person contributions, candidate matrices, seeds, or private idempotency records.
8. **History and events:** history continues to obey current consent, ACL, retention and deletion rules. Notifications carry result ID/status/version only; the client fetches the authorized aggregate result after opening the notification.
9. **Legacy:** do not backfill or recompute v2/v3 history to manufacture a Top 3. A legacy result remains winner-only unless a separately reviewed migration explicitly supplies immutable source evidence.

## Version labels

- `scoreVersion`: `want2-ok1-round1-v1`.
- `rankingVersion`: `score-desc-dense-rank-v1`.
- Contract: `dish-session-v4/roadmap-v2/GM-07.B`.
- Policy lifecycle ID remains `dish-decision-v4/ADR-019-30PCT`; score/rank versions are separate so ranking changes do not silently change round rules.

## Consequences

- GM-20 owns authoritative calculation and persistence; GM-06 owns forward-only storage; GM-17 owns privacy/ACL; GM-07 owns the wire DTO; GM-21/23 read the persisted projection under existing access rules.
- GM-13/27 and later UI integration render the server result; they do not score ballots locally.
- Schema and fixtures can be checked now, but HTTP parity remains Not run until the v4.B producer exists.
