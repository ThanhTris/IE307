# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-08

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/main` (`50c4447`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables & Review Fixes (2026-11-08)
- **Review Round 3 Item 1 ([P1] Deep link hoạt động từ QR & nút sao chép, và web redirect route trong Expo Router)**:
  - Cập nhật `RoomQrModal.tsx`: QR matrix và nút sao chép liên kết phát ra deep link ứng dụng đã đăng ký `createJoinRoomDeepLink(cleanCode)` (`gi-cung-duoc://room/join?code=...`) thay vì web link `https://gicungduoc.vn` chưa trỏ DNS thật (NXDOMAIN).
  - Bổ sung web redirect routes trong Expo Router: `mobile/src/app/join/[code].tsx` và `mobile/src/app/join/index.tsx`, kiểm tra payload an toàn trước khi redirect về `/room/join?code=...` để các liên kết chia sẻ dạng web vẫn đưa người dùng về đúng màn xác nhận vào phòng.
- **Review Round 3 Item 2 ([P1] Ưu tiên URL điều hướng hiện tại & triệt tiêu race condition với late initial URL)**:
  - Trong `subscribeToJoinLinks`: Thêm tùy chọn `skipInitialUrl: Boolean(initialParamCode)` và cờ session-level `hasConsumedInitialUrl` để khi route đã được mount từ link điều hướng (ví dụ `code=MNP567`), hàm không gọi hoặc bỏ qua `Linking.getInitialURL()` chạy muộn từ cold start (ví dụ `GCD234`), tránh ghi đè mã phòng của người dùng.
  - Trong `join.tsx`: Điều chỉnh đồng bộ `prevParamCode` và `initialParamCode` trong render cycle (không gọi `setState` đồng bộ trong effect, đạt 0 lint errors), đảm bảo mã phòng từ route param luôn được điền tức thì.
- **Review Round 3 Item 3 ([P1] Places live thiếu key trả unsupported, không tự ý bật mô phỏng)**:
  - Trong `placesRepository.ts` (`createPlacesRepository`): Loại bỏ fallback `!effectiveKey`. Khi không truyền API key và cờ mô phỏng tắt, service trả về `status: 'unsupported'` chứ KHÔNG tự ý bật mô phỏng.
  - Trong `LiveDishResultScreen.tsx`: Cấu hình Places chỉ kích hoạt mô phỏng khi dev/QA được bật rõ ràng (`placesConfig?.isDevSimulated ?? (isDev && envSimulated)`). Khi thiếu key, UI hiển thị thông báo "Chưa thể hiển thị bản đồ" và nút "Mở Google Maps" ngoài, đồng thời giữ nguyên vẹn món thắng và bục Top 3 podium.
- **Review Round 3 Item 4 ([P1] Nối Map Renderer mặc định `DefaultResultMapView` và marker các quán)**:
  - Hiện thực `DefaultResultMapView.tsx` (chuẩn `ResultMapRenderer`): dựng canvas bản đồ (`result-map-canvas`), tính toán tọa độ chuẩn hóa và ghim marker cho các quán (`result-map-marker-${place.id}`), highlight marker đang chọn, hỗ trợ bấm ghim để đổi quán, và gắn nhãn `[Mô phỏng AVD]` khi chạy ở chế độ mô phỏng.
  - Nối `defaultResultMapRenderer` làm renderer mặc định trong `LiveDishResultScreen.tsx` và hỗ trợ truyền `renderMap` xuyên suốt từ `DishResultEntry.tsx`.
- **Review Round 3 Item 5 ([P2] Chặn cờ QA trong bản release & kiểm tra authority URL parser)**:
  - Parser `parseJoinRoomUrl` trong `joinLinks.ts` kiểm tra từ chối tuyệt đối URL có userinfo credentials (chứa `@`, ví dụ `gi-cung-duoc://qa-user:qa-value@room/join`) trả về `SUSPICIOUS_PAYLOAD`, và kiểm tra authority của custom scheme (`['room', 'join', 'r']`).
  - Toàn bộ cờ mô phỏng (`simulatedScanner`, `simulatedPlaces`) trong `join.tsx` và `result.tsx` được bọc bởi guard `Boolean(__DEV__)`, đảm bảo không thể kích hoạt trái phép trong bản release.
- **Review Round 2 Items (2026-11-08 sáng)**:
  - Bổ sung `isSuspiciousWord` và `isSuspiciousSearchParams` trong `joinLinks.ts`, loại bỏ `initialParamCode` (`activeCode = ''`) khi có payload độc hại.
  - Mặc định sử dụng `NativeQrScannerAdapter` trong `join.tsx`; chỉ bật `SimulatedQrScannerAdapter` khi có cờ tường minh và trong dev mode.
  - Bộ đếm thứ tự đơn điệu (`latestSeq`) và dọn dẹp `unsubscribe()` an toàn.
  - Pass-through cấu hình Places và bảo vệ món chiến thắng độc lập.

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 63/63** | `mobile/tests/unit/joinLinks.test.ts` (29 tests), `mobile/tests/unit/externalLinks.test.ts` (17 tests), `mobile/tests/unit/placesRepository.test.ts` (17 tests). Bao gồm: từ chối userinfo trong custom scheme, kiểm tra authority allowlist, skipInitialUrl & hasConsumedInitialUrl, thiếu key Places trả unsupported không tự bật mô phỏng, nhận diện suspicious params (`%74oken`), race condition cold link đến sau warm link, hủy callback sau unsubscribe, chuẩn QR matrix roundtrip decode. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: bao phủ toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). |
| Full GM-30 batch (10 suites) | **Pass: 161/161 tests** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx`. 100% pass với 0 errors. |
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
# Run full GM-30 suite batch (161 tests across 10 suites)
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
