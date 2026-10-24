"""Optional Draft 2020-12 validation for the proposed GM-07.A schema.

Run with jsonschema 4.26.0 installed in a temporary environment; it is not a
repository or application dependency. This checks representative snapshots,
not runtime HTTP parity or the server's ballot calculation.
"""
from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4.schema.json"
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
        "categoryIds": [],
    }


def terminal_result(status: str, round_number: int, reason: str) -> dict:
    return {
        "resultId": ROOM_ID,
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.A",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT",
        "status": status,
        "round": round_number,
        "winner": dish(1) if status == "DECIDED" else None,
        "reasonCode": reason,
        "finalizedAt": "2026-10-24T10:01:10Z",
    }


def snapshot(state: str, round_number: int, dish_count: int, pool_count: int, result: dict | None = None) -> dict:
    return {
        "contractVersion": "dish-session-v4/roadmap-v2/GM-07.A",
        "policyVersion": "dish-decision-v4/ADR-019-30PCT",
        "catalogueVersion": "demo-1.0",
        "catalogueSha": "a" * 64,
        "roomId": ROOM_ID,
        "code": "ABC234",
        "state": state,
        "version": 4,
        "round": round_number,
        "poolVersion": 1 if round_number == 1 else 2,
        "dishCount": dish_count,
        "pool": [dish(index + 1) for index in range(pool_count)],
        "members": [{"userId": ROOM_ID, "displayName": "Host"}],
        "submittedCount": 0,
        "memberCount": 1,
        "ownBallot": None,
        "ownWaiting": False,
        "waitingStartedAt": None,
        "deadline": None,
        "serverTime": "2026-10-24T10:00:10Z",
        "result": result,
    }


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema).evolve(schema=schema["$defs"]["snapshot"])

    valid = [
        snapshot("LOBBY", 1, 10, 10),
        snapshot("ROUND_1", 1, 12, 12),
        snapshot("ROUND_2", 2, 12, 4),
        snapshot("NO_CONSENSUS", 1, 12, 0, terminal_result("NO_CONSENSUS", 1, "EMPTY_INTERSECTION")),
        snapshot("NO_CONSENSUS", 2, 12, 0, terminal_result("NO_CONSENSUS", 2, "ALL_REMOVED")),
        snapshot("DECIDED", 1, 10, 10, terminal_result("DECIDED", 1, "UNANIMOUS_WANT")),
    ]
    invalid = [
        snapshot("ROUND_1", 1, 10, 9),
        snapshot("ROUND_2", 2, 12, 0),
        snapshot("NO_CONSENSUS", 1, 12, 1, terminal_result("NO_CONSENSUS", 1, "EMPTY_INTERSECTION")),
        snapshot("NO_CONSENSUS", 1, 12, 0, terminal_result("NO_CONSENSUS", 1, "ALL_REMOVED")),
        snapshot("NO_CONSENSUS", 2, 12, 0, terminal_result("NO_CONSENSUS", 2, "EMPTY_INTERSECTION")),
        snapshot("DECIDED", 1, 10, 10, {**terminal_result("DECIDED", 1, "UNANIMOUS_WANT"), "winner": None}),
        snapshot("DECIDED", 1, 10, 10, terminal_result("NO_CONSENSUS", 1, "EMPTY_INTERSECTION")),
    ]

    for item in valid:
        validator.validate(item)
    for item in invalid:
        if validator.is_valid(item):
            raise AssertionError(f"Invalid snapshot accepted: {item['state']}/{item['round']}")

    print(f"Pass: Draft 2020-12 schema check; {len(valid)} valid snapshots accepted; {len(invalid)} invalid snapshots rejected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
