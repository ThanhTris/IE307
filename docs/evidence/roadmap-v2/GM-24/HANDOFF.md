# Bàn giao đầu ra task — GM-24 / roadmap-v2 (Dish-only Preview Pool & Setup)

## Thông tin bàn giao

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
| `mobile/src/features/context/screens/DiscoveryContextScreen.tsx` | Màn hình UI chính | Render đầy đủ giao diện thiết lập phòng dish-only theo Figma (buổi ăn, giờ ăn, stepper 10–20 món, ngân sách, tránh lặp món 3 bữa, rủ bạn bè, preview pool, shortage dialogs, audit panel). | GM-25, Reviewer |
| `mobile/src/features/context/hooks/useDiscoveryContext.ts` | Hook quản lý trạng thái | Quản lý draft context, `loadPreview` với request generation ref để hủy response trễ, xử lý shortage (`confirmReduction`, `dismissShortage`), `saveDraft`. | GM-25 |
| `mobile/src/features/context/services/roomSetup.ts` | Service & Adapters | Cung cấp `previewDishPoolMock` (hỗ trợ 6 scenarios) và `previewDishPoolLive` (kết nối Supabase RPC `preview_dish_pool`). Giữ 100% tương thích ngược các helpers (`currentServerTime`, `suggestedMeal`, `parseBudget`, `dishPrice`, v.v.). | GM-25, GM-18 |
| `mobile/src/features/context/index.ts` | Thư viện module context | Export `DiscoveryContextScreen`, `useDiscoveryContext`, `roomSetup`. | GM-25, App Router |
| `mobile/tests/unit/roomSetup.test.ts` | Bộ kiểm thử đơn vị | 56 automated unit tests bao phủ toàn bộ mock scenarios và live transport adapters (200, 409, 401, timeout). | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | Bộ kiểm thử component | 11 automated component tests kiểm tra render, stepper boundaries, shortage handling >= 10 và < 10, past time recovery, audit panel. | QA / Reviewer |

---

## 2. Các tệp UI cũ đã được dọn dẹp

Theo quy định rà soát Figma ngày 2026-10-28 và kiến trúc ADR-019 (độc lập GPS, vị trí, quán):
- Đã xóa hoàn toàn các component cũ:
  - `mobile/src/features/context/components/AnchorPickerSection.tsx`
  - `mobile/src/features/context/components/ContextPreviewAndPrivacyCard.tsx`
  - `mobile/src/features/context/components/EnvironmentAndScenarioPanel.tsx`
- Không còn bất kỳ tham chiếu nào tới các component trên.

---

## 3. Hướng dẫn sử dụng cho Task nhận (GM-25: Tạo phòng & Lobby)

1. **Lấy dữ liệu thiết lập phòng từ bản nháp**:
   ```typescript
   import { useDiscoveryContext } from '../context';

   // Trong màn hình tạo phòng của GM-25:
   const {
     draft, // Chứa { mealSlot, dishCount, timeMode, desiredAt, budget, avoidRecent, inviteeIds }
     isConfirmed,
     previewDishes,
   } = useDiscoveryContext();
   ```

2. **Gọi tạo phòng RPC**:
   - Truyền trực tiếp danh sách mã món ăn từ `previewDishes.map(d => d.id)` hoặc các tham số `mealSlot`, `dishCount`, `desiredAt` vào payload `create_dish_session` / `create_room` của GM-25.
   - Không truyền tọa độ GPS hay anchor vào payload tạo phòng.

3. **Xử lý Shortage**:
   - Nếu RPC trả về lỗi `409 INSUFFICIENT_DISHES` với `details: { available, requested }`:
     - Nếu `available >= 10`: Cho phép host hạ số món xuống `available` và thử lại.
     - Nếu `available < 10`: Bắt buộc thông báo host chọn buổi ăn khác hoặc hủy tạo phòng.

---

## 4. Hướng dẫn chạy thử nghiệm & Review

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
   Tất cả 67 bài test sẽ vượt qua tự động.
