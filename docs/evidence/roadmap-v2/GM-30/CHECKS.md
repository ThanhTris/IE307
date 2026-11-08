# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-08

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/main` (`50c4447`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables & Review Fixes (2026-11-08)
- **Review Item 1 ([P1] Route URL Rejection Guard & Query Sanitization)**:
  - Bổ sung `isSuspiciousWord` và `isSuspiciousSearchParams` trong `joinLinks.ts` nhằm kiểm tra toàn diện query parameters được Expo Router trích xuất.
  - Khi mở link chứa query độc hại/bị chặn (ví dụ `gi-cung-duoc://room/join?code=GCD234&%74oken=synthetic` hoặc chứa các từ khóa nhạy cảm `token`, `secret`, `auth`, v.v.), `join.tsx` lập tức loại bỏ `initialParamCode` (`activeCode = ''`), không điền trước mã phòng và tuyệt đối không tự động gọi `previewJoin('GCD234')`.
  - Hiển thị thông báo trạng thái `StatusNotice` "Liên kết bị chặn" hướng dẫn người dùng nhập mã bằng tay. Luồng nhập mã 6 ký tự và màn hình xác nhận được giữ nguyên vẹn.
- **Review Item 2 ([P1] Scanner Configuration & Simulation Input for AVD Testing)**:
  - Loại bỏ hoàn toàn việc `SimulatedQrScannerAdapter` tự động điền mã mặc định `GCD234` khi chưa quét hoặc không có dữ liệu đầu vào (`simulateScan()` trả về `{ ok: false, code: '' }`).
  - Trong `join.tsx`, route thật mặc định sử dụng `NativeQrScannerAdapter` (trả về denied/unavailable trên máy ảo AVD và điều hướng người dùng sang nhập mã bằng tay).
  - Chế độ quét mô phỏng AVD chỉ được kích hoạt khi có cờ tường minh (`simulatedScanner=1` hoặc `simulated=1`).
  - Khi chế độ mô phỏng được bật, màn hình camera hiển thị nhãn `[Mô phỏng AVD] Camera quét QR mô phỏng cho AVD testing` và cung cấp ô nhập liệu mã/URL test để mô phỏng quét trực tiếp trên AVD. Nếu để trống, bấm "Thử quét QR" không thoát màn hình và không tự sinh mã giả.
- **Review Item 3 ([P2] Monotonic Sequence Counter in `subscribeToJoinLinks`)**:
  - Khắc phục triệt để race condition giữa cold start `Linking.getInitialURL()` và warm event `Linking.addEventListener('url')`.
  - Thiết lập bộ đếm thứ tự đơn điệu (`latestSeq`) và cờ `active`: nếu cold start resolve trễ sau khi warm event mới hơn (ví dụ `MNP567`) đã đến, cold link cũ (`GCD234`) bị hủy bỏ ngay lập tức để giữ lại liên kết mới nhất.
  - Khi `unsubscribe()` được gọi, toàn bộ callbacks sau đó bị hủy bỏ, ngăn ngừa memory leak hoặc state update trên component đã unmount.
- **Review Item 4 ([P1] Places Live Configuration Pass-Through & Winner Isolation)**:
  - Thêm helper `getPlacesApiKeyFromEnv()` và `isPlacesSimulatedFromEnv()` trong `placesRepository.ts` để đọc API key từ biến môi trường (`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` / `EXPO_PUBLIC_PLACES_API_KEY`) và cờ mô phỏng (`EXPO_PUBLIC_PLACES_SIMULATED`).
  - Truyền cấu hình Places (`placesConfig`) xuyên suốt từ `ResultRoute` (`/room/result`) -> `DishResultEntry` -> `LiveDishResultScreen`, cho phép bật/tắt Places mô phỏng độc lập trong QA backend (`simulatedPlaces=1`).
  - Kiểm thử xác minh nghiêm ngặt ở cả 2 chế độ (simulated Places và real Places không có API key): thẻ món thắng và bục Top 3 luôn được hiển thị độc lập, nguyên vẹn và không bị biến dạng hay ảnh hưởng bởi trạng thái tải/quyền vị trí/lỗi của Places.
- **Join Links & Standard ISO/IEC 18004 QR Matrix**:
  - Chuẩn QR Code Model 2 thuần TypeScript 100% không phụ thuộc thư viện native ngoài.
  - Roundtrip decode test khôi phục 100% URL và room code.
  - Allowlist bảo vệ scheme (`gi-cung-duoc:`, `exp:`, `https:`) và domain (`gicungduoc.vn`).

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 58/58** | `mobile/tests/unit/joinLinks.test.ts` (25 tests), `mobile/tests/unit/externalLinks.test.ts` (17 tests), `mobile/tests/unit/placesRepository.test.ts` (16 tests). Bao gồm: nhận diện suspicious params (`%74oken`), race condition cold link đến sau warm link, hủy callback sau unsubscribe, chuẩn QR matrix roundtrip decode, Places config pass-through và bảo vệ món thắng. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: bao phủ toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). |
| Full GM-30 batch (10 suites) | **Pass: 152/152 tests** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx`. 100% pass với 0 errors. |
| Strict TypeScript check | **Pass: 0 errors** | `npm --prefix mobile run typecheck` (`tsc --noEmit`). |
| ESLint check | **Pass: 0 errors / 0 warnings** | `npm --prefix mobile run lint` (`eslint .`). |
| Repository validation | **Pass** | `python scripts/validate_repository.py`. |
| Task docs consistency | **Pass** | `python scripts/task_readiness.py --check-docs`. |
| Chặng 3A — Máy ảo Android (AVD) + Backend QA local | **Pass (Code & AVD simulated adapter verified)** | Nghiệm thu trên AVD Pixel 8 (API 34) nối backend QA local qua `SimulatedQrScannerAdapter` (có nhãn và ô nhập test) và Dev Simulated Places Adapter có gắn nhãn rõ ràng (`[Simulated AVD] ...`). Đảm bảo không phụ thuộc phần cứng camera vật lý hay Google billing key theo quy định Chặng 3A. Reviewer: **Not run bởi reviewer** trong lượt này. |
| Hoãn sang Chặng 3B: Camera vật lý & Google billing key | **Deferred to Stage 3B** | Camera QR vật lý trên điện thoại thật cắm cáp USB và Google Places production billing key được hoãn sang Chặng 3B (`GM-33`/`GM-34`) sau khi hoàn tất toàn bộ UI-API tasks. |

---

## Reproduce

From `mobile/`:

```powershell
# Run full GM-30 suite batch (152 tests across 10 suites)
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
