# Bàn giao đầu ra task — GM-25 / roadmap-v2

## Local lobby correction from GM-33 — 2026-11-11

The candidate `codex/gm-25-live-lobby-followup` is based on main
`7913585`. It routes a verified member into voting after a refreshed
snapshot shows the active round, with one navigation per room/caller.
The live setup and receipt routes pass their mode into the shared
frames and retain fixture labels for the preview composition.

The [follow-up checks](CHECKS.md) record focused/full mobile regressions,
two-AVD execution and the authorized USB phone retry. The physical
phone passed 20-dish setup, below-minimum shortage, cold-link join,
live receipt and automatic lobby-to-vote for two members. The local
APK also included the separate GM-26 candidate. Review and integrate
the GM-25 source separately before receiving it as target-main evidence.

Task / owner / reviewer / track / stage: GM-25 / Trang (`rosy179`) / Trí (`ThanhTris`) / INTEGRATION / integration
PR / branch / target / tested source: Issue #86 / `issue86_figma_ui_gm25` -> `origin/main` (`0f522ed153ff2eb872a945953051419741e7235a`); local branch `issue86_figma_ui_gm25`
Contract version / schema version / dataset version: `ui-figma-final/2026-10-25/GM-25.2` / schema `0.3.0` (GM-19) / dataset `food-v1`
CHECKS.md / FIGMA_PARITY.md: [CHECKS.md](CHECKS.md) / [FIGMA_PARITY.md](FIGMA_PARITY.md)

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/rooms/services/roomRepository.ts` | GM-25 | GM-25.2 | `import { LiveRoomRepository, createRoomRepository } from '@/features/rooms'` | Interface `RoomRepository` thống nhất gọi 12 RPC backend thật, bổ sung `previewJoin` RPC trước khi vào phòng, đánh dấu deprecated `setReady` theo ADR-019, chuẩn hóa lỗi `ErrorCode` | GM-26, GM-27, GM-31 |
| `mobile/src/bootstrap/liveDishSetupGateway.ts` | GM-25 | GM-25.2 | `import { createLiveDishSetupGateway } from '@/bootstrap/liveDishSetupGateway'` | Gateway kết nối luồng thiết lập món `DishSetupFlow` với backend thật qua `RoomRepository` (`createRoom`, `updateContext`, `listFriends`, `getRoomSnapshot`) | UI Consumer |
| `mobile/src/bootstrap/DishSetupPreviewFlow.tsx` | GM-25 | GM-25.2 | `import { DishSetupPreviewFlow } from '@/bootstrap/DishSetupPreviewFlow'` | Flow preview thiết lập món ăn, hỗ trợ chuyển tiếp `onLobby` sang phòng chờ | UI Consumer |
| `mobile/src/app/room/setup.tsx` | GM-25 | GM-25.2 | Route `/room/setup` ở real mode | Khởi tạo và hiển thị `DishSetupFlow` được kết nối `LiveDishSetupGateway` trong real mode, điều hướng sang lobby khi hoàn tất | App Shell, GM-31 |
| `mobile/src/app/room/create-entry.tsx` | GM-25 | GM-25.2 | Route `/room/create-entry` | Màn hình khởi tạo phòng theo thiết kế Figma `330:3068`, kích hoạt chuyển tiếp sang `/room/setup` khi host xác nhận | UI Consumer |
| `mobile/src/app/room/create.tsx` | GM-25 | GM-25.2 | Route `/room/create` | Điều hướng thông minh: chuyển tiếp sang `CreateRoomEntryScreen` ở chế độ real, giữ backward compatibility ở mock mode | UI Consumer |
| `mobile/src/app/room/join-entry.tsx` | GM-25 | GM-25.2 | Route `/room/join-entry` | Màn hình nhập mã phòng theo Figma `330:3069`, kết nối `previewJoin` hiển thị số người hiện tại (bảo mật tuyệt đối thông tin chi tiết) | UI Consumer |
| `mobile/src/app/room/join.tsx` | GM-25 | GM-25.2 | Route `/room/join` | Điều hướng thông minh: chuyển tiếp sang `JoinRoomEntryScreen` ở chế độ real, giữ backward compatibility ở mock mode | UI Consumer |
| `mobile/src/features/home/screens/HomeScreen.tsx` | GM-25 | GM-25.2 | Route `/` ở real mode | Home Figma `330:3067`: hiển thị session đã khôi phục, banner tiếp tục phiên dở dang, nút tạo/nhập mã phòng nhanh | UI Consumer |
| `mobile/src/features/home/screens/GuestEntryScreen.tsx` | GM-25 | GM-25.2 | Route `/welcome` | Onboarding guest Figma `298:2309`: nhập tên khách (1..24 ký tự), kiểm tra validation, tạo session trước khi vào Home | UI Consumer |
| `mobile/src/features/rooms/screens/LiveLobbyScreen.tsx` | GM-25 | GM-25.2 | Route `/room/lobby` | Phòng chờ Figma `330:3070`: phân quyền Host/Member rõ ràng, loại bỏ luồng Ready theo v4/ADR-019, Host trực tiếp bắt đầu khi hợp lệ | UI Consumer |
| `mobile/tests/component/gm25FigmaParity.test.tsx` | GM-25 | GM-25.2 | `npm test -- tests/component/gm25FigmaParity.test.tsx` | 13 component tests bao phủ toàn diện 6 Figma nodes (`298:2309`, `330:3067`, `330:3068`, `330:3069`, `388:7816`, `330:3070`) | CI / Test Suite |
| `mobile/tests/unit/roomRepository.test.ts` | GM-25 | GM-25.2 | `npm test -- tests/unit/roomRepository.test.ts` | 26 unit tests bao phủ các phương thức RPC, đặc biệt `previewJoin`, canonical dish_session dispatch và session errors | CI / Test Suite |
| `docs/evidence/roadmap-v2/GM-25/FIGMA_PARITY.md` | GM-25 | GM-25.2 | Đọc tài liệu đối chiếu | Báo cáo chi tiết ma trận đối chiếu 6 Figma nodes, kiến trúc dữ liệu và phân tích quyền riêng tư | Reviewer, Audit |

---

## 2. Acceptance criteria và trạng thái

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| **AC1: Đạt kiểm Android-API** | **Not run** | Android thật + backend test; xem [CHECKS.md](CHECKS.md) | Chưa kết nối thiết bị ADB hoặc backend staging từ xa. | Jest giả lập chứng minh tính tương thích contract, chưa thay cho kiểm thử thiết bị vật lý. |
| **AC2: Giữ nguyên layout UI Figma, không fallback fixture ở production** | **Pass (code path & test) / Not run (Android)** | Route guard và live gateway; xem [FIGMA_PARITY.md](FIGMA_PARITY.md) | 13/13 Figma parity tests và 973 mobile tests pass; route `/room/setup` gọi real gateway. | Cần kiểm tra hiển thị thực tế trên thiết bị vật lý ở các kích thước viewport. |
| **AC3: Auth/session/validation/error, consent/history đúng thực tế** | **Pass (synthetic session tests) / Not run (GoTrue thật)** | `authSession.test.ts`, `roomRepository.test.ts`, `gm25FigmaParity.test.tsx` | SessionManager quản lý session trong bộ nhớ; API lỗi `AUTH_REQUIRED` khóa session và yêu cầu refresh rõ ràng. | Chưa kiểm thử trên máy chủ GoTrue trực tiếp. |
| **AC4: Nhiều máy nhận cùng snapshot, loại bỏ luồng Ready theo v4** | **Pass (contract & UI) / Not run (multi-client thật)** | `gm25FigmaParity.test.tsx`, `lobbyAndStatusScreens.test.tsx` | Đã loại bỏ nút "Tôi sẵn sàng" khỏi UI/RPC theo ADR-019; Host trực tiếp bắt đầu phiên. | Cần kiểm thử thời gian thực giữa 2 máy thật. |
| **AC5: Out-of-coverage/empty báo lý do server, không start pool rỗng** | **Pass (mocked contract) / Not run (server thật)** | `gm25FigmaParity.test.tsx`, `dishSetupFlow.test.tsx` | Khóa nút bắt đầu chọn món khi danh sách rỗng hoặc thiếu món hợp lệ. | Chưa có backend staging trực tiếp. |
| **AC6: Đầu vào/đầu ra và cách kiểm ghi trong HANDOFF.md** | **Pass (documentation)** | Tài liệu này và [FIGMA_PARITY.md](FIGMA_PARITY.md) | Ghi rõ cấu hình, file bổ sung và kịch bản 2 máy cập nhật. | Đầy đủ tài liệu bàn giao. |

---

## 3. Hướng dẫn cấu hình và nghiệm thu trên điện thoại Android thật

Để kiểm tra luồng tích hợp, dùng ít nhất một điện thoại Android thật và một client thứ hai với hai danh tính (identity) riêng biệt:

### 3.1. Cấu hình biến môi trường
Tạo file `mobile/.env.local`:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://<SUPABASE_TEST_HOST>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Khi dùng backend Supabase local qua USB, dùng reverse tunnel:
```powershell
adb reverse tcp:54321 tcp:54321
# Khi kiểm xong
adb reverse --remove tcp:54321
```

```ini
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### 3.2. Khởi chạy ứng dụng
1. Khởi động backend Supabase test hoặc local:
   ```powershell
   npx supabase start
   ```
2. Khởi động Expo Metro Bundler:
   ```powershell
   cd mobile
   npx expo start --clear
   ```
3. Mở app trên điện thoại Android bằng Expo Go hoặc development build.

### 3.3. Kịch bản kiểm thử 2 máy (Host & Member) — Cập nhật theo Figma & ADR-019 (No Ready Flow)

1. **Máy 1 (Host - Trang) — Figma `298:2309`, `330:3068`, `388:7816`:**
   - Mở app chưa có session -> Hiện sheet nhập tên khách -> Nhập `Trang (Host)` -> Bấm **"Tạo kèo ăn"**.
   - Session khách được lưu trong SecureStore; màn hình mở sang `/room/setup` (DishSetupFlow).
   - Chọn buổi ăn (ví dụ: *Bữa trưa*), hẹn giờ hoặc chọn *Ăn ngay*, điều chỉnh stepper từ 10–20 món.
   - Bấm **"Tiếp tục"** -> Cấu hình khẩu vị cá nhân (cay, ngọt, món kiêng).
   - Bấm **"Xác nhận tạo phòng"** -> Gateway gọi RPC canonical `dish_session` v4 (`create`) tạo phòng và chuyển thẳng vào `/room/lobby`.
   - Màn hình phòng chờ hiển thị: Mã phòng (ví dụ `GCD123`), danh sách 1 người (`Trang (Chủ phòng)`), nút **"Bắt đầu chọn món"** (tạm thời bị vô hiệu hóa vì phòng cần tối thiểu 1 thành viên tham gia hoặc theo điều kiện bắt đầu).

2. **Máy 2 (Member - Tuấn) — Figma `298:2309`, `330:3069`:**
   - Mở app chưa có session -> Nhập tên `Tuấn (Member)` -> Bấm **"Tôi có mã phòng"**.
   - Màn hình nhập mã mở ra (`/room/join-entry`) -> Nhập mã phòng `GCD123`.
   - **Public Room Preview**: App gọi `previewJoin` hiển thị thông tin tóm tắt:
     - Mã phòng: `GCD123`
     - Số lượng thành viên hiện tại: `1/20 người`
     - *Bảo mật*: Không hiển thị danh sách tên thành viên, khẩu vị hay phiếu bầu.
   - Tuấn bấm **"Xác nhận vào phòng"** -> App gửi yêu cầu join qua `dish_session` (`join`) -> Nhận receipt biên nhận vào phòng (`/room/preview`) -> Chuyển vào phòng chờ `/room/lobby`.

3. **Phòng chờ thời gian thực & Bắt đầu chọn món — Figma `330:3070` (Không Ready):**
   - Cả 2 máy đều cập nhật danh sách hiển thị: `Trang (Chủ phòng)` và `Tuấn`.
   - **Không có nút "Tôi sẵn sàng"**: Cả 2 bên không phải thực hiện bước Ready theo ADR-019.
   - Trên Máy 1 (Host), nút **"Bắt đầu chọn món"** được kích hoạt sáng màu xanh.
   - Trang bấm **"Bắt đầu chọn món"** -> Server chốt danh sách thành viên và kích hoạt chuyển trạng thái phòng sang Vòng 1 (Voting Round 1).
   - Cả 2 máy cùng chuyển màn hình sang giao diện chọn món Vòng 1.

4. **Trường hợp rời phòng hoặc hủy phòng:**
   - Trên Máy 2, nếu Tuấn bấm **"Rời phòng"**, Tuấn được đưa về màn hình chính Home (`330:3067`), Máy 1 thấy danh sách giảm còn 1 người.
   - Nếu Host bấm hủy phòng, tất cả các thành viên nhận thông báo phòng đã bị hủy.

---

## 4. Checklist người nhận (Receiver Checklist)

- [x] Đã tích hợp đầy đủ 6 Figma nodes (`298:2309`, `330:3067`, `330:3068`, `330:3069`, `388:7816`, `330:3070`).
- [x] Có tài liệu đối chiếu chi tiết [FIGMA_PARITY.md](FIGMA_PARITY.md).
- [x] Đã tạo gateway `liveDishSetupGateway.ts` kết nối luồng thiết lập món với backend thật qua canonical `dish_session` v4.
- [x] Đã bổ sung `previewJoin` RPC vào `RoomRepository` bảo đảm quyền riêng tư trước khi vào phòng.
- [x] Đã loại bỏ hoàn toàn luồng Ready trong UI phòng chờ theo ADR-019 và consumer v4.
- [x] Tất cả 9 bộ test focused GM-25 (92 tests) và toàn bộ 57 suites mobile (973 tests) đều vượt qua.
- [x] Typecheck 0 lỗi, architecture boundaries đạt chuẩn.
- [x] Phân biệt rõ ràng giữa kiểm thử tự động tổng hợp (Pass) và nghiệm thu thiết bị Android/backend thật (`Not run`).
- [ ] Reviewer Trí (`ThanhTris`) tiến hành kiểm tra mã nguồn, đối chiếu Figma và nghiệm thu theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).

---

## 5. Giải quyết các điểm review của Trí trên PR #155 (Comment #6648157610)

1. **[P1] Gateway real đang tạo/cập nhật phòng qua API legacy:**
   - `liveDishSetupGateway.ts` đã chuyển hoàn toàn sang dispatch canonical `dish_session` v4 với command `'create'` và `'updateSettings'`, `contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement'`, gửi `settings: { dishCount, mealSlot, desiredAt }` (đúng 3 key, loại bỏ anchorId và radiusM).
2. **[P1] Preview dùng B cũ, sau xác nhận lại join bằng legacy:**
   - Đã nâng cấp `previewJoin` sang `contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement'`.
   - `joinRoom` trong `roomRepository.ts` dispatch canonical `dish_session` v4 với command `'join'`, sau đó điều hướng qua receipt rồi vào `/room/lobby` (có fallback tương thích cho legacy room).
3. **[P1] Route real dùng request ID mặc định dành cho mock:**
   - `setup.tsx` đã inject generator `createDurableRequestId('setup')` qua `generateRequestId` prop, không dùng default mockRequestId.
4. **[P1] Mất phản hồi ACK bị coi là từ chối chắc chắn; retry đổi payload:**
   - `liveDishSetupGateway.ts` map lỗi chính xác: `INSUFFICIENT_DISHES` -> `SHORTAGE` (kèm `available` và `requested`), `VERSION_CONFLICT` -> `STALE`, `NETWORK_ERROR`/`TIMEOUT` -> `UNKNOWN` (giữ intent để retry), terminal/expired -> `CLOSED`.
   - Đóng băng payload retry: `desiredAt: null` cho mode 'now', tránh sinh lại timestamp gây hỏng tính idempotent.
5. **[P2] Response preview lỗi cấu trúc được biến thành số người giả:**
   - Schema guard `isPreviewJoinAck` xác thực chặt chẽ `joinable`, `memberCount` (0..20), `memberLimit: 20`, `dishCount` (10..20), `mealSlot`, `roomState`. Trả về `MALFORMED_RESPONSE` khi response rỗng/null hoặc sai cấu trúc; map `reasonCode` sang mã lỗi (`ROOM_FULL`, `ROOM_LOCKED`, v.v.), không fallback fake count.
6. **[P2] Đọc snapshot thất bại vẫn được coi là đã xác nhận trạng thái server:**
   - `liveDishSetupGateway.read()` throw error khi snapshot read thất bại để UI hiển thị retry thay vì đánh lừa trạng thái connected. Tải `accountDefaults` thật từ server qua `getDefaultPreferences` và kiểm tra `canEditSettings: snap.hostUserId === currentUser.id`.
7. **[P2] Sửa evidence và link:**
   - Sửa 3 link relative trong `PR_BODY.md` trỏ đến `[FIGMA_PARITY.md](FIGMA_PARITY.md)`, `[CHECKS.md](CHECKS.md)`, `[HANDOFF.md](HANDOFF.md)`.
   - `FIGMA_PARITY.md` và `CHECKS.md`/`HANDOFF.md` đối chiếu chính xác các file mã nguồn thật trên `main` (`GuestEntryScreen.tsx` `/welcome`, `HomeScreen.tsx` `/`, `CreateRoomEntryScreen.tsx` `/room/create-entry`, `JoinRoomEntryScreen.tsx` `/room/join-entry`, `DishSetupFlow.tsx` `/room/setup`, `LobbyScreen.tsx` `/room/lobby`).

> [!NOTE]
> Theo quy định của dự án (AGENTS.md), AI coding agent không tự ý chuyển trạng thái issue sang Done hoặc tự duyệt review. Trí (`ThanhTris`) sẽ trực tiếp kiểm tra và cập nhật trạng thái trên GitHub Project #2.

## PR #155 follow-up — 2026-11-05

This supplement is based on review target `aca4b8cead3135f1cd60e642c9e0124753e6d2db`; publication of the patch does not record review approval or Project acceptance. The canonical snapshot guard validates phase and candidate count separately from initial `dishCount`: lobby/R1 require the locked initial 10–20 pool, R2 accepts 1–20 remaining candidates including N=1, and valid `NO_CONSENSUS` has an empty pool, null winner, and empty podium. R2 with zero candidates is not an active-round snapshot; the server must end it as `ALL_REMOVED`.

Multi-step settings/preferences/consent writes retain each acknowledged step. Unknown outcomes replay the exact pending request ID and payload; version conflicts refetch the authoritative snapshot and create a new request only for the still-pending change. Readback is required before reporting completion, unrelated preference fields are preserved, and an identity change aborts the old account's write chain. Account history consent is read through GM-21's authenticated caller-only `get_history_consent`; the existing preference checkbox controls only `personal`, while `group` remains independent. Missing settings return false; read errors remain unknown and do not silently uncheck consent.

Regression coverage is in `mobile/tests/unit/pr155ReviewCurrent.test.ts`, `mobile/tests/unit/pr155RemainingFlows.test.ts`, API response/mock tests, and GM-25 component tests. Final local mobile checks on this worktree passed: 59 Jest suites / 1,016 tests, typecheck, lint, architecture guard, and Expo SDK dependency compatibility. Expo emitted its offline-mode reliability notice. Device/Expo Go visual verification remains separate from Jest/API results and must not be inferred from this handoff.
