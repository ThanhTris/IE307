# Bàn giao đầu ra task — GM-25 / roadmap-v2

Task / owner / reviewer / track / stage: GM-25 / Trang (`rosy179`) / Trí (`ThanhTris`) / INTEGRATION / integration
PR / branch / target / tested source: PR #124 / `continue_task_gm_twenty_five` -> `origin/main` (`4a8cd64`); local uncommitted API-recovery follow-up based on `11fe8a7`
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-25.1` / schema `0.3.0` (GM-19) / dataset `food-v1`
CHECKS.md / tested revision: [CHECKS.md](CHECKS.md) / local uncommitted follow-up on `continue_task_gm_twenty_five`; not pushed yet

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/rooms/services/roomRepository.ts` | GM-25 | GM-25.1 | `import { LiveRoomRepository, createRoomRepository } from '@/features/rooms'` | Interface `RoomRepository` thống nhất gọi 12 RPC backend thật, chuẩn hóa lỗi `ErrorCode`, taxonomy UUIDs chuẩn hóa | GM-26, GM-27, GM-31 |
| `mobile/src/features/rooms/index.ts` | GM-25 | GM-25.1 | `import { LiveRoomRepository } from '@/features/rooms'` | Barrel export đầy đủ các room services, hooks và screens | GM-26, GM-27 |
| `mobile/src/bootstrap/RoomRepositoryProvider.tsx` | GM-25 | GM-25.1 | `import { useRoomRepository, RoomRepositoryProvider } from '@/bootstrap/RoomRepositoryProvider'` | Context provider quản lý session, toggle real/mock adapter ở composition root, strict error khi thiếu public key | App Shell, GM-31 |
| `mobile/src/bootstrap/AppProviders.tsx` | GM-25 | GM-25.1 | `import { AppProviders } from '@/bootstrap/AppProviders'` | Wrap toàn bộ app với `RoomRepositoryProvider` và `SafeAreaProvider` | App Bootstrap |
| `mobile/src/features/home/screens/Gm25HomeScreen.tsx` | GM-25 | GM-25.1 | Route `/` ở real mode | Home có onboarding tên guest chủ động, khôi phục phiên một lần và chỉ mở đích sau khi identity sẵn sàng | UI Consumer |
| `mobile/src/features/rooms/screens/Gm25CreateRoomScreen.tsx` | GM-25 | GM-25.1 | Route `/create-room` ở real mode | Biến thể GM-25 nhận display name từ identity hiện hành; UI GM-09 gốc được giữ nguyên | UI Consumer |
| `mobile/src/features/rooms/screens/Gm25JoinRoomScreen.tsx` | GM-25 | GM-25.1 | Route `/join-room` ở real mode | Biến thể GM-25 nhận display name từ identity hiện hành; UI GM-09 gốc được giữ nguyên | UI Consumer |
| `mobile/src/features/rooms/screens/Gm25LiveLobbyScreen.tsx` | GM-25 | GM-25.1 | Route `/gm11/lobby` | Biến thể tích hợp live/mock khóa thao tác nếu `currentUserId` thiếu hoặc không thuộc roster; UI GM-11 gốc được giữ nguyên | UI Consumer |
| `mobile/src/app/create-room.tsx` | GM-25 | GM-25.1 | Mở route `/create-room` trên app | Tạo phòng thật trên backend, điều hướng sang `/room-preview` | UI Consumer |
| `mobile/src/app/join-room.tsx` | GM-25 | GM-25.1 | Mở route `/join-room` trên app | Vào phòng bằng mã code thật, điều hướng sang `/room-preview` | UI Consumer |
| `mobile/src/app/room-preview.tsx` | GM-25 | GM-25.1 | Mở route `/room-preview` trên app | Hiển thị receipt phòng thật kèm nút chuyển sang Khẩu vị và Phòng chờ | UI Consumer |
| `mobile/src/app/gm10/context.tsx` | GM-25 | GM-25.1 | Mở route `/gm10/context` kèm `roomId` | Chỉnh sửa bối cảnh phòng thật thông qua `updateContext`; không fallback fixture khi thiếu id | UI Consumer |
| `mobile/src/app/gm10/preferences.tsx` | GM-25 | GM-25.1 | Mở route `/gm10/preferences` kèm `roomId` | Cập nhật khẩu vị cá nhân thông qua `updatePreferences`; không fallback fixture khi thiếu id | UI Consumer |
| `mobile/src/app/gm11/lobby.tsx` | GM-25 | GM-25.1 | Mở route `/gm11/lobby` kèm `roomId` | Phòng chờ thật: refresh snapshot, conflict recovery, durable request IDs, start button guard | UI Consumer |
| `mobile/tests/unit/roomRepository.test.ts` | GM-25 | GM-25.1 | `npm test -- tests/unit/roomRepository.test.ts` | Unit tests bao phủ các phương thức RPC, session identity và lỗi auth | CI / Test Suite |
| `mobile/tests/component/gm25ReviewFeedback.test.tsx` | GM-25 | GM-25.1 | `npm test -- tests/component/gm25ReviewFeedback.test.tsx` | 17 tests, gồm onboarding, route guard, session identity recovery, lobby identity và các hồi quy GM-25 | CI / Test Suite |

---

## 2. Acceptance criteria và trạng thái

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| **AC1: Đạt kiểm Android-API** | **Not run** | Android thật + backend test; xem [CHECKS.md](CHECKS.md) | Chưa có điện thoại ADB kết nối hoặc xác nhận backend test hiện hành. | Jest/HTTP giả lập chỉ là regression tự động, chưa chứng minh app gọi backend thật. |
| **AC2: Giữ nguyên layout UI, không fallback fixture ở production** | **Pass (code path) / Not run (Android)** | Route guard và composition root; xem [CHECKS.md](CHECKS.md) | Unit/component tests kiểm đường đi; cần kiểm thêm trên bản app chạy thật. | Architecture check không phải nghiệm thu production. |
| **AC3: Auth/session/validation/error, consent/history đúng thực tế** | **Pass (synthetic session tests) / Not run (GoTrue thật)** | `authSession.test.ts`, `roomRepository.test.ts`, `gm25ReviewFeedback.test.tsx` | Test dùng SessionManager thật trong bộ nhớ; API `AUTH_REQUIRED` khóa identity, chặn request cũ và cần thao tác refresh rõ ràng trước khi gọi tiếp. | Chưa xác minh endpoint hoặc migration/RPC đang deploy. |
| **AC4: Nhiều máy nhận cùng snapshot, reset ready khi bối cảnh đổi** | **Not run (multi-client API)** | Chạy kịch bản mục 3 bằng một Android và client thứ hai | Regression conflict/polling chỉ kiểm UI với API giả lập. | Chưa có bằng chứng đồng bộ server giữa hai identity. |
| **AC5: Out-of-coverage/empty báo lý do server, không start pool rỗng** | **Pass (mocked contract) / Not run (server thật)** | Component tests và backend test environment | Test xác nhận UI khóa thao tác theo response giả lập. | Không tuyên bố parity hay coverage thật. |
| **AC6: Đầu vào/đầu ra và cách kiểm ghi trong HANDOFF.md** | **Pass (documentation)** | File này | Lệnh và giới hạn thiết bị/backend được ghi dưới đây. | Không thay cho kiểm trên Android và backend. |

---

## 3. Hướng dẫn cấu hình và nghiệm thu trên điện thoại Android thật

Để kiểm tra luồng tích hợp, dùng ít nhất một điện thoại Android thật và một client thứ hai với hai identity riêng:

### 3.1. Cấu hình biến môi trường
Tạo file `mobile/.env.local` (hoặc cấu hình environment variables cho Expo):
```ini
EXPO_PUBLIC_SUPABASE_URL=https://<SUPABASE_TEST_HOST>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Chọn endpoint HTTPS mà điện thoại truy cập được. GM-16 từ chối HTTP LAN/emulator; không tắt kiểm chứng TLS.

Khi dùng backend Supabase local qua USB, thay URL bằng loopback và tạo reverse tunnel từ điện thoại tới máy tính:

```powershell
adb reverse tcp:54321 tcp:54321
# Khi kiểm xong
adb reverse --remove tcp:54321
```

```ini
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

Metro và backend là hai endpoint riêng. QR/tunnel Expo chỉ đưa bundle Metro tới thiết bị; nó không mở đường tới Supabase. Ghi riêng Metro URL và backend URL khi nghiệm thu.

### 3.2. Khởi chạy ứng dụng
1. Chọn backend HTTPS test mà điện thoại truy cập được, hoặc Supabase local qua USB như mục trên. Với backend test, trước khi dùng endpoint cần đối chiếu migration ledger và các RPC đã deploy; health GoTrue không chứng minh schema/RPC khớp revision hiện tại. Khởi động backend Supabase local chỉ tạo môi trường local riêng, không đồng bộ hay xác nhận database đang chạy của dự án:
   ```powershell
   # Trong thư mục dự án
   npx supabase start
   ```
2. Khởi động Expo Metro Bundler riêng:
   ```powershell
   cd mobile
   npx expo start --clear
   ```
3. Mở app trên điện thoại Android bằng Expo Go hoặc development build. Dùng client thứ hai đăng nhập bằng identity khác.

### 3.3. Kịch bản kiểm thử 2 máy (Host & Member)
1. **Máy 1 (Host - Trang):**
   - Mở app chưa có session -> Bấm **"Tạo kèo ăn"** -> nhập `Trang (Host)` trong sheet guest -> xác nhận.
   - Chờ guest session được tạo/lưu; chỉ sau đó màn tạo phòng và discovery mới mở.
   - Chọn bối cảnh ăn uống -> Bấm **"Tạo phòng"**.
   - Màn hình hiển thị mã phòng (ví dụ `GCD123`).
   - Bấm **"Xem bước phòng chờ"** -> Vào `/gm11/lobby`. Trạng thái: Host đang ở trong phòng chờ.
2. **Máy 2 (Member - Tuấn):**
   - Mở app chưa có session -> Bấm **"Tôi có mã phòng"** -> nhập `Tuấn (Member)` trong sheet guest -> xác nhận.
   - Chờ guest session được tạo/lưu; sau đó nhập mã phòng `GCD123`.
   - Bấm **"Vào phòng"** -> Màn hình hiển thị thông tin phòng -> Bấm **"Xem bước phòng chờ"**.
   - Cả 2 máy đều hiển thị danh sách 2 thành viên: `Trang (Host)` và `Tuấn`.
3. **Thao tác Ready & Bắt đầu:**
   - Trên Máy 2, Tuấn bấm **"Tôi sẵn sàng"** -> Máy 1 thấy Tuấn chuyển sang trạng thái "Sẵn sàng".
   - Trên Máy 1, Trang bấm **"Tôi sẵn sàng"** -> Nút **"Bắt đầu chọn món"** trên Máy 1 được kích hoạt.
   - Trang bấm **"Bắt đầu chọn món"** -> Server chuyển trạng thái phòng sang vòng 1.
4. **Kiểm tra Reset Ready khi đổi bối cảnh:**
   - Trước khi bắt đầu, nếu Host bấm **"Chỉnh sửa bối cảnh"** và thay đổi giờ ăn hoặc ngân sách, server cập nhật và cờ "Sẵn sàng" của cả hai thành viên tự động đặt lại về chưa sẵn sàng.

5. **Khôi phục sau khi API từ chối session:**
   - Cho API test trả `401/AUTH_REQUIRED` cho một request đang đăng nhập.
   - Xác nhận identity đang hoạt động bị ẩn, Home/route guard hiện nút **"Thử khôi phục phiên"**, và request tiếp theo không gửi lại token cũ.
   - Bấm khôi phục; client refresh session trước khi tải dữ liệu lại. Nếu refresh bị từ chối, UI chuyển sang trạng thái xóa phiên cục bộ trước khi tạo phiên khách mới.

Kịch bản này có regression tổng hợp; chưa chạy trên GoTrue/backend test hoặc thiết bị Android thật.

Các bước trên là kịch bản nghiệm thu cần chạy, chưa phải bằng chứng đã chạy. Bản hiện tại chỉ có regression tổng hợp; không có thiết bị ADB hoặc backend đã xác minh.

---

## 4. Checklist người nhận (Receiver Checklist)

- [x] Upstream được review đúng scope và revision: GM-07, GM-09, GM-10, GM-11, GM-16, GM-19, GM-21, GM-24 đã có mặt trên `main`.
- [x] File và hướng dẫn đủ chạy từ clone sạch; không có file placeholder hoặc hardcoded mock ở production mode.
- [x] Input/output/errors/nullability/version đúng contract `food-v1/roadmap-v2/GM-25.1`.
- [ ] Kết quả Jest/Python phải lấy từ revision hiện hành trong [CHECKS.md](CHECKS.md); số của revision cũ không áp dụng cho bản này.
- [ ] Không tuyên bố đã xử lý toàn bộ review. Hai lỗi onboarding/session identity được kiểm lại bằng regression ở revision mới; Android/backend thật còn `Not run`.
- [x] Đã phân biệt kiểm thử tổng hợp với nghiệm thu thiết bị/backend thật (`Not run`).
- [ ] Reviewer Trí (`ThanhTris`) tiến hành kiểm tra mã nguồn, đối chiếu revision và nghiệm thu theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).

> [!NOTE]
> Theo quy định của dự án và chỉ dẫn của người dùng, AI coding agent không tự ý chuyển trạng thái issue sang Done hoặc tự duyệt review. Trí (`ThanhTris`) sẽ trực tiếp kiểm tra và cập nhật trạng thái trên GitHub Project #2.
