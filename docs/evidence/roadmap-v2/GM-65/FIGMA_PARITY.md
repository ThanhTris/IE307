# GM-65 — Đối chiếu thiết kế & Quy chuẩn phản hồi (FIGMA_PARITY)

- **Ngày kiểm tra:** 2026-11-26
- **Nhánh / cơ sở:** `feat/gm-65-error-recovery` (từ `4e260952` + các bản sửa và kiểm thử bổ sung)
- **Tài liệu quy chuẩn:** [FEEDBACK_TOAST_NOTIFICATION](../../../design/FEEDBACK_TOAST_NOTIFICATION.md), [GM-65](../../../../tasks/backlog/GM-65.md)

## Phạm vi đối chiếu

Thay vì mở lại file Figma cho từng màn cũ, GM-65 đối chiếu trực tiếp trên **Android Emulator thật (`Medium_Phone_API_37.0`, 1080×2400, Expo Go SDK 58)** nối với **QA backend thật (`gm65-prod-avd`)** và proxy giả lỗi có kiểm soát (`scripts/gm65_fault_proxy.mjs`), theo quy chuẩn Toast v2 đã được Trí duyệt giao diện ngày 2026-11-26.

## Kết quả kiểm trực quan trên AVD ([`avd-20261126-full/`](avd-20261126-full/)) — 43 ảnh

| Nhóm kiểm | Quy chuẩn áp dụng | Kết quả thực tế trên AVD | Ảnh đại diện |
| --- | --- | --- | --- |
| **Toast nổi 2 tầng (Tone + Action)** | Nền tô nhạt theo tone (`error` `#DC2626`, `success` `#16A34A`, `warning` `#D97706`, `info` `#2563EB`); hàng 1 icon + tiêu đề + nút `×`, hàng 2 mô tả không cắt chữ + chip `"Báo lỗi"` khi lỗi từ lần 2 hoặc `MALFORMED_RESPONSE`. | **Đạt.** Hiển thị đúng trên Khách, Vào phòng, Khẩu vị, Phòng chờ, Vòng 1, Vòng 2, Kết quả, Bạn bè, Hộp thư, Lịch sử, Sửa hồ sơ. Đã sửa lỗi `"Server unavailable"` lọt ra Vòng 1/2 (`31`, `34`) và lỗi `ToastHost` ẩn trong modal đóng ở ca rời phòng 503 (`25` đạt `3/3`). | [`04`](avd-20261126-full/04_guest_503_retry2_report.png), [`25`](avd-20261126-full/25_lobby_leave_503_confirmed_3of3.png), [`31`](avd-20261126-full/31_vote_r1_submit_503_retry2_toast_chip.png), [`34`](avd-20261126-full/34_final_round_r2_cap_and_submit_503_retry2.png) |
| **Không đẩy bố cục (0 px layout shift)** | Toast nổi ở tầng overlay, không đẩy phần tử bên dưới khi hiện. | **Đạt.** Đo `uiautomator`: tiêu đề Trang chủ giữ nguyên `[63,263][1017,495]` trước và khi Toast xanh dương (`FailureNotice`) xuất hiện (`13`, `27`). | [`13`](avd-20261126-full/13_home_exit_failure_toast_0px.png), [`27`](avd-20261126-full/27_lobby_host_cancel_home_blue_toast.png) |
| **Khoảng cách thanh tiêu đề (`headerClearance`)** | `insets.top + 64dp`, tự nới theo `fontScale * textSize` tới `1.85×` khi `fontScale > 1.2` (`Toast.tsx`). | **Đạt ở cỡ chữ 1.0×** trên các màn có `AppHeader` (Khách/Đăng nhập, Vào phòng, Tạo phòng, Khẩu vị, Phòng chờ, Vòng 1/2, Kết quả, Bạn bè, Lịch sử, Hộp thư, Sửa hồ sơ). Ở Trang chủ không có thanh tiêu đề nên Toast nổi phủ nhẹ lên dòng `"Hôm nay cả nhóm ăn gì?"` trong thời gian hiển thị. | [`18`](avd-20261126-full/18_join_malformed_report_fixed.png), [`19`](avd-20261126-full/19_join_confirm_503_network.png), [`28`](avd-20261126-full/28_lobby_host_kick_home_toast.png) |
| **Phân tách 5 tầng lỗi & gọn hóa Trang chủ** | Lỗi nhập liệu giữ inline ở `FormField`; lỗi thao tác API dùng Toast nổi; lỗi toàn trang dùng `ErrorRecovery`; mất phòng/phiên về đích giữ `FailureNotice`. | **Đạt.** Thẻ `"KÈO NHANH VỚI BẠN THÂN"` trên Trang chủ khi lỗi `list_friends` 503 đã bỏ hoàn toàn icon cảnh báo và chữ lỗi lặp lại, chỉ giữ Toast đỏ ở trên và duy nhất nút `"Tải lại bạn bè"` trong thẻ (`12`). Toàn bộ 4 link `"chỉ bản dev"` và route `/dev/*` đã gỡ khỏi UI (`11`). | [`11`](avd-20261126-full/11_home_normal.png), [`12`](avd-20261126-full/12_home_friends_503.png), [`36`](avd-20261126-full/36_result_load_503_retry2_help.png) |
| **Luồng Báo lỗi & Trợ giúp (`ReportErrorSheet`)** | Không gắn nút báo lỗi cố định trên tiêu đề mọi màn; mở qua chip `"Báo lỗi"` ngữ cảnh hoặc mục `"Trợ giúp & Báo lỗi"` trong Cá nhân; khi mất mạng giữ hàng đợi tối đa 3 phiếu trong `SecureStore` và tự gửi khi mở lại app. | **Đạt.** Đã kiểm trên AVD và truy vấn DB QA thật (`GCD-A2CA1D54F0` tự đẩy thành công sau cold relaunch, chỉ lưu các khóa allowlist). | [`44`](avd-20261126-full/44_report_offline_queued_then_flushed_db.png) |

## Mục chưa hoàn tất kiểm lại trực quan trên AVD (Ghi nhận trung thực)

- **Chế độ Tối + cỡ chữ hệ thống 200% (`45`):** Mã nguồn (`Toast.tsx` nới `headerClearance` tới `1.85×`) đã qua Jest, nhưng lượt chụp AVD ở `font_scale = 2.0` gặp lỗi `SystemUI` crash-loop / `NO_INPUT_CHANNEL` trên Android API 37 khiến `screencap` xuất khung đen -> ảnh lỗi đã xóa, **chưa nghiệm thu ảnh thật ở 200% + Dark Mode**.
- **Đọc nhãn TalkBack trực tiếp (`46`):** Đã xác nhận `accessibilityRole` / `content-desc` qua Jest và UI XML dump ở `1.0×`, **chưa quay/chụp lượt bật TalkBack thật** trên màn lỗi do sự cố emulator nêu trên.
- **Màn Không chốt được (`NO_CONSENSUS`) thật trên AVD (`37`):** Lượt dựng phòng `X5ZXV2` để kiểm `NO_CONSENSUS` đã dừng giữa chừng; màn kết quả winner/Top 3/Google Map/callout vị trí (`35`, `36`, `38`, `39`) đã kiểm trực quan.
- **Thiết bị Android thật qua USB:** Chưa chạy (theo lộ trình Chặng 3B GM-33/34 ở `AGENTS.md`).
