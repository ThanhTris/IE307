# GM-15 — mapping trên main có GM-07

Bản bổ sung 2026-10-11, review Pending. Base nhận **3076c3deb2937223a007b82211a61a2d61b63c84**; PR #62 data, #102 schema, #103 importer, #104 API DTO đã merge. Food/core interchange 1.1.0, schema 0.1.0; GM-07 base contract food-v1/roadmap-v2/GM-07.1 (tested code 3f7f241, merge0711782); task GM-15.2, evaluator1.0.0 + selector1.0.0. Migration0003 chỉ provenance description, không đổi thuật toán decision.

Không còn ghi GM-07 chưa bàn giao. Comment review Trí ngày11/10 báo Project GM-04/07 Done và READY_FOR_MERGE_REVIEW. Local checker lần này không đọc được Project do credential thiếu read:project; ghi BLOCKED_PROJECT_UNVERIFIED, không suy dependency chưa Done hoặc tự thay Project. Review GM-15 vẫn Pending.

| Domain | Input/output upstream | Assertion/boundary |
| --- | --- | --- |
| policyVersion | rooms.policyVersion, RoomResult.policyVersion | decision-v2, khác food interchange1.1.0 |
| roster | rooms.rosterUserIds khóa phía server | Không suy từ số submission, RoomSnapshot.members/ownVotes hoặc member offline |
| pool | round_dishes.choice_id | Choice ID bất biến theo dish/variant; cùng dishId khác venue/variant không bị gộp |
| matrix key | BallotVoteItem.roundDishId → round_dishes.id → choice_id | mapAcceptedBallots dùng row map đúng room/round/poolVersion do caller cung cấp; không dishId/offeringId thay choice |
| accepted votes | submissions.member_id → members.user_id | Caller kiểm auth/ACK/version/expiry trước mapping; UNSET/draft KEEP không là submission |
| seed | Seed quyết định private riêng của server | Canonical8 lowercase hex; không implicit rooms.poolSeed conversion; không client seed |
| DECISION_READY | evaluator candidateIds | Tập hòa private, chưa winner/persist |
| DECISION_SELECTED | selector winnerId | Choice ID private; vẫn chưa là persisted DECIDED |
| winnerRoundDishId | selectedResultFields → row ID của vòng kết quả | Map ngược qua choiceId; winnerDish lấy metadata đúng row đó; không trộn giá/venue |
| policy/reason/tier | RoomResult + results schema | Types/guard/mock canonical; reason UNANIMOUS_WANT/ACCEPTABLE_FINAL/EMPTY_INTERSECTION/ALL_REMOVED, tier PERFECT/CONSENSUS/COMPROMISE/NO_CONSENSUS |
| Public projection | RoomResult | selectedResultFields whitelist4 fields, không ties/matrices/score/count/diagnostics; GM-20 thêm persisted metadata |

Helpers [choiceMapping.ts](../../../../mobile/src/domain/decision/choiceMapping.ts) dùng cấu trúc thuần, domain không import API/network/database. Jest [decisionContract.test.ts](../../../../mobile/tests/unit/decisionContract.test.ts) kiểm với GM-07 DTO/runtime guard và **actual mock**. Đây là assertions mô phỏng, không RPC/SQL. Mock còn scenario tự xác nhận/ép unanimous phục vụ UI; không dùng nó làm evidence finalize nhiều người.

Owner đã chốt bổ sung selector để giữ AC hiện hành ngày11/10; [ADR-012](../../../architecture/decisions/ADR-012-seeded-domain-selection.md) mô tả seed/algorithm/boundary. Không đổi AC thành N/A. SQL consumer GM-20 nhận [parity map](../../../../tests/fixtures/decision-v2/parity-map.json) và [seeded vectors](../../../../tests/fixtures/decision-v2/seeded-cases.json); phải kiểm evaluate + select cùng input/seed/algorithm, sau đó kiểm transaction riêng. Chưa TypeScript/SQL parity, secure entropy, persisted retry hoặc eligibility GM-18.
