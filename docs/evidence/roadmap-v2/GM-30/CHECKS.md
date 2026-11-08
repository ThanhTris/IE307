# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-08

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/main` (`50c4447`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables & Review Fixes (2026-11-08)
- **Review Round 4 Item 1 ([P2] Guard userinfo từ điểm đón cold/warm của router)**:
  - Khi mở ứng dụng bằng URI có userinfo credentials (ví dụ `gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234`), Expo Router có thể bóc userinfo thành query param và truyền `rawParams.code`. `join.tsx` không tin cậy `rawParams.code` ngay từ đầu mà luôn kiểm tra URL gốc thông qua `consumeInitialUrl()`.
  - Nếu URL gốc bị từ chối (`SUSPICIOUS_PAYLOAD`), `effectiveError` được đặt là `'SUSPICIOUS_PAYLOAD'`, `activeCode` bị ép về rỗng `''`, hiển thị thông báo "Liên kết bị chặn" và giữ ô nhập rỗng cho người dùng tự gõ mã hợp lệ.
  - Bổ sung test regression qua router trong `joinEntryRoute.test.tsx` (`/room/join blocks cold launch with userinfo credentials`).
- **Review Round 4 Item 2 ([P2] Tiêu thụ URL khởi động đúng một lần ở cấp phiên app)**:
  - Khắc phục lỗi khi khởi động bằng link `GCD234`, sau đó rời màn và mở lại chức năng nhập tay từ trong app với param rỗng nhưng mã `GCD234` lại xuất hiện trở lại do URL khởi động chưa bị tiêu thụ ở OS.
  - Hàm `consumeInitialUrl()` trong `joinLinks.ts` quản lý cờ `appLaunchUrlConsumed` ở cấp app session, đảm bảo `Linking.getInitialURL()` chỉ được truy vấn đúng 1 lần duy nhất trong toàn bộ vòng đời ứng dụng.
  - Các lần mount màn hình tiếp theo nhận callback `onInitialUrlEmpty()`, không bao giờ đọc lại URL cold cũ từ OS, giữ ô nhập rỗng cho người dùng tự gõ mã.
  - Bổ sung test kiểm tra cả 2 luồng: mở từ link và vào nhập tay từ app trong `joinEntryRoute.test.tsx` (`/room/join re-entry from app with empty params does not re-prefill cold launch code`).
- **Review Round 4 Item 3 ([P1] Tách biệt bản đồ live thật `LiveResultMapView` và sơ đồ QA `DefaultResultMapView`)**:
  - Hiện thực component bản đồ live thật `LiveResultMapView.tsx` (sử dụng Google Static Maps với API key và tọa độ các quán).
  - Khi chạy live thật (`effectiveSimulated = false`): nếu chưa thể tải bản đồ thật (thiếu key, thiếu tọa độ hoặc lỗi tải ảnh), UI hiển thị thông báo rõ ràng: `"Bản đồ trong ứng dụng chưa khả dụng. Vui lòng bấm nút 'Mở bản đồ' bên dưới để xem vị trí quán trên Google Maps."` mà không làm mất nút mở Google Maps ngoài, món thắng chung cuộc và bục Top 3 podium.
  - Giữ sơ đồ minh họa có nhãn `[Mô phỏng AVD]` (`DefaultResultMapView`) chỉ dành riêng cho nhánh QA/AVD simulation (`effectiveSimulated = true`).
  - Bổ sung 2 tests trong `liveDishResultScreen.test.tsx` bao phủ cả 2 trường hợp live map (có key và thiếu key).
- **Review Round 3 Item 1 ([P1] Deep link hoạt động từ QR & nút sao chép, và web redirect route trong Expo Router)**:
  - Cập nhật `RoomQrModal.tsx`: QR matrix và nút sao chép liên kết phát ra deep link ứng dụng đã đăng ký `createJoinRoomDeepLink(cleanCode)` (`gi-cung-duoc://room/join?code=...`) thay vì web link `https://gicungduoc.vn` chưa trỏ DNS thật (NXDOMAIN).
  - Bổ sung web redirect routes trong Expo Router: `mobile/src/app/join/[code].tsx` và `mobile/src/app/join/index.tsx`, kiểm tra payload an toàn trước khi redirect về `/room/join?code=...` để các liên kết chia sẻ dạng web vẫn đưa người dùng về đúng màn xác nhận vào phòng.
- **Review Round 3 Item 2 ([P1] Ưu tiên URL điều hướng hiện tại & triệt tiêu race condition với late initial URL)**:
  - Trong `subscribeToJoinLinks`: Áp dụng bộ đếm thứ tự đơn điệu (`latestSeq`) và `consumeInitialUrl()` để khi route đã được mount từ link điều hướng, hàm không ghi đè mã phòng của người dùng.
- **Review Round 3 Item 3 ([P1] Places live thiếu key trả unsupported, không tự ý bật mô phỏng)**:
  - Trong `placesRepository.ts` (`createPlacesRepository`): Khi không truyền API key và cờ mô phỏng tắt, service trả về `status: 'unsupported'` chứ KHÔNG tự ý bật mô phỏng.
- **Review Round 3 Item 4 ([P1] Nối Map Renderer mặc định `DefaultResultMapView` và marker các quán)**:
  - Hiện thực `DefaultResultMapView.tsx` (chuẩn `ResultMapRenderer`): dựng canvas bản đồ (`result-map-canvas`), tính toán tọa độ chuẩn hóa và ghim marker cho các quán (`result-map-marker-${place.id}`), highlight marker đang chọn, hỗ trợ bấm ghim để đổi quán, và gắn nhãn `[Mô phỏng AVD]` khi chạy ở chế độ mô phỏng.
- **Review Round 3 Item 5 ([P2] Chặn cờ QA trong bản release & kiểm tra authority URL parser)**:
  - Parser `parseJoinRoomUrl` trong `joinLinks.ts` kiểm tra từ chối tuyệt đối URL có userinfo credentials (chứa `@`, ví dụ `gi-cung-duoc://qa-user:qa-value@room/join`) trả về `SUSPICIOUS_PAYLOAD`, và kiểm tra authority của custom scheme (`['room', 'join', 'r']`).
  - Toàn bộ cờ mô phỏng (`simulatedScanner`, `simulatedPlaces`) trong `join.tsx` và `result.tsx` được bọc bởi guard `Boolean(__DEV__)`, đảm bảo không thể kích hoạt trái phép trong bản release.

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 64/64** | `mobile/tests/unit/joinLinks.test.ts` (30 tests), `mobile/tests/unit/externalLinks.test.ts` (17 tests), `mobile/tests/unit/placesRepository.test.ts` (17 tests). Bao gồm: từ chối userinfo trong custom scheme, kiểm tra authority allowlist, consumeInitialUrl chỉ tiêu thụ 1 lần ở cấp phiên app, thiếu key Places trả unsupported không tự bật mô phỏng, nhận diện suspicious params (`%74oken`), race condition cold link đến sau warm link, hủy callback sau unsubscribe, chuẩn QR matrix roundtrip decode. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: bao phủ toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). |
| Full GM-30 batch (10 suites) | **Pass: 166/166 tests** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx`. 100% pass với 0 errors. |
| Strict TypeScript check | **Pass: 0 errors** | `npm --prefix mobile run typecheck` (`tsc --noEmit`). |
| ESLint check | **Pass: 0 errors / 0 warnings** | `npm --prefix mobile run lint` (`eslint .`). |
| Repository validation | **Pass** | `python scripts/validate_repository.py`. |
| Task docs consistency | **Pass** | `python scripts/task_readiness.py --check-docs`. |
| Chặng 3A — Máy ảo Android (AVD) + Backend QA local | **Pass (Code & AVD simulated adapter verified)** | Nghiệm thu trên AVD Pixel 8 (API 34) nối backend QA local qua `SimulatedQrScannerAdapter` (có nhãn và ô nhập test), Dev Simulated Places Adapter có gắn nhãn rõ ràng (`[Simulated AVD] ...`), và Default Map View (`DefaultResultMapView` với nhãn `[Mô phỏng AVD]` và marker ghim quán). Đảm bảo không phụ thuộc phần cứng camera vật lý hay Google billing key theo quy định Chặng 3A. Reviewer: **Not run bởi reviewer** trong lượt này. |
| Hoãn sang Chặng 3B: Camera vật lý & Google billing key | **Deferred to Stage 3B** | Camera QR vật lý trên điện thoại thật cắm cáp USB và Google Places production billing key được hoãn sang Chặng 3B (`GM-33`/`GM-34`) sau khi hoàn tất toàn bộ UI-API tasks. |

---

## Reproduce

From `mobile/`:

```powershell
# Run full GM-30 suite batch (166 tests across 10 suites)
npx jest tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx

# Run strict TypeScript typecheck
npm run typecheck

# Run linter
npm run lint
```

From repository root:

```powershell
# Validate repository documents and dependencies
python scripts/validate_repository.py

# Validate task readiness documentation
python scripts/task_readiness.py --check-docs
```
