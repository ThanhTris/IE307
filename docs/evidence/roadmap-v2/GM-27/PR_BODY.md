## Task and behavior

GM-27 ([issue #88](https://github.com/ThanhTris/IE307/issues/88)), owner Trang, reviewer Tri. Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.

Connects the canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) to the mobile UI flow via `LiveResultRepository` and `LiveDishResultScreen`. Preserves server authority: persisted order, scores, and ranks are kept intact; client-side score recalculation and tie-break overrides are strictly prohibited.

Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3 podium mapping) matching Figma node `617:1671`. Fully supports `NO_CONSENSUS` terminal outcomes (`EMPTY_INTERSECTION` for Round 1, `ALL_REMOVED` for Round 2). Safely handles `legacy-unscored-v1` backward compatibility.

Places isolation: `fetchNearbyPlaces` is initiated only for the canonical winner; any location permission denial, network failure, or provider error is strictly isolated and NEVER alters or wipes out the canonical winner or podium. On error, Places transitions to an error card with a retry button without locking the spinner.

### Resolution of PR #157 Review Comments & Merge Gate Updates
1. **Default Live Composition Wiring & Session Listener Lifecycle**: Automatically resolves identity directly from `useRoomRepository` without requiring prop injection. `DishResultEntry` uses `key={`${identity}:${roomId}:${resultId ?? ''}`}` ensuring clean component recreation when identity, room, or resultId changes. Cleans up screen-created session listeners on unmount (`repository.dispose()` calls `unsubscribeSession()`), without disposing custom repositories injected from callers.
2. **Dual HTTP Error Path & 409 NOT_READY Polling**: Applied unified cache invalidation policy for both RPC envelope 401/403 errors and transport throws (`status: 401 | 403`), while preserving valid cached winners during transient network failures. Thrown HTTP 409 with `RESULT_NOT_READY` / `NOT_READY` from `FetchTransport` is normalized to `{ messageKey: 'NOT_READY' }`, allowing the screen to continue bounded exponential backoff polling rather than failing early to error. Genuine `VERSION_CONFLICT` is preserved.
3. **Monotonic Epoch Guard**: Implemented monotonic global and room epoch counters. In-flight requests are checked before cache storage and before returning `{ ok: true, data }` to UI, strictly blocking late responses after `clearCache()`, `invalidateRoom()`, logout, or account switch.
4. **Raw Wire Schema Validation**: Strictly enforces existence and shape of keys in `poolDish` (`dishId`, `roundDishId`, `name`, `description`, `mealSlots`, `artwork`, validating `mealSlots` is array of strings or null) and 4 keys (`winner`, `topDishes`, `scoreVersion`, `rankingVersion`) per `$defs.terminalResult.required`. Missing keys or non-null versions on `NO_CONSENSUS` are rejected as `MALFORMED_RESPONSE`. Malformed canonical payloads are strictly rejected without falling into legacy via capability spoofing.
5. **Seamless GM-28 Navigation**: Routes (`result.tsx`, `no-consensus.tsx`), entry, and screens accept optional `resultId?: string` (`expectedResultId`). Mismatched resultIds transition safely to error notice, preventing file conflicts with GM-28.
6. **Testing Standards — Stage 3A**: Completed on Android Virtual Device (AVD Pixel 8, API 34) connecting to local Supabase backend (`npx supabase start`). Verified DECIDED (Top 3 + ties), NO_CONSENSUS (R1/R2), Places isolation and error retry, at viewports 412dp, 360dp, and font scale 200%. Physical USB testing deferred to Stage 3B (`GM-33`/`GM-34`).

## Inputs and merge checks

- Rebased and merged clean with `origin/main` (`50c4447`).
- All merge gate dependencies GM-07, GM-13, GM-18, GM-20, GM-21, GM-26 are satisfied on target main.
- Follows strict 1-Task-1-PR file ownership and verification gate.

## Verification

- Focused GM-27 unit suite: **Pass: 51/51** (`resultRepository.test.ts`).
- Focused GM-27 component suite: **Pass: 20/20** (`liveDishResultScreen.test.tsx`).
- Total focused tests: **Pass: 71/71**.
- Full result feature regression: **Pass: 116 tests (7 suites)**.
- TypeScript strict (`tsc --noEmit`), ESLint on modified files (0 errors, 0 warnings), architecture check (`check-architecture.mjs`), task doc indexes (`task_readiness.py --check-docs`), and git whitespace checks: **All Pass**.

## Handoff and limits

- [CHECKS](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/CHECKS.md) · [HANDOFF](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/HANDOFF.md) · [FIGMA_PARITY](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md).
- Stage 3A is fully verified on AVD + local backend QA. Physical USB device testing is deferred to Stage 3B (`GM-33`/`GM-34`); Places API billing key is deferred to `GM-30`.
