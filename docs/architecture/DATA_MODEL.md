# Data model đề xuất

Draft v0.1. Timestamp UTC server, ID UUID, FK/index/constraint bằng migrations. Schema version tách catalogue/policy version.

| Entity | Trường/constraint | Quyền đọc |
| --- | --- | --- |
| profiles | user_id PK auth.users, display_name 1–24, created_at | chính mình; tên qua snapshot |
| dishes | id, version, name, category_ids, meal_slots, ingredient_tags nullable, artwork_source nullable, published | catalogue published |
| rooms | id, code unique, host_id, meal_slot, state, version, catalog_version, policy_version, expires_at | member qua snapshot |
| members | (room_id,user_id) unique, nickname_snapshot, categories[], ready, joined_at | member qua snapshot |
| round_dishes | (room_id,round,dish_id) unique, dish snapshot, ordinal; round 1/2 | member |
| submissions | (room_id,round,user_id) unique, request_id, payload_hash, submitted_at | owner; tiến độ tổng hợp |
| votes | (room_id,round,user_id,dish_id) unique, value; FK submission và round_dish | owner và RPC tổng hợp |
| results | room_id unique, result_id, winner_id nullable, reason_code, tied_ids, finalized_at, version | member |
| idempotency | (user_id,operation,request_id) unique, payload_hash, response, expires_at | RPC, không public select |
| pair_links P1 | canonical pair unique, invited_by, status | hai bên |
| history P1 | user_id, winner snapshot, timestamp; không raw votes | chính mình |

`join_room` lock room rồi kiểm count/state/expiry; `start_round` lock và snapshot roster/pool trong transaction. `submit_ballot` lock, kiểm quyền/vòng/payload; ghi cả votes/submission và chốt khi đủ người trong cùng transaction.

Tra idempotency trước kiểm version mới để retry trả ACK cũ. Không dùng client seed/time cho winner. Client không tự đặt host_id/user_id. Cleanup theo [privacy](../specs/IDENTITY_PRIVACY_SPEC.md).

Enums: MealSlot `breakfast|lunch|dinner|snack`; RoomState `LOBBY|ROUND_1|ROUND_2|DECIDED|NO_CONSENSUS|CANCELLED|EXPIRED`; Round1 `WANT|OK|NO`; Round2 `KEEP|REMOVE`; ResultReason `UNANIMOUS_WANT|ACCEPTABLE_FINAL|EMPTY_INTERSECTION|ALL_REMOVED`.

Rollback/migration có fixture database; không sửa dashboard rồi bỏ migration.
