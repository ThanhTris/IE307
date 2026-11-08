# GM-29 checks — local follow-up, 2026-11-07

Branch: `codex/gm-29-native-push` (PR #127). Historical checks below were run at `5ebd456`; callback fixes are now at `a756073` and have not been rerun locally. Keep PR Draft. No Project status or approval was changed.

## Local checks

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Clean install | Pass | `npm ci --no-audit --no-fund` completed with SDK 58 lockfile. |
| Expo compatibility | Pass | `npm run check:expo`; Expo `58.0.23`, `expo-notifications@~58.1.8`. |
| Typecheck | Pass | `npm run typecheck`. |
| Lint | Pass with existing warnings | No errors; 4 warnings remain in untouched `data/api/contracts.ts` and `data/api/index.ts`. |
| Focused push and route tests | Pass | `nativePush.test.ts`, `expoPushDriver.test.ts`, `routes.test.tsx`: 3 suites / 30 tests. |
| Diff whitespace | Pass | `git diff --check`. |
| Expo Go, permission settings, simulated tap on AVD + local Backend QA | Not run | Android SDK/`adb`/emulator and Docker are unavailable in this workspace. Route tests confirm the Expo notifications module is not imported at app startup. |
| Remote FCM | Not run | 3B/device follow-up; no EAS project ID or remote sender credentials here. |
| Figma parity | Not run | No app screenshots or Figma capture in this workspace. |

## Scope decisions

- `expo-notifications@~58.1.8` is required by the Android permission/token/tap code and matches the current SDK 58 baseline. `expo-application` is not used by this implementation and is not added. `expo-sqlite` belongs to GM-31.
- The Expo notifications runtime module is required lazily so unsupported Expo Go startup does not load remote-push code.
- Follow-up at `a756073`: token refresh checks OS permission, identity and device generation; a registration that failed at the server remains eligible for foreground retry until disable/logout. Register, unregister and tap callbacks are invalidated across identity changes and cleanup. Logout preserves the local device handle when server unregister has not ACKed. These changes have not been rerun locally.
- Dev simulated taps refetch the authenticated inbox; payload data is ignored. The UI trigger is only exposed in development builds.

## Merge gate

The GM-29 readiness command remains blocked until its upstream dependency and required AVD 3A evidence are accepted. This PR is Draft; no completion or native-delivery claim is made.
