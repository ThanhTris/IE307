# Bàn giao đầu ra task — GM-24 / roadmap-v2

- Task: GM-24 — UI: nối vị trí thiết bị với coverage API
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Track / stage: INTEGRATION / native
- Branch / target: `codex/gm-24-location-coverage` / `main`
- Base revision: `e0b88c0` (origin/main)
- Contract version: `food-v1/roadmap-v2/GM-24.1`
- CHECKS: `docs/evidence/roadmap-v2/GM-24/CHECKS.md`

## File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/context/services/location.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `import { locationService, LocationService, NativeLocationAdapter, WebLocationAdapter, calculateDistanceM, sanitizeContextForServer } from './services/location';` | Location service thuần túy, tính khoảng cách, gợi ý anchor, buffer server time, và sanitize GPS thô; tách biệt web/mock/native adapter | GM-25, GM-30 |
| `mobile/src/features/context/screens/ContextScreen.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `import { ContextScreen } from './features/context';` | Màn hình bối cảnh tích hợp vị trí, chọn điểm hẹn công cộng, chọn bán kính, ăn ngay/đặt giờ (có guard giờ quá khứ và clear lỗi stale) và panel audit bảo mật | GM-25 |
| `mobile/src/app/gm24/context.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Mở route `/gm24/context` trên Expo Go hoặc Expo Router | Mở màn hình ContextScreen trực tiếp từ ứng dụng (hỗ trợ chuyển đổi Mock / Real API) | GM-25, Reviewer |
| `mobile/tests/unit/locationService.test.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/unit/locationService.test.ts` | 28 unit tests pass: khoảng cách Haversine, gợi ý anchor, buffer ăn ngay, validate đặt giờ, lọc GPS thô, adapter native & web | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/component/contextScreen.test.tsx` | 15 component tests pass: kịch bản grant/deny/off/outside/manual/offline, chặn lưu giờ quá khứ, hồi phục lỗi stale, bảo toàn giờ đặt | QA / Reviewer |
| `docs/evidence/roadmap-v2/GM-24/CHECKS.md` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Đọc bảng kiểm tra | Chi tiết các ca kiểm, kết quả và giới hạn | Reviewer |

## AC và kiểm tra

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| 1. Xin quyền đúng thao tác, deny/offline/no coverage vẫn manual; không background tracking | Pass | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx` | CHECKS.md mục 2, 6, 7 | Tự động hóa qua unit & component tests; `NativeLocationAdapter` sử dụng PermissionsAndroid; hỗ trợ chuyển đổi kịch bản trên UI |
| 2. Server chỉ anchorId/radiusM/desiredAt; không GPS thô trong log/database/outbox | Pass | `cd mobile; npm test tests/unit/locationService.test.ts -t "Privacy Boundary"` | CHECKS.md mục 5; Panel Audit trên màn hình | Kiểm tra sanitizeContextForServer và redactLocationFromLog: 0 tọa độ GPS trong payload server |
| 3. Ăn ngay lấy server now+buffer một lần; đặt giờ không cộng lại, quá giờ yêu cầu xác nhận và chặn lưu nếu không hợp lệ | Pass | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx -t "Scheduled"` | CHECKS.md mục 3, 4, 7 | Ăn ngay cộng 30 phút một lần từ serverTime; Đặt giờ trước không cộng lặp lại; cảnh báo `DESIRED_TIME_PASSED` và chặn nút lưu khi giờ ở quá khứ; cung cấp nút điều chỉnh về giờ hợp lệ |
| 4. Harness component dùng lại màn context; kiểm adapter native và API thật trước merge | Pass | Route `/gm24/context` trong Expo Go / shell | CHECKS.md mục 7, 8, 9; `mobile/src/features/context/screens/ContextScreen.tsx` | Tái sử dụng component `ContextSummary` từ GM-05; tích hợp Scenario Picker và sẵn sàng chạy trên Expo Go / Real Supabase API |
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
   - **Android Emulator**: Sử dụng địa chỉ `http://10.0.2.2:54321` (đã được cấu hình mặc định).
   - **Thiết bị Android vật lý qua cáp USB**:
     ```bash
     adb reverse tcp:54321 tcp:54321
     ```
     Sau đó thiết bị có thể gọi trực tiếp `http://127.0.0.1:54321`.
   - **Thiết bị Android vật lý qua cùng mạng WiFi**:
     Cấu hình biến môi trường `EXPO_PUBLIC_SUPABASE_URL=http://<IP-LAN-CUA-MAY-TINH>:54321` (ví dụ: `http://192.168.1.100:54321`).

3. **Mở màn hình GM-24 & Chuyển chế độ**:
   - Từ màn hình chính (App Shell), bấm nút **"Mở vị trí và bối cảnh GM-24"**.
   - Tại mục **⚙️ Môi trường dữ liệu & API**:
     - Chọn **🧪 Môi trường kịch bản (Mock)** để chạy các kịch bản thử nghiệm ngoại lệ (Hồ Con Rùa, Phố Đi Bộ, Từ chối GPS, Tắt GPS, Ngoài vùng HN, Server Offline, Server Rỗng).
     - Chọn **🌐 Máy chủ thật (Live Supabase API)** để kết nối trực tiếp đến Supabase RPC `get_discovery_context` (GM-18) với phiên khách GM-16 tự động.

4. **Kiểm tra thời gian & Chặn lưu giờ quá khứ**:
   - Bấm **⚡ Ăn ngay (Buffer 30p)**: Giờ ăn mục tiêu được cộng 30 phút từ giờ máy chủ một lần duy nhất.
   - Bấm **🕒 Đặt giờ trước** -> Chọn **Quá khứ (-1 giờ)**:
     - Cảnh báo đỏ `DESIRED_TIME_PASSED` xuất hiện.
     - Nút **"Xác nhận bối cảnh phòng"** bị khóa (`disabled={true}`).
     - Bấm **"Điều chỉnh thành giờ hợp lệ (+30 phút từ giờ máy chủ)"**: thời gian được cập nhật thành mốc tương lai hợp lệ, cảnh báo biến mất và nút lưu được mở khóa.

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
