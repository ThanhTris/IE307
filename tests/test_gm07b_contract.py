"""Unit tests for GM-07.B Draft 2020-12 schema, wire contracts, and semantic validators.

Executed during CI unittest regression (python -m unittest discover -s tests -p "test_*.py").
"""
import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SMOKE_PATH = ROOT / "docs/evidence/roadmap-v2/GM-07/gm07b_schema_smoke.py"

SPEC = importlib.util.spec_from_file_location("gm07b_schema_smoke", SMOKE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class Gm07bContractTests(unittest.TestCase):
    def setUp(self):
        self.d1 = MODULE.dish(1)
        self.d2 = MODULE.dish(2)
        self.d3 = MODULE.dish(3)
        self.valid_podium = [
            {"dish": self.d1, "score": 8, "rank": 1, "isWinner": True},
            {"dish": self.d2, "score": 8, "rank": 1, "isWinner": False},
            {"dish": self.d3, "score": 7, "rank": 2, "isWinner": False},
        ]

    def test_schema_smoke_and_semantic_suite(self):
        """Runs the complete GM-07.B smoke suite covering schema and semantic validations."""
        self.assertEqual(MODULE.main(), 0)

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

    def test_semantic_rejects_winner_projection_mismatch(self):
        """Result winner dish must match the podium entry marked isWinner."""
        altered_winner = dict(self.d1)
        altered_winner["name"] = "Altered Name"
        res = MODULE.result("DECIDED", self.valid_podium, round=2, round1_ballot_count=4, winner=altered_winner)
        with self.assertRaises(AssertionError) as ctx:
            MODULE.check_terminal_result_semantics(res)
        self.assertIn("Winner dish object in result does not match podium item", str(ctx.exception))

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

    def test_concurrency_range_rule_allows_simultaneous_submit(self):
        """Submit and waiting accept 1 <= expectedVersion <= version when pool and round match."""
        results = MODULE.check_command_concurrency_rules(
            room_version=4,
            current_round=1,
            current_pool_version=1,
            caller_submissions=[
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 4, "round": 1, "poolVersion": 1},
                {"command": "submit", "expectedVersion": 7, "round": 1, "poolVersion": 1},
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
        self.assertTrue(results[4]["accepted"])
        self.assertEqual(results[4]["version"], 7)


if __name__ == "__main__":
    unittest.main()
