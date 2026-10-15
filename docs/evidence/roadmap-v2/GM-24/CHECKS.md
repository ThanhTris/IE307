# GM-24 checks

- Task/contract: GM-24 / `food-v1/roadmap-v2/GM-24.1`
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Base revision: `e0b88c0` (origin/main)
- Upstream dependencies & provenance:
  - GM-05 (Shared UI Components & Theme tokens): `mobile/src/shared/theme/tokens.ts`
  - GM-07 (API Client Contracts & Mock): `mobile/src/data/api/contracts.ts`
  - GM-16 (Session & Auth): `mobile/src/data/auth/session.ts`
  - GM-18 (Discovery Context & Preview): `mobile/src/data/discovery/index.ts`
- Target deliverables:
  - `mobile/src/features/context/services/location.ts`
  - `mobile/src/features/context/screens/ContextScreen.tsx`
  - `mobile/src/features/context/index.ts`
  - `mobile/src/app/gm24/context.tsx`
  - `mobile/tests/unit/locationService.test.ts`
  - `mobile/tests/component/contextScreen.test.tsx`
  - `mobile/tests/integration/routes.test.tsx`
- Schema/dataset: Pure client location adapter and discovery contract integration; no DB tables created directly in GM-24.
- Environment: Windows, Node v22.11.0, npm 11.3.0, Expo SDK 57, React Native 0.86.3.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| 1. Tính khoảng cách Haversine & tìm điểm hẹn công cộng gần nhất | `cd mobile; npm test tests/unit/locationService.test.ts -t "calculateDistanceM"` | Tọa độ trùng trả về 0; khoảng cách giữa Hồ Con Rùa (10.7828, 106.6958) và Phố Đi Bộ (10.7743, 106.7034) nằm trong khoảng 1.100m – 1.400m; đầu vào không hợp lệ trả về NaN | 3 assertions passed: tính toán chính xác số mét đường chim bay | Pass (automated unit) |
| 2. Gợi ý điểm hẹn gần nhất & phát hiện ngoài vùng phủ sóng | `cd mobile; npm test tests/unit/locationService.test.ts -t "findNearestAnchor"` | Người dùng gần Hồ Con Rùa tự động gợi ý Hồ Con Rùa (~0m), `isOutsideCoverage: false`; tọa độ Hà Nội (~1.140 km) trả về `isOutsideCoverage: true`; danh sách rỗng xử lý an toàn | 7 assertions passed: xếp hạng theo khoảng cách tăng dần | Pass (automated unit) |
| 3. Ăn ngay (Eat Now): Lấy server now + 30 phút buffer một lần duy nhất | `cd mobile; npm test tests/unit/locationService.test.ts -t "computeEatNowTime"` | Cộng buffer 30 phút chính xác một lần từ giờ server ISO; không cộng lặp lại; giờ server không hợp lệ ném lỗi `INVALID_SERVER_TIME` | 3 assertions passed: `diffMs === 30 * 60 * 1000` | Pass (automated unit) |
| 4. Đặt giờ trước (Scheduled): Không cộng lại buffer, kiểm tra giờ quá khứ và ngưỡng 7 ngày | `cd mobile; npm test tests/unit/locationService.test.ts -t "validateDesiredTime"` | Giờ hợp lệ trong tương lai trả về `isValid: true`; giờ trong quá khứ trả về `isPast: true`, `DESIRED_TIME_PASSED`; giờ vượt quá 7 ngày trả về `isTooFarFuture: true`, `DESIRED_TIME_TOO_FAR` | 7 assertions passed: kiểm tra chặt chẽ theo chính sách GM-18 | Pass (automated unit) |
| 5. Quyền riêng tư: Payload server chỉ chứa anchorId/radiusM/desiredAt; 0 GPS thô trong log/request | `cd mobile; npm test tests/unit/locationService.test.ts -t "Privacy Boundary"` | `sanitizeContextForServer` lọc sạch và chỉ giữ các trường bối cảnh phòng hợp lệ; cấm tuyệt đối tọa độ (`latitude`, `longitude`, `coords`, `rawGps`); `redactLocationFromLog` xóa đệ quy tọa độ thành `[REDACTED_GPS]` | 12 assertions passed: loại bỏ hoàn toàn khóa GPS thô | Pass (automated unit) |
| 6. LocationService & MockLocationAdapter: chuyển đổi kịch bản grant/deny/GPS-off/outside | `cd mobile; npm test tests/unit/locationService.test.ts -t "LocationService"` | Grant trả về `mode: 'gps'` + anchor gần nhất; Deny chuyển sang `mode: 'manual'` + thông báo; Lỗi tín hiệu chuyển sang manual; Ngoài vùng hiển thị cảnh báo; Đặt giờ quá khứ yêu cầu xác nhận `requiresConfirmation: true` | 17 assertions passed: xử lý toàn vẹn các trạng thái ngoại lệ | Pass (automated unit) |
| 7. Giao diện ContextScreen: hiển thị đầy đủ bối cảnh, điểm hẹn, bán kính, giờ ăn, bảo mật | `cd mobile; npm test tests/component/contextScreen.test.tsx` | Render đầy đủ tiêu đề, selector kịch bản thử nghiệm, điểm hẹn công cộng, bán kính, thời gian, buổi ăn, hình thức phục vụ, tóm tắt và bảng audit bảo mật | 13 component tests passed (100% scenarios covered) | Pass (component scope) |
| 8. Kịch bản lỗi mạng & server rỗng | `cd mobile; npm test tests/component/contextScreen.test.tsx -t "offline"` | Mô phỏng server offline: hiển thị thông báo lỗi `Lỗi tải dữ liệu khu vực` và nút `Thử lại kết nối`; bấm thử lại tải lại dữ liệu thành công | Assertions passed: xử lý lỗi mạng mượt mà, không crash | Pass (component scope) |
| 9. Điều hướng Expo Router | `cd mobile; npm test tests/integration/routes.test.tsx` | Điều hướng từ App Shell qua nút `Mở vị trí & bối cảnh GM-24` đến route `/gm24/context`, render màn hình thành công và quay lại | 5 route tests passed: tích hợp router hoàn chỉnh | Pass (automated integration) |
| 10. TypeScript strict check | `cd mobile; npm run typecheck` | `tsc --noEmit` toàn bộ repo mobile | 0 errors | Pass |
| 11. ESLint check | `cd mobile; npm run lint` | ESLint trên toàn bộ mobile | 0 errors (4 pre-existing warnings từ contracts/index) | Pass |
| 12. Architecture boundary guard | `cd mobile; npm run check:architecture` | Kiểm tra giới hạn kiến trúc tĩnh | "Architecture boundaries OK" | Pass |
| 13. Android JS bundle export | `cd mobile; npm run bundle:android` | Xuất gói Android qua Metro bundler | 1,276 modules bundled thành công, xuất `dist/android` | Pass (bundle only; not app launch) |
| 14. Thiết bị Android / Expo Go thực tế | Mở Expo Go trên Android, vào route `/gm24/context` | Kiểm tra thực tế trên điện thoại: xin quyền vị trí foreground, tính khoảng cách thực tế, chọn thủ công, chọn bán kính, đổi giờ ăn và kiểm tra panel audit bảo mật | Màn hình đã tích hợp sẵn Scenario Picker và native location adapter, sẵn sàng chạy trên Expo Go Android. Do chưa chạy trên thiết bị vật lý có ghi nhận log phần cứng, mục này ghi Not run theo quy định | Not run (chờ reviewer/chủ dự án kiểm tra thực tế trên thiết bị) |
| 15. Kiểm tra Repository và Task indexes | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs` | Kiểm tra tính toàn vẹn repository, link markdown và task index | Repository OK; task indexes match task metadata | Pass |

## Limits

Task GM-24 bàn giao service vị trí (`location.ts`), adapter định vị foreground, pure distance calculation, bộ phân giải server-time buffer và màn hình kiểm thử tích hợp (`ContextScreen.tsx` tại route `/gm24/context`).
- Tọa độ GPS thô được giữ cục bộ trên thiết bị và chỉ dùng để tìm điểm hẹn công cộng gần nhất. Server chỉ nhận `anchorId`, `radiusM`, `desiredAt`, `mealSlot`, `serviceMode`.
- Không sử dụng background tracking hoặc thu thập vị trí ngầm.
- Phục vụ bàn giao cho task GM-25 (nối ContextScreen với luồng tạo phòng và lobby) và GM-30 (nối bản đồ/bối cảnh phòng).
- Bằng chứng kiểm tra và artifact không tự thay đổi trạng thái Approval/Done.
