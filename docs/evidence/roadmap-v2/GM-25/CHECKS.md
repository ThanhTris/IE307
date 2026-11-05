# Output checks — GM-25 / roadmap-v2

Status: Automated regressions, 6 Figma nodes parity, room repository RPCs, and full mobile test suites pass on branch issue86_figma_ui_gm25; physical Android device acceptance and remote backend staging verification remain pending.
Task: GM-25 — UI–API guest, Home, phòng, khẩu vị và lobby
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`)
PR / branch: Issue #86 / `issue86_figma_ui_gm25`
Base: `origin/main` `0f522ed153ff2eb872a945953051419741e7235a`
Tested source: local branch `issue86_figma_ui_gm25` based on `origin/main`; full UI parity across 6 Figma nodes, dish setup live gateway integration, public preview before join with privacy preservation, and complete removal of ready flow per v4 consumer rules.
Contract: `ui-figma-final/2026-10-25/GM-25.2`; Expo SDK `57.0.30`; Node/npm from the Expo baseline.

## Reproduce

From `mobile/`:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run test:expo-baseline
npm test -- tests/component/gm25FigmaParity.test.tsx tests/unit/roomRepository.test.ts tests/component/dishSetupRepair.test.tsx
npm run typecheck
npm run check:architecture
npm test
```

From the repository root:

```powershell
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

## Results on this local revision

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | **Pass** | Installed 1,346 packages from `mobile/package-lock.json`. No manifest or lockfile changes. |
| `npm run check:expo` | **Pass with environment note** | Expo SDK `57.0.30`; installed dependencies match the lockfile. |
| `npm run test:expo-baseline` | **Pass** | 5/5 baseline tests pass. |
| Focused GM-25 regression & parity suites | **Pass** | 9 suites / 81 tests passing (`gm25FigmaParity.test.tsx`, `roomRepository.test.ts`, `joinRoomEntry.test.tsx`, `createRoomEntry.test.tsx`, `lobbyAndStatusScreens.test.tsx`, `liveRoomLifecycle.test.tsx`, `dishSetupRoute.test.tsx`, `createEntryRoute.test.tsx`, `joinEntryRoute.test.tsx`). |
| Full mobile test suite (`npm test`) | **Pass** | 57/57 suites, 962/962 tests passed (0 failures). |
| `npm run typecheck` | **Pass** | 0 TypeScript errors under strict mode. |
| `npm run check:architecture` | **Pass** | Clean architectural boundaries; no layer violations. |
| `python scripts/validate_repository.py` | **Pass** | Documents, links, JSON, task manifest, dependencies and current FR traceability OK. |
| `python scripts/task_readiness.py --check-docs` | **Pass** | Task indexes match task metadata. |
| `git diff --check` | **Pass** | Clean diff with no whitespace errors, trailing spaces, or conflict markers. |
| `python -m unittest discover -s tests -p "test_*.py"` | **Pass with OS note** | 658 tests (657 passed, 1 error in `test_stage_refuses_symlink_output` due to Windows non-admin `[WinError 1314] Symlink privilege not held`; unchanged from upstream `91d0c2b`). |
| Android + backend integration | **Not run** | Android SDK `adb devices -l` returned an empty device list. Remote backend live staging verification pending Trí's review. |

## Figma Parity and Behavioral Mapping

| Figma Node / Scope | Expected Behavior | Implementation & Route | Result |
| --- | --- | --- | --- |
| `298:2309` [Mở app · Chọn cách tham gia] | Mở app chưa có session: hiện sheet nhập tên khách, 2 nút "Tạo kèo ăn" (Host) và "Tôi có mã phòng" (Member), tạo guest session trước khi điều hướng. | `Gm25HomeScreen.tsx` + `SessionManager` trên `/` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3067` [02 · Khách / Trang chủ / Tiếp tục phiên] | Hiển thị tên khách đã lưu, nút "Vào lại phòng đang dở" khi có session dở dang, nút tạo phòng / nhập mã, tùy chọn đổi/xóa phiên cục bộ. | `Gm25HomeScreen.tsx` trên `/` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3068` [03 · Tạo phòng / Hẹn giờ / Tình huống] | Form dish-only 10–20 món (ADR-019), chọn buổi ăn, preset hẹn giờ (+15p, +1h, Ăn ngay), kết nối API thật tạo phòng & cập nhật bối cảnh. | `CreateRoomEntryScreen.tsx` + `DishSetupFlow.tsx` qua `liveDishSetupGateway.ts` trên `/room/setup` | **Pass** (`gm25FigmaParity.test.tsx`, `dishSetupRoute.test.tsx`) |
| `330:3069` [05 · Tham gia phòng / QR / Lỗi vào phòng] | Ô nhập mã 6 ký tự, quét QR, public preview trước khi vào (chỉ hiện `{ code, memberCount, capacity }`, bảo mật tuyệt đối danh sách/phiếu/khẩu vị), banner lỗi khi mã sai/hết phòng. | `JoinRoomEntryScreen.tsx` + `previewJoin` RPC trên `/room/join-entry` | **Pass** (`gm25FigmaParity.test.tsx`, `roomRepository.test.ts`) |
| `388:7816` [04 · Khẩu vị / Lưu nháp / Lỗi] | Chọn khẩu vị cá nhân, lưu nháp thiết lập, xử lý lỗi kết nối/timeout máy chủ kèm nút thử lại, Privacy Audit Panel tuân thủ AIDD & ADR-019. | `DishSetupFlow.tsx` trên `/room/setup` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3070` [06 · Phòng chờ / Chủ phòng / Thành viên] | Giao diện phòng chờ phân quyền Host / Member; loại bỏ hoàn toàn luồng Ready theo v4; Host có nút "Bắt đầu chọn món"; Member có trạng thái chờ và nút "Rời phòng"; tối đa 20 người. | `Gm25LiveLobbyScreen.tsx` + `LobbyScreen.tsx` trên `/gm11/lobby` | **Pass** (`gm25FigmaParity.test.tsx`, `lobbyAndStatusScreens.test.tsx`) |

## Acceptance status

| AC | Status | Evidence / limitation |
| --- | --- | --- |
| AC1 Android calls the real API | **Not run** | Automated mocks do not establish Android transport, GoTrue, or deployed RPC behavior. |
| AC2 real mode uses guarded live routes | **Pass (automated) / Not run (Android)** | Provider/session gates, dish setup gateway, and architecture check pass; physical device run pending. |
| AC3 session, identity, validation, and errors | **Pass (synthetic) / Not run (real auth)** | 81 focused tests plus 962 full mobile tests pass; real GoTrue endpoint pending. |
| AC4 multi-client snapshots (no ready flow in v4) | **Not run (real multi-client)** | Conflict/polling UI tests pass with synthetic responses; real server sync pending. |
| AC5 real eligibility/coverage responses | **Pass (synthetic contract) / Not run (server thật)** | Host start button guard and empty-pool rejection covered; live catalogue assertion pending. |
| AC6 handoff is reproducible and truthful | **Pass (documentation)** | [HANDOFF.md](HANDOFF.md) and [FIGMA_PARITY.md](FIGMA_PARITY.md) provide comprehensive reproducible guidelines and state boundaries. |

No Android device, backend test, or live deployment result is marked Pass here. Do not use this automated evidence to mark GM-25 Done or merge; Trí owns final review and acceptance.
