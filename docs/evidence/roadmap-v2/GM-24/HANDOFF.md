# Bàn giao đầu ra task — GM-24 / roadmap-v2

## Revision sau merge main — 2026-10-16

- PR branch: `codex/gm-24-location-coverage`; merge commit `ad78d98` nhận `origin/main` tại `daa9174`.
- GM-10 được giữ nguyên ở `ContextScreen`; phần nhập bối cảnh dùng chung nằm ở `mobile/src/features/context/components/ContextDraftFields.tsx`. Harness GM-24 dùng `Gm24ContextScreen` tại `/gm24/context`, chỉ discovery → preview → xác nhận bản nháp, không tạo room hoặc ghi room context.
- Live API dùng `createAuthenticatedApiClient`/GM-16 với restore session và explicit guest action. Không gọi `create_guest_session` legacy và không tự tạo guest khi mount.
- Discovery/selection được xóa ngay khi đổi môi trường, đổi session hoặc request lỗi; response của generation cũ bị bỏ. 401/empty/malformed/timeout khóa preview/save và không dùng anchor mock cũ.
- `expo-location ~57.0.21` đã được thêm theo lockfile; app config cho phép foreground fine/coarse location. Cần native rebuild để kiểm manifest/quyền thật.
- Automated verification: mobile Jest 21 suites/612 tests, GM-24 component 17 tests, Python 550 tests (6 skipped), Expo checks và Android JS bundle đều Pass. Thiết bị Android/Expo Go và backend deployed vẫn `Not run`.

- Task: GM-24 — UI: nối vị trí thiết bị với coverage API
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Track / stage: INTEGRATION / native
- Branch / target: `codex/gm-24-location-coverage` / `main`
- Base revision: `daa9174` (origin/main at merge)
- Contract version: `food-v1/roadmap-v2/GM-24.1`
- CHECKS: `docs/evidence/roadmap-v2/GM-24/CHECKS.md`

## File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/context/services/location.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `import { locationService, LocationService, NativeLocationAdapter, WebLocationAdapter, calculateDistanceM, sanitizeContextForServer } from './services/location';` | Location service thuần túy, tính khoảng cách, gợi ý anchor, buffer server time, và sanitize GPS thô; tách biệt web/mock/native adapter | GM-25, GM-30 |
| `mobile/src/features/context/screens/Gm24ContextScreen.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Mở route `/gm24/context` hoặc import trực tiếp | Harness bối cảnh GM-24, dùng form chung GM-10, discovery → preview → xác nhận bản nháp, auth/session và panel audit bảo mật | GM-25 |
| `mobile/src/features/context/components/ContextDraftFields.tsx` | GM-24/GM-10 | `food-v1/roadmap-v2/GM-24.1` | Import nội bộ từ hai controller context | Form bán kính, ngày/giờ, Eat Now +15 phút, scheduled, budget, avoidRecent, buổi và hình thức; không sở hữu room/API write | GM-25 |
| `mobile/src/app/gm24/context.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Mở route `/gm24/context` trên Expo Go hoặc Expo Router | Mở màn hình ContextScreen trực tiếp từ ứng dụng (hỗ trợ chuyển đổi Mock / Real API) | GM-25, Reviewer |
| `mobile/tests/unit/locationService.test.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/unit/locationService.test.ts` | 28 unit tests pass: khoảng cách Haversine, gợi ý anchor, buffer ăn ngay, validate đặt giờ, lọc GPS thô, adapter native & web | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/component/contextScreen.test.tsx` | 17 component tests pass: kịch bản grant/deny/off/outside/manual/offline, preview/receipt, chặn giờ quá khứ và hết hạn sau khi mở form, hồi phục lỗi stale, bảo toàn giờ đặt | QA / Reviewer |
| `docs/evidence/roadmap-v2/GM-24/CHECKS.md` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Đọc bảng kiểm tra | Chi tiết các ca kiểm, kết quả và giới hạn | Reviewer |

## AC và kiểm tra

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| 1. Xin quyền đúng thao tác, deny/offline/no coverage vẫn manual; không background tracking | Pass | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx` | CHECKS.md mục 2, 6, 7 | Tự động hóa qua unit & component tests; `NativeLocationAdapter` sử dụng PermissionsAndroid; hỗ trợ chuyển đổi kịch bản trên UI |
| 2. Server chỉ anchorId/radiusM/desiredAt; không GPS thô trong log/database/outbox | Pass | `cd mobile; npm test tests/unit/locationService.test.ts -t "Privacy Boundary"` | CHECKS.md mục 5; Panel Audit trên màn hình | Kiểm tra sanitizeContextForServer và redactLocationFromLog: 0 tọa độ GPS trong payload server |
| 3. Ăn ngay lấy server now+buffer một lần; đặt giờ không cộng lại, quá giờ yêu cầu xác nhận và chặn lưu nếu không hợp lệ | Pass | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx -t "Scheduled"` | CHECKS.md mục 3, 4, 7 | Ăn ngay cộng 15 phút một lần từ serverTime; Đặt giờ trước không cộng lặp lại; cảnh báo `DESIRED_TIME_PASSED` và chặn nút lưu khi giờ ở quá khứ; cung cấp nút điều chỉnh về giờ hợp lệ |
| 4. Harness component dùng lại màn context; kiểm adapter native và API thật trước merge | Pass (automated) | Route `/gm24/context` và focused component tests; Expo Go/native/backend vẫn Not run | CHECKS.md mục 7, 8, 9; `mobile/src/features/context/screens/Gm24ContextScreen.tsx` và `ContextDraftFields.tsx` | Tái sử dụng component nền từ GM-05; Scenario Picker và Live adapter đã nối, nghiệm thu thiết bị/backend còn chờ chạy thật |
| 5. Đầu vào/đầu ra và cách kiểm được ghi trong HANDOFF.md; reviewer đối chiếu revision thật | Pass | Tài liệu này (`HANDOFF.md`) | `docs/evidence/roadmap-v2/GM-24/HANDOFF.md` | Đầy đủ bảng artifact, hướng dẫn khởi chạy, giới hạn |
| 6. Đạt kiểm Android–API đúng scope trong ma trận mobile; evidence thiết bị/transport/native thật | Not run | Cần chạy trên thiết bị Android vật lý với Expo Go và backend thật | CHECKS.md mục 14 | Sẵn sàng chạy trên máy Android thật với ApiClientImpl; đánh dấu Not run chờ kiểm tra thực tế phần cứng |

## Hướng dẫn chạy và cấu hình kết nối Android thật

1. **Khởi chạy ứng dụng**:
   ```bash
   cd mobile
   npm run start:go
   ```
   Mở Expo Go trên điện thoại Android hoặc quét mã QR từ Metro Bundler.

2. **Cấu hình kết nối API máy chủ thật (không chứa secret)**:
   - **Backend HTTPS**: đặt `EXPO_PUBLIC_SUPABASE_URL=https://<endpoint-supabase-truy-cap-duoc>`; đây là cách dùng cho thiết bị thật và backend test. URL phải là origin-only, không nhúng credential.
   - **Thiết bị Android qua cáp USB (development loopback)**:
     ```bash
     adb reverse tcp:54321 tcp:54321
     EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
     ```
     Chỉ loopback HTTP được transport GM-16 chấp nhận. Dọn mapping sau khi kiểm: `adb reverse --remove tcp:54321`.
   - Không dùng `http://10.0.2.2`, IP LAN HTTP hoặc địa chỉ emulator trong cấu hình Live; transport từ chối trước khi gửi request. Expo tunnel chỉ đưa Metro tới máy, không tự tạo đường tới backend.

3. **Mở màn hình GM-24 & Chuyển chế độ**:
   - Từ màn hình chính (App Shell), bấm nút **"Mở vị trí và bối cảnh GM-24"**.
   - Tại mục **⚙️ Môi trường dữ liệu & API**:
     - Chọn **🧪 Môi trường kịch bản (Mock)** để chạy các kịch bản thử nghiệm ngoại lệ (Hồ Con Rùa, Phố Đi Bộ, Từ chối GPS, Tắt GPS, Ngoài vùng HN, Server Offline, Server Rỗng).
     - Chọn **🌐 Máy chủ thật (Live Supabase API)** để khôi phục session GM-16. Nếu cấu hình thiếu/sai, màn hình báo lỗi cấu hình và không gửi request. Nếu chưa có session, bấm **Tạo phiên khách GM-16**; không có guest session tự động khi mount.

4. **Kiểm tra thời gian & Chặn lưu giờ quá khứ**:
   - Bấm **⚡ Ăn ngay (Buffer 15p)**: Giờ ăn mục tiêu được cộng 15 phút từ giờ máy chủ tại thao tác đó một lần duy nhất. Khi preview hoặc xác nhận, client tính lại giờ máy chủ; nếu đã hết hạn thì xóa preview/receipt và bắt chọn giờ mới.
   - Bấm **🕒 Đặt giờ trước** -> Chọn **Quá khứ (-1 giờ)**:
     - Cảnh báo đỏ `DESIRED_TIME_PASSED` xuất hiện.
     - Nút **"Xác nhận bối cảnh phòng"** bị khóa (`disabled={true}`).
     - Bấm **"Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)"**: thời gian được cập nhật thành mốc tương lai hợp lệ, cảnh báo biến mất và nút lưu được mở khóa.
   - Bấm **"Xem món mẫu theo bối cảnh"**, kiểm danh sách preview hiện hành, sau đó bật **"Tôi xác nhận điểm công cộng, buổi và giờ ăn"**. Receipt hiển thị **"Bản nháp đã xác nhận, chưa lưu vào phòng"**; harness không gọi create/join/update-room.

5. **Kiểm tra hồi phục lỗi mạng (Stale error recovery)**:
   - Chọn kịch bản **Server Offline** -> Thông báo `Lỗi tải dữ liệu khu vực` xuất hiện.
   - Chuyển sang **Thủ công** hoặc **Hồ Con Rùa** -> Lỗi cũ được xóa hoàn toàn (`serverError = null`) và danh sách điểm hẹn hiển thị chính xác.

6. **Kiểm tra quyền riêng tư (Privacy Audit Panel)**:
   - Cuộn xuống dưới cùng để xem bảng **BẢO MẬT & QUYỀN RIÊNG TƯ**.
   - Xác nhận GPS thô chỉ lưu cục bộ, payload server chỉ chứa `anchorId`, `radiusM`, `desiredAt`, `mealSlot`, `serviceMode`.

## Checklist người nhận (GM-25 / GM-30)

- [ ] Import `locationService` hoặc `ContextScreen` từ `src/features/context`.
- [ ] Khi tạo phòng trong GM-25, gọi `sanitizeContextForServer(context)` để tạo payload gửi lên `apiClient.createRoom(...)`.
- [ ] Không tự thêm các trường `lat`/`lng` vào `RoomContext`.
- [ ] Tái sử dụng `ContextScreen` làm màn hình chọn địa điểm trong luồng tạo phòng của host.
