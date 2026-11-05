# Bàn giao đầu ra task — GM-24 / roadmap-v2 (Dish-only Preview Pool & Setup)

## Thông tin bàn giao (Cập nhật sau Review PR #151)

- **Task**: GM-24 — UI–API preview pool và thiết lập dish-only (Issue #85)
- **Assignee**: @rosy179 (Trang)
- **Reviewer**: @ThanhTris (Trí)
- **Track**: INTEGRATION / UI
- **Branch**: `issue85_figma_ui_gm24`
- **Phiên bản hợp đồng**: `contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2'`, `ui-figma-final/2026-10-25/GM-24.2`
- **CHECKS file**: [CHECKS.md](CHECKS.md)
- **Báo cáo đối chiếu Figma**: [FIGMA_PARITY.md](FIGMA_PARITY.md)

---

## 1. Danh sách Artifacts thực tế bàn giao

| Artifact thực tế | Trách nhiệm | Chi tiết kỹ thuật & Exports | Task nhận |
| --- | --- | --- | --- |
| `mobile/src/features/context/screens/DiscoveryContextScreen.tsx` | Màn hình UI chính | Render đầy đủ giao diện thiết lập phòng dish-only theo Figma (buổi ăn, giờ ăn, stepper 10–20 món, ngân sách, tránh lặp món 3 bữa, rủ bạn bè, preview pool, shortage dialogs, audit panel). Không kẹt loading khi sửa tham số lúc đang tải. | GM-25, Reviewer |
| `mobile/src/features/context/hooks/useDiscoveryContext.ts` | Hook quản lý trạng thái | Quản lý draft context, `executePreviewLoad` hợp nhất (xử lý cả Mock và Real API), hủy response trễ bằng generation ref, xử lý shortage (`confirmReduction`, `dismissShortage`) gọi API thật, đồng hồ động cho Real API, tuân thủ 100% React Hooks rules. | GM-25 |
| `mobile/src/features/context/services/roomSetup.ts` | Service & Adapters | Cung cấp `previewDishPoolMock` (hỗ trợ 6 scenarios) và `previewDishPoolLive` (kết nối Supabase RPC `preview_dish_pool` với kiểm tra nghiêm ngặt: số món chính xác, contractVersion, ID không trùng, giữ null trung thực). Giữ 100% tương thích ngược các helpers (`currentServerTime`, `suggestedMeal`, `parseBudget`, v.v.). | GM-25, GM-18 |
| `mobile/src/features/context/index.ts` | Thư viện module context | Export `DiscoveryContextScreen`, `useDiscoveryContext`, `roomSetup`. | GM-25, App Router |
| `mobile/tests/unit/roomSetup.test.ts` | Bộ kiểm thử đơn vị | 61 automated unit tests bao phủ mock scenarios, live transport adapters (200, 409, 401, timeout, từ chối 20→1, từ chối ID trùng/thiếu, từ chối version sai, giữ null trung thực). | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | Bộ kiểm thử component | 13 automated component tests kiểm tra render, stepper boundaries, shortage reduction trên Real API (thất bại không dùng mock), in-flight cancellation không kẹt loading, past time recovery, audit panel. | QA / Reviewer |

---

## 2. Hướng dẫn sử dụng cho Task nhận (GM-25: Tạo phòng & Lobby)

1. **Lấy dữ liệu thiết lập phòng từ bản nháp**:
   ```typescript
   import { useDiscoveryContext } from '../context';

   // Trong màn hình tạo phòng của GM-25:
   const {
     draft, // Chứa { mealSlot, dishCount, timeMode, desiredAt, budget, avoidRecent, inviteeIds }
     isConfirmed,
     preview, // Danh sách món đã được xác thực chính xác số lượng từ RPC
   } = useDiscoveryContext();
   ```

2. **Bàn giao cho GM-25 tạo phòng**:
   - GM-24 chỉ preview và xác nhận thiết lập; không tạo phòng. GM-25 gọi RPC `dish_session` với `command: "create"` và payload theo schema GM-07.B-supplement (`contractVersion`, `requestId`, `displayName`, `settings`, `preferences`).
   - Không truyền danh sách `preview.map(d => d.dishId)` vào request tạo phòng. Server là authority chọn và khóa pool theo setting; preview chỉ hiển thị đầu vào đã xem trước.
   - Không dùng `create_dish_session` hoặc `create_room` như endpoint của contract mới; không truyền tọa độ GPS hay anchor vào payload tạo phòng.

3. **Xử lý Shortage**:
   - Nếu RPC trả về lỗi `409 INSUFFICIENT_DISHES` với `details: { available, requested }`:
     - Nếu `available >= 10`: Cho phép host bấm giảm số món xuống `available` và tự động re-fetch danh sách mới qua API thật.
     - Nếu `available < 10`: Cảnh báo đỏ không đủ điều kiện tối thiểu 10 món, khóa nút tạo phòng, bắt buộc sửa thiết lập.

---

## 3. Hướng dẫn chạy thử nghiệm & Review

1. **Khởi chạy ứng dụng**:
   ```bash
   cd mobile
   npm run start:go
   ```
2. **Mở màn hình thiết lập**:
   - Từ App Shell (`/`), bấm nút **"Mở thiết lập & xem trước món GM-24"** để chuyển đến `DiscoveryContextScreen`.
3. **Chạy kiểm thử tự động**:
   ```bash
   npm --prefix mobile test -- tests/component/contextScreen.test.tsx tests/unit/roomSetup.test.ts
   ```
   Tất cả 74 bài test (61 unit, 13 component) sẽ vượt qua tự động.
4. **Kiểm tra Lint**:
   ```bash
   npm --prefix mobile run lint
   ```
   Các tệp GM-24 đạt 0 lỗi và 0 cảnh báo.
