# GM-29 — Handoff (work in progress)

## Revision and contract

- Task contract: `food-v1/roadmap-v2/GM-29.1`.
- Base revision: `origin/main` at `8cf8084a021d56fae261da34503ed5a7a45681bd` (2026-10-18).
- GM-02/07/14 start artifacts exist on the base revision. GM-23 and GM-28 remain merge inputs and must be verified on target.
- This branch contains the native push orchestration seam and injected-driver tests only. It is not an implementation of an Expo native driver and is not ready for review/merge.

## Artifact

- `mobile/src/features/inbox/services/nativePush.ts` — injects a native driver, registers granted device tokens through the authenticated API client, unregisters by device ID, refreshes the inbox after a notification tap without using payload data, and reports unsupported capability without a crash.
- `mobile/tests/unit/nativePush.test.ts` — capability guard, denied permission, registration, and server refetch assertions.

## Required integration before this task is complete

1. Trí/reviewer approves the Expo native dependency/provider and package/lockfile change under the GM-02 baseline. `expo-notifications` is not present in the current lockfile, so this work deliberately does not import or install it.
2. Implement and inject the approved Android native driver; connect token unregister to logout and token refresh lifecycle; connect notification tap to GM-28 inbox refetch/route handling.
3. Build the supported Android development client, verify Expo Go startup remains guarded, and run remote delivery cold/warm, denied/granted, token rotation, logout/unregister, duplicate and expired cases against a test backend.

Run the app with `npm start -- --clear` after dependency approval and rebuild the development client after any native dependency/config change. Never put a service-role key in the app. A denied push permission must leave server inbox available. The tap handler only requests an inbox refetch; it does not trust notification payloads for identity, room membership, or navigation authorization.

## Known limits

No native driver, UI entry point, Expo permission prompt, remote push delivery, or Android development-build evidence is present in this revision. Do not mark GM-29 Done based on the injected-driver tests.
