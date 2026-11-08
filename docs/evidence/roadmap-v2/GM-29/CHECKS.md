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
