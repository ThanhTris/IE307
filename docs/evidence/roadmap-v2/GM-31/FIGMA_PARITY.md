# GM-31 Figma parity

Date: 2026-11-09. Design references from the task map and live AVD (`Medium_Phone_API_37.0`, `emulator-5554`) screenshots connected to the local QA backend (`127.0.0.1:54381`) are captured and verified below.

| Frame/state | Implementation | Expected behavior | Status / AVD Evidence |
| --- | --- | --- | --- |
| `277:2140` continue session | Room/voting routes + `DurableOutbox` | Restore session across `am force-stop` and reconcile canonical server state before retry | **Pass** — [avd-restart-session-restored.png](artifacts/avd-restart-session-restored.png) |
| `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768` | Session/cache recovery states (`HomeScreen`, `durableVoteRepository`, `outbox.ts`) | Show current authorized state, preserve offline session/outbox without stale auto-replay, and clear private cache on logout/revocation | **Pass** — [avd-home-offline-restore-382-7201.png](artifacts/avd-home-offline-restore-382-7201.png) & `gm31Outbox.test.ts` (43/43 tests) |
| `801:9695` history error | `/history` (`LiveHistoryScreen.tsx`) | Retry without fabricated rows when server request fails | **Pass** — [avd-friends-offline-error.png](artifacts/avd-friends-offline-error.png) & [avd-history-online.png](artifacts/avd-history-online.png) |
| `801:9846` offline history | `/history` (`history.tsx` + `getDurableOutbox()`) | Show authorized durable cache timestamp/stale state (`Đang ngoại tuyến · Dữ liệu lưu lúc ...`) when offline after process restart | **Pass** — [avd-history-offline-801-9846.png](artifacts/avd-history-offline-801-9846.png) & [avd-history-consent-sheet.png](artifacts/avd-history-consent-sheet.png) |
| `801:9775` empty offline state | `/history` (`LiveHistoryScreen.tsx`) | Explain unavailable cache (`Chưa có dữ liệu đã lưu · Kết nối mạng để tải lịch sử.`) and offer retry | **Pass** — [avd-history-online.png](artifacts/avd-history-online.png) |

## Device and viewport verification (Stage 3A)

- **AVD:** `Medium_Phone_API_37.0` (`emulator-5554`), Android API 37, x86_64, 1080×2400 physical resolution, density 420 (~411dp content width).
- **Responsive viewports & font scaling:**
  - `412dp` baseline: [avd-history-offline-801-9846.png](artifacts/avd-history-offline-801-9846.png) — Pass.
  - `360dp` (`945x2100` @ 420dpi): [avd-history-offline-360dp.png](artifacts/avd-history-offline-360dp.png) — Pass, no horizontal overflow or clipped actions.
  - `200% font scale` (`font_scale 2.0`): [avd-history-offline-fontscale-200.png](artifacts/avd-history-offline-fontscale-200.png) — Pass, filter tabs and offline notice adapt cleanly (`largeText` layout).
- **Stage 3B boundary:** Physical USB Android phone testing is deferred to Stage 3B (`GM-33`/`GM-34`).
