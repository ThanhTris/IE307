# GM-29 handoff

Task: GM-29 — Android notification permission and push lifecycle. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm-29-native-push` (PR #127). Status: implementation, fresh owned QA Auth/REST checks, and Stage 3A AVD (`Medium_Phone_API_37.0`) verification completed; ready for merge review by Trí.

## Artifacts

- `mobile/src/features/inbox/services/expoPushDriver.ts` — Android permission, channel, EAS token, device ID, foreground token refresh, cold/warm tap handling; notification payload is not read.
- `mobile/src/features/inbox/services/nativePush.ts` — authenticated register/unregister, current-OS-permission checks, identity/generation guards, serialized device operations.
- `mobile/src/features/inbox/screens/PushSettingsScreen.tsx`, `mobile/src/app/push-settings.tsx` — settings route, deny/settings states and development-only simulated tap.
- `mobile/src/features/inbox/components/PushLifecycle.tsx` — refetches canonical Inbox data before routing.
- `mobile/src/app/inbox.tsx` and `LiveInboxScreen.tsx` — Inbox entry to `/push-settings` and server-side `openEventId` verification without modifying GM-14 (`InboxScreen.tsx`) or GM-28 (`inboxRepository.ts`).
- `mobile/src/bootstrap/RoomRepositoryProvider.tsx` — best-effort server unregister before local logout; failed unregister preserves the device handle/token for a later cleanup retry.
- `mobile/tests/unit/nativePush.test.ts`, `mobile/tests/unit/expoPushDriver.test.ts` — callback/permission and driver regression coverage (24 tests).

## Configuration and run

Expo baseline: SDK 58 from `origin/main` (with `expo-notifications@~58.1.8` declared in GM-02 maintenance PR #161). From `mobile/`: `npm ci`, `npm run check:expo`, `npm run typecheck`, `npm run lint`, then the focused push tests.

Route: `/push-settings`, linked from `/inbox` within this PR. In a real session, enabling/disabling uses authenticated register/unregister endpoints. Opt-in and opt-out writes serialize per identity/device; a delayed refresh cannot overwrite a later opt-out, including when unregister fails offline. A notification tap restores/refetches Inbox and routes to `/inbox`; payload fields are ignored.

## Verification & Stage 3B Boundary

On 2026-11-09, an owned QA runtime (`127.0.0.1:54381`) passed 7 Auth/REST baseline assertions, 169 V4 cases (599 contract envelopes), and 8 GM-29 device API assertions. Repository tooling tests passed 19/19; Python regression passed 664 with 2 skipped. `python scripts/task_readiness.py --task GM-29 --gate merge --base-ref origin/main --verify-outputs` passes with `READY_FOR_MERGE_REVIEW`.

On AVD `Medium_Phone_API_37.0` (`emulator-5554`), the app authenticated against the live QA backend, navigated `/inbox` → `/push-settings`, registered the QA device token, and verified simulated notification tap routing and `1015:10152` unauthorized/unavailable event handling, as well as `412dp`/`360dp`/`320dp` and `200%` font scale checks. See [`CHECKS.md`](CHECKS.md), [`FIGMA_PARITY.md`](FIGMA_PARITY.md), [`qa-runtime-final.json`](artifacts/qa-runtime-final.json), and [`qa-device-http.json`](artifacts/qa-device-http.json). Remote FCM on a physical USB Android phone remains deferred to Stage 3B (`GM-33`/`GM-34`). No Project status or approval was changed.
