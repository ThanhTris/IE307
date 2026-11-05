# Bàn giao đầu ra task — GM-25 / roadmap-v2

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
| `mobile/src/features/home/screens/Gm25HomeScreen.tsx` | GM-25 | GM-25.2 | Route `/` ở real mode | Home Figma `298:2309` & `330:3067`: onboarding tên guest chủ động, hiển thị session dở dang, nút tạo/nhập mã phòng nhanh | UI Consumer |
| `mobile/src/features/rooms/screens/Gm25LiveLobbyScreen.tsx` | GM-25 | GM-25.2 | Route `/gm11/lobby` | Phòng chờ Figma `330:3070`: phân quyền Host/Member rõ ràng, loại bỏ luồng Ready theo v4/ADR-019, Host trực tiếp bắt đầu khi hợp lệ | UI Consumer |
| `mobile/tests/component/gm25FigmaParity.test.tsx` | GM-25 | GM-25.2 | `npm test -- tests/component/gm25FigmaParity.test.tsx` | 7 component tests bao phủ toàn diện 6 Figma nodes (`298:2309`, `330:3067`, `330:3068`, `330:3069`, `388:7816`, `330:3070`) | CI / Test Suite |
| `mobile/tests/unit/roomRepository.test.ts` | GM-25 | GM-25.2 | `npm test -- tests/unit/roomRepository.test.ts` | Unit tests bao phủ các phương thức RPC, đặc biệt `previewJoin` RPC và session errors | CI / Test Suite |
| `docs/evidence/roadmap-v2/GM-25/FIGMA_PARITY.md` | GM-25 | GM-25.2 | Đọc tài liệu đối chiếu | Báo cáo chi tiết ma trận đối chiếu 6 Figma nodes, kiến trúc dữ liệu và phân tích quyền riêng tư | Reviewer, Audit |

---

## 2. Acceptance criteria và trạng thái

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| **AC1: Đạt kiểm Android-API** | **Not run** | Android thật + backend test; xem [CHECKS.md](CHECKS.md) | Chưa kết nối thiết bị ADB hoặc backend staging từ xa. | Jest giả lập chứng minh tính tương thích contract, chưa thay cho kiểm thử thiết bị vật lý. |
| **AC2: Giữ nguyên layout UI Figma, không fallback fixture ở production** | **Pass (code path & test) / Not run (Android)** | Route guard và live gateway; xem [FIGMA_PARITY.md](FIGMA_PARITY.md) | 7/7 Figma parity tests và 962 mobile tests pass; route `/room/setup` gọi real gateway. | Cần kiểm tra hiển thị thực tế trên thiết bị vật lý ở các kích thước viewport. |
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
   - Bấm **"Xác nhận tạo phòng"** -> Gateway gọi RPC backend thật tạo phòng và chuyển thẳng vào `/gm11/lobby`.
   - Màn hình phòng chờ hiển thị: Mã phòng (ví dụ `GCD123`), danh sách 1 người (`Trang (Chủ phòng)`), nút **"Bắt đầu chọn món"** (tạm thời bị vô hiệu hóa vì phòng cần tối thiểu 1 thành viên tham gia hoặc theo điều kiện bắt đầu).

2. **Máy 2 (Member - Tuấn) — Figma `298:2309`, `330:3069`:**
   - Mở app chưa có session -> Nhập tên `Tuấn (Member)` -> Bấm **"Tôi có mã phòng"**.
   - Màn hình nhập mã mở ra -> Nhập mã phòng `GCD123`.
   - **Public Room Preview**: App gọi `previewJoin` hiển thị thông tin tóm tắt:
     - Mã phòng: `GCD123`
     - Số lượng thành viên hiện tại: `1/20 người`
     - *Bảo mật*: Không hiển thị danh sách tên thành viên, khẩu vị hay phiếu bầu.
   - Tuấn bấm **"Xác nhận vào phòng"** -> App gửi yêu cầu join chính thức -> Chuyển vào `/gm11/lobby`.

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
- [x] Đã tạo gateway `liveDishSetupGateway.ts` kết nối luồng thiết lập món với backend thật.
- [x] Đã bổ sung `previewJoin` RPC vào `RoomRepository` bảo đảm quyền riêng tư trước khi vào phòng.
- [x] Đã loại bỏ hoàn toàn luồng Ready trong UI phòng chờ theo ADR-019 và consumer v4.
- [x] Tất cả 9 bộ test focused GM-25 (81 tests) và toàn bộ 57 suites mobile (962 tests) đều vượt qua.
- [x] Typecheck 0 lỗi, architecture boundaries đạt chuẩn.
- [x] Phân biệt rõ ràng giữa kiểm thử tự động tổng hợp (Pass) và nghiệm thu thiết bị Android/backend thật (`Not run`).
- [ ] Reviewer Trí (`ThanhTris`) tiến hành kiểm tra mã nguồn, đối chiếu Figma và nghiệm thu theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).

> [!NOTE]
> Theo quy định của dự án (AGENTS.md), AI coding agent không tự ý chuyển trạng thái issue sang Done hoặc tự duyệt review. Trí (`ThanhTris`) sẽ trực tiếp kiểm tra và cập nhật trạng thái trên GitHub Project #2.
