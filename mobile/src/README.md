# Cấu trúc `mobile/src`

App chỉ chạy với backend thật (Supabase). Mock client, dữ liệu mẫu và màn preview nằm trong `mobile/tests/`, không đóng gói vào app.

| Thư mục | Vai trò |
|---|---|
| `app/` | Route của expo-router. Mỗi file chỉ lấy params, lấy repository từ `useRoomRepository()` rồi render một màn hình trong `features/`. |
| `bootstrap/` | Provider dùng chung cho toàn app: font, theme, `RoomRepositoryProvider` (phiên khách + repository). |
| `data/` | Tầng gọi backend: `api/` (contracts, client RPC), `auth/` (phiên khách), `local/` (outbox, cache). Không import từ `features/`. |
| `domain/` | Quy tắc thuần (chính sách chọn món, eligibility) dùng làm tham chiếu và cho test hợp đồng. |
| `features/` | Màn hình theo nghiệp vụ (xem bên dưới). |
| `shared/` | UI dùng chung (`shared/ui`, export qua `shared/ui/index.ts`), theme token, hook giao diện. Không import từ `features/`. |
| `types/` | Khai báo kiểu cho asset (svg). |

## features/

Mỗi feature chỉ có các thư mục cần dùng: `screens/` (màn hình gắn với route), `components/`, `hooks/`, `services/` (repository, mapping, validate).

| Feature | Nội dung | Route |
|---|---|---|
| `home` | Trang chủ, chào mừng, phiên khách, hướng dẫn, tiếp tục phiên, 404 | `/`, `/welcome`, `/tutorial`, `/continue-session` |
| `auth` | `RequireActiveSession` chặn màn cần phiên | — |
| `rooms` | Tạo phòng, vào phòng (mã/QR), phòng chờ; `services/roomRepository.ts` là repository chính | `/room/create`, `/room/join`, `/room/lobby` |
| `context` | Luồng thiết lập chung `DishSetupFlow`: chủ phòng thiết lập phòng (số món, buổi ăn, giờ) rồi chọn khẩu vị; thành viên vào thẳng bước khẩu vị | `/room/setup`, `/room/setup?roomId=…&stage=setup\|preferences` |
| `preferences` | Màn chọn khẩu vị (`DishPreferencesScreen`) dùng trong luồng thiết lập | — |
| `voting` | Bình chọn vòng 1 và vòng chung kết (UI flashcard sẽ làm lại) | `/room/vote`, `/room/final-round` |
| `result` | Kết quả, bục xếp hạng, quán gần đây; `DishResultEntry` là điểm vào của route | `/room/result`, `/room/no-consensus` |
| `friends`, `history`, `inbox`, `account` | Bạn bè, lịch sử, hộp thư + thông báo đẩy, hồ sơ/cài đặt | `/friends`, `/history`, `/inbox`, `/push-settings`, `/profile`, `/settings` |

## Quy ước

- Tên màn hình không có tiền tố `Live`/`Mock`: chỉ có một phiên bản thật.
- Import UI dùng chung từ `shared/ui`; repository lấy qua `useRoomRepository()`, không tạo client mới trong màn hình.
- Fixture và màn preview cho test: `tests/fixtures/*`; mock API: `tests/mocks/api`.
