"""Unit tests for GM-07.B Draft 2020-12 schema, wire contracts, and semantic validators.

Executed during CI unittest regression (python -m unittest discover -s tests -p "test_*.py").
"""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[1]
SMOKE_PATH = ROOT / "docs/evidence/roadmap-v2/GM-07/gm07b_schema_smoke.py"
SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b.schema.json"
SUPP_SCHEMA_PATH = ROOT / "docs/architecture/schemas/dish-session-v4b-supplement.schema.json"

SPEC = importlib.util.spec_from_file_location("gm07b_schema_smoke", SMOKE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class Gm07bContractTests(unittest.TestCase):
    def request_fixtures(self):
        """Explicit wire examples, including both voting rounds and all commands."""
        settings = {"dishCount": 10, "mealSlot": "dinner", "desiredAt": None}
        preferences = {
            "cuisineIds": [], "categoryIds": [], "temperature": None,
            "flavor": None, "budget": None, "avoidRecent": False,
        }
        room = {"roomId": MODULE.ROOM_ID}
        write = {**room, "requestId": "request-contract-version-001", "expectedVersion": 3}
        ballot = {**write, "poolVersion": 1}
        return [
            ("create", {"requestId": "create-version-001", "displayName": "Host", "settings": settings, "preferences": preferences}),
            ("previewJoin", {"requestId": "preview-version-001", "code": "ABC123"}),
            ("join", {"requestId": "join-version-001", "code": "ABC123", "displayName": "Member"}),
            ("snapshot", room),
            ("updateSettings", {**write, "settings": settings}),
            ("updatePreferences", {**write, "preferences": preferences}),
            ("start", write),
            ("submit", {**ballot, "round": 1, "votes": [{"roundDishId": self.d1["roundDishId"], "choice": "WANT"}]}),
            ("submit", {**ballot, "round": 2, "votes": [{"roundDishId": self.d1["roundDishId"], "choice": "REMOVE"}]}),
            ("waiting", {**ballot, "round": 1}),
            ("waiting", {**ballot, "round": 2}),
            ("finalize", write),
            ("cancel", write),
            ("leave", write),
            ("getDefaultPreferences", {}),
            ("updateDefaultPreferences", {"requestId": "defaults-version-001", "expectedRevision": 0, "preferences": preferences}),
            ("result", room),
            ("history", {}),
            ("deleteHistory", {"requestId": "delete-version-001", "historyId": MODULE.ROOM_ID}),
        ]

    def setUp(self):
        self.d1 = MODULE.dish(1)
        self.d2 = MODULE.dish(2)
        self.d3 = MODULE.dish(3)
        self.valid_podium = [
            {"dish": self.d1, "score": 8, "rank": 1, "isWinner": True},
            {"dish": self.d2, "score": 8, "rank": 1, "isWinner": False},
            {"dish": self.d3, "score": 7, "rank": 2, "isWinner": False},
        ]
        self.base_schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        self.base_validator = Draft202012Validator(self.base_schema)
        self.supp_schema = json.loads(SUPP_SCHEMA_PATH.read_text(encoding="utf-8"))
        self.supp_validator = Draft202012Validator(self.supp_schema)

    def test_schema_smoke_and_semantic_suite(self):
        """Runs the complete GM-07.B smoke suite covering schema and semantic validations."""
        self.assertEqual(MODULE.main(), 0)

    def test_all_request_commands_require_their_own_contract_version(self):
        baseline = "dish-session-v4/roadmap-v2/GM-07.B"
        supplement = baseline + "-supplement"
        fixtures = self.request_fixtures()
        expected_commands = set(self.base_schema["$defs"]["command"]["enum"])
        self.assertEqual({command for command, _ in fixtures}, expected_commands)
        self.assertEqual(set(self.supp_schema["$defs"]["command"]["enum"]), expected_commands)
        for command, fields in fixtures:
            for version, own, other in (
                (baseline, self.base_validator, self.supp_validator),
                (supplement, self.supp_validator, self.base_validator),
            ):
                with self.subTest(command=command, round=fields.get("round"), contractVersion=version):
                    request = {"command": command, "payload": {"contractVersion": version, **copy.deepcopy(fields)}}
                    own.validate(request)
                    self.assertFalse(other.is_valid(request), "Cross-version request must not silently route to the other contract")
                    missing = copy.deepcopy(request)
                    del missing["payload"]["contractVersion"]
                    self.assertFalse(own.is_valid(missing), "Version opt-in is required")
                    unknown = copy.deepcopy(request)
                    unknown["payload"]["contractVersion"] = "dish-session-v4/roadmap-v2/GM-07.UNKNOWN"
                    self.assertFalse(own.is_valid(unknown), "Unknown version must not be accepted")

    def test_semantic_rejects_tied_rank_mismatch(self):
        """Dishes with identical scores must share the identical dense rank."""
        bad_tied = [
            {"dish": self.d1, "score": 8, "rank": 1, "isWinner": True},
            {"dish": self.d2, "score": 8, "rank": 2, "isWinner": False},
            {"dish": self.d3, "score": 7, "rank": 3, "isWinner": False},
        ]
        res = MODULE.result("DECIDED", bad_tied, round=2, round1_ballot_count=4)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Tied scores must share identical dense rank", str(ctx.exception))

    def test_semantic_rejects_winner_without_highest_score(self):
        """Winner must belong to the highest score group."""
        low_score_winner = [
            {"dish": self.d1, "score": 7, "rank": 1, "isWinner": True},
            {"dish": self.d2, "score": 8, "rank": 1, "isWinner": False},
        ]
        res = MODULE.result("DECIDED", low_score_winner, round=2, round1_ballot_count=4)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Winner does not have highest score", str(ctx.exception))

    def test_semantic_rejects_duplicate_dish_in_podium(self):
        """Podium must not contain duplicate dishId or roundDishId entries."""
        dup_dish = [
            {"dish": self.d1, "score": 8, "rank": 1, "isWinner": True},
            {"dish": self.d1, "score": 8, "rank": 1, "isWinner": False},
        ]
        res = MODULE.result("DECIDED", dup_dish, round=2, round1_ballot_count=4)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Duplicate dishId in podium entries", str(ctx.exception))

    def test_semantic_rejects_winner_deep_description_mismatch(self):
        """Result winner card must deeply match podium entry; altered description is rejected."""
        altered_winner = dict(self.d1)
        altered_winner["description"] = "Tampered description"
        res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4, winner=altered_winner)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Winner dish projection does not deeply match", str(ctx.exception))

    def test_semantic_rejects_winner_deep_artwork_mismatch(self):
        """Result winner card must deeply match podium entry; altered artwork is rejected."""
        altered_winner = dict(self.d1)
        altered_winner["artwork"] = {"uri": "https://example.com/fake.png", "altText": "Fake image"}
        res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4, winner=altered_winner)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Winner dish projection does not deeply match", str(ctx.exception))

    def test_semantic_rejects_winner_deep_price_mismatch(self):
        """Result winner card must deeply match podium entry; altered priceReference is rejected."""
        altered_winner = dict(self.d1)
        altered_winner["priceReference"] = {
            "amount": 99999,
            "currency": "VND",
            "unit": "portion",
            "observedAt": "2026-10-24T10:00:00Z",
            "source": "menu",
        }
        res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4, winner=altered_winner)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Winner dish projection does not deeply match", str(ctx.exception))

    def test_semantic_rejects_score_exceeding_cohort_bound(self):
        """Score cannot exceed 2 * round1BallotCount (or global max 40)."""
        overscored = [
            {"dish": self.d1, "score": 999, "rank": 1, "isWinner": True},
            {"dish": self.d2, "score": 7, "rank": 2, "isWinner": False},
        ]
        res = MODULE.result("DECIDED", overscored, round=2, round1_ballot_count=4)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("exceeds upper bound", str(ctx.exception))

    def test_semantic_rejects_mismatched_round_and_reason_code(self):
        """NO_CONSENSUS round 1 requires EMPTY_INTERSECTION, round 2 requires ALL_REMOVED."""
        res_r1_wrong = MODULE.result("NO_CONSENSUS", [], round=1, round1_ballot_count=2, reason_code="ALL_REMOVED")
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res_r1_wrong)
        self.assertIn("NO_CONSENSUS round 1 must have reasonCode EMPTY_INTERSECTION", str(ctx.exception))

        res_r2_wrong = MODULE.result("NO_CONSENSUS", [], round=2, round1_ballot_count=2, reason_code="EMPTY_INTERSECTION")
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res_r2_wrong)
        self.assertIn("NO_CONSENSUS round 2 must have reasonCode ALL_REMOVED", str(ctx.exception))

    def test_history_semantic_rejects_cohort_exceeding_member_count(self):
        """History item round1BallotCount cannot exceed locked memberCount."""
        decided_res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4)
        history_page = {
            "items": [{
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": MODULE.ROOM_ID,
                "resultId": MODULE.ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-10-24T10:01:10Z",
                "expiresAt": "2026-11-24T10:01:10Z",
                "memberCount": 2,
                "round1BallotCount": 4,
                "result": decided_res,
            }]
        }
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_history_semantics(history_page)
        self.assertIn("Cohort count violation", str(ctx.exception))

    def test_history_semantic_rejects_raw_ballots(self):
        """History projection must never leak rawBallots or rawVotes."""
        decided_res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4)
        history_page = {
            "items": [{
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": MODULE.ROOM_ID,
                "resultId": MODULE.ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-10-24T10:01:10Z",
                "expiresAt": "2026-11-24T10:01:10Z",
                "round1BallotCount": 4,
                "result": {
                    **decided_res,
                    "rawBallots": [{"user": "u1", "votes": {}}],
                },
            }]
        }
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_history_semantics(history_page)
        self.assertIn("must not expose rawBallots", str(ctx.exception))

    def test_history_legacy_unscored_no_fabricated_scores(self):
        """Legacy unscored item cannot fabricate topDishes, scores, or round1BallotCount."""
        history_page = {
            "items": [{
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": MODULE.ROOM_ID,
                "resultId": MODULE.ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-09-01T10:00:00Z",
                "expiresAt": "2026-10-01T10:00:00Z",
                "result": {
                    "capability": "legacy-unscored-v1",
                    "status": "DECIDED",
                    "winner": self.d1,
                    "reasonCode": "LEGACY_WINNER",
                    "finalizedAt": "2026-09-01T10:15:00Z",
                    "topDishes": self.valid_podium,
                },
            }]
        }
        hist_val = self.base_validator.evolve(schema=self.base_schema["$defs"]["historyPage"])
        self.assertFalse(hist_val.is_valid(history_page))
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_history_semantics(history_page)
        self.assertIn("must not fabricate topDishes", str(ctx.exception))

    def test_history_legacy_unscored_valid_without_count(self):
        """Valid legacy unscored item without round1BallotCount passes schema and semantics."""
        history_page = {
            "items": [{
                "historyId": "00000000-0000-4000-8000-000000000010",
                "roomId": MODULE.ROOM_ID,
                "resultId": MODULE.ROOM_ID,
                "scope": "personal",
                "createdAt": "2026-09-01T10:00:00Z",
                "expiresAt": "2026-10-01T10:00:00Z",
                "memberCount": 2,
                "result": {
                    "capability": "legacy-unscored-v1",
                    "status": "DECIDED",
                    "winner": self.d1,
                    "reasonCode": "LEGACY_WINNER",
                    "finalizedAt": "2026-09-01T10:15:00Z",
                },
            }]
        }
        hist_val = self.base_validator.evolve(schema=self.base_schema["$defs"]["historyPage"])
        hist_val.validate(history_page)
        MODULE.check_history_semantics(history_page)

    def test_update_settings_not_host_wire_error_envelope(self):
        """Non-host updateSettings returns wire errorEnvelope with messageKey NOT_HOST."""
        res = MODULE.simulate_update_settings(
            caller_role="MEMBER",
            old_settings={"dishCount": 10, "mealSlot": "dinner", "desiredAt": None},
            new_settings={"dishCount": 10, "mealSlot": "dinner", "desiredAt": None},
            current_version=2,
            current_pool_version=1,
        )
        self.assertFalse(res["ok"])
        self.assertEqual(res["error"]["messageKey"], "NOT_HOST")
        self.assertNotIn("code", res["error"])

    def test_concurrency_range_rule_and_error_codes(self):
        """Verifies concurrent submit range rule and VERSION_CONFLICT / INVALID_ROOM_STATE codes."""
        results = MODULE.check_command_concurrency_rules(
            room_version=4,
            current_round=1,
            current_pool_version=1,
            caller_submissions=[
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 7, "round": 1, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 4, "round": 2, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 0},
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1, "state": "LOBBY"},
                {"command": "finalize", "expectedVersion": 4},
                {"command": "finalize", "expectedVersion": 6},
            ],
        )
        self.assertTrue(results[0]["accepted"])
        self.assertEqual(results[0]["version"], 5)
        self.assertTrue(results[1]["accepted"])
        self.assertEqual(results[1]["version"], 6)
        self.assertFalse(results[2]["accepted"])
        self.assertEqual(results[2]["error"], "VERSION_CONFLICT")
        self.assertFalse(results[3]["accepted"])
        self.assertEqual(results[3]["error"], "VERSION_CONFLICT")
        self.assertFalse(results[4]["accepted"])
        self.assertEqual(results[4]["error"], "VERSION_CONFLICT")
        self.assertFalse(results[5]["accepted"])
        self.assertEqual(results[5]["error"], "INVALID_ROOM_STATE")
        self.assertFalse(results[6]["accepted"])
        self.assertEqual(results[6]["error"], "VERSION_CONFLICT")
        self.assertTrue(results[7]["accepted"])
        self.assertEqual(results[7]["version"], 7)

    def test_baseline_schema_accepts_sample_without_round1_count(self):
        """Baseline schema dish-session-v4b.schema.json accepts sample without round1BallotCount."""
        baseline_res = MODULE.result("DECIDED", self.valid_podium, round=2)
        baseline_res.pop("round1BallotCount", None)
        base_res_val = self.base_validator.evolve(schema=self.base_schema["$defs"]["terminalResult"])
        self.assertTrue(base_res_val.is_valid(baseline_res))

    def test_supplement_schema_requires_round1_count(self):
        """Supplement schema strictly requires round1BallotCount for terminal results."""
        supp_res = MODULE.result(
            "DECIDED", self.valid_podium, round=2,
            contract_version="dish-session-v4/roadmap-v2/GM-07.B-supplement"
        )
        supp_res.pop("round1BallotCount", None)
        supp_res_val = self.supp_validator.evolve(schema=self.supp_schema["$defs"]["terminalResult"])
        self.assertFalse(supp_res_val.is_valid(supp_res))


if __name__ == "__main__":
    unittest.main()
