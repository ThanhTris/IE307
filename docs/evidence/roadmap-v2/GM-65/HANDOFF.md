# GM-65 — Bàn giao kỹ thuật & Tiến độ hiện tại

- **Task:** [GM-65](../../../../tasks/backlog/GM-65.md) (GitHub issue #220)
- **PR / Nhánh:** [PR #221](https://github.com/ThanhTris/IE307/pull/221) — nhánh `feat/gm-65-error-recovery` (**Draft**, chờ Trí nghiệm thu và chờ `GM-50` merge vào `origin/main`)
- **Chủ sở hữu & Người duyệt:** Trí (`ThanhTris`)

## 1. Quy tắc & Kiến trúc xử lý lỗi đã hoàn chỉnh

1. **Bảng ánh xạ lỗi tập trung (`mobile/src/shared/errors/describeError.ts`):** Toàn bộ `ErrorCode` ánh xạ thống nhất sang tiêu đề, mô tả tiếng Việt, đúng 1 hành động tiếp theo (`retry` / `reload` / `signIn` / `home` / `none`) và cờ `reportable`. Không lộ mã nội bộ hay chuỗi thô như `"Server unavailable"`.
2. **Phân tầng UI 5 lớp & Toast v2 (`docs/design/FEEDBACK_TOAST_NOTIFICATION.md`, `mobile/src/shared/ui/feedback/Toast.tsx`):**
   - Lỗi nhập liệu tại trường giữ viền đỏ dưới ô (`FormField`).
   - Lỗi thao tác API dùng Toast nổi 2 tầng không đẩy bố cục (`0px` shift), tự nới khoảng tránh thanh tiêu đề (`64dp` × tối đa `1.85` theo `fontScale`), chip `"Báo lỗi"` chỉ mở ở hàng 2 khi cùng thao tác lỗi từ lần 2 hoặc gặp `MALFORMED_RESPONSE` / `CONTRACT_MISMATCH`.
   - Lỗi toàn trang dùng `ErrorRecovery`; mất phòng/phiên quay về Trang chủ/Đăng nhập giữ ngữ cảnh trong bộ nhớ (`leaveAfterFailure`, `FailureNotice` 8s).
   - Các `Modal` (`SheetDialog`, `RoomQrModal`, `EmbeddedDishMap`) chỉ mount `<ToastHost />` / `<NotificationHost />` khi đang mở.
3. **Báo lỗi kỹ thuật ẩn danh & Hàng đợi offline (`supabase/migrations/0068_gm65_error_reports.sql`, `errorReport.ts`, `ReportErrorSheet.tsx`):**
   - RPC `public.report_app_error(payload jsonb)` (`security definer`, allowlist 13 khóa, cấm tuyệt đối JWT/email/mật khẩu/OTP/phiếu bầu/mã phòng/tọa độ/body thô, idempotent qua `clientReportId` trả `GCD-...`, rate limit 10/giờ theo `install_id` hoặc `reporter_id` + 500/giờ toàn hệ thống, tự dọn sau 30 ngày).
   - Hàng đợi tối đa 3 báo lỗi trong `SecureStore` (`gcd.error_reports.queue.v1`), tự đẩy lại khi mở app (`AppProviders.tsx` → `flushErrorReports()`).
   - Operator đọc bản ghi đã lọc PII qua `public.gm65_admin_list_error_reports(only_new)` bằng `scripts/gm65_reports_to_issues.py` (`--dry-run` mặc định, `--apply` mới tạo issue GitHub).

## 2. Danh sách thay đổi & Đầu ra đã bàn giao trên nhánh

- **App mobile & Sửa lỗi phát hiện khi test thật:**
  - Sửa Ghost `ToastHost` trong modal đóng (`SheetDialog.tsx`, `RoomQrModal.tsx`, `EmbeddedDishMap.tsx`) → `leave-503` trên AVD đạt **3/3**.
  - Nới `headerClearance` theo `fontScale` & đồng bộ `ToastNotice` fallback (`Toast.tsx`).
  - Sửa mất phiên email bị nhầm sang hết hạn khách (`sessionState.ts`, `roomRepository.ts`, `RoomRepositoryProvider.tsx`, `index.tsx`, `HomeScreen.tsx`, `RequireActiveSession.tsx`).
  - Sửa `previewJoin` khi server trả sai định dạng và bỏ 3 thông báo inline cũ (`roomRepository.ts`, `ScheduleSheet.tsx`, `DishSetupScreen.tsx`, `VoteScreen.tsx`, `FlashcardRoundView.tsx`).
  - Sửa chuỗi tiếng Anh `"Server unavailable"` lọt ra Toast Vòng 1 & Vòng 2 (`useRoundOneVoting.ts`, `useRoundTwoVoting.ts`, `votingScreens.test.tsx`).
  - Sửa theo góp ý trực tiếp của Trí: thẻ `"KÈO NHANH VỚI BẠN THÂN"` trên `HomeScreen.tsx` khi lỗi tải bạn bè chỉ giữ Toast nổi phía trên và duy nhất nút `"Tải lại bạn bè"` trong thẻ; gỡ toàn bộ 4 nút preview `"chỉ bản dev"`, thư mục route `mobile/src/app/dev/*`, `devResultCases.ts` và `richFlashcardDishes` trong `fixtures.ts`.
- **Tài liệu & Công cụ GM-65:**
  - [ADR-030-error-reports.md](../../../architecture/decisions/ADR-030-error-reports.md)
  - [supabase/tests/http/GM-65.http](../../../../supabase/tests/http/GM-65.http) (9/9 ca đạt trên QA thật)
  - [supabase/tests/GM-65_error_reports.test.sql](../../../../supabase/tests/GM-65_error_reports.test.sql) (18/18 ca đạt trên QA thật)
  - [scripts/gm65_reports_to_issues.py](../../../../scripts/gm65_reports_to_issues.py) (đã kiểm `--dry-run` trên QA thật)
  - [scripts/gm65_peer.mjs](../../../../scripts/gm65_peer.mjs) (hỗ trợ test đa người dùng trên QA)
  - [FIGMA_PARITY.md](FIGMA_PARITY.md), [CHECKS.md](CHECKS.md), [avd-20261126-full/](avd-20261126-full/) (43 ảnh AVD đã xem trực quan)

## 3. Việc còn lại để hoàn tất & merge

1. **Cổng phụ thuộc `GM-50` (PR #219):** `GM-50` phải được merge vào `origin/main` và bổ sung thông tin thu thập báo lỗi kỹ thuật vào `PRIVACY_POLICY.md` / Data safetyAnswers (kèm chốt email hỗ trợ) để mở khóa `task_readiness --gate merge`.
2. **Nếu Trí yêu cầu bổ sung 3 ảnh AVD còn thiếu:** chạy lại `37` (`NO_CONSENSUS` thực tế), `45` (Dark Mode + `font_scale = 2.0`), và `46` (lượt đọc TalkBack trực tiếp). (Trong đợt ngày 2026-11-26, 3 ca này dừng lại do `SystemUI` crash-loop / `NO_INPUT_CHANNEL` trên Android API 37 emulator khi đổi `font_scale = 2.0`.)
3. **Migration `0068` & file đụng chung:** số `0068` tạm sau `0067` (GM-54); khi merge cần đối chiếu thứ tự migration hosted với GM-52/GM-54 và thông báo cho Tuấn (GM-53, GM-64), Trang (GM-54), Trung (GM-62) nếu sửa chung `HomeScreen`, `LobbyScreen`, `ProfileScreen`, `AccountFormFrame`.

## 4. Hướng dẫn chạy lại QA & kiểm tra nhanh

1. Khởi tạo QA riêng: `npm run qa:start -- --run-id gm65-qa --api-port 54621 --db-port 54622 --mail-port 54624` rồi `npm run qa:verify -- --run-id gm65-qa`.
2. Chạy SQL & HTTP: chạy `supabase/tests/GM-65_error_reports.test.sql` qua `psql` và gửi các request trong `supabase/tests/http/GM-65.http` vào cổng QA.
3. App AVD: bật `node scripts/gm65_fault_proxy.mjs 54621 54625 .work/gm65/rule.json`, trỏ `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54625`, chạy `adb reverse` cho `8081` & `54625`.
4. Dừng QA khi xong: `npm run qa:stop -- --run-id gm65-qa`.
