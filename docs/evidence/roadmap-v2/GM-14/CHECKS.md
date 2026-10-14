# GM-14 checks

- Task/contract: GM-14 / `food-v1/roadmap-v2/GM-14.1`
- Base revision: `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`; checks run against current working tree on `codex/gm-11-14-ui` (uncommitted).
- Schema/dataset: N/A for UI mock fixtures; synthetic rows only.
- Environment: Windows, Node/npm versions from local mobile environment; Expo SDK 57; Android bundle export completed.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Friends accept confirmation, expiry, unfriend confirmation; empty/error | `cd mobile; npm test -- --runTestsByPath tests/component/gm14Screens.test.tsx` | Synthetic friend/invite fixtures; confirm action before changing local state; empty/error states selectable | Accept/expiry/unfriend, empty and error assertions passed | Pass (mock component scope) |
| Inbox denied permission and invite accept | same component suite | Permission denied still exposes inbox; accept is confirmed | Inbox remains visible and mock accept assertion passed | Pass (mock component scope) |
| History consent, fetchedAt, delete confirmation | same component suite | Toggle group summary consent, show fixture fetchedAt, confirm delete; no sensitive fields | Assertions passed; opted-out group summary hidden and deleted row removed | Pass (mock component scope) |
| Route integration/navigation | `npm test -- --runTestsByPath tests/integration/routes.test.tsx` | Open task demo routes and navigate between screens | Route suite passed | Pass (automated; no device) |
| TypeScript, lint, all mobile tests, architecture | `npm run check` | Strict typecheck, lint, Jest, architecture guard | 13 suites / 392 tests passed; typecheck and architecture guard passed; lint has 4 pre-existing warnings after GM-11/14 local warnings were corrected | Pass with warnings |
| Android JS bundle | `npm run bundle:android` | Export Expo Android bundle | Metro bundled 1,280 modules and exported `mobile/dist/android` | Pass (bundle only; not app launch) |
| Expo Go Android smoke / visual interaction | Expo Go route `/features` → GM-14 friends/inbox/history | Open all three screens and inspect consent/dialog/list states on Android device | Not run: no Android device/Expo Go session available; bundle export is not device evidence | Not run; owner/reviewer to run before acceptance |
| Repository validation / regression / docs | `python scripts/validate_repository.py`; `python -m unittest discover -s tests -p "test_*.py"`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Repo invariants and task indexes | Validator passed; Python: 550 tests passed; task indexes match; diff check clean | Pass |
| Live start gate | `python scripts/task_readiness.py --task GM-14` | Read current Project #2 dependencies | `READY_TO_CLAIM`; checker states this does not establish execution or merge readiness | Pass (start gate only) |

## Limits

Friend/inbox/history actions are local mock calls; no actual social, server consent, notification permission, push, API, persistence, or deletion was exercised. Reject and standalone invite interactions are not independently asserted by the current component test. Expo Go device smoke remains Not run; do not mark accepted based only on CI/mock.
