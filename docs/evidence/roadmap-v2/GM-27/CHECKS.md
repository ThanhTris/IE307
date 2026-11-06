# Output checks — GM-27 / roadmap-v2

## Current local verification — 2026-11-06

Tested source: working branch `issue88_task_gm27` / `issue88_figma_ui_gm27` based on `origin/main` (`bb2103a`, including GM-26 PR #156).
Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

- Integrates canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) via `LiveResultRepository.getResult(roomId)` and RPC `dish_session('result', { contractVersion, roomId })`.
- Server-persisted scores, ranks, and dish order are strictly preserved; client-side score recalculation, re-sorting, and tie-breaking overrides are prohibited.
- Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3) matching Figma node `617:1671`.
- Enforces strict contract validation: rejects payloads with missing mandatory fields, scores exceeding $2 \times \text{round1BallotCount}$, invalid status/reasonCode pairings (`DECIDED` + R1 $\to$ `UNANIMOUS_WANT`, `DECIDED` + R2 $\to$ `ACCEPTABLE_FINAL`, `NO_CONSENSUS` + R1 $\to$ `EMPTY_INTERSECTION`, `NO_CONSENSUS` + R2 $\to$ `ALL_REMOVED`), missing or unsupported versions (`unsupported-v99`), missing `roundDishId`, or `NO_CONSENSUS` with non-empty winner/podium. Returns `MALFORMED_RESPONSE`.
- Price metadata truthfulness: when `sourceRef` and `source` are missing, client sets `priceReference = null` (no fake `'Menu'`).
- Bounded polling backoff: `readState === 'finalizing'` / `NOT_READY` polls with exponential backoff up to 10 attempts before gracefully falling back to error state with retry button. Active timers are cleanly cancelled on component unmount and room switch.
- Cache invalidation and partition: in-memory cache is partitioned by `${identity}:${roomId}:${contractVersion}` and is immediately invalidated upon authorization/session failure (`NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`). Request generation counters prevent late in-flight responses from re-populating invalidated cache.
- Context switching hygiene: immediately resets screen state upon `roomId` change (`isRoomChanged`), and `DishResultEntry` uses `key={roomId}` to prevent room data leaks.
- Places error recovery: `fetchNearbyPlaces` errors transition to an error card with retry button without infinite spinner or winner disruption. External actions return `{ ok: false }` pending GM-30.

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-27 unit suite | **Pass: 38/38** | `mobile/tests/unit/resultRepository.test.ts`: RPC dispatch, partitioned caching, invalidation on auth loss, late response protection, error codes, tie mapping, NO_CONSENSUS R1/R2, legacy mapping, score ceiling, version validation, roundDishId requirement, price metadata truthfulness, and Places isolation. |
| Focused GM-27 component suite | **Pass: 13/13** | `mobile/tests/component/liveDishResultScreen.test.tsx`: Top 3 podium rendering, ties, EMPTY_INTERSECTION, ALL_REMOVED, error retry, Places error tolerance and retry recovery, bounded NOT_READY polling, timer teardown, room switch context reset, and DishResultEntry real/mock modes. |
| Full result feature regression | **Pass: 106 tests** | `npm --prefix mobile test -- tests/unit/result* tests/component/*result* tests/component/dishResult*`: all existing result presentation, podium, celebration, and nearby tests pass without regressions. |
| Strict TypeScript check | **Pass: 0 errors** | `npm --prefix mobile run typecheck` (`tsc --noEmit`). |
| ESLint on modified files | **Pass: 0 errors / 0 warnings** | `npx eslint` in `mobile/` across repository, screens, entry point, routes, and tests. |
| Architecture boundary guard | **Pass** | `npm --prefix mobile run check:architecture` (`node scripts/check-architecture.mjs`). |
| Task docs index consistency | **Pass** | `python scripts/task_readiness.py --check-docs`. |
| Git whitespace & diff hygiene | **Pass** | Clean diff, no trailing spaces or conflict markers. |
| Physical Android device verification | **Not run** | `adb devices -l` empty; visual parity requires physical device or emulator screenshot validation by Trí. |
| Remote backend staging verification | **Not run** | Live remote Supabase instance test awaits reviewer staging acceptance. |

---

## Reproduce

From `mobile/`:

```powershell
# Focused GM-27 test execution
npm test -- tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx

# Full result feature regression
npm test -- tests/unit/result* tests/component/*result*
npm test -- tests/component/dishResult*

# Static analysis and architecture verification
npm run typecheck
npx eslint src/features/result/services/resultRepository.ts src/features/result/screens/LiveDishResultScreen.tsx src/bootstrap/DishResultEntry.tsx tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx
npm run check:architecture
```

From the repository root:

```powershell
python scripts/task_readiness.py --check-docs
```

---

## Detailed Test Matrix and Verification

### 1. Repository RPC & Contract Validation (`resultRepository.test.ts`)

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
| REP-25 | Snapshot members mapping | Maps unique members with fallback labels for companions. | **Pass** |
| REP-26 | Invalid roomId guard | Rejects invalid roomId with `INVALID_INPUT`. | **Pass** |
| REP-27 | Live RPC result dispatch | Fetches canonical scored-v4 result via RPC caller. | **Pass** |
| REP-28 | In-memory result caching | Consecutive calls with identical `roomId` hit cache; RPC is called exactly once. | **Pass** |
| REP-29 | Cache invalidation on permission loss | Invalidates cache on `NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`. | **Pass** |
| REP-30 | Cache partitioned by identity | Supports partitioned caching by user identity and explicit cache clearing. | **Pass** |
| REP-31 | Late response protection | Late response arriving after room cache invalidation does not re-populate cache. | **Pass** |
| REP-32 | RPC NOT_READY handling | `RESULT_NOT_READY` maps gracefully to `NOT_READY` (409). | **Pass** |
| REP-33 | Server error code mapping | Maps server error codes faithfully. | **Pass** |
| REP-34 | Malformed response guard | Rejects malformed server responses with `MALFORMED_RESPONSE`. | **Pass** |
| REP-35 | Legacy unscored backward compatibility | `legacy-unscored-v1` payloads safely map to capability `unscored-v1` with score/rank hidden. | **Pass** |
| REP-36 | Places error isolation | Places fetcher failure does NOT alter or wipe out canonical result. | **Pass** |
| REP-37 | Mock repository default result | Returns default mock scored result. | **Pass** |
| REP-38 | Mock repository state simulation | Correctly simulates finalizing and error readStates. | **Pass** |

### 2. Live Dish Result Screen & Entry Integration (`liveDishResultScreen.test.tsx`)

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
| SCR-12 | DishResultEntry real mode with roomId | Renders `LiveDishResultScreen` in real mode when roomId is provided. | **Pass** |
| SCR-13 | DishResultEntry real mode missing roomId | Renders fallback `StatusNotice` in real mode when roomId is missing. | **Pass** |

---

## Limits and Environmental Disclosures

1. **Physical Android Device Acceptance**:
   - Automated testing confirms repository logic, RPC contract v4 validation, and component rendering across all states.
   - Physical device verification with TalkBack accessibility, font scaling at 200%, and multi-resolution layout is marked **Not run** pending device lab validation.
2. **Remote Supabase Staging**:
   - Validated against synthetic responses matching the canonical GM-20/21 `result_projection` schema.
   - Remote live staging execution is marked **Not run** pending reviewer staging credentials.
3. **Places Service Scope**:
   - Google Places API calls are isolated to the mobile client layer. Live Places API keys, permissions, and quota management are bounded by GM-30/GM-33 integration.
