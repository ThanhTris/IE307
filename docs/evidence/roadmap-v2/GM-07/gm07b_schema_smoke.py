#!/usr/bin/env python3
"""GM-07.B Draft 2020-12 JSON Schema validation and semantic assertion smoke test.

Validates:
1. Result schema Draft 2020-12 compliance for DECIDED and NO_CONSENSUS outcomes.
2. Semantic rules: dense ranks for tied scores, winner invariant, deep card projection match,
   cohort score bounds, and strict terminal round/reasonCode pairings.
3. Finalize ACK schema for ROUND_ADVANCED and TERMINAL outcomes.
4. One-dish round-two snapshot with removalCap=1.
5. Strict-majority host early end-waiting and 60-second timeout minimum-one rules.
6. updateSettings authority: only host may mutate settings; non-host receives NOT_HOST wire error envelope.
7. updateSettings poolVersion stability: identical settings or time-only update does not increment poolVersion.
8. Command concurrency guards: submit/waiting range rule (1 <= expectedVersion <= version with round/poolVersion match)
   vs lifecycle exact version match.
9. History query & DTO: immutable result projection, legacy unscored variant without fabricated counts, and strict rawBallots ban.
10. Baseline runtime parity: baseline samples without round1BallotCount validate against dish-session-v4b.schema.json,
    while dish-session-v4b-supplement.schema.json strictly enforces round1BallotCount.
"""

from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b.schema.json"
SUPPLEMENT_SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b-supplement.schema.json"
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
    contract_version: str = "dish-session-v4/roadmap-v2/GM-07.B",
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

    res = {
        "resultId": ROOM_ID,
        "contractVersion": contract_version,
        "policyVersion": "dish-decision-v4/ADR-019-30PCT-MIN1",
        "status": status,
        "round": round,
        "winner": actual_winner,
        "reasonCode": reason_code,
        "finalizedAt": "2026-10-24T10:01:10Z",
        "scoreVersion": default_score_version if score_version is ... else score_version,
        "rankingVersion": default_ranking_version if ranking_version is ... else ranking_version,
        "topDishes": top_dishes,
    }

    if round1_ballot_count is not None:
        res["round1BallotCount"] = round1_ballot_count

    return res


def check_terminal_result_semantics(res: dict) -> None:
    """Semantic validation of terminal Top 3 result beyond Draft 2020-12 schema.

    Verifies:
    1. Status / Round / ReasonCode consistency:
       - DECIDED round 1 => reasonCode == UNANIMOUS_WANT
       - DECIDED round 2 => reasonCode == ACCEPTABLE_FINAL
       - NO_CONSENSUS round 1 => reasonCode == EMPTY_INTERSECTION
       - NO_CONSENSUS round 2 => reasonCode == ALL_REMOVED
    2. Dense ranks for tied scores (e.g. 8, 8, 7 -> 1, 1, 2).
    3. Winner invariants:
       - Exactly 1 winner in topDishes for DECIDED.
       - Winner dish deeply matches top-level winner card across all locked projection fields.
       - Winner has highest score and dense rank 1.
    4. Scoring cohort upper bound:
       - score <= 2 * round1BallotCount
       - score <= 40 (for roster M <= 20).
    5. Structural uniqueness: dishId and roundDishId must be unique across podium.
    6. Non-null scoreVersion and rankingVersion for DECIDED; null for NO_CONSENSUS.
    """
    status = res.get("status")
    round_num = res.get("round")
    reason_code = res.get("reasonCode")
    r1_count = res.get("round1BallotCount")

    if status == "DECIDED":
        if round_num == 1 and reason_code != "UNANIMOUS_WANT":
            raise AssertionError(f"DECIDED round 1 must have reasonCode UNANIMOUS_WANT, got {reason_code}")
        if round_num == 2 and reason_code != "ACCEPTABLE_FINAL":
            raise AssertionError(f"DECIDED round 2 must have reasonCode ACCEPTABLE_FINAL, got {reason_code}")
        if round_num not in (1, 2):
            raise AssertionError(f"Terminal round must be 1 or 2, got {round_num}")

        if res.get("scoreVersion") != "want2-ok1-round1-v1":
            raise AssertionError(f"DECIDED must have scoreVersion want2-ok1-round1-v1, got {res.get('scoreVersion')}")
        if res.get("rankingVersion") != "score-desc-dense-rank-v1":
            raise AssertionError(f"DECIDED must have rankingVersion score-desc-dense-rank-v1, got {res.get('rankingVersion')}")

        top_dishes = res.get("topDishes", [])
        if not (1 <= len(top_dishes) <= 3):
            raise AssertionError(f"DECIDED must have 1..3 topDishes, got {len(top_dishes)}")

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

        # Deep equality check across all projection fields
        if winner_dish != winner:
            raise AssertionError(
                f"Winner dish projection does not deeply match podium entry marked isWinner. "
                f"winner={winner}, podium={winner_dish}"
            )

        # Check score bounds
        if r1_count is not None:
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
            if "round1BallotCount" in item and "round1BallotCount" in res:
                if item["round1BallotCount"] != res["round1BallotCount"]:
                    raise AssertionError(f"History item round1BallotCount {item['round1BallotCount']} does not match result {res['round1BallotCount']}")

            # Check cohort count vs memberCount
            r1_count = res.get("round1BallotCount") if res.get("round1BallotCount") is not None else item.get("round1BallotCount")
            member_count = item.get("memberCount")
            if r1_count is not None and member_count is not None:
                if not (0 <= r1_count <= member_count <= 20):
                    raise AssertionError(
                        f"Cohort count violation: expected 0 <= round1BallotCount ({r1_count}) <= memberCount ({member_count}) <= 20"
                    )
        else:
            # Legacy unscored checks
            if "topDishes" in res or "scoreVersion" in res or "rankingVersion" in res:
                raise AssertionError(f"Legacy unscored history item {idx} must not fabricate topDishes, scoreVersion, or rankingVersion")
            if "round1BallotCount" in res or "round1BallotCount" in item:
                raise AssertionError(f"Legacy unscored history item {idx} must not fabricate round1BallotCount")


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
    """Simulates updateSettings endpoint logic:
    - Rejects non-host with NOT_HOST in proper wire error envelope.
    - If settings are identical or only desiredAt changes: increments version, leaves poolVersion unchanged.
    - If dishCount or criteria change: increments both version and poolVersion.
    """
    if caller_role != "HOST":
        return {
            "ok": False,
            "requestId": request_id,
            "error": {
                "messageKey": "NOT_HOST",
                "details": {"reason": "Only the host can modify room settings"},
            },
        }

    pool_criteria_changed = (
        old_settings.get("dishCount") != new_settings.get("dishCount")
        or old_settings.get("mealSlot") != new_settings.get("mealSlot")
    )

    new_pool_version = current_pool_version + 1 if pool_criteria_changed else current_pool_version

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
    room_state: str = "ROUND_1",
    caller_submissions: list[dict],
) -> list[dict]:
    """Demonstrates command concurrency rules:
    - updateSettings / updatePreferences / start / finalize require exact match (expectedVersion == room_version).
    - submit and waiting accept 1 <= expectedVersion <= room_version as long as round and poolVersion match.
    - Wrong round or poolVersion returns VERSION_CONFLICT (matching runtime SQL dispatch).
    - Invalid room state returns INVALID_ROOM_STATE.
    """
    results = []
    v = room_version
    for sub in caller_submissions:
        cmd = sub.get("command")
        exp_ver = sub.get("expectedVersion")
        round_arg = sub.get("round", current_round)
        pool_ver_arg = sub.get("poolVersion", current_pool_version)
        state_arg = sub.get("state", room_state)

        if cmd in ("updateSettings", "updatePreferences", "start", "finalize", "cancel", "leave"):
            if exp_ver != v:
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
                continue
            v += 1
            results.append({"accepted": True, "version": v})
        elif cmd in ("submit", "waiting"):
            if state_arg not in ("ROUND_1", "WAITING_1", "ROUND_2", "WAITING_2"):
                results.append({"accepted": False, "error": "INVALID_ROOM_STATE"})
                continue
            if not (isinstance(exp_ver, int) and 1 <= exp_ver <= v):
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
                continue
            if round_arg != current_round:
                results.append({"accepted": False, "error": "VERSION_CONFLICT"})
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

    supp_schema = json.loads(SUPPLEMENT_SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(supp_schema)
    supp_root_validator = Draft202012Validator(supp_schema)
    supp_result_validator = supp_root_validator.evolve(schema=supp_schema["$defs"]["terminalResult"])

    # 1. Valid terminal results
    podium = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 1, "isWinner": False},
        {"dish": dish(3), "score": 7, "rank": 2, "isWinner": False},
    ]

    # Baseline valid DECIDED result (no round1BallotCount required)
    baseline_decided = result("DECIDED", podium, round=2)
    result_validator.validate(baseline_decided)

    # Supplement valid DECIDED result (with round1BallotCount)
    supp_decided = result("DECIDED", podium, round=2, round1_ballot_count=4, contract_version="dish-session-v4/roadmap-v2/GM-07.B-supplement")
    result_validator.validate(supp_decided)
    supp_result_validator.validate(supp_decided)
    check_terminal_result_semantics(supp_decided)

    # NO_CONSENSUS round 1 (EMPTY_INTERSECTION)
    valid_no_consensus_r1 = result("NO_CONSENSUS", [], round=1, round1_ballot_count=4, reason_code="EMPTY_INTERSECTION")
    result_validator.validate(valid_no_consensus_r1)
    supp_result_validator.validate(valid_no_consensus_r1)
    check_terminal_result_semantics(valid_no_consensus_r1)

    # NO_CONSENSUS round 2 (ALL_REMOVED)
    valid_no_consensus_r2 = result("NO_CONSENSUS", [], round=2, round1_ballot_count=4, reason_code="ALL_REMOVED")
    result_validator.validate(valid_no_consensus_r2)
    supp_result_validator.validate(valid_no_consensus_r2)
    check_terminal_result_semantics(valid_no_consensus_r2)

    # 2. Semantic Negative Tests for Terminal Results
    # (a) Tied scores with different ranks
    tied_mismatched = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 2, "isWinner": False},
        {"dish": dish(3), "score": 7, "rank": 3, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", tied_mismatched, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch tied scores with different ranks")
    except AssertionError as err:
        if "Tied scores must share identical dense rank" not in str(err):
            raise

    # (b) Winner without highest score
    winner_not_highest = [
        {"dish": dish(1), "score": 6, "rank": 2, "isWinner": True},
        {"dish": dish(2), "score": 8, "rank": 1, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", winner_not_highest, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch winner without highest score")
    except AssertionError as err:
        if "Winner does not have highest score" not in str(err):
            raise

    # (c) Duplicate dishId
    dup_dish = [
        {"dish": dish(1), "score": 8, "rank": 1, "isWinner": True},
        {"dish": dish(1), "score": 7, "rank": 2, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", dup_dish, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch duplicate dishId")
    except AssertionError as err:
        if "Duplicate dishId in podium entries" not in str(err):
            raise

    # (d) Duplicate roundDishId
    d1 = dish(1)
    d2 = dish(2)
    d2["roundDishId"] = d1["roundDishId"]
    dup_round_dish = [
        {"dish": d1, "score": 8, "rank": 1, "isWinner": True},
        {"dish": d2, "score": 7, "rank": 2, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", dup_round_dish, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch duplicate roundDishId")
    except AssertionError as err:
        if "Duplicate roundDishId in podium entries" not in str(err):
            raise

    # (e1) Winner projection deep mismatch: different name
    mismatched_winner_name = dict(dish(1))
    mismatched_winner_name["name"] = "Different Name"
    try:
        check_terminal_result_semantics(result("DECIDED", podium, winner=mismatched_winner_name, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch winner dish name mismatch")
    except AssertionError as err:
        if "Winner dish projection does not deeply match podium entry" not in str(err):
            raise

    # (e2) Winner projection deep mismatch: different description
    mismatched_winner_desc = dict(dish(1))
    mismatched_winner_desc["description"] = "Tampered description"
    try:
        check_terminal_result_semantics(result("DECIDED", podium, winner=mismatched_winner_desc, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch winner dish description mismatch")
    except AssertionError as err:
        if "Winner dish projection does not deeply match podium entry" not in str(err):
            raise

    # (e3) Winner projection deep mismatch: different artwork
    mismatched_winner_art = dict(dish(1))
    mismatched_winner_art["artwork"] = {"uri": "https://example.com/fake.png", "altText": "Fake image"}
    try:
        check_terminal_result_semantics(result("DECIDED", podium, winner=mismatched_winner_art, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch winner dish artwork mismatch")
    except AssertionError as err:
        if "Winner dish projection does not deeply match podium entry" not in str(err):
            raise

    # (e4) Winner projection deep mismatch: different priceReference
    mismatched_winner_price = dict(dish(1))
    mismatched_winner_price["priceReference"] = {
        "amount": 99999,
        "currency": "VND",
        "unit": "portion",
        "observedAt": "2026-10-24T10:00:00Z",
        "source": "menu",
    }
    try:
        check_terminal_result_semantics(result("DECIDED", podium, winner=mismatched_winner_price, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch winner dish priceReference mismatch")
    except AssertionError as err:
        if "Winner dish projection does not deeply match podium entry" not in str(err):
            raise

    # (f) Dish score exceeds 2 * round1BallotCount
    overscored_items = [
        {"dish": dish(1), "score": 9, "rank": 1, "isWinner": True},
        {"dish": dish(2), "score": 7, "rank": 2, "isWinner": False},
    ]
    try:
        check_terminal_result_semantics(result("DECIDED", overscored_items, round1_ballot_count=4))
        raise AssertionError("Semantic checker must catch score exceeding 2 * round1BallotCount")
    except AssertionError as err:
        if "exceeds upper bound" not in str(err):
            raise

    # (g) Mismatched round and reasonCode (e.g. NO_CONSENSUS round=1 with ALL_REMOVED)
    mismatched_reason = result("NO_CONSENSUS", [], round=1, reason_code="ALL_REMOVED", round1_ballot_count=4)
    if result_validator.is_valid(mismatched_reason):
        raise AssertionError("Schema must reject NO_CONSENSUS round=1 with ALL_REMOVED")
    try:
        check_terminal_result_semantics(mismatched_reason)
        raise AssertionError("Semantic checker must catch NO_CONSENSUS round=1 with ALL_REMOVED")
    except AssertionError as err:
        if "NO_CONSENSUS round 1 must have reasonCode EMPTY_INTERSECTION" not in str(err):
            raise

    # 3. Finalize ACK validations
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

    # 4. Snapshot validations
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

    # 5. Host early-end waiting rules
    if not may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=3, locked_members=4):
        raise AssertionError("Strict majority 3/4 should allow early end")
    if may_host_end_waiting(host=True, waiting_started=False, accepted_current_round=3, locked_members=4):
        raise AssertionError("Waiting must have started")
    if may_host_end_waiting(host=True, waiting_started=True, accepted_current_round=2, locked_members=4):
        raise AssertionError("Exactly half is insufficient")
    if may_host_end_waiting(host=False, waiting_started=True, accepted_current_round=3, locked_members=4):
        raise AssertionError("Non-host cannot end waiting")

    # 6. Timeout boundary rules
    if not timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=1):
        raise AssertionError("Timeout must proceed at 60s with >= 1 ACK")
    if timeout_is_due(deadline_elapsed_seconds=59, accepted_current_round=1):
        raise AssertionError("Timeout must not trigger before 60s")
    if timeout_is_due(deadline_elapsed_seconds=60, accepted_current_round=0):
        raise AssertionError("Timeout requires at least one accepted ballot")

    # 7. updateSettings authority simulation & error envelope validation
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

    # Non-host caller is rejected with wire error envelope
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

    # 8. Concurrency range rules for submit / waiting
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
            # Caller 4 submits with wrong round 2 -> rejected with VERSION_CONFLICT
            {"command": "submit", "expectedVersion": 4, "round": 2, "poolVersion": 1},
            # Caller 5 submits with stale poolVersion 0 -> rejected with VERSION_CONFLICT
            {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 0},
            # Caller 6 submits when room is in LOBBY -> rejected with INVALID_ROOM_STATE
            {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1, "state": "LOBBY"},
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
    if concurrency_test[3]["accepted"] or concurrency_test[3]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Wrong round must be rejected with VERSION_CONFLICT")
    if concurrency_test[4]["accepted"] or concurrency_test[4]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Stale poolVersion must be rejected with VERSION_CONFLICT")
    if concurrency_test[5]["accepted"] or concurrency_test[5]["error"] != "INVALID_ROOM_STATE":
        raise AssertionError("Submitting in LOBBY must be rejected with INVALID_ROOM_STATE")
    if concurrency_test[6]["accepted"] or concurrency_test[6]["error"] != "VERSION_CONFLICT":
        raise AssertionError("Stale finalize must be rejected with VERSION_CONFLICT")
    if not concurrency_test[7]["accepted"] or concurrency_test[7]["version"] != 7:
        raise AssertionError("Exact-version finalize must be accepted")

    # 9. History Page DTO and result projection assertions
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

    # 10. History negative tests:
    # 10.1 History item with memberCount < round1BallotCount
    bad_cohort_page = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "memberCount": 2,
            "round1BallotCount": 4,
            "result": valid_decided_result,
        }]
    }
    try:
        check_history_semantics(bad_cohort_page)
        raise AssertionError("Semantic check must reject memberCount < round1BallotCount")
    except AssertionError as err:
        if "Cohort count violation" not in str(err):
            raise

    # 10.2 Legacy history carrying fabricated topDishes
    bad_legacy_podium = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "result": {
                "capability": "legacy-unscored-v1",
                "status": "DECIDED",
                "winner": dish(1),
                "reasonCode": "LEGACY_WINNER",
                "finalizedAt": "2026-10-24T10:01:10Z",
                "topDishes": podium,
            },
        }]
    }
    if history_validator.is_valid(bad_legacy_podium):
        raise AssertionError("Schema must reject legacyHistoryResult with topDishes")

    # 10.3 Legacy history carrying rawBallots
    bad_legacy_raw = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "result": {
                "capability": "legacy-unscored-v1",
                "status": "DECIDED",
                "winner": dish(1),
                "reasonCode": "LEGACY_WINNER",
                "finalizedAt": "2026-10-24T10:01:10Z",
                "rawBallots": [{"user": "u1", "votes": {}}],
            },
        }]
    }
    if history_validator.is_valid(bad_legacy_raw):
        raise AssertionError("Schema must reject legacyHistoryResult with rawBallots")

    # 10.4 V4 history item with rawBallots
    bad_hist_raw = {
        "items": [{
            "historyId": "00000000-0000-4000-8000-000000000010",
            "roomId": ROOM_ID,
            "resultId": ROOM_ID,
            "scope": "personal",
            "createdAt": "2026-10-24T10:01:10Z",
            "expiresAt": "2026-11-24T10:01:10Z",
            "result": {
                **valid_decided_result,
                "rawBallots": [{"user": "u1", "votes": {}}],
            },
        }]
    }
    if history_validator.is_valid(bad_hist_raw):
        raise AssertionError("History item with rawBallots must be rejected by schema")

    # 11. Supplement schema strictly requires round1BallotCount
    supp_missing_count = {
        **supp_decided,
    }
    supp_missing_count.pop("round1BallotCount")
    if supp_result_validator.is_valid(supp_missing_count):
        raise AssertionError("Supplement schema must reject terminal result missing round1BallotCount")

    # 12. Baseline schema accepts sample without round1BallotCount
    baseline_missing_count = {
        **baseline_decided,
    }
    baseline_missing_count.pop("round1BallotCount", None)
    if not result_validator.is_valid(baseline_missing_count):
        raise AssertionError("Baseline schema must accept deployed runtime sample without round1BallotCount")

    print(
        "Pass: Draft 2020-12 schema, dense rank ties, winner invariants, deep projection match, "
        "cohort score bounds, status/round/reasonCode pairs, NOT_HOST wire error envelope, no-op poolVersion, "
        "concurrent submit range rules, legacy unscored DTO without fabricated counts, and immutable history projection validation."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
