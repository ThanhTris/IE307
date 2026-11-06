# GM-29 checks — local implementation

### Trí review follow-up — 2026-11-07 (local, pending PR update)

- Added server-ACKed token persistence and a regression showing failed registration remains retryable and only successful registration is acknowledged.
- Push lifecycle retries an unacknowledged token when the app returns to foreground and guards registration against identity/session changes.
- Full `mobile/npm run check`: Pass — typecheck, lint, 70 suites / 1138 tests, architecture check. This is mocked local coverage; native Android delivery/restart is still Not run.
- PR #126 remains draft and unapproved; no Project status change.

Status: Review required; mandatory Android/Figma evidence is Not run.
Task / owner / reviewer / scope: GM-29 / Trung / Trí (ThanhTris) / permission UI and native push open.
Branch / target / tested revision / time: PR #126 branch `codex/gm-28-social-inbox-history` / `main` / tested code commit `35f61ed` (published as `28bb31e`) / 2026-11-06.
Contract version: `ui-figma-final/2026-10-25/GM-29.2`; API contract is the checked-in `ApiClient` push-device contract. Expo SDK: 58.
Mode: expo-native (native delivery not run).

## Setup and repeat

From `mobile/`: `npm ci`, `npm run check:expo`, `npm run check`, `npm test -- --runInBand tests/unit/expoPushDriver.test.ts`.
Route: `/push-settings`; Inbox entry is the `Cài đặt thông báo` action on `/inbox` (`/gm28/inbox` redirects). In a real session, enable/disable uses authenticated register/unregister endpoints. Taps restore session, refetch canonical inbox data, then route to `/inbox`; notification payload fields are not inspected.

## Cases / AC

| AC/case | Expected | Actual/evidence | Status | Limit |
| --- | --- | --- | --- | --- |
| Expo config and dependencies | SDK-compatible notifications, SQLite plugins and config | `npm run check:expo` and `npx expo config --type public` passed | Pass | EAS project ID is not configured; does not prove native build |
| Typecheck/lint/unit/architecture | Code compiles and repository checks pass | Latest `npm run check`: 70 suites, 1138 tests passed; architecture boundaries OK | Pass | Local runner only |
| Focused push/outbox/history/result regression | Driver, outbox, voting, history repositories, stale result response | Latest focused run: 5 suites, 57 tests passed | Pass | Mocked unit/component coverage |
| Expo Go Android | App starts; remote-push controls explain native build requirement; inbox remains available | Not run on Expo Go/device | Not run | Android launch evidence required |
| Permission grant/deny/settings | OS permission reflected; deny preserves Inbox | Not run on Android device | Not run | Need Android device/development build |
| Remote delivery, cold/warm/duplicate tap, rotation, logout/revocation | Auth restore + canonical ACL refetch; safe current route; no payload trust | Unit mocks cover driver orchestration only; no real delivery run | Not run | Need EAS project ID, push backend credentials and Android development build/device |
| Figma visual parity | Compare the 412dp frame and 320/360dp + 200% text | Figma node links are mapped in task; Figma page inaccessible to web inspection in this session, screenshots not captured | Not run | Need Figma MCP/page access and app screenshots |

Figma nodes: `382:8859`, `380:1440`, `286:2245`, `277:2140`, `1015:10152`.

## Blockers

No `EXPO_PUBLIC_EAS_PROJECT_ID` or `extra.eas.projectId` is configured in this checkout. No Android device/native build or live push credentials were available. Do not mark mandatory native/visual AC complete based on unit tests.
