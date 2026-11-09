# GM-29 checks — local follow-up, 2026-11-09

Branch: `codex/gm-29-native-push` (PR #127). Owner: Trung. Reviewer: Trí / ThanhTris. Historical checks below were run at `5ebd456`; callback fixes at `a756073` and current review fixes have focused regression coverage plus live AVD + QA backend verification. Keep PR ready for Trí's review. No Project status or approval was changed.

## Local checks (historical baseline — 2026-11-07)

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Clean install | Pass | `npm ci --no-audit --no-fund` completed with SDK 58 lockfile. |
| Expo compatibility | Pass | `npm run check:expo`; Expo `58.0.23`, `expo-notifications@~58.1.8`. |
| Typecheck | Pass | `npm run typecheck`. |
| Lint | Pass with existing warnings | No errors; 4 warnings remain in untouched `data/api/contracts.ts` and `data/api/index.ts`. |
| Focused push and response lifecycle tests | Pass | 2 suites / 24 tests (`nativePush.test.ts`, `expoPushDriver.test.ts`); covers opt-in persistence, serialized opt-out versus delayed SecureStore writes, offline unregister, per-identity registration, permission/token refresh, and one-time OS response handling. |
| Inbox-to-settings route | Pass | Expo Router integration test opens `/push-settings` from Inbox; component test covers the action; mock mode shows a safe sign-in explanation. 23 route tests and 8 social/history component tests passed independently. |
| Diff whitespace | Pass | `git diff --check`. |

## Scope decisions

- `expo-notifications@~58.1.8` is provided by the upstream GM-02 SDK 58 baseline maintenance PR (#161); GM-29 does not modify GM-02 owned `package.json`, `package-lock.json`, or `app.config.ts`.
- GM-14 (`InboxScreen.tsx`) and GM-28 (`inboxRepository.ts`) upstream files are untouched; GM-29 renders the `/push-settings` entry button in `mobile/src/app/inbox.tsx` and validates event ownership via `getNotificationInbox` inside `LiveInboxScreen.tsx` and `PushSettingsScreen.tsx`.
- The Expo notifications runtime module is required lazily so unsupported Expo Go startup does not load remote-push code.
- Token refresh checks OS permission, identity and device generation; persisted opt-in state is keyed by identity and device and hydrated only with OS permission. Opt-in and opt-out writes share a per-device queue, and generation checks stop a delayed refresh from sending after opt-out. If unregister is offline, the durable opt-out remains authoritative. A saved OS response is consumed once across account subscriptions and relaunch. Logout preserves the local device handle when server unregister has not ACKed.
- Dev simulated taps refetch the authenticated inbox; payload data is ignored. The UI trigger is only exposed in development/QA builds.

## Current PR #127 verification — 2026-11-09

This section supersedes the earlier environment/bundle limitation. After fixing the QA Metro environment variable (`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54381` from `state.ports.api`) and removing upstream file ownership conflicts, all local gates and Stage 3A AVD + QA backend checks passed.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Fresh isolated QA runtime | Pass | Run `gm29-pr127-final-20261109`, API `127.0.0.1:54381`, DB `54382`; 28 migrations, schema `0.9.2`, contract `dish-session-v4/roadmap-v2/GM-07.B`, 201 functions, catalogue count 2, ownership verified, worker heartbeat recent. Sanitized summary: [`qa-runtime-final.json`](artifacts/qa-runtime-final.json). |
| QA Auth + REST baseline | Pass | 7 assertions: guest signup, refresh identity stability, authenticated `/auth/v1/user`, authenticated REST RPC, missing/forged JWT rejection. |
| V4 API and upgrade suite | Pass | 169 cases; 599 contract envelopes validated; forward upgrade `0039 → 0040` and private validator metadata/body assertions passed. No application database changed. |
| GM-29 device API | Pass | 8 cases using real guest JWTs: bounded inbox; register/ACK replay/request reuse; owner isolation; token rotation; denied permission cleanup; unregister/replay; direct token read denied (`403`). [`qa-device-http.json`](artifacts/qa-device-http.json). |
| Backend tooling tests | Pass | `npm test`: 19/19. |
| Python repository regression | Pass | `python -X utf8 -m unittest discover -s tests -p 'test_*.py'`: 664 passed, 2 skipped. |
| Repository validator, docs checker, diff check | Pass | `validate_repository.py`, `task_readiness.py --check-docs`, and `git diff --check` all exited 0. |
| Clean mobile install and SDK check | Pass | `npm ci --no-audit --no-fund` installed 1,337 packages; `npm run check:expo` reports Expo `58.0.23` dependencies match the lockfile. |
| Mobile static checks | Pass | `npm run typecheck`, `npm run lint` (0 errors), and `npm run check:architecture` all passed. |
| Focused & full mobile tests | Pass | `nativePush.test.ts` + `expoPushDriver.test.ts`: 2 suites / 24 tests passed; full mobile suite: 74 suites / 1,389 tests passed. |
| Android JS export | Pass | `npm run bundle:android`: 1,789 modules bundled; 77 assets exported to `mobile/dist/android`. |
| Final local merge gate | Pass | `python scripts/task_readiness.py --task GM-29 --gate merge --base-ref origin/main --verify-outputs` returns `READY_FOR_MERGE_REVIEW`. |
| Android debug build on AVD | Pass | SDK 58 development build (`vn.gicungduoc.mobile`, [`avd-build.json`](artifacts/avd-build.json)) running on `Medium_Phone_API_37.0` (`emulator-5554`) connected via `adb reverse` to QA Backend (`127.0.0.1:54381`) and Metro (`127.0.0.1:8081`). |
| AVD notification permission, Inbox/settings, and tap scenarios (Stage 3A) | Pass | Authenticated guest `TriQA` on live QA backend; navigated Home → `/inbox` ([`avd-inbox-286-2245.png`](artifacts/avd-inbox-286-2245.png)) → `/push-settings` ([`avd-push-settings-382-8859.png`](artifacts/avd-push-settings-382-8859.png), [`avd-push-settings-380-1440.png`](artifacts/avd-push-settings-380-1440.png)). Enabled QA device notifications (`Thông báo đã được bật trên thiết bị này.`, [`avd-push-settings-registered.png`](artifacts/avd-push-settings-registered.png)). Exercised simulated notification tap with unauthorized/missing `eventId` (`00000000-0000-4000-8000-000000000099`), verifying server refetch and safe unavailable notice (`Thông báo này đã hết hạn, bị xóa hoặc không còn thuộc tài khoản hiện tại.`, [`avd-inbox-unavailable-1015-10152.png`](artifacts/avd-inbox-unavailable-1015-10152.png)) without auto-joining. Verified `/continue-session` ([`avd-continue-session-277-2140.png`](artifacts/avd-continue-session-277-2140.png)) and responsive/a11y viewports (`360dp`, `320dp`, `font_scale 2.0`). |
| Remote FCM (Stage 3B) | Not run (Deferred to Stage 3B GM-33/GM-34) | Per project owner policy (2026-11-07 Two-Stage Testing), remote FCM push delivery on a USB-connected physical Android phone is deferred to Stage 3B (`GM-33`/`GM-34`). |
