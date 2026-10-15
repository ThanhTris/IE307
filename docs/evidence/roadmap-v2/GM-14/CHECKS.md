# GM-14 checks

- Task/contract: GM-14 / `food-v1/roadmap-v2/GM-14.1`
- Target revision: `origin/main` / `ad393b8`; tested integrated revision: `fe29883` (includes source commit `65734b3` and current main); reviewed comments: [GM-14 owner review](https://github.com/ThanhTris/IE307/issues/75#issuecomment-6193240420).
- Schema/dataset: N/A for UI mock fixtures; synthetic rows only.
- Environment: Windows, Node/npm versions from local mobile environment; Expo SDK 57. Android bundle export was not rerun after integrating current main.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Friends accept confirmation, expiry, unfriend confirmation; empty/error | `cd mobile; npm test -- --runTestsByPath tests/component/gm14Screens.test.tsx` | Synthetic friend/invite fixtures; confirm action before changing local state; empty/error states selectable | Accept/expiry/unfriend, empty and error assertions passed | Pass (mock component scope) |
| Inbox denied permission and invite accept | same component suite | Permission denied still exposes inbox; accept is confirmed | Inbox remains visible and mock accept assertion passed | Pass (mock component scope) |
| Friend/room inbox accept and reject ID mapping | same component suite | Synthetic `eventId` differs from `metadata.invitationId`; assert exact client arguments for all four operations; strict test double rejects event IDs | Accept/reject for friend and room invites passed with invitation IDs; wrong event IDs rejected by test double; expired/missing reference actions disabled | Pass (mock component scope) |
| Friends reject and outgoing invite confirmation | same component suite | Reject active invite; enter a code and confirm outgoing invite | `rejectPartner` received the friend invitation ID; `invitePartner` received code and requestId; confirmation/error UI assertions passed | Pass (mock component scope) |
| History consent, fetchedAt, delete confirmation | same component suite | Toggle group summary consent, show fixture fetchedAt, confirm delete; no sensitive fields | Assertions passed; opted-out group summary hidden and deleted row removed | Pass (mock component scope) |
| Route integration/navigation | `npm test -- --runTestsByPath tests/integration/routes.test.tsx` | Keep GM-12 vote/final plus GM-11/14 paths when merging current main | Combined route suite passed | Pass (automated; no device) |
| TypeScript, lint, all mobile tests, architecture | `cd mobile; npm run check` | Strict typecheck, lint, Jest, architecture guard, including latest main routes | 16 suites / 476 tests passed; typecheck and architecture guard passed; lint has 4 warnings | Pass with warnings |
| Android JS bundle | `cd mobile; npm run bundle:android` | Export Expo Android bundle on integrated revision | Not rerun after merge | Not run |
| Expo Go Android smoke / visual interaction | Expo Go route `/features` → GM-14 friends/inbox/history | Open all three screens and inspect consent/dialog/list states on Android device | Not run: no Android device/Expo Go session available; bundle export is not device evidence | Not run; owner/reviewer to run before acceptance |
| Repository validation / regression / docs | `python scripts/validate_repository.py`; `python -m unittest discover -s tests -p "test_*.py"`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Repo invariants and task indexes | Validator passed; Python: 550 tests passed; task indexes match; diff check clean | Pass |
| Live merge gate | `python scripts/task_readiness.py --task GM-14 --gate merge --base-ref origin/main` | Verify Project dependencies and artifacts against latest target | `BLOCKED_PROJECT_UNVERIFIED`: GitHub rejected Project query; current target is `ad393b86c16d5c359056c6f7ffca17d7846f595e` | Not run; access/rate-limit blocker |

Owner follow-up: PR conflict at `mobile/tests/integration/routes.test.tsx` was resolved while merging `ad393b8` (integration commit `fe29883`); GM-09, GM-12 and GM-11/14 route coverage remain. The combined route test passed in `npm run check`.

## Limits

Friend/inbox/history actions are local mock calls; no actual social, server consent, notification permission, push, API, persistence, or deletion was exercised. Expo Go Android display/font-scale/dark-mode/TalkBack smoke and screenshots are still Not run because no Android device/ADB is available; automated tests do not replace that required evidence. Task is not marked Done/Approved.
