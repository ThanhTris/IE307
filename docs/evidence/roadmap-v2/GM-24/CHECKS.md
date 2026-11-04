# GM-24 checks: UI–API preview pool và thiết lập dish-only

## Tóm tắt hiện trạng thực hiện và nghiệm thu — 2026-11-04

- **Task**: GM-24 / Issue #85 (`UI–API preview pool và thiết lập dish-only`)
- **Assignee**: @rosy179 (Trang)
- **Reviewer**: @ThanhTris (Trí)
- **Hợp đồng & Phiên bản**: `contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2'`, `ui-figma-final/2026-10-25/GM-24.2`
- **Quy tắc cốt lõi (ADR-019 & AIDD 2026-10-25)**:
  - Thay hoàn toàn luồng GPS/anchor/bán kính/coverage bằng thiết lập phòng **dish-only**.
  - Host chọn chính xác 10–20 món ban đầu từ catalogue món ăn.
  - Stepper giới hạn chặt chẽ trong khoảng [10, 20]: nút `-` vô hiệu hóa tại 10 (Figma `451:13066`), nút `+` vô hiệu hóa tại 20 (Figma `451:13189`).
  - Shortage handling:
    - Khi `available >= 10`: Cho phép host bấm "Giảm còn {available} món" hoặc "Sửa thiết lập" (Figma `323:2664`).
    - Khi `available < 10`: Cảnh báo đỏ không đủ điều kiện tối thiểu 10 món, **không cho phép giảm**, khóa tạo phòng, bắt buộc sửa thiết lập (Figma `1015:9957`).
  - Xử lý in-flight request: Sửa tham số làm vô hiệu hóa kết quả preview cũ; response cũ đến trễ bị hủy tự động bằng request generation ref.
  - Xử lý thời gian ăn: "Ăn ngay" (+15 phút từ giờ máy chủ `currentServerTime`); "Hẹn giờ" kiểm tra giờ quá khứ `DESIRED_TIME_PASSED` và có nút "Điều chỉnh thành giờ hợp lệ".
  - Lưu bản nháp (Draft) giữ nguyên khi lỗi/retry (Figma `388:7816`).
  - Bảo mật & Kiến trúc (Audit Panel): 0 byte GPS thô, không lọc pool theo quán hay GPS, khẩu vị tài khoản bảo mật cục bộ, Places tách biệt sau kết quả.

---

## Bảng kết quả kiểm tra xác minh (Verification Matrix)

| STT | Hạng mục kiểm tra | Lệnh / File kiểm | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | **Unit Test: roomSetup service** | `npm --prefix mobile test -- tests/unit/roomSetup.test.ts` | 56 unit tests kiểm tra: mock scenarios (exact_20, shortage_15, shortage_7, offline, slow, past time), live preview adapter (200 success, 409 INSUFFICIENT_DISHES, 401 auth, timeout), helper functions giữ 100% tương thích ngược | 56/56 passed | **Pass (automated unit)** |
| 2 | **Component Test: DiscoveryContextScreen** | `npm --prefix mobile test -- tests/component/contextScreen.test.tsx` | 11 component tests bao phủ tất cả 6 Figma nodes (`43:106`, `323:2664`, `451:13066`, `451:13189`, `388:7816`, `1015:9957`), stepper min/max, shortage reduction, shortage < 10 block, error retry, audit panel | 11/11 passed | **Pass (automated component)** |
| 3 | **TypeScript Strict Compilation** | `npx --prefix mobile tsc --noEmit` | 0 lỗi TypeScript trên toàn bộ các tệp nguồn và kiểm thử của GM-24 (`DiscoveryContextScreen.tsx`, `useDiscoveryContext.ts`, `roomSetup.ts`, `tests/...`) | 0 errors trên GM-24 files | **Pass** |
| 4 | **Repository Integrity Validator** | `python scripts/validate_repository.py` | Kiểm tra tài liệu, links, JSON task manifest, dependencies và FR traceability | Gi Cung Duoc repository validation OK | **Pass** |
| 5 | **Git Diff Whitespace Check** | `git diff --check` | Không có lỗi whitespace, trailing space hoặc conflict markers | Clean | **Pass** |
| 6 | **Figma Parity Verification** | `docs/evidence/roadmap-v2/GM-24/FIGMA_PARITY.md` | Đối chiếu 6 nodes Figma với các thành phần UI, trạng thái stepper, shortage cards, receipt | 100% đối chiếu thành công | **Pass** |
| 7 | **Thiết bị Android vật lý / Expo Go thực tế** | Chạy Expo Go trên máy thật | Trải nghiệm vuốt chạm, font Inter, Dark mode trên thiết bị thực | Chờ reviewer @ThanhTris kiểm tra trực tiếp trên thiết bị vật lý | **Not run (chờ thiết bị thật)** |

---

## Chi tiết các kịch bản kiểm thử (Scenarios Covered)

1. **Kịch bản `exact_20_lunch` (Figma `43:106`)**:
   - Yêu cầu 20 món trưa. Catalogue có 23 món trưa.
   - Trả về thành công 20 món ăn Việt Nam thực tế kèm giá (`priceMin`, `priceMax`), tag buổi ăn.
   - Mở khóa xác nhận bản nháp và hiển thị danh sách xem trước (Preview Receipt).

2. **Kịch bản `shortage_15_lunch` (Figma `323:2664`)**:
   - Yêu cầu 20 món nhưng catalogue chỉ có 15 món.
   - Hiển thị Shortage Dialog cảnh báo `available: 15, requested: 20`.
   - Có nút "Giảm còn 15 món": Bấm vào cập nhật `dishCount` thành 15 và re-fetch danh sách 15 món ngay lập tức.
   - Có nút "Sửa thiết lập" để đóng dialog.

3. **Kịch bản `shortage_7_dinner` (Figma `1015:9957`)**:
   - Yêu cầu 20 món tối, catalogue chỉ có 7 món tối.
   - Do 7 < 10 (vi phạm quy định tối thiểu 10 món để tạo phòng):
   - Cảnh báo lỗi nghiêm trọng màu đỏ: "Cần tối thiểu 10 món để bắt đầu phòng bình chọn. Vui lòng đổi buổi ăn hoặc điều chỉnh tiêu chí."
   - **Không có nút giảm số món xuống 7**.
   - Nút xác nhận bị khóa hoàn toàn.

4. **Kịch bản Stepper biên dưới và trên (Figma `451:13066`, `451:13189`)**:
   - Khi `dishCount = 10`: Nút trừ (-) bị disabled, không thể bấm giảm dưới 10.
   - Khi `dishCount = 20`: Nút cộng (+) bị disabled, không thể bấm tăng vượt quá 20.

5. **Kịch bản Giờ ăn quá khứ (`desired_time_passed`)**:
   - Hẹn giờ với mốc thời gian nhỏ hơn giờ máy chủ hiện tại (`currentServerTime`).
   - Cảnh báo lỗi `DESIRED_TIME_PASSED` màu đỏ.
   - Nút "Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)" cho phép khắc phục nhanh bằng một chạm.

6. **Kịch bản Lỗi kết nối & Thử lại (`server_offline`, Figma `388:7816`)**:
   - Khi mạng mất kết nối hoặc máy chủ lỗi, hiển thị card cảnh báo đỏ kèm nút "🔄 Thử lại".
   - Bấm thử lại kích hoạt request mới mà không làm mất các thông số draft đã nhập.

---

## Giới hạn & Quyền hạn (Limits)

- GM-24 chỉ chịu trách nhiệm màn hình thiết lập bối cảnh phòng dish-only và preview danh sách món ăn từ catalogue (RPC `preview_dish_pool` / `get_dish_catalogue`).
- Thao tác tạo phòng thật (`create_room`), mã phòng PIN, kết nối realtime và lobby thuộc trách nhiệm của task GM-25.
- Bản đồ và gợi ý quán ăn lân cận sau khi có món thắng cuộc thuộc trách nhiệm của task GM-30.
- Theo quy định AIDD, kết quả kiểm thử này không tự ý nâng trạng thái task lên `Done`. Task đang ở trạng thái sẵn sàng để chủ dự án và reviewer @ThanhTris kiểm tra, nghiệm thu.
