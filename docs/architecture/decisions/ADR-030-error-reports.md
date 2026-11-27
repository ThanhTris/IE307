# ADR-030 — Xử lý lỗi 5 tầng, Toast nổi và Báo lỗi quản trị viên

**Trạng thái:** Proposed. Trí review theo GM-65 (issue #220).

## Bối cảnh

Lượt kiểm tra AVD trước GM-65 cho thấy màn khách hiện khung lỗi kỹ thuật ("Phiên cần được xử lý / Xóa phiên cục bộ"), khóa nút tiếp tục, viền đỏ ô nhập dù lỗi do máy chủ trả 503, và nhiều màn tự viết thông báo lỗi riêng không chỉ rõ bước tiếp theo hoặc không có lối báo lỗi cho quản trị viên.

## Quyết định

1. **Bảng mô tả lỗi dùng chung (`mobile/src/shared/errors/describeError.ts`):** Mọi `ErrorCode` được ánh xạ tập trung sang tiêu đề, mô tả tiếng Việt dễ hiểu, đúng một hành động tiếp theo (`retry` / `reload` / `signIn` / `home` / `none`) và cờ `reportable`. Không hiển thị thuật ngữ nội bộ.
2. **Phản hồi 5 tầng và Toast v2 (`docs/design/FEEDBACK_TOAST_NOTIFICATION.md`):**
   - Lỗi nhập liệu tại trường giữ viền đỏ tại chỗ (`FormField`).
   - Lỗi thao tác API/mạng dùng **Toast nổi** (`ToastNotice` / `useToast`), khoảng hở `0px` so với bố cục trang, đặt dưới thanh tiêu đề (`insets.top + TOAST_HEADER_CLEARANCE` với `64dp` cơ sở, tự nới theo `fontScale * textSize` tới `1.85×`).
   - Lỗi đọc toàn màn hình dùng `ErrorRecovery`; rời màn hình do phòng/phiên không còn dùng được giữ lý do trong bộ nhớ qua `leaveAfterFailure` và hiện `FailureNotice` (8 giây, màu xanh dương `info` hoặc đỏ kèm `"Báo lỗi"`).
   - Nút `"Báo lỗi"` trên Toast chỉ mở ở hàng riêng dưới mô tả khi cùng thao tác `reportable` lỗi từ lần 2 trở lên (`shouldOfferHelp`) hoặc gặp `MALFORMED_RESPONSE` / `CONTRACT_MISMATCH`; không đặt biểu tượng báo lỗi trên tiêu đề mọi màn hình (chỉ lối ngữ cảnh và mục `"Trợ giúp & báo lỗi"` trong Cá nhân).
   - Các `Modal` (`SheetDialog`, `RoomQrModal`, `EmbeddedDishMap`) chỉ gắn `ToastHost` / `NotificationHost` khi `visible`/`expanded = true` để modal đóng không chiếm quyền vẽ của màn chính.
3. **Phiếu báo lỗi và danh sách trường cho phép (`mobile/src/shared/errors/errorReport.ts`, `supabase/migrations/0068_gm65_error_reports.sql`):**
   - RPC `public.report_app_error(payload jsonb)` (`security definer`, `search_path = pg_catalog`) mở quyền `execute` cho `anon` và `authenticated` (để khách chưa có phiên hoặc đăng nhập hỏng vẫn gửi được), kiểm tra từng khóa/kiểu/độ dài và từ chối khóa ngoài danh sách 13 khóa cho phép (`clientReportId`, `installId`, `errorCode`, `httpStatus`, `screen`, `action`, `requestId`, `appVersion`, `platform`, `osVersion`, `occurredAt`, `note`, `urgent`).
   - Cấm tuyệt đối ghi nhận/gửi JWT token, email, mật khẩu, OTP, phiếu bầu, mã phòng, tọa độ hay body phản hồi thô (trên cả payload RPC lẫn email `mailto:` dự phòng).
   - Bảo vệ backend: `clientReportId` chống trùng lặp (idempotent trả lại cùng `reportCode` `GCD-...`), bảng `gm65_private.error_reports` bật RLS và thu hồi mọi quyền đọc trực tiếp từ `anon`/`authenticated`, giới hạn tần suất (10 báo lỗi/giờ theo `install_id` hoặc `reporter_id` và 500/giờ toàn hệ thống, khóa giao dịch bằng `pg_advisory_xact_lock`), `reporter_id ON DELETE SET NULL` khi xóa tài khoản (GM-49), và tự dọn bản ghi quá 30 ngày qua `gm65_private.prune()` (kèm lịch `pg_cron` nếu có).
   - Mất mạng hoặc lỗi gửi tạm thời: client xếp hàng đợi tối đa 3 báo lỗi trong `SecureStore` (`gcd.error_reports.queue.v1`) và tự gửi lại (`flushErrorReports`) với cùng `clientReportId`.
4. **Quy trình tạo GitHub Issue (`scripts/gm65_reports_to_issues.py`):**
   - App mobile không bao giờ gọi trực tiếp GitHub API hoặc nhúng token GitHub.
   - Người vận hành đọc danh sách đã ẩn danh (`reporter_id` và `install_id` bị lược bỏ) qua `public.gm65_admin_list_error_reports(only_new)` (chỉ `service_role`) và chạy tay `scripts/gm65_reports_to_issues.py` (mặc định `--dry-run` xem trước, chỉ tạo issue khi truyền `--apply`).

## Hệ quả

- Migration `0068` chỉ bổ sung schema/table/RPC mới (tạm đánh số sau `0067` của GM-54), tương thích ngược hoàn toàn với bản app cũ đang chạy.
- **Điều kiện trước merge (GM-50):** Tài liệu quyền riêng tư (`docs/legal/PRIVACY_POLICY.md`) và khai báo Data safety phải nêu rõ nhóm dữ liệu báo lỗi kỹ thuật trước khi merge PR GM-65.
