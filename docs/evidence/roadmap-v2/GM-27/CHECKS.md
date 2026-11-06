# Output checks — GM-27 / roadmap-v2

## Current local verification — 2026-11-06

Tested source: working branch `issue88_task_gm27` based on `origin/main` (`bb2103a`, including GM-26 PR #156).
Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`).
Track: `INTEGRATION`, Stage: `integration`.

- Integrates canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) via `LiveResultRepository.getResult(roomId)` and RPC `dish_session('result', { contractVersion, roomId })`.
- Server-persisted scores, ranks, and dish order are strictly preserved; client-side score recalculation, re-sorting, and tie-breaking overrides are prohibited.
- Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3) matching Figma node `617:1671`.
- Enforces strict contract validation: rejects payloads with missing mandatory fields, scores exceeding $2 \times \text{round1BallotCount}$, or invalid status/reasonCode pairings (`DECIDED` + R1 $\to$ `UNANIMOUS_WANT`, `DECIDED` + R2 $\to$ `ACCEPTABLE_FINAL`, `NO_CONSENSUS` + R1 $\to$ `EMPTY_INTERSECTION`, `NO_CONSENSUS` + R2 $\to$ `ALL_REMOVED`). Returns `MALFORMED_RESPONSE`.
- Fully supports `NO_CONSENSUS` terminal outcomes (`EMPTY_INTERSECTION` for Round 1, `ALL_REMOVED` for Round 2) mapping to the No Consensus flow.
- Safely handles `legacy-unscored-v1` backward compatibility: hides missing score and rank badges without runtime crashes.
- Places isolation: `fetchNearbyPlaces` is initiated only for the canonical winner; any location permission denial, network failure, or provider error is strictly isolated and NEVER alters or wipes out the winner or podium.
- Terminal result caching: terminal `DECIDED` and `NO_CONSENSUS` results are cached in memory per `roomId`, preventing redundant wire calls and UI flicker across component re-renders.

| Check on the local implementation | Result | Evidence / Limit |
| --- | --- | --- |
| Focused GM-27 unit suite | **Pass: 23/23** | `mobile/tests/unit/resultRepository.test.ts`: RPC dispatch, caching, error codes, tie mapping, NO_CONSENSUS R1/R2, legacy mapping, score ceiling, and Places isolation. |
| Focused GM-27 component suite | **Pass: 7/7** | `mobile/tests/component/liveDishResultScreen.test.tsx`: Top 3 podium rendering, ties, EMPTY_INTERSECTION, ALL_REMOVED, error retry, Places error tolerance, and DishResultEntry real/mock modes. |
| Full result feature regression | **Pass: 12 suites / 145 tests** | `npm test -- tests/unit/result* tests/component/*result*`: all existing result presentation, podium, celebration, and nearby tests pass without regressions. |
| Strict TypeScript check | **Pass: 0 errors** | `npm run typecheck` (`tsc --noEmit`). |
| ESLint on modified files | **Pass: 0 errors / 0 warnings** | `npx eslint` across repository, screens, entry point, routes, and tests. |
| Architecture boundary guard | **Pass** | `npm run check:architecture` (`node scripts/check-architecture.mjs`). |
| Repository validation | **Pass** | `python scripts/validate_repository.py`. |
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

# Static analysis and architecture verification
npm run typecheck
npx eslint src/features/result/services/resultRepository.ts src/features/result/screens/LiveDishResultScreen.tsx src/bootstrap/DishResultEntry.tsx src/app/room/result.tsx src/app/room/no-consensus.tsx src/features/result/index.ts tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx
npm run check:architecture
```

From the repository root:

```powershell
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
```

---

## Detailed Test Matrix and Verification

### 1. Repository RPC & Contract Validation (`resultRepository.test.ts`)

| Case ID | Scenario / Contract Rule | Expected Behavior | Result |
| --- | --- | --- | --- |
| REP-01 | Terminal `DECIDED` result dispatch | Calls `dish_session('result', { contractVersion, roomId })`, returns normalized `ScoredResult` with winner and top 3. | **Pass** |
| REP-02 | In-memory result caching | Consecutive calls with identical `roomId` hit cache; RPC is called exactly once. | **Pass** |
| REP-03 | Terminal result cache bypass on error | Error responses are not cached; subsequent calls retry the network request. | **Pass** |
| REP-04 | RPC error mapping | `RESULT_NOT_READY` maps to `NOT_READY` (409); unexpected RPC errors map to `SERVER_ERROR`. | **Pass** |
| REP-05 | Client-side score recalculation prohibition | Server-provided scores and ranks are preserved verbatim without sorting or re-scoring. | **Pass** |
| REP-06 | Dense rank tie preservation | Dishes with equal scores retain identical dense ranks (e.g. rank 1, rank 1, rank 2). | **Pass** |
| REP-07 | Status / reason pairing: `DECIDED` + R1 | Must have reasonCode `UNANIMOUS_WANT`; any other reasonCode is rejected as `MALFORMED_RESPONSE`. | **Pass** |
| REP-08 | Status / reason pairing: `DECIDED` + R2 | Must have reasonCode `ACCEPTABLE_FINAL`; any other reasonCode is rejected as `MALFORMED_RESPONSE`. | **Pass** |
| REP-09 | Status / reason pairing: `NO_CONSENSUS` + R1 | Must have reasonCode `EMPTY_INTERSECTION`; returns empty topDishes and null winner. | **Pass** |
| REP-10 | Status / reason pairing: `NO_CONSENSUS` + R2 | Must have reasonCode `ALL_REMOVED`; returns empty topDishes and null winner. | **Pass** |
| REP-11 | Score upper bound guard | Rejects payload when dish score exceeds $2 \times \text{round1BallotCount}$ with `MALFORMED_RESPONSE`. | **Pass** |
| REP-12 | Negative / invalid score guard | Rejects non-numeric, negative, or invalid rank values with `MALFORMED_RESPONSE`. | **Pass** |
| REP-13 | Missing mandatory fields | Rejects payload missing `resultId`, `finalizedAt`, or invalid round numbers. | **Pass** |
| REP-14 | Legacy unscored backward compatibility | `legacy-unscored-v1` payloads safely map to capability `unscored-v1` with score/rank hidden. | **Pass** |
| REP-15 | Places isolation: location permission denial | `fetchNearbyPlaces` returns `ok: false, status: 'permission_denied'`; winner data is untouched. | **Pass** |
| REP-16 | Places isolation: network / quota failure | `fetchNearbyPlaces` returns `ok: false, status: 'error'`; winner data is untouched. | **Pass** |
| REP-17 | Places isolation: successful fetch | Returns nearby places list matching winner dish keywords without modifying session state. | **Pass** |
| REP-18 | Mock repository read states | Mock repository correctly returns `ready`, `loading`, `finalizing`, and `error` states. | **Pass** |

### 2. Live Dish Result Screen & Entry Integration (`liveDishResultScreen.test.tsx`)

| Case ID | Scenario / Component State | Expected Behavior | Result |
| --- | --- | --- | --- |
| SCR-01 | `DECIDED` result with Top 3 podium | Renders winner celebration header, podium cards with scores (Figma `330:3075`), and action buttons. | **Pass** |
| SCR-02 | Dense rank ties presentation | Multiple dishes with equal rank display identical rank badge (Figma `617:1671`). | **Pass** |
| SCR-03 | `NO_CONSENSUS` + `EMPTY_INTERSECTION` | Renders No Consensus screen for Round 1 empty intersection; no podium cards shown. | **Pass** |
| SCR-04 | `NO_CONSENSUS` + `ALL_REMOVED` | Renders No Consensus screen for Round 2 all removed; no podium cards shown. | **Pass** |
| SCR-05 | Error state & retry interaction | Displays error notice on failure; tapping "Thử lại" re-triggers repository result fetch. | **Pass** |
| SCR-06 | Places failure tolerance | Screen displays winner and podium successfully even when Places lookup fails or rejects. | **Pass** |
| SCR-07 | `DishResultEntry` wire routing | In `real` mode with `roomId`, renders `LiveDishResultScreen`; without `roomId`, renders fallback notice. In `mock` mode, renders mock flow. | **Pass** |

---

## Limits and Environmental Disclosures

1. **Physical Android Device Acceptance**:
   - Automated testing confirms 100% of the repository logic, RPC contract v4 validation, and component rendering.
   - Physical device verification with TalkBack accessibility, font scaling at 200%, and multi-resolution layout (320dp, 360dp, 412dp) is marked **Not run** pending device lab validation.
2. **Remote Supabase Staging**:
   - Validated against synthetic responses matching the canonical GM-20/21 `result_projection` schema.
   - Remote live staging execution is marked **Not run** pending reviewer staging credentials.
3. **Places Service Scope**:
   - Google Places API calls are isolated to the mobile client layer. Live Places API keys and quota management are bounded by GM-30/GM-33 integration.
