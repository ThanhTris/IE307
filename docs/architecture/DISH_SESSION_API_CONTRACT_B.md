# Dish session API contract — GM-07.B

Status: proposed v4.B contract, accepted product rules recorded in [ADR-020](decisions/ADR-020-public-top-three-result.md). **No v4.B runtime is deployed.** This addendum extends the forward-only GM-07.A wire proposal; it does not modify `dish-session-v3/ADR-019`, decision-v2, existing migrations, or legacy clients.

- Contract ID: `dish-session-v4/roadmap-v2/GM-07.B`.
- Lifecycle policy: `dish-decision-v4/ADR-019-30PCT-MIN1`.
- Score/rank: `want2-ok1-round1-v1` / `score-desc-dense-rank-v1`.
- Soft-ranking and history participant proposal: [ADR-021](decisions/ADR-021-soft-preference-and-history-projection.md), **Proposed** until Trí reviews the exact formula.
- JSON Schema: [dish-session-v4b.schema.json](schemas/dish-session-v4b.schema.json).
- Parent proposal: [GM-07.A](DISH_SESSION_API_CONTRACT.md).

## Compatibility and transport

Use `POST /rest/v1/rpc/dish_session_v4` as the explicit opt-in route. Its PostgREST argument object is `{command,payload}`; the B JSON Schema validates that object. Do not dispatch B through the legacy `dish_session` RPC. Every function-level B success and business-error envelope contains `contractVersion=dish-session-v4/roadmap-v2/GM-07.B` and `policyVersion=dish-decision-v4/ADR-019-30PCT-MIN1`; snapshots and terminal results repeat both. A gateway rejection before the RPC runs (for example, missing/invalid JWT `401`) remains the native Supabase transport error and is normalized by the caller's transport; it cannot be treated as function-level B output. Rooms pin these versions at creation. Calling a legacy room through B fails with `UNSUPPORTED_CONTRACT_VERSION`; no automatic upgrade or reinterpretation occurs. Existing unversioned and v3 traffic remains routed to its existing behavior. Do not infer v4 behavior from HTTP 200, health, schema registry, or this proposal alone.

The B transport and command guards are:

| Command | Required guard | Concurrency and replay rule |
|---|---|---|
| `create` | Authenticated caller; exact unique dish count 10–20 and eligible pool | `requestId` plus canonical payload hash; exact ACK replay before re-evaluation |
| `previewJoin` | Valid room code; server clock | Read-only, minimal projection, no seat reservation or user-supplied identity |
| `join` | Authenticated caller, code, not expired/locked/full | Admission serialized with invite acceptance; same caller cannot create duplicate membership |
| `snapshot` | Caller is a current room member; expiry is checked after membership | At/after expiry return `410 ROOM_EXPIRED`; outsider remains `403 NOT_MEMBER`; no expired room body is returned |
| `updateSettings`, `updatePreferences`, `start`, `cancel`, `leave`, `finalize` | `expectedVersion` plus command-specific host/member/state guard | Exact request replay is resolved before state/version/quota checks; successful mutation bumps room version once |
| `submit` | Current member, open round, matching `round` and `poolVersion`, complete ballot over exactly the locked pool | No room-version precondition: other members' accepted ballots do not stale this caller. Exact own ACK replay is stable; a different payload after an accepted ballot is rejected |
| `waiting` | Current member, open round, matching `round` and `poolVersion`, caller has an accepted complete ballot | No room-version precondition. First valid caller sets the round-wide timer once; retries do not extend it |

All writes use opaque `requestId` and a server-computed canonical payload hash. Same ID/body returns the original ACK before mutable business guards; same ID/different body returns `REQUEST_ID_REUSED`. `expectedVersion` is not a substitute for `round`/`poolVersion` on ballot commands. `submissionStatus` is shared current-round receipt state; `ownWaiting` is caller-private. `WAITING_1`/`WAITING_2` does not close submissions until the server deadline, so a member who has not submitted can still send a complete ballot before it expires. At deadline the server closes the round once; host finalize requires at least one complete accepted ballot. A timer is never created before a valid ballot ACK and waiting transition.

GM-07.B adds `previewJoin`, `updateSettings` and `updatePreferences`. `join` always rechecks membership, expiry, capacity, room state and invitation/code under the server transaction; preview is informative and does not reserve a seat. Mutations require the latest `expectedVersion`; any changed pool increments an independent `poolVersion`. A stale pool/version rejects the mutation without partially changing the room.

## Room settings, preferences and pool

The host requests an integer initial pool size from 10 through 20 and chooses meal context. Cuisine, category, flavor, temperature and budget are soft ranking preferences, not eligibility filters. Host settings and each joined member's own preferences are editable only in LOBBY. The server combines available preferences before locking the pool at `start`; unknown or missing data is neutral and never fabricated. These preferences cannot remove candidates or silently lower the requested count.

Budget comparisons are allowed only when the observation and preference share currency and unit. The server never converts a portion/group/item/kg/menu-item observation into a per-person price. Unknown price stays eligible. Recent-dish adjustment can read only history allowed by existing consent/ACL; it is a soft ranking input and never changes ballot points. `desiredAt` records the intended meal time; the host still explicitly starts, and no venue schedule, GPS, anchor or location is required.

Create/start must produce exactly the host-confirmed number of unique dishes. If available is lower than requested, return `INSUFFICIENT_DISHES` with integer `available` and `requested`. The UI may ask the host to explicitly set a lower count only when the confirmed value remains at least 10; the server does not auto-reduce or relax preferences. The current pool is immutable after start.

### Soft preference, meal and price defaults

Host and each member have equal person weight, as confirmed by Trí on 2026-10-25. Within each person, cuisine, category, temperature and flavor each contribute at most one match point: cuisine/category match on any intersection, temperature on an exact known match, and flavor on all explicitly selected known flavor attributes matching. Multiple tags in one dimension do not add points. Unknown, unselected or unavailable values contribute zero and never exclude a dish. Rank by the sum of those equal person/dimension points; next rank by the share of comparable member budgets that the observed price fits; then by the count of eligible recent-history hits from consent-authorized data; then by the pinned server seed hash ascending and stable dish ID. A missing/noncomparable price is neutral for eligibility and budget rank. The exact numeric ranking formula and tie-break remain proposed in ADR-021 for Trí's final review; they do not change the hard meal eligibility rule.

Meal eligibility is independent of preferences. A dish is eligible for a requested meal only when its source-backed meal evidence matches; `mealSlots=[]` means unknown and does not match every meal. If fewer than the requested exact unique count remain, return the real `available` and `requested`; never refill or lower the count. For a price display, choose among valid-source observations by greatest `checkedAt`, breaking a timestamp tie by stable observation UUID ascending. Never average, convert currencies/units, or present `menu_item_unspecified` as per-person. If no valid-source observation exists, project `priceReference=null`.

`previewJoin` returns only a confirmation summary (joinable state, room code/name if already public, member count/capacity, meal context and dish count). It does not return the roster, preferences, pool, ballots, result or private room metadata. The full member roster is returned only after successful join.

## Snapshot additions

The v4.B snapshot extends A with:

- `hostUserId`, `expiresAt`, and `settings` (requested count, meal slot, optional desired time and host-selected soft preferences).
- `ownPreferences`, visible only to the authenticated caller.
- Per-member `role` and `submissionStatus` for the current round (`NOT_SUBMITTED` or `ACCEPTED`). This reveals only whether a complete ballot was accepted, never its choices or caller-private waiting state.
- `removalCap`: null outside round two; for every non-empty round-two pool, `max(1, floor(0.30 × N))`, including `1` when N=1. A one-dish round is a real user ballot: the participant may REMOVE the dish or submit no removal. Never auto-finalize and never synthesize a KEEP for a member who did not submit.
- Locked pool-card projection fields listed below. Every pool, result, history and inbox fetch refers to the same immutable result snapshot once the session is terminal.

The server remains authoritative for `version`, `poolVersion`, timer, ACK status, round transition, terminal reason, scores and ranks. Keep `ownBallot`/`ownWaiting` caller-private; do not add other members' ballot details.

`poolVersion` may be greater than 1 while state is `LOBBY`; changing settings/preferences advances it only when the resulting pool content changes. A changed lobby pool also increments room `version` once and invalidates prior assumptions. `WAITING_1`/`WAITING_2` means the shared timer has started, not that all members submitted or that new ballots are closed. The member list exposes only each member's `NOT_SUBMITTED`/`ACCEPTED` status. Expired snapshots are not returned: after authenticating membership, `snapshot` returns the B error envelope with HTTP 410 and `ROOM_EXPIRED`; outsiders get 403 first. `previewJoin` may report `roomState=EXPIRED`, `joinable=false`, and `reasonCode=ROOM_EXPIRED`, without exposing roster or pool.

## Locked dish-card projection

Each `poolDish` preserves the stable `dishId` and `roundDishId` and may include nullable `description`, cuisine/category IDs and display labels, meal slots, known temperature/flavor labels, `artwork` (`uri`, `altText`, optional attribution) and one `priceReference` (`amount`, `currency`, `unit`, required source/time, optional serving size). Unknown fields are explicit `null` or empty arrays; no missing price becomes zero and no missing artwork gets an invented URL. UI uses its approved fallback. Artwork can enter a public projection only after GM-40 verifies display/use rights; an unlicensed or unknown-rights image stays null. Price keeps its observed unit and provenance. Result/history cards use the locked projection, never the current catalogue.

## Finalize acknowledgement

`finalizeAck` must represent both outcomes:

- Round transition: `outcome=ROUND_ADVANCED`, `state=ROUND_2`, `round=2`; `resultId` and `finalizedAt` are absent.
- Terminal result: `outcome=TERMINAL`, `state=DECIDED|NO_CONSENSUS`, terminal round, `resultId` and `finalizedAt` are present.

The ACK records the committed command, not a new client-side route guess. After any ACK/retry/reconnect the consumer fetches the authoritative snapshot/result and renders from it. An exact retry returns the original ACK and never rerolls or recomputes persisted data.

### Round-one terminal decision and survivor derivation

When round one is finalized, evaluate and persist a round-one winner before checking whether the survivor set is empty. If there is no winner, derive survivors from the locked initial pool by subtracting the union of dish IDs marked `NO` in every complete round-one ballot accepted by the server. Do not derive this set from a single member, the last request, or client-local state. If the resulting set is empty, persist terminal `NO_CONSENSUS` for round 1 with reason `EMPTY_INTERSECTION`; do not create `ROUND_2`, `WAITING_2`, a round-two timer, or a removal cap. If at least one survivor remains, open round two with exactly that set, even when it contains fewer than ten dishes; never replenish it from the catalogue.

## Top 3 terminal result

`DECIDED` results contain `scoreVersion`, `rankingVersion`, `scoredRound1BallotCount`, and `topDishes` (1–3 entries). Each entry has the locked `dish` projection, nonnegative integer `score`, dense `rank`, and `isWinner`. Score is `2 × WANT + OK`, summed over complete, server-ACKed round-one ballots only. Round-two KEEP contributes no score. NO dishes and round-two REMOVE dishes are ineligible. At the third-place tie boundary, the server stores a deterministic fixed subset of at most three entries that includes the already-persisted winner. The podium is ordered by descending score, then the private seeded tie key, then stable `roundDishId`; if winner inclusion replaces the cutoff item, that selected subset is sorted by the same order. Dense ranks are recomputed over the persisted selected subset, so ties share rank and ranks have no gaps. The ordered array is immutable. The winner entry's locked dish identity must equal `winner`.

`NO_CONSENSUS` has `winner=null` and `topDishes=[]`. The result projection contains no raw vote, per-member score contribution, candidate matrix, seed, or hidden evaluator diagnostics. All authorized room members may read aggregate scores only after finalization, including small groups, as accepted in ADR-020. History reads the stored result subject to current consent/ACL/retention; notification payloads contain a reference only.

Persist result, winner, podium rows, score/rank versions, terminal room state and history/event references atomically or through the reviewed transactional outbox. Consumers never recalculate score from the current dataset or ballots.

`scoredRound1BallotCount` is the count of complete R1 ballots whose ACKed choices were included in the score projection (0–20). Every displayed score must be at most `2 × scoredRound1BallotCount`; this field remains pinned through R2 and terminal history. Do not use current `submittedCount` after the round changes. Rank is dense over equal scores. The stored podium order sorts score descending, then the private seeded tie key ascending, then `roundDishId` ascending. Select the top three by this stable order; if that subset would omit the persisted winner, replace the final included item with the winner and apply the same stable order to the selected subset. This rule is evaluated once and stored, so retries return the same subset and order.

## History summary and detail DTO

GM-21 keeps its existing history RPC, <=50-item array DTO and cursor semantics; this section defines the immutable per-item summary/detail projection and does not add a page wrapper or `nextCursor`. A summary and detail both carry `generation=LEGACY_V2|LEGACY_V3|V4_B`, `contractVersion`, `policyVersion`, terminal status/reason/round, `desiredAt`, `finalizedAt`, winner and podium capability, plus `scoredRound1BallotCount` when known. V4.B stores `scoreVersion`, `rankingVersion`, the scored R1 count, winner and immutable `topDishes`; detail may include the locked dish-card list. A legacy record with no stored Top 3 or score capability returns `topDishes=null`, `lockedDishes=null`, `scoredRound1BallotCount=null`, and null score/ranking versions. A stored legacy winner may be projected only as its available `{name,artworkUrl}`; absent round/reason/time/capability remains null. Do not infer a finalized time from `desiredAt`/legacy `mealDate`, or fabricate score zero or a podium. Legacy group history without a stored consented name projection uses `GROUP_COUNT_ONLY` and an empty names array; it does not infer consent from a group row.

The participant projection is scope-specific: personal history contains `memberCount` and the caller's own user ID only; it contains no other member identity. Group history contains names only, with no user IDs, and is written/read only when every participant had valid explicit consent frozen for that session. Consent revocation immediately denies access and removes the associated participant projection/summary under GM-21 semantics; retry cannot recreate deleted history. Group/history DTOs never include roster membership roles, consent snapshots, group key, raw ballot, per-person score, location or seed. Planned meal time is `desiredAt`; it is not `finalizedAt` and never determines the 60-second decision timer.

## Figma consumer contract

The screen-to-contract mapping and Figma node references are in [FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md](../project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md). Result, history and notification consumers must read the same terminal projection. The API returns semantic ranks; the UI renders tied ranks at equal height and gives the selected winner a separate “Món được chọn” label. No mock restaurant/distance is returned as real data. The result screen uses Places-backed nearby restaurant/map content for the winning dish; opening Google Maps is a supplementary action, not a substitute for the in-app Places/map experience.

## Errors and acceptance examples

Keep GM-07.A error envelope and existing keys. `INSUFFICIENT_DISHES` includes `{available,requested}`. Add `ROOM_FULL`, `ROOM_LOCKED`, `ROOM_EXPIRED`, `NOT_HOST`, `NOT_MEMBER`, `VERSION_CONFLICT`, `REQUEST_ID_REUSED`, `UNSUPPORTED_CONTRACT_VERSION`, `BALLOT_ALREADY_ACCEPTED`, `UNSUPPORTED_FIELD` and `INVALID_INPUT` where relevant. HTTP mapping: auth missing/invalid `401`; authenticated outsider/not-host `403`; malformed input `400`; stale version, duplicate accepted ballot with a different request, reused request ID, and invalid state `409`; expired room `410`; rate limit `429`. Errors are safe for display, contain no secret or ballot. ACK retries remain stable and do not consume quota.

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

This file and its schema are proposed contract artifacts. They do not implement GM-06/15/17/18/19/20/21/22/23, mobile client/mock, UI, migrations, data release, Android QA, or production publication. Those remain with task owners in [the alignment matrix](../project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md). Keep current main runtime v3 and legacy consumers unchanged until a reviewed forward migration, producer and versioned consumer are merged.
