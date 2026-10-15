# GM-11 checks

- Task/contract: GM-11 / `food-v1/roadmap-v2/GM-11.1`
- Target revision: `origin/main` / `ce7b87a`; tested source commit: `65734b3` (includes lobby fix from `c0bf8b1`); reviewed comments: [GM-11 owner review](https://github.com/ThanhTris/IE307/issues/72#issuecomment-6193239256).
- Schema/dataset: N/A for UI mock fixtures; no backend or real participant data used.
- Environment: Windows, Node/npm versions from local mobile environment; Expo SDK 57; Android bundle export completed.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Lobby host/member identity, ready/reset/start, member leave and refetch | `cd mobile; npm test -- --runTestsByPath tests/component/gm11Screens.test.tsx` | Switch identity on the same mock client; host resets context; member readies/leaves; refetch repository snapshot | Member ready changed only Tuấn; host remained not ready; member leave removed Tuấn; refetch and rendered roster matched; member cannot access host start/context controls | Pass (mock component scope) |
| Room status cancel confirmation, offline/reconnect, expired/stale | same component suite | Confirm cancel; show disconnected; reconnect; expired/stale error states | Assertions passed (`ROOM_EXPIRED`, `VERSION_CONFLICT`, reconnect) | Pass (mock component scope) |
| Route integration/navigation | `npm test -- --runTestsByPath tests/integration/routes.test.tsx` | Keep GM-12 vote/final plus GM-11/14 paths when merging current main | Combined route suite passed | Pass (automated; no device) |
| TypeScript, lint, all mobile tests, architecture | `npm run check` | Strict typecheck, lint, Jest, architecture guard, including GM-12 routes from current main | 14 suites / 416 tests passed; typecheck and architecture guard passed; lint has 4 existing warnings | Pass with warnings |
| Android JS bundle | `npm run bundle:android` | Export Expo Android bundle | Metro bundled 1,280 modules and exported `mobile/dist/android` | Pass (bundle only; not app launch) |
| Expo Go Android smoke / visual interaction | Expo Go route `/features` → `GM-11` lobby/status | Open both screens and inspect safe-area, display, actions on Android device | Not run: no Android device/Expo Go session available in this environment; bundle export is not device evidence | Not run; owner/reviewer to run before acceptance |
| Repository validation / regression / docs | `python scripts/validate_repository.py`; `python -m unittest discover -s tests -p "test_*.py"`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Repo invariants and task indexes | Validator passed; Python: 550 tests passed; task indexes match; diff check clean | Pass |
| Live merge gate | `python scripts/task_readiness.py --task GM-11 --gate merge --base-ref origin/main` | Verify upstream tasks and artifacts on current target | `READY_FOR_MERGE_REVIEW`; target ref `ce7b87a2d7510b40fac843ba4657f9bc87a38146` (freshness not verified by checker) | Pass (metadata/artifact gate only) |

Owner follow-up: PR conflict at `mobile/tests/integration/routes.test.tsx` was resolved by merging `ce7b87a`; both GM-12 and GM-11/14 route coverage remain. The route test is included in `npm run check`.

## Limits

All room actions are isolated mock behavior. No RPC, real invitation, QR, persistence, multi-device synchronization or production API was exercised. Expo Go Android visual/accessibility smoke and screenshots are still Not run because no Android device/ADB is available here; bundle/Jest do not replace that required evidence. Task is not marked Done/Approved.
