# GM-29 checks — local follow-up, 2026-11-07

Branch: `codex/gm-29-native-push` (PR #127). Historical checks below were run at `5ebd456`; callback fixes at `a756073` and current review fixes have focused regression coverage. Keep PR Draft. No Project status or approval was changed.

## Local checks

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Clean install | Pass | `npm ci --no-audit --no-fund` completed with SDK 58 lockfile. |
| Expo compatibility | Pass | `npm run check:expo`; Expo `58.0.23`, `expo-notifications@~58.1.8`. |
| Typecheck | Pass | `npm run typecheck`. |
| Lint | Pass with existing warnings | No errors; 4 warnings remain in untouched `data/api/contracts.ts` and `data/api/index.ts`. |
| Focused push and response lifecycle tests | Pass | Final follow-up: 2 suites / 19 tests; covers opt-in persistence, serialized opt-out versus delayed SecureStore writes, offline unregister, per-identity registration, permission/token refresh, and one-time OS response handling. |
| Inbox-to-settings route | Pass | Expo Router integration test opens `/push-settings` from Inbox; component test covers the action; mock mode shows a safe sign-in explanation. 23 route tests and 8 social/history component tests passed independently. |
| Diff whitespace | Pass | `git diff --check`. |
| Expo Go, permission settings, simulated tap on AVD + local Backend QA | Not run | Android SDK/`adb`/emulator and Docker are unavailable in this workspace. Route tests confirm the Expo notifications module is not imported at app startup. |
| Remote FCM | Not run | 3B/device follow-up; no EAS project ID or remote sender credentials here. |
| Figma parity | Not run | No app screenshots or Figma capture in this workspace. |

## Scope decisions

- `expo-notifications@~58.1.8` is required by the Android permission/token/tap code and matches the current SDK 58 baseline. `expo-application` is not used by this implementation and is not added. `expo-sqlite` belongs to GM-31.
- The Expo notifications runtime module is required lazily so unsupported Expo Go startup does not load remote-push code.
- Follow-up at `a756073` plus local regression coverage: token refresh checks OS permission, identity and device generation; persisted opt-in state is keyed by identity and device and hydrated only with OS permission. Opt-in and opt-out writes share a per-device queue, and generation checks stop a delayed refresh from sending after opt-out. If unregister is offline, the durable opt-out remains authoritative. A saved OS response is consumed once across account subscriptions and relaunch. Logout preserves the local device handle when server unregister has not ACKed. Typecheck and focused push tests passed on 2026-11-08; AVD behavior remains unverified.
- Dev simulated taps refetch the authenticated inbox; payload data is ignored. The UI trigger is only exposed in development builds.

## Merge gate

The GM-29 readiness command remains blocked until its upstream dependency and required AVD 3A evidence are accepted. Current checker invocation also cannot verify Project #2 because the GitHub token lacks `read:project`; no gate bypass was attempted. This PR is Draft; no completion or native-delivery claim is made.

## Current PR #127 follow-up — 2026-11-09

This section supersedes the environment limitation recorded above. The earlier entries remain historical. The current worktree is based on PR source `7d064ed` with `origin/main` `8af20a9` merged locally; the merge is uncommitted, so these are not GitHub CI results for a new PR revision.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Fresh isolated QA runtime | Pass | Run `gm29-pr127-final-20261109`, API `127.0.0.1:54381`, DB `54382`; 28 migrations, schema `0.9.2`, contract `dish-session-v4/roadmap-v2/GM-07.B`, 201 functions, catalogue count 2, ownership verified, worker heartbeat recent. Sanitized summary: [`qa-runtime-final.json`](artifacts/qa-runtime-final.json). |
| QA Auth + REST baseline | Pass | 7 assertions: guest signup, refresh identity stability, authenticated `/auth/v1/user`, authenticated REST RPC, missing/forged JWT rejection. |
| V4 API and upgrade suite | Pass | 169 cases; 599 contract envelopes validated; forward upgrade `0039 → 0040` and private validator metadata/body assertions passed. No application database changed. |
| GM-29 device API | Pass | 8 cases using real guest JWTs: bounded inbox; register/ACK replay/request reuse; owner isolation; token rotation; denied permission cleanup; unregister/replay; direct token read denied (`403`). [`qa-device-http.json`](artifacts/qa-device-http.json). |
| Backend tooling tests | Pass | `npm test`: 19/19. |
| Python repository regression | Pass | `python -X utf8 -m unittest discover -s tests -p 'test_*.py'`: 664 passed, 2 skipped. A 429 fixture emitted a `ResourceWarning`, but suite exit was 0. |
| Repository validator, docs checker, diff check | Pass | `validate_repository.py`, `task_readiness.py --check-docs`, and `git diff --check` all exited 0. |
| Clean mobile install and SDK check | Pass | `npm ci --no-audit --no-fund` installed 1,337 packages; `npm run check:expo` reports Expo `58.0.23` dependencies match the lockfile. |
| Mobile static checks | Pass | `npm run typecheck`, `npm run lint` (no warnings/errors), and `npm run check:architecture` all passed after the clean install. |
| Full mobile tests | Pass | `npm test`: 74 suites / 1,389 tests passed. |
| Android JS export | Pass | `npm run bundle:android`: 1,789 modules bundled; 77 assets exported to `mobile/dist/android`. |
| Final local merge gate | Blocked | `task_readiness --task GM-29 --gate merge --base-ref origin/main --verify-outputs` reports `BLOCKED_ON_BASE`: `mobile/app.config.ts`, `mobile/package.json`, and `mobile/package-lock.json` differ from GM-02 target artifacts; `mobile/src/features/inbox/screens/InboxScreen.tsx` differs from GM-14; `mobile/src/features/inbox/services/inboxRepository.ts` differs from GM-28. These are pending target artifact/review alignment, not a failed assertion. Main fetched immediately before the gate remained `8af20a9`. |
| Android debug build | Pass (historical artifact) | The installed SDK 58 development build and metadata are recorded in [`avd-build.json`](artifacts/avd-build.json), tied to source revision `7d064ed`. No native build was run during this follow-up; the current JavaScript source was loaded through Metro. |
| GitHub PR status | Pending push | Before this update, PR #127 was Draft at remote head `7d064ed` with 19/19 reported checks. The main merge and follow-up changes are being pushed now; those old checks do not cover the new revision. |
| AVD local-network prompt | Resolved | Trí permitted Android's `ACCESS_LOCAL_NETWORK` prompt. This is separate from notification permission and does not grant nearby-device/Bluetooth access. |
| AVD app launch after bundle | Blocked | The installed app was pointed to `127.0.0.1:8081` over `adb reverse`; QA Metro returned status 200 and logged a successful Android bundle. The app then remained white and did not expose its React UI. Screenshot: [`avd-white-screen-after-bundle-20261109.png`](artifacts/avd-white-screen-after-bundle-20261109.png). No current React root startup/error was visible in app logcat. |
| AVD notification permission, Inbox/settings, and tap scenarios | Not run | App UI did not render after bundle delivery, so native notification grant/deny, Inbox-to-settings navigation, and cold/warm/duplicate/expired tap scenarios were not exercised. |
| Remote FCM | Not run | 3B/device follow-up; no remote sender credential or physical device delivery was claimed. |

The API/backend results are independent of the blocked AVD UI section. Do not treat the successful debug build as AVD acceptance or mark GM-29 ready for merge until the required 3A flows and app screenshots are completed and reviewed.

### Review regression follow-up — 2026-11-09

- Added the exact opt-out race raised in PR #127 review: start from a persisted `enabled` intent, hold the SecureStore write of `disabled`, emit a refreshed token while that write is pending, then release it. The test asserts the durable intent remains `disabled` and no new registration request occurs.
- Added an Expo Router integration case with an active real session that opens `/push-settings` and asserts the actual settings actions render; this covers the route that was absent in the earlier GM-28-only branch.
- `nativePush.test.ts`: **16/16 Pass**; companion unit/component suites (`expoPushDriver`, notification resolver, Inbox) passed **42/42**; `routes.test.tsx`: **24/24 Pass**. `npm run typecheck`: Pass.
- The production path hydrates stored intent once, sets `desiredEnabled = false` synchronously when unregister starts, and serializes cleanup; token refresh does not restore intent from a potentially stale asynchronous storage read.
- AVD app UI remains blocked at white screen after Metro bundle delivery; permission screens and notification interactions remain **Not run**. This local regression does not remove that acceptance gap or make the PR merge-ready.
