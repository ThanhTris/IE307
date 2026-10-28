# Dish session API contract — GM-07.B

Status as of 2026-10-28: this specification documents the v4.B dish session API contract family:
- **Deployed baseline runtime**: Contract ID `dish-session-v4/roadmap-v2/GM-07.B`, implemented in migrations 0027–0031 on main at `850e162df1c46d75fe371b7a7b8210a5c87b7b84` (schema version 0.9.2). Its wire schema is pinned in [dish-session-v4b.schema.json](schemas/dish-session-v4b.schema.json) and achieves 100% HTTP/schema parity in CI.
- **Supplement candidate contract**: Contract ID `dish-session-v4/roadmap-v2/GM-07.B-supplement`, defined in standalone schema [dish-session-v4b-supplement.schema.json](schemas/dish-session-v4b-supplement.schema.json). This contract adds mandatory Round 1 scoring cohort metadata (`round1BallotCount`), strict terminal status/round/reasonCode pairings, and typed history projections for downstream consumers (GM-25/26/27/28). Producer delivery of `round1BallotCount` in SQL `result_value` belongs to GM-20 (PostgreSQL migration & RPC update) / GM-15 (decision engine supplement).
- Independent storage 0032/GM06.3 does not automatically replace `dish_v4_private` or prove API integration. Preference ranking is explicitly `UNSUPPORTED` in v4.B (members share equal weights; soft preferences guide pool creation only). Known failing PostgreSQL runtime bugs in GM-19 (non-host `update_settings` guard and reroll pool idempotency) are tracked separately under GM-19 supplement and require migration/RPC fixes; contract simulation and schema validation are verified Pass via `gm07b_schema_smoke.py` and `tests/test_gm07b_contract.py`.

- Baseline Contract ID: `dish-session-v4/roadmap-v2/GM-07.B`.
- Supplement Contract ID: `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
- Lifecycle policy: `dish-decision-v4/ADR-019-30PCT-MIN1`.
- Score/rank: `want2-ok1-round1-v1` / `score-desc-dense-rank-v1`.
- JSON Schemas: [dish-session-v4b.schema.json](schemas/dish-session-v4b.schema.json) (baseline) and [dish-session-v4b-supplement.schema.json](schemas/dish-session-v4b-supplement.schema.json) (supplement).
- Parent proposal: [GM-07.A](DISH_SESSION_API_CONTRACT.md).

## Compatibility and transport

Use the existing `{command,payload}` and `{ok:true,data}` / `{ok:false,error}` envelopes. Every v4.B create, preview, mutation, snapshot and terminal projection identifies contract B. Existing unversioned and v3 traffic remains routed to its existing behavior; room contract/policy are pinned at creation. Do not infer v4 behavior from an HTTP 200, health endpoint, schema registry, or the proposal alone.

GM-07.B adds `previewJoin`, `updateSettings` and `updatePreferences`. `join` always rechecks membership, expiry, capacity, room state and invitation/code under the server transaction; preview is informative and does not reserve a seat.

### Concurrency and version guard rules

To prevent race conditions while avoiding false concurrency conflicts during voting, commands are partitioned into two distinct guard rules:

| Command category | Commands | Version guard rule | Round / Pool guard | Concurrency rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Lifecycle & Host mutations** | `updateSettings`, `updatePreferences`, `start`, `finalize`, `cancel`, `leave` | **Exact match**: `expectedVersion == room.version` | N/A (must match current lifecycle state) | Prevents conflicting host configurations or stale state transitions. Re-submitting identical settings or updating only `desiredAt` increments room version with no-op on candidate pool (`poolVersion` unchanged). Changing dish count or meal criteria increments room version and pool version (`poolVersion + 1`). |
| **Ballot submissions & waiting** | `submit`, `waiting` | **Range**: `1 <= expectedVersion <= room.version` | **Exact match**: `round == room.round` AND `poolVersion == room.pool_version` | Prevents false `VERSION_CONFLICT` during concurrent voting. If Member A and Member B both read version 3 at the start of Round 1, and Member A submits first (incrementing room version to 4), Member B's submit with `expectedVersion=3` is accepted because $1 \le 3 \le 4$, and the round and poolVersion match. Submission updates voter status without mutating the locked candidate pool or room round. |
| **Read-only / Query** | `previewJoin`, `snapshot`, `result`, `history`, `getDefaultPreferences` | N/A (reads latest authorized projection) | N/A | Query commands do not mutate version. |

**Concurrent Ballot Submission Scenario:**
When multiple participants submit complete ballots in the same active round, their requests arrive concurrently with an `expectedVersion` read from their current snapshot. If an exact version match were enforced, the first submission would increment `room.version`, causing all subsequent concurrent submissions to fail with `VERSION_CONFLICT` despite voting on the exact same round and pool. Under the GM-07.B range guard, ballot submissions accept any `1 <= expectedVersion <= room.version` as long as `round == room.round` and `poolVersion == room.pool_version`. Submitting with a mismatched round or poolVersion returns `VERSION_CONFLICT` (status 409). Submitting when the room is not in an active voting or waiting state returns `INVALID_ROOM_STATE` (status 409). Stale mutations with `expectedVersion > room.version` or `expectedVersion < 1` are rejected with `VERSION_CONFLICT`.

## Room settings, preferences and pool

The host requests an integer initial pool size from 10 through 20 and chooses meal context. Cuisine, category, flavor, temperature and budget are soft ranking preferences, not eligibility filters. Host settings and each joined member's own preferences are editable only in LOBBY. Only the room host may invoke `updateSettings`; requests from non-host members are rejected with error `NOT_HOST` without mutating room state. Re-submitting identical settings or updating only `desiredAt` increments the room version but performs a no-op on the pool, leaving `poolVersion` and candidate dishes unchanged. Only changes affecting pool size (`dishCount`) or meal criteria regenerate the candidate pool and increment `poolVersion`. The server combines available preferences before locking the pool at `start`; unknown or missing data is neutral and never fabricated. These preferences cannot remove candidates or silently lower the requested count.

Budget comparisons are allowed only when the observation and preference share currency and unit. The server never converts a portion/group/item/kg/menu-item observation into a per-person price. Unknown price stays eligible. Recent-dish adjustment can read only history allowed by existing consent/ACL; it is a soft ranking input and never changes ballot points. `desiredAt` records the intended meal time; the host still explicitly starts, and no venue schedule, GPS, anchor or location is required.

Create/start must produce exactly the host-confirmed number of unique dishes. If available is lower than requested, return `INSUFFICIENT_DISHES` with integer `available` and `requested`. The UI may ask the host to explicitly set a lower count only when the confirmed value remains at least 10; the server does not auto-reduce or relax preferences. The current pool is immutable after start.

`previewJoin` returns only a confirmation summary (joinable state, room code/name if already public, member count/capacity, meal context and dish count). It does not return the roster, preferences, pool, ballots, result or private room metadata. The full member roster is returned only after successful join.

## Snapshot additions

The v4.B snapshot extends A with:

- `hostUserId`, `expiresAt`, and `settings` (requested count, meal slot, optional desired time and host-selected soft preferences).
- `ownPreferences`, visible only to the authenticated caller.
- Per-member `role` and `submissionStatus` for the current round (`NOT_SUBMITTED` or `ACCEPTED`). This reveals only whether a complete ballot was accepted, never its choices or caller-private waiting state.
- `removalCap`: null outside round two; for every non-empty round-two pool, `max(1, floor(0.30 × N))`, including `1` when N=1. A one-dish round is a real user ballot: the participant may REMOVE the dish or submit no removal. Never auto-finalize and never synthesize a KEEP for a member who did not submit.
- Locked pool-card projection fields listed below. Every pool, result, history and inbox fetch refers to the same immutable result snapshot once the session is terminal.

The server remains authoritative for `version`, `poolVersion`, timer, ACK status, round transition, terminal reason, scores and ranks. Keep `ownBallot`/`ownWaiting` caller-private; do not add other members' ballot details.

For a started session, snapshot `submittedCount` is `A_r`: complete ballots accepted and ACKed by the server for the snapshot's current round only. `memberCount` is `M`, the locked roster size including the host; it is not an online-presence count and never shrinks on disconnect. `canEndWaiting` is caller-specific and true only for the host while the current round is in active waiting and `A_r > M/2`. It is an availability projection, not an authorization token; the write path rechecks host, current round/version, active waiting, and quorum under the transaction lock. A rejected manual early-end request uses the normal error envelope with `messageKey=NOT_READY`. No R1 ACK contributes to R2's `A_r`.

## Locked dish-card projection

Each `poolDish` preserves the stable `dishId` and `roundDishId` and may include nullable `description`, cuisine/category IDs and display labels, meal slots, known temperature/flavor labels, `artwork` (`uri`, `altText`, optional attribution) and one `priceReference` (`amount`, `currency`, `unit`, required source/time, optional serving size). Unknown fields are explicit `null` or empty arrays; no missing price becomes zero and no missing artwork gets an invented URL. UI uses its approved fallback. Artwork can enter a public projection only after GM-40 verifies display/use rights; an unlicensed or unknown-rights image stays null. Price keeps its observed unit and provenance. Result/history cards use the locked projection, never the current catalogue.

## Waiting and host end-waiting authority — 2026-10-25

The host action ends the current round's waiting period early; it never selects or overrides the winning dish. For each round r, let M be the locked session roster size (including the host), and A_r the number of complete ballots accepted by the server for that round. Early host end-waiting requires an active waiting timestamp and `A_r > M/2`, equivalently `A_r >= floor(M/2)+1`. Exactly half is insufficient. Round-one ACKs do not count toward round-two permission. Publish the current-round accepted count, locked denominator and authoritative action availability/rejection in the reviewed DTO; the server rechecks authority, round/version, waiting and quorum under its transaction lock. Do not accept a caller-selected winner.

Each round starts its own 60-second deadline on the first valid waiting transition after that caller's complete-ballot ACK. Entering ROUND_2 or receiving an ACK alone does not start it. Other members may submit before the deadline. The majority condition applies only to manual host early end-waiting; timeout processing retains at least one accepted complete ballot and must run even if a majority never finishes. Disconnects do not shrink M or extend the deadline. All-complete, timeout and authorized host early end-waiting use the same idempotent server outcome path, which determines ROUND_ADVANCED or TERMINAL from ballots and policy. Pinned v2/v3 semantics stay unchanged.

## Finalize acknowledgement

`finalizeAck` must represent both outcomes:

- Round transition: `outcome=ROUND_ADVANCED`, `state=ROUND_2`, `round=2`; `resultId` and `finalizedAt` are absent.
- Terminal result: `outcome=TERMINAL`, `state=DECIDED|NO_CONSENSUS`, terminal round, `resultId` and `finalizedAt` are present.

The ACK records the committed command, not a new client-side route guess. After any ACK/retry/reconnect the consumer fetches the authoritative snapshot/result and renders from it. An exact retry returns the original ACK and never rerolls or recomputes persisted data.

### Round-one terminal decision and survivor derivation

When round one is finalized, evaluate and persist a round-one winner before checking whether the survivor set is empty. If there is no winner, derive survivors from the locked initial pool by subtracting the union of dish IDs marked `NO` in every complete round-one ballot accepted by the server. Do not derive this set from a single member, the last request, or client-local state. If the resulting set is empty, persist terminal `NO_CONSENSUS` for round 1 with reason `EMPTY_INTERSECTION`; do not create `ROUND_2`, `WAITING_2`, a round-two timer, or a removal cap. If at least one survivor remains, open round two with exactly that set, even when it contains fewer than ten dishes; never replenish it from the catalogue.

## Top 3 terminal result

Every terminal result projection contains `resultId`, `contractVersion`, `policyVersion`, `status`, `round` (integer 1 or 2), `winner`, `reasonCode`, `finalizedAt`, `scoreVersion`, `rankingVersion`, and `topDishes`. In the GM-07.B supplement, it additionally contains integer `round1BallotCount` (0..20, >= 1 for `DECIDED`). Terminal result DTOs do not contain `sessionId` or `roomId`; the round field is named `round` (not `terminalRound`).

### Round 1 ballot count and score bounds
The field `round1BallotCount` records the exact number of complete, server-ACKed round-one ballots used to evaluate scores. For `DECIDED` results, `round1BallotCount >= 1`.
Score is defined strictly as `2 × WANT + OK`, summed over complete, server-ACKed round-one ballots only. Round-two KEEP contributes 0 score. NO dishes and round-two REMOVE dishes are ineligible.
Because each voter can contribute at most 2 points to any dish (WANT = 2, OK = 1, NO = 0), the aggregate score for every dish on the podium is strictly bounded:
$$\text{score} \le 2 \times \text{round1BallotCount} \le 40$$
Any score exceeding $2 \times \text{round1BallotCount}$ indicates corrupted vote tallies or unvetted inputs and is rejected by semantic checks.

### Strict terminal status, round, and reasonCode pairings
The terminal result schema enforces rigid 1-to-1 pairings between status, terminal round, and reason code:
- `DECIDED` at round 1 $\rightarrow$ reason code `UNANIMOUS_WANT` (unanimous WANT winner in Round 1).
- `DECIDED` at round 2 $\rightarrow$ reason code `ACCEPTABLE_FINAL` (highest R1 score among R2 survivors).
- `NO_CONSENSUS` at round 1 $\rightarrow$ reason code `EMPTY_INTERSECTION` (all dishes received at least one NO in Round 1).
- `NO_CONSENSUS` at round 2 $\rightarrow$ reason code `ALL_REMOVED` (all survivors removed in Round 2).

Any other combination (such as `DECIDED` with `EMPTY_INTERSECTION` or `DECIDED` at round 1 with `ACCEPTABLE_FINAL`) is invalid and rejected.

### Podium and podium ranks
`DECIDED` results contain `scoreVersion`, `rankingVersion`, and `topDishes` (1–3 entries). Each entry has the locked `dish` projection, nonnegative integer `score`, dense `rank`, and boolean `isWinner`. All dish IDs and roundDish IDs across `topDishes` must be mutually unique. The entry with `isWinner=true` must match the top-level `winner` object across `dishId`, `name`, and locked attributes. Ties share the same dense rank. At the third-place tie boundary, the server stores a deterministic fixed subset of at most three entries that includes the already-persisted winner. The ordered array is the immutable presentation order; equal-rank entries have equal semantic rank even if the array needs a stable order.

`NO_CONSENSUS` has `winner=null` and `topDishes=[]`. The result projection contains no raw vote, per-member score contribution, candidate matrix, seed, or hidden evaluator diagnostics. All authorized room members may read aggregate scores only after finalization, including small groups, as accepted in ADR-020. History reads the stored result subject to current consent/ACL/retention; notification payloads contain a reference only.

Persist result, winner, podium rows, score/rank versions, terminal room state and history/event references atomically or through the reviewed transactional outbox. Consumers never recalculate score from the current dataset or ballots.

## Account-scoped history consent — schema 0.9.1 candidate

The two history permissions are account settings (`personal` and `group`) managed by `update_history_consent`; a missing setting means opted out. For v4, host creation, direct join and invitation admission inherit the caller's currently enabled scope choices. Start synchronizes current account choices for the locked roster and freezes each scope independently in the session snapshot in the same transaction. A grant made after start applies only to later rooms. A revocation before result persistence suppresses and removes the affected scope without changing the winner, score or podium. Personal history is written for each member whose personal scope was locked and remains active; group history is written only when every locked roster member's group scope was locked and remains active. History reads return the stored result projection, including the same `resultId` and Top 3, subject to existing ACL, deletion and retention. No ballot details are included.

### History Query and item DTO
The history query is invoked via command `"history"` with payload `{"contractVersion": "..."}`. The server response data envelope contains:
- `items`: array of history item objects. There are no query pagination arguments or `page`/`pageSize`/`totalCount` fields in the wire transport.
- **Mandatory item fields**: `historyId` (UUID), `roomId` (UUID), `resultId` (UUID), `scope` (`"personal"` or `"group"`), `createdAt` (timestamp), `expiresAt` (timestamp), and `result`.
- Top-level history item fields do not include `sessionId`, `status`, or `terminalRound`; `status` and `round` are encapsulated inside the child `result` object.
- **Optional context projections** (when supported by producer): `desiredAt` (timestamp or null), `finalizedAt` (timestamp), `memberCount` (integer 1..20), `round1BallotCount` (integer 0..20 for v4 sessions), and `participants` (array of `{displayName, role}`).

### History result variants: Terminal result vs. Legacy unscored
Each history item's `result` field strictly conforms to one of two schemas:
1. **Full v4 terminal result** (`#/$defs/terminalResult`): Used for v4 sessions. Contains `status`, `winner`, `reasonCode`, `round`, `topDishes` (Top 3 podium entries with scores and dense ranks), `scoreVersion`, `rankingVersion`, and in the supplement `round1BallotCount`. If `round1BallotCount` is present on both the item and result, the values must match.
2. **Legacy unscored result** (`#/$defs/legacyHistoryResult`): Used for migrated legacy v1/v2/v3 sessions. Scores and podiums cannot be fabricated retroactively. A legacy item must explicitly set `capability: "legacy-unscored-v1"`, and contains only `status`, `winner` (legacy dish projection or null), `reasonCode`, and `finalizedAt`. It does not contain `round1BallotCount` (unknown cohort metadata is omitted, never fabricated as 0). It explicitly disallows `topDishes`, `scoreVersion`, `rankingVersion`, and arbitrary fields (`additionalProperties: false`).

### Strict privacy guarantee: Prohibition of raw ballots
Under no circumstances may history items or results include `rawBallots`, individual member preference contributions, or voting secrets. Both `#/$defs/historyItem` and `#/$defs/terminalResult` enforce `additionalProperties: false`. Exposing `rawBallots` anywhere in history violates privacy requirements and fails contract validation.

This is a forward-only v4 behavior. Existing v2/v3 rooms and already-started v4 sessions keep their pinned consent snapshot; do not grant them retroactively or backfill completed sessions. Migration `0029_dish_v4_history_consent.sql` registers schema `0.9.1`; its current implementation is a local QA candidate only until reviewed and deployed. This section does not claim the proposed contract or runtime is approved/merged.

## Figma consumer contract

The screen-to-contract mapping and Figma node references are in [FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md](../project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md). Result, history and notification consumers must read the same terminal projection. The API returns semantic ranks; the UI renders tied ranks at equal height and gives the selected winner a separate “Món được chọn” label. No mock restaurant/distance is returned as real data. The result screen uses Places-backed nearby restaurant/map content for the winning dish; opening Google Maps is a supplementary action, not a substitute for the in-app Places/map experience.

## Errors and acceptance examples

Keep GM-07.A error envelope and existing keys. `INSUFFICIENT_DISHES` includes `{available,requested}`. Add `ROOM_FULL`, `ROOM_LOCKED`, `ROOM_EXPIRED`, `NOT_HOST`, `NOT_MEMBER`, `VERSION_CONFLICT`, `REQUEST_ID_REUSED`, `UNSUPPORTED_FIELD` and `INVALID_INPUT` where relevant. Errors are safe for display, contain no secret or ballot.

The v4.B schema constrains envelopes and DTO shapes; semantic checks still require server tests for:

- `WANT/WANT/OK` → 5; missing or unacknowledged ballot contributes 0.
- Score fixtures `8,8,7` → dense ranks `1,1,2`.
- Zero/one/two/three eligible dishes, ties at the third-entry boundary, fixed result after retry, and winner inclusion.
- Round-one NO exclusion; round-two REMOVE exclusion; KEEP adds no points.
- R1 winner before survivor-empty check; N=0 ends R1; N≥1 opens real R2; N=1 removalCap=1 and allows REMOVE/no-REMOVE ballot; no automatic finalization or synthetic KEEP; N≥2 uses max(1,floor(.30*N)); all removed ends with no podium.
- finalize transition ACK versus terminal ACK; consumer uses response snapshot, not hardcoded round.
- Members can read post-final aggregate; outsider cannot; individual ballots/contributions remain unavailable; history follows consent/delete/TTL.
- Create/preview/join/settings/preferences with shortage and capacity race; preferences change only in lobby and pool version changes with the pool.


## Required closure before implementation handoff — 2026-10-25

[The source audit](../project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md) found gaps in this proposed artifact. GM-07 must close these in the schema, DTOs, examples and a B-specific checker together; the current A checker is not B acceptance:

- Select an explicit B opt-in transport/version discriminator and concurrency guards per command. Do not apply an undifferentiated latest room-version rule that makes concurrent complete-ballot submissions conflict unnecessarily; pool/round and idempotency semantics must be specified.
- Remove the LOBBY poolVersion=1 invariant when lobby edits can recompute the pool. Define expiry as an authorized terminal/error route, and distinguish shared room state from caller waiting so other members remain able to submit.
- Define the accepted/scored R1 cohort metadata for terminal/history score bounds. Current-round submittedCount cannot substitute for R1 count after advancing rounds.
- Publish shared history summary/detail DTOs, including no-consensus, immutable podium, allowed participants, planned-vs-finalized times and legacy capability. Do not infer consent for identity storage or fabricate legacy scores.
- Specify aggregation/tie-break for soft host/member preferences, meal eligibility separately, and selection of a comparable price observation. Unresolved choices require an owner proposal reviewed by Trí rather than silently accepted fields with no effect.
- Prove sorted/dense ranks, unique dishes, score bound, winner identity and cutoff stability with semantic fixtures. Shape validation alone is insufficient.

These are task requirements, not a declaration that the schema or runtime has already been corrected. Only BE/Data contract artifacts are active in this phase; mobile consumer changes await the separate FE scope.

## Implementation boundary

This file and its schema are contract and specification artifacts for GM-07. They do not implement GM-06/15/17/18/19/20/21/22/23, mobile client/mock screens, UI, migrations, data release, Android QA, or production publication. Those remain with task owners in [the alignment matrix](../project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md). In particular, known runtime bugs in GM-19 on PostgreSQL (such as non-host `update_settings` guard and reroll pool idempotency on desiredAt changes) are tracked separately under GM-19's supplement; this PR verifies contract schema and semantic simulation, not the GM-19 runtime fix. Keep current main runtime v3 and legacy consumers unchanged until a reviewed forward migration, producer and versioned consumer are merged.
