# GM-65 — Kiểm tra (đang làm dở)

Trạng thái ngày 2026-11-25: PR **draft**. Chưa đủ AC, chưa được Trí nghiệm thu, không ghi approval.

## Đã chạy

| Kiểm | Kết quả | Môi trường |
| --- | --- | --- |
| Jest `tests/component` và `tests/unit` | 1555/1556. Ca đỏ `liveDishResultScreen` (polls `NOT_READY`) chạy riêng đạt 28/28; PR không sửa màn đó | Windows |
| TypeScript, ESLint (`src`, `tests`), kiểm kiến trúc | Đạt | Windows |
| SQL `supabase/tests/GM-65_error_reports.test.sql` | 18/18 | QA GM-03 `gm65-*`, 53 migration, `qa:verify` PASS |
| AVD: khách gặp 503 | Toast, giữ tên, nút Thử lại tạo được khách khi hết lỗi | Android API 37, Expo Go 58, proxy giả lỗi loopback |
| AVD: gửi báo lỗi trong app | Hai bản ghi trong DB QA (`GCD-B9D1F541CB`, `GCD-A7343D5495`), ẩn danh, chỉ các trường cho phép | như trên |
| AVD: màn Báo lỗi (có lỗi và mở chung có câu hỏi thường gặp), mục Báo lỗi trong Cá nhân, Trang chủ không còn nút | Đã xem | như trên |
| AVD: phòng chờ không còn biểu tượng báo lỗi | Đã xem (AVD là thành viên, người thứ hai qua REST làm chủ phòng) | như trên |

## Chưa chạy / chưa xong

- **AVD phòng chờ (bước 1):** chủ phòng hủy phòng → AVD về Trang chủ kèm thông báo; lỗi mạng khi bắt đầu; phòng không còn. Chỉ có test Jest (`lobbyFailureExit.test.tsx`), **Not run** trên máy.
- AVD: gửi email, hàng đợi gửi lại khi mất mạng (chỉ có test), dark mode, chữ 200%, TalkBack.
- `supabase/tests/http/GM-65.http`, ADR-030, `scripts/gm65_reports_to_issues.py`, `FIGMA_PARITY.md`: **chưa viết**.
- Comment PR #219 (GM-50) để chính sách khai dữ liệu báo lỗi: **chưa làm**.
- `task_readiness --gate merge`: chưa đạt vì GM-50 chưa Done.

## Quan sát cần xử lý

- Màn Tham gia phòng từng hiện "Liên kết bị chặn" sau khi mở lại app bằng liên kết `exp://` của Expo Go, và không tự kiểm mã khi còn cảnh báo. Không do PR này; xem ở bước "Vào phòng".
