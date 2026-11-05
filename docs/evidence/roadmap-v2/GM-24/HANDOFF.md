# Bàn giao đầu ra task — GM-24 / roadmap-v2 (Dish-only Preview Pool & Setup)

## Thông tin bàn giao hiện hành — 2026-11-05

- **Task**: GM-24 — UI–API preview pool và thiết lập dish-only (Issue #85)
- **Assignee**: @rosy179 (Trang)
- **Reviewer**: @ThanhTris (Trí)
- **Track**: INTEGRATION / UI
- **Branch**: `issue85_figma_ui_gm24`
- **Phiên bản hợp đồng**: `contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2'`, `ui-figma-final/2026-10-25/GM-24.2`
- **CHECKS file**: [CHECKS.md](CHECKS.md)
- **Báo cáo đối chiếu Figma**: [FIGMA_PARITY.md](FIGMA_PARITY.md)
- **Baseline đã nhận**: [PR #151](https://github.com/ThanhTris/IE307/pull/151); phần bổ sung hiện tại sửa cấu hình preview và hướng dẫn nhận vào GM-25. Kết quả baseline được giữ trong CHECKS.

---

## 1. Danh sách Artifacts thực tế bàn giao

| Artifact thực tế | Trách nhiệm | Chi tiết kỹ thuật & Exports | Task nhận |
| --- | --- | --- | --- |
| `mobile/src/features/context/screens/DiscoveryContextScreen.tsx` | Màn hình UI chính | Render đầy đủ giao diện thiết lập phòng dish-only theo Figma (buổi ăn, giờ ăn, stepper 10–20 món, ngân sách, tránh lặp món 3 bữa, rủ bạn bè, preview pool, shortage dialogs, audit panel). Không kẹt loading khi sửa tham số lúc đang tải. | GM-25, Reviewer |
| `mobile/src/features/context/hooks/useDiscoveryContext.ts` | Hook quản lý preview | Import trực tiếp từ file hook. Trả từng field `mealSlot`, `dishCount`, `timeMode`, `desiredAt`, `budget`, `avoidRecent`, `inviteeIds`, `confirmed`, `preview`; không có object `draft` hoặc field `isConfirmed`. Nhận `transport` và `sessionManager` để dùng Auth thật. | GM-25 |
| `mobile/src/features/context/services/roomSetup.ts` | Service & Adapters | Cung cấp `previewDishPoolMock` (hỗ trợ 6 scenarios) và `previewDishPoolLive` (kết nối Supabase RPC `preview_dish_pool` với kiểm tra nghiêm ngặt: số món chính xác, contractVersion, ID không trùng, giữ null trung thực). Giữ 100% tương thích ngược các helpers (`currentServerTime`, `suggestedMeal`, `parseBudget`, v.v.). | GM-25, GM-18 |
| `mobile/src/features/context/index.ts` | Thư viện module context | Export các screen và service `roomSetup`; hook được import từ `hooks/useDiscoveryContext`, không qua barrel này. | GM-25, App Router |
| `mobile/tests/unit/roomSetup.test.ts` | Bộ kiểm thử đơn vị | 61 automated unit tests bao phủ mock scenarios, live transport adapters (200, 409, 401, timeout, từ chối 20→1, từ chối ID trùng/thiếu, từ chối version sai, giữ null trung thực). | QA / Reviewer |
| `mobile/tests/component/contextScreen.test.tsx` | Bộ kiểm thử component | 13 component tests kiểm tra render, stepper, shortage qua transport mô phỏng HTTP, in-flight cancellation và giữ nháp. Các ca này không tự chứng minh app đã gọi DB thật. | QA / Reviewer |
| `mobile/tests/unit/discoveryContextConfiguration.test.ts` | Bộ kiểm cấu hình mặc định | Public key hiện hành, fallback tên key legacy, ưu tiên key hiện hành, URL/request/header và shortage qua FetchTransport. Dữ liệu/key/token chỉ là fixture tổng hợp. | QA / Reviewer |

---

## 2. Hướng dẫn sử dụng cho Task nhận (GM-25: Tạo phòng & Lobby)

1. **Nhận đúng state và adapter**:
   - Hook preview có state riêng. Tạo một instance hook khác không đọc được state của screen đang mở. `onSaveContext` hiện nhận `mealSlot`, `desiredAt`, `dishCount`, `budget` dưới dạng callback legacy; đó chưa phải canonical create request.
   - Luồng sản phẩm GM-25 nhận `SetupDraft`/`SetupIntent` từ form GM-10 và gateway ở [PR #155](https://github.com/ThanhTris/IE307/pull/155). Giữ đầy đủ budget/unit, avoidRecent và inviteeIds trong state của luồng đó; không giả rằng callback legacy đã bàn giao đủ các field này.
   - Tái sử dụng `previewDishPoolLive(transport, { mealSlot, dishCount, token, preferences? })` từ `services/roomSetup.ts` khi cần preview. Request gọi `preview_dish_pool`, contract `dish-catalogue/roadmap-v2/GM-18.2`. Preview không tạo, khóa hoặc lưu phiên.

2. **GM-25 tạo phòng sau khi người dùng xác nhận thiết lập**:
   - Gọi RPC `dish_session`, command `create`, theo [schema GM-07.B-supplement](../../../architecture/schemas/dish-session-v4b-supplement.schema.json). Ví dụ tổng hợp:

   ```json
   {
     "command": "create",
     "payload": {
       "contractVersion": "dish-session-v4/roadmap-v2/GM-07.B-supplement",
       "requestId": "b8c54ab4-805f-4fc1-a004-7eafc890cfbb",
       "displayName": "Khách demo",
       "settings": { "dishCount": 15, "mealSlot": "lunch", "desiredAt": null },
       "preferences": {
         "cuisineIds": [], "categoryIds": [], "temperature": null,
         "flavor": null, "budget": null, "avoidRecent": false
       }
     }
   }
   ```

   - Server chọn và khóa pool theo thiết lập. Danh sách preview không phải field của request tạo phòng; không gửi dish IDs, GPS hoặc anchor. Endpoint legacy `create_room` và tên `create_dish_session` không thuộc luồng canonical này.
   - Khi tạo xong, dùng roomId/version/poolVersion từ ACK và snapshot của server. Không suy phiên đã tạo từ việc preview hoặc xác nhận nháp thành công.

3. **Xử lý shortage và response cũ**:
   - Nếu RPC trả về lỗi `409 INSUFFICIENT_DISHES` với `details: { available, requested }`:
     - Nếu `available >= 10`: Cho phép host bấm giảm số món xuống `available` và tự động re-fetch danh sách mới qua API thật.
     - Nếu `available < 10`: Cảnh báo đỏ không đủ điều kiện tối thiểu 10 món, khóa nút tạo phòng, bắt buộc sửa thiết lập.
   - Chỉ giảm sau thao tác xác nhận của host; request mới phải preview lại đúng số món. Sửa thiết lập làm response preview đang chờ mất hiệu lực. Bản nháp giữ nguyên khi API lỗi, không dùng fixture thay response thật.

---

## 3. Hướng dẫn chạy thử nghiệm & Review

1. **Khởi chạy ứng dụng**:
   ```bash
   cd mobile
   npm run start:go
   ```
2. **Mở preview và cấu hình transport**:
   - Route development `/dev/discovery-context` mở `DiscoveryContextScreen`; không dùng nhãn button cũ làm địa chỉ route.
   - Preview harness mặc định là mock. Muốn kiểm adapter thật phải chọn chế độ `real_api` và truyền Auth session/transport đã nhận từ GM-16. Public key không thay access token của người dùng.
   - FetchTransport mặc định đọc trực tiếp `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` để Expo inline được cấu hình; `EXPO_PUBLIC_SUPABASE_ANON_KEY` là fallback legacy. Không đưa service-role key vào app.
3. **Chạy kiểm thử tự động**:
   ```bash
   npm --prefix mobile test -- --runTestsByPath tests/component/contextScreen.test.tsx tests/unit/roomSetup.test.ts tests/unit/discoveryContextConfiguration.test.ts
   ```
   Ghi số ca và Pass/Fail thực tế của revision đang kiểm vào CHECKS; giữ riêng baseline 74 ca của PR #151.
4. **Kiểm tra Lint**:
   ```bash
   npm --prefix mobile run lint
   ```
   Kiểm TypeScript bằng `npm --prefix mobile run typecheck`; không suy Android/API thật từ lint hoặc component tests.
