# GM-13.2 — bước 1: input UI và fixtures

Ngày 2026-11-03, base7e24074, branch codex/gm-13-figma-update.
Start gate live18:14:54.967856Z ngày02/11 (03/11 UTC+7): READY_TO_CLAIM.

Đã thêm UI input scored-v4/legacy-unscored, public roster, read state,
Places state và action callbacks trong resultPresentation.ts. Không sửa
wire DTO/client GM-07; room context được composition nhận riêng.

Validation kiểm dense rank, score bound theo ACK cohort nếu được cung
cấp, tối đa3 món, ID duy nhất, đúng một winner ở rank1, deep equality
toàn bộ locked projection, reason/round và NO_CONSENSUS null/empty.
Baseline B có thể thiếu cohort, supplement bắt buộc; không suy từ roster.
Giá giữ đơn vị/source/time, thiếu hoặc không hợp lệ thì không hiển thị.

Bootstrap có fixture cố định cho1/2/3/ties/nullable/legacy/invalid/read
states và2 NO_CONSENSUS; nearby fixtures là synthetic, không Google data.
Không ghi/reroll engine, không gọi network/DB hoặc thêm package.

TypeScript Pass; unit18/18 Pass6.29s; lint tập trung Pass. Kế hoạch/audit
đã chuẩn bị được nhận cùng commit bước1, hash đầu vào lịch sử giữ nguyên.
Chưa đổi routes hoặc nghiệm thu UI/Android/API. Bước7 vẫn Not run.
