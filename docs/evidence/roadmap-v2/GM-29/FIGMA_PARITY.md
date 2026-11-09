# GM-29 Figma parity

Date: 2026-11-09. The five design references below are captured and checked in as evidence. Trí permitted the initial Android `ACCESS_LOCAL_NETWORK` prompt. The installed app then received the QA Metro bundle but remained on a white screen; see [avd-white-screen-after-bundle-20261109.png](artifacts/avd-white-screen-after-bundle-20261109.png). App-to-design comparison is **not run** because no React UI became visible. This is separate from the app's notification permission flow.

| Figma node/state | Figma reference capture | App route and expected behavior | AVD actual / status |
| --- | --- | --- | --- |
| `382:8859` permission request | [figma-permission-request.png](artifacts/figma-permission-request.png) | `/push-settings`; request notification permission and keep Inbox usable when denied | Not run — installed app remained white after bundle delivery |
| `380:1440` permission surface | [figma-permission-surface.png](artifacts/figma-permission-surface.png) | `/push-settings`; grant/deny state and Android settings affordance | Not run — notification grant/deny and Settings action not reached |
| `286:2245` notification inbox | [figma-notification-inbox.png](artifacts/figma-notification-inbox.png) | `/inbox`; canonical inbox remains available without notification permission | Not run — no app screenshot available |
| `277:2140` continue session | [figma-continue-session.png](artifacts/figma-continue-session.png) | Push tap restores auth, refetches Inbox and routes from server metadata | Not run on AVD — cold/warm/duplicate tap scenarios not reached |
| `1015:10152` deleted/no longer authorized | [figma-unavailable-content.png](artifacts/figma-unavailable-content.png) | Safe unavailable/Inbox/Home state; never infer access or join from notification payload | Server API/ACL tests pass; AVD route behavior not run |

## Device and comparison requirements

- AVD: `Medium_Phone_API_37.0`, Android API 37, x86_64, 1080×2400 physical resolution, density 420 (~411dp content width).
- The planned viewport comparisons at 412/360/320dp, 200% font scale, TalkBack, Back navigation, and ≥48dp touch targets remain **Not run** until the app can reach the UI.
- The checked-in PNGs are Figma references only. They are not app screenshots and do not establish visual parity.
- `ACCESS_LOCAL_NETWORK` was permitted by the user. The app downloaded a bundle from QA Metro at `127.0.0.1:8081` via `adb reverse`, but stayed white. This does not prove the app rendered or completed an authenticated API request.
- No fresh native build was made during this follow-up; the preinstalled debug build was used. The current React UI startup is blocked and needs diagnosis before screenshot parity or push interactions can be tested.
- Remote FCM on a USB-connected physical phone remains Not run in this task and is handed to GM-33/GM-34 (Chặng 3B).
