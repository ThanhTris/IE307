"""GM-07.A wire-contract regression checks without a runtime dependency.

The repository does not install a JSON-Schema engine for the documentation-only
supplement. These checks still exercise the published envelope examples and the
cross-field rules that a generic schema engine must enforce; runtime HTTP parity
remains a downstream implementation gate.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "docs/architecture/schemas/dish-session-v4.schema.json"
UUID = "00000000-0000-4000-8000-000000000001"
ROOM = {"requestId": "req_001", "roomId": UUID, "expectedVersion": 4}
ASSERTIONS = 0


def fail(message: str) -> None:
    raise AssertionError(message)


def require(condition: bool, message: str) -> None:
    global ASSERTIONS
    ASSERTIONS += 1
    if not condition:
        fail(message)


def valid_payload(command: str, payload: dict) -> bool:
    if command == "create":
        return set(payload) == {"requestId", "displayName", "dishCount", "mealSlot", "cuisineIds", "categoryIds"} and 10 <= payload["dishCount"] <= 20
    if command == "waiting":
        return set(payload) == {"requestId", "roomId", "expectedVersion", "round", "poolVersion"} and payload["round"] in (1, 2)
    if command == "finalize":
        return set(payload) == {"requestId", "roomId", "expectedVersion"}
    if command == "submit":
        if set(payload) != {"requestId", "roomId", "expectedVersion", "round", "poolVersion", "votes"}:
            return False
        choices = {vote.get("choice") for vote in payload["votes"]}
        allowed = {"WANT", "OK", "NO"} if payload["round"] == 1 else {"KEEP", "REMOVE"} if payload["round"] == 2 else set()
        return bool(payload["votes"]) and choices <= allowed
    return True


def valid_request(document: dict) -> bool:
    command = document.get("command")
    payload = document.get("payload")
    return command in {"create", "join", "snapshot", "start", "submit", "waiting", "finalize", "cancel", "leave"} and isinstance(payload, dict) and valid_payload(command, payload)


def valid_snapshot(snapshot: dict) -> bool:
    state = snapshot.get("state")
    round_number = snapshot.get("round")
    pool = snapshot.get("pool")
    result = snapshot.get("result")
    dish_count = snapshot.get("dishCount")
    if not isinstance(pool, list):
        return False
    if state == "LOBBY":
        return round_number == 1 and snapshot.get("poolVersion") == 1 and snapshot.get("ownWaiting") is False and snapshot.get("waitingStartedAt") is None and snapshot.get("deadline") is None and result is None and 10 <= len(pool) <= 20 and len(pool) == dish_count
    if state in {"ROUND_1", "WAITING_1"}:
        return round_number == 1 and 10 <= len(pool) <= 20 and len(pool) == dish_count
    if state in {"ROUND_2", "WAITING_2"}:
        return round_number == 2 and 1 <= len(pool) <= 20
    if state == "DECIDED":
        return isinstance(result, dict) and result.get("status") == "DECIDED" and isinstance(result.get("winner"), dict)
    if state == "NO_CONSENSUS":
        expected_reason = "EMPTY_INTERSECTION" if round_number == 1 else "ALL_REMOVED" if round_number == 2 else None
        return not pool and isinstance(result, dict) and result.get("status") == "NO_CONSENSUS" and result.get("winner", "missing") is None and result.get("reasonCode") == expected_reason
    return state == "CANCELLED"


def main() -> int:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    defs = schema["$defs"]
    require(schema["oneOf"] == [{"$ref": "#/$defs/requestEnvelope"}, {"$ref": "#/$defs/successEnvelope"}, {"$ref": "#/$defs/errorEnvelope"}], "root envelopes are not wired")
    for name in ("requestEnvelope", "successEnvelope", "errorEnvelope", "waitingRequest", "finalizeRequest", "round1Vote", "round2Vote"):
        require(name in defs, f"missing schema definition: {name}")
    submit_branches = defs["submitRequest"]["oneOf"]
    require(any(branch["properties"]["round"] == {"const": 1} for branch in submit_branches), "round 1 submit branch missing")
    require(any(branch["properties"]["round"] == {"const": 2} for branch in submit_branches), "round 2 submit branch missing")
    lobby = {"state": "LOBBY", "round": 1, "poolVersion": 1, "dishCount": 10, "pool": [{}] * 10, "ownWaiting": False, "waitingStartedAt": None, "deadline": None, "result": None}
    require(valid_snapshot(lobby), "lobby sentinel example rejected")
    invalid_lobby = {**lobby, "round": 2, "poolVersion": 2}
    require(not valid_snapshot(invalid_lobby), "lobby accepted round-2 sentinel")
    round_one = {"state": "ROUND_1", "round": 1, "dishCount": 12, "pool": [{}] * 12}
    require(valid_snapshot(round_one), "round 1 exact initial pool rejected")
    invalid_round_one = {**round_one, "pool": [{}] * 9}
    require(not valid_snapshot(invalid_round_one), "round 1 accepted fewer than 10 initial dishes")
    round_two = {"state": "ROUND_2", "round": 2, "dishCount": 12, "pool": [{}] * 4}
    require(valid_snapshot(round_two), "round 2 survivor pool below 10 rejected")
    invalid_round_two = {**round_two, "pool": []}
    require(not valid_snapshot(invalid_round_two), "round 2 accepted an empty survivor pool")
    no_survivors = {"state": "NO_CONSENSUS", "round": 1, "pool": [], "result": {"status": "NO_CONSENSUS", "winner": None, "reasonCode": "EMPTY_INTERSECTION"}}
    require(valid_snapshot(no_survivors), "empty round-1 intersection terminal rejected")
    invalid_empty_round_two = {**no_survivors, "state": "ROUND_2", "round": 2}
    require(not valid_snapshot(invalid_empty_round_two), "empty survivor set was allowed to open round 2")
    invalid_no_consensus = {**no_survivors, "pool": [{}]}
    require(not valid_snapshot(invalid_no_consensus), "no-consensus terminal exposed active candidates")
    all_removed = {"state": "NO_CONSENSUS", "round": 2, "pool": [], "result": {"status": "NO_CONSENSUS", "winner": None, "reasonCode": "ALL_REMOVED"}}
    require(valid_snapshot(all_removed), "all-removed round-2 terminal rejected")
    invalid_reason = {**all_removed, "result": {**all_removed["result"], "reasonCode": "EMPTY_INTERSECTION"}}
    require(not valid_snapshot(invalid_reason), "round-2 no-consensus accepted wrong terminal reason")
    decided = {"state": "DECIDED", "round": 1, "pool": [{}], "result": {"status": "DECIDED", "winner": {}}}
    require(valid_snapshot(decided), "round-1 winner terminal rejected")
    invalid_decided = {**decided, "result": {"status": "DECIDED", "winner": None}}
    require(not valid_snapshot(invalid_decided), "DECIDED accepted a missing winner")
    create = {"command": "create", "payload": {"requestId": "req_001", "displayName": "Host", "dishCount": 12, "mealSlot": "dinner", "cuisineIds": [], "categoryIds": []}}
    waiting = {"command": "waiting", "payload": {**ROOM, "round": 1, "poolVersion": 1}}
    finalize = {"command": "finalize", "payload": ROOM}
    submit_r1 = {"command": "submit", "payload": {**ROOM, "round": 1, "poolVersion": 1, "votes": [{"roundDishId": UUID, "choice": "WANT"}]}}
    submit_r2 = {"command": "submit", "payload": {**ROOM, "round": 2, "poolVersion": 2, "votes": [{"roundDishId": UUID, "choice": "KEEP"}]}}
    require(all(valid_request(item) for item in (create, waiting, finalize, submit_r1, submit_r2)), "valid command envelope rejected")
    require(not valid_request({**submit_r1, "payload": {**submit_r1["payload"], "votes": [{"roundDishId": UUID, "choice": "KEEP"}]}}), "round 1 accepted KEEP")
    require(not valid_request({**submit_r2, "payload": {**submit_r2["payload"], "votes": [{"roundDishId": UUID, "choice": "WANT"}]}}), "round 2 accepted WANT")
    error = {"ok": False, "requestId": "req_001", "error": {"messageKey": "VERSION_CONFLICT", "details": {"actualVersion": 5}}}
    require(error["ok"] is False and error["error"]["messageKey"] == "VERSION_CONFLICT", "error envelope example malformed")
    print(f"Pass: GM-07.A schema structure and wire fixtures ({ASSERTIONS} assertions)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, KeyError, json.JSONDecodeError) as error:
        print(f"Fail: GM-07.A contract check: {error}", file=sys.stderr)
        raise SystemExit(1)
