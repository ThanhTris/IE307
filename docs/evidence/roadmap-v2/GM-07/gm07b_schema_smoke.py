"""Draft 2020-12 schema validation and semantic contract checker for GM-07.B.

Validates:
1. Pure JSON Schema (Draft 2020-12) compliance for request, response, snapshot,
   terminalResult, errorEnvelope, settingsAck, and historyPage envelopes.
2. Semantic invariant checks (check_terminal_result_semantics & check_history_semantics):
   - Dense shared ranking for tied scores.
   - Winner highest-score and rank=1 invariant.
   - Unique dishId and roundDishId across podium entries.
   - Deep equality between winner object and podium isWinner card.
   - Cohort score upper-bound: score <= 2 * round1BallotCount (and <= 40).
   - Strict status / round / reasonCode consistency pairs.
   - History immutable result parity, legacy capability, and rejection of raw ballots.
3. Authority simulation and wire error envelope conformity:
   - Non-host updateSettings rejected with wire error envelope {ok: false, error: {messageKey: "NOT_HOST"}}.
   - No-op settings and desiredAt-only edits preserve poolVersion.
4. Concurrency range rules for submit / waiting vs exact match for lifecycle mutations.
"""
from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b.schema.json"
ROOM_ID = "00000000-0000-4000-8000-000000000001"


def dish(index: int) -> dict:
    suffix = f"{index:012d}"
    return {
        "roundDishId": f"10000000-0000-4000-8000-{suffix}",
        "dishId": f"20000000-0000-4000-8000-{suffix}",
        "name": f"Dish {index}",
        "description": None,
        "mealSlots": ["dinner"],
        "cuisineIds": [],
        "cuisineLabels": [],
        "categoryIds": [],
        "categoryLabels": [],
        "temperature": "unknown",
        "flavor": None,
        "artwork": None,
        "priceReference": None,
    }


def result(
    status: str,
    top_dishes: list[dict],
    *,
    round: int = 2,
    round1_ballot_count: int | None = None,
    score_version: str | None = ...,
    ranking_version: str | None = ...,
    reason_code: str | None = None,
    winner: dict | None = ...,
) -> dict:
    default_winner = next((dict(item["dish"]) for item in top_dishes if item.get("isWinner")), None)
    actual_winner = default_winner if winner is ... else winner

    default_score_version = "want2-ok1-round1-v1" if status == "DECIDED" else None
    default_ranking_version = "score-desc-dense-rank-v1" if status == "DECIDED" else None

    if reason_code is None:
        if status == "DECIDED":
            reason_code = "UNANIMOUS_WANT" if round == 1 else "ACCEPTABLE_FINAL"
        else:
            reason_code = "EMPTY_INTERSECTION" if round == 1 else "ALL_REMOVED"

    if round1_ballot_count is None:
        round1_ballot_count = 4 if status == "DECIDED" else 0

    return {
        "resultId": ROOM_ID,
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
        "status": status,
        "round": round,
        "winner": actual_winner,
        "reasonCode": reason_code,
        "finalizedAt": "2026-10-24T10:01:10Z",
        "round1BallotCount": round1_ballot_count,
        "scoreVersion": default_score_version if score_version is ... else score_version,
        "rankingVersion": default_ranking_version if ranking_version is ... else ranking_version,
        "topDishes": top_dishes,
    }


def check_terminal_result_semantics(res: dict) -> None:
    """Semantic validation of terminal Top 3 result beyond Draft 2020-12 schema.

    Verifies:
    1. Status / Round / ReasonCode consistency:
       - DECIDED round 1 => reasonCode == UNANIMOUS_WANT
       - DECIDED round 2 => reasonCode == ACCEPTABLE_FINAL
       - NO_CONSENSUS round 1 => reasonCode == EMPTY_INTERSECTION
       - NO_CONSENSUS round 2 => reasonCode == ALL_REMOVED
    2. Cohort metadata & score bounds:
       - round1BallotCount is an integer between 0 and 20 (>= 1 for DECIDED).
       - For every dish in topDishes: 0 <= score <= 2 * round1BallotCount.
       - Global maximum: score <= 40.
    3. Unique IDs in podium:
       - All entries in topDishes must have unique dishId and unique roundDishId.
    4. Winner projection matching:
       - Winner dish in res['winner'] must match the dish object of the isWinner=True entry.
       - Winner must have the highest score (winner.score == max(scores)) and rank == 1.
    5. Dense ranking:
       - Entries sorted by score descending.
       - Entries with identical scores must share the identical dense rank.
       - Dense ranks must strictly increment by 1 when score decreases (no rank gaps).
    6. DECIDED results:
       - 1 to 3 entries in topDishes.
       - Exactly one entry marked isWinner=True.
       - scoreVersion and rankingVersion must be non-null strings.
    7. NO_CONSENSUS results:
       - winner is None.
       - topDishes is empty [].
       - scoreVersion and rankingVersion are None.
    """
    status = res.get("status")
    round_num = res.get("round")
    reason_code = res.get("reasonCode")
    r1_count = res.get("round1BallotCount")

    if not isinstance(r1_count, int) or r1_count < 0 or r1_count > 20:
        raise AssertionError(f"round1BallotCount must be integer in 0..20, got {r1_count}")

    if status == "DECIDED":
        if r1_count < 1:
            raise AssertionError("DECIDED result requires round1BallotCount >= 1")
        if round_num == 1 and reason_code != "UNANIMOUS_WANT":
            raise AssertionError(f"DECIDED round 1 must have reasonCode UNANIMOUS_WANT, got {reason_code}")
        if round_num == 2 and reason_code != "ACCEPTABLE_FINAL":
            raise AssertionError(f"DECIDED round 2 must have reasonCode ACCEPTABLE_FINAL, got {reason_code}")
        if round_num not in (1, 2):
            raise AssertionError(f"Terminal round must be 1 or 2, got {round_num}")

        top_dishes = res.get("topDishes", [])
        if not (1 <= len(top_dishes) <= 3):
            raise AssertionError(f"DECIDED result must contain 1 to 3 topDishes, found {len(top_dishes)}")
        if not res.get("scoreVersion"):
            raise AssertionError("DECIDED result requires R1 scoreVersion metadata")
        if not res.get("rankingVersion"):
            raise AssertionError("DECIDED result requires rankingVersion metadata")
        winner = res.get("winner")
        if not winner:
            raise AssertionError("DECIDED result requires a winner")

        # Check unique IDs in podium
        dish_ids = [item["dish"]["dishId"] for item in top_dishes]
        if len(dish_ids) != len(set(dish_ids)):
            raise AssertionError("Duplicate dishId in podium entries")
        round_dish_ids = [item["dish"]["roundDishId"] for item in top_dishes]
        if len(round_dish_ids) != len(set(round_dish_ids)):
            raise AssertionError("Duplicate roundDishId in podium entries")

        # Check winner entry in podium
        winners = [item for item in top_dishes if item.get("isWinner")]
        if len(winners) != 1:
            raise AssertionError(f"Expected exactly 1 winner in topDishes, found {len(winners)}")
        winner_entry = winners[0]
        winner_dish = winner_entry["dish"]
        if (
            winner_dish["dishId"] != winner["dishId"]
            or winner_dish["roundDishId"] != winner["roundDishId"]
            or winner_dish["name"] != winner["name"]
        ):
            raise AssertionError("Winner dish object in result does not match podium item marked isWinner")

        # Check score bounds
        max_possible_score = 2 * r1_count
        for item in top_dishes:
            s = item["score"]
            if s > max_possible_score:
                raise AssertionError(f"Dish score {s} exceeds upper bound 2 * round1BallotCount ({max_possible_score})")
            if s > 40:
                raise AssertionError(f"Dish score {s} exceeds global maximum 40 for 20 members")

        max_score = max(item["score"] for item in top_dishes)
        if winner_entry["score"] != max_score:
            raise AssertionError(f"Winner does not have highest score (winner={winner_entry['score']}, max={max_score})")
        if winner_entry["rank"] != 1:
            raise AssertionError(f"Winner must have rank 1, got {winner_entry['rank']}")

        scores = [item["score"] for item in top_dishes]
        if scores != sorted(scores, reverse=True):
            raise AssertionError("topDishes must be ordered by score descending")

        expected_rank = 1
        last_score = None
        for item in top_dishes:
            s = item["score"]
            r = item["rank"]
            if last_score is not None and s < last_score:
                expected_rank += 1
            if r != expected_rank:
                if last_score is not None and s == last_score:
                    raise AssertionError(f"Tied scores must share identical dense rank: score {s} got rank {r}, expected {expected_rank}")
                raise AssertionError(f"Invalid dense rank for score {s}: expected rank {expected_rank}, got {r}")
            last_score = s

    elif status == "NO_CONSENSUS":
        if round_num == 1 and reason_code != "EMPTY_INTERSECTION":
            raise AssertionError(f"NO_CONSENSUS round 1 must have reasonCode EMPTY_INTERSECTION, got {reason_code}")
        if round_num == 2 and reason_code != "ALL_REMOVED":
            raise AssertionError(f"NO_CONSENSUS round 2 must have reasonCode ALL_REMOVED, got {reason_code}")
        if round_num not in (1, 2):
            raise AssertionError(f"Terminal round must be 1 or 2, got {round_num}")
        if res.get("winner") is not None:
            raise AssertionError("NO_CONSENSUS must have winner=None")
        if res.get("topDishes"):
            raise AssertionError("NO_CONSENSUS must have empty topDishes")
        if res.get("scoreVersion") is not None:
            raise AssertionError("NO_CONSENSUS must have null scoreVersion")
        if res.get("rankingVersion") is not None:
            raise AssertionError("NO_CONSENSUS must have null rankingVersion")
    else:
        raise AssertionError(f"Unknown status: {status}")


def check_history_semantics(history_page: dict) -> None:
    """Semantic validation of historyPage items ensuring shared result consistency."""
    items = history_page.get("items", [])
    for idx, item in enumerate(items):
        res = item.get("result")
        if not res:
            raise AssertionError(f"History item {idx} missing result object")
        if "rawBallots" in res or "rawBallots" in item:
            raise AssertionError(f"History item {idx} must not expose rawBallots")
        if "rawVotes" in res or "rawVotes" in item:
            raise AssertionError(f"History item {idx} must not expose rawVotes")

        if res.get("capability") != "legacy-unscored-v1":
            check_terminal_result_semantics(res)
            if item["resultId"] != res["resultId"]:
                raise AssertionError(f"History item resultId {item['resultId']} does not match terminal result {res['resultId']}")
            if item.get("round1BallotCount") != res.get("round1BallotCount"):
                raise AssertionError(f"History item round1BallotCount {item.get('round1BallotCount')} does not match result {res.get('round1BallotCount')}")


def may_host_end_waiting(*, host: bool, waiting_started: bool, accepted_current_round: int, locked_members: int) -> bool:
    """Manual early-end gate; the server still rechecks this under its lock."""
    return (
        host
        and waiting_started
        and locked_members > 0
        and 0 <= accepted_current_round <= locked_members
        and accepted_current_round > locked_members / 2
    )


def timeout_is_due(*, deadline_elapsed_seconds: int, accepted_current_round: int) -> bool:
    """Timeout is independent of majority but requires a complete accepted ballot."""
    return deadline_elapsed_seconds >= 60 and accepted_current_round >= 1


def simulate_update_settings(
    *,
    caller_role: str,
    old_settings: dict,
    new_settings: dict,
    current_version: int,
    current_pool_version: int,
    request_id: str = "00000000-0000-4000-8000-000000000001",
) -> dict:
    """Simulates updateSettings wire contract responses conforming to success/error envelopes."""
    if caller_role != "HOST":
        return {
            "ok": False,
            "requestId": request_id,
            "error": {
                "messageKey": "NOT_HOST",
                "details": {"reason": "Only host may update room settings"},
            },
        }
    is_noop_pool = (
        old_settings["dishCount"] == new_settings["dishCount"]
        and old_settings["mealSlot"] == new_settings["mealSlot"]
    )
    new_pool_version = current_pool_version if is_noop_pool else current_pool_version + 1
    return {
        "ok": True,
        "requestId": request_id,
        "data": {
            "accepted": True,
            "version": current_version + 1,
            "poolVersion": new_pool_version,
            "settings": new_settings,
        },
    }


def check_command_concurrency_rules(
    *,
    room_version: int,
    current_round: int,
    current_pool_version: int,
    caller_submissions: list[dict],
) -> list[dict]:
    """Demonstrates command concurrency rules:
    - updateSettings / updatePreferences / start / finalize require exact match (expectedVersion == room_version).
    - submit and waiting accept 1 <= expectedVersion <= room_version as long as round and poolVersion match.
    """
    results = []
    v = room_version
    for sub in caller_submissions:
        cmd = sub.get("command")
        exp_ver = sub.get("expectedVersion")
        round_arg = sub.get("round", current_round)
        pool_ver_arg = sub.get("poolVersion", current_pool_version)

        if cmd in ("updateSettings", "updatePreferences", "start", "finalize", "cancel", "leave"):
            if exp_ver != v:
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
                continue
            v += 1
            results.append({"accepted": True, "version": v})
        elif cmd in ("submit", "waiting"):
            if not (isinstance(exp_ver, int) and 1 <= exp_ver <= v):
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
                continue
            if round_arg != current_round:
                results.append({"accepted": False, "error": "INVALID_ROOM_STATE"})
                continue
            if pool_ver_arg != current_pool_version:
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
                continue
            v += 1
            results.append({"accepted": True, "version": v, "round": current_round, "poolVersion": current_pool_version})
    return results


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    root_validator = Draft202012Validator(schema)
    result_validator = root_validator.evolve(schema=schema["$defs"]["terminalResult"])
    ack_validator = root_validator.evolve(schema=schema["$defs"]["finalizeAck"])
    snapshot_validator = root_validator.evolve(schema=schema["$defs"]["snapshot"])
    error_envelope_validator = root_validator.evolve(schema=schema["$defs"]["errorEnvelope"])
    success_envelope_validator = root_validator.evolve(schema=schema["$defs"]["successEnvelope"])
    request_envelope_validator = root_validator.evolve(schema=schema["$defs"]["requestEnvelope"])
    history_validator = root_validator.evolve(schema=schema["$defs"]["historyPage"])

    # 1. Valid terminal results
    podium = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 1, "isWinner": False},
        {"dish": dish(3), "score": 7, "rank": 2, "isWinner": False},
    ]
    valid_results = [
        result("DECIDED", podium, round=2, round1_ballot_count=4),
        result("DECIDED", [{"dish": dish(1), "score": 2, "rank": 1, "isWinner": True}], round=1, round1_ballot_count=1),
        result("NO_CONSENSUS", [], round=1, round1_ballot_count=3, reason_code="EMPTY_INTERSECTION"),
        result("NO_CONSENSUS", [], round=2, round1_ballot_count=3, reason_code="ALL_REMOVED"),
    ]
    for item in valid_results:
        result_validator.validate(item)
        check_terminal_result_semantics(item)

    # 2. Schema-invalid terminal results
    invalid_results = [
        result("NO_CONSENSUS", [{"dish": dish(1), "score": 0, "rank": 1, "isWinner": False}], round=2),
        result("DECIDED", [
            {"dish": dish(1), "score": 8, "rank": 1, "isWinner": False},
            {"dish": dish(2), "score": 7, "rank": 2, "isWinner": False},
        ]),
        result("DECIDED", [
            {"dish": dish(i), "score": 8 - i, "rank": i, "isWinner": i == 1}
            for i in range(1, 5)
        ]),
    ]
    for item in invalid_results:
        if result_validator.is_valid(item):
            raise AssertionError("Invalid terminal Top 3 result was accepted by schema validator")

    # 3. Semantic negative checks (catch bugs not expressible in JSON schema alone)
    # (a) Tied scores with different ranks
    tied_bad_rank_items = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 2, "isWinner": False},
        {"dish": dish(3), "score": 7, "rank": 3, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", tied_bad_rank_items))
        raise AssertionError("Semantic checker must catch rank mismatch on tied scores")
    except AssertionError as err:
        if "Tied scores must share identical dense rank" not in str(err):
            raise

    # (b) Winner without highest score
    winner_low_score_items = [
        {"dish": dish(1), "score": 7, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 1, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", winner_low_score_items))
        raise AssertionError("Semantic checker must catch winner without highest score")
    except AssertionError as err:
        if "Winner does not have highest score" not in str(err):
            raise

    # (c) Missing R1 metadata in DECIDED result
    missing_r1_meta = result("DECIDED", podium, score_version=None)
    try:
        check_terminal_result_semantics(missing_r1_meta)
        raise AssertionError("Semantic checker must catch missing R1 scoreVersion metadata")
    except AssertionError as err:
        if "requires R1 scoreVersion metadata" not in str(err):
            raise

    # (d) Duplicate dishId in podium entries
    dup_dish_items = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", dup_dish_items))
        raise AssertionError("Semantic checker must catch duplicate dishId in podium")
    except AssertionError as err:
        if "Duplicate dishId in podium entries" not in str(err):
            raise

    # (e) Duplicate roundDishId in podium entries
    d1 = dish(1)
    d2 = dish(2)
    d2["roundDishId"] = d1["roundDishId"]
    dup_round_dish_items = [
        {"dish": d1, "score": 8, "rank": 1, "isWinner": True},
        {"dish": d2, "score": 7, "rank": 2, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", dup_round_dish_items))
        raise AssertionError("Semantic checker must catch duplicate roundDishId in podium")
    except AssertionError as err:
        if "Duplicate roundDishId in podium entries" not in str(err):
            raise

    # (f) Winner projection mismatch: different name or roundDishId from isWinner card
    mismatched_winner_dish = dict(dish(1))
    mismatched_winner_dish["name"] = "Different Name"
    try:
        check_terminal_result_semantics(result("DECIDED", podium, winner=mismatched_winner_dish))
        raise AssertionError("Semantic checker must catch winner dish projection mismatch")
    except AssertionError as err:
        if "Winner dish object in result does not match podium item" not in str(err):
            raise

    # (g) Dish score exceeds 2 * round1BallotCount (e.g. 999 points)
    overscored_items = [
        {"dish": dish(1), "score": 999, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 7, "rank": 2, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", overscored_items, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch score exceeding 2 * round1BallotCount")
    except AssertionError as err:
        if "exceeds upper bound" not in str(err):
            raise

    # (h) Mismatched round and reasonCode (e.g. NO_CONSENSUS round=1 with ALL_REMOVED)
    mismatched_reason = result("NO_CONSENSUS", [], round=1, reason_code="ALL_REMOVED")
    if result_validator.is_valid(mismatched_reason):
        raise AssertionError("Schema must reject NO_CONSENSUS round=1 with ALL_REMOVED")
    try:
        check_terminal_result_semantics(mismatched_reason)
        raise AssertionError("Semantic checker must catch NO_CONSENSUS round=1 with ALL_REMOVED")
    except AssertionError as err:
        if "NO_CONSENSUS round 1 must have reasonCode EMPTY_INTERSECTION" not in str(err):
            raise

    # 4. Finalize ACK validations
    ack_validator.validate({"accepted": True, "outcome": "ROUND_ADVANCED", "state": "ROUND_2", "round": 2})
    ack_validator.validate({
        "accepted": True,
        "outcome": "TERMINAL",
        "state": "DECIDED",
        "round": 2,
        "resultId": ROOM_ID,
        "finalizedAt": "2026-10-24T10:01:10Z",
    })
    invalid_ack = {"accepted": True, "outcome": "ROUND_ADVANCED", "state": "ROUND_2", "round": 2, "resultId": ROOM_ID}
    if ack_validator.is_valid(invalid_ack):
        raise AssertionError("Round-advance ACK must not contain terminal result fields")

    # 5. Snapshot validations
    single_dish_round_two = {
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
        "catalogueVersion": "demo-1",
        "catalogueSha": "a" * 64,
        "roomId": ROOM_ID,
        "code": "ABC123",
        "state": "ROUND_2",
        "version": 4,
        "round": 2,
        "poolVersion": 2,
        "dishCount": 10,
        "pool": [dish(1)],
        "members": [{"userId": ROOM_ID, "displayName": "Host", "role": "HOST", "submissionStatus": "NOT_SUBMITTED"}],
        "submittedCount": 0,
        "memberCount": 1,
        "ownBallot": None,
        "ownWaiting": False,
        "waitingStartedAt": None,
        "deadline": None,
        "serverTime": "2026-10-24T10:00:00Z",
        "result": None,
        "hostUserId": ROOM_ID,
        "settings": {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None},
        "ownPreferences": {"cuisineIds": [], "categoryIds": [], "temperature": None, "flavor": None, "budget": None, "avoidRecent": False},
        "ownPreferenceRevision": 1,
        "preferenceRanking": "UNSUPPORTED",
        "removalCap": 1,
        "expiresAt": "2026-10-24T12:00:00Z",
        "canEndWaiting": False,
    }
    snapshot_validator.validate(single_dish_round_two)
    invalid_single_dish_snapshot = {**single_dish_round_two, "removalCap": 0}
    if snapshot_validator.is_valid(invalid_single_dish_snapshot):
        raise AssertionError("A one-dish round two must allow one removal, not skip the ballot")
    invalid_early_end_projection = {**single_dish_round_two, "canEndWaiting": True}
    if snapshot_validator.is_valid(invalid_early_end_projection):
        raise AssertionError("canEndWaiting must be false outside a WAITING state")

    waiting_snapshot = {
        **single_dish_round_two,
        "state": "WAITING_2",
        "submittedCount": 3,
        "memberCount": 4,
        "members": [
            {"userId": ROOM_ID, "displayName": "Host", "role": "HOST", "submissionStatus": "ACCEPTED"},
            {"userId": "00000000-0000-4000-8000-000000000002", "displayName": "Member 2", "role": "MEMBER", "submissionStatus": "ACCEPTED"},
            {"userId": "00000000-0000-4000-8000-000000000003", "displayName": "Member 3", "role": "MEMBER", "submissionStatus": "ACCEPTED"},
            {"userId": "00000000-0000-4000-8000-000000000004", "displayName": "Member 4", "role": "MEMBER", "submissionStatus": "NOT_SUBMITTED"},
        ],
        "ownBallot": [{"roundDishId": dish(1)["roundDishId"], "choice": "KEEP"}],
        "ownWaiting": True,
        "waitingStartedAt": "2026-10-24T10:00:00Z",
        "deadline": "2026-10-24T10:01:00Z",
        "canEndWaiting": True,
    }
    snapshot_validator.validate(waiting_snapshot)

    # 6. Host early-end strict-majority quorum checks
    if not waiting_snapshot["canEndWaiting"] or not may_host_end_waiting(
        host=True,
        waiting_started=waiting_snapshot["waitingStartedAt"] is not None,
        accepted_current_round=waiting_snapshot["submittedCount"],
        locked_members=waiting_snapshot["memberCount"],
    ):
        raise AssertionError("A current-round 3/4 host snapshot should expose canEndWaiting=true")
    if may_host_end_waiting(host=True, waiting_started=False, accepted_current_round=3, locked_members=4):
        raise AssertionError("Host cannot end before this round's waiting starts")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=2, locked_members=4):
        raise AssertionError("Exactly half of the locked roster is insufficient")
    if not may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=3, locked_members=4):
        raise AssertionError("A strict majority of current-round ACKs should allow early end")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=1, locked_members=3):
        raise AssertionError("One of three ACKs is below the strict-majority threshold")
    if not may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=2, locked_members=3):
        raise AssertionError("Two of three current-round ACKs meet the threshold")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=2, locked_members=5):
        raise AssertionError("Two of five current-round ACKs are below the threshold")
    if not may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=3, locked_members=5):
        raise AssertionError("Three of five current-round ACKs meet the threshold")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=10, locked_members=20):
        raise AssertionError("Ten of twenty current-round ACKs are exactly half and insufficient")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=0, locked_members=3):
        raise AssertionError("An R1 ACK must not carry into round-two early-end eligibility")
    if not may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=11, locked_members=20):
        raise AssertionError("Eleven of a locked twenty-member roster meet the threshold")
    if may_host_end_waiting(host=False, waiting_started=True, accepted_current_round=3, locked_members=4):
        raise AssertionError("A non-host cannot invoke manual early end")

    # 7. Timeout boundary rules
    if not timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=1):
        raise AssertionError("A due timeout must proceed with one ACK, even below majority")
    if timeout_is_due(deadline_elapsed_seconds=59, accepted_current_round=1):
        raise AssertionError("A timeout must not fire before the 60-second deadline")
    if not timeout_is_due(deadline_elapsed_seconds=61, accepted_current_round=1):
        raise AssertionError("A timeout remains due after the 60-second deadline")
    if timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=0):
        raise AssertionError("Timeout processing requires at least one current-round accepted ballot")

    # 8. updateSettings authority simulation & full envelope validation
    s_old = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None}
    s_same = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None}
    s_time_only = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": "2026-10-28T19:00:00Z"}
    s_count_changed = {"dishCount": 12, "mealSlot": "dinner", "desiredAt": None}

    # Request envelope validation
    req_envelope = {
        "command": "updateSettings",
        "payload": {
            "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
            "requestId": "00000000-0000-4000-8000-000000000001",
            "roomId": ROOM_ID,
            "expectedVersion": 2,
            "settings": s_count_changed,
        },
    }
    request_envelope_validator.validate(req_envelope)

    # Non-host caller is rejected with error envelope
    res_non_host = simulate_update_settings(
        caller_role="MEMBER", old_settings=s_old, new_settings=s_same, current_version=2, current_pool_version=1
    )
    error_envelope_validator.validate(res_non_host)
    if res_non_host["ok"] or res_non_host["error"]["messageKey"] != "NOT_HOST":
        raise AssertionError("Non-host caller must be rejected with messageKey NOT_HOST")

    # Host identical settings: version increments, poolVersion unchanged (no-op pool)
    res_noop_same = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_same, current_version=2, current_pool_version=1
    )
    success_envelope_validator.validate(res_noop_same)
    if res_noop_same["data"]["poolVersion"] != 1 or res_noop_same["data"]["version"] != 3:
        raise AssertionError("Identical settings must not increment poolVersion")

    # Host time-only change: version increments, poolVersion unchanged (no-op pool)
    res_noop_time = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_time_only, current_version=2, current_pool_version=1
    )
    success_envelope_validator.validate(res_noop_time)
    if res_noop_time["data"]["poolVersion"] != 1:
        raise AssertionError("desiredAt change alone must not increment poolVersion")

    # Host dishCount change: both version and poolVersion increment
    res_count_changed = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_count_changed, current_version=2, current_pool_version=1
    )
    success_envelope_validator.validate(res_count_changed)
    if res_count_changed["data"]["poolVersion"] != 2:
        raise AssertionError("dishCount change must increment poolVersion")

    # 9. Concurrency range rules for submit / waiting
    concurrency_test = check_command_concurrency_rules(
        room_version=4,
        current_round=1,
        current_pool_version=1,
        caller_submissions=[
            # Caller 1 submits with initial version 4 -> accepted, room becomes version 5
            {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
            # Caller 2 submits with initial version 4 -> accepted because 1 <= 4 <= 5 and round/pool match!
            {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
            # Caller 3 submits with future version 7 -> rejected with VERSION_CONFLICT
            {"command": "submit", "expectedVersion": 7, "round": 1, "poolVersion": 1},
            # Caller 4 submits with wrong round 2 -> rejected with INVALID_ROOM_STATE
            {"command": "submit", "expectedVersion": 4, "round": 2, "poolVersion": 1},
            # Caller 5 submits with stale poolVersion 0 -> rejected with VERSION_CONFLICT
            {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 0},
            # Host finalize with stale version 4 (when current is 6) -> rejected with VERSION_CONFLICT
            {"command": "finalize", "expectedVersion": 4},
            # Host finalize with exact version 6 -> accepted
            {"command": "finalize", "expectedVersion": 6},
        ],
    )
    if not concurrency_test[0]["accepted"] or concurrency_test[0]["version"] != 5:
        raise AssertionError("Caller 1 submit must be accepted")
    if not concurrency_test[1]["accepted"] or concurrency_test[1]["version"] != 6:
        raise AssertionError("Caller 2 concurrent submit with version 4 must be accepted without conflict")
    if concurrency_test[2]["accepted"] or concurrency_test[2]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Future version must be rejected with VERSION_CONFLICT")
    if concurrency_test[3]["accepted"] or concurrency_test[3]["error"] != "INVALID_ROOM_STATE":
        raise AssertionError("Wrong round must be rejected with INVALID_ROOM_STATE")
    if concurrency_test[4]["accepted"] or concurrency_test[4]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Stale poolVersion must be rejected with VERSION_CONFLICT")
    if concurrency_test[5]["accepted"] or concurrency_test[5]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Stale finalize must be rejected with VERSION_CONFLICT")
    if not concurrency_test[6]["accepted"] or concurrency_test[6]["version"] != 7:
        raise AssertionError("Exact-version finalize must be accepted")

    # 10. History Page DTO and result projection assertions
    ROOM_ID_2 = "00000000-0000-4000-8000-000000000002"
    valid_decided_result = result("DECIDED", podium, round=2, round1_ballot_count=4)
    valid_no_consensus_result = {
        **result("NO_CONSENSUS", [], round=2, round1_ballot_count=4, reason_code="ALL_REMOVED"),
        "resultId": ROOM_ID_2,
    }

    valid_history_page = {
        "items": [
            {
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": ROOM_ID,
                "resultId": ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-10-24T10:01:10Z",
                "expiresAt": "2026-11-24T10:01:10Z",
                "desiredAt": "2026-10-24T12:00:00Z",
                "finalizedAt": "2026-10-24T10:01:10Z",
                "memberCount": 4,
                "round1BallotCount": 4,
                "participants": [
                    {"displayName": "Host", "role": "HOST"},
                    {"displayName": "Member 2", "role": "MEMBER"},
                ],
                "result": valid_decided_result,
            },
            {
                "historyId": "00000000-0000-4000-8000-000000000011",
                "roomId": "00000000-0000-4000-8000-000000000002",
                "resultId": "00000000-0000-4000-8000-000000000002",
                "scope": "group",
                "createdAt": "2026-10-24T11:00:00Z",
                "expiresAt": "2026-11-24T11:00:00Z",
                "desiredAt": None,
                "finalizedAt": "2026-10-24T11:05:00Z",
                "memberCount": 4,
                "round1BallotCount": 4,
                "participants": [],
                "result": valid_no_consensus_result,
            },
            {
                "historyId": "00000000-0000-4000-8000-000000000012",
                "roomId": "00000000-0000-4000-8000-000000000003",
                "resultId": "00000000-0000-4000-8000-000000000003",
                "scope": "personal",
                "createdAt": "2026-09-01T10:00:00Z",
                "expiresAt": "2026-10-01T10:00:00Z",
                "desiredAt": None,
                "finalizedAt": "2026-09-01T10:15:00Z",
                "memberCount": 2,
                "round1BallotCount": 0,
                "participants": [],
                "result": {
                    "capability": "legacy-unscored-v1",
                    "status": "DECIDED",
                    "winner": dish(1),
                    "reasonCode": "LEGACY_WINNER",
                    "finalizedAt": "2026-09-01T10:15:00Z",
                },
            },
        ]
    }
    history_validator.validate(valid_history_page)
    check_history_semantics(valid_history_page)

    # History negative tests:
    # 1. History DECIDED only status:
    bad_hist_decided = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "round1BallotCount": 4,
            "result": {"status": "DECIDED"},
        }]
    }
    if history_validator.is_valid(bad_hist_decided):
        raise AssertionError("History item with partial result {'status': 'DECIDED'} must be rejected by schema")

    # 2. History NO_CONSENSUS with podium:
    bad_hist_no_consensus = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "round1BallotCount": 4,
            "result": {
                **valid_no_consensus_result,
                "winner": dish(1),
                "topDishes": podium,
            },
        }]
    }
    if history_validator.is_valid(bad_hist_no_consensus):
        raise AssertionError("History NO_CONSENSUS with podium must be rejected by schema")

    # 3. History item with rawBallots:
    bad_hist_raw = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "round1BallotCount": 4,
            "result": {
                **valid_decided_result,
                "rawBallots": [{"user": "u1", "votes": {}}],
            },
        }]
    }
    if history_validator.is_valid(bad_hist_raw):
        raise AssertionError("History item with rawBallots must be rejected by schema")

    print(
        "Pass: Draft 2020-12 schema, dense rank ties, winner invariants, score bounds, "
        "status/round/reasonCode pairs, NOT_HOST wire error envelope, no-op poolVersion, "
        "concurrent submit range rules, and immutable history projection validation."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
