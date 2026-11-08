# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-08

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/main` (`8af20a9`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables & Review Fixes (2026-11-08)
- **Review Round 5 Item 1 (Rebase clean lên `origin/main` & đồng bộ `LiveLobbyScreen.tsx`)**:
  - Rebase sạch nhánh làm việc lên commit mới nhất của `origin/main` (`8af20a9`).
  - Trong `LiveLobbyScreen.tsx`: giữ trọn vẹn cả picker chọn bạn bè (`RoomInvitePicker`) của task GM-28 vừa merge lẫn nút mở QR modal (`RoomQrModal`) và sao chép liên kết (`Clipboard`) của GM-30.
- **Review Round 5 Item 2 ([P2] Ưu tiên URL điều hướng hiện tại & không bị late getInitialURL ghi đè)**:
  - Khi màn `/room/join` được mount với mã từ điều hướng (ví dụ `rawParamCode = 'MNP567'`), nếu `Linking.getInitialURL()` của cold start trả về muộn với mã cũ (ví dụ `GCD234`), listener bỏ qua cold start URL này, không ghi đè mã điều hướng hợp lệ của người dùng. Các warm link events đến sau (người dùng mở link khi app đang chạy) vẫn được cập nhật bình thường.
  - Thêm test regression trong `joinEntryRoute.test.tsx`: route mount với `MNP567`, late `getInitialURL` trả `GCD234`, xác nhận join ACK gửi đúng mã `MNP567`.
- **Review Round 5 Item 3 ([P2] Chặn rò rỉ userinfo credentials từ warm link mở từ màn khác hoặc tại chỗ)**:
  - Khi URI chứa credentials (ví dụ `gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234`) được mở từ màn khác (Home) hoặc mở tại chỗ khi đang ở màn join, Expo Router mặc định bóc tách authority trước khi vào route.
  - Bổ sung native intent interceptor `mobile/src/app/+native-intent.ts` (`redirectSystemPath`): chặn và kiểm tra raw URL trước khi Expo Router phân rã path segments hay query parameters, tự động rewrite URL độc hại sang `/room/join?error=SUSPICIOUS_PAYLOAD`.
  - Đồng thời trong `joinLinks.ts`: cài đặt `installGlobalJoinLinkGuard()` bọc `Linking.getInitialURL`, `Linking.addEventListener` và `ExpoLinking.addEventListener` để lọc và sanitize toàn diện.
  - Bổ sung 2 tests regression trong `joinEntryRoute.test.tsx` (mở warm link từ Home và mở warm link khi đang ở màn join) và unit tests trong `joinLinks.test.ts`.
- **Review Round 5 Item 4 ([P2] Phục hồi bản đồ live khi đổi quán sau khi quán trước bị lỗi ảnh)**:
  - Trong `LiveResultMapView.tsx`: thay thế cờ boolean lỗi dính cố định bằng biến trạng thái `failedUrl: string | null`. Lỗi ảnh chỉ kích hoạt khi `failedUrl === staticMapUrl`.
  - Khi người dùng chuyển sang Quán B, `staticMapUrl` thay đổi tương ứng với tọa độ và marker của Quán B (`failedUrl !== staticMapUrl`), thông báo lỗi tự động biến mất và app lập tức tải lại bản đồ của Quán B.
  - Bổ sung test regression trong `liveDishResultScreen.test.tsx`: Quán A bị lỗi ảnh tile -> hiển thị thông báo chưa khả dụng -> bấm chọn Quán B -> thông báo biến mất và ảnh bản đồ Quán B được tải.
- **Review Round 4 Item 1 & 2 ([P2] Guard userinfo & tiêu thụ URL khởi động đúng một lần ở cấp phiên app)**:
  - `consumeInitialUrl()` trong `joinLinks.ts` quản lý cờ `appLaunchUrlConsumed` ở cấp app session, đảm bảo `Linking.getInitialURL()` chỉ được truy vấn đúng 1 lần duy nhất trong toàn bộ vòng đời ứng dụng.
  - Re-entry từ app với params rỗng không bị điền lại mã khởi động cũ.
- **Review Round 4 Item 3 ([P1] Tách biệt bản đồ live thật `LiveResultMapView` và sơ đồ QA `DefaultResultMapView`)**:
  - `LiveResultMapView.tsx`: sử dụng Google Static Maps với API key và tọa độ thật. Khi thiếu key hoặc lỗi ảnh, hiển thị thông báo bản đồ chưa khả dụng mà không làm mất nút mở Google Maps ngoài hay bục Top 3.
- **Review Round 3 Deliverables**:
  - Deep link hoạt động từ QR & nút sao chép; web redirect routes (`/join/[code]`, `/join`); allowlist domain và scheme ngoài; guard các cờ QA `Boolean(__DEV__)` trong bản release.

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 69/69** | `mobile/tests/unit/joinLinks.test.ts` (35 tests), `mobile/tests/unit/externalLinks.test.ts` (17 tests), `mobile/tests/unit/placesRepository.test.ts` (17 tests). Bao gồm: từ chối userinfo trong custom scheme, kiểm tra authority allowlist, consumeInitialUrl chỉ tiêu thụ 1 lần ở cấp phiên app, thiếu key Places trả unsupported không tự bật mô phỏng, nhận diện suspicious params (`%74oken`), race condition cold link đến sau warm link, guardJoinRoomUrl & redirectSystemPath interceptors, hủy callback sau unsubscribe, chuẩn QR matrix roundtrip decode. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: bao phủ toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). |
| Full GM-30 batch (10 suites) | **Pass: 174/174 tests** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx`. 100% pass với 0 errors. |
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
# Run full GM-30 suite batch (174 tests across 10 suites)
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
