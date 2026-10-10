# Data model — food-v1

2026-10-07 • schema/API đề xuất chờ GM-01 review. UTC server, UUID/FK/index/constraints/migrations; catalogue/context/policy version tách nhau.

| Entity | Trường và constraint chính | Quyền |
| --- | --- | --- |
| profiles | user_id PK auth, display_name 1–24, preferences tự khai nullable | self; tên qua snapshot |
| dishes | id/version/name/tags/categories/mealSlots, artwork source/license, priceRange/unit/source/area/checkedAt nullable, published | published read |
| rooms | id/code unique/host/state/version, mealSlot/timeHint/budget/avoidRecent, catalog/context/policy/dataset/eligibility versions, poolSeed, anchorId/radiusM/desiredAt/serviceMode, evaluatedAt, expiresAt | member qua RPC |
| members | unique(room,user), nickname, category preferences private, ready, historyConsent, consentSnapshot lúc start | own writes RPC; roster tối thiểu |
| round_dishes | unique(room,round,dish), dish/variant + offering/schedule snapshot/ordinal, round<=2 | member |
| submissions/votes | unique(room,round,user), intentId/hash/requestId; unique vote theo dish FK pool | owner; trusted finalize |
| results | room unique, resultId/winner, reasonCode/matchTier/policyVersion, tiedIds internal, finalizedAt/version | member; không raw score/count |
| idempotency | unique(user,operation,requestId), payload hash/response/expiry | RPC only |
| partner_invites/pair_links | sender/recipient/state/expiresAt; canonical pair unique | hai bên, accept recipient |
| room_invites | id/room/sender/recipient/state/expiresAt/eventId unique; room không muộn hơn expiry | sender/recipient, accept kiểm pair/room |
| personal_history | unique(user,result), dish snapshot/meal/timestamp/tier/groupKey, expiresAt | owner opt-in |
| group_history_summary | unique(groupKey,result), canonical roster, minimal winner/time, consent, expiresAt | đúng member, mọi người opt-in |
| push_devices | auth user/device/token private, permission/active/lastSeen | own register/unregister RPC, sender read |
| notification_events/deliveries | unique(eventId,recipient), room/invite/result reference, state/ticket/receipt/attempts/expiry | trusted sender, không client list |
| taxonomy/venues/venue_dishes P0 | cuisine/category/temp/flavor; branch coords/timezone/status, offering variant/profile/menu/price unit/source/checkedAt/validUntil | published verified read; trusted publisher only write |
| schedules/date_exceptions P0 | lịch quán và món riêng, day/start/end/endDayOffset, date overrides/last order/timezone/source freshness | cùng quyền published dataset |
| availability_overrides P0 | offering/state/source/observedAt/expiresAt | trusted write; unknown khác available |
| coverage_areas/public_anchors P0 | boundary/version, anchor công cộng/name/coords, checkedAt/validUntil | published read |
| data_sources/dataset_versions P0 | source/usageRights/enteredBy/reviewedBy/status/version/rollback | reviewer khác người nhập |

Local SQLite: own drafts, cache fetchedAt/serverVersion, immutable outbox intent + attempts, consent history; token ở secure storage. Tách theo auth user, TTL/logout clear. Không cache raw vote người khác hoặc user location. Schema migrations có backup/upgrade test, chưa có SQL được chạy.

join/start/submit/cancel transaction lock room; start khóa roster/pool/context/consent. finalize ghi result+history được phép+notification event trong cùng transaction để không phát kết quả chưa commit. Push sender xử lý sau commit; không làm network push trong transaction. Tra idempotency trước version để ACK retry.

MealSlot breakfast/lunch/dinner/snack (late-night là hint). RoomState LOBBY/ROUND_1/ROUND_2/DECIDED/NO_CONSENSUS/CANCELLED/EXPIRED. Round1 WANT/OK/NO; Round2 KEEP/REMOVE. MatchTier PERFECT/CONSENSUS/COMPROMISE/NO_CONSENSUS. ResultReason UNANIMOUS_WANT/ACCEPTABLE_FINAL/EMPTY_INTERSECTION/ALL_REMOVED.

[Privacy/TTL](../specs/IDENTITY_PRIVACY_SPEC.md) · [RPC](API_CONTRACT.md).

Food-v1 chốt field contract/constraints tại [FOOD_DATA_SPEC](../specs/FOOD_DATA_SPEC.md). GM-06 cung cấp SQL setup/runner/migration trước GM-08 import seed; GM-17 quyền, GM-18 eligibility; GM-19 revalidate/lock dataset snapshot trong start transaction. Anchor là điểm công cộng được nhóm xác nhận, không GPS user; hết TTL room dọn context và không copy vào history mặc định. Weather/mood GM-38 có migration riêng sau core. Chưa có SQL/app được triển khai.
