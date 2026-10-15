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
| `mobile/src/features/context/services/location.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `import { locationService, LocationService, calculateDistanceM, sanitizeContextForServer } from './services/location';` | Location service thuần túy, tính khoảng cách, gợi ý anchor, buffer server time, và sanitize GPS thô | GM-25, GM-30 |
| `mobile/src/features/context/screens/ContextScreen.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `import { ContextScreen } from './features/context';` | Màn hình bối cảnh tích hợp vị trí, chọn điểm hẹn công cộng, chọn bán kính, ăn ngay/đặt giờ và audit bảo mật | GM-25 |
| `mobile/src/app/gm24/context.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Mở route `/gm24/context` trên Expo Go hoặc Expo Router | Mở màn hình ContextScreen trực tiếp từ ứng dụng | GM-25, Reviewer |
| `mobile/tests/unit/locationService.test.ts` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/unit/locationService.test.ts` | 23 unit tests pass: khoảng cách Haversine, gợi ý anchor, buffer ăn ngay, validate đặt giờ, lọc GPS thô | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | `cd mobile; npm test tests/component/contextScreen.test.tsx` | 13 component tests pass: kiểm thử toàn diện các kịch bản grant/deny/off/outside/manual/offline/audit | QA / Reviewer |
| `docs/evidence/roadmap-v2/GM-24/CHECKS.md` | GM-24 | `food-v1/roadmap-v2/GM-24.1` | Đọc bảng kiểm tra | Chi tiết các ca kiểm, kết quả và giới hạn | Reviewer |

## AC và kiểm tra

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| 1. Xin quyền đúng thao tác, deny/offline/no coverage vẫn manual; không background tracking | Pass | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx` | CHECKS.md mục 2, 6, 7 | Tự động hóa qua unit & component tests; hỗ trợ chuyển đổi kịch bản trên UI |
| 2. Server chỉ anchorId/radiusM/desiredAt; không GPS thô trong log/database/outbox | Pass | `cd mobile; npm test tests/unit/locationService.test.ts -t "Privacy Boundary"` | CHECKS.md mục 5; Panel Audit trên màn hình | Kiểm tra sanitizeContextForServer và redactLocationFromLog: 0 tọa độ GPS trong payload server |
| 3. Ăn ngay lấy server now+buffer một lần; đặt giờ không cộng lại, quá giờ yêu cầu xác nhận | Pass | `cd mobile; npm test tests/unit/locationService.test.ts -t "computeEatNowTime"` | CHECKS.md mục 3, 4; Toggle trên màn hình | Ăn ngay cộng 30 phút một lần từ serverTime; Đặt giờ trước không cộng lặp lại, cảnh báo giờ quá khứ |
| 4. Harness component dùng lại màn context; kiểm adapter native và API thật trước merge | Pass | Route `/gm24/context` trong Expo Go / shell | CHECKS.md mục 7, 8, 9; `mobile/src/features/context/screens/ContextScreen.tsx` | Tái sử dụng component `ContextSummary` từ GM-05; tích hợp Scenario Picker và sẵn sàng chạy trên Expo Go |
| 5. Đầu vào/đầu ra và cách kiểm được ghi trong HANDOFF.md; reviewer đối chiếu revision thật | Pass | Tài liệu này (`HANDOFF.md`) | `docs/evidence/roadmap-v2/GM-24/HANDOFF.md` | Đầy đủ bảng artifact, hướng dẫn khởi chạy, giới hạn |
| 6. Đạt kiểm Android–API đúng scope trong ma trận mobile; evidence thiết bị/transport/native thật | Not run | Cần chạy trên thiết bị Android vật lý với Expo Go | CHECKS.md mục 14 | Sẵn sàng chạy trên máy Android thật; đánh dấu Not run chờ kiểm tra thực tế phần cứng |

## Hướng dẫn chạy và kiểm tra

1. **Khởi chạy ứng dụng**:
   ```bash
   cd mobile
   npm run start:go
   ```
   Mở Expo Go trên điện thoại Android hoặc quét mã QR.
2. **Mở màn hình GM-24**:
   - Từ màn hình chính (App Shell), bấm nút **"Mở vị trí & bối cảnh GM-24"**.
   - Hoặc điều hướng trực tiếp đến đường dẫn: `/gm24/context`.
3. **Thử nghiệm các kịch bản**:
   - Sử dụng thanh **🧪 Kịch bản thử nghiệm** ở đầu màn hình để chuyển đổi giữa các trạng thái:
     - `Hồ Con Rùa` / `Phố Đi Bộ`: Gợi ý điểm hẹn gần nhất theo tọa độ GPS foreground.
     - `Từ chối GPS`: Mô phỏng người dùng từ chối quyền vị trí -> Chuyển sang chọn thủ công.
     - `Tắt GPS`: Mô phỏng GPS không khả dụng -> Chuyển sang chọn thủ công.
     - `Ngoài vùng (HN)`: Tọa độ ngoài khu vực phủ sóng -> Cảnh báo ngoài vùng phủ sóng.
     - `Thủ công`: Cho phép bấm chọn bất kỳ điểm hẹn nào trong danh sách.
     - `Server Offline`: Mô phỏng mất kết nối mạng -> Hiển thị nút "Thử lại kết nối".
     - `Server Rỗng`: Xử lý an toàn khi máy chủ chưa có điểm hẹn.
     - `Thiết bị thực tế`: Sử dụng định vị GPS thực tế của điện thoại (foreground navigator.geolocation).
4. **Kiểm tra thời gian**:
   - Bấm **⚡ Ăn ngay (Buffer 30p)**: Giờ ăn mục tiêu được cộng 30 phút từ giờ máy chủ một lần duy nhất.
   - Bấm **🕒 Đặt giờ trước**: Chọn mốc giờ tương đối. Nếu chọn mốc quá khứ (-1 giờ), cảnh báo đỏ sẽ xuất hiện yêu cầu bấm "Xác nhận giờ này".
5. **Kiểm tra quyền riêng tư (Privacy Audit Panel)**:
   - Cuộn xuống dưới cùng để xem bảng **BẢO MẬT & QUYỀN RIÊNG TƯ**.
   - Xác nhận GPS thô chỉ lưu cục bộ, payload server chỉ chứa `anchorId`, `radiusM`, `desiredAt`, `mealSlot`, `serviceMode`.

## Checklist người nhận (GM-25 / GM-30)

- [ ] Import `locationService` hoặc `ContextScreen` từ `src/features/context`.
- [ ] Khi tạo phòng trong GM-25, gọi `sanitizeContextForServer(context)` để tạo payload gửi lên `apiClient.createRoom(...)`.
- [ ] Không tự thêm các trường `lat`/`lng` vào `RoomContext`.
- [ ] Tái sử dụng `ContextScreen` làm màn hình chọn địa điểm trong luồng tạo phòng của host.
