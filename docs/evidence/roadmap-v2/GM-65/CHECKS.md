# GM-65 — Kiểm tra (đang làm dở)

Trạng thái ngày 2026-11-26: PR **draft**. Chưa đủ AC, chưa được Trí nghiệm thu, không ghi approval.

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

## Kiểm lại commit `272a76e4` (2026-11-26)

Môi trường: nhánh `claude/gm-65-ui-review` = `272a76e4`; QA riêng `gm65-ui-1126` (cổng 54721, 54 migration gồm `0068`, worker READY); proxy giả lỗi `scripts/gm65_fault_proxy.mjs` (cổng 54730, loopback); người thứ hai `scripts/gm65_peer.mjs`; AVD `emulator-5554` Android 1080×2400, Expo Go, chữ 1.0. Ảnh: [`avd-20261126/`](avd-20261126/). Đo "không đẩy giao diện" bằng `uiautomator`: so tọa độ mọi phần tử có nhãn trước và trong lúc thông báo hiện (cặp nhãn trùng giữa chữ và nút bao ngoài được loại trừ).

### Tự động

| Kiểm | Kết quả |
| --- | --- |
| typecheck, lint, check:architecture, check:expo | Đạt |
| Jest đầy đủ | 1575 đạt, 1 lỗi, 1 bỏ qua (live test cần biến môi trường). Ca lỗi `liveDishResultScreen › renders DECIDED result…` chạy riêng 2 lần đều 28/28: lỗi do chạy chung, không do code |
| `validate_repository.py`, `task_readiness --check-docs` | Đạt |
| `node --test scripts/gm65_fault_proxy.test.mjs` | 3/3 |

### AVD — thông báo nổi, không đẩy giao diện

| Ca | Thông báo người dùng thấy | Không đẩy giao diện | Ảnh |
| --- | --- | --- | --- |
| Khách, 503 lần 1 | Toast đỏ "Không kết nối được máy chủ", nút chính đổi thành "Thử lại", giữ tên | Đạt (form giữ tọa độ) | 01 |
| Khách, 503 lần 2 | Toast cập nhật tại chỗ, thêm chip "Báo lỗi" | Đạt | 02 |
| Khách, mất kết nối | "Không kết nối được máy chủ" + "Báo lỗi" (đếm cộng dồn với 503) | Đạt | 03 |
| Khách, 401 khi tạo phiên | **"Phiên đăng nhập đã hết hạn — Đăng nhập lại"** dù chưa có phiên; nút trở lại "Tiếp tục" | Đạt | 04 |
| Khách, phản hồi sai định dạng | "Máy chủ trả về dữ liệu lỗi" + "Báo lỗi" ngay | Đạt | 05 |
| Khách, 429 | "Bạn thao tác hơi nhanh", không có Báo lỗi | Đạt | 06 |
| Khách, server treo | Sau khoảng 15 s: "Máy chủ phản hồi quá lâu" + Báo lỗi | Đạt | 07 |
| Vào phòng, gõ sai mã | Lỗi dưới ô "Kiểm tra lại mã mời…" (tầng ô nhập); thẻ QR dịch 89 px do dòng lỗi | Chấp nhận (lỗi nhập liệu) | 08 |
| Xác nhận vào phòng, 503 | **"Có lỗi xảy ra"** chung chung; ghi nhận là `UNKNOWN_ERROR` | Đạt | 09 |
| Xác nhận vào phòng, `ROOM_FULL` | "Phòng đã đủ người — Nhờ chủ phòng kiểm tra hoặc vào phòng khác." | Đạt | 10 |
| Lưu khẩu vị, 503 | "Chưa lưu được thay đổi. Lựa chọn vẫn được giữ; hãy thử lại."; lựa chọn giữ nguyên | Đạt | 11, 12 |
| Chủ phòng hủy phòng (AVD là thành viên) | Về Trang chủ, toast xanh "Chủ phòng đã hủy phòng"; tiêu đề Trang chủ giữ `[63,263][1017,495]` | Đạt | 13, 14 |
| Cá nhân → Trợ giúp & Báo lỗi | Tự đính kèm sự cố gần nhất (`UNKNOWN_ERROR`), gửi trong app nhận `GCD-146D39FE57`; DB QA có đúng 1 dòng, chỉ các trường cho phép | — | 15, 16 |
| Chế độ tối + chữ 200% | Toast đọc rõ, không đẩy nội dung | Đạt, nhưng che tiêu đề + "Phòng …" | 17 |

### Vấn đề phát hiện

1. **Toast che tiêu đề và nút Quay lại** ở mọi màn: vùng toast `[45,87]–[1035,411]` đè nút Quay lại `[79,63]–[260,189]` trong 4,5–6 s; chữ 200% thì cao tới khoảng 485 px, che cả dòng đầu nội dung.
2. **Lý do rời phòng chỉ hiện khoảng 3 s** (quay màn hình 4 khung/s: thấy từ 0,25 s đến 3,25 s), code đặt 4,5 s; chưa xác định nguyên nhân. Sau đó Trang chủ không còn dấu vết; ca phòng bị hủy bình thường không được lưu để đính kèm trong Cá nhân.
3. **Copy 401 khi tạo khách sai** (báo cáo §5.1 xác nhận có thật).
4. **503 từ RPC phòng thành `UNKNOWN_ERROR` → "Có lỗi xảy ra"**, trong khi 503 ở màn khách là "Không kết nối được máy chủ". Cùng lỗi, hai câu khác nhau.
5. Mở app với phiên tài khoản cũ không còn trên server thì hiện **"Phiên khách đã hết hạn"** (ảnh 18); cần tái hiện có kiểm soát trước khi kết luận.
6. Đếm lỗi để hiện "Báo lỗi" cộng dồn qua các mã khác nhau (503 rồi mất kết nối thì lần 2 đã có chip). Có thể chấp nhận; ghi để Trí quyết.

## Chưa chạy / chưa xong

- **AVD phòng chờ:** lỗi mạng khi bắt đầu, bị loại khỏi phòng: **Not run** trên máy.
- AVD: vòng 1/2, kết quả + quán, Bạn bè/Lịch sử/Hộp thư (cần tài khoản email), gửi email, hàng đợi gửi lại khi mất mạng, TalkBack: **Not run**.
- `supabase/tests/http/GM-65.http`, ADR-030, `scripts/gm65_reports_to_issues.py`, `FIGMA_PARITY.md`: **chưa viết**.
- Comment PR #219 (GM-50) để chính sách khai dữ liệu báo lỗi: **chưa làm**.
- `task_readiness --gate merge`: chưa đạt vì GM-50 chưa Done.

## Quan sát cần xử lý

- Màn Tham gia phòng từng hiện "Liên kết bị chặn" sau khi mở lại app bằng liên kết `exp://` của Expo Go, và không tự kiểm mã khi còn cảnh báo. Không do PR này; xem ở bước "Vào phòng".
