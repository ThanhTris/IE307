## Task and behavior

GM-27 ([issue #88](https://github.com/ThanhTris/IE307/issues/88)), owner Trang, reviewer Tri. Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.

Connects the canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) to the mobile UI flow via `LiveResultRepository` and `LiveDishResultScreen`. Preserves server authority: persisted order, scores, and ranks are kept intact; client-side score recalculation and tie-break overrides are strictly prohibited.

Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3 podium mapping) matching Figma node `617:1671`. Fully supports `NO_CONSENSUS` terminal outcomes (`EMPTY_INTERSECTION` for Round 1, `ALL_REMOVED` for Round 2). Safely handles `legacy-unscored-v1` backward compatibility.

Places isolation: `fetchNearbyPlaces` is initiated only for the canonical winner; any location permission denial, network failure, or provider error is strictly isolated and NEVER alters or wipes out the canonical winner or podium. On error, Places transitions to an error card with a retry button without locking the spinner.

### Resolution of PR #157 Review Comments
1. **Cache invalidation on permission loss**: In-memory cache is partitioned by `${identity}:${roomId}:${contractVersion}` and is immediately cleared when server returns `NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, or `PERMISSION_DENIED`. Generation counter prevents late in-flight responses from re-populating invalidated cache.
2. **Bounded `NOT_READY` polling backoff**: Polling in `finalizing` / `NOT_READY` state uses exponential backoff up to 10 attempts before gracefully falling back to error state with a retry button. Active timers are cleanly cancelled on component unmount and room change.
3. **Room context switching hygiene**: `LiveDishResultScreen` synchronously resets UI state upon `roomId` change (`isRoomChanged`), preventing room A data from leaking into room B. `DishResultEntry` attaches `key={roomId}` to recreate component cleanly.
4. **Strict payload validation**: Strictly enforces mandatory version fields (`contractVersion`, `policyVersion`, `scoreVersion`, `rankingVersion`), rejects unsupported versions (`unsupported-v99`), requires non-empty `roundDishId` on winner and podium dishes (no fallback to `dishId`), and rejects `NO_CONSENSUS` with non-empty winner/podium.
5. **Places error recovery**: Failure or rejection in `fetchNearbyPlaces` transitions cleanly to an error card with a "Thử lại" button without infinite spinner. External actions return `{ ok: false }` pending GM-30.
6. **Price metadata truthfulness**: When `sourceRef` and `source` are missing, sets `priceReference = null` (no fake `'Menu'`).

## Inputs and merge checks

- Upstream dependencies GM-07, GM-13, GM-18, and GM-26 are merged into target main (`bb2103a`).
- The owner requested push and PR creation in the current chat. No automated GitHub approval or Project Done is recorded by this PR.

## Verification

- Focused GM-27 unit suite: **Pass: 38/38** (`resultRepository.test.ts`).
- Focused GM-27 component suite: **Pass: 13/13** (`liveDishResultScreen.test.tsx`).
- Full result feature regression: **Pass: 106 tests** across `result*` and `dishResult*` suites.
- TypeScript strict (`tsc --noEmit`), ESLint on modified files (0 errors, 0 warnings), architecture check (`check-architecture.mjs`), repository validator (`validate_repository.py`), task doc indexes (`task_readiness.py --check-docs`), and git whitespace checks: **All Pass**.

## Handoff and limits

- [CHECKS](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/CHECKS.md) · [HANDOFF](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/HANDOFF.md) · [FIGMA_PARITY](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md).
- Visual screenshot parity, physical Android device acceptance, and remote staging execution remain **Not run** pending device lab and reviewer staging verification.
