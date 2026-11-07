# Output checks — GM-27 / roadmap-v2

## Current local verification — 2026-11-07

Tested source: working branch `issue88_figma_ui_gm27` rebased/merged with `origin/main` (`50c4447`).
Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

- Integrates canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) via `LiveResultRepository.getResult(roomId)` and RPC `dish_session('result', { contractVersion, roomId })`.
- Server-persisted scores, ranks, and dish order are strictly preserved; client-side score recalculation, re-sorting, and tie-breaking overrides are prohibited.
- Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3) matching Figma node `617:1671`.
- Raw wire schema validation: strictly enforces existence of all 4 required wire keys (`winner`, `topDishes`, `scoreVersion`, `rankingVersion`) per `$defs.terminalResult.required`. Rejects payloads with missing fields, scores exceeding $2 \times \text{round1BallotCount}$, invalid status/reasonCode pairings, missing or unsupported versions (`unsupported-v99`), missing `roundDishId`, or `NO_CONSENSUS` with non-null versions or non-empty winner/podium. Returns `MALFORMED_RESPONSE`.
- Price metadata truthfulness: when `sourceRef` and `source` are missing, client sets `priceReference = null` (no fake `'Menu'`).
- Bounded polling backoff: `readState === 'finalizing'` / `NOT_READY` polls with exponential backoff up to 10 attempts before gracefully falling back to error state with retry button. Active timers are cleanly cancelled on component unmount and room switch.
- Monotonic epoch guard & partitioned cache: in-memory cache is partitioned by `${identity}:${roomId}:${contractVersion}` and is immediately cleared on session logout/change or authorization loss (`NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`). Monotonic global and room epoch counters prevent late in-flight responses from re-populating invalidated cache or returning stale results to the UI.
- Dual HTTP error path: unified error policy invalidating cache on both RPC `{ ok: false, error: 401/403 }` envelope and transport throws `{ status: 401/403 }`. Transient network errors (`NETWORK_ERROR`, `TIMEOUT`) preserve cached winners safely.
- Default composition wiring: `LiveDishResultScreen` and `DishResultEntry` automatically resolve user identity from `useRoomRepository` without requiring test prop injection. `DishResultEntry` uses `key={`${identity}:${roomId}:${resultId ?? ''}`}` to guarantee clean remounts.
- Context switching hygiene & GM-28 navigation: accepts optional `resultId?: string`; validates returned projection matches `expectedResultId` (safely erroring if mismatched) so GM-28 can navigate seamlessly from inbox/history without route conflicts.
- Places error recovery: `fetchNearbyPlaces` errors transition to an error card with retry button without infinite spinner or winner disruption. External actions return `{ ok: false }` pending GM-30.

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-27 unit suite | **Pass: 51/51** | `mobile/tests/unit/resultRepository.test.ts`: RPC dispatch, partitioned caching, dual error path for 401/403, monotonic epoch guard, late response protection, raw wire schema validation (required `description`, `mealSlots`, `artwork`, mealSlots array guard), canonical spoofing rejection (MALFORMED_RESPONSE without legacy fallback), HTTP 409 RESULT_NOT_READY normalization to NOT_READY, preservation of genuine VERSION_CONFLICT, NO_CONSENSUS R1/R2, legacy mapping, score ceiling, version validation, roundDishId requirement, price metadata truthfulness, and Places isolation. |
| Focused GM-27 component suite | **Pass: 20/20** | `mobile/tests/component/liveDishResultScreen.test.tsx`: Top 3 podium rendering, ties, EMPTY_INTERSECTION, ALL_REMOVED, error retry, Places error tolerance and retry recovery, bounded NOT_READY polling, FetchTransport HTTP 409 RESULT_NOT_READY polling recovery, screen-owned session listener disposal on unmount, preservation of external customRepository, timer teardown, room switch context reset, resultId match/mismatch (GM-28 navigation), default composition wiring, and DishResultEntry real/mock modes. |
| Full result feature regression | **Pass: 116 tests (7 suites)** | `npm --prefix mobile test -- tests/unit/result* tests/component/*result* tests/component/dishResult*`: all existing result presentation, podium, celebration, recovery, and nearby tests pass without regressions. |
| Strict TypeScript check | **Pass: 0 errors** | `npm --prefix mobile run typecheck` (`tsc --noEmit`). |
| ESLint on modified files | **Pass: 0 errors / 0 warnings** | `npx eslint` in `mobile/` across repository, screens, entry point, routes, and tests. |
| Architecture boundary guard | **Pass** | `npm --prefix mobile run check:architecture` (`node scripts/check-architecture.mjs`). |
| Chặng 3A — Máy ảo Android (AVD) + Backend QA local | **Pass (Code & AVD artifacts verified)** | Chạy thực tế trên AVD Pixel 8 (API 34) nối backend Supabase local (`npx supabase start`). Hiển thị chính xác bục vinh danh `DECIDED` Top 3 + đồng hạng dense rank (Figma `330:3075`, `617:1671`), cả 2 trạng thái `NO_CONSENSUS` (`EMPTY_INTERSECTION` & `ALL_REMOVED`), cô lập lỗi Places kèm nút thử lại không treo spinner (Figma `379:1478`), bố cục chuẩn xác tại viewport `412dp`, `360dp`, và chữ phóng to `200%`. Reviewer giữ trạng thái **Not run bởi reviewer** trong lượt này. |
| Task docs index consistency | **Pass** | `python scripts/task_readiness.py --check-docs`. |
| Git whitespace & diff hygiene | **Pass** | Clean diff, no trailing spaces or conflict markers. |
| Hoãn sang Chặng 3B: USB device & Places billing | **Deferred to Stage 3B** | Kiểm thử trên điện thoại Android thật cắm cáp USB chuyển sang `GM-33`/`GM-34`; Places API billing key thật chuyển sang `GM-30`. |

---

## Reproduce

From `mobile/`:

```powershell
# Focused GM-27 test execution (71 tests)
npm test -- tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx

# Full result feature regression (116 tests)
npm test -- tests/unit/result* tests/component/*result* tests/component/dishResult*

# Static analysis and architecture verification
npm run typecheck
npx eslint src/features/result/services/resultRepository.ts src/features/result/screens/LiveDishResultScreen.tsx src/bootstrap/DishResultEntry.tsx src/app/room/result.tsx src/app/room/no-consensus.tsx tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx
npm run check:architecture
```

From the repository root:

```powershell
python scripts/task_readiness.py --check-docs
```

---

## Detailed Test Matrix and Verification

### 1. Repository RPC & Contract Validation (`resultRepository.test.ts` — 44 tests)

| Case ID | Scenario / Contract Rule | Expected Behavior | Result |
| --- | --- | --- | --- |
| REP-01 | Dish mapping: valid projection | Maps valid projection to `ResultDish`. | **Pass** |
| REP-02 | Dish mapping: missing `roundDishId` | Strictly rejects dish missing `roundDishId`; does not fallback to `dishId`. | **Pass** |
| REP-03 | Dish mapping: missing price source | Sets `priceReference = null` when `sourceRef` and `source` are absent (no fake "Menu"). | **Pass** |
| REP-04 | Dish mapping: invalid price amount | Sets `priceReference = null` when amount is null or non-positive. | **Pass** |
| REP-05 | Dish mapping: invalid price timestamp | Sets `priceReference = null` when checkedAt timestamp is invalid. | **Pass** |
| REP-06 | Dish mapping: missing mandatory identifiers | Rejects dish missing `dishId`, `roundDishId`, or `name`. | **Pass** |
| REP-07 | Dish mapping: fallback artwork & observedAt | Handles fallback artwork URL and observedAt in priceReference correctly. | **Pass** |
| REP-08 | Terminal `DECIDED` result dispatch | Calls `dish_session('result', ...)`, returns normalized `ScoredResult` with winner and Top 3. | **Pass** |
| REP-09 | Dense rank tie preservation | Dishes with equal scores retain identical dense ranks (e.g. rank 1, rank 1, rank 2). | **Pass** |
| REP-10 | Status / reason pairing: `NO_CONSENSUS` + R1 | Must have reasonCode `EMPTY_INTERSECTION`; returns empty topDishes and null winner. | **Pass** |
| REP-11 | Status / reason pairing: `NO_CONSENSUS` + R2 | Must have reasonCode `ALL_REMOVED`; returns empty topDishes and null winner. | **Pass** |
| REP-12 | Score upper bound guard | Rejects payload when dish score exceeds $2 \times \text{round1BallotCount}$ with `MALFORMED_RESPONSE`. | **Pass** |
| REP-13 | Invalid dense ranking | Rejects non-dense ranking sequences with `MALFORMED_RESPONSE`. | **Pass** |
| REP-14 | Mismatched status and reasonCode | Rejects invalid combinations with `MALFORMED_RESPONSE`. | **Pass** |
| REP-15 | Status / reason pairing: `DECIDED` + R1 | Must have reasonCode `UNANIMOUS_WANT`; rejects `ACCEPTABLE_FINAL`. | **Pass** |
| REP-16 | Winner consistency guard | Rejects payload where winner dish does not match topDishes[0]. | **Pass** |
| REP-17 | Mandatory version: contractVersion | Rejects payload missing `contractVersion` with `MALFORMED_RESPONSE`. | **Pass** |
| REP-18 | Mandatory version: policyVersion | Rejects payload missing `policyVersion` with `MALFORMED_RESPONSE`. | **Pass** |
| REP-19 | Mandatory version: scoreVersion | Rejects payload missing `scoreVersion` with `MALFORMED_RESPONSE`. | **Pass** |
| REP-20 | Mandatory version: rankingVersion | Rejects payload missing `rankingVersion` with `MALFORMED_RESPONSE`. | **Pass** |
| REP-21 | Unsupported scoreVersion | Rejects payload with unsupported version like `unsupported-v99`. | **Pass** |
| REP-22 | Unsupported rankingVersion | Rejects payload with unsupported ranking version. | **Pass** |
| REP-23 | Missing roundDishId in podium | Rejects DECIDED payload where any podium dish lacks `roundDishId`. | **Pass** |
| REP-24 | NO_CONSENSUS with dishes | Rejects NO_CONSENSUS payload when winner or topDishes is non-empty. | **Pass** |
| REP-25 | Raw wire schema: 4 required keys | Rejects payload missing any of `'winner'`, `'topDishes'`, `'scoreVersion'`, or `'rankingVersion'` (`$defs.terminalResult.required`). | **Pass** |
| REP-26 | Raw wire schema: NO_CONSENSUS versions | Rejects NO_CONSENSUS payload when `scoreVersion` or `rankingVersion` is non-null. | **Pass** |
| REP-27 | Snapshot members mapping | Maps unique members with fallback labels for companions. | **Pass** |
| REP-28 | Invalid roomId guard | Rejects invalid roomId with `INVALID_INPUT`. | **Pass** |
| REP-29 | Live RPC result dispatch | Fetches canonical scored-v4 result via RPC caller. | **Pass** |
| REP-30 | In-memory result caching | Consecutive calls with identical `roomId` hit cache; RPC is called exactly once. | **Pass** |
| REP-31 | Cache invalidation on permission loss | Invalidates cache on `NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`. | **Pass** |
| REP-32 | Cache partitioned by identity | Supports partitioned caching by user identity and explicit cache clearing. | **Pass** |
| REP-33 | Late response protection | Late response arriving after room cache invalidation does not re-populate cache. | **Pass** |
| REP-34 | Monotonic epoch guard: clearCache | In-flight request aborted and cache blocked when `clearCache()` is called during flight. | **Pass** |
| REP-35 | Dual error path: 401/403 throw | RPC throwing `{ status: 401 | 403 }` invalidates room cache. | **Pass** |
| REP-36 | Dual error path: transient network error | Transient network error does not invalidate room cache, preserving valid winner. | **Pass** |
| REP-37 | Default identity resolution | Resolves identity from `roomRepository.getCurrentUser()` by default and clears cache on session switch. | **Pass** |
| REP-38 | RPC NOT_READY handling | `RESULT_NOT_READY` maps gracefully to `NOT_READY` (409). | **Pass** |
| REP-39 | Server error code mapping | Maps server error codes faithfully. | **Pass** |
| REP-40 | Malformed response guard | Rejects malformed server responses with `MALFORMED_RESPONSE`. | **Pass** |
| REP-41 | Legacy unscored backward compatibility | `legacy-unscored-v1` payloads safely map to capability `unscored-v1` with score/rank hidden. | **Pass** |
| REP-42 | Places error isolation | Places fetcher failure does NOT alter or wipe out canonical result. | **Pass** |
| REP-43 | Mock repository default result | Returns default mock scored result. | **Pass** |
| REP-44 | Mock repository state simulation | Correctly simulates finalizing and error readStates. | **Pass** |
| REP-45 | Raw wire poolDish: missing description | Rejects canonical payload when `winner.description` is missing with `MALFORMED_RESPONSE`. | **Pass** |
| REP-46 | Raw wire poolDish: missing mealSlots | Rejects canonical payload when `topDishes[i].dish.mealSlots` key is missing with `MALFORMED_RESPONSE`. | **Pass** |
| REP-47 | Raw wire poolDish: missing artwork | Rejects canonical payload when `winner.artwork` key is missing with `MALFORMED_RESPONSE`. | **Pass** |
| REP-48 | Raw wire poolDish: mealSlots = 123 | Rejects canonical payload when `mealSlots` is a non-array number with `MALFORMED_RESPONSE`. | **Pass** |
| REP-49 | Canonical spoofing rejection | Rejects canonical result missing `topDishes` with `MALFORMED_RESPONSE`, even when labeled `capability: 'legacy-unscored-v1'` (no illegal fallback). | **Pass** |
| REP-50 | HTTP 409 RESULT_NOT_READY normalization | Normalizes thrown HTTP 409 `RESULT_NOT_READY` / `NOT_READY` from `FetchTransport` to `{ messageKey: 'NOT_READY' }`. | **Pass** |
| REP-51 | Genuine HTTP 409 VERSION_CONFLICT preservation | Preserves genuine HTTP 409 `VERSION_CONFLICT` without converting to waiting. | **Pass** |

### 2. Live Dish Result Screen & Entry Integration (`liveDishResultScreen.test.tsx` — 20 tests)

| Case ID | Scenario / Component State | Expected Behavior | Result |
| --- | --- | --- | --- |
| SCR-01 | `DECIDED` result with Top 3 podium | Renders winner celebration header, podium cards with scores (Figma `330:3075`), and action buttons. | **Pass** |
| SCR-02 | `NO_CONSENSUS` + `EMPTY_INTERSECTION` | Renders No Consensus screen for Round 1 empty intersection; no podium cards shown. | **Pass** |
| SCR-03 | `NO_CONSENSUS` + `ALL_REMOVED` | Renders No Consensus screen for Round 2 all removed; no podium cards shown. | **Pass** |
| SCR-04 | Error state & retry interaction | Displays error notice on failure; tapping "Thử lại" re-triggers repository result fetch. | **Pass** |
| SCR-05 | Places failure tolerance | Screen displays winner and podium successfully even when Places lookup fails or rejects. | **Pass** |
| SCR-06 | Bounded NOT_READY polling | Polls `NOT_READY` with exponential backoff and transitions to `DECIDED` when server finalizes. | **Pass** |
| SCR-07 | NOT_READY poll timer cancellation | Cancels active poll timer upon component unmount without memory leaks. | **Pass** |
| SCR-08 | Room context switching hygiene | Immediately resets UI on `roomId` switch and does not leak room A winner into room B. | **Pass** |
| SCR-09 | Places error card and retry recovery | Initial Places failure shows error card with retry button; retry failure does not lock spinner. | **Pass** |
| SCR-10 | Dense rank ties presentation | Multiple dishes with equal rank display identical rank badge (Figma `617:1671`). | **Pass** |
| SCR-11 | External action fallback | External actions return `{ ok: false }` pending GM-30, displaying retry notice. | **Pass** |
| SCR-12 | GM-28 navigation: resultId match | Renders result when `resultId` matches server response. | **Pass** |
| SCR-13 | GM-28 navigation: resultId mismatch | Transitions safely to error notice when `resultId` does not match server response (no wrong dish shown). | **Pass** |
| SCR-14 | Default composition wiring | Uses user identity from `roomRepository` without requiring injected repository prop. | **Pass** |
| SCR-15 | DishResultEntry real mode with roomId | Renders `LiveDishResultScreen` in real mode when roomId is provided. | **Pass** |
| SCR-16 | DishResultEntry real mode missing roomId | Renders fallback `StatusNotice` in real mode when roomId is missing. | **Pass** |
| SCR-17 | DishResultEntry resultId forwarding | Forwards `resultId` prop to `LiveDishResultScreen` and includes in component key. | **Pass** |
| SCR-18 | Screen-owned listener disposal | Default screen factory repository cleans up `unsubscribeSession()` on unmount. | **Pass** |
| SCR-19 | Injected customRepository safety | Unmounting does NOT dispose an externally injected custom repository. | **Pass** |
| SCR-20 | HTTP 409 RESULT_NOT_READY polling recovery | Thrown HTTP 409 `RESULT_NOT_READY` enters polling backoff and resolves on next poll instead of showing error. | **Pass** |

---

## Limits and Environmental Disclosures

1. **Chặng 3A — Máy ảo Android (AVD) + Backend QA local**:
   - **Tested Revision**: Head commit `631a8b1` (branch `issue88_figma_ui_gm27`), đối chiếu base `origin/main` (`50c4447`).
   - **Môi trường máy ảo (AVD)**: Android Emulator Pixel 8, Google APIs system image API 34 (Android 14.0 x86_64).
   - **Viewports & Accessibility**:
     - Viewport tiêu chuẩn: `412 × 915 dp` (density 420dpi / xxmhdpi).
     - Viewport thiết bị nhỏ: `360 × 800 dp` (density 320dpi / xhdpi).
     - Font scaling: `100%`, `150%`, `200%` (không bị cắt chữ, các thẻ món tự động co giãn dòng và touch target luôn giữ $\ge 48\text{dp}$).
   - **Môi trường Backend QA local**:
     - Supabase Local (`npx supabase start`), PostgreSQL 15, GoTrue Auth.
     - Contract schema: `dish-session-v4/roadmap-v2/GM-07.B-supplement` (kèm fallback `dish-session-v4/roadmap-v2/GM-07.B`).
     - Policy engine: `dish-decision-v4/ADR-019-30PCT-MIN1` (ADR-019 30% cap min 1).
     - Roster & Catalogue: Catalogue 39 món draft GM-40, roster thử nghiệm 1–4 thành viên.
   - **Kịch bản đã xác minh (Scenarios)**:
     - `SCN-01 (Figma 330:3075)`: Vinh danh `DECIDED` Top 3 (Hạng 1 "Phở bò tái nạm", Hạng 2 "Cơm tấm sườn bì", Hạng 3 "Bún bò Huế"), avatar companions từ snapshot, modal ăn mừng bỏ qua được.
     - `SCN-02 (Figma 617:1671)`: Đồng hạng dense rank (2 món cùng 6 điểm hiển thị đồng hạng 1 trên cùng bậc bục, món kế tiếp nhận hạng 2).
     - `SCN-03 (Figma 379:1478)`: Cô lập lỗi Places (`fetchNearbyPlaces` lỗi quota/mạng/quyền vị trí chuyển sang thẻ lỗi kèm nút "Thử lại", không treo spinner và không làm thay đổi hay mất món thắng phía trên; simulated Places gắn nhãn `Mô phỏng · không phải Google Places`).
     - `SCN-04`: `NO_CONSENSUS` Vòng 1 (`EMPTY_INTERSECTION`, `reasonCode === 'EMPTY_INTERSECTION'`).
     - `SCN-05`: `NO_CONSENSUS` Vòng 2 (`ALL_REMOVED`, `reasonCode === 'ALL_REMOVED'`).
     - `SCN-06`: Polling `NOT_READY` / HTTP 409 `RESULT_NOT_READY` có backoff hữu hạn (tối đa 10 lần), tự động phục hồi khi có kết quả chốt, không báo lỗi sớm.
     - `SCN-07`: Giải phóng session listener khi unmount (`repository.dispose()` gọi `unsubscribeSession()`), không giữ rò rỉ bộ nhớ.
   - **Bảo mật & Che thông tin (Redaction)**:
     - Toàn bộ token, Authorization header, API key, vị trí GPS cá nhân và phiếu bầu thô của từng người dùng đều được che (`[REDACTED]`), giữ nguyên tính bảo mật phiếu theo quy chuẩn.
   - **Ghi chú Reviewer**: Reviewer giữ trạng thái **Not run bởi reviewer** đối với kiểm thử thiết bị thật trong lượt này.

2. **Chặng 3B — Hoãn sang task sau (Deferred Scope)**:
   - Kiểm thử trên thiết bị điện thoại Android vật lý cắm cáp USB chuyển sang Chặng 3B tại `GM-33`/`GM-34`.
   - Kết nối Google Places API với billing key thực tế chuyển sang `GM-30`.
