# Hướng dẫn Thiết kế & Triển khai UI — Gì Cũng Được (Mobile food-v1)

> **Mục đích:** Tài liệu này chuẩn hóa toàn bộ cấu trúc giao diện, luồng tương tác, component và quy chuẩn thiết kế từ bản nguyên mẫu tương tác [`design/prototypes/gi-cung-duoc.html`](../../design/prototypes/gi-cung-duoc.html) sang ứng dụng di động React Native (Expo + TypeScript).  
> **Đối tượng sử dụng:** Frontend Mobile Developers, Reviewers và QA trong dự án IE307.

Roadmap-v2, cập nhật 2026-10-10: giữ bố cục/phong cách mẫu, đối chiếu hành vi với [UI_SPEC](UI_SPEC.md), [ROOM_SPEC](ROOM_SPEC.md) và [FOOD_DATA_SPEC](FOOD_DATA_SPEC.md). GM-02 tạo cấu trúc → GM-05 component → GM-09..14 màn mock → GM-24..31 nối API/native. [Lộ trình](../project/IMPLEMENTATION_ROADMAP.md). Các tên/giá/quán bên dưới là minh họa; thông số tương phản cần đo trên component thật.

---

## 1. Triết lý Thiết kế & Trải nghiệm (Design Philosophy)

1. **Android-First & Thao tác một tay (One-Hand Ergonomics):**
   - Vùng tương tác chính (nút chọn, thẻ quẹt, thanh hành động) nằm ở nửa dưới màn hình (thumb zone).
   - Chiều cao touch target tối thiểu **48dp**; padding và margin rộng rãi, tránh bấm nhầm.
2. **Súc tích & Tinh gọn (Radical Simplicity):**
   - Dùng bố cục gọn theo mẫu. Người dùng xác nhận điểm ăn công cộng, buổi/giờ và tự bấm Sẵn sàng; đổi context phải reset ready. Hồ sơ dị ứng không thuộc core hiện hành và không suy an toàn từ tên món.
3. **Thân thiện & Tích cực:**
   - Gam màu cam ấm đặc trưng (`#FF5A36`) kết hợp nền ấm áp, typography tròn trịa, tương phản đạt chuẩn WCAG AA trên cả Light và Dark mode.
4. **Bảo mật & Tôn trọng quyền riêng tư (Privacy-by-Design):**
   - Server là nguồn chân lý; không hiển thị phiếu bầu thô của thành viên khác; kết quả đồng thuận chỉ hiện món thắng và phân hạng tier.

---

## 2. Hệ thống Design Tokens

### 2.1. Bảng màu (Color Palette)

| Token | Light Theme | Dark Theme | Mục đích sử dụng |
|---|---|---|---|
| `bg` | `#F8F6F2` | `#13161B` | Nền toàn ứng dụng |
| `surface` | `#FFFFFF` | `#1C212B` | Thẻ card, modal, sheet |
| `soft` | `#F1EFE9` | `#252C38` | Nền phụ, input, chip unselected |
| `warm` | `#FFF5ED` | `#2D231E` | Nền hero card, highlight ấm |
| `primary` | `#FF5A36` | `#FF6F4E` | Màu thương hiệu chính, CTA chính |
| `primaryHover` | `#E04724` | `#FF8568` | Trạng thái active/pressed của CTA |
| `onprimary` | `#FFFFFF` | `#FFFFFF` | Chữ trên nền primary |
| `text` | `#1A202C` | `#F0F4F8` | Chữ chính, tiêu đề |
| `muted` | `#64748B` | `#94A3B8` | Chữ phụ, caption, hint |
| `line` | `#E2E8F0` | `#2D3748` | Đường kẻ viền, divider |
| `green` | `#10B981` | `#34D399` | Trạng thái Online, OK/Ăn được, Giữ món |
| `danger` | `#EF4444` | `#F87171` | Nút Hủy, NO/Không ăn, Loại món |
| `warning` | `#D97706` | `#FBBF24` | Cảnh báo dữ liệu thiếu/cũ hoặc nơi bán thay đổi |

### 2.2. Typography Scale

- **Title Large:** 24–28sp (Weight: 800/Heavy) — Tiêu đề màn hình chính.
- **Title Medium:** 18–20sp (Weight: 750/Bold) — Tên món ăn trên thẻ, tên mục lớn.
- **Body Regular:** 14–15sp (Weight: 500/Medium, line-height: 1.4) — Văn bản mô tả.
- **Body Bold:** 14–15sp (Weight: 700/Bold) — Nút bấm, nhãn trạng thái.
- **Caption / Meta:** 11–12sp (Weight: 600) — Giờ mở cửa, giá tham khảo, ID bạn bè.
- **Room code:** Ô mã dễ đọc, hỗ trợ bộ ký tự server quy định trong ROOM_SPEC; không đóng cứng numeric pad theo mã số minh họa (`letter-spacing: 4–6sp`).

---

## 3. Kiến trúc Header Toàn cục (Global App Bar)

Header luôn hiện ở đầu ứng dụng với cấu trúc tối giản:
- **Bên trái (App Brand):**
  - Icon Vector Logo (chiếc bát cơm mặt cười bốc khói) + Chữ **Gì Cũng Được**.
  - Hành động: Chạm về **Trang chủ**; trong phiên đang hoạt động phải xác nhận rời/hủy theo ROOM_SPEC.
- **Bên phải (3 Nút hành động nhanh):**
  1. `👥` **Bạn ăn cùng:** Mở màn hình Bạn bè & Kèo nhanh (`UI-11`). Huy hiệu đỏ số lượng khi có lời mời kết bạn mới.
  2. `🔔` **Thông báo:** Mở màn hình Hộp thư / Lời mời ăn (`UI-12`). Huy hiệu chấm cam khi có tin chưa xem.
  3. **Avatar người dùng:** Nút tròn hiển thị chữ cái đầu hoặc avatar người dùng (mặc định "M"). Tùy chọn tên/avatar/theme dùng field đã chốt; liên kết tài khoản thuộc `UI-14 P1`.

---

## 4. Màn hình theo UI_SPEC và phạm vi core/P1

### UI-01: Trang chủ (Home Screen)
- **Mục tiêu:** Giúp người dùng bắt đầu kèo ăn ngay trong 3 giây.
- **Thành phần giao diện:**
  1. *Hero Welcome:* Lời chào theo tên người dùng (`Chào Minh! 👋 Hôm nay ăn gì?`).
  2. *Active Room Banner (nếu có):* Thẻ nổi bật cho phép "⚡ Quay lại phòng #123456" chỉ với 1 chạm nếu phòng đang diễn ra.
  3. *Hai nút hành động chính:*
     - **Tạo phòng mới** (`Primary CTA` cam nổi bật): Trở thành Host mở phòng rủ bạn.
     - **Vào phòng kèo** (`Secondary Button` viền xám): Trở thành Member nhập mã hoặc quét QR.
  4. *Khối Bạn ăn cùng (Friends Preview):*
     - Hàng avatar tròn nằm ngang (story avatar row).
     - Chấm xanh báo Online/Rảnh.
     - Nút `＋ Thêm bạn` dạng viền nét đứt.
     - Nút `Xem tất cả ›` dẫn tới màn Bạn bè.

### UI-02: Tạo phòng (Create Room)
- **Mục tiêu:** Thiết lập thông số cơ bản cho phòng nhóm mà không rườm rà.
- **Cải tiến cốt lõi:**
  - GPS trên thiết bị chỉ gợi ý điểm ăn công cộng; host xác nhận anchor/radius, có cách chọn tay. Không tự gửi tọa độ cá nhân vào phòng.
  - Gợi ý **Buổi ăn** theo CONTEXT_HISTORY_SPEC rồi host xác nhận. Giờ ăn ngay lấy server now + buffer một lần; giờ cụ thể không cộng lại. 22h–02h vẫn có thể hợp lệ nếu món/quán thật phục vụ, không tự nới điều kiện giờ.
  - Chọn bán kính linh hoạt: Chip viên thuốc `1km`, `2km`, `5km`.
  - Nút chuyển tiếp: `Chọn khẩu vị →`.

### UI-03: Vào phòng (Join Room)
- **Mục tiêu:** Nhập cuộc nhanh chóng qua mã server hoặc camera.
- **Cấu trúc 2 Tab chuyển đổi:**
  - **Tab 1: Nhập mã:** Ô mã và keyboard theo charset/độ dài contract, chuẩn hóa input. Điền mẫu chỉ có trong mock mode, không đưa vào production.
  - **Tab 2: Quét mã QR:** Màn UI dùng placeholder/action; GM-30 nối camera/link thật với deny/manual fallback. Chọn ảnh từ thư viện cần scope/permission riêng trước triển khai.

### UI-04: Chọn khẩu vị (Food Preferences)
- **Mục tiêu:** Lấy sở thích tức thời của cá nhân trước khi bước vào phòng.
- **Cải tiến UX:**
  - **Hero Card "✨ Gì cũng được":** Nằm trên cùng và được **chọn mặc định**. Phù hợp với tâm lý người lười nghĩ hoặc "ăn gì cũng vui".
  - **Nhóm chip thể loại ưu tiên:** Món nước, Cơm, Bún/Phở, Lẩu, Nướng, Món Nhật, Ăn vặt, Thanh đạm... Chạm để bật/tắt (khi chọn chip thì Hero card tự bỏ chọn).

### UI-05: Phòng chờ (Lobby Screen)
- **Mục tiêu:** Tập hợp thành viên và bắt đầu khi đủ người.
- **Cải tiến UX:**
  - **Sẵn sàng chủ động:** Thành viên mới ready=false; nút Sẵn sàng xác nhận context đang thấy. Host chỉ start khi server xác nhận đủ người/ready; context đổi thì reset ready.
  - **Mã phòng theo server:** Nằm giữa màn hình kèm nút `📱 Hiện mã QR`; mock có nhãn, QR production do contract cấp. Nút copy mã phòng tiện chia sẻ.
  - **Danh sách thành viên:** Hiển thị avatar tròn, tên và tag `Chủ phòng` / `Bạn`.
  - **Nút Bắt đầu:** Chỉ Host mới thấy nút `Bắt đầu chọn món →`. Member thấy trạng thái `Chờ chủ phòng bắt đầu...`.

### UI-06: Chọn món Vòng 1 (Flashcard Vote)
- **Mục tiêu:** Biểu quyết nhanh chóng, hào hứng bằng cử chỉ một tay.
- **Cử chỉ & Nút tương tác:**
  - **Double-tap ảnh món:** Bắn tim `❤️` bay lên kiểu TikTok và tự động ghi nhận phiếu `WANT (Muốn ăn)`.
  - **Quẹt phải (nếu triển khai):** Ghi nhận `WANT (Muốn ăn)` theo UI_SPEC; ba nút WANT/OK/NO luôn hiển thị.
  - **Quẹt trái (Swipe Left):** Ghi nhận `NO (Không ăn)`.
  - **Nút Quay lại món trước:** Nằm ở đáy màn hình để xem lại hoặc đổi ý.
  - **Nút Gửi riêng:** Chọn/đổi phiếu chỉ sửa nháp, không tự submit món cuối. UNSET khác OK; pending/unknown khác ACK của server.
- **Thông tin trên thẻ món ăn:**
  - Ảnh món ăn nổi bật (bo góc 20dp).
  - Tên món ăn (`Phở bò`, `Sushi & Sashimi`...).
  - Chip phân loại & Mức giá ước tính (`🏷️ ~45k - 65k`).
  - **Lịch phục vụ có nguồn:** Hiển thị giờ quán/món, ngày kiểm và trạng thái dự kiến theo lịch; không khẳng định stock đang có theo thời gian thực.
- **Thông tin thành phần:** Chỉ hiển thị khi có dữ liệu nguồn phù hợp; thiếu là chưa rõ. Không suy cảnh báo/an toàn dị ứng từ tên món; tính năng hồ sơ dị ứng chưa có task core được chốt.

### UI-07: Chọn lọc Vòng 2 (Consensus Elimination)
- **Mục tiêu:** Giải quyết tình huống Vòng 1 có nhiều món cùng ăn được nhưng chưa có món nào đạt đồng thuận tuyệt đối.
- **Giao diện:**
  - Banner xanh: `⚡ VÒNG 2 · CHỌN LỌC — Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.`
  - Danh sách thẻ món rút gọn:
    - Nút toggle đôi: `✓ Giữ` (xanh ngọc) và `✕ Đã loại` (xám mờ).
    - Thông tin món/giá/nguồn giữ cùng snapshot; lựa chọn chỉ áp dụng cho người bấm.
  - Nút `Gửi lựa chọn →` xác nhận phiếu; được Loại hết. Server quyết định winner hoặc NO_CONSENSUS sau đủ submission, UI không chốt cục bộ.

### UI-08: Kết quả đồng thuận (Winner Screen)
- **Mục tiêu:** Tuyên bố món ăn chiến thắng và chuyển hướng ra trải nghiệm ngoài đời.
- **Giao diện:**
  - Biểu tượng ăn mừng lớn.
  - Tiêu đề: `CẢ NHÓM CÙNG HỢP Ý! 🎉`.
  - Thẻ quán ăn thắng cuộc: Tên món, Tên quán ăn thực tế (`Phở Thìn`), Địa chỉ (`12 Nguyễn Du`), Giờ mở cửa.
  - Nút CTA mở bản đồ: `🗺️ Mở chỉ đường Google Maps`.
  - Nút phụ: `Về trang chủ`.

### UI-09: Chưa đồng thuận (No Consensus)
- **Mục tiêu:** Xử lý tình huống không tìm được món ăn chung một cách tích cực, không đổ lỗi.
- **Giao diện:**
  - Lý do trung tính: *"Mỗi bạn hôm nay đều có gu ăn riêng. Không sao cả, hãy thử mở kèo khác nhé!"* (Tuyệt đối không nêu tên ai đã bỏ phiếu NO).
  - Nút hành động: `Tạo kèo mới ngay` hoặc `Về trang chủ`.

### UI-10: Mạng, hết hạn và hủy phòng

Màn/banner lỗi có retry/refetch và thời điểm cache; rời phòng cần xác nhận. Pending không count ACK, hết hạn/stale không tự replay. Dựng states ở GM-11/12; recovery thật ở GM-31.

### UI-11: Bạn ăn cùng & Kèo nhanh (Friends Screen)
- **Mục tiêu:** Quản lý bạn bè và kích hoạt kèo ăn trong 1 nốt nhạc.
- **Giao diện:**
  - Nhập mã/link bạn bè theo contract để gửi yêu cầu; không mở API tìm tùy ý mọi user theo tên.
  - Danh sách Bạn ăn cùng:
    - Avatar tròn, Tên, Tag mối quan hệ (`Bạn thân`, `Đồng nghiệp`).
    - Nút theo trạng thái:
      - Nút cam nổi bật `⚡ Kèo nhanh`: xác nhận context/tạo phòng/gửi lời mời theo API; người nhận phải xác nhận, không tự join/ready.
      - Nếu Offline/Bận: Nút xám `🔔 Rủ ăn` (gửi push notification rủ rê).
  - Menu 3 chấm: Xóa bạn bè an toàn.

### UI-14 P1: Hồ sơ & liên kết tài khoản trong mẫu
- **Phạm vi:** Tên/avatar/theme dùng field core đã chốt; linking/recovery/sync ở GM-35. Phần kiêng cữ dưới đây chỉ mô tả mẫu tham khảo, chưa là yêu cầu triển khai core; muốn dùng cần task/field/source/privacy riêng.
- **Cấu trúc:**
  1. *Avatar & Thông tin:*
     - Chọn avatar nhanh từ hàng icon (`M`, `😎`, `🍜`, `🥑`, `🍔`, `🦊`, `🐱`, `🍕`).
     - Tên hiển thị & Khẩu hiệu ăn uống (Bio).
     - Khối sao chép ID cá nhân `#MINH-8899`.
  2. *Khối Dị ứng & Chất cần tránh (Đã tinh gọn triệt để):*
     - **Bỏ các mục vụn vặt:** Không đưa hành lá, tỏi, nấm... vào (vì tới quán dặn trực tiếp được).
     - **Tập trung vào 7 nhóm cốt lõi:**
       - 🦐 `Hải sản`
       - 🍺 `Đồ có cồn / Bia rượu` (quan trọng cho người lái xe, kiêng cồn)
       - 🥜 `Đậu phộng / Các loại hạt`
       - 🐟 `Đồ sống (Gỏi / Sashimi)`
       - 🥦 `Ăn chay (Không thịt)`
       - 🥛 `Sữa & Lactose`
       - 🌾 `Gluten / Bột mì`
     - **Ô tự nhập 1 dòng:** `[ Nhập chất khác (Mè, Trứng...) ] + [Thêm]` kèm nút `✕` xóa nhanh các mục tự nhập.
     - **Lưu ý y tế:** Khuyến cáo đối chiếu thành phần hỗ trợ nhóm chọn món, hỏi trực tiếp quán nếu có tiền sử sốc phản vệ.
  3. *Tài khoản & Đồng bộ P1:* Nút liên kết provider auth được review; không phải liên kết Google Drive.
  4. *Giao diện:* Nút chuyển đổi Chế độ Sáng / Tối.

### UI-12: Thông báo (Inbox Screen)
- **Mục tiêu:** Nhận và phản hồi lời mời ăn uống không bị phân tâm.
- **Giao diện:**
  - Mỗi thẻ lời mời hiển thị: Avatar người mời, Tên người mời (`Linh`), Buổi ăn (`Bữa trưa`), Thời gian (`Vừa xong`).
  - **Hai nút bấm cân đối rõ ràng:**
    - `✕ Bỏ qua` (màu xám / đỏ nhẹ cảnh báo).
    - `✓ Vào kèo ngay` (màu cam CTA chủ đạo).

### UI-13: Lịch sử ăn uống (Meal History)
- **Giao diện:** Thẻ tóm tắt các bữa ăn đã chốt thành công trong quá khứ (`🍜 Phở bò · Bữa trưa · Cùng Linh · Hoàn hảo`).
- Nút `Xóa lịch sử` để đảm bảo quyền kiểm soát dữ liệu cá nhân.

---

## 5. Bản đồ Component React Native (Component Mapping)

Khi triển khai code trong thư mục `mobile/src/`:

| HTML Prototype Element | React Native Component | Ghi chú kỹ thuật |
|---|---|---|
| `<div class="phone">` | `<SafeAreaView>` + `<KeyboardAvoidingView>` | Dùng `react-native-safe-area-context` |
| `<header class="appbar">` | `AppHeader` | Giữ fixed top, title + action icons |
| `<button class="primary">` | `AppButton variant="primary"` | `Pressable` có haptic feedback và `accessibilityRole="button"` |
| `<div class="flashcard">` | `SwipeableFlashcard` | Dùng `react-native-reanimated` + `react-native-gesture-handler` |
| Double-tap ❤️ | `Gesture.Tap().numberOfTaps(2)` | Kích hoạt Lottie/Reanimated heart pop, không xung đột single tap |
| `.dish-allergy-alert` | `AllergyBadge` | `View` chip có icon `⚠️`, màu warning nền mờ |
| `.chips` / `.diet-tag-btn` | `SelectableChip` | `Pressable` bo tròn 99dp, icon `✓` khi active |
| `.friends-row` | `<FlatList horizontal>` | `showsHorizontalScrollIndicator={false}` |
| Scanner Viewport | `<CameraView>` | Expo Camera tích hợp quét mã barcode/QR |
| Toast float | `Toast` (Global context) | Fade in/out từ đỉnh màn hình |

---

## 6. Tiêu chí Hoàn thành & QA (DoD Checklist for UI)

- [ ] **Màn hình hoạt động mượt mà:** Không giật lag (đạt 60fps khi quẹt thẻ flashcard và scroll danh sách).
- [ ] **Hỗ trợ đầy đủ Dark Mode:** Chuyển đổi theme mượt mà, không bị chói hoặc sai màu nền thẻ.
- [ ] **Khả năng tiếp cận (Accessibility):**
  - Mọi nút bấm và chip có `accessibilityLabel` và `accessibilityHint`.
  - Không dựa duy nhất vào màu sắc (luôn có icon + nhãn chữ đi kèm).
  - Hoạt động chuẩn xác với tính năng TalkBack (Android) và VoiceOver (iOS).
- [ ] **Kiểm thử trên thiết bị thật:** Đã verify trên ít nhất 2 thiết bị Android kích thước màn hình khác nhau (màn nhỏ ~360dp và màn lớn ~412dp).
