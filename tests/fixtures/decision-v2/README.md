# Fixtures mô phỏng — GM-15 decision-v2 (legacy GM-06)

`cases.json`: 53 ca với roster/pool/round tường minh và expected viết từ spec,
không sinh bằng engine. fixtureOnly=true, policy decision-v2, engine contract
1.0.0. ID món/member giả lập; không là phiếu thật/seed. specRefs chỉ dẫn spec và
T-04/07/22; phạm vi chi tiết theo từng description.

Bao phủ unanimous/nhiều M; A/NO; UNSET/member/dish thiếu; xác nhận một món;
KEEP/REMOVE; tie/score; tier chẵn/lẻ/allOK; variant choice IDs; ID trùng/reference
lạ, enum/schema/transition sai. Expected so toàn bộ evaluation.

[README engine](../../../mobile/src/domain/decision/README.md) định nghĩa
interface/error/nullability. Candidate IDs là tập nội bộ; DECISION_READY không
là kết quả persist. WAITING không bổ sung RoomState. Vòng 2 chưa gửi là field
absent, không null/default KEEP. SQL adapter tương lai cần chuyển về cùng shape
để so fixtures; chưa SQL nào thực thi các ca này.

Hai fixtures lịch sử decision-cases.json và consensus-tier-cases.json giữ nguyên.
Test adapter lịch sử dùng roster/pool tường minh và đổi DECIDED → DECISION_READY
chỉ trong assertion, vì engine không persist. Không coi đó là backend finalize.

Chạy `node --test mobile/tests/decision.test.mjs` từ root với Node 24. Tests còn
kiểm 81 matrices vòng 1 cho 2 member/2 món cùng mọi KEEP/REMOVE trên A, công thức
điểm/ngưỡng 2–8 người, repeat/order/frozen input và own-key/prototype cases.
Không API/SQL/clock, không áp fixture vào catalogue GM-03 hoặc food eligibility
GM-11. Không tự sinh lại expected khi tests thất bại.

## Bổ sung review roadmap-v2

roster-cases.json thêm28 expected tĩnh cho2–8 người (WANT/UNSET/tie/REMOVE).
53 vectors gốc và fixtures lịch sử giữ nguyên byte. parity-map.json kê mọi ID/projection,
gồm6 decision và7 tier examples lịch sử; SQL chưa chạy. Domain suite104 tests;
check-decision.mjs xuất87 evaluator +7 tier input/expected/actual,repeat/permutation/
input unchanged. CI Node riêng tránh Jest bỏ sót .mjs. Không ghi winner từ candidate set.
