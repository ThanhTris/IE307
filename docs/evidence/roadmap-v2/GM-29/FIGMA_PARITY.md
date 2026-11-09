# GM-29 Figma parity

Date: 2026-11-09. All five design references and corresponding live AVD (`Medium_Phone_API_37.0`, `emulator-5554`) screenshots connected to the local QA backend (`127.0.0.1:54381`) are captured and checked in as evidence below.

| Figma node/state | Figma reference capture | App route and expected behavior | AVD actual / status |
| --- | --- | --- | --- |
| `382:8859` permission request | [figma-permission-request.png](artifacts/figma-permission-request.png) | `/push-settings`; request notification permission and keep Inbox usable when denied | **Pass** — [avd-push-settings-382-8859.png](artifacts/avd-push-settings-382-8859.png); permission prompt / status rendered, Inbox remains usable without permission |
| `380:1440` permission surface | [figma-permission-surface.png](artifacts/figma-permission-surface.png) | `/push-settings`; grant/deny state, QA device registration, and Android settings affordance | **Pass** — [avd-push-settings-380-1440.png](artifacts/avd-push-settings-380-1440.png) & [avd-push-settings-registered.png](artifacts/avd-push-settings-registered.png) (`Thông báo đã được bật trên thiết bị này.`) |
| `286:2245` notification inbox | [figma-notification-inbox.png](artifacts/figma-notification-inbox.png) | `/inbox`; canonical inbox remains available without notification permission and provides entry to `/push-settings` | **Pass** — [avd-inbox-286-2245.png](artifacts/avd-inbox-286-2245.png); header, `/push-settings` entry button, and canonical inbox list rendered |
| `277:2140` continue session | [figma-continue-session.png](artifacts/figma-continue-session.png) | Push tap / `/continue-session` restores auth, refetches Inbox and routes from server metadata | **Pass** — [avd-continue-session-277-2140.png](artifacts/avd-continue-session-277-2140.png); authenticated session restored and checked against server |
| `1015:10152` deleted/no longer authorized | [figma-unavailable-content.png](artifacts/figma-unavailable-content.png) | Safe unavailable/Inbox/Home state; never infer access or join from notification payload | **Pass** — [avd-inbox-unavailable-1015-10152.png](artifacts/avd-inbox-unavailable-1015-10152.png); tapping notification for missing/unauthorized `eventId` displays `Thông báo này đã hết hạn, bị xóa hoặc không còn thuộc tài khoản hiện tại.` |

## Device and comparison verification (Stage 3A)

- **AVD:** `Medium_Phone_API_37.0` (`emulator-5554`), Android API 37, x86_64, 1080×2400 physical resolution, density 420 (~411dp content width).
- **Responsive viewports & font scaling:**
  - `412dp` baseline: [avd-push-settings-380-1440.png](artifacts/avd-push-settings-380-1440.png) — Pass.
  - `360dp` (`945x2100` @ 420dpi): [avd-push-settings-360dp.png](artifacts/avd-push-settings-360dp.png) — Pass, no horizontal overflow or clipped buttons.
  - `320dp` (`840x1867` @ 420dpi): [avd-push-settings-320dp.png](artifacts/avd-push-settings-320dp.png) — Pass, text wraps cleanly inside `ScrollView`.
  - `200% font scale` (`font_scale 2.0`): [avd-push-settings-fontscale-200.png](artifacts/avd-push-settings-fontscale-200.png) — Pass, labels wrap without overlap and remain scrollable.
- **Accessibility & touch targets:** Interactive buttons (`Cài đặt thông báo trên thiết bị`, `Bật thông báo QA trên thiết bị`, `Tắt thông báo trên thiết bị này`, `Mở Hộp thư`) have `minHeight >= 48dp` (142px @ 420dpi ≈ 54dp) and explicit `accessibilityRole="button"` / `content-desc` labels verified via `uiautomator dump`.
- **Stage 3B boundary:** Remote FCM push on a physical USB Android phone remains **Not run (Deferred to Stage 3B GM-33/GM-34)**.
