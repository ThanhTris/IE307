# GM-29 handoff

Task: GM-29 — Android notification permission and push lifecycle. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm-29-native-push` (PR #127). Status: implementation prepared; AVD/backend and Figma acceptance remain outstanding.

## Artifacts

- `mobile/src/features/inbox/services/expoPushDriver.ts` — Android permission, channel, EAS token, device ID, foreground token refresh, cold/warm tap handling; notification payload is not read.
- `mobile/src/features/inbox/services/nativePush.ts` — authenticated register/unregister, current-OS-permission checks, identity/generation guards, serialized device operations.
- `mobile/src/features/inbox/screens/PushSettingsScreen.tsx`, `mobile/src/app/push-settings.tsx` — settings route, deny/settings states and development-only simulated tap.
- `mobile/src/features/inbox/components/PushLifecycle.tsx` — refetches canonical Inbox data before routing.
- `mobile/src/bootstrap/RoomRepositoryProvider.tsx` — best-effort server unregister before local logout; network failure does not block local logout.
- `mobile/tests/unit/nativePush.test.ts`, `mobile/tests/unit/expoPushDriver.test.ts` — callback/permission and driver regression coverage.

## Configuration and run

Expo baseline: SDK 58 from `origin/main`; dependency `expo-notifications@~58.1.8` is added in this task PR. `expo-application` is not needed by the current implementation. From `mobile/`: `npm ci`, `npm run check:expo`, `npm run typecheck`, `npm run lint`, then the focused push tests.

Route: `/push-settings`, linked from `/inbox`. In a real session, enabling/disabling uses authenticated register/unregister endpoints. A notification tap restores/refetches Inbox and routes to `/inbox`; payload fields are ignored.

## Limits

The 3A AVD + local Backend QA run, OS grant/deny/settings interaction, permission retry/logout/network cases, simulated cold/warm/duplicate/expired taps and Figma screenshot comparison were not run because Android SDK/emulator and Docker are unavailable here. Remote FCM remains a 3B check. Keep PR Draft until the required 3A evidence and merge gate pass; do not alter Project status or approval.
