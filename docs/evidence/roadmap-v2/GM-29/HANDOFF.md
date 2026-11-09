# GM-29 handoff

Task: GM-29 — Android notification permission and push lifecycle. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm-29-native-push` (PR #127). Status: implementation and fresh owned QA Auth/REST checks prepared; debug build installed on AVD; app UI, notification permission flow, tap scenarios, and app-vs-Figma comparison remain outstanding.

## Artifacts

- `mobile/src/features/inbox/services/expoPushDriver.ts` — Android permission, channel, EAS token, device ID, foreground token refresh, cold/warm tap handling; notification payload is not read.
- `mobile/src/features/inbox/services/nativePush.ts` — authenticated register/unregister, current-OS-permission checks, identity/generation guards, serialized device operations.
- `mobile/src/features/inbox/screens/PushSettingsScreen.tsx`, `mobile/src/app/push-settings.tsx` — settings route, deny/settings states and development-only simulated tap.
- `mobile/src/features/inbox/components/PushLifecycle.tsx` — refetches canonical Inbox data before routing.
- `mobile/src/app/inbox.tsx` and `InboxScreen.tsx` — Inbox entry to `/push-settings`; mock mode opens a safe sign-in explanation rather than a missing route.
- `mobile/src/bootstrap/RoomRepositoryProvider.tsx` — best-effort server unregister before local logout; failed unregister preserves the device handle/token for a later cleanup retry.
- `mobile/tests/unit/nativePush.test.ts`, `mobile/tests/unit/expoPushDriver.test.ts` — callback/permission and driver regression coverage.

## Configuration and run

Expo baseline: SDK 58 from `origin/main`; dependency `expo-notifications@~58.1.8` is added in this task PR. `expo-application` is not needed by the current implementation. From `mobile/`: `npm ci`, `npm run check:expo`, `npm run typecheck`, `npm run lint`, then the focused push tests.

Route: `/push-settings`, linked from `/inbox` within this PR. In a real session, enabling/disabling uses authenticated register/unregister endpoints. Opt-in and opt-out writes serialize per identity/device; a delayed refresh cannot overwrite a later opt-out, including when unregister fails offline. A notification tap restores/refetches Inbox and routes to `/inbox`; payload fields are ignored.

## Limits

The preceding 2026-11-07 limitation is historical. On 2026-11-09, an owned QA runtime passed 7 Auth/REST baseline assertions, 169 V4 cases (599 contract envelopes), and 8 GM-29 device API assertions. Repository tooling tests passed 19/19; Python regression passed 664 with 2 skipped. The installed SDK 58 debug build was used without rebuilding in this follow-up. Trí permitted Android's `ACCESS_LOCAL_NETWORK` prompt; the app reached QA Metro at `127.0.0.1:8081`, downloaded the bundle, then remained on a white screen before React UI became visible. See [`avd-white-screen-after-bundle-20261109.png`](artifacts/avd-white-screen-after-bundle-20261109.png), [`CHECKS.md`](CHECKS.md), [`FIGMA_PARITY.md`](FIGMA_PARITY.md), [`qa-runtime-final.json`](artifacts/qa-runtime-final.json), and [`qa-device-http.json`](artifacts/qa-device-http.json). Native notification grant/deny, Inbox/settings navigation, cold/warm/duplicate taps, and app-vs-Figma parity remain Not run. Remote FCM remains a 3B check. Do not treat server tests or the prior build artifact as completion of AVD acceptance. No Project status or approval was changed.
