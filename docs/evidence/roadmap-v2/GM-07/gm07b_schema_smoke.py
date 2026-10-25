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
    }
    snapshot_validator.validate(single_dish_round_two)
    invalid_single_dish_snapshot = {**single_dish_round_two, "removalCap": 0}
    if snapshot_validator.is_valid(invalid_single_dish_snapshot):
        raise AssertionError("A one-dish round two must allow one removal, not skip the ballot")

    print("Pass: Draft 2020-12 schema; result fixtures, finalize ACK shapes, and a real one-dish round-two snapshot with removalCap=1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
