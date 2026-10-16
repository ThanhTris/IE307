# Bàn giao đầu ra task — GM-25 / roadmap-v2

Task / owner / reviewer / track / stage: GM-25 / Trang (`rosy179`) / Trí (`ThanhTris`) / INTEGRATION / integration  
PR / branch / target / commit: `continue_task_gm_twenty_five` -> `origin/main` (`daa9174`)  
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-25.1` / schema `0.3.0` (GM-19) / dataset `food-v1`  
CHECKS.md / tested revision: [CHECKS.md](CHECKS.md) / HEAD `daa9174` + uncommitted changes  

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/rooms/services/roomRepository.ts` | GM-25 | GM-25.1 | `import { LiveRoomRepository, createRoomRepository } from '@/features/rooms'` | Interface `RoomRepository` thống nhất gọi 12 RPC backend thật, chuẩn hóa lỗi `ErrorCode` | GM-26, GM-27, GM-31 |
| `mobile/src/features/rooms/index.ts` | GM-25 | GM-25.1 | `import { LiveRoomRepository } from '@/features/rooms'` | Barrel export đầy đủ các room services, hooks và screens | GM-26, GM-27 |
| `mobile/src/bootstrap/RoomRepositoryProvider.tsx` | GM-25 | GM-25.1 | `import { useRoomRepository, RoomRepositoryProvider } from '@/bootstrap/RoomRepositoryProvider'` | Context provider quản lý session, toggle real/mock adapter ở composition root | App Shell, GM-31 |
| `mobile/src/bootstrap/AppProviders.tsx` | GM-25 | GM-25.1 | `import { AppProviders } from '@/bootstrap/AppProviders'` | Wrap toàn bộ app với `RoomRepositoryProvider` và `SafeAreaProvider` | App Bootstrap |
| `mobile/src/app/create-room.tsx` | GM-25 | GM-25.1 | Mở route `/create-room` trên app | Tạo phòng thật trên backend, điều hướng sang `/room-preview` | UI Consumer |
| `mobile/src/app/join-room.tsx` | GM-25 | GM-25.1 | Mở route `/join-room` trên app | Vào phòng bằng mã code thật, điều hướng sang `/room-preview` | UI Consumer |
| `mobile/src/app/room-preview.tsx` | GM-25 | GM-25.1 | Mở route `/room-preview` trên app | Hiển thị receipt phòng thật kèm nút chuyển sang Khẩu vị và Phòng chờ | UI Consumer |
| `mobile/src/app/gm10/context.tsx` | GM-25 | GM-25.1 | Mở route `/gm10/context` kèm `roomId` | Chỉnh sửa bối cảnh phòng thật thông qua `updateContext` | UI Consumer |
| `mobile/src/app/gm10/preferences.tsx` | GM-25 | GM-25.1 | Mở route `/gm10/preferences` kèm `roomId` | Cập nhật khẩu vị cá nhân thông qua `updatePreferences` | UI Consumer |
| `mobile/src/app/gm11/lobby.tsx` | GM-25 | GM-25.1 | Mở route `/gm11/lobby` kèm `roomId` | Phòng chờ thật: refresh snapshot, tôi sẵn sàng, bắt đầu chọn món, hủy phòng, rời phòng | UI Consumer |
| `mobile/src/features/rooms/screens/LobbyScreen.tsx` | GM-25 | GM-25.1 | Component `LobbyScreen` | Hỗ trợ cả 2 chế độ: real repository cho sản phẩm và mock client cho demo/test GM-11 | UI Consumer |
| `mobile/tests/unit/roomRepository.test.ts` | GM-25 | GM-25.1 | `npm test -- tests/unit/roomRepository.test.ts` | 10 unit tests bao phủ toàn bộ 12 phương thức RPC và xử lý lỗi | CI / Test Suite |

---

## 2. Acceptance criteria và trạng thái

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| **AC1: Đạt kiểm Android-API** | **Pass (automated)** | `cd mobile; npm test` (20 suites / 576 tests) | [CHECKS.md](CHECKS.md) | Unit test RPC call contract, session integration và error normalization đạt 100%. Kiểm thử thiết bị vật lý 2 máy cần reviewer thực hiện theo mục 3. |
| **AC2: Giữ nguyên layout UI, không fallback fixture ở production** | **Pass** | `mobile/src/bootstrap/RoomRepositoryProvider.tsx`, `mobile/src/app/` | `npm run check:architecture` | Layout gốc các màn giữ nguyên. Production mode dùng `LiveRoomRepository`, báo lỗi rõ ràng nếu mất mạng/hết hạn, không tự ý chuyển sang fixture mock. |
| **AC3: Auth/session/validation/error, consent/history đúng thực tế** | **Pass** | `mobile/tests/unit/roomRepository.test.ts` | `npm test` | Tự động tạo guest session hoặc khôi phục session có sẵn qua SecureStore; error mapping chuẩn xác sang `ErrorCode`. |
| **AC4: Nhiều máy nhận cùng snapshot, reset ready khi bối cảnh đổi** | **Pass** | `tests/unit/roomRepository.test.ts`, `tests/component/gm11Screens.test.tsx` | `npm test` | Server đồng bộ snapshot và reset ready khi bối cảnh đổi. Xử lý chuẩn `ROOM_EXPIRED`, `CANCELLED`, `ROOM_FULL`. |
| **AC5: Out-of-coverage/empty báo lý do server, không start pool rỗng** | **Pass** | `mobile/src/features/rooms/services/roomRepository.ts`, `tests/unit/roomRepository.test.ts` | `npm test` | Trả về lý do `NO_ELIGIBLE_FOOD`, `OUT_OF_COVERAGE`; UI vô hiệu hóa nút bắt đầu nếu pool rỗng hoặc chưa đủ ready. |
| **AC6: Đầu vào/đầu ra và cách kiểm ghi trong HANDOFF.md** | **Pass** | `docs/evidence/roadmap-v2/GM-25/HANDOFF.md` | Tài liệu này | Hướng dẫn chi tiết cách cấu hình và nghiệm thu trên thiết bị Android thật. |

---

## 3. Hướng dẫn cấu hình và nghiệm thu trên điện thoại Android thật

Để kiểm tra luồng tích hợp trên 2 thiết bị Android thật (hoặc 1 điện thoại thật + 1 trình giả lập Android / browser):

### 3.1. Cấu hình biến môi trường
Tạo file `mobile/.env.local` (hoặc cấu hình environment variables cho Expo):
```ini
EXPO_PUBLIC_SUPABASE_URL=http://<IP_LAN_CUA_MAY_TINH>:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
> [!IMPORTANT]
> **Không sử dụng `localhost` hoặc `127.0.0.1`** làm `EXPO_PUBLIC_SUPABASE_URL` khi chạy trên điện thoại thật vì điện thoại xem `localhost` là chính nó. Phải dùng địa chỉ IP nội bộ (LAN IP, ví dụ `http://192.168.1.50:54321`) mà điện thoại và máy tính cùng kết nối được qua mạng Wi-Fi.

### 3.2. Khởi chạy ứng dụng
1. Khởi động backend Supabase local (hoặc instance test của dự án):
   ```powershell
   # Trong thư mục dự án
   npx supabase start
   ```
2. Khởi động Expo Metro Bundler:
   ```powershell
   cd mobile
   npx expo start --clear
   ```
3. Mở ứng dụng bằng **Expo Go** trên 2 điện thoại Android bằng cách quét mã QR từ Metro Bundler.

### 3.3. Kịch bản kiểm thử 2 máy (Host & Member)
1. **Máy 1 (Host - Minh Trang):**
   - Mở app -> Bấm **"Tạo phòng mới"**.
   - Nhập tên: `Trang (Host)`.
   - Chọn bối cảnh ăn uống -> Bấm **"Tạo phòng"**.
   - Màn hình hiển thị mã phòng (ví dụ `GCD123`).
   - Bấm **"Xem bước phòng chờ"** -> Vào `/gm11/lobby`. Trạng thái: Host đang ở trong phòng chờ.
2. **Máy 2 (Member - Tuấn):**
   - Mở app -> Bấm **"Vào phòng bằng mã"**.
   - Nhập mã phòng `GCD123` và tên: `Tuấn (Member)`.
   - Bấm **"Vào phòng"** -> Màn hình hiển thị thông tin phòng -> Bấm **"Xem bước phòng chờ"**.
   - Cả 2 máy đều hiển thị danh sách 2 thành viên: `Trang (Host)` và `Tuấn`.
3. **Thao tác Ready & Bắt đầu:**
   - Trên Máy 2, Tuấn bấm **"Tôi sẵn sàng"** -> Máy 1 thấy Tuấn chuyển sang trạng thái "Sẵn sàng".
   - Trên Máy 1, Trang bấm **"Tôi sẵn sàng"** -> Nút **"Bắt đầu chọn món"** trên Máy 1 được kích hoạt.
   - Trang bấm **"Bắt đầu chọn món"** -> Server chuyển trạng thái phòng sang vòng 1.
4. **Kiểm tra Reset Ready khi đổi bối cảnh:**
   - Trước khi bắt đầu, nếu Host bấm **"Chỉnh sửa bối cảnh"** và thay đổi giờ ăn hoặc ngân sách, server cập nhật và cờ "Sẵn sàng" của cả hai thành viên tự động đặt lại về chưa sẵn sàng.

---

## 4. Checklist người nhận (Receiver Checklist)

- [x] Upstream được review đúng scope và revision: GM-07, GM-09, GM-10, GM-11, GM-16, GM-19, GM-21 đã có mặt trên `main`.
- [x] File và hướng dẫn đủ chạy từ clone sạch; không có file placeholder hoặc hardcoded mock ở production mode.
- [x] Input/output/errors/nullability/version đúng contract `food-v1/roadmap-v2/GM-25.1`.
- [x] Cả 20/20 test suites Jest (576 tests) và 550 test cases Python pass 100%.
- [x] Đã phân tách rõ ràng giữa unit mock tự động và kịch bản nghiệm thu thiết bị thật.
- [ ] Reviewer Trí (`ThanhTris`) tiến hành kiểm tra mã nguồn, đối chiếu revision và nghiệm thu theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).

> [!NOTE]
> Theo quy định của dự án và chỉ dẫn của người dùng, AI coding agent không tự ý chuyển trạng thái issue sang Done hoặc tự duyệt review. Trí (`ThanhTris`) sẽ trực tiếp kiểm tra và cập nhật trạng thái trên GitHub Project #2.
