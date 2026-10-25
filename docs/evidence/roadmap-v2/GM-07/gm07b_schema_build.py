"""Build the GM-07.B proposal schema from the immutable GM-07.A baseline.

This is a documentation/evidence helper only. It does not modify runtime code.
Run from the repository root with Python 3: python docs/evidence/roadmap-v2/GM-07/gm07b_schema_build.py
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "docs/architecture/schemas/dish-session-v4.schema.json"
TARGET = ROOT / "docs/architecture/schemas/dish-session-v4b.schema.json"
VERSION = "dish-session-v4/roadmap-v2/GM-07.B"
POLICY_VERSION = "dish-decision-v4/ADR-019-30PCT-MIN1"
SCORE_VERSION = "want2-ok1-round1-v1"
RANKING_VERSION = "score-desc-dense-rank-v1"


def replace_version(value):
    if isinstance(value, dict):
        return {key: replace_version(item) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_version(item) for item in value]
    if isinstance(value, str):
        return value.replace("dish-session-v4/roadmap-v2/GM-07.A", VERSION).replace(
            "dish-decision-v4/ADR-019-30PCT", "dish-decision-v4/ADR-019-30PCT-MIN1"
        )
    return value


def build() -> dict:
    schema = replace_version(json.loads(SOURCE.read_text(encoding="utf-8")))
    schema["$id"] = "https://gi-cung-duoc.local/schemas/dish-session-v4b.schema.json"
    schema["title"] = "Dish session v4.B proposed wire contract"
    schema["description"] = (
        "GM-07.B forward-only proposal. It extends GM-07.A with room preferences, "
        "join preview, explicit concurrency guards, history projections and immutable "
        "aggregate Top 3 results. Transport is the opt-in dish_session_v4 RPC. "
        "It is not a deployed runtime contract."
    )
    schema["x-rpc-transport"] = {
        "method": "POST",
        "path": "/rest/v1/rpc/dish_session_v4",
        "arguments": ["command", "payload"],
        "legacyPath": "/rest/v1/rpc/dish_session",
        "legacyBehaviorChanges": False,
    }
    schema["x-decision-supplement"] = {
        "path": "docs/architecture/decisions/ADR-021-soft-preference-and-history-projection.md",
        "status": "Proposed",
    }
    defs = schema["$defs"]
    defs["errorCode"]["enum"] = list(dict.fromkeys(
        defs["errorCode"]["enum"] + ["UNSUPPORTED_CONTRACT_VERSION", "BALLOT_ALREADY_ACCEPTED"]
    ))
    defs["command"]["enum"] = [
        "create", "previewJoin", "join", "snapshot", "updateSettings",
        "updatePreferences", "start", "submit", "waiting", "finalize",
        "cancel", "leave",
    ]

    defs["flavorProjection"] = {
        "type": "object",
        "required": ["spicy", "salty", "sweet", "sour"],
        "properties": {
            name: {
                "type": "object",
                "required": ["present", "intensity"],
                "properties": {
                    "present": {"type": ["boolean", "null"]},
                    "intensity": {"enum": ["none", "low", "medium", "high", "unknown"]},
                },
                "additionalProperties": False,
            }
            for name in ("spicy", "salty", "sweet", "sour")
        },
        "additionalProperties": False,
    }
    defs["artworkProjection"] = {
        "type": "object",
        "required": ["uri", "altText", "attribution"],
        "properties": {
            "uri": {"type": "string", "format": "uri", "minLength": 1},
            "altText": {"type": "string", "minLength": 1, "maxLength": 300},
            "attribution": {"type": ["string", "null"], "maxLength": 500},
        },
        "additionalProperties": False,
    }
    defs["priceReference"] = {
        "type": "object",
        "required": ["amount", "currency", "unit", "servingSize", "sourceRef", "checkedAt"],
        "properties": {
            "amount": {"type": "number", "minimum": 0},
            "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
            "unit": {"enum": ["portion", "item", "person", "group", "kg", "menu_item_unspecified"]},
            "servingSize": {"type": ["string", "null"], "maxLength": 160},
            "sourceRef": {"type": "string", "minLength": 1, "maxLength": 500},
            "checkedAt": {"$ref": "#/$defs/timestamp"},
        },
        "additionalProperties": False,
    }
    dish = defs["poolDish"]
    dish["required"] = [
        "roundDishId", "dishId", "name", "description", "mealSlots", "cuisineIds",
        "cuisineLabels", "categoryIds", "categoryLabels", "temperature", "flavor",
        "artwork", "priceReference",
    ]
    dish["properties"].update({
        "cuisineLabels": {"type": "array", "uniqueItems": True, "items": {"type": "string", "minLength": 1, "maxLength": 80}},
        "categoryLabels": {"type": "array", "uniqueItems": True, "items": {"type": "string", "minLength": 1, "maxLength": 80}},
        "temperature": {"type": ["string", "null"], "enum": ["hot", "warm", "cold", "ambient", "unknown", None]},
        "flavor": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/flavorProjection"}]},
        "artwork": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/artworkProjection"}]},
        "priceReference": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/priceReference"}]},
    })

    defs["member"]["required"] = ["userId", "displayName", "role", "submissionStatus"]
    defs["member"]["properties"].update({
        "role": {"enum": ["HOST", "MEMBER"]},
        "submissionStatus": {"enum": ["NOT_SUBMITTED", "ACCEPTED"]},
    })
    defs["softPreferences"] = {
        "type": "object",
        "required": ["cuisineIds", "categoryIds", "temperature", "flavor", "budget", "avoidRecent"],
        "properties": {
            "cuisineIds": {"type": "array", "uniqueItems": True, "items": {"$ref": "#/$defs/uuid"}},
            "categoryIds": {"type": "array", "uniqueItems": True, "items": {"$ref": "#/$defs/uuid"}},
            "temperature": {"type": ["string", "null"], "enum": ["hot", "warm", "cold", "ambient", "unknown", None]},
            "flavor": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/flavorProjection"}]},
            "budget": {
                "oneOf": [
                    {"type": "null"},
                    {"type": "object", "required": ["maximum", "currency", "unit"], "properties": {
                        "maximum": {"type": "number", "minimum": 0},
                        "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
                        "unit": {"enum": ["portion", "item", "person", "group", "kg", "menu_item_unspecified"]},
                    }, "additionalProperties": False},
                ]
            },
            "avoidRecent": {"type": "boolean"},
        },
        "additionalProperties": False,
    }
    defs["roomSettings"] = {
        "type": "object",
        "required": ["dishCount", "mealSlot", "desiredAt"],
        "properties": {
            "dishCount": {"type": "integer", "minimum": 10, "maximum": 20},
            "mealSlot": {"$ref": "#/$defs/mealSlot"},
            "desiredAt": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/timestamp"}]},
        },
        "additionalProperties": False,
    }
    defs["createRequest"] = {
        "type": "object",
        "required": ["requestId", "displayName", "settings", "preferences"],
        "properties": {
            "requestId": {"$ref": "#/$defs/requestId"},
            "displayName": {"type": "string", "minLength": 1, "maxLength": 24},
            "settings": {"$ref": "#/$defs/roomSettings"},
            "preferences": {"$ref": "#/$defs/softPreferences"},
        },
        "additionalProperties": False,
    }
    defs["previewJoinRequest"] = {
        "type": "object", "required": ["requestId", "code"],
        "properties": {"requestId": {"$ref": "#/$defs/requestId"}, "code": {"type": "string", "minLength": 6, "maxLength": 6}},
        "additionalProperties": False,
    }
    defs["updateSettingsRequest"] = {
        "type": "object", "required": ["requestId", "roomId", "expectedVersion", "settings"],
        "properties": {
            "requestId": {"$ref": "#/$defs/requestId"}, "roomId": {"$ref": "#/$defs/uuid"},
            "expectedVersion": {"type": "integer", "minimum": 1}, "settings": {"$ref": "#/$defs/roomSettings"},
        },
        "additionalProperties": False,
    }
    defs["updatePreferencesRequest"] = {
        "type": "object", "required": ["requestId", "roomId", "expectedVersion", "preferences"],
        "properties": {
            "requestId": {"$ref": "#/$defs/requestId"}, "roomId": {"$ref": "#/$defs/uuid"},
            "expectedVersion": {"type": "integer", "minimum": 1}, "preferences": {"$ref": "#/$defs/softPreferences"},
        },
        "additionalProperties": False,
    }
    defs["requestEnvelope"]["allOf"].extend([
        {"if": {"properties": {"command": {"const": "previewJoin"}}}, "then": {"properties": {"payload": {"$ref": "#/$defs/previewJoinRequest"}}}},
        {"if": {"properties": {"command": {"const": "updateSettings"}}}, "then": {"properties": {"payload": {"$ref": "#/$defs/updateSettingsRequest"}}}},
        {"if": {"properties": {"command": {"const": "updatePreferences"}}}, "then": {"properties": {"payload": {"$ref": "#/$defs/updatePreferencesRequest"}}}},
    ])
    defs["snapshot"]["required"].extend(["hostUserId", "settings", "ownPreferences", "removalCap", "expiresAt"])
    defs["snapshot"]["properties"].update({
        "hostUserId": {"$ref": "#/$defs/uuid"},
        "settings": {"$ref": "#/$defs/roomSettings"},
        "ownPreferences": {"$ref": "#/$defs/softPreferences"},
        "removalCap": {"type": ["integer", "null"], "minimum": 0, "maximum": 6},
        "expiresAt": {"$ref": "#/$defs/timestamp"},
    })
    defs["snapshot"]["allOf"].append({
        "if": {"properties": {"state": {"enum": ["ROUND_2", "WAITING_2"]}}},
        "then": {"properties": {"removalCap": {"type": "integer", "minimum": 1, "maximum": 6}}},
    })
    defs["previewJoinAck"] = {
        "type": "object", "required": ["joinable", "memberCount", "memberLimit", "dishCount", "mealSlot", "roomState"],
        "properties": {
            "joinable": {"type": "boolean"}, "memberCount": {"type": "integer", "minimum": 0, "maximum": 20},
            "memberLimit": {"const": 20}, "dishCount": {"type": "integer", "minimum": 10, "maximum": 20},
            "mealSlot": {"$ref": "#/$defs/mealSlot"},
            "roomState": {"enum": ["LOBBY", "ROUND_1", "WAITING_1", "ROUND_2", "WAITING_2", "DECIDED", "NO_CONSENSUS", "CANCELLED", "EXPIRED"]},
            "reasonCode": {"enum": ["ROOM_FULL", "ROOM_LOCKED", "ROOM_EXPIRED", "ROOM_TERMINAL"]},
        },
        "additionalProperties": False,
    }
    defs["settingsAck"] = {
        "type": "object", "required": ["accepted", "version", "poolVersion", "settings"],
        "properties": {"accepted": {"const": True}, "version": {"type": "integer", "minimum": 1}, "poolVersion": {"type": "integer", "minimum": 1}, "settings": {"$ref": "#/$defs/roomSettings"}},
        "additionalProperties": False,
    }
    defs["preferencesAck"] = {
        "type": "object", "required": ["accepted", "version", "poolVersion"],
        "properties": {"accepted": {"const": True}, "version": {"type": "integer", "minimum": 1}, "poolVersion": {"type": "integer", "minimum": 1}},
        "additionalProperties": False,
    }
    defs["finalizeAck"] = {
        "type": "object",
        "required": ["accepted", "outcome", "state", "round"],
        "properties": {
            "accepted": {"const": True}, "outcome": {"enum": ["ROUND_ADVANCED", "TERMINAL"]},
            "state": {"enum": ["ROUND_2", "DECIDED", "NO_CONSENSUS"]},
            "round": {"type": "integer", "enum": [1, 2]},
            "resultId": {"$ref": "#/$defs/uuid"}, "finalizedAt": {"$ref": "#/$defs/timestamp"},
        },
        "allOf": [
            {"if": {"properties": {"outcome": {"const": "ROUND_ADVANCED"}}, "required": ["outcome"]}, "then": {"properties": {"state": {"const": "ROUND_2"}, "round": {"const": 2}}, "not": {"anyOf": [{"required": ["resultId"]}, {"required": ["finalizedAt"]}]}}},
            {"if": {"properties": {"outcome": {"const": "TERMINAL"}}, "required": ["outcome"]}, "then": {"properties": {"state": {"enum": ["DECIDED", "NO_CONSENSUS"]}}, "required": ["resultId", "finalizedAt"]}},
        ],
        "additionalProperties": False,
    }
    defs["topDish"] = {
        "type": "object", "required": ["dish", "score", "rank", "isWinner"],
        "properties": {
            "dish": {"$ref": "#/$defs/poolDish"}, "score": {"type": "integer", "minimum": 0, "maximum": 40},
            "rank": {"type": "integer", "minimum": 1, "maximum": 3}, "isWinner": {"type": "boolean"},
        },
        "additionalProperties": False,
    }
    result = defs["terminalResult"]
    result["required"].extend(["scoreVersion", "rankingVersion", "topDishes"])
    result["properties"].update({
        "scoreVersion": {"const": "want2-ok1-round1-v1"},
        "rankingVersion": {"const": "score-desc-dense-rank-v1"},
        "topDishes": {"type": "array", "maxItems": 3, "items": {"$ref": "#/$defs/topDish"}},
    })
    result["allOf"].append({
        "if": {"properties": {"status": {"const": "DECIDED"}}, "required": ["status"]},
        "then": {
            "properties": {"topDishes": {"minItems": 1, "contains": {"properties": {"isWinner": {"const": True}}, "required": ["isWinner"]}}},
            "not": {"properties": {"topDishes": {"contains": {"properties": {"isWinner": {"const": True}}, "required": ["isWinner"]}, "minContains": 2}}},
        },
    })
    result["allOf"].append({
        "if": {"properties": {"status": {"const": "NO_CONSENSUS"}}, "required": ["status"]},
        "then": {"properties": {"topDishes": {"maxItems": 0}}},
    })

    # B is selected only by POST /rest/v1/rpc/dish_session_v4 with the
    # {command,payload} argument object. Legacy dish_session stays on v2/v3.
    for envelope_name in ("successEnvelope", "errorEnvelope"):
        envelope = defs[envelope_name]
        envelope["required"] = list(dict.fromkeys(
            ["contractVersion", "policyVersion"] + envelope["required"]
        ))
        envelope["properties"].update({
            "contractVersion": {"const": VERSION},
            "policyVersion": {"const": POLICY_VERSION},
        })

    # The room version protects lifecycle mutations. Ballot and waiting writes
    # are guarded by the caller's round/pool and own receipt so another
    # member's accepted ballot does not make a valid concurrent submission stale.
    defs["submitRequest"] = {
        "oneOf": [
            {
                "type": "object", "required": ["requestId", "roomId", "round", "poolVersion", "votes"],
                "properties": {
                    "requestId": {"$ref": "#/$defs/requestId"}, "roomId": {"$ref": "#/$defs/uuid"},
                    "round": {"const": 1}, "poolVersion": {"type": "integer", "minimum": 1},
                    "votes": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/round1Vote"}},
                }, "additionalProperties": False,
            },
            {
                "type": "object", "required": ["requestId", "roomId", "round", "poolVersion", "votes"],
                "properties": {
                    "requestId": {"$ref": "#/$defs/requestId"}, "roomId": {"$ref": "#/$defs/uuid"},
                    "round": {"const": 2}, "poolVersion": {"type": "integer", "minimum": 1},
                    "votes": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/round2Vote"}},
                }, "additionalProperties": False,
            },
        ]
    }
    defs["waitingRequest"] = {
        "type": "object", "required": ["requestId", "roomId", "round", "poolVersion"],
        "properties": {
            "requestId": {"$ref": "#/$defs/requestId"}, "roomId": {"$ref": "#/$defs/uuid"},
            "round": {"type": "integer", "enum": [1, 2]}, "poolVersion": {"type": "integer", "minimum": 1},
        }, "additionalProperties": False,
    }

    # Lobby pool recomputation can advance poolVersion without changing the
    # pinned contract. Remove the A-derived poolVersion=1 invariant.
    snapshot = defs["snapshot"]
    lobby_constraint = next(
        item for item in snapshot["allOf"]
        if item.get("if", {}).get("properties", {}).get("state", {}).get("const") == "LOBBY"
    )
    lobby_constraint["then"]["properties"].pop("poolVersion", None)

    # Shared state is WAITING after the first valid caller starts the timer;
    # non-submitters may still submit until serverTime reaches deadline.
    defs["member"]["properties"]["submissionStatus"]["enum"] = ["NOT_SUBMITTED", "ACCEPTED"]
    defs["member"]["properties"]["submissionStatus"]["description"] = (
        "Current-round complete ACK status only; does not imply that the caller is waiting."
    )
    snapshot["allOf"].extend([
        {
            "if": {"properties": {"state": {"enum": ["WAITING_1", "WAITING_2"]}}, "required": ["state"]},
            "then": {"properties": {"waitingStartedAt": {"$ref": "#/$defs/timestamp"}, "deadline": {"$ref": "#/$defs/timestamp"}}},
        },
        {
            "if": {"properties": {"state": {"enum": ["ROUND_1", "ROUND_2"]}}, "required": ["state"]},
            "then": {"properties": {"waitingStartedAt": {"type": "null"}, "deadline": {"type": "null"}}},
        },
    ])

    # Result bounds must use the complete, server-ACKed R1 cohort, not the
    # current-round submittedCount (which is different after R1 advances).
    result["required"].append("scoredRound1BallotCount")
    result["properties"]["scoredRound1BallotCount"] = {"type": "integer", "minimum": 0, "maximum": 20}
    result["allOf"].extend([
        {"if": {"properties": {"status": {"const": "NO_CONSENSUS"}, "round": {"const": 1}}, "required": ["status", "round"]}, "then": {"properties": {"reasonCode": {"const": "EMPTY_INTERSECTION"}}}},
        {"if": {"properties": {"status": {"const": "NO_CONSENSUS"}, "round": {"const": 2}}, "required": ["status", "round"]}, "then": {"properties": {"reasonCode": {"const": "ALL_REMOVED"}}}},
    ])

    # History uses one immutable result projection. Null score/podium fields
    # mean the legacy record never stored that capability; they are not zeros.
    participant = {
        "type": "object", "required": ["visibility", "memberCount", "selfUserId", "names"],
        "properties": {
            "visibility": {"enum": ["PERSONAL_SELF", "GROUP_COUNT_ONLY", "CONSENTED_GROUP_NAMES"]},
            "memberCount": {"type": "integer", "minimum": 1, "maximum": 20},
            "selfUserId": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/uuid"}]},
            "names": {"type": "array", "maxItems": 20, "items": {"type": "string", "minLength": 1, "maxLength": 24}},
        }, "additionalProperties": False,
        "allOf": [
            {"if": {"properties": {"visibility": {"const": "PERSONAL_SELF"}}, "required": ["visibility"]}, "then": {"properties": {"selfUserId": {"$ref": "#/$defs/uuid"}, "names": {"maxItems": 0}}}},
            {"if": {"properties": {"visibility": {"const": "GROUP_COUNT_ONLY"}}, "required": ["visibility"]}, "then": {"properties": {"selfUserId": {"type": "null"}, "names": {"maxItems": 0}}}},
            {"if": {"properties": {"visibility": {"const": "CONSENTED_GROUP_NAMES"}}, "required": ["visibility"]}, "then": {"properties": {"selfUserId": {"type": "null"}, "names": {"minItems": 1}}}},
        ],
    }
    defs["historyParticipantProjection"] = participant
    defs["legacyWinner"] = {
        "type": "object", "required": ["name", "artworkUrl"],
        "properties": {"name": {"type": "string", "minLength": 1, "maxLength": 256}, "artworkUrl": {"type": ["string", "null"]}},
        "additionalProperties": False,
    }
    defs["historySummary"] = {
        "type": "object",
        "required": ["historyId", "generation", "contractVersion", "policyVersion", "status", "round", "reasonCode", "desiredAt", "finalizedAt", "participants", "winner", "topDishes", "scoredRound1BallotCount", "scoreVersion", "rankingVersion"],
        "properties": {
            "historyId": {"$ref": "#/$defs/uuid"},
            "generation": {"enum": ["LEGACY_V2", "LEGACY_V3", "V4_B"]},
            "contractVersion": {"type": "string", "minLength": 1},
            "policyVersion": {"type": ["string", "null"]},
            "status": {"enum": ["DECIDED", "NO_CONSENSUS"]},
            "round": {"oneOf": [{"type": "null"}, {"type": "integer", "enum": [1, 2]}]},
            "reasonCode": {"type": ["string", "null"]},
            "desiredAt": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/timestamp"}]},
            "finalizedAt": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/timestamp"}]},
            "participants": {"$ref": "#/$defs/historyParticipantProjection"},
            "winner": {"oneOf": [{"type": "null"}, {"$ref": "#/$defs/poolDish"}, {"$ref": "#/$defs/legacyWinner"}]},
            "topDishes": {"oneOf": [{"type": "null"}, {"type": "array", "maxItems": 3, "items": {"$ref": "#/$defs/topDish"}}]},
            "scoredRound1BallotCount": {"type": ["integer", "null"], "minimum": 0, "maximum": 20},
            "scoreVersion": {"type": ["string", "null"]},
            "rankingVersion": {"type": ["string", "null"]},
        }, "additionalProperties": False,
        "allOf": [
            {"if": {"properties": {"generation": {"enum": ["LEGACY_V2", "LEGACY_V3"]}}, "required": ["generation"]}, "then": {"properties": {"topDishes": {"type": "null"}, "scoredRound1BallotCount": {"type": "null"}, "scoreVersion": {"type": "null"}, "rankingVersion": {"type": "null"}}}},
            {"if": {"properties": {"generation": {"const": "V4_B"}}, "required": ["generation"]}, "then": {"required": ["round", "finalizedAt"], "properties": {"round": {"type": "integer"}, "finalizedAt": {"$ref": "#/$defs/timestamp"}, "policyVersion": {"const": POLICY_VERSION}, "participants": {"properties": {"visibility": {"enum": ["PERSONAL_SELF", "CONSENTED_GROUP_NAMES"]}}}, "topDishes": {"type": "array"}, "scoredRound1BallotCount": {"type": "integer"}, "scoreVersion": {"const": SCORE_VERSION}, "rankingVersion": {"const": RANKING_VERSION}}}},
            {"if": {"properties": {"generation": {"const": "V4_B"}, "status": {"const": "DECIDED"}}, "required": ["generation", "status"]}, "then": {"properties": {"winner": {"$ref": "#/$defs/poolDish"}}}},
            {"if": {"properties": {"generation": {"const": "V4_B"}, "status": {"const": "NO_CONSENSUS"}}, "required": ["generation", "status"]}, "then": {"properties": {"winner": {"type": "null"}, "topDishes": {"maxItems": 0}}}},
            {"if": {"properties": {"generation": {"const": "V4_B"}, "status": {"const": "NO_CONSENSUS"}, "round": {"const": 1}}, "required": ["generation", "status", "round"]}, "then": {"properties": {"reasonCode": {"const": "EMPTY_INTERSECTION"}}}},
            {"if": {"properties": {"generation": {"const": "V4_B"}, "status": {"const": "NO_CONSENSUS"}, "round": {"const": 2}}, "required": ["generation", "status", "round"]}, "then": {"properties": {"reasonCode": {"const": "ALL_REMOVED"}}}},
        ],
    }
    history_detail = json.loads(json.dumps(defs["historySummary"]))
    history_detail["required"].append("lockedDishes")
    history_detail["properties"]["lockedDishes"] = {
        "oneOf": [
            {"type": "null"},
            {"type": "array", "maxItems": 20, "items": {"$ref": "#/$defs/poolDish"}},
        ]
    }
    history_detail["allOf"].extend([
        {"if": {"properties": {"generation": {"enum": ["LEGACY_V2", "LEGACY_V3"]}}, "required": ["generation"]}, "then": {"properties": {"lockedDishes": {"type": "null"}}}},
        {"if": {"properties": {"generation": {"const": "V4_B"}}, "required": ["generation"]}, "then": {"properties": {"lockedDishes": {"type": "array"}}}},
    ])
    defs["historyDetail"] = history_detail
    defs["successEnvelope"]["properties"]["data"]["oneOf"].extend([
        {"$ref": "#/$defs/previewJoinAck"}, {"$ref": "#/$defs/settingsAck"}, {"$ref": "#/$defs/preferencesAck"},
    ])
    return schema


if __name__ == "__main__":
    TARGET.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {TARGET.relative_to(ROOT)} from immutable GM-07.A schema")
