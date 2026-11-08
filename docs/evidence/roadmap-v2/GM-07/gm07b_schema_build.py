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
        "join preview, member submission status and immutable aggregate Top 3 results. "
        "It is not a deployed runtime contract."
    )
    defs = schema["$defs"]
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
    defs["snapshot"]["required"].extend(["hostUserId", "settings", "ownPreferences", "removalCap", "expiresAt", "canEndWaiting"])
    defs["snapshot"]["properties"].update({
        "hostUserId": {"$ref": "#/$defs/uuid"},
        "settings": {"$ref": "#/$defs/roomSettings"},
        "ownPreferences": {"$ref": "#/$defs/softPreferences"},
        "removalCap": {"type": ["integer", "null"], "minimum": 0, "maximum": 6},
        "expiresAt": {"$ref": "#/$defs/timestamp"},
        "canEndWaiting": {
            "type": "boolean",
            "description": "True only for the host while this round is waiting and submittedCount > memberCount / 2; the server rechecks the action.",
        },
    })
    defs["snapshot"]["properties"]["submittedCount"]["description"] = (
        "Complete ballots accepted and ACKed by the server for this snapshot's current round only."
    )
    defs["snapshot"]["properties"]["memberCount"]["description"] = (
        "Locked started-session roster size including the host; not online presence and not reduced by disconnects."
    )
    defs["snapshot"]["allOf"].append({
        "if": {"properties": {"state": {"enum": ["ROUND_2", "WAITING_2"]}}},
        "then": {"properties": {"removalCap": {"type": "integer", "minimum": 1, "maximum": 6}}},
    })
    defs["snapshot"]["allOf"].append({
        "if": {"properties": {"state": {"enum": ["LOBBY", "ROUND_1", "ROUND_2", "DECIDED", "NO_CONSENSUS", "CANCELLED"]}}},
        "then": {"properties": {"canEndWaiting": {"const": False}}},
    })
    defs["previewJoinAck"] = {
        "type": "object", "required": ["joinable", "memberCount", "memberLimit", "dishCount", "mealSlot", "roomState"],
        "properties": {
            "joinable": {"type": "boolean"}, "memberCount": {"type": "integer", "minimum": 0, "maximum": 20},
            "memberLimit": {"const": 20}, "dishCount": {"type": "integer", "minimum": 10, "maximum": 20},
            "mealSlot": {"$ref": "#/$defs/mealSlot"},
            "roomState": {"enum": ["LOBBY", "ROUND_1", "WAITING_1", "ROUND_2", "WAITING_2", "DECIDED", "NO_CONSENSUS", "CANCELLED"]},
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
            "dish": {"$ref": "#/$defs/poolDish"}, "score": {"type": "integer", "minimum": 0},
            "rank": {"type": "integer", "minimum": 1}, "isWinner": {"type": "boolean"},
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
    if "NOT_READY" not in defs["errorCode"]["enum"]:
        defs["errorCode"]["enum"].append("NOT_READY")
    defs["errorCode"]["description"] = (
        "NOT_READY rejects a manual host early-end request before the current-round strict-majority gate is met."
    )
    result["allOf"].append({
        "if": {"properties": {"status": {"const": "NO_CONSENSUS"}}, "required": ["status"]},
        "then": {"properties": {"topDishes": {"maxItems": 0}}},
    })
    defs["successEnvelope"]["properties"]["data"]["oneOf"].extend([
        {"$ref": "#/$defs/previewJoinAck"}, {"$ref": "#/$defs/settingsAck"}, {"$ref": "#/$defs/preferencesAck"},
    ])
    return schema


if __name__ == "__main__":
    TARGET.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {TARGET.relative_to(ROOT)} from immutable GM-07.A schema")
