"""Validate GM-07.B wire shapes and semantic contract fixtures.

This is an offline contract checker, not runtime/API/SQL/privacy acceptance.
Requires jsonschema 4.26.0; the project does not add this package to runtime.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b.schema.json"
CONTRACT_VERSION = "dish-session-v4/roadmap-v2/GM-07.B"
POLICY_VERSION = "dish-decision-v4/ADR-019-30PCT-MIN1"
SCORE_VERSION = "want2-ok1-round1-v1"
RANKING_VERSION = "score-desc-dense-rank-v1"
ROOM_ID = "00000000-0000-4000-8000-000000000001"


def dish(index: int) -> dict[str, Any]:
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


def top(dish_index: int, score: int, rank: int, winner: bool = False) -> dict[str, Any]:
    return {"dish": dish(dish_index), "score": score, "rank": rank, "isWinner": winner}


def result(status: str, top_dishes: list[dict[str, Any]], *, count: int = 4) -> dict[str, Any]:
    winner = next((item["dish"] for item in top_dishes if item["isWinner"]), None)
    return {
        "resultId": ROOM_ID,
        "contractVersion": CONTRACT_VERSION,
        "policyVersion": POLICY_VERSION,
        "status": status,
        "round": 2 if status == "DECIDED" else 1,
        "winner": winner,
        "reasonCode": "ACCEPTABLE_FINAL" if status == "DECIDED" else "EMPTY_INTERSECTION",
        "finalizedAt": "2026-10-25T10:01:10Z",
        "scoreVersion": SCORE_VERSION,
        "rankingVersion": RANKING_VERSION,
        "scoredRound1BallotCount": count,
        "topDishes": top_dishes,
    }


def assert_result_semantics(
    value: dict[str, Any], eligible_candidates: list[dict[str, Any]] | None = None
) -> None:
    entries = value["topDishes"]
    count = value["scoredRound1BallotCount"]
    assert value["round"] in {1, 2}, "terminal result round must be 1 or 2"
    assert 1 <= count <= 20, "a B terminal result requires at least one ACKed complete R1 ballot"
    if value["status"] == "NO_CONSENSUS":
        assert value["winner"] is None and entries == [], "NO_CONSENSUS must have no winner or podium"
        assert value["reasonCode"] == ("EMPTY_INTERSECTION" if value["round"] == 1 else "ALL_REMOVED")
        return
    assert value["status"] == "DECIDED"
    assert value["reasonCode"] in {"UNANIMOUS_WANT", "ACCEPTABLE_FINAL"}
    assert 1 <= len(entries) <= 3
    assert all(item["score"] <= 2 * count for item in entries), "score exceeds the acknowledged R1 cohort bound"
    dish_ids = [item["dish"]["dishId"] for item in entries]
    round_dish_ids = [item["dish"]["roundDishId"] for item in entries]
    assert len(set(dish_ids)) == len(dish_ids), "duplicate dishId in podium"
    assert len(set(round_dish_ids)) == len(round_dish_ids), "duplicate roundDishId in podium"
    scores = [item["score"] for item in entries]
    assert scores == sorted(scores, reverse=True), "podium must be sorted by score descending"
    dense_ranks: list[int] = []
    rank = 0
    prior_score: int | None = None
    for score in scores:
        if score != prior_score:
            rank += 1
            prior_score = score
        dense_ranks.append(rank)
    assert [item["rank"] for item in entries] == dense_ranks, "podium ranks must be dense and ties share a rank"
    winners = [item for item in entries if item["isWinner"]]
    assert len(winners) == 1, "DECIDED podium must contain exactly one winner"
    assert winners[0]["dish"] == value["winner"], "podium winner must be the persisted result winner"
    maximum_podium_score = max(scores)
    assert winners[0]["score"] == maximum_podium_score, "winner must have the maximum score"
    if eligible_candidates is not None:
        assert eligible_candidates, "DECIDED result requires at least one eligible candidate"
        maximum_eligible_score = max(item["score"] for item in eligible_candidates)
        assert winners[0]["score"] == maximum_eligible_score, "winner must be highest-scoring among all eligible dishes"


def assert_complete_ballot(votes: list[dict[str, Any]], locked_pool_ids: list[str]) -> None:
    vote_ids = [item["roundDishId"] for item in votes]
    assert len(vote_ids) == len(locked_pool_ids), "ballot must contain every locked dish exactly once"
    assert len(set(vote_ids)) == len(vote_ids), "ballot must not duplicate a locked dish"
    assert set(vote_ids) == set(locked_pool_ids), "ballot may not omit or add a dish outside the locked pool"


def score_r1(ballots: list[dict[str, Any]], round_dish_id: str) -> tuple[int, int]:
    accepted = [ballot for ballot in ballots if ballot.get("round") == 1 and ballot.get("complete") and ballot.get("accepted")]
    score = sum({"WANT": 2, "OK": 1}.get(ballot.get("choices", {}).get(round_dish_id), 0) for ballot in accepted)
    return score, len(accepted)


def assert_waiting_window(started_at: str, deadline: str) -> None:
    started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    ends = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
    assert ends - started == timedelta(seconds=60), "waiting deadline must be exactly 60 seconds from first valid transition"


def select_podium(candidates: list[dict[str, Any]], winner_id: str, seed: bytes) -> list[dict[str, Any]]:
    """Contract reference: max-score winner, stable seeded cutoff, and dense tied ranks."""
    def order(item: dict[str, Any]) -> tuple[int, bytes, str]:
        round_dish_id = item["dish"]["roundDishId"]
        return (-item["score"], hashlib.sha256(seed + round_dish_id.encode("ascii")).digest(), round_dish_id)

    ordered = sorted(candidates, key=order)
    winner = next(item for item in ordered if item["dish"]["roundDishId"] == winner_id)
    assert winner["score"] == max(item["score"] for item in ordered), (
        "persisted winner must be among the highest-scoring eligible dishes"
    )
    for item in ordered:
        item["isWinner"] = item is winner
    selected = ordered[:3]
    if winner not in selected:
        selected[-1] = winner
        selected.sort(key=order)
    # Rank is dense over the persisted subset after winner inclusion.
    rank = 0
    prior_score: int | None = None
    for item in selected:
        if item["score"] != prior_score:
            rank += 1
            prior_score = item["score"]
        item["rank"] = rank
    return selected


def history_base(generation: str) -> dict[str, Any]:
    legacy = generation.startswith("LEGACY")
    return {
        "historyId": ROOM_ID,
        "generation": generation,
        "contractVersion": "dish-session-v3/ADR-019" if generation == "LEGACY_V3" else ("food-v1/roadmap-v2/GM-07.1" if legacy else CONTRACT_VERSION),
        "policyVersion": None if legacy else POLICY_VERSION,
        "status": "DECIDED",
        "round": None if legacy else 1,
        "reasonCode": None if legacy else "ACCEPTABLE_FINAL",
        "desiredAt": "2026-10-25T12:00:00Z",
        "finalizedAt": "2026-10-25T10:01:10Z",
        "participants": {"visibility": "PERSONAL_SELF", "memberCount": 4, "selfUserId": ROOM_ID, "names": []},
        "winner": {"name": "Legacy dish", "artworkUrl": None} if legacy else dish(1),
        "topDishes": None if legacy else [top(1, 8, 1, True)],
        "scoredRound1BallotCount": None if legacy else 4,
        "scoreVersion": None if legacy else SCORE_VERSION,
        "rankingVersion": None if legacy else RANKING_VERSION,
    }


def assert_history_semantics(value: dict[str, Any]) -> None:
    participants = value["participants"]
    if participants["visibility"] == "PERSONAL_SELF":
        assert participants["selfUserId"] is not None and participants["names"] == []
    elif participants["visibility"] == "GROUP_COUNT_ONLY":
        assert participants["selfUserId"] is None and participants["names"] == []
    else:
        assert participants["selfUserId"] is None and len(participants["names"]) == participants["memberCount"]
    if value["generation"].startswith("LEGACY"):
        assert value["topDishes"] is None and value["scoredRound1BallotCount"] is None
        assert value["scoreVersion"] is None and value["rankingVersion"] is None
        return
    assert value["contractVersion"] == CONTRACT_VERSION
    assert value["policyVersion"] == POLICY_VERSION
    assert value["scoreVersion"] == SCORE_VERSION
    assert value["rankingVersion"] == RANKING_VERSION
    assert 1 <= value["scoredRound1BallotCount"] <= 20
    if value["status"] == "DECIDED":
        assert value["reasonCode"] in {"UNANIMOUS_WANT", "ACCEPTABLE_FINAL"}
    else:
        expected_reason = "EMPTY_INTERSECTION" if value["round"] == 1 else "ALL_REMOVED"
        assert value["reasonCode"] == expected_reason
    result_projection = {
        "status": value["status"], "round": value["round"], "reasonCode": value["reasonCode"],
        "winner": value["winner"], "topDishes": value["topDishes"],
        "scoredRound1BallotCount": value["scoredRound1BallotCount"],
    }
    assert_result_semantics(result_projection)


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    root_validator = Draft202012Validator(schema, format_checker=FormatChecker())
    defs = schema["$defs"]

    assert schema["x-rpc-transport"] == {
        "method": "POST", "path": "/rest/v1/rpc/dish_session_v4", "arguments": ["command", "payload"],
        "legacyPath": "/rest/v1/rpc/dish_session", "legacyBehaviorChanges": False,
    }
    assert {"UNSUPPORTED_CONTRACT_VERSION", "BALLOT_ALREADY_ACCEPTED"}.issubset(set(defs["errorCode"]["enum"]))

    # B route request shape and command-specific ballot validation.
    request_validator = root_validator.evolve(schema=defs["requestEnvelope"])
    valid_submit = {
        "command": "submit",
        "payload": {"requestId": "req_submit1", "roomId": ROOM_ID, "round": 1, "poolVersion": 2,
                    "votes": [{"roundDishId": dish(1)["roundDishId"], "choice": "WANT"}]},
    }
    request_validator.validate(valid_submit)
    complete_pool_ids = [dish(i)["roundDishId"] for i in range(1, 11)]
    complete_votes = [{"roundDishId": item_id, "choice": "WANT"} for item_id in complete_pool_ids]
    assert_complete_ballot(complete_votes, complete_pool_ids)
    try:
        assert_complete_ballot(complete_votes[:-1], complete_pool_ids)
    except AssertionError:
        pass
    else:
        raise AssertionError("Semantic checker accepted an incomplete ballot")
    duplicate_votes = complete_votes[:-1] + [complete_votes[0]]
    try:
        assert_complete_ballot(duplicate_votes, complete_pool_ids)
    except AssertionError:
        pass
    else:
        raise AssertionError("Semantic checker accepted a duplicate ballot item")
    invalid_round_choice = json.loads(json.dumps(valid_submit))
    invalid_round_choice["payload"]["votes"][0]["choice"] = "REMOVE"
    assert not request_validator.is_valid(invalid_round_choice), "R2 choice must be rejected in an R1 request"
    invalid_room_version = json.loads(json.dumps(valid_submit))
    invalid_room_version["payload"]["expectedVersion"] = 9
    assert not request_validator.is_valid(invalid_room_version), "ballot must not use the global room version guard"
    invalid_uuid = json.loads(json.dumps(valid_submit))
    invalid_uuid["payload"]["roomId"] = "not-a-uuid"
    assert not request_validator.is_valid(invalid_uuid), "UUID formats must be validated"
    request_validator.validate({"command": "waiting", "payload": {"requestId": "req_wait1", "roomId": ROOM_ID, "round": 1, "poolVersion": 2}})

    # Shared WAITING is compatible with a member who has not submitted or started their own wait.
    snapshot_validator = root_validator.evolve(schema=defs["snapshot"])
    waiting_snapshot = {
        "contractVersion": CONTRACT_VERSION, "policyVersion": POLICY_VERSION, "catalogueVersion": "demo-1", "catalogueSha": "a" * 64,
        "roomId": ROOM_ID, "code": "ABC123", "state": "WAITING_1", "version": 3, "round": 1, "poolVersion": 2,
        "dishCount": 10, "pool": [dish(i) for i in range(1, 11)],
        "members": [
            {"userId": ROOM_ID, "displayName": "Host", "role": "HOST", "submissionStatus": "ACCEPTED"},
            {"userId": "00000000-0000-4000-8000-000000000002", "displayName": "Member", "role": "MEMBER", "submissionStatus": "NOT_SUBMITTED"},
        ],
        "submittedCount": 1, "memberCount": 2, "ownBallot": None, "ownWaiting": False,
        "waitingStartedAt": "2026-10-25T10:00:00Z", "deadline": "2026-10-25T10:01:00Z",
        "serverTime": "2026-10-25T10:00:20Z", "result": None, "hostUserId": ROOM_ID,
        "settings": {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None},
        "ownPreferences": {"cuisineIds": [], "categoryIds": [], "temperature": None, "flavor": None, "budget": None, "avoidRecent": False},
        "removalCap": None, "expiresAt": "2026-10-25T12:00:00Z",
    }
    snapshot_validator.validate(waiting_snapshot)
    assert_waiting_window(waiting_snapshot["waitingStartedAt"], waiting_snapshot["deadline"])
    try:
        assert_waiting_window(waiting_snapshot["waitingStartedAt"], "2026-10-25T10:01:01Z")
    except AssertionError:
        pass
    else:
        raise AssertionError("Semantic checker accepted a deadline other than 60 seconds")
    lobby_snapshot = json.loads(json.dumps(waiting_snapshot))
    lobby_snapshot.update({"state": "LOBBY", "version": 4, "round": 1, "poolVersion": 3, "submittedCount": 0,
                           "ownWaiting": False, "waitingStartedAt": None, "deadline": None})
    lobby_snapshot["members"][0]["submissionStatus"] = "NOT_SUBMITTED"
    lobby_snapshot["members"].pop()
    lobby_snapshot["memberCount"] = 1
    lobby_snapshot["pool"] = [dish(i) for i in range(1, 11)]
    snapshot_validator.validate(lobby_snapshot)

    preview_validator = root_validator.evolve(schema=defs["previewJoinAck"])
    preview_validator.validate({"joinable": False, "memberCount": 1, "memberLimit": 20, "dishCount": 10,
                                "mealSlot": "dinner", "roomState": "EXPIRED", "reasonCode": "ROOM_EXPIRED"})
    envelope_validator = root_validator.evolve(schema=defs["errorEnvelope"])
    envelope_validator.validate({"ok": False, "contractVersion": CONTRACT_VERSION, "policyVersion": POLICY_VERSION,
                                 "error": {"messageKey": "ROOM_EXPIRED"}})
    assert not envelope_validator.is_valid({"ok": False, "error": {"messageKey": "ROOM_EXPIRED"}}), "B errors must identify the B contract"
    success_validator = root_validator.evolve(schema=defs["successEnvelope"])
    success_validator.validate({"ok": True, "contractVersion": CONTRACT_VERSION, "policyVersion": POLICY_VERSION,
                                "requestId": "req_create_demo1", "data": {"roomId": ROOM_ID, "code": "ABC123", "version": 1,
                                "expiresAt": "2026-10-25T13:00:00Z"}})
    assert not success_validator.is_valid({"ok": True, "contractVersion": CONTRACT_VERSION,
                                           "data": {"roomId": ROOM_ID, "code": "ABC123", "version": 1,
                                                    "expiresAt": "2026-10-25T13:00:00Z"}}), "B success must identify its pinned policy version"

    # Finalize ACK is either a pure round transition or a complete terminal reference.
    ack_validator = root_validator.evolve(schema=defs["finalizeAck"])
    ack_validator.validate({"accepted": True, "outcome": "ROUND_ADVANCED", "state": "ROUND_2", "round": 2})
    ack_validator.validate({"accepted": True, "outcome": "TERMINAL", "state": "DECIDED", "round": 2,
                            "resultId": ROOM_ID, "finalizedAt": "2026-10-25T10:01:10Z"})
    assert not ack_validator.is_valid({"accepted": True, "outcome": "ROUND_ADVANCED", "state": "ROUND_2", "round": 2, "resultId": ROOM_ID})

    # B terminal shape and semantic rules, including the R1 cohort score bound.
    result_validator = root_validator.evolve(schema=defs["terminalResult"])
    score, scored_count = score_r1([
        {"round": 1, "complete": True, "accepted": True, "choices": {dish(1)["roundDishId"]: "WANT"}},
        {"round": 1, "complete": True, "accepted": True, "choices": {dish(1)["roundDishId"]: "WANT"}},
        {"round": 1, "complete": True, "accepted": True, "choices": {dish(1)["roundDishId"]: "OK"}},
        {"round": 1, "complete": True, "accepted": False, "choices": {dish(1)["roundDishId"]: "WANT"}},
        {"round": 2, "complete": True, "accepted": True, "choices": {dish(1)["roundDishId"]: "KEEP"}},
    ], dish(1)["roundDishId"])
    assert (score, scored_count) == (5, 3), "only accepted complete R1 ballots contribute 2*WANT+OK"
    valid_result = result("DECIDED", [top(1, 8, 1, True), top(2, 8, 1), top(3, 7, 2)], count=4)
    result_validator.validate(valid_result)
    assert_result_semantics(valid_result)
    no_consensus = result("NO_CONSENSUS", [], count=1)
    result_validator.validate(no_consensus)
    assert_result_semantics(no_consensus)
    invalid_results = []
    invalid_results.append(result("DECIDED", [top(1, 9, 1, True)], count=4))
    invalid_results.append(result("DECIDED", [top(1, 8, 1, True), top(1, 7, 2)], count=4))
    invalid_results.append(result("DECIDED", [top(1, 8, 1, True), top(2, 7, 3)], count=4))
    invalid_results.append(result("DECIDED", [top(1, 7, 1, True), top(2, 8, 2)], count=4))
    invalid_results.append(result("NO_CONSENSUS", [top(1, 0, 1)], count=0))
    invalid_results.append(result("DECIDED", [top(1, 0, 1, True)], count=0))
    invalid_results.append(result("NO_CONSENSUS", [], count=0))
    winner_mismatch = result("DECIDED", [top(1, 8, 1, True), top(2, 7, 2)], count=4)
    winner_mismatch["winner"] = dish(2)
    invalid_results.append(winner_mismatch)
    lower_scoring_winner = result(
        "DECIDED", [top(1, 9, 1), top(2, 8, 2), top(3, 2, 3, True)], count=5
    )
    assert result_validator.is_valid(lower_scoring_winner), (
        "cross-item winner score fixture must pass shape validation to exercise the semantic guard"
    )
    invalid_results.append(lower_scoring_winner)
    zero_ballot_terminal_results = [
        result("DECIDED", [top(1, 0, 1, True)], count=0),
        result("NO_CONSENSUS", [], count=0),
    ]
    assert all(not result_validator.is_valid(item) for item in zero_ballot_terminal_results), (
        "JSON Schema accepted a terminal B result without an ACKed complete R1 ballot"
    )
    for invalid in invalid_results:
        try:
            assert_result_semantics(invalid)
        except AssertionError:
            pass
        else:
            raise AssertionError("Semantic checker accepted an invalid result fixture")

    # Four highest-score dishes tie across the three-entry cutoff. The selected
    # subset stays <=3, includes the persisted winner, and gives every tied
    # selected dish the same dense rank, including rank 1.
    tied_candidates = [top(i, 10, 0) for i in range(1, 5)] + [top(5, 9, 0)]
    tied_winner_id = tied_candidates[3]["dish"]["roundDishId"]
    tied_first = select_podium(json.loads(json.dumps(tied_candidates)), tied_winner_id, b"fixture-seed")
    tied_second = select_podium(json.loads(json.dumps(tied_candidates)), tied_winner_id, b"fixture-seed")
    assert tied_first == tied_second, "seeded cutoff must be stable"
    assert len(tied_first) == 3 and sum(item["isWinner"] for item in tied_first) == 1
    assert tied_winner_id in {item["dish"]["roundDishId"] for item in tied_first}
    assert all(item["score"] == 10 and item["rank"] == 1 for item in tied_first)
    tied_result = result("DECIDED", tied_first, count=5)
    result_validator.validate(tied_result)
    assert_result_semantics(tied_result, eligible_candidates=tied_candidates)

    lower_winner_candidates = [top(1, 9, 0), top(2, 8, 0), top(3, 2, 0)]
    try:
        select_podium(lower_winner_candidates, lower_winner_candidates[2]["dish"]["roundDishId"], b"fixture-seed")
    except AssertionError:
        pass
    else:
        raise AssertionError("Podium selection accepted a winner below the maximum eligible score")

    # History capability and consent projections: legacy stays null; group names have no user IDs.
    history_validator = root_validator.evolve(schema=defs["historySummary"])
    history_detail_validator = root_validator.evolve(schema=defs["historyDetail"])
    legacy = history_base("LEGACY_V3")
    history_validator.validate(legacy)
    assert_history_semantics(legacy)
    history_detail_validator.validate({**legacy, "lockedDishes": None})
    legacy_group = history_base("LEGACY_V2")
    legacy_group["participants"] = {"visibility": "GROUP_COUNT_ONLY", "memberCount": 4, "selfUserId": None, "names": []}
    history_validator.validate(legacy_group)
    assert_history_semantics(legacy_group)
    invalid_legacy = {**legacy, "scoredRound1BallotCount": 0, "topDishes": []}
    assert not history_validator.is_valid(invalid_legacy), "legacy capability absence must not be fabricated as zero"
    group_history = history_base("V4_B")
    group_history["participants"] = {"visibility": "CONSENTED_GROUP_NAMES", "memberCount": 4, "selfUserId": None,
                                      "names": ["An", "Bình", "Cường", "Duyên"]}
    history_validator.validate(group_history)
    assert_history_semantics(group_history)
    history_detail_validator.validate({**group_history, "lockedDishes": [dish(1)]})
    invalid_v4_group_count = json.loads(json.dumps(group_history))
    invalid_v4_group_count["participants"] = {"visibility": "GROUP_COUNT_ONLY", "memberCount": 4, "selfUserId": None, "names": []}
    assert not history_validator.is_valid(invalid_v4_group_count), "new B group history requires the consented names projection"
    winner_mismatch_history = json.loads(json.dumps(group_history))
    winner_mismatch_history["winner"] = dish(2)
    try:
        assert_history_semantics(winner_mismatch_history)
    except AssertionError:
        pass
    else:
        raise AssertionError("History semantic checker accepted a winner/podium mismatch")
    empty_v4_history = history_base("V4_B")
    empty_v4_history.update({"status": "NO_CONSENSUS", "reasonCode": "EMPTY_INTERSECTION", "winner": None, "topDishes": [], "scoredRound1BallotCount": 1})
    history_validator.validate(empty_v4_history)
    assert_history_semantics(empty_v4_history)
    invalid_history_fields = []
    for key, value in (
        ("contractVersion", "dish-session-v3/ADR-019"),
        ("policyVersion", "dish-decision-v3"),
        ("scoreVersion", "unknown-score-version"),
        ("rankingVersion", "unknown-ranking-version"),
        ("reasonCode", None),
        ("reasonCode", "NOT_A_TERMINAL_REASON"),
        ("reasonCode", "EMPTY_INTERSECTION"),
        ("scoredRound1BallotCount", 0),
    ):
        invalid_history = json.loads(json.dumps(group_history))
        invalid_history[key] = value
        invalid_history_fields.append(invalid_history)
    invalid_history_reason = json.loads(json.dumps(empty_v4_history))
    invalid_history_reason["reasonCode"] = "ALL_REMOVED"
    invalid_history_fields.append(invalid_history_reason)
    for invalid_history in invalid_history_fields:
        assert not history_validator.is_valid(invalid_history), "V4_B history schema accepted an unpinned version/count/reason"
        assert not history_detail_validator.is_valid({**invalid_history, "lockedDishes": [dish(1)]}), (
            "V4_B history detail schema accepted an unpinned version/count/reason"
        )
        try:
            assert_history_semantics(invalid_history)
        except AssertionError:
            pass
        else:
            raise AssertionError("History semantic checker accepted an unpinned version/count/reason")
    invalid_group = json.loads(json.dumps(group_history))
    invalid_group["participants"]["otherUserIds"] = [ROOM_ID]
    assert not history_validator.is_valid(invalid_group), "group history must contain names only, not member IDs"

    print("Pass: Draft 2020-12 schema, B RPC/version routing, per-command guards, complete ballots, 60-second waiting deadline, expiry shapes, lobby poolVersion>1, finalize ACK, positive R1 terminal count, maximum-score winner, tied dense ranks, stable <=3 cutoff, pinned B history versions/reasons, and legacy null capabilities.")
    print("Boundary: contract/schema fixtures only; no B runtime, SQL ACL, producer integration, or mobile consumer was exercised.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
