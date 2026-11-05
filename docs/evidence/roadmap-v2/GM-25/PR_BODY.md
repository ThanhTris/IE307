## Summary & Context

This PR implements the Figma UI requirements and integration updates for **Task GM-25** ([Issue #86](https://github.com/ThanhTris/IE307/issues/86)), completing the UI flow for guest onboarding, Home session continuation, dish-only room setup, privacy-preserving public room preview, dietary preferences, and the live lobby.

Reference: Figma file `3Ysh0mOAEkAgA5DgZPSC1j`, revision `ui-figma-final/2026-10-25/GM-25.2`.
Reviewer: @ThanhTris

---

## Key Changes

1. **6 Figma Nodes Parity**:
   - `298:2309` [Mở app · Chọn cách tham gia]: Guest onboarding flow on first open (`GuestEntryScreen.tsx` on `/welcome`), distinct guest registration before entry.
   - `330:3067` [02 · Khách / Trang chủ / Tiếp tục phiên]: Restored guest identity display in `HomeScreen.tsx` on `/`, "Vào lại phòng đang dở" card for active sessions, quick action buttons.
   - `330:3068` [03 · Tạo phòng / Hẹn giờ / Tình huống]: Dish-only room creation (`CreateRoomEntryScreen.tsx` / `DishSetupFlow.tsx` on `/room/setup`), ADR-019 10–20 dishes, 0 raw GPS sharing, meal slot selection, quick timer presets (+15m, +1h, Ăn ngay).
   - `330:3069` [05 · Tham gia phòng / QR / Lỗi vào phòng]: 6-character room code input (`JoinRoomEntryScreen.tsx` on `/room/join-entry`), QR mode toggle, error feedback banner, and privacy-preserving public room preview.
   - `388:7816` [04 · Khẩu vị / Lưu nháp / Lỗi]: Dietary & taste preferences (`DishPreferencesScreen.tsx` in `DishSetupFlow.tsx`), draft saving with feedback banner, network failure retry action, and AIDD privacy audit panel.
   - `330:3070` [06 · Phòng chờ / Chủ phòng / Thành viên]: Clear host vs member role separation in `LobbyScreen.tsx` on `/room/lobby`, 20-member capacity, host-only "Bắt đầu chọn món" button.
2. **Ready Flow Removal (Consumer v4 / ADR-019)**:
   - Completely removed member ready buttons ("Tôi sẵn sàng") and waiting states from active lobby flow.
   - Host starts voting directly when the room meets starting criteria and the food pool is eligible.
   - Marked `setReady` as deprecated on `RoomRepository`.
3. **Canonical Dish Session V4 Dispatch & Public Room Preview**:
   - Implemented `previewJoin(code)` RPC on `RoomRepository` using `dish-session-v4/roadmap-v2/GM-07.B-supplement` with strict schema validation (`isPreviewJoinAck`), returning only `{ code, memberCount, capacity }` and returning `MALFORMED_RESPONSE` on invalid payload shapes (no fake 2/20 fixture).
   - Wired `joinRoom`, `getRoomSnapshot`, `startRound`, `leaveRoom`, `cancelRoom` to dispatch canonical `dish_session` v4 with fallback.
4. **Live Dish Setup Gateway & Idempotency**:
   - Wired `DishSetupFlow` via `LiveDishSetupGateway` to dispatch `create` and `updateSettings` with schema-compliant payload (`settings: { dishCount, mealSlot, desiredAt: null | string }`) preserving host's dishCount (10..20) without loss.
   - Preserved payload determinism across retries (frozen `desiredAt: null` for now).
   - Mapped errors cleanly: `INSUFFICIENT_DISHES` -> `SHORTAGE` (with `available` and `requested`), `VERSION_CONFLICT` -> `STALE`, `NETWORK_ERROR`/`TIMEOUT` -> `UNKNOWN`.
   - Propagated snapshot read errors without swallowing them to prevent unconfirmed state progression.
   - Injected durable `requestId` generator in `DishSetupRoute` (`/room/setup`).

---

## Verification & Test Results

- `npm run typecheck`: **Pass** (0 errors).
- `npm run check:architecture`: **Pass** (clean boundaries).
- Focused GM-25 Jest suites: **Pass** (including `gm25FigmaParity.test.tsx` and `roomRepository.test.ts`).
- Full mobile Jest suite (`npm test`): **Pass**.
- Repository validation (`validate_repository.py` & `task_readiness.py --check-docs`): **Pass**.
- `git diff --check`: **Pass** (clean whitespace, no conflict markers).

---

## Evidence & Limits

- Detailed parity report: [FIGMA_PARITY.md](FIGMA_PARITY.md)
- Output checks: [CHECKS.md](CHECKS.md)
- Handoff & 2-device acceptance scenario: [HANDOFF.md](HANDOFF.md)

*Note per AIDD guidelines*: Physical Android device execution and remote live backend staging verification remain **Not run** pending Trí's (`ThanhTris`) review.
