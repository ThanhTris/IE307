# Data model — v0.2

2026-10-07 • schema/API đề xuất chờ review. UTC server, UUID/FK/index/constraints/migrations; catalogue/context/policy version tách nhau.

| Entity | Trường và constraint chính | Quyền |
| --- | --- | --- |
| profiles | user_id PK auth, display_name 1–24, preferences tự khai nullable | self; tên qua snapshot |
| dishes | id/version/name/tags/categories/mealSlots, artwork source/license, priceRange/unit/source/area/checkedAt nullable, published | published read |
| rooms | id/code unique/host/state/version, mealSlot/timeHint/budget/avoidRecent, catalog/context/policy versions, poolSeed, expiresAt | member qua RPC |
| members | unique(room,user), nickname, category preferences private, ready, historyConsent, consentSnapshot lúc start | own writes RPC; roster tối thiểu |
| round_dishes | unique(room,round,dish), snapshot/ordinal, round<=2 | member |
| submissions/votes | unique(room,round,user), intentId/hash/requestId; unique vote theo dish FK pool | owner; trusted finalize |
| results | room unique, resultId/winner, reasonCode/matchTier/policyVersion, tiedIds internal, finalizedAt/version | member; không raw score/count |
| idempotency | unique(user,operation,requestId), payload hash/response/expiry | RPC only |
| partner_invites/pair_links | sender/recipient/state/expiresAt; canonical pair unique | hai bên, accept recipient |
| room_invites | id/room/sender/recipient/state/expiresAt/eventId unique; room không muộn hơn expiry | sender/recipient, accept kiểm pair/room |
| personal_history | unique(user,result), dish snapshot/meal/timestamp/tier/groupKey, expiresAt | owner opt-in |
| group_history_summary | unique(groupKey,result), canonical roster, minimal winner/time, consent, expiresAt | đúng member, mọi người opt-in |
| push_devices | auth user/device/token private, permission/active/lastSeen | own register/unregister RPC, sender read |
| notification_events/deliveries | unique(eventId,recipient), room/invite/result reference, state/ticket/receipt/attempts/expiry | trusted sender, không client list |
| venues/venue_dishes P1 | venue coords, coverage, source/checkedAt, dish mapping, price optional | pilot published only |

Local SQLite: own drafts, cache fetchedAt/serverVersion, immutable outbox intent + attempts, consent history; token ở secure storage. Tách theo auth user, TTL/logout clear. Không cache raw vote người khác hoặc user location. Schema migrations có backup/upgrade test, chưa có SQL được chạy.

join/start/submit/cancel transaction lock room; start khóa roster/pool/context/consent. finalize ghi result+history được phép+notification event trong cùng transaction để không phát kết quả chưa commit. Push sender xử lý sau commit; không làm network push trong transaction. Tra idempotency trước version để ACK retry.

MealSlot breakfast/lunch/dinner/snack (late-night là hint). RoomState LOBBY/ROUND_1/ROUND_2/DECIDED/NO_CONSENSUS/CANCELLED/EXPIRED. Round1 WANT/OK/NO; Round2 KEEP/REMOVE. MatchTier PERFECT/CONSENSUS/COMPROMISE/NO_CONSENSUS. ResultReason UNANIMOUS_WANT/ACCEPTABLE_FINAL/EMPTY_INTERSECTION/ALL_REMOVED.

[Privacy/TTL](../specs/IDENTITY_PRIVACY_SPEC.md) · [RPC](API_CONTRACT.md).
