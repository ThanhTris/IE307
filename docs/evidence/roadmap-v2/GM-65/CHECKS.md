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

## Toast mới và 3 lỗi thông báo (2026-11-26, sau khi Trí duyệt giao diện)

Trí chấm ảnh xem thử và trả lời "duyệt" cho giao diện toast: bố cục hai tầng, nền tô theo tone, Thông tin màu xanh dương, hiện đủ nội dung. Đây là duyệt giao diện trong chat, không phải nghiệm thu GM-65. Vấn đề 1–4 ở trên được xử lý như sau; vấn đề 5, 6 giữ nguyên.

Thay đổi: `Toast.tsx` (bố cục, vị trí `insets.top + 64`, không giới hạn dòng, màu `info`); `StatusNotice` giữ màu xanh lá cho chữ trên trang tone `info`; `FailureNotice` hiện 8 giây; `mapErrorHelper` coi HTTP ≥ 500 (không kèm mã nghiệp vụ) là `NETWORK_ERROR`; màn khách đổi câu 401 khi tạo khách thành "Chưa tạo được phiên khách — Hãy thử lại."

| Kiểm | Kết quả |
| --- | --- |
| typecheck, lint, check:architecture, check:expo (offline) | Đạt |
| Jest đầy đủ `--maxWorkers=2` | 1584 đạt, 0 lỗi, 1 bỏ qua. Chạy mặc định nhiều worker từng có vài ca lỗi không cố định; các bộ lỗi ở lần chạy thứ hai chạy tuần tự đạt 37/37 |

Ảnh: [`avd-20261126/toast-v2/`](avd-20261126/toast-v2/). Ảnh 01–03 là **màn xem thử** Trí đã chấm (file tạm, đã xóa; chữ 200% là nhân cỡ chữ, không phải cỡ chữ hệ thống). Ảnh 04–06 là app thật với code mới.

| Ca trên AVD (app thật) | Kết quả | Ảnh |
| --- | --- | --- |
| Lưu khẩu vị, 503 một lần | App tự gửi lại cùng yêu cầu, lưu thành công, về Phòng chờ, không báo lỗi (trước đây hiện "Chưa lưu được thay đổi") | — |
| Lưu khẩu vị, 503 liên tục | Toast "Chưa rõ kết quả lưu. Hãy thử lại." dưới tiêu đề, Quay lại không bị che, lựa chọn được giữ | 04 |
| Rời phòng, 503 | **Chưa đạt hẳn: thấy toast ở 1/2 lần.** Lần 1: hai ảnh chụp sau khi bấm không có toast. Lần 2: toast "Không kết nối được máy chủ" dưới tiêu đề, ở lại phòng; bản quay bắt đầu trễ (codec phải thử lại) nên chỉ bắt được đoạn cuối. Chưa rõ vì sao lần 1 không thấy (có thể do chuyển lớp toast từ hộp thoại xác nhận về màn chính) | 05 (khung hình từ quay màn hình) |
| Chủ phòng hủy phòng | Toast xanh dương; quay màn hình thấy khoảng 7 s (12,5–19,5 s), gồm khoảng 2 s nền trắng lúc chuyển màn và khoảng 5 s trên Trang chủ. Đồng hồ chạy từ trước khi Trang chủ hiện, giải thích số đo khoảng 3 s với bản cũ | 06 |

Ghi nhận: Trang chủ không có thanh tiêu đề nên toast che một phần câu "Hôm nay cả nhóm ăn gì?" trong lúc hiện. Chưa chạy lại trên app thật với code cuối: câu 401 ở màn khách (chỉ có Jest), 503 khi vào phòng (đã thấy câu "Không kết nối được máy chủ" trên bản chưa chỉnh màu/số dòng), chế độ tối và cỡ chữ hệ thống 200%, toast trong hộp thoại.

## Chưa chạy / chưa xong

- Giai đoạn B, bước 1: kiểm toast khi rời phòng gặp 503 ngay lúc hộp thoại xác nhận đóng (im lặng khi rời phòng lỗi vi phạm AC1).
- Vị trí toast 64dp là cố định: chỉ kiểm ở chữ 100%; tiêu đề ở cỡ chữ lớn có thể vẫn bị che.
- Bản `ToastNotice` dự phòng khi không có provider (chỉ dùng trong test) còn bố cục một hàng cũ.

- **AVD phòng chờ:** lỗi mạng khi bắt đầu, bị loại khỏi phòng: **Not run** trên máy.
- AVD: vòng 1/2, kết quả + quán, Bạn bè/Lịch sử/Hộp thư (cần tài khoản email), gửi email, hàng đợi gửi lại khi mất mạng, TalkBack: **Not run**.
- `supabase/tests/http/GM-65.http`, ADR-030, `scripts/gm65_reports_to_issues.py`, `FIGMA_PARITY.md`: **chưa viết**.
- Comment PR #219 (GM-50) để chính sách khai dữ liệu báo lỗi: **chưa làm**.
- `task_readiness --gate merge`: chưa đạt vì GM-50 chưa Done.

## Quan sát cần xử lý

- Màn Tham gia phòng từng hiện "Liên kết bị chặn" sau khi mở lại app bằng liên kết `exp://` của Expo Go, và không tự kiểm mã khi còn cảnh báo. Không do PR này; xem ở bước "Vào phòng".

---

## Kiểm toàn diện trên AVD, Backend QA & Sửa lỗi Production (2026-11-26)

Môi trường kiểm: nhánh `ui_error_handling_redesign` (dựa trên `4e260952`, đẩy lên `feat/gm-65-error-recovery` / PR #221); QA stack riêng `gm65-prod-avd` (API `54621`, DB `54622`, Mailpit `54624`, đủ 54 migration gồm `0068`, `dish_policy_worker` chạy thật); `scripts/gm65_fault_proxy.mjs` (cổng `54625`); `scripts/gm65_peer.mjs` (peer tạo phòng, mời bạn, bắt đầu, bỏ phiếu); AVD `Medium_Phone_API_37.0` (1080×2400, Expo Go SDK 58).

### 1. Sửa lỗi phát hiện trong kiểm thử & Yêu cầu trực tiếp của chủ dự án

1. **Ghost `<ToastHost />` / `<NotificationHost />` trong Modal đóng (`leave-503` im lặng trước đây):**
   - Sửa chỉ mount host khi modal mở tại `mobile/src/shared/ui/dialogs/SheetDialog.tsx`, `mobile/src/features/rooms/components/RoomQrModal.tsx`, `mobile/src/features/result/components/EmbeddedDishMap.tsx`.
   - Kiểm lại trên AVD thật tại Phòng chờ: **3/3 lần** rời phòng gặp 503 đều tắt dialog và hiện Toast lỗi rõ ràng ([`25_lobby_leave_503_confirmed_3of3.png`](avd-20261126-full/25_lobby_leave_503_confirmed_3of3.png)).
2. **Nới `headerClearance` theo `fontScale` & `ToastNotice` dự phòng 2 tầng:**
   - Sửa `mobile/src/shared/ui/feedback/Toast.tsx` (`64dp` cơ sở, nhân tới `1.85×` khi `fontScale > 1.2`).
3. **Phiên tài khoản email bị thu hồi báo nhầm `"Phiên khách đã hết hạn"`:**
   - Giữ `lastKnownGuest` trong `sessionState.ts`, `roomRepository.ts`, `RoomRepositoryProvider.tsx`, `index.tsx`, `HomeScreen.tsx`, `RequireActiveSession.tsx`. Kiểm AVD xác nhận điều hướng về Trang chủ với đúng nút `"Đăng nhập lại"` ([`10_account_session_revoked_signin.png`](avd-20261126-full/10_account_session_revoked_signin.png)).
4. **Phản hồi `{ broken: true }` ở `previewJoin` & 3 thông báo inline cũ:**
   - Sửa trong `roomRepository.ts`, `ScheduleSheet.tsx`, `DishSetupScreen.tsx`, `VoteScreen.tsx`, `FlashcardRoundView.tsx` ([`18`](avd-20261126-full/18_join_malformed_report_fixed.png), [`21`](avd-20261126-full/21_schedule_past_time_toast.png)).
5. **Chuỗi tiếng Anh thô `"Server unavailable"` lọt ra Toast khi gửi phiếu Vòng 1 & Vòng 2:**
   - Sửa `useRoundOneVoting.ts` (L796, L841) và `useRoundTwoVoting.ts` (L709, L779) dùng `describeError(res.error).message`; cập nhật `votingScreens.test.tsx` (`29/29 passed`). Kiểm AVD xác nhận hiện đúng Toast tiếng Việt + chip `"Báo lỗi"` ở hàng 2 ([`31`](avd-20261126-full/31_vote_r1_submit_503_retry2_toast_chip.png), [`34`](avd-20261126-full/34_final_round_r2_cap_and_submit_503_retry2.png)).
6. **Gọn hóa thẻ lỗi bạn bè trên Trang chủ & gỡ toàn bộ UI/code `"chỉ bản dev"` (theo yêu cầu chủ dự án):**
   - `HomeScreen.tsx`: khi `friends.error`, hiện `<ToastNotice>` nổi phía trên và chỉ giữ duy nhất nút `"Tải lại bạn bè"` trong thẻ `KÈO NHANH VỚI BẠN THÂN` ([`12_home_friends_503.png`](avd-20261126-full/12_home_friends_503.png)).
   - Xóa 4 nút preview `"chỉ bản dev"` trên Trang chủ, `mobile/src/app/dev/*`, `devResultCases.ts` và `richFlashcardDishes` trong `fixtures.ts` ([`11_home_normal.png`](avd-20261126-full/11_home_normal.png)).

### 2. Bằng chứng AVD & Backend đã kiểm thật

- **43 ảnh chụp AVD đã xem trực quan** tại [`avd-20261126-full/`](avd-20261126-full/): `01`–`36`, `38`–`44` (Welcome, Khách 503/401/malformed, Đăng nhập/Đăng ký/Thu hồi phiên, Trang chủ 0px shift `[63,263][1017,495]`, Vào phòng đủ trường hợp, Tạo phòng & Hẹn giờ, Khẩu vị 503 giữ chọn + lưu sạch, Phòng chờ `leave-503` 3/3 + host start 503 + hủy phòng + bị loại + mời bạn 503, Vòng 1 & Vòng 2 cap 2/2 + 503 x2, Kết quả Top 3 + Google Map + callout vị trí bị chặn + lỗi tải kết quả/quán, Bạn bè, Hộp thư, Lịch sử, Sửa hồ sơ lỗi giữ chữ nhập, và Báo lỗi offline).
- **Hàng đợi báo lỗi offline → mở lại app đẩy lên DB QA thật:** Tắt hẳn ứng dụng (`am force-stop host.exp.exponent`), mở lại app ở mạng bình thường để `AppProviders` gọi `flushErrorReports()`; truy vấn bảng `gm65_private.error_reports` xác nhận bản ghi `GCD-A2CA1D54F0 | NETWORK_ERROR | history | load | 0.1.0 | android | AVD_offline_queue_test | f | new` được lưu đầy đủ và chỉ gồm trường allowlist ([`44`](avd-20261126-full/44_report_offline_queued_then_flushed_db.png)).
- **HTTP test thật (`supabase/tests/http/GM-65.http`):** **9/9 PASS** trên QA `127.0.0.1:54621` (khách & user 200, idempotent `clientReportId`, chặn email/JWT/tên sai format/khóa lạ 400, chặn rate-limit cuộc gọi thứ 11 trả 429, và `gm65_admin_list_error_reports` lược bỏ `reporter_id`/`install_id`).
- **CLI tạo Issue (`scripts/gm65_reports_to_issues.py`):** chạy `--help` exit 0 và `--dry-run` trên QA `127.0.0.1:54621` xuất 2 preview `GCD-*` sạch PII.

### 3. Kiểm tra tự động sau cùng (sau lần sửa code & tài liệu cuối)

| Kiểm | Kết quả |
| --- | --- |
| `mobile`: `npm run typecheck`, `npm run lint`, `npm run check:architecture`, `npm run check:expo` | Đạt (`0` lỗi) |
| `mobile`: `npx jest --maxWorkers=2` | **104/105 suite đạt (1 bỏ qua do live env), 1588/1589 test đạt (1 bỏ qua), 0 lỗi** |
| `node --test scripts/gm65_fault_proxy.test.mjs` & `python scripts/gm65_reports_to_issues.py --help` | 3/3 đạt & exit 0 |
| `python scripts/validate_repository.py` & `python scripts/task_readiness.py --check-docs` | Đạt (`exit 0`) |
| `python scripts/task_readiness.py --task GM-65 --gate merge --base-ref origin/main --verify-outputs` | Các đầu ra của GM-65 đã có đủ; vẫn **BLOCKED_ARTIFACTS** tại gate ngoài `GM-50` (chưa merge vào `origin/main`) |

### 4. Chưa chạy / Còn lại (trung thực phạm vi)

- **3 ảnh AVD chưa hoàn tất do sự cố `SystemUI` crash-loop / `NO_INPUT_CHANNEL` trên Android API 37 (đã xóa 3 file ảnh lỗi khỏi thư mục bằng chứng):**
  - `37_result_no_consensus.png`: màn `NO_CONSENSUS` thật từ `gm65_peer.mjs` (mới dừng ở bước tạo phòng).
  - `45_dark_mode_font200_header_clear.png`: Chế độ Tối + `font_scale = 2.0` hệ thống.
  - `46_talkback_labels_verified.png`: lượt kiểm đọc TalkBack trực tiếp trên màn lỗi (đã kiểm `accessibilityRole`/`content-desc` qua Jest và UI XML dump `1.0×`).
- **Cổng phụ thuộc ngoài `GM-50` (PR #219):** cần merge `GM-50` vào `origin/main` và khai báo mục báo lỗi kỹ thuật trong `PRIVACY_POLICY.md` / Data safety trước khi merge GM-65.
- **Chặng USB thiết bị thật:** thực hiện ở GM-33/34 theo `AGENTS.md`.
