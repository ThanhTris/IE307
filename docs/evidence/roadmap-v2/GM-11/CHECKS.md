# GM-11 checks

- Task/contract: GM-11 / `food-v1/roadmap-v2/GM-11.1`
- Base revision: `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`; code checks were run on the working tree immediately before implementation commit `41eb135` on `codex/gm-11-14-ui`.
- Schema/dataset: N/A for UI mock fixtures; no backend or real participant data used.
- Environment: Windows, Node/npm versions from local mobile environment; Expo SDK 57; Android bundle export completed.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Lobby host/member, ready gate, context reset, invite/code labeling | `cd mobile; npm test -- --runTestsByPath tests/component/gm11Screens.test.tsx` | Synthetic room roster; member ready action; host start disabled until local fixture ready; context change clears ready; placeholder code/QR cannot join real room | Assertions passed for roster, explicit ready, host-only start, reset and placeholder disclosure | Pass (mock component scope) |
| Room status cancel confirmation, offline/reconnect, expired/stale | same component suite | Confirm cancel; show disconnected; reconnect; expired/stale error states | Assertions passed (`ROOM_EXPIRED`, `VERSION_CONFLICT`, reconnect) | Pass (mock component scope) |
| Route integration/navigation | `npm test -- --runTestsByPath tests/integration/routes.test.tsx` | Open task demo routes and move between screens | Route suite passed | Pass (automated; no device) |
| TypeScript, lint, all mobile tests, architecture | `npm run check` | Strict typecheck, lint, Jest, architecture guard | 13 suites / 392 tests passed; typecheck and architecture guard passed; lint has 4 pre-existing warnings after GM-11/14 local warnings were corrected | Pass with warnings |
| Android JS bundle | `npm run bundle:android` | Export Expo Android bundle | Metro bundled 1,280 modules and exported `mobile/dist/android` | Pass (bundle only; not app launch) |
| Expo Go Android smoke / visual interaction | Expo Go route `/features` → `GM-11` lobby/status | Open both screens and inspect safe-area, display, actions on Android device | Not run: no Android device/Expo Go session available in this environment; bundle export is not device evidence | Not run; owner/reviewer to run before acceptance |
| Repository validation / regression / docs | `python scripts/validate_repository.py`; `python -m unittest discover -s tests -p "test_*.py"`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Repo invariants and task indexes | Validator passed; Python: 550 tests passed; task indexes match; diff check clean | Pass |
| Live start gate | `python scripts/task_readiness.py --task GM-11` | Read current Project #2 dependencies | `READY_TO_CLAIM`; checker states this does not establish execution or merge readiness | Pass (start gate only) |

## Limits

All room actions are isolated mock behavior. No RPC, real invitation, QR, persistence, multi-device synchronization or production API was exercised. Task remains subject to Expo Go device smoke and reviewer acceptance; this file does not mark it Done/Approved.

