## Summary & Context

This PR implements the Figma UI requirements and integration updates for **Task GM-25** ([Issue #86](https://github.com/ThanhTris/IE307/issues/86)), completing the UI flow for guest onboarding, Home session continuation, dish-only room setup, privacy-preserving public room preview, dietary preferences, and the live lobby.

Reference: Figma file `3Ysh0mOAEkAgA5DgZPSC1j`, revision `ui-figma-final/2026-10-25/GM-25.2`.

---

## Key Changes

1. **6 Figma Nodes Parity**:
   - `298:2309` [Mở app · Chọn cách tham gia]: Guest onboarding sheet on first open, distinct "Tạo kèo ăn" (Host) and "Tôi có mã phòng" (Member) actions, single session creation before navigation.
   - `330:3067` [02 · Khách / Trang chủ / Tiếp tục phiên]: Restored guest identity banner, "Vào lại phòng đang dở" card for active sessions, quick action buttons, safe local reset.
   - `330:3068` [03 · Tạo phòng / Hẹn giờ / Tình huống]: Dish-only room creation (ADR-019, 10–20 dishes, 0 raw GPS sharing), meal slot selection, quick timer presets (+15m, +1h, Ăn ngay), routed to `/room/setup`.
   - `330:3069` [05 · Tham gia phòng / QR / Lỗi vào phòng]: 6-character room code input, QR mode toggle, error feedback banner, and privacy-preserving public room preview.
   - `388:7816` [04 · Khẩu vị / Lưu nháp / Lỗi]: Dietary & taste preferences, draft saving with feedback banner, network failure retry action, and AIDD privacy audit panel.
   - `330:3070` [06 · Phòng chờ / Chủ phòng / Thành viên]: Clear host vs member role separation, 20-member capacity, host-only "Bắt đầu chọn món" button.
2. **Ready Flow Removal (Consumer v4 / ADR-019)**:
   - Completely removed member ready buttons ("Tôi sẵn sàng") and waiting states.
   - Host starts voting directly when the room meets starting criteria and the pool is eligible.
   - Marked `setReady` as deprecated on `RoomRepository`.
3. **Public Room Preview with Strict Privacy**:
   - Implemented `previewJoin(code)` RPC on `RoomRepository` and connected it to `JoinRoomEntryScreen`.
   - Exposes only `{ code, memberCount, capacity, isJoinable }` prior to joining.
   - Strictly blocks leakage of roster members, dietary preferences, or ballots before join confirmation.
4. **Live Dish Setup Gateway**:
   - Created `liveDishSetupGateway.ts` bridging `DishSetupFlow` to real backend RPCs (`createRoom`, `updateContext`, `listFriends`, `getRoomSnapshot`).
   - Wired `/room/setup` in real mode to mount `DishSetupFlow` backed by `LiveDishSetupGateway`.

---

## Verification & Test Results

- `npm run typecheck`: **Pass** (0 errors).
- `npm run check:architecture`: **Pass** (clean boundaries).
- Focused GM-25 Jest suites: **Pass** (9 suites / 81 tests passing, including `gm25FigmaParity.test.tsx` and `roomRepository.test.ts`).
- Full mobile Jest suite (`npm test`): **Pass** (57/57 suites, 962/962 tests passed).
- Repository validation (`validate_repository.py` & `task_readiness.py --check-docs`): **Pass**.
- `git diff --check`: **Pass** (clean whitespace, no conflict markers).

---

## Evidence & Limits

- Detailed parity report: [`docs/evidence/roadmap-v2/GM-25/FIGMA_PARITY.md`](docs/evidence/roadmap-v2/GM-25/FIGMA_PARITY.md)
- Output checks: [`docs/evidence/roadmap-v2/GM-25/CHECKS.md`](docs/evidence/roadmap-v2/GM-25/CHECKS.md)
- Handoff & 2-device acceptance scenario: [`docs/evidence/roadmap-v2/GM-25/HANDOFF.md`](docs/evidence/roadmap-v2/GM-25/HANDOFF.md)

*Note per AIDD guidelines*: Physical Android device execution and remote live backend staging verification remain **Not run** pending Trí's (`ThanhTris`) review.
