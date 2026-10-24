# Dish session API contract supplement

Status: proposed GM-07 contract supplement, 2026-10-24. This document defines a
new contract for implementation review. It does not change the deployed
`dish-session-v3/ADR-019` or the legacy `food-v1/roadmap-v2/GM-07.1` contract.

## Identity and compatibility

- Contract ID: `dish-session-v4/roadmap-v2/GM-07.A` (proposed).
- Session policy: `dish-decision-v4/ADR-019-30PCT` (proposed; owner-approved 30%
  rule, not implemented on main).
- Existing v2/v3 rooms retain their pinned contract and policy. A new session
  advertises both IDs in every snapshot and terminal result.
- The wire request is always `{command,payload}` and the response is always
  `{ok:true,data,...metadata}` or `{ok:false,error:{messageKey,details?},requestId?}`.
  The complete envelope, not only `payload`, is covered by the JSON Schema.
  `requestId` is opaque, nonempty and at most 128 ASCII characters. Exact
  retries use the same ID and identical body.
- Public request fields are camelCase at the RPC JSON boundary. The SQL wrapper
  may map them to its existing snake_case storage/input names.

The command set is `create`, `join`, `snapshot`, `start`, `submit`, `waiting`,
`finalize`, `cancel` and `leave`. `waiting` and `finalize` are first-class
commands; they are not undocumented variants of `submit` or `snapshot`.

Example request and response envelopes:

```json
{"command":"waiting","payload":{"requestId":"req_wait_001","roomId":"00000000-0000-4000-8000-000000000001","expectedVersion":4,"round":1,"poolVersion":1}}
{"ok":true,"requestId":"req_wait_001","data":{"accepted":true,"round":1,"poolVersion":1,"waitingStartedAt":"2026-10-24T10:00:10Z","deadline":"2026-10-24T10:01:10Z"}}
```

Business errors use the same response envelope, including errors for waiting
and finalize:

```json
{"ok":false,"requestId":"req_wait_001","error":{"messageKey":"VERSION_CONFLICT","details":{"actualVersion":5}}}
```

## Dish-only create and pool

`dish_session` remains the entry point; new sessions use the v4 contract and
policy. A create request is:

```json
{
  "command": "create",
  "payload": {
    "requestId": "req_example_001",
    "displayName": "Host",
    "dishCount": 12,
    "mealSlot": "dinner",
    "cuisineIds": [],
    "categoryIds": []
  }
}
```

`dishCount` is an integer from 10 through 20 inclusive. `mealSlot` is one of
`breakfast`, `lunch`, `dinner`, `snack`. Empty taxonomy arrays mean no taxonomy
filter. Unknown taxonomy IDs are invalid; they do not broaden a filter. No
anchor, radius, venue, offering, schedule, location, GPS, or ready field is
accepted. The server either returns exactly `dishCount` distinct catalogue
dishes or `INSUFFICIENT_DISHES` with integer `available` and `requested`; it
never lowers the count or relaxes filters.

The contract does not accept budget, flavor, temperature, time-of-day,
avoidRecent, or price filters until their inclusion semantics and data
projection are reviewed. A caller sending these fields receives
`UNSUPPORTED_FIELD`; the server must not silently accept and ignore them.

## Snapshot

Every successful v4 snapshot includes these fields, including nulls where shown.
`poolVersion` is an independent monotonically increasing pool revision and must
never be inferred from `round`. `dishCount` is the requested initial pool size
and remains 10–20 for the room lifetime; it does not constrain survivors after
round 1.

```json
{
  "contractVersion": "dish-session-v4/roadmap-v2/GM-07.A",
  "policyVersion": "dish-decision-v4/ADR-019-30PCT",
  "catalogueVersion": "1.1.0",
  "catalogueSha": "776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f",
  "roomId": "00000000-0000-4000-8000-000000000001",
  "code": "ABC234",
  "state": "ROUND_1",
  "version": 4,
  "round": 1,
  "poolVersion": 1,
  "dishCount": 12,
  "pool": [
    {"roundDishId":"00000000-0000-4000-8000-000000000011","dishId":"00000000-0000-4000-8000-000000000111","name":"Example dish 1"},
    {"roundDishId":"00000000-0000-4000-8000-000000000012","dishId":"00000000-0000-4000-8000-000000000112","name":"Example dish 2"},
    {"roundDishId":"00000000-0000-4000-8000-000000000013","dishId":"00000000-0000-4000-8000-000000000113","name":"Example dish 3"},
    {"roundDishId":"00000000-0000-4000-8000-000000000014","dishId":"00000000-0000-4000-8000-000000000114","name":"Example dish 4"},
    {"roundDishId":"00000000-0000-4000-8000-000000000015","dishId":"00000000-0000-4000-8000-000000000115","name":"Example dish 5"},
    {"roundDishId":"00000000-0000-4000-8000-000000000016","dishId":"00000000-0000-4000-8000-000000000116","name":"Example dish 6"},
    {"roundDishId":"00000000-0000-4000-8000-000000000017","dishId":"00000000-0000-4000-8000-000000000117","name":"Example dish 7"},
    {"roundDishId":"00000000-0000-4000-8000-000000000018","dishId":"00000000-0000-4000-8000-000000000118","name":"Example dish 8"},
    {"roundDishId":"00000000-0000-4000-8000-000000000019","dishId":"00000000-0000-4000-8000-000000000119","name":"Example dish 9"},
    {"roundDishId":"00000000-0000-4000-8000-000000000020","dishId":"00000000-0000-4000-8000-000000000120","name":"Example dish 10"},
    {"roundDishId":"00000000-0000-4000-8000-000000000021","dishId":"00000000-0000-4000-8000-000000000121","name":"Example dish 11"},
    {"roundDishId":"00000000-0000-4000-8000-000000000022","dishId":"00000000-0000-4000-8000-000000000122","name":"Example dish 12"}
  ],
  "members": [
    {"userId":"00000000-0000-4000-8000-000000000002","displayName":"Host"},
    {"userId":"00000000-0000-4000-8000-000000000003","displayName":"Member"}
  ],
  "submittedCount": 0,
  "memberCount": 2,
  "ownBallot": null,
  "ownWaiting": false,
  "waitingStartedAt": null,
  "deadline": null,
  "serverTime": "2026-10-24T10:00:00Z",
  "result": null
}
```

The example IDs and timestamp are synthetic. Pool dish objects contain only
allowlisted, versioned dish-catalogue projection fields. `catalogueSha` is the
SHA-256 of the activated immutable bundle, not a hash supplied by the client.
`members` contains display identity only and is visible to room members.
`ownBallot` and `ownWaiting` are caller-private; no other member's choices or
waiting flag may appear in the response. `submittedCount` counts complete,
server-accepted ballots only. A missing ballot is never interpreted as OK.

In LOBBY the host may start after joining has been opened under the room's
admission rules. In `LOBBY`, the server has already selected the exact
`dishCount` pool, so the snapshot is deterministic before the host starts:
`round=1`, `poolVersion=1`, `pool.length=dishCount`, `ownWaiting=false`,
`waitingStartedAt=null`, `deadline=null`, and `result=null`. `state=LOBBY`
never carries round-2 choices. The pool and its catalogue identity remain
visible to members while the host admits up to 20 people. Starting pins the
roster, pool, catalogue hash/version, contract and policy. There is no ready
phase.

The state/round relationship is therefore:

| State | Round | Pool/timer rule |
| --- | --- | --- |
| `LOBBY` | `1` | Exact initial pool, `poolVersion=1`, no waiting timer |
| `ROUND_1` / `WAITING_1` | `1` | Initial locked pool of exactly `dishCount` (10–20); waiting fields are null in `ROUND_1` and populated in `WAITING_1` |
| `ROUND_2` / `WAITING_2` | `2` | Only round-1 survivors; 1–20 dishes, possibly fewer than 10; a new `poolVersion`; timer is independent of round 1 |
| `DECIDED` | `1` or `2` | Winner exists; terminal result is stable and no new ballot/waiting transition is allowed |
| `NO_CONSENSUS` | `1` or `2` | No winner; active candidate `pool` is empty; terminal result is stable |
| `CANCELLED` | `1` or `2` | Terminal state is stable; no new ballot or waiting transition |

`poolVersion` is an independent server revision. The schema enforces state-based
pool bounds, lobby sentinels and round-specific private ballot choices. The
server enforces `pool.length=dishCount` for the initial pool, derives round-2
survivors from accepted ballots, and checks exact ballot coverage transactionally.

## Submit, waiting and replay

Submit includes the `round` and `poolVersion` copied from the latest snapshot.
The server rejects stale values with `VERSION_CONFLICT`; clients never derive
one from the other.

```json
{
  "command": "submit",
  "payload": {
    "requestId": "req_example_002",
    "roomId": "00000000-0000-4000-8000-000000000001",
    "expectedVersion": 4,
    "round": 1,
    "poolVersion": 1,
    "votes": [{"roundDishId":"00000000-0000-4000-8000-000000000011","choice":"WANT"}]
  }
}
```

The vote set must cover the full current pool exactly once. Choices are
`WANT`/`OK`/`NO` in round 1 and `KEEP`/`REMOVE` in round 2. The schema has
separate `round1Vote` and `round2Vote` definitions selected by the request's
`round`, so a round-1 request containing `KEEP` or a round-2 request containing
`WANT` is invalid before the server evaluates business state. The server still
validates exact pool coverage and room membership transactionally. The ACK
describes the committed request only:

```json
{"ok":true,"requestId":"req_example_002","data":{"accepted":true,"round":1,"poolVersion":1,"submittedAt":"2026-10-24T10:00:10Z"}}
```

An exact retry returns the same ACK. It does not claim the room is still at that
round. Clients fetch a new snapshot after an ACK or reconnect and use that
snapshot for the next command. Reusing a request ID with a different body is
`REQUEST_ID_REUSED`.

`waiting` is a distinct command, allowed only after the caller's complete ballot
has been accepted. On the first valid transition to waiting for a round, the
server sets `waitingStartedAt` once and `deadline = waitingStartedAt + 60s`.
Submitting a ballot or receiving its ACK alone does not start the timer. Further
waiters, retries, reconnects and remounts do not move the deadline. Round 2 has
its own waiting timestamp/deadline. The host may issue the terminal `finalize`
command immediately, subject to quorum and ownership checks.

Timeout/finalize quorum is at least one complete accepted ballot. Missing
members do not contribute choices. Final state is stable under retry and
reconnect; late submissions cannot change a terminal result. A member who missed
round 1 may submit in an open round 2 using its current snapshot and locked pool.

`waiting` returns `WaitingAck` with `accepted`, `round`, `poolVersion`,
`waitingStartedAt` and `deadline`. `finalize` returns `FinalizeAck` with
`accepted`, terminal `state`, `round`, `resultId` and `finalizedAt`; the full
terminal result remains available through the next snapshot. These DTOs are
defined in the schema and are not inferred from a generic `data` object.

## Round 2 policy

For the new policy only, first evaluate whether round 1 already produced a
winner. If it did, persist and return that winner; do not let an empty survivor
pool overwrite a `DECIDED` result. Otherwise derive the round-2 pool from the
locked round-1 pool by removing the union of dishes marked `NO` in all complete,
server-accepted round-1 ballots. Missing ballots are not `OK` and do not add
choices to this union. `N` is the size of this derived pool, not `dishCount` and
not the count a single player kept. If `N=0`, immediately persist
`NO_CONSENSUS` with `EMPTY_INTERSECTION` in round 1; do not create an empty
round-2 state or start its timer. If `N>0`, round 2 uses exactly those `N`
dishes; do not add or draw replacement dishes, and `N` may be below 10. If
`N=1`, skip elimination and finalize using the established decision rules. If
`N>=2`, an individual may REMOVE at most
`max(1, floor(0.30 * N))` dishes. This is a limit, not a required number of
removals; KEEP all is valid. All NO dishes remain excluded. If all candidates
are removed in round 2, persist `NO_CONSENSUS` with `ALL_REMOVED`; the terminal
snapshot has an empty active candidate pool. Never restore a NO/REMOVE dish as
winner. This rule is pinned only to the proposed v4 policy; v2/v3 are unchanged.

## Terminal result, history and event references

The terminal result is a stable, private-reference projection:

```json
{
  "resultId":"00000000-0000-4000-8000-000000000021",
  "contractVersion":"dish-session-v4/roadmap-v2/GM-07.A",
  "policyVersion":"dish-decision-v4/ADR-019-30PCT",
  "status":"DECIDED",
  "round":2,
  "winner": {"roundDishId":"00000000-0000-4000-8000-000000000011","dishId":"00000000-0000-4000-8000-000000000012","name":"Example dish"},
  "reasonCode":"UNANIMOUS_WANT",
  "finalizedAt":"2026-10-24T10:01:10Z"
}
```

For `NO_CONSENSUS`, `winner` is null, the terminal snapshot's active candidate
pool is empty, and `reasonCode` is `EMPTY_INTERSECTION` (no round-1 survivors)
or `ALL_REMOVED` (round-2 ballots removed every survivor); do not create a fake
winner or offering. `resultId`, status, policy,
round, finalizedAt and nullable winner form the terminal seam consumed by
history and events. History projections expose only results allowed by explicit
consent, ACL and retention rules. Event/inbox payloads reference IDs/status and
contract version only; recipients fetch authorized details from the server.
Neither projection may expose raw ballots, seed, score matrix or private
idempotency data.

### Decision still required before Top 3/score implementation

Top 3/score is outside this contract's enabled response fields. Owner review must
decide score formula/version, rank semantics, ties, whether fewer than three
candidates are returned, minimum group size and who can see aggregates. Until
that decision is recorded, do not return `top3`, `rank`, or `score` fields and do
not infer them from evaluator fixtures. This keeps the room/result/history/event
contract implementable without publishing an unreviewed aggregate.

## Common errors

| `messageKey` | Meaning |
| --- | --- |
| `INVALID_INPUT` | Invalid field, enum, count, timestamp or vote set |
| `UNSUPPORTED_FIELD` | Request uses a field whose semantics are not enabled |
| `AUTH_REQUIRED` | Missing/invalid caller session |
| `NOT_MEMBER` / `NOT_HOST` | Caller lacks room or host authority |
| `ROOM_NOT_FOUND` | No room visible to caller |
| `VERSION_CONFLICT` | Snapshot version, round or poolVersion is stale |
| `REQUEST_ID_REUSED` | Same requestId used with different canonical payload |
| `INCOMPLETE_BALLOT` | Ballot does not cover exactly the round pool |
| `ROOM_TERMINAL` | Mutation attempted after terminal state |
| `INSUFFICIENT_DISHES` | Exact requested pool cannot be built; includes available/requested |
| `RATE_LIMITED` | Caller exceeded the endpoint quota |
| `WORKER_NOT_READY` | Required server worker heartbeat is missing/stale |

For RPC business failures, the proposed envelope is
`{ok:false,error:{messageKey,details?},requestId?}`; do not branch on a fixed
HTTP status for these errors. Authentication/transport failures may be rejected
before the RPC and retain the platform's HTTP status. Runtime tasks must record
the actual status and body for each case.

Existing platform and business error mappings remain stable where applicable.
Errors must not reveal hidden membership, other users' ballots or private
identities to outsiders.

## Inputs and remaining implementation gates

- Source baseline: main `fdb03ea097ddea49a601fce2ac045d161bfc76a2`;
  migration `0026_dish_session_policy.sql`; catalogue manifest
  `dish-catalogue-v1/roadmap-v2/GM-40.1`, dataset `1.1.0`, SHA-256
  `776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`.
- This is a proposed forward contract only. No consumer/runtime migration or
  deployed API is claimed. GM-18/19/20/21/22/23 must implement forward changes
  and preserve existing policy behavior.
- Contract tests must validate actual HTTP snapshot, then construct submit and
  waiting requests only from that response; validate exact retry ACK separately
  from the current snapshot; cover unknown versions/errors and missing fields.
- GM-03/06/17 environment, migration ledger/hash reconciliation, worker
  preflight, ACL and retention remain independent gates. Do not deploy or reset
  an application database to test this draft.
- Mobile client, mock, screens and Android checks are downstream follow-up;
  their current contract remains unchanged until a consumer task adopts this
  supplement.
