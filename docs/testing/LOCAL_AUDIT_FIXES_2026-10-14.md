# Sửa local sau audit main — 2026-10-14

Phạm vi chủ dự án chốt: sửa assertion RLS GM-17, ownership/cleanup runtime của runner GM-19 và tài liệu bối cảnh. Ban đầu chỉ sửa local; sau khi báo kết quả kiểm, chủ dự án yêu cầu commit/push lên main. Không đổi approval/Done trên Project. Base source trước bản sửa `5b148de7b296fa8bccb8385fbcebebdb32855892`; không sửa migration đã merge.

## Thay đổi

- `supabase/tests/rls.sql`: kiểm registry có đúng contract/schema GM-17 thay vì bắt tổng số dòng bằng 2. Migration sau được thêm version mà không gây Fail giả; các assertion quyền riêng tư/retention còn nguyên.
- `scripts/gm19_runtime_files.mjs` và runner GM-19: preflight từ chối runtime có sẵn khi mở Bruno; tạo file exclusive, chỉ cleanup file chính lượt chạy tạo và còn cùng identity/nội dung. File của phiên khác hoặc bị sửa/thay thế được giữ. Cleanup lỗi trả exit nonzero; `--against` giữ fixture. Đây là bảo vệ ownership trong vận hành bình thường, không cam kết unlink atomic chống một tiến trình cố ý thay file đúng lúc cleanup.
- README/AGENTS cập nhật stage source, reviewer Trí và phân biệt source, database deployed, mock, native evidence. Git pull/health không tự migrate database hoặc chứng minh RPC đang chạy khớp main.
- Thêm 11 ca ownership và bước chạy trên workflow foundations. Kết quả dưới đây là kiểm local trước commit; không phải xác nhận workflow GitHub đã Pass cho bản sửa.

## Kết quả kiểm local

| Bộ kiểm | Kết quả | Giới hạn |
| --- | --- | --- |
| GM-17 `gm17_access_check.py` | Pass, 93 SQL assertions | DB test disposable; SQL claims không chứng minh JWT; concurrent cleanup không chạy ở lượt này |
| Node backend/runtime ownership | Pass, 19 test (8 nền + 11 ownership) | Synthetic runtime, không thay real HTTP/RPC hoặc Bruno |
| Python regression | Pass, 550 test | Tooling/fixtures, không thay Android evidence |
| Repository validator, generated indexes | Pass | Không thay review của Trí |
| Node syntax, `git diff --check` | Pass | Không khẳng định app/release hoàn thiện |

Report SQL và audit chi tiết nằm trong `review-results/` local-only. Không ghi đè evidence nghiệm thu lịch sử; không chạy lại full GM-19 HTTP/Bruno hoặc Android ở lượt sửa này. Database test của GM-17 được runner cleanup; không reset/reconcile app database, không dừng fixture người khác.

## Chưa sửa trong phạm vi này

- App database có migration ledger/definitions khác source main: cần kế hoạch backup/reconcile được chủ dự án duyệt trước thay đổi deployment.
- Validation `displayName` ở create/join: audit thấy whitespace có thể trả lỗi SQL không đúng envelope và newline có thể được nhận. Cần scope sửa API và migration bổ sung, không sửa migration đã merge trong lượt này.

Hai điểm trên vẫn là follow-up; kết quả Pass cho các bộ kiểm vừa sửa không có nghĩa mọi vấn đề của main đã được khắc phục.
