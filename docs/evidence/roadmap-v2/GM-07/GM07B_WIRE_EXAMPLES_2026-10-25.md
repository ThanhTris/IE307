# GM-07.B wire examples — 2026-10-25

These examples describe the proposed B route only. No B runtime is deployed at baseline `346dc7c`.

## Create on the explicit B route

```http
POST /rest/v1/rpc/dish_session_v4
Authorization: Bearer <guest_access_token>
Content-Type: application/json
```

```json
{
  "command": "create",
  "payload": {
    "requestId": "req_create_demo_01",
    "displayName": "An",
    "settings": {
      "dishCount": 10,
      "mealSlot": "dinner",
      "desiredAt": "2026-10-25T12:00:00Z"
    },
    "preferences": {
      "cuisineIds": [],
      "categoryIds": [],
      "temperature": null,
      "flavor": null,
      "budget": null,
      "avoidRecent": false
    }
  }
}
```

Success response (`HTTP 200`):

```json
{
  "ok": true,
  "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
  "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
  "requestId": "req_create_demo_01",
  "data": {
    "roomId": "00000000-0000-4000-8000-000000000001",
    "code": "ABC123",
    "version": 1,
    "expiresAt": "2026-10-25T13:00:00Z"
  }
}
```

## Complete ballot, then start waiting

An R1 ballot contains one choice for every dish in the locked pool. `expectedVersion` is intentionally absent: another member's ballot does not make this caller's still-valid ballot stale.

```json
{
  "command": "submit",
  "payload": {
    "requestId": "req_ballot_demo_01",
    "roomId": "00000000-0000-4000-8000-000000000001",
    "round": 1,
    "poolVersion": 3,
    "votes": [
      {"roundDishId": "10000000-0000-4000-8000-000000000001", "choice": "WANT"},
      {"roundDishId": "10000000-0000-4000-8000-000000000002", "choice": "OK"},
      {"roundDishId": "10000000-0000-4000-8000-000000000003", "choice": "WANT"},
      {"roundDishId": "10000000-0000-4000-8000-000000000004", "choice": "OK"},
      {"roundDishId": "10000000-0000-4000-8000-000000000005", "choice": "WANT"},
      {"roundDishId": "10000000-0000-4000-8000-000000000006", "choice": "OK"},
      {"roundDishId": "10000000-0000-4000-8000-000000000007", "choice": "WANT"},
      {"roundDishId": "10000000-0000-4000-8000-000000000008", "choice": "OK"},
      {"roundDishId": "10000000-0000-4000-8000-000000000009", "choice": "WANT"},
      {"roundDishId": "10000000-0000-4000-8000-000000000010", "choice": "OK"}
    ]
  }
}
```

The ballot contains all ten locked pool dishes exactly once. Only after the submit ACK may the caller send:

```json
{
  "command": "waiting",
  "payload": {
    "requestId": "req_wait_demo_01",
    "roomId": "00000000-0000-4000-8000-000000000001",
    "round": 1,
    "poolVersion": 3
  }
}
```

The first valid waiting ACK sets `waitingStartedAt` and `deadline`. A second member may submit while the shared snapshot already says `WAITING_1`, until server time reaches that deadline.

## Expired room and version mismatch

For a snapshot request, the server authenticates membership before checking expiry. An outsider receives `403 NOT_MEMBER`; an expired room member receives HTTP `410` and this B envelope, with no room/pool/private data:

```json
{
  "ok": false,
  "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
  "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
  "error": {"messageKey": "ROOM_EXPIRED"}
}
```

Mutations pinned to another policy version fail with `UNSUPPORTED_CONTRACT_VERSION`; the server does not reinterpret or migrate that room during a request.

## Finalize ACK variants

After an R1 transition:

```json
{"accepted": true, "outcome": "ROUND_ADVANCED", "state": "ROUND_2", "round": 2}
```

After a terminal decision:

```json
{"accepted": true, "outcome": "TERMINAL", "state": "DECIDED", "round": 2,
 "resultId": "00000000-0000-4000-8000-000000000099", "finalizedAt": "2026-10-25T10:01:10Z"}
```

The client follows the ACK with an authorized snapshot/result read; it must not infer the next screen from the command name or hardcode a round.

## Immutable terminal Top 3 projection

The result fetch uses the stored R1 cohort count and score/ranking versions. The winner's dish identity matches its podium entry; scores `8,8,7` use dense ranks `1,1,2`:

```json
{
  "ok": true,
  "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
  "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
  "data": {
    "resultId": "00000000-0000-4000-8000-000000000099",
    "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
    "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
    "status": "DECIDED",
    "round": 2,
    "winner": {"roundDishId":"10000000-0000-4000-8000-000000000001","dishId":"20000000-0000-4000-8000-000000000001","name":"Dish 1","description":null,"mealSlots":["dinner"],"cuisineIds":[],"cuisineLabels":[],"categoryIds":[],"categoryLabels":[],"temperature":"unknown","flavor":null,"artwork":null,"priceReference":null},
    "reasonCode": "ACCEPTABLE_FINAL",
    "finalizedAt": "2026-10-25T10:01:10Z",
    "scoreVersion": "want2-ok1-round1-v1",
    "rankingVersion": "score-desc-dense-rank-v1",
    "scoredRound1BallotCount": 4,
    "topDishes": [
      {"dish":{"roundDishId":"10000000-0000-4000-8000-000000000001","dishId":"20000000-0000-4000-8000-000000000001","name":"Dish 1","description":null,"mealSlots":["dinner"],"cuisineIds":[],"cuisineLabels":[],"categoryIds":[],"categoryLabels":[],"temperature":"unknown","flavor":null,"artwork":null,"priceReference":null},"score":8,"rank":1,"isWinner":true},
      {"dish":{"roundDishId":"10000000-0000-4000-8000-000000000002","dishId":"20000000-0000-4000-8000-000000000002","name":"Dish 2","description":null,"mealSlots":["dinner"],"cuisineIds":[],"cuisineLabels":[],"categoryIds":[],"categoryLabels":[],"temperature":"unknown","flavor":null,"artwork":null,"priceReference":null},"score":8,"rank":1,"isWinner":false},
      {"dish":{"roundDishId":"10000000-0000-4000-8000-000000000003","dishId":"20000000-0000-4000-8000-000000000003","name":"Dish 3","description":null,"mealSlots":["dinner"],"cuisineIds":[],"cuisineLabels":[],"categoryIds":[],"categoryLabels":[],"temperature":"unknown","flavor":null,"artwork":null,"priceReference":null},"score":7,"rank":2,"isWinner":false}
    ]
  }
}
```

## Legacy history capability

When a legacy row has only a winner and count, the projection keeps those facts and explicitly leaves unavailable fields null. It does not manufacture a score, round, consented roster or podium:

```json
{
  "historyId": "00000000-0000-4000-8000-000000000099",
  "generation": "LEGACY_V3",
  "contractVersion": "dish-session-v3/ADR-019",
  "policyVersion": null,
  "status": "DECIDED",
  "round": null,
  "reasonCode": null,
  "desiredAt": null,
  "finalizedAt": "2026-10-25T10:01:10Z",
  "participants": {"visibility": "GROUP_COUNT_ONLY", "memberCount": 4, "selfUserId": null, "names": []},
  "winner": {"name": "Legacy dish", "artworkUrl": null},
  "topDishes": null,
  "scoredRound1BallotCount": null,
  "scoreVersion": null,
  "rankingVersion": null
}
```

The group names-only projection is a different mode and is available only when all participants' explicit session consents were valid and frozen for that result.
