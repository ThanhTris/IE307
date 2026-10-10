# GM-15 — mapping draft và boundary cần review

Proposal, chưa Approved. Engine decision-v2/1.0.0 nhận locked snapshot nội bộ,
không nhận DTO client hoặc tự đọc DB. GM-04 proposal food-v1/roadmap-v2/GM-04.2,
food1.1.0/core1.1.0 tại d428a80 (feature8f90af5); chưa review/merge. GM-07
mobile/src/data/api/contracts.ts chưa được bàn giao/duyệt. Không có adapter runtime
hoặc assertion cross-contract integration trước khi nhận DTO đúng revision.

## Field mapping cho adapter server sau này

| Engine | Field upstream | Quy tắc adapter phải kiểm |
| --- | --- | --- |
| policyVersion | rooms.policyVersion | decision-v2, dùng policy khóa tại start |
| roster | rooms.rosterUserIds | User IDs khóa tường minh, không suy từ submissions |
| pool | roundDishes.choiceId của room/vòng1/poolVersion khóa | Choice ID của dish/variant, không dishId, offeringId hoặc row.id; tối đa8 do upstream kiểm |
| round | server round/state khóa | Không suy round từ việc thấy field round2 hoặc default KEEP |
| round1/round2 member keys | submissions.memberId → members.id → members.userId | Đúng room/locked roster, ACK hợp lệ/poolVersion/expiry; không dùng draft UI |
| round1/round2 choice keys | votes.roundDishId → roundDishes.id → choiceId | Đúng room/round và poolVersion; vòng2 chỉ tập A đã tính từ vòng1 |
| vote value | votes.value | WANT/OK/NO vòng1; KEEP/REMOVE vòng2; thiếu ACK là thiếu key, không tự OK/KEEP. UNSET chỉ draft simulation nội bộ, không persisted submission |
| INVALID_INPUT / WAITING | Diagnostics / progress nội bộ | Không public toàn bộ engine output/path hoặc suy thành RPC error chưa review |
| ROUND_2 candidateIds | Pool vòng2 nội bộ | Server chuyển state, lưu snapshot, project allowed choice metadata |
| DECISION_READY | Input cho GM-20 finalize | Candidate set chưa là winner/persisted DECIDED; không serialize ties ra client |
| NO_CONSENSUS | results.reasonCode/matchTier, winner null | GM-20 persist terminal atomically; thiếu ACK không finalize |
| reasonCode / matchTier | results.reasonCode/matchTier | Enum khớp field proposal; DTO/public result GM-07 cần review |

roomId/version/context/source/freshness/auth/submission ACK/idempotency được
caller server kiểm trước evaluateDecision. Engine không thể chứng minh quyền
truy cập, UUID/FK/offering/lịch/coverage hoặc transaction bằng ID chuỗi.

## Gap seed/winner: proposal theo lựa chọn owner

Task GM-15 main và issue #76 hiện yêu cầu input/seed → winner, tie chọn một lần
theo seed. **Candidate-only chưa đáp ứng AC đó**. Owner trước đây đã chọn engine
chỉ trả candidate set, server chọn đều một lần và persist; patch này giữ lựa chọn.

Đề xuất Trí chốt boundary: GM-15 evaluator trả tập ứng viên ổn định; GM-20 nhận
seed/entropy server và tập đó, chọn đều một lần dưới lock, persist winner/result/
version/finalizedAt, tra ACK cũ trước version khi retry. Nếu reviewer giữ AC
selector thuần ở GM-15 thì cần chốt seed contract/fixture và ủy quyền bổ sung
selector; chưa thêm selector, chưa tự cập nhật task/spec/AC hoặc enum RoomState.

Repeat/permutation của hàm chỉ chứng minh cùng tập ứng viên; không chứng minh
uniform winner, seeded selection hoặc retry backend/terminal immutability.
Public snapshot không có raw matrix/count/score/ties; projection thuộc GM-07/20.

## Fixtures cho SQL consumer

[parity-map.json](../../../../tests/fixtures/decision-v2/parity-map.json) kê từng
ID nguồn:53 golden +28 roster cases giữ full expected,6 legacy decision dùng
roster/pool tường minh và DECIDED → DECISION_READY chỉ để so status/candidateIds.
7 tier cases dùng helper classifyTier(n,want,eligible), không giả persisted result.
Không sửa expected theo output engine. SQL adapter sau này phải trả cùng shape
nội bộ để đối chiếu; **chưa chạy TypeScript/SQL parity**. Trường optional absent
khác null; diagnostics order/candidateIds sort phải ổn định khi so full vectors.
