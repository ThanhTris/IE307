# Bàn giao đầu ra task — GM-30 / roadmap-v2

## Current local handoff — 2026-11-07

Source: PR issue #91 branch `issue91_figma_ui_gm30`, baseline `origin/issue88_figma_ui_gm27` / `origin/main` (`50c4447`).
Task / owner / reviewer / track / stage: GM-30 / Trí (`ThanhTris`) / Trí (`ThanhTris`) / INTEGRATION / integration.
Contract version: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Artifacts bàn giao chính:
- `mobile/src/features/rooms/services/joinLinks.ts`
- `mobile/src/features/result/services/externalLinks.ts`
- `mobile/src/features/result/services/placesRepository.ts`
- `mobile/src/features/rooms/components/RoomQrModal.tsx`
- `mobile/src/features/rooms/screens/JoinRoomEntryScreen.tsx`
- `mobile/src/features/rooms/hooks/useJoinRoomEntry.ts`
- `mobile/src/features/rooms/screens/LiveLobbyScreen.tsx`
- `mobile/src/features/result/screens/LiveDishResultScreen.tsx`
- `mobile/src/features/result/index.ts`
- `mobile/src/features/rooms/index.ts`
- `mobile/tests/unit/joinLinks.test.ts`
- `mobile/tests/unit/externalLinks.test.ts`
- `mobile/tests/unit/placesRepository.test.ts`
- `mobile/tests/component/gm30FigmaParity.test.tsx`
- `docs/evidence/roadmap-v2/GM-30/CHECKS.md`
- `docs/evidence/roadmap-v2/GM-30/FIGMA_PARITY.md`
- `docs/evidence/roadmap-v2/GM-30/HANDOFF.md`

---

## 1. File và cách dùng

| Artifact thực tế | Producer | Version | Cách import / dùng | Mục đích & Trách nhiệm | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/rooms/services/joinLinks.ts` | GM-30 | GM-30.1 | `import { generateQrMatrix, parseJoinRoomUrl, createJoinRoomDeepLink, createJoinRoomWebLink, subscribeToJoinLinks, SimulatedQrScannerAdapter, NativeQrScannerAdapter } from '@/features/rooms'` | Tạo ma trận QR 25×25 thuần TypeScript; tạo và bóc tách deep link (`gi-cung-duoc://room/join?code=...`) & web link (`https://gicungduoc.vn/join/...`); bảo vệ allowlist URL; loại bỏ query parameters nhạy cảm; lắng nghe cold-start và warm-start deep link; cung cấp adapter máy quét QR cho cả môi trường AVD mô phỏng lẫn native. | Join Room Screen, Lobby, App Shell |
| `mobile/src/features/result/services/externalLinks.ts` | GM-30 | GM-30.1 | `import { openExternalAction, createGoogleMapsPlaceUrl, createGoogleMapsSearchUrl, createGeoUri, createTikTokSearchUrl, createYouTubeSearchUrl } from '@/features/result'` | Xử lý mở liên kết ngoài an toàn với URL allowlist chặt chẽ (Google Maps, TikTok, YouTube); ngăn chặn tuyệt đối các URL độc hại, scheme lạ hoặc rò rỉ token; hỗ trợ cả Web URL và Geo URI trên Android. | Result Screen, Places Section |
| `mobile/src/features/result/services/placesRepository.ts` | GM-30 | GM-30.1 | `import { LivePlacesRepository, MockPlacesRepository, createPlacesRepository } from '@/features/result'` | Tầng giao tiếp tìm kiếm quán ăn xung quanh vị trí người dùng cho món thắng: gọi Google Places API (New) với FieldMask chuẩn; chế độ Dev Simulated AVD gắn nhãn rõ ràng (`[Simulated AVD] ...`); tính khoảng cách Haversine (`calculateDistanceM`); monotonic epoch guard hủy bỏ request dở dang khi đổi phòng/món. | Result Screen, Result Flow |
| `mobile/src/features/rooms/components/RoomQrModal.tsx` | GM-30 | GM-30.1 | `<RoomQrModal visible={show} code={roomCode} onClose={...} />` | Modal hiển thị mã QR phòng trong Lobby (Figma Node `368:12182`): vẽ QR bằng `react-native-svg` từ ma trận 25×25, huy hiệu mã phòng, nút sao chép liên kết vào clipboard kèm phản hồi trực quan và dọn dẹp timer unmount an toàn. | Live Lobby Screen, GM-25 |
| `mobile/src/features/rooms/screens/JoinRoomEntryScreen.tsx` | GM-30 | GM-30.1 | Cập nhật màn hình tham gia phòng | Hỗ trợ chuyển đổi mượt mà giữa nhập mã 6 ký tự bằng tay và quét mã QR máy ảnh: Viewfinder (Figma `268:2019`), Màn hình từ chối camera kèm nút "Mở Cài đặt" (Figma `275:2088`), Màn hình xác nhận sau khi quét thành công (Figma `268:2081`). | Router `/room/join`, Navigation |
| `mobile/src/features/result/screens/LiveDishResultScreen.tsx` | GM-30 | GM-30.1 | Cập nhật màn hình kết quả live | Kết nối `placesRepository`, xử lý quyền vị trí (`requestLocationPermission`, `openLocationSettings`), liên kết hành động ngoài (`openExternalAction`), cô lập lỗi tìm quán mà không làm mất món thắng. | Router `/room/result`, GM-28 |
| `mobile/tests/unit/joinLinks.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/joinLinks.test.ts` | 18 unit tests kiểm tra thuật toán QR matrix, parsing allowlist, bóc tách mã phòng, deep link, web link, share message, và lắng nghe deep link. | CI / Regression |
| `mobile/tests/unit/externalLinks.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/externalLinks.test.ts` | 18 unit tests kiểm tra allowlist domain/scheme, URL formatters (Google Maps, TikTok, YouTube, Geo URI), chặn query nhạy cảm, và `openExternalAction`. | CI / Regression |
| `mobile/tests/unit/placesRepository.test.ts` | GM-30 | GM-30.1 | `npm test -- tests/unit/placesRepository.test.ts` | 14 unit tests kiểm tra `LivePlacesRepository`, gọi Google Places API New, Dev Simulated AVD mode, Mock adapter, phân quyền vị trí, và hủy request khi đổi context. | CI / Regression |
| `mobile/tests/component/gm30FigmaParity.test.tsx` | GM-30 | GM-30.1 | `npm test -- tests/component/gm30FigmaParity.test.tsx` | 8 component tests kiểm tra toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`), tương tác modal, chuyển chế độ camera, xác nhận vào phòng, quyền vị trí, danh sách quán, nút hành động ngoài và cô lập món thắng. | CI / Regression |

---

## 2. Acceptance criteria và trạng thái

| AC | Trạng thái | Môi trường & Lệnh | Evidence | Giới hạn & Ghi chú |
| --- | --- | --- | --- | --- |
| **AC1: Tạo và quét mã QR phòng, deep link và web link theo allowlist an toàn** | **Pass (code & automated tests)** | `npm test -- tests/unit/joinLinks.test.ts tests/component/gm30FigmaParity.test.tsx` | 18 unit tests, component tests cho Figma `268:2019`, `275:2088`, `268:2081`, `368:12182`. Allowlist scheme `gi-cung-duoc:`, `exp:`, `https:`, domain `gicungduoc.vn`. | Tuân thủ tuyệt đối quy định không thêm native module nặng ngoài expo baseline. |
| **AC2: Camera denied hiển thị thông báo rõ ràng, nút Mở Cài đặt và chuyển về nhập tay** | **Pass (code & automated tests) / Pass (Chặng 3A AVD Pixel 8)** | `JoinRoomEntryScreen.tsx`, `useJoinRoomEntry.ts` | Component test SCR-QR-02: Camera bị từ chối hiển thị biểu tượng, mô tả chi tiết, gọi `Linking.openSettings()` và nút "Nhập mã bằng tay" chuyển về form nhập mã 6 ký tự ngay lập tức. | Chặng 3A AVD kiểm thử qua `SimulatedQrScannerAdapter` và native fallback khi camera bị chặn trong expo config. |
| **AC3: Quét QR thành công chuyển thẳng sang màn hình xác nhận phòng** | **Pass (code & automated tests)** | `JoinRoomEntryScreen.tsx`, component test SCR-QR-03 | Quét QR hoặc nhận deep link hợp lệ tự động đọc thông tin preview công khai và hiển thị màn hình xác nhận phòng (Figma `268:2081`) kèm số lượng thành viên và nút "Xác nhận vào phòng". | Idempotent token bảo vệ chống gửi đúp. |
| **AC4: Modal mã QR phòng trong Lobby hiển thị sắc nét, nút sao chép liên kết hoạt động** | **Pass (code & automated tests)** | `RoomQrModal.tsx`, `LiveLobbyScreen.tsx`, component test MODAL-01 | Modal hiển thị SVG QR matrix 25×25 chuẩn xác, huy hiệu mã phòng, nút sao chép liên kết `https://gicungduoc.vn/join/XXXXXX` vào clipboard có thông báo phản hồi và timer cleanup. | Figma Node `368:12182`. |
| **AC5: Quán gần bạn (Google Places / Map) kích hoạt độc lập chỉ sau khi có món thắng** | **Pass (code & automated tests)** | `placesRepository.ts`, `LiveDishResultScreen.tsx`, `placesRepository.test.ts` | Places fetching chỉ chạy khi `status === 'DECIDED'`. Mọi lỗi từ chối vị trí, mạng, hết quota hay API error đều bị cô lập, TUYỆT ĐỐI không làm mất, đổi hay reroll món thắng hoặc bục Top 3. | Figma Nodes `622:8962`, `206:913`, `379:1478`. |
| **AC6: Chế độ Dev Simulated AVD có nhãn rõ ràng cho Chặng 3A** | **Pass (code & automated tests)** | `placesRepository.ts` | Khi chạy ở môi trường AVD / dev (`isDevSimulated: true`), các quán ăn hiển thị kèm nhãn `[Simulated AVD]` và vị trí mô phỏng giúp kiểm thử trọn vẹn luồng UI mà không tốn phí Google Places API. | Phù hợp nguyên tắc Chặng 3A (Emulator-Now, USB-Later). |
| **AC7: Liên kết ngoài mở Google Maps, TikTok, YouTube tuân thủ allowlist** | **Pass (code & automated tests)** | `externalLinks.ts`, `externalLinks.test.ts` | Chỉ cho phép mở các domain Google Maps, TikTok và YouTube đã được duyệt. Loại bỏ toàn bộ token hay query nhạy cảm trước khi gọi `Linking.openURL`. | Chống rò rỉ dữ liệu người dùng. |
| **AC8: Epoch guard chống ô nhiễm phòng khi đổi context** | **Pass (code & automated tests)** | `LiveDishResultScreen.tsx`, `placesRepository.ts` | Sử dụng `placesSeqRef` và `AbortController` hủy bỏ request dở dang khi chuyển phòng, đảm bảo quán của Phòng A không bao giờ xuất hiện ở Phòng B. | Chống stale race condition. |

---

## 3. Hướng dẫn tích hợp cho các task kế tiếp

### 3.1. Dành cho GM-33 & GM-34 (Kiểm thử thực tế trên điện thoại Android USB — Chặng 3B)
- Cắm điện thoại thật qua USB sau khi toàn bộ các task UI-API đã hoàn tất.
- Khi cấp quyền camera thật trên thiết bị, camera view vật lý sẽ quét trực tiếp mã QR được render bởi `RoomQrModal` trên máy client thứ 2.
- Cung cấp Google Places API billing key qua biến môi trường để kiểm thử địa điểm thực tế tại TP. Hồ Chí Minh.
