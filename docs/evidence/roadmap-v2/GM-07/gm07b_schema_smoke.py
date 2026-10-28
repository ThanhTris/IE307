"""Optional Draft 2020-12 smoke for GM-07.B's proposed wire schema.

This validates contract shapes only. It does not test a deployed API, SQL,
privacy policies at runtime, score calculation, or Android rendering.
Requires jsonschema 4.26.0 when run; this dependency is not added to the repo.
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


def result(status: str, top_dishes: list[dict], *, score_version: str | None = ..., ranking_version: str | None = ...) -> dict:
    winner = next((item["dish"] for item in top_dishes if item.get("isWinner")), None)
    default_score_version = "want2-ok1-round1-v1" if status == "DECIDED" else None
    default_ranking_version = "score-desc-dense-rank-v1" if status == "DECIDED" else None
    return {
        "resultId": ROOM_ID,
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
        "status": status,
        "round": 2,
        "winner": winner,
        "reasonCode": "ACCEPTABLE_FINAL" if status == "DECIDED" else "ALL_REMOVED",
        "finalizedAt": "2026-10-24T10:01:10Z",
        "scoreVersion": default_score_version if score_version is ... else score_version,
        "rankingVersion": default_ranking_version if ranking_version is ... else ranking_version,
        "topDishes": top_dishes,
    }


def check_terminal_result_semantics(res: dict) -> None:
    """Semantic validation of terminal Top 3 result beyond Draft 2020-12 schema.

    Verifies:
    1. DECIDED results:
       - 1 to 3 entries in topDishes.
       - Exactly one entry marked isWinner=True.
       - Winner dish identity matches res['winner'].
       - Winner must have the highest score (winner.score == max(scores)) and rank == 1.
       - Dense ranking: entries with identical scores share the exact same rank.
       - Dense ranking: ranks increment by exactly 1 without gaps when score drops.
       - R1 metadata: scoreVersion and rankingVersion must be non-null strings.
    2. NO_CONSENSUS results:
       - winner is None.
       - topDishes is empty.
       - scoreVersion and rankingVersion are None.
       - reasonCode is one of EMPTY_INTERSECTION or ALL_REMOVED.
    """
    status = res.get("status")
    if status == "DECIDED":
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

        winners = [item for item in top_dishes if item.get("isWinner")]
        if len(winners) != 1:
            raise AssertionError(f"Expected exactly 1 winner, found {len(winners)}")
        winner_entry = winners[0]
        if winner_entry["dish"]["dishId"] != winner["dishId"]:
            raise AssertionError("winner dish does not match topDishes item marked isWinner")

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
        if res.get("winner") is not None:
            raise AssertionError("NO_CONSENSUS must have winner=None")
        if res.get("topDishes"):
            raise AssertionError("NO_CONSENSUS must have empty topDishes")
        if res.get("scoreVersion") is not None:
            raise AssertionError("NO_CONSENSUS must have null scoreVersion")
        if res.get("rankingVersion") is not None:
            raise AssertionError("NO_CONSENSUS must have null rankingVersion")


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


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    root_validator = Draft202012Validator(schema)
    result_validator = root_validator.evolve(schema=schema["$defs"]["terminalResult"])
    ack_validator = root_validator.evolve(schema=schema["$defs"]["finalizeAck"])
    snapshot_validator = root_validator.evolve(schema=schema["$defs"]["snapshot"])

    podium = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 1, "isWinner": False},
        {"dish": dish(3), "score": 7, "rank": 2, "isWinner": False},
    ]
    valid_results = [result("DECIDED", podium), result("NO_CONSENSUS", [])]
    for item in valid_results:
        result_validator.validate(item)
        check_terminal_result_semantics(item)

    invalid_results = [
        result("NO_CONSENSUS", [{"dish": dish(1), "score": 0, "rank": 1, "isWinner": False}]),
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
            raise AssertionError("Invalid terminal Top 3 result was accepted")

    # Semantic negative checks (testing cases that might pass schema shape but violate consensus semantics)
    # 1. Tied scores with different ranks
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

    # 2. Winner without highest score
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

    # 3. Missing R1 metadata in DECIDED result
    missing_r1_meta = result("DECIDED", podium, score_version=None)
    try:
        check_terminal_result_semantics(missing_r1_meta)
        raise AssertionError("Semantic checker must catch missing R1 scoreVersion metadata")
    except AssertionError as err:
        if "requires R1 scoreVersion metadata" not in str(err):
            raise

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
    if not timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=1):
        raise AssertionError("A due timeout must proceed with one ACK, even below majority")
    if timeout_is_due(deadline_elapsed_seconds=59, accepted_current_round=1):
        raise AssertionError("A timeout must not fire before the 60-second deadline")
    if not timeout_is_due(deadline_elapsed_seconds=61, accepted_current_round=1):
        raise AssertionError("A timeout remains due after the 60-second deadline")
    if timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=0):
        raise AssertionError("Timeout processing requires at least one current-round accepted ballot")
    error_validator = root_validator.evolve(schema=schema["$defs"]["errorCode"])
    error_validator.validate("NOT_READY")
    error_validator.validate("NOT_HOST")

    # Update settings authority and poolVersion stability simulation
    def simulate_update_settings(*, caller_role: str, old_settings: dict, new_settings: dict, current_version: int, current_pool_version: int) -> dict:
        if caller_role != "HOST":
            return {"ok": False, "error": {"code": "NOT_HOST", "message": "Only host may update room settings"}}
        is_noop_pool = (
            old_settings["dishCount"] == new_settings["dishCount"]
            and old_settings["mealSlot"] == new_settings["mealSlot"]
        )
        new_pool_version = current_pool_version if is_noop_pool else current_pool_version + 1
        return {
            "ok": True,
            "data": {
                "accepted": True,
                "version": current_version + 1,
                "poolVersion": new_pool_version,
                "settings": new_settings,
            },
        }

    s_old = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None}
    s_same = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None}
    s_time_only = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": "2026-10-28T19:00:00Z"}
    s_count_changed = {"dishCount": 12, "mealSlot": "dinner", "desiredAt": None}

    # Non-host caller is rejected with NOT_HOST
    res_non_host = simulate_update_settings(
        caller_role="MEMBER", old_settings=s_old, new_settings=s_same, current_version=2, current_pool_version=1
    )
    if res_non_host["ok"] or res_non_host["error"]["code"] != "NOT_HOST":
        raise AssertionError("Non-host caller must be rejected with NOT_HOST")

    # Host identical settings: version increments, poolVersion unchanged (no-op pool)
    res_noop_same = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_same, current_version=2, current_pool_version=1
    )
    if res_noop_same["data"]["poolVersion"] != 1 or res_noop_same["data"]["version"] != 3:
        raise AssertionError("Identical settings must not increment poolVersion")

    # Host time-only change: version increments, poolVersion unchanged (no-op pool)
    res_noop_time = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_time_only, current_version=2, current_pool_version=1
    )
    if res_noop_time["data"]["poolVersion"] != 1:
        raise AssertionError("desiredAt change alone must not increment poolVersion")

    # Host dishCount change: both version and poolVersion increment
    res_count_changed = simulate_update_settings(
        caller_role="HOST", old_settings=s_old, new_settings=s_count_changed, current_version=2, current_pool_version=1
    )
    if res_count_changed["data"]["poolVersion"] != 2:
        raise AssertionError("dishCount change must increment poolVersion")

    settings_ack_validator = root_validator.evolve(schema=schema["$defs"]["settingsAck"])
    settings_ack_validator.validate(res_noop_same["data"])
    settings_ack_validator.validate(res_count_changed["data"])

    # History Page and Result projection assertions
    history_validator = root_validator.evolve(schema=schema["$defs"]["historyPage"])
    history_sample = {
        "items": [
            {
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": ROOM_ID,
                "resultId": ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-10-24T10:01:10Z",
                "expiresAt": "2026-11-24T10:01:10Z",
                "result": {
                    "status": "DECIDED",
                    "winner": dish(1),
                    "topDishes": podium,
                    "scoreVersion": "want2-ok1-round1-v1",
                    "rankingVersion": "score-desc-dense-rank-v1",
                },
            },
            {
                "historyId": "00000000-0000-4000-8000-000000000011",
                "roomId": "00000000-0000-4000-8000-000000000002",
                "resultId": "00000000-0000-4000-8000-000000000002",
                "scope": "group",
                "createdAt": "2026-10-24T11:00:00Z",
                "expiresAt": "2026-11-24T11:00:00Z",
                "result": {
                    "status": "NO_CONSENSUS",
                    "winner": None,
                    "topDishes": [],
                    "scoreVersion": None,
                    "rankingVersion": None,
                },
            },
        ]
    }
    history_validator.validate(history_sample)

    print("Pass: Draft 2020-12 schema; result/finalize fixtures, one-dish R2, strict-majority host gate, waiting-start gate, timeout minimum-one rule, semantic rank/winner/metadata checks, updateSettings NOT_HOST/no-op poolVersion, and history projections.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
