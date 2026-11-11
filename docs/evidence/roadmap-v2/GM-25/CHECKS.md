# Output checks — GM-25 / roadmap-v2

## PR #168 after product cleanup — 2026-11-11

The candidate was rebased onto main `51aeecd`, which includes PR #166.
The application change now belongs to `useLobby.ts`. The hook opens
voting from accepted active-round snapshots once per room/caller,
ignores polling responses after cleanup and keeps the newer snapshot
when a poll returns an older version. A Start ACK waits for the
accepted snapshot before navigation. The obsolete live/mock-mode
changes and their label-only tests were dropped during the rebase.

The task owner remains Trang and reviewer Trí. Vinh authored this
follow-up after reproducing the issue during GM-33.

| Check on the rebased application | Actual result |
| --- | --- |
| Typecheck, ESLint, architecture | Passed |
| Updated lobby regression file | 23 tests passed, including polling/reload for all four active-round states, stale version, delayed old-room response and Start ACK without an advanced snapshot |
| Full Jest | 70 suites and 1,359 tests passed, one suite and one test skipped |
| Python regression | 680 tests run, six skipped, no failures |
| Repository validator, task indexes, diff whitespace | Passed |
| Rebased APK: automatic P04 transition | Passed on two API 37 AVDs. Two independent guests entered Round 1 after host Start, without member reload; persisted roster = 2 and initial pool = 15 |
| Rebased APK: manual reload | Passed. In a second two-member, 15-dish room already started by the host, a controlled snapshot transport failure showed “Không tải được phòng”. After restoring transport, “Thử lại” opened Round 1 |
| Merge/output gate | `BLOCKED_ARTIFACTS`. The Project dependencies are Done, but main's output registry still refers to four files removed by #166 |

The gate reports GM-07's `mobile/src/data/api/mock.ts`, GM-10's
`mobile/src/features/context/screens/ContextScreen.tsx` and
`mobile/src/features/preferences/screens/PreferencesScreen.tsx`,
and GM-11's `mobile/src/features/rooms/screens/RoomStatusScreen.tsx`.
The cleanup's upstream artifact mappings need reconciliation before
the merge gate can pass. No Project approval was changed.

### Rebased native receipt and reproduction

Application source: `401ce514ce150a7a4e0d230fd95d1af158996adc`, main
`51aeecdf0a0337104d0f33cb5671689f308dc271` plus only the GM-25 application
correction. The subsequent follow-up changes tests and evidence, not app source.
No GM-26 patch was included. `useLobby.ts` SHA-256:
`e89fb3a5f79c209ca1928262af5706b451ba804341f73031e07b48ee5e8a7d5e`.

Owned, disposable GM-03 QA run: `gm25-rebase-1111b`. Manifest SHA-256:
`c03216b0e6c6571ffe0bb94f2c499384748800bfbb61f676ee80897fcd47d9ec`;
runtime seal: `7fbdccf4a31d2b923e420343a4b67079720e3aedbd40cad18891b9b95faffc8f`.
The producer start/verify commands passed, with Auth, REST and worker;
the canonical new-session switch was enabled only inside this owned QA DB.
Catalogue `dish-catalogue-v1:1.1.0`, 39 draft/test-only cards, source hash
`776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`.

APK SHA-256: `26956849da88625a3f7f3723c816723b42d6c9c79f2b50bb74e97633c7581c75`.
Expo 58.0.23; Node 24; two isolated Android API 37 ARM64 AVDs,
1080×2400, 420 dpi, font scale 1.0. The local release-variant QA build
uses embedded JS, debug signing, minification disabled and loopback-only
cleartext access. Generated native files/APK are local ignored artifacts;
no package, lockfile or production signing/configuration change is proposed.

Reproduce with two distinct guest sessions on this source and an owned,
verified GM-03 QA backend:

1. Host creates an immediate lunch room with 15 dishes and skips preferences.
   Member opens the native invitation link, confirms joining, skips preferences
   and opens the lobby. Host presses “Bắt đầu chọn món”. Both clients show
   “Bình chọn · Vòng 1” without a member action. Readback: round 1, pool 15,
   roster 2. No ballots are submitted.
2. Repeat in a second room. After host Start, restart the member into the
   normal lobby route, allowing Auth while injecting HTTP 503 only for
   snapshot reads through a local QA transport proxy. Observe the load error.
   Remove the snapshot fault and press “Thử lại”. Polling alone does not clear
   the load-error state; successful manual reload opens Round 1. Readback:
   round 1, pool 15, roster 2. Successful snapshots come from the real RPC.

Private captures remain local under `.work/gm33/`:

| Capture | SHA-256 |
| --- | --- |
| `gm25-rebase-b-C-auto-round-one.png` | `9401b4366211ddc78fc56f0889a3e598bae4e6bbfb98650140aedd05973e9d4d` |
| `gm25-rebase-b-C-reload-snapshot-error.png` | `a3fea392b284ae04c64d5ec9a78e2ac841ad9f9131ca41f624cedcd94e08d5c5` |
| `gm25-rebase-b-C-manual-reload-round-one.png` | `c1731077621a2474c8ef05886b9cfd0829e8e5f3388616eb5fe4bc0362867059` |

This rerun verifies P04 navigation on AVDs, not physical USB, full Figma
parity, GM-26 round submission or the full GM-33 pilot. No human acceptance
or Project status was changed.

The earlier combined APK results below are retained as historical
evidence. They do not establish execution on the rebased application.

## 2026-11-10 follow-up from the GM-33 USB pilot

The [GM-33 pilot PR](https://github.com/ThanhTris/IE307/pull/165) reproduced
two live-room issues on main `7913585`. After a host started the round,
a member stayed in the lobby through both polling and manual refresh.
Setup, preferences and the join receipt also showed fixture copy.

The local branch `codex/gm-25-live-lobby-followup` uses a snapshot of the
active round to open voting for the verified room member. Both polling
and reload share that transition, and repeat snapshots do not reopen
the screen. The live setup and receipt routes pass their mode to the
shared frames. Fixture routes retain their labels.

| Check | Result |
| --- | --- |
| Focused GM-25, setup and receipt suites | 60 tests passed. A cold concurrent run timed out in the existing guest-entry test and the retry passed |
| Full mobile suite | 81 suites passed, one skipped. 1,517 tests passed, one skipped |
| Static checks | TypeScript, ESLint, architecture boundaries and diff whitespace passed |
| Installed Android APK, two AVDs against owned QA | Independent guests created a lunch room with ten dishes and joined through a cold app link. Preview kept one member until confirm. Live setup, preferences and join receipt showed live copy. Both clients entered Round 1 after the host started, with no member reload or QA route |

The local APK used Expo 58.0.23 on Android API 37 AVDs and GM-03 run
`gm33-native-1110` with catalogue 1.1.0. The APK SHA-256 is
`63ae1430b900ac41fb361fe6e161830e6cdf6296ee7206b9b30594d21303874b`.
The USB phone's package installation awaited a Play Protect prompt.
This checkpoint covers the AVDs and the local GM-25 patch.

On the 2026-11-11 authorized USB retry, the physical API 35 phone
created a 20-dish lunch room, received a seven-dish dinner shortage
without creating a room, and canceled the setup room through its UI.
It then joined an AVD host through a cold native link and automatically
opened Round 1 when the host started. Live setup and receipt copy passed.
The combined local GM-25/GM-26 APK SHA-256 was
`a6046dfbf6b14f57736519f7ef66af6f7e8aea30de9284bf25d0b8db9b5c609c`;
owned QA was `gm33-usb-1111b`. The primary room had two members and
eleven dishes. The legacy edit-context route remains a separate gap
to reconcile with the pending product-cleanup PR #166.

## Earlier GM-25 baseline

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
| Focused GM-25 regression & parity suites | **Pass** | 9 suites / 92 tests passing (`gm25FigmaParity.test.tsx`, `roomRepository.test.ts`, `joinRoomEntry.test.tsx`, `createRoomEntry.test.tsx`, `lobbyAndStatusScreens.test.tsx`, `liveRoomLifecycle.test.tsx`, `dishSetupRoute.test.tsx`, `createEntryRoute.test.tsx`, `joinEntryRoute.test.tsx`). |
| Full mobile test suite (`npm test`) | **Pass** | 57/57 suites, 973/973 tests passed (0 failures). |
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
| `298:2309` [Mở app · Chọn cách tham gia] | Mở app chưa có session: hiện sheet nhập tên khách, 2 nút "Tạo kèo ăn" (Host) và "Tôi có mã phòng" (Member), tạo guest session trước khi điều hướng. | `GuestEntryScreen.tsx` trên `/welcome` + `SessionManager` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3067` [02 · Khách / Trang chủ / Tiếp tục phiên] | Hiển thị tên khách đã lưu, nút "Vào lại phòng đang dở" khi có session dở dang, nút tạo phòng / nhập mã, tùy chọn đổi/xóa phiên cục bộ. | `HomeScreen.tsx` trên `/` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3068` [03 · Tạo phòng / Hẹn giờ / Tình huống] | Form dish-only 10–20 món (ADR-019), chọn buổi ăn, preset hẹn giờ (+15p, +1h, Ăn ngay), kết nối API thật tạo phòng & cập nhật bối cảnh. | `CreateRoomEntryScreen.tsx` + `DishSetupFlow.tsx` qua `liveDishSetupGateway.ts` trên `/room/setup` | **Pass** (`gm25FigmaParity.test.tsx`, `dishSetupRoute.test.tsx`) |
| `330:3069` [05 · Tham gia phòng / QR / Lỗi vào phòng] | Ô nhập mã 6 ký tự, quét QR, public preview trước khi vào (chỉ hiện `{ code, memberCount, capacity }`, bảo mật tuyệt đối danh sách/phiếu/khẩu vị), banner lỗi khi mã sai/hết phòng. | `JoinRoomEntryScreen.tsx` + `previewJoin` RPC trên `/room/join-entry` | **Pass** (`gm25FigmaParity.test.tsx`, `roomRepository.test.ts`) |
| `388:7816` [04 · Khẩu vị / Lưu nháp / Lỗi] | Chọn khẩu vị cá nhân, lưu nháp thiết lập, xử lý lỗi kết nối/timeout máy chủ kèm nút thử lại, Privacy Audit Panel tuân thủ AIDD & ADR-019. | `DishSetupFlow.tsx` trên `/room/setup` | **Pass** (`gm25FigmaParity.test.tsx`) |
| `330:3070` [06 · Phòng chờ / Chủ phòng / Thành viên] | Giao diện phòng chờ phân quyền Host / Member; loại bỏ hoàn toàn luồng Ready theo v4; Host có nút "Bắt đầu chọn món"; Member có trạng thái chờ và nút "Rời phòng"; tối đa 20 người. | `LiveLobbyScreen.tsx` + `LobbyScreen.tsx` trên `/room/lobby` | **Pass** (`gm25FigmaParity.test.tsx`, `lobbyAndStatusScreens.test.tsx`) |

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
