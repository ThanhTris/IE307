# GM-65 — Bàn giao: đang ở bước nào

Task [GM-65](../../../../tasks/backlog/GM-65.md) (issue #220). Nhánh `feat/gm-65-error-recovery`.

## Quyết định của Trí (2026-11-25)

- Bỏ khung lỗi trên trang. Lỗi API hiện toast đỏ.
- Báo lỗi **không** xuất hiện ở mọi màn: gặp sự cố thì app đưa người dùng về đúng chỗ theo logic từng màn, lối "Báo lỗi" chỉ ở chỗ đó, kèm mã lỗi. Giữ thêm một mục "Báo lỗi" trong Cá nhân. Không có biểu tượng trên tiêu đề.
- Khách không có chuông thông báo (giữ luật GM-35).
- Báo lỗi mặc định gửi lên server; cần gấp thì gửi email.

## Quy tắc điều hướng (`mobile/src/shared/errors/failure.ts`)

| Nhóm mã | Đích |
| --- | --- |
| Mạng, hết giờ chờ, phản hồi lỗi, lỗi lạ | Ở lại, Thử lại, được báo lỗi |
| `RATE_LIMITED`, lỗi nhập liệu | Ở lại, không báo lỗi |
| `VERSION_CONFLICT`, `CONTEXT_CHANGED`, `INVALID_ROOM_STATE` | Ở lại, tải lại |
| Trong phòng/kết quả: `ROOM_NOT_FOUND`, `ROOM_TERMINAL`, `ROOM_EXPIRED`, `NOT_MEMBER`, `CONTRACT_MISMATCH` | Trang chủ, kèm lý do |
| `AUTH_REQUIRED` | Khách → Trang chủ; tài khoản → Đăng nhập |

Chuyển trang dùng `leaveAfterFailure` (lý do giữ trong bộ nhớ, không qua URL); màn đích hiện `FailureNotice`.

## Tiến độ

| Bước | Trạng thái |
| --- | --- |
| Nền: bảng mô tả lỗi, gửi báo lỗi + hàng đợi, màn Báo lỗi, migration `0068`, test SQL | Xong phần code và test |
| Màn khách (vào bằng khách) | Xong, đã xem AVD |
| Gỡ biểu tượng báo lỗi trên tiêu đề, giữ mục trong Cá nhân | Xong |
| **1. Phòng chờ** | **Code + test xong. Đang dở: tái hiện trên AVD (hủy phòng, lỗi mạng) và chờ Trí xác nhận** |
| 2. Thiết lập & khẩu vị | Chưa làm |
| 3. Vòng 1 / Vòng 2 (thêm Back Android; vòng 2 không quay về vòng 1) | Chưa làm |
| 4. Kết quả + quán gần đây | Chưa làm |
| 5. Vào phòng | Chưa làm |
| 6. Mất phiên chung (`RequireActiveSession` thêm "Đăng nhập lại") | Chưa làm; `FailureNotice` đã đặt ở màn đăng nhập |
| 7. Bạn bè / Lịch sử / Hộp thư | Chưa làm |
| 8. Tài khoản | Chưa làm |
| Hồ sơ: ADR-030, `GM-65.http`, script tạo GitHub Issue, FIGMA_PARITY, comment PR #219 | Chưa làm |

## Toast (Trí duyệt giao diện 2026-11-26)

Quy cách ở [FEEDBACK_TOAST_NOTIFICATION](../../../design/FEEDBACK_TOAST_NOTIFICATION.md), kết quả kiểm ở [CHECKS](CHECKS.md). Màn khác có thanh tiêu đề cao hơn 64dp cần kiểm lại vị trí. HTTP ≥ 500 giờ là `NETWORK_ERROR`, nên các luồng "chưa rõ kết quả" gửi lại cùng `requestId` (lưu khẩu vị tự phục hồi sau một lần 503).

## Chạy lại

1. QA: `npm run qa:start -- --run-id <id> --api-port 54591 --db-port 54592 --mail-port 54594` rồi `npm run qa:verify -- --run-id <id>`.
2. SQL: chạy `supabase/tests/GM-65_error_reports.test.sql` bằng `psql` trong container DB của lượt QA (mọi thay đổi được rollback).
3. App: `mobile/` trỏ `EXPO_PUBLIC_SUPABASE_URL` vào QA (hoặc proxy giả lỗi), `adb reverse`, `npx expo start --go --localhost`.

## Lưu ý khi phối hợp

- Số migration `0068` là tạm (`0067` dành cho GM-54), đổi theo thứ tự merge. Hosted cần áp khi merge (GM-52).
- PR chạm `GuestEntryScreen`, `LobbyScreen`, `useLobby`, `HomeScreen`, `ProfileScreen`, `AccountFormFrame`: báo Tuấn (GM-53, GM-64), Trang (GM-54), Trung (GM-62) để tránh xung đột.
- Email hỗ trợ lấy từ PR #219, chờ Trí xác nhận trước khi phát hành.
