# Output checks — GM-30 / roadmap-v2

## Current local verification — 2026-11-07

Tested source: working branch `issue91_figma_ui_gm30` rebased on `origin/issue88_figma_ui_gm27` / `origin/main` (`50c4447`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trí (`ThanhTris`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

### Key Technical Deliverables
- **Join Links & QR Matrix (`joinLinks.ts`)**:
  - Deterministic 25×25 QR bit matrix generation for room join URLs without adding native/heavy external dependencies.
  - Deep link (`gi-cung-duoc://room/join?code=...`) & Web link (`https://gicungduoc.vn/join/...`) generator and parser with strict allowlist.
  - URL allowlist guard: schemes strictly constrained to `gi-cung-duoc:`, `exp:`, `https:`; domains strictly constrained to `gicungduoc.vn`, `*.gicungduoc.vn`.
  - Rejection of tokens, credentials, and secret query parameters.
  - Subscription adapter for both warm-start and cold-start join URLs via `Linking`.
  - `SimulatedQrScannerAdapter` and `NativeQrScannerAdapter` adhering to Chặng 3A AVD testing standards (with CAMERA blocked in `app.config.ts` fallback).
- **External Links & Allowlist (`externalLinks.ts`)**:
  - Scheme validation (`https:`, `geo:`).
  - Domain allowlist for Google Maps (`maps.google.com`, `www.google.com/maps`, `google.com/maps`), TikTok search (`tiktok.com`, `www.tiktok.com`), YouTube search (`youtube.com`, `www.youtube.com`, `m.youtube.com`).
  - Google Maps Place / Search URL builders, Geo URI builder (`geo:lat,lng?q=...`), TikTok search builder, YouTube search builder.
  - `openExternalAction` verifying allowed URLs before delegating to `Linking.openURL`, stripping raw credentials/secret parameters.
- **Places Repository & Google Places Client (`placesRepository.ts`)**:
  - `LivePlacesRepository`: integrates Google Places API (New) `places:searchText` endpoint with FieldMask (`places.id`, `places.displayName`, `places.formattedAddress`, `places.location`, `places.rating`, `places.priceLevel`).
  - Dev/Simulated AVD mode with clearly labeled venues (`[Simulated AVD] ...`) and mock location adapter so AVD tests can run without incurring Google API billing fees.
  - Distance calculation using Haversine formula (`calculateDistanceM`) from `geoAndTimeMath`.
  - Monotonic epoch guard: late in-flight Places requests for Room A are immediately aborted and rejected if room or result context switches to Room B.
  - Absolute Winner Isolation: Places loading, location permission rejection, offline status, or network failure NEVER alters, rerolls, or removes the decided winner or Top 3 podium.
- **UI Screen & Modal Parity**:
  - `RoomQrModal.tsx` (Figma Node `368:12182`): SVG-rendered QR matrix, room code badge, clipboard link copy with feedback, and accessible dialog dismissal.
  - `JoinRoomEntryScreen.tsx` (Figma Nodes `268:2019`, `275:2088`, `268:2081`): Camera scanning viewfinder, Camera Denied banner with "Mở Cài đặt" and "Nhập mã bằng tay", and confirmation card displaying scanned room code and member preview.
  - `LiveLobbyScreen.tsx`: Added "Mở mã QR phòng" button triggering `RoomQrModal`.
  - `LiveDishResultScreen.tsx` (Figma Nodes `622:8962`, `206:913`, `379:1478`): Places integration with `requestLocationPermission`, `openLocationSettings`, allowlisted external link dispatching, and robust error recovery.

---

## Output Verification Table

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-30 unit suite | **Pass: 50/50** | `mobile/tests/unit/joinLinks.test.ts` (18 tests), `mobile/tests/unit/externalLinks.test.ts` (18 tests), `mobile/tests/unit/placesRepository.test.ts` (14 tests). Covers URL allowlist, deep linking, query secret stripping, QR matrix determinism, Google Places client request formatting, field masking, distance calculation, labeled simulated venues, permission handling, and monotonic epoch cancellation. |
| Focused GM-30 component suite | **Pass: 8/8** | `mobile/tests/component/gm30FigmaParity.test.tsx`: covers all 7 Figma nodes (`268:2019`, `275:2088`, `268:2081`, `368:12182`, `622:8962`, `206:913`, `379:1478`). Modal rendering, camera scanning mode, camera denied handling, QR scan-to-confirm, location permission prompt, nearby places cards, external action buttons, and absolute winner isolation. |
| Full GM-30 regression | **Pass: 58 tests (4 suites)** | `npm --prefix mobile test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/gm30FigmaParity.test.tsx`. All pass with 0 errors. |
| Strict TypeScript check | **Pass: 0 errors** | `npm --prefix mobile run typecheck` (`tsc --noEmit`). |
| ESLint check | **Pass: 0 errors / 0 warnings** | `npm --prefix mobile run lint` (`eslint .`). |
| Repository validation | **Pass** | `python scripts/validate_repository.py`. |
| Task docs consistency | **Pass** | `python scripts/task_readiness.py --check-docs`. |
| Chặng 3A — Máy ảo Android (AVD) + Backend QA local | **Pass (Code & AVD simulated adapter verified)** | Chặng 3A nghiệm thu trên AVD Pixel 8 (API 34) nối backend QA local qua `SimulatedQrScannerAdapter` và Dev Simulated Places Adapter có gắn nhãn rõ ràng (`[Simulated AVD] ...`). Đảm bảo không phụ thuộc phần cứng camera vật lý hay Google billing key theo quy định Chặng 3A. Reviewer: **Not run bởi reviewer** trong lượt này. |
| Hoãn sang Chặng 3B: Camera vật lý & Google billing key | **Deferred to Stage 3B** | Camera QR vật lý trên điện thoại thật cắm cáp USB và Google Places production billing key được hoãn sang Chặng 3B (`GM-33`/`GM-34`) sau khi hoàn tất toàn bộ UI-API tasks. |

---

## Reproduce

From `mobile/`:

```powershell
# Run all GM-30 unit and component tests (58 tests)
npm test -- tests/unit/joinLinks.test.ts tests/unit/externalLinks.test.ts tests/unit/placesRepository.test.ts tests/component/gm30FigmaParity.test.tsx

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
