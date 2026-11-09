# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-09

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/main` (`8af20a9`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables & Review Fixes (2026-11-09)
- **Review Round 6 Item 1 ([P2] Giữ nguyên link Inbox và các màn khác có query param hợp lệ)**:
  - Bổ sung hàm nhận diện đường dẫn tham gia phòng `isRoomJoinUrlOrPath(rawUrl)` trong `joinLinks.ts`: phân định chính xác giữa các đường dẫn vào phòng (`/room/join`, `/join`, `/r/`, `gi-cung-duoc://room/join`, `exp://.../--/room/join`, `https://gicungduoc.vn/join`) và các đường dẫn màn khác (`/inbox`, `/friends`, `/history`, v.v.).
  - Cập nhật `guardJoinRoomUrl`: chỉ áp đặt luật allowlist query nghiêm ngặt của luồng vào phòng đối với các URL/path tham gia phòng. Các URL màn khác (như `exp://127.0.0.1:8081/--/inbox?returnTo=history` hoặc `gi-cung-duoc:///inbox?returnTo=history`) được giữ nguyên hoàn toàn, không bị biến đổi sang `/room/join?error=SUSPICIOUS_PAYLOAD`.
  - Bổ sung unit tests trong `joinLinks.test.ts` và integration test trong `joinEntryRoute.test.tsx` (`redirectSystemPath preserves Inbox deep links with returnTo query without routing to room join`).
- **Review Round 6 Item 2 (Cập nhật `check:architecture` nhận diện file `app/+native-intent.ts`)**:
  - `mobile/scripts/check-architecture.mjs` được cập nhật để nhận diện file quy ước đặc thù `app/+native-intent.ts` của Expo Router, kiểm tra file này có named export `redirectSystemPath`, đồng thời vẫn duy trì bắt buộc `export default` cho tất cả các file route thông thường khác trong `app/`.
  - Chạy `npm run check:architecture`: đạt `Architecture boundaries OK` (Exit code 0).
- **Review Round 5 Fixes (2026-11-08)**:
  - Rebase sạch nhánh làm việc lên commit mới nhất của `origin/main` (`8af20a9`), giữ trọn vẹn cả `RoomInvitePicker` (GM-28) lẫn `RoomQrModal` và sao chép liên kết vào clipboard (GM-30) trong `LiveLobbyScreen.tsx`.
  - Phân biệt nguồn link `JoinLinkSource = 'cold' | 'warm'`, ưu tiên mã điều hướng hợp lệ (`rawParamCode`) không bị late cold launch URL ghi đè.
  - Chặn rò rỉ userinfo credentials (`@`) thông qua native intent interceptor `mobile/src/app/+native-intent.ts` (`redirectSystemPath`) và `installGlobalJoinLinkGuard()`.
  - Phục hồi bản đồ live khi đổi quán sau khi quán trước bị lỗi ảnh bằng cách gắn vết lỗi với `failedUrl === staticMapUrl` trong `LiveResultMapView.tsx`.
- **Review Round 4 & 3 Deliverables**:
  - `consumeInitialUrl()` tiêu thụ URL khởi động đúng 1 lần ở cấp phiên app; phân định rõ bản đồ live thật `LiveResultMapView` (Google Static Maps) và sơ đồ QA `DefaultResultMapView`; deep link hoạt động từ QR & nút sao chép; web redirect routes (`/join/[code]`, `/join`); allowlist domain và scheme ngoài; guard các cờ QA `Boolean(__DEV__)` trong bản release.

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 71/71** | `mobile/tests/unit/joinLinks.test.ts` (37 tests), `mobile/tests/unit/externalLinks.test.ts` (17 tests), `mobile/tests/unit/placesRepository.test.ts` (17 tests). Bao gồm: từ chối userinfo trong custom scheme, kiểm tra authority allowlist, consumeInitialUrl chỉ tiêu thụ 1 lần ở cấp phiên app, thiếu key Places trả unsupported không tự bật mô phỏng, nhận diện suspicious params (`%74oken`), race condition cold link đến sau warm link, guardJoinRoomUrl & redirectSystemPath interceptors (bảo toàn link Inbox có `returnTo`), isRoomJoinUrlOrPath phân định route vào phòng, hủy callback sau unsubscribe, chuẩn QR matrix roundtrip decode. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: bao phủ toàn bộ 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). |
| Full GM-30 batch (10 suites) | **Pass: 177/177 tests** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx`. 100% pass với 0 errors. |
| Architecture Guard | **Pass: 0 errors** | `npm --prefix mobile run check:architecture` (`node scripts/check-architecture.mjs`). Nhận diện file native intent `app/+native-intent.ts` có named export `redirectSystemPath`, kiểm soát nghiêm ngặt `export default` cho các routes thông thường. |
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
# Run full GM-30 suite batch (177 tests across 10 suites)
npx jest tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/joinRoomEntry.test.tsx tests/component/liveDishResultScreen.test.tsx tests/component/dishResultEntry.test.tsx tests/component/gm30FigmaParity.test.tsx tests/component/lobbyAndStatusScreens.test.tsx tests/component/gm27ReviewRegression.test.tsx tests/integration/joinEntryRoute.test.tsx

# Run architecture boundary guard
npm run check:architecture

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
