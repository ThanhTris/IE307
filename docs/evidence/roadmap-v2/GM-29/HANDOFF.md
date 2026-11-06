# GM-29 handoff

Task: GM-29 — UI quyền thông báo và mở app từ push. Owner: Trung. Reviewer: Trí / ThanhTris. Branch: `codex/gm29-31-local`. Status: implementation prepared locally; review and mandatory native/visual evidence remain outstanding.

## Artifacts

| Artifact | Purpose / receiver |
| --- | --- |
| `mobile/src/features/inbox/services/expoPushDriver.ts` | Android permission, channel, EAS token, device ID, foreground token refresh, cold/warm tap event; does not read payload |
| `mobile/src/features/inbox/services/nativePush.ts` | Authenticated register/unregister and orchestration |
| `mobile/src/features/inbox/screens/PushSettingsScreen.tsx`, `mobile/src/app/push-settings.tsx` | Settings route, deny/settings states, unsupported/missing project guards |
| `mobile/src/features/inbox/components/PushLifecycle.tsx` | Restore session and refetch inbox before opening existing route |
| `mobile/app.config.ts` | Expo notification and SQLite plugins; preserves unrelated blocked permissions |
| `mobile/tests/unit/expoPushDriver.test.ts` | Mocked driver tests; not native-delivery proof |

## Configuration and limitations

Set `EXPO_PUBLIC_EAS_PROJECT_ID` or configure `extra.eas.projectId` before native push registration. Build an Android development build. After configuration, verify permission grant/deny, real remote delivery, cold/warm/duplicate taps, token rotation, logout/revoke, auth expiry and deleted/outsider cases. Capture Figma/app screenshots at 412dp plus 320/360dp and 200% text. Figma visual review remains with Trí. No task status or approval is changed by this handoff.
