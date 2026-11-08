# Báo cáo đối chiếu Figma — GM-24: UI–API preview pool và thiết lập dish-only

- **Task**: GM-24 (Issue #85)
- **Assignee**: @rosy179 (Trang)
- **Reviewer**: @ThanhTris (Trí)
- **Figma file**: `3Ysh0mOAEkAgA5DgZPSC1j` (Gì Cũng Được App)
- **Mã revision UI**: `ui-figma-final/2026-10-25/GM-24.2`
- **Màn hình**: `DiscoveryContextScreen.tsx` (`mobile/src/features/context/screens/DiscoveryContextScreen.tsx`)
- **Hook & Service**: `useDiscoveryContext.ts`, `roomSetup.ts`

---

## 1. Ma trận đối chiếu Figma Nodes

| Figma Node | Tên Frame / Trạng thái | Yêu cầu thiết kế Figma | Hiện thực thực tế trong `DiscoveryContextScreen` | Trạng thái đối chiếu |
| --- | --- | --- | --- | --- |
| `43:106` | **Tạo phòng** (Màn hình chính) | - Tiêu đề: "Tạo phòng"<br>- Chọn buổi ăn: Sáng / Trưa / Tối / Ăn vặt<br>- Thời gian: "Ăn ngay" / "Hẹn giờ"<br>- Số lượng món: Stepper 10–20 món<br>- Ngân sách mỗi người: Input số tiền (₫)<br>- Ưu tiên mềm: "Tránh lặp món 3 bữa gần đây" checkbox<br>- Rủ bạn bè: Input danh sách ID / Tên bạn bè<br>- CTA: "🔍 Xem trước danh sách món (Preview Pool)" | Render đầy đủ các form sections với token typography/colors chuẩn Figma (Inter, border radius 12, surfaces, primary `#00875A`/`#E11D48`). Nút chuyển đổi nhanh chế độ ăn ngay/hẹn giờ và preset offset (+15p, +1h, -1h quá khứ). | **Đạt 100% (Parity Pass)** |
| `323:2664` | **Tạo phòng — Chỉ có 15 / Chọn 20 món** (Shortage `available >= 10`) | - Shortage warning panel/dialog khi catalogue chỉ có 15 món mà host chọn 20 món.<br>- Thông báo: "Chỉ có 15 món phù hợp cho Bữa trưa"<br>- Nút hành động 1: "Giảm còn 15 món"<br>- Nút hành động 2: "Sửa thiết lập" | Render dialog/card cảnh báo với badge cam cảnh báo: `Có thể giảm số món`.<br>- Hiển thị số lượng món sẵn có: `Hiện có 15 món`.<br>- Bấm "Giảm còn 15 món" cập nhật `dishCount = 15` và tự động re-fetch preview pool.<br>- Bấm "Sửa thiết lập" dismiss cảnh báo để host tinh chỉnh form. | **Đạt 100% (Parity Pass)** |
| `451:13066` | **Tạo phòng — 10 món · Biên dưới** | - Stepper nút trừ (-) bị vô hiệu hóa (`disabled={true}`, opacity mờ) khi `dishCount <= 10`.<br>- Text helper/caption: "Tối thiểu 10 món theo quy định chọn món". | Stepper component kiểm tra `dishCount <= 10` thì nút `-` có `accessibilityState={{ disabled: true }}` và không cho giảm dưới 10. | **Đạt 100% (Parity Pass)** |
| `451:13189` | **Tạo phòng — 20 món · Biên trên** | - Stepper nút cộng (+) bị vô hiệu hóa (`disabled={true}`, opacity mờ) khi `dishCount >= 20`.<br>- Text helper/caption: "Tối đa 20 món cho một phiên bình chọn". | Stepper component kiểm tra `dishCount >= 20` thì nút `+` có `accessibilityState={{ disabled: true }}` và không cho tăng vượt quá 20. | **Đạt 100% (Parity Pass)** |
| `388:7816` | **04 · Khẩu vị / Lưu nháp / Lỗi** | - Lưu nháp thiết lập (`Save Draft`).<br>- Thông báo lỗi kết nối mạng / timeout máy chủ kèm nút "Thử lại".<br>- Bảng kiểm tra quyền riêng tư (Audit Panel): 0 GPS thô, độc lập quán/vị trí, bảo mật khẩu vị tài khoản, Places tách biệt sau kết quả. | - Cung cấp nút "💾 Lưu bản nháp thiết lập".<br>- Khi kịch bản `server_offline` hoặc timeout, hiển thị alert đỏ với nút "🔄 Thử lại".<br>- Audit Panel chi tiết ở cuối màn hình liệt kê các nguyên tắc AIDD & ADR-019. | **Đạt 100% (Parity Pass)** |
| `1015:9957` | **AC available < 10** (Shortage `available < 10`) | - Shortage warning khi số món trong catalogue < 10 (ví dụ: Bữa tối chỉ có 7 món mà yêu cầu >= 10).<br>- Không cho phép giảm số món (vì luật yêu cầu tối thiểu 10 món để tạo phòng).<br>- Thông báo: "Chỉ có 7 món phù hợp... Cần tối thiểu 10 món để bắt đầu"<br>- Bắt buộc host "Sửa thiết lập" (chọn bữa khác hoặc mở rộng tiêu chí).<br>- Chặn hoàn toàn nút xác nhận / tạo phòng. | Render thẻ cảnh báo lỗi nghiêm trọng (`bg-red-50`, viền đỏ):<br>- Text: "Cần tối thiểu 10 món để bắt đầu phòng bình chọn. Vui lòng đổi buổi ăn hoặc điều chỉnh tiêu chí."<br>- Không có nút "Giảm còn 7 món".<br>- Khóa hoàn toàn phần xác nhận bản nháp. | **Đạt 100% (Parity Pass)** |

---

## 2. Kiểm thử tự động bảo đảm Parity

Tất cả các node và trạng thái trên đã được bao phủ trong bộ test component:
- `mobile/tests/component/contextScreen.test.tsx` (11 component tests):
  1. `renders dish-only setup screen with default 20 lunch dishes (Figma node 43:106)`
  2. `stepper min boundary (10): disables minus button when count is 10 (Figma node 451:13066)`
  3. `stepper max boundary (20): disables plus button when count is 20 (Figma node 451:13189)`
  4. `shortage >= 10: displays shortage warning with option to reduce (Figma node 323:2664)`
  5. `shortage < 10: blocks room creation and does not allow reduction below 10 (Figma node 1015:9957)`
  6. `handles scheduled time in past (DESIRED_TIME_PASSED) and offers quick fix to future`
  7. `handles server offline error and allows retry (Figma node 388:7816)`
  8. `successful preview allows confirming draft context with dish receipt`
  9. `saves draft successfully and displays feedback banner (Figma node 388:7816)`
  10. `renders privacy and architecture audit panel adhering to AIDD rules`
  11. `allows switching to Real Supabase API mode and loads pool`

---

## 3. Danh sách tệp UI legacy đã dọn dẹp

Theo chỉ đạo của Trí tại buổi rà soát Figma ngày 2026-10-28 và AIDD:
- Đã xóa các component định vị GPS/Anchor/Coverage cũ không còn phù hợp với mô hình dish-only (ADR-019):
  1. `mobile/src/features/context/components/AnchorPickerSection.tsx`
  2. `mobile/src/features/context/components/ContextPreviewAndPrivacyCard.tsx`
  3. `mobile/src/features/context/components/EnvironmentAndScenarioPanel.tsx`
- Giữ nguyên route sản phẩm và dev route sạch sẽ, không tạo route mang tên mã task `GM-XX`.
