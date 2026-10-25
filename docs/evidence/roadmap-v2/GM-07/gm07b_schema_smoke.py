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


def result(status: str, top_dishes: list[dict]) -> dict:
    winner = next((item["dish"] for item in top_dishes if item["isWinner"]), None)
    return {
        "resultId": ROOM_ID,
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
        "status": status,
        "round": 2,
        "winner": winner,
        "reasonCode": "ACCEPTABLE_FINAL" if status == "DECIDED" else "ALL_REMOVED",
        "finalizedAt": "2026-10-24T10:01:10Z",
        "scoreVersion": "want2-ok1-round1-v1",
        "rankingVersion": "score-desc-dense-rank-v1",
        "topDishes": top_dishes,
    }


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

    print("Pass: Draft 2020-12 schema; result/finalize fixtures, one-dish R2, strict-majority host gate, waiting-start gate, timeout minimum-one rule, and NOT_READY error.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
