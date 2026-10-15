# GM-11 checks

- Task/contract: GM-11 / `food-v1/roadmap-v2/GM-11.1`
- Target revision: `origin/main` / `ad393b8`; tested revision: `7a46b6d6a71e89e414ab238ce9c23a241b2f0e4a` (includes merge `fe29883` and GM-11 P2 race fix); reviewed comments: [GM-11 owner review](https://github.com/ThanhTris/IE307/issues/72#issuecomment-6193239256) and PR #120 follow-up.
- Schema/dataset: N/A for UI mock fixtures; no backend or real participant data used.
- Environment: Windows, Node/npm versions from local mobile environment; Expo SDK 57. Android bundle export was not rerun after integrating current main.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Lobby host/member identity, ready/reset/start, member leave and refetch | `cd mobile; npm test -- --runTestsByPath tests/component/gm11Screens.test.tsx` | Switch identity on the same mock client; host resets context; member readies/leaves; refetch repository snapshot | Member ready changed only Tuấn; host remained not ready; member leave removed Tuấn; refetch and rendered roster matched; member cannot access host start/context controls | Pass (mock component scope) |
| P2: identity switch during delayed write/refetch | same component suite; real `MockApiClient` in `loading` mode | Host readies, attempt role/mode/navigation changes while pending; then switch to Member, ready and leave | Role, mode and route controls are disabled; Host ready persisted only to Host; after write+refetch Member switch worked, Member ready/leave affected the correct member | Pass (regression reproduced against real mock adapter) |
| Room status cancel confirmation, offline/reconnect, expired/stale | same component suite | Confirm cancel; show disconnected; reconnect; expired/stale error states | Assertions passed (`ROOM_EXPIRED`, `VERSION_CONFLICT`, reconnect) | Pass (mock component scope) |
| Route integration/navigation | `npm test -- --runTestsByPath tests/integration/routes.test.tsx` | Keep GM-12 vote/final plus GM-11/14 paths when merging current main | Combined route suite passed | Pass (automated; no device) |
| TypeScript, lint, all mobile tests, architecture | `cd mobile; npm run check` | Strict typecheck, lint, Jest, architecture guard, including latest main routes | 16 suites / 477 tests passed; typecheck and architecture guard passed; lint has 4 warnings | Pass with warnings |
| Android JS bundle | `cd mobile; npm run bundle:android` | Export Expo Android bundle on integrated revision | Not rerun after merge | Not run |
| Expo Go Android smoke / visual interaction | Expo Go route `/features` → `GM-11` lobby/status | Open both screens and inspect safe-area, display, actions on Android device | Not run: no Android device/Expo Go session available in this environment; bundle export is not device evidence | Not run; owner/reviewer to run before acceptance |
| Repository validation / regression / docs | `python scripts/validate_repository.py`; `python -m unittest discover -s tests -p "test_*.py"`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Repo invariants and task indexes | Validator passed; Python: 550 tests passed; task indexes match; diff check clean | Pass |
| Live merge gate | `python scripts/task_readiness.py --task GM-11 --gate merge --base-ref origin/main` | Verify Project dependencies and artifacts against latest target | `BLOCKED_PROJECT_UNVERIFIED`: GitHub rejected Project query; current target is `ad393b86c16d5c359056c6f7ffca17d7846f595e` | Not run; access/rate-limit blocker |

Owner follow-up: PR #120 P2 at `LobbyScreen.tsx` was fixed in `7a46b6d`: identity and other DemoFrame controls stay locked through both write and snapshot refetch, with finally-based release and error handling. The actual `MockApiClient` delayed-mode regression passed. PR conflict at `mobile/tests/integration/routes.test.tsx` was resolved while merging `ad393b8` (integration commit `fe29883`); GM-09, GM-12 and GM-11/14 route coverage remain.

## Limits

All room actions are isolated mock behavior. No RPC, real invitation, QR, persistence, multi-device synchronization or production API was exercised. Expo Go Android visual/accessibility smoke and screenshots are still Not run because no Android device/ADB is available here; bundle/Jest do not replace that required evidence. Task is not marked Done/Approved.
