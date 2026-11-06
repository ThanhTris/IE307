## Task and behavior

GM-27 ([issue #88](https://github.com/ThanhTris/IE307/issues/88)), owner Trang, reviewer Tri. Contract: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.

Connects the canonical terminal result projection from backend GM-20/GM-21 (`result_projection`) to the mobile UI flow via `LiveResultRepository` and `LiveDishResultScreen`. Preserves server authority: persisted order, scores, and ranks are kept intact; client-side score recalculation and tie-break overrides are strictly prohibited.

Supports dense ranking with ties: dishes sharing equal scores receive identical dense ranks (Top 1/2/3 podium mapping) matching Figma node `617:1671`. Fully supports `NO_CONSENSUS` terminal outcomes (`EMPTY_INTERSECTION` for Round 1, `ALL_REMOVED` for Round 2). Safely handles `legacy-unscored-v1` backward compatibility.

Enforces strict contract validation: rejects payloads with missing mandatory fields, scores exceeding $2 \times \text{round1BallotCount}$, or invalid status/reasonCode pairings (`DECIDED` + R1 $\to$ `UNANIMOUS_WANT`, `DECIDED` + R2 $\to$ `ACCEPTABLE_FINAL`, `NO_CONSENSUS` + R1 $\to$ `EMPTY_INTERSECTION`, `NO_CONSENSUS` + R2 $\to$ `ALL_REMOVED`) with `MALFORMED_RESPONSE`.

Places isolation: `fetchNearbyPlaces` is initiated only for the canonical winner; any location permission denial, network failure, or provider error is strictly isolated and NEVER alters or wipes out the canonical winner or podium. Terminal `DECIDED` and `NO_CONSENSUS` results are cached in memory per `roomId`, preventing redundant wire calls and UI flicker.

## Inputs and merge checks

- Upstream dependencies GM-07, GM-13, GM-18, and GM-26 are merged into target main (`bb2103a`).
- The owner requested push and PR creation in the current chat. No automated GitHub approval or Project Done is recorded by this PR.

## Verification

- Focused GM-27 unit suite: **Pass: 23/23** (`resultRepository.test.ts`).
- Focused GM-27 component suite: **Pass: 7/7** (`liveDishResultScreen.test.tsx`).
- Full result feature regression: **Pass: 12 suites / 145 tests**.
- TypeScript strict (`tsc --noEmit`), ESLint on modified files (0 errors, 0 warnings), architecture check (`check-architecture.mjs`), repository validator (`validate_repository.py`), task doc indexes (`task_readiness.py --check-docs`), and git whitespace checks: **All Pass**.

## Handoff and limits

- [CHECKS](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/CHECKS.md) · [HANDOFF](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/HANDOFF.md) · [FIGMA_PARITY](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md).
- Visual screenshot parity, physical Android device acceptance, and remote staging execution remain **Not run** pending device lab and reviewer staging verification.
