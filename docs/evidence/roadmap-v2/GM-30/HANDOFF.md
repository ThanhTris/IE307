# Bàn giao đầu ra task — GM-30 / roadmap-v2

## Current local handoff — 2026-11-08

Source: PR issue #91 branch `issue91_figma_ui_gm30`, baseline `origin/main` (`8af20a9`).
Task / owner / reviewer / track / stage: GM-30 / Trí (`ThanhTris`) / Trí (`ThanhTris`) / INTEGRATION / integration.
Contract version: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Artifacts bàn giao chính:
- `mobile/src/features/rooms/services/joinLinks.ts`
- `mobile/src/features/result/services/externalLinks.ts`
- `mobile/src/features/result/services/placesRepository.ts`
- `mobile/src/features/result/components/DefaultResultMapView.tsx`
- `mobile/src/features/result/components/LiveResultMapView.tsx`
- `mobile/src/features/rooms/components/RoomQrModal.tsx`
- `mobile/src/features/rooms/screens/JoinRoomEntryScreen.tsx`
- `mobile/src/features/rooms/hooks/useJoinRoomEntry.ts`
- `mobile/src/features/rooms/screens/LiveLobbyScreen.tsx`
- `mobile/src/features/result/screens/LiveDishResultScreen.tsx`
- `mobile/src/bootstrap/DishResultEntry.tsx`
- `mobile/src/app/+native-intent.ts`
- `mobile/src/app/join/[code].tsx`
- `mobile/src/app/join/index.tsx`
- `mobile/src/app/room/join.tsx`
- `mobile/src/app/room/result.tsx`
- `mobile/tests/unit/joinLinks.test.ts`
- `mobile/tests/unit/externalLinks.test.ts`
- `mobile/tests/unit/placesRepository.test.ts`
- `mobile/tests/component/gm30FigmaParity.test.tsx`
- `mobile/tests/component/joinRoomEntry.test.tsx`
- `mobile/tests/component/liveDishResultScreen.test.tsx`
- `mobile/tests/integration/joinEntryRoute.test.tsx`
- `docs/evidence/roadmap-v2/GM-30/CHECKS.md`
- `docs/evidence/roadmap-v2/GM-30/FIGMA_PARITY.md`
- `docs/evidence/roadmap-v2/GM-30/HANDOFF.md`

---

## 1. File và cách dùng

| Artifact thực tế | Producer | Version | Cách import / dùng | Mục đích & Trách nhiệm | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/rooms/services/joinLinks.ts` | GM-30 | GM-30.1 | `import { generateQrMatrix, parseJoinRoomUrl, createJoinRoomDeepLink, createJoinRoomWebLink, subscribeToJoinLinks, guardJoinRoomUrl, installGlobalJoinLinkGuard, isSuspiciousWord, isSuspiciousSearchParams, SimulatedQrScannerAdapter, NativeQrScannerAdapter } from '@/features/rooms'` | Tạo ma trận QR thuần TypeScript; bóc tách deep link & web link; bảo vệ allowlist URL; loại bỏ query parameters nhạy cảm (`token`, `%74oken`); bộ đếm đơn điệu (`latestSeq`) loại bỏ cold link đến sau warm link; ưu tiên mã từ navigation param không bị late cold link ghi đè; cung cấp adapter máy quét QR cho cả môi trường AVD mô phỏng lẫn native. | Join Room Screen, Lobby, App Shell |
| `mobile/src/app/+native-intent.ts` | GM-30 | GM-30.1 | `export function redirectSystemPath({ path, initial })` | Interceptor của Expo Router kiểm tra và chặn trước khi router phân rã query params hoặc tách userinfo credentials từ các deep link độc hại (mở từ Home hoặc bên ngoài app), chuyển hướng về `/room/join?error=SUSPICIOUS_PAYLOAD`. | Expo Router, Root Layout |
| `mobile/src/features/result/services/externalLinks.ts` | GM-30 | GM-30.1 | `import { openExternalAction, createGoogleMapsPlaceUrl, createGoogleMapsSearchUrl, createGeoUri, createTikTokSearchUrl, createYouTubeSearchUrl } from '@/features/result'` | Xử lý mở liên kết ngoài an toàn với URL allowlist chặt chẽ (Google Maps, TikTok, YouTube); ngăn chặn tuyệt đối các URL độc hại, scheme lạ hoặc rò rỉ token; hỗ trợ cả Web URL và Geo URI trên Android. | Result Screen, Places Section |
| `mobile/src/features/result/services/placesRepository.ts` | GM-30 | GM-30.1 | `import { LivePlacesRepository, MockPlacesRepository, createPlacesRepository, getPlacesApiKeyFromEnv, isPlacesSimulatedFromEnv } from '@/features/result'` | Tầng giao tiếp tìm kiếm quán ăn xung quanh vị trí người dùng cho món thắng: gọi Google Places API (New) với FieldMask chuẩn; chế độ Dev Simulated AVD gắn nhãn rõ ràng (`[Simulated AVD] ...`); tính khoảng cách Haversine (`calculateDistanceM`); monotonic epoch guard hủy bỏ request dở dang khi đổi phòng/món; đọc biến môi trường API key và cờ mô phỏng. | Result Screen, Result Flow |
| `mobile/src/features/rooms/components/RoomQrModal.tsx` | GM-30 | GM-30.1 | `<RoomQrModal visible={show} code={roomCode} onClose={...} />` | Modal hiển thị mã QR phòng trong Lobby (Figma Node `368:12182`): vẽ QR bằng `react-native-svg` từ ma trận QR chuẩn, huy hiệu mã phòng, nút sao chép liên kết vào clipboard kèm phản hồi trực quan và dọn dẹp timer unmount an toàn. | Live Lobby Screen, GM-25 |
| `mobile/src/features/rooms/screens/JoinRoomEntryScreen.tsx` | GM-30 | GM-30.1 | Cập nhật màn hình tham gia phòng | Hỗ trợ chuyển đổi giữa nhập mã 6 ký tự bằng tay và quét mã QR máy ảnh: Viewfinder (Figma `268:2019`), Màn hình từ chối camera kèm nút "Mở Cài đặt" (Figma `275:2088`), Màn hình xác nhận sau khi quét thành công (Figma `268:2081`), nhãn AVD kèm ô nhập mã/URL test khi mô phỏng, và thông báo khi liên kết bị chặn. | Router `/room/join`, Navigation |
| `mobile/src/features/rooms/screens/LiveLobbyScreen.tsx` | GM-30 | GM-30.1 | Cập nhật màn hình Lobby phòng | Tích hợp đồng thời bộ chọn mời bạn bè (`RoomInvitePicker` từ GM-28) và nút mở QR modal (`RoomQrModal`) cùng sao chép liên kết (`Clipboard`). | Router `/room/lobby` |
| `mobile/src/features/result/screens/LiveDishResultScreen.tsx` | GM-30 | GM-30.1 | Cập nhật màn hình kết quả live | Tiếp nhận `placesConfig`, kết nối `placesRepository`, xử lý quyền vị trí (`requestLocationPermission`, `openLocationSettings`), liên kết hành động ngoài (`openExternalAction`), cô lập lỗi tìm quán mà không làm mất món thắng hay bục Top 3. | Router `/room/result`, GM-28 |
| `mobile/src/bootstrap/DishResultEntry.tsx` | GM-30 | GM-30.1 | Cập nhật entry kết quả | Truyền cấu hình Places (`placesConfig`) xuống `LiveDishResultScreen`. | Router `/room/result` |
| `mobile/src/app/room/join.tsx` | GM-30 | GM-30.1 | Cập nhật route tham gia phòng | Kiểm tra chặn payload độc hại từ URL, xóa mã không cho prefill/preview tự động, ưu tiên mã điều hướng hợp lệ không bị late cold link ghi đè, cấu hình máy quét native mặc định và chỉ bật mô phỏng khi có cờ `simulatedScanner=1`. | Router `/room/join` |
| `mobile/src/app/room/result.tsx` | GM-30 | GM-30.1 | Cập nhật route kết quả | Tiếp nhận cờ `simulatedPlaces=1` để bật chế độ Places mô phỏng trong QA backend trên AVD. | Router `/room/result` |
| `mobile/src/features/result/components/DefaultResultMapView.tsx` | GM-30 | GM-30.1 | `import { DefaultResultMapView, defaultResultMapRenderer } from '@/features/result'` | Renderer bản đồ mặc định cho thẻ quán kết quả theo Figma: vẽ canvas bản đồ, ghim marker cho các quán có tọa độ, highlight quán đang chọn, hỗ trợ bấm marker đổi quán, và hiển thị nhãn `[Mô phỏng AVD]` khi chạy ở chế độ mô phỏng. | Result Screen, Result Map Card |
| `mobile/src/features/result/components/LiveResultMapView.tsx` | GM-30 | GM-30.1 | `import { LiveResultMapView, liveResultMapRenderer } from '@/features/result'` | Renderer bản đồ live thật cho thẻ quán kết quả: gọi Google Static Maps khi có API key và tọa độ; lưu vết lỗi theo URL ảnh cụ thể (`failedUrl === staticMapUrl`) để khi chuyển sang quán khác sẽ tự động xóa lỗi và tải bản đồ quán mới; hiển thị thông báo bản đồ trong ứng dụng chưa khả dụng khi thiếu key/tọa độ/lỗi mà không làm mất nút "Mở bản đồ" Google Maps ngoài, món thắng hay bục Top 3. | LiveDishResultScreen, Result Screen |
| `mobile/src/app/join/[code].tsx` | GM-30 | GM-30.1 | Web redirect route `/join/[code]` | Chuyển hướng các đường dẫn chia sẻ web hợp lệ sang `/room/join?code=...`, kiểm tra sanitize payload trước khi redirect. | Expo Router, App Shell |
| `mobile/src/app/join/index.tsx` | GM-30 | GM-30.1 | Web redirect route `/join?code=...` | Chuyển hướng các đường dẫn web có query code sang `/room/join?code=...`. | Expo Router, App Shell |
| `mobile/tests/unit/joinLinks.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/joinLinks.test.ts` | 35 unit tests kiểm tra thuật toán QR matrix, parsing allowlist, bóc tách mã phòng, deep link, web link, share message, loại trừ mã độc hại (`%74oken`), từ chối userinfo trong custom scheme, kiểm tra authority, tiêu thụ URL khởi động đúng 1 lần (`consumeInitialUrl`), xử lý race condition, interceptor `guardJoinRoomUrl` / `redirectSystemPath`, và dọn dẹp unsubscribe. | CI / Regression |
| `mobile/tests/unit/externalLinks.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/externalLinks.test.ts` | 17 unit tests kiểm tra allowlist domain/scheme, URL formatters (Google Maps, TikTok, YouTube, Geo URI), chặn query nhạy cảm, và `openExternalAction`. | CI / Regression |
| `mobile/tests/unit/placesRepository.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/placesRepository.test.ts` | 17 unit tests kiểm tra `LivePlacesRepository`, gọi Google Places API New, Dev Simulated AVD mode, Mock adapter, phân quyền vị trí, cấu hình môi trường (thiếu key trả unsupported không tự bật mô phỏng) và hủy request khi đổi context. | CI / Regression |
| `mobile/tests/component/gm30FigmaParity.test.tsx` | GM-30 | GM-30.1 | `npm test -- tests/component/gm30FigmaParity.test.tsx` | 8 component tests kiểm tra toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`), tương tác modal, chuyển chế độ camera, xác nhận vào phòng, quyền vị trí, danh sách quán, nút hành động ngoài và cô lập món thắng. | CI / Regression |
| `mobile/tests/integration/joinEntryRoute.test.tsx` | GM-30 | GM-30.1 | `npm test -- tests/integration/joinEntryRoute.test.tsx` | 9 integration tests kiểm tra toàn bộ luồng vào phòng qua router: chuyển hướng `/join/[code]` và `/join?code=...`, ưu tiên mã điều hướng hợp lệ không bị late cold link ghi đè, chặn userinfo credentials (`gi-cung-duoc://qa-user:qa-value@...`) cả khi mở cold lẫn warm link từ Home hay tại chỗ hiển thị "Liên kết bị chặn", và đảm bảo mở lại chức năng nhập tay từ app không tự điền lại mã khởi động. | CI / Regression |
| `mobile/tests/component/liveDishResultScreen.test.tsx` | GM-30 | GM-30.1 | `npm test -- tests/component/liveDishResultScreen.test.tsx` | 28 component tests kiểm tra toàn diện màn hình kết quả: Decided, Top 3 podium, no consensus, error retry, live map renderer (Google Static Maps image vs unavailable notice), phục hồi và tải lại bản đồ khi chuyển từ Quán A (lỗi ảnh) sang Quán B, default schematic map cho AVD (`[Mô phỏng AVD]`), marker selection và cô lập Places error. | CI / Regression |

---

## 2. Acceptance criteria và trạng thái

| AC | Trạng thái | Môi trường & Lệnh | Evidence | Giới hạn & Ghi chú |
| --- | --- | --- | --- | --- |
| **AC1: Tạo và quét mã QR phòng, deep link và web link theo allowlist an toàn** | **Pass (code & automated tests)** | `npm test -- tests/unit/joinLinks.test.ts tests/component/gm30FigmaParity.test.tsx tests/integration/joinEntryRoute.test.tsx` | 35 unit tests, 9 integration tests, component tests cho Figma `268:2019`, `275:2088`, `268:2081`, `368:12182`. Allowlist scheme `gi-cung-duoc:`, `exp:`, `https:`, domain `gicungduoc.vn`. Chặn tuyệt đối userinfo (`@`) và token/credential độc hại từ điểm đón cold/warm của router qua `+native-intent.ts` và `joinLinks.ts`, không prefill hay preview khi URL bị từ chối; tiêu thụ URL khởi động đúng 1 lần ở cấp phiên app; ưu tiên mã điều hướng hiện tại không bị late launch URL ghi đè; QR matrix và nút sao chép phát deep link hoạt động được, web redirect routes chuyển tiếp an toàn sang `/room/join`. | Tuân thủ tuyệt đối quy định không thêm native module nặng ngoài expo baseline. |
| **AC2: Camera denied hiển thị thông báo rõ ràng, nút Mở Cài đặt và chuyển về nhập tay** | **Pass (code & automated tests) / Pass (Chặng 3A AVD Pixel 8)** | `JoinRoomEntryScreen.tsx`, `useJoinRoomEntry.ts` | Component test SCR-QR-02: Camera bị từ chối hiển thị biểu tượng, mô tả chi tiết, gọi `Linking.openSettings()` và nút "Nhập mã bằng tay" chuyển về form nhập mã 6 ký tự ngay lập tức. | Chặng 3A AVD kiểm thử qua `NativeQrScannerAdapter` (mặc định) và `SimulatedQrScannerAdapter` khi có cờ mô phỏng. |
| **AC3: Quét QR thành công chuyển thẳng sang màn hình xác nhận phòng** | **Pass (code & automated tests)** | `JoinRoomEntryScreen.tsx`, component test SCR-QR-03 | Quét QR hoặc nhận deep link hợp lệ tự động đọc thông tin preview công khai và hiển thị màn hình xác nhận phòng (Figma `268:2081`) kèm số lượng thành viên và nút "Xác nhận vào phòng". | Idempotent token bảo vệ chống gửi đúp. Không tự động điền mã giả khi chưa quét. |
| **AC4: Modal mã QR phòng trong Lobby hiển thị sắc nét, nút sao chép liên kết hoạt động** | **Pass (code & automated tests)** | `RoomQrModal.tsx`, `LiveLobbyScreen.tsx`, component test MODAL-01 | Modal hiển thị SVG QR matrix chuẩn xác, huy hiệu mã phòng, nút sao chép liên kết `https://gicungduoc.vn/join/XXXXXX` vào clipboard có thông báo phản hồi và timer cleanup. Đồng bộ hiển thị cùng `RoomInvitePicker` từ GM-28. | Figma Node `368:12182`. |
| **AC5: Quán gần bạn (Google Places / Map) kích hoạt độc lập chỉ sau khi có món thắng** | **Pass (code & automated tests)** | `placesRepository.ts`, `LiveDishResultScreen.tsx`, `placesRepository.test.ts`, `liveDishResultScreen.test.tsx` | Places fetching chỉ chạy khi `status === 'DECIDED'`. Mọi lỗi từ chối vị trí, mạng, hết quota hay API error đều bị cô lập, TUYỆT ĐỐI không làm mất, đổi hay reroll món thắng hoặc bục Top 3. Bản đồ live phục hồi mượt mà khi chuyển từ quán bị lỗi ảnh sang quán khác. | Figma Nodes `622:8962`, `206:913`, `379:1478`. |
| **AC6: Chế độ Dev Simulated AVD có nhãn rõ ràng cho Chặng 3A** | **Pass (code & automated tests)** | `placesRepository.ts`, `result.tsx` | Khi chạy ở môi trường AVD / dev / QA (`simulatedPlaces=1`), các quán ăn hiển thị kèm nhãn `[Simulated AVD]` và vị trí mô phỏng giúp kiểm thử trọn vẹn luồng UI mà không tốn phí Google Places API. | Phù hợp nguyên tắc Chặng 3A (Emulator-Now, USB-Later). |
| **AC7: Liên kết ngoài mở Google Maps, TikTok, YouTube tuân thủ allowlist** | **Pass (code & automated tests)** | `externalLinks.ts`, `externalLinks.test.ts` | Chỉ cho phép mở các domain Google Maps, TikTok và YouTube đã được duyệt. Loại bỏ toàn bộ token hay query nhạy cảm trước khi gọi `Linking.openURL`. | Chống rò rỉ dữ liệu người dùng. |
| **AC8: Epoch guard chống ô nhiễm phòng khi đổi context** | **Pass (code & automated tests)** | `LiveDishResultScreen.tsx`, `placesRepository.ts` | Sử dụng `placesSeqRef` và `AbortController` hủy bỏ request dở dang khi chuyển phòng, đảm bảo quán của Phòng A không bao giờ xuất hiện ở Phòng B. | Chống stale race condition. |

---

## 3. Hướng dẫn tích hợp cho các task kế tiếp

### 3.1. Dành cho GM-33 & GM-34 (Kiểm thử thực tế trên điện thoại Android USB — Chặng 3B)
- Cắm điện thoại thật qua USB sau khi toàn bộ các task UI-API đã hoàn tất.
- Khi cấp quyền camera thật trên thiết bị, camera view vật lý sẽ quét trực tiếp mã QR được render bởi `RoomQrModal` trên máy client thứ 2.
- Cung cấp Google Places API billing key qua biến môi trường để kiểm thử địa điểm thực tế tại TP. Hồ Chí Minh.
