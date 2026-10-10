# Decision spec — v0.2

2026-10-07 • policyVersion decision-v2 • FR-05..08. Thứ tự chọn giữ hai vòng; v2 bổ sung matchTier và contract lý do. Chờ review độc lập; [engine GM-06 draft](../../mobile/src/domain/decision/README.md) đã có tests thuần, chưa có API triển khai hoặc SQL parity.

## Input và vòng 1

Roster/context/pool khóa; phiếu WANT/OK/NO đầy đủ mỗi món, UNSET không gửi. Server đợi mọi thành viên, không early match hay bỏ người offline. Trước Gửi sửa draft; khi queued/sending tuân [outbox](OFFLINE_SYNC_SPEC.md).

Tập M: mọi người WANT. M không rỗng → server random đều một lần trong M, persist DECIDED/PERFECT. Nếu M rỗng, A gồm món không NO, đủ WANT/OK. A rỗng → NO_CONSENSUS/EMPTY_INTERSECTION; A khác rỗng → ROUND_2 đúng A. Copy: Chưa có món cả nhóm cùng muốn; còn X món mọi người ăn được. Không nêu ai từ chối.

## Vòng 2 và điểm

Giữ/Loại thêm từng món A; mặc định draft Giữ, user phải bấm xác nhận kể cả chỉ 1 món. S là tập mọi thành viên giữ; S rỗng → NO_CONSENSUS/ALL_REMOVED. S còn → score(d)=2×WANT(d)+OK(d)=n+WANT(d). Chỉ tính trong S; NO/REMOVE là loại trừ, không có điểm để bù. Chọn score cao nhất, hòa thì server random đều một lần; lưu resultId/winnerId/tiedIds/policyVersion/finalizedAt. Retry/reconnect không bốc lại, không vòng 3/reroll.

## Nhãn và giải thích

| matchTier | Điều kiện | Copy công khai |
| --- | --- | --- |
| PERFECT | WANT=n | Cả nhóm cùng muốn ăn món này |
| CONSENSUS | n/2 < WANT < n, mọi người giữ vòng 2 | Đa số muốn ăn và mọi người đều giữ món này |
| COMPROMISE | 0 <= WANT <= n/2, mọi người giữ vòng 2 | Phương án cả nhóm ăn được, ưu tiên theo mức muốn ăn |
| NO_CONSENSUS | A hoặc S rỗng | Chưa có phương án mọi người cùng chấp nhận |

Ngưỡng là quy tắc sản phẩm được đề xuất, không chuẩn học thuật. Không trả score/count theo user hoặc matrix phiếu ra shared snapshot. matchTier tiết lộ thông tin tổng hợp nên nhóm nhỏ có thể suy luận; không hứa ẩn danh tuyệt đối. Public reasonCode/matchTier; tiedIds giữ server/internal, không tạo thao tác vote lần 3.

No Consensus cho Kết thúc/Tạo phiên mới; phiên mới phải ready và chọn lại, không auto carry phiếu. Core cho đổi meal/category/budget từ catalogue; nhập món mới ngoài catalogue chưa thuộc scope.

## Invariants

DEC-01 NO/REMOVE không winner. DEC-02 thiếu member/dish không finalize. DEC-03 cùng resultId/winner/version. DEC-04 cùng requestId/payload trả ACK cũ, khác payload báo lỗi. DEC-05 <=2 vòng, terminal immutable. DEC-06 một món không unanimous vẫn cần mọi xác nhận vòng 2. DEC-07 TypeScript/SQL cùng fixtures. DEC-08 nhãn đúng threshold và không lộ matrix. Context/history chỉ xếp pool, không đổi điểm hoặc veto sau start.

Ví dụ n=4: phở [W,W,O,O]=6; cơm [W,W,W,O]=7; lẩu [W,W,W,NO] loại. Cả nhóm giữ phở/cơm → cơm CONSENSUS. Hai WANT/hai OK → COMPROMISE. Tất cả OK vẫn hợp lệ và COMPROMISE.

Fixture WAITING là thiếu dữ liệu, không thêm RoomState. Test T-04/05/07/22; [fixtures](../../tests/fixtures/decision-cases.json) và [nhãn](../../tests/fixtures/consensus-tier-cases.json).
