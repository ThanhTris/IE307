# Hướng dẫn Thiết kế & Triển khai UI — Gì Cũng Được (Mobile food-v1)

> **Mục đích:** Tài liệu này chuẩn hóa toàn bộ cấu trúc giao diện, luồng tương tác, component và quy chuẩn thiết kế từ bản nguyên mẫu tương tác [`design/prototypes/gi-cung-duoc.html`](../../design/prototypes/gi-cung-duoc.html) sang ứng dụng di động React Native (Expo + TypeScript).  
> **Đối tượng sử dụng:** Frontend Mobile Developers, Reviewers và QA trong dự án IE307.

> **Trạng thái 2026-10-08:** Bản hướng dẫn chờ review trong [GM-01](../../tasks/review/GM-01.md). Prototype là tham chiếu thị giác và mô phỏng; hành vi triển khai phải theo task/AC, [UI_SPEC](UI_SPEC.md), [ROOM_SPEC](ROOM_SPEC.md), [DECISION_SPEC](DECISION_SPEC.md) và [FOOD_DATA_SPEC](FOOD_DATA_SPEC.md). Các mục dưới đã đối chiếu lại để không mang hành vi mô phỏng trái contract vào app. Chưa có native evidence hoặc dependency được cài từ tài liệu này.

---

## 1. Triết lý Thiết kế & Trải nghiệm (Design Philosophy)

1. **Android-First & Thao tác một tay (One-Hand Ergonomics):**
   - Vùng tương tác chính (nút chọn, thẻ quẹt, thanh hành động) nằm ở nửa dưới màn hình (thumb zone).
   - Chiều cao touch target tối thiểu **48dp**; padding và margin rộng rãi, tránh bấm nhầm.
2. **Súc tích & Tinh gọn (Radical Simplicity):**
   - Form ngắn, có gợi ý và trạng thái lỗi rõ. Thành viên xác nhận context và chủ động ready; nhóm xác nhận một điểm ăn công cộng. Không thêm hồ sơ bệnh/dị ứng vào core hoặc suy an toàn từ tên món.
3. **Thân thiện & Tích cực:**
   - Tham khảo gam cam ấm của prototype (`#FF5A36`), nền ấm và typography tròn trịa. Tương phản là mục tiêu cần đo, chưa là kết quả đạt; GM-04 chốt semantic tokens theo [design system](../../design/DESIGN_SYSTEM.md) và kiểm cả hai theme.
4. **Bảo mật & Tôn trọng quyền riêng tư (Privacy-by-Design):**
   - Server là nguồn chân lý; không hiển thị phiếu bầu thô của thành viên khác; kết quả đồng thuận chỉ hiện món thắng và phân hạng tier.

---

## 2. Hệ thống Design Tokens

### 2.1. Bảng màu (Color Palette)

Bảng dưới ghi màu tham chiếu prototype, chưa thay tokens trong design system hoặc phê duyệt cặp chữ/nền. GM-04 phải đo text thường >=4.5:1 và chọn cặp đạt trước nghiệm thu; không mặc định chữ trắng trên cam/xanh/đỏ dưới đây đạt. Giữ icon và nhãn chữ ngoài màu.

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
| `warning` | `#D97706` | `#FBBF24` | Dữ liệu thiếu/stale, cần xác nhận |

### 2.2. Typography Scale

- **Title Large:** 24–28sp (Weight: 800/Heavy) — Tiêu đề màn hình chính.
- **Title Medium:** 18–20sp (Weight: 750/Bold) — Tên món ăn trên thẻ, tên mục lớn.
- **Body Regular:** 14–15sp (Weight: 500/Medium, line-height: 1.4) — Văn bản mô tả.
- **Body Bold:** 14–15sp (Weight: 700/Bold) — Nút bấm, nhãn trạng thái.
- **Caption / Meta:** 11–12sp (Weight: 600) — Giờ mở cửa, giá tham khảo, ID bạn bè.
- **Room Code:** Mã phòng 6 ký tự theo charset server loại ký tự dễ nhầm; không giới hạn bàn phím số khi contract cho phép chữ. Font, spacing và wrap phải kiểm ở font 200%.

Typography là tham chiếu thị giác; app dùng semantic scale, allowFontScaling và kiểm TalkBack/font 200%/320dp theo UI_SPEC, không khóa kích thước để giữ nguyên bố cục HTML.

---

## 3. Kiến trúc Header Toàn cục (Global App Bar)

Header luôn hiện ở đầu ứng dụng với cấu trúc tối giản:
- **Bên trái (App Brand):**
  - Icon Vector Logo (chiếc bát cơm mặt cười bốc khói) + Chữ **Gì Cũng Được**.
  - Hành động: Chạm về Trang chủ phải qua guard trạng thái phòng; rời phiên đang chạy cần xác nhận theo ROOM_SPEC, không âm thầm hủy hoặc bỏ membership.
- **Bên phải (3 Nút hành động nhanh):**
  1. `👥` **Bạn ăn cùng:** Mở màn hình Bạn bè & Kèo nhanh (`UI-11`). Huy hiệu dựa trên inbox server được phép đọc.
  2. `🔔` **Thông báo:** Mở màn hình Hộp thư / Lời mời ăn (`UI-12`). Huy hiệu chấm cam khi có tin chưa xem.
  3. **Avatar người dùng:** Hiển thị tên/identity hiện tại. Panel hồ sơ của prototype là tham khảo, chưa có UI-ID core riêng; account/recovery thuộc `UI-14` P1.

---

## 4. Màn hình theo UI-ID hiện hành

UI-ID dùng [UI_SPEC](UI_SPEC.md): UI-10 network/expiry/cancel, UI-11 friends, UI-12 inbox, UI-13 history, UI-14 account P1, UI-15 public anchor/offering P0, UI-16 weather/mood P2. Không suy UI-ID từ thứ tự trang của prototype.

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
     - Không suy Online/Rảnh từ fixture; chỉ hiện trạng thái nếu contract server có dữ liệu được phép chia sẻ.
     - Nút `＋ Thêm bạn` dạng viền nét đứt.
     - Nút `Xem tất cả ›` dẫn tới màn Bạn bè.

### UI-02: Tạo phòng (Create Room)
- **Mục tiêu:** Thiết lập thông số cơ bản cho phòng nhóm mà không rườm rà.
- **Cải tiến cốt lõi:**
  - Chọn public anchor trong coverage đã publish, nhóm xác nhận trước ready. GPS foreground chỉ gợi ý trên máy; deny/GPS lỗi có manual fallback. Server nhận anchorId/radiusM, không GPS cá nhân.
  - Gợi ý **Buổi ăn** theo CONTEXT_HISTORY_SPEC: sáng 05:00–10:59, trưa 11:00–14:59, ăn nhẹ 15:00–17:59, tối 18:00–21:59; giờ khác là dinner với hint late-night. Host xác nhận/sửa; không lấy đồng hồ từng máy làm authority.
  - Radius theo mét và giới hạn server được reviewer chốt; chip `1km`, `2km`, `5km` trong prototype chỉ là gợi ý trình bày.
  - Ăn ngay dùng server time + buffer một lần; đặt giờ cụ thể không cộng lại. Hiển thị desiredAt/buổi đã xác nhận và budget nullable; ngoài coverage/unknown/pool rỗng cho sửa context, không tự nới điều kiện.
  - Nút chuyển tiếp: `Chọn khẩu vị →`.

### UI-03: Vào phòng (Join Room)
- **Mục tiêu:** Vào phòng qua mã 6 ký tự, QR hoặc incoming link; user xác nhận, server kiểm auth/expiry/capacity.
- **Cấu trúc 2 Tab chuyển đổi:**
  - **Tab 1: Nhập mã:** Hỗ trợ charset server, paste và thông báo invalid/full/locked/expired. Nút điền mẫu chỉ có trong mô phỏng/test, không production.
  - **Tab 2: Quét mã QR:** Camera permission, parser allowlist và manual fallback. Flash/import ảnh chỉ thêm khi task/package đã review; khung quét HTML không là camera thật. Không mở arbitrary URL hoặc tự join/ready.

### UI-04: Chọn khẩu vị (Food Preferences)
- **Mục tiêu:** Lấy sở thích tức thời của cá nhân trước khi bước vào phòng.
- **Cải tiến UX:**
  - **Hero Card "✨ Gì cũng được":** Nằm trên cùng và được **chọn mặc định**. Phù hợp với tâm lý người lười nghĩ hoặc "ăn gì cũng vui".
  - **Nhóm chip thể loại ưu tiên:** Món nước, Cơm, Bún/Phở, Lẩu, Nướng, Món Nhật, Ăn vặt, Thanh đạm... Chạm để bật/tắt (khi chọn chip thì Hero card tự bỏ chọn).

### UI-05: Phòng chờ (Lobby Screen)
- **Mục tiêu:** Tập hợp thành viên và bắt đầu khi đủ người.
- **Cải tiến UX:**
  - **Ready chủ động:** Người mới vào có ready=false; xác nhận context/preferences/consent trước bấm Sẵn sàng. Đổi context reset cả nhóm; đổi preferences/consent reset người đó. Host chỉ start khi đủ 2–8 người và mọi người ready, server revalidate pool.
  - **Mã phòng 6 ký tự:** Hiện mã/QR/link cùng copy và fallback; không dùng QR placeholder làm bằng chứng native.
  - **Danh sách thành viên:** Hiển thị avatar tròn, tên và tag `Chủ phòng` / `Bạn`.
  - **Nút Bắt đầu:** Chỉ Host mới thấy nút `Bắt đầu chọn món →`. Member thấy trạng thái `Chờ chủ phòng bắt đầu...`.

### UI-06: Chọn món Vòng 1 (Flashcard Vote)
- **Mục tiêu:** Biểu quyết nhanh chóng, hào hứng bằng cử chỉ một tay.
- **Cử chỉ & Nút tương tác:**
  - **Double-tap ảnh món:** Bắn tim `❤️` bay lên kiểu TikTok và tự động ghi nhận phiếu `WANT (Muốn ăn)`.
  - **Ba nút luôn hiện:** `WANT (Muốn ăn)` / `OK (Ăn được)` / `NO (Không ăn)`; TalkBack dùng nút chuẩn. Double-tap chỉ đặt WANT, không toggle hoặc submit; giảm chuyển động bỏ hiệu ứng tim.
  - **Swipe ngang tùy chọn:** Phải là WANT, trái là NO theo UI_SPEC; OK dùng nút. Scroll/chạm đơn/vuốt dọc không vote, nút chi tiết riêng.
  - **Sửa trước Gửi:** Back/undo chỉ sửa DRAFT; UNSET chặn submit. QUEUED chưa từng gửi có hủy local rõ; SENDING/UNKNOWN khóa payload tới reconcile. Chờ gửi khác Server đã nhận, chỉ ACK tăng progress.
- **Thông tin trên thẻ món ăn:**
  - Ảnh món ăn nổi bật (bo góc 20dp).
  - Tên món ăn (`Phở bò`, `Sushi & Sashimi`...).
  - Chip phân loại & Mức giá ước tính (`🏷️ ~45k - 65k`).
  - **Offering/lịch/giá:** Hiện nguồn/ngày kiểm, đơn vị giá hoặc Chưa có giá; lịch quán giao lịch món tại desiredAt, không ghép thuộc tính giữa quán. Copy “dự kiến phục vụ theo lịch đã kiểm”, không claim tồn kho live.
- **Thông tin thành phần:** Nếu có nguồn được kiểm thì hiển thị giới hạn/unknown; người dùng tự chọn NO. Hồ sơ dị ứng và cảnh báo “thời gian thực” của prototype không thuộc core, không được coi là chứng nhận an toàn.

### UI-07: Chọn lọc Vòng 2 (Consensus Elimination)
- **Mục tiêu:** Giải quyết tình huống Vòng 1 có nhiều món cùng ăn được nhưng chưa có món nào đạt đồng thuận tuyệt đối.
- **Giao diện:**
  - Banner xanh: `⚡ VÒNG 2 · CHỌN LỌC — Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.`
  - Danh sách thẻ món rút gọn:
    - Nút toggle đôi: `✓ Giữ` (xanh ngọc) và `✕ Đã loại` (xám mờ).
    - Chỉ chứa tập không NO từ vòng 1; không phục hồi món đã loại.
  - Nút `Gửi lựa chọn`: cho phép Loại hết; một món vẫn cần mọi người xác nhận. Server đợi đủ phiếu rồi DECIDED hoặc NO_CONSENSUS; client không tự chốt winner, không vòng 3.

### UI-08: Kết quả đồng thuận (Winner Screen)
- **Mục tiêu:** Tuyên bố món ăn chiến thắng và chuyển hướng ra trải nghiệm ngoài đời.
- **Giao diện:**
  - Biểu tượng ăn mừng lớn.
  - Tiêu đề/lý do đúng matchTier PERFECT/CONSENSUS/COMPROMISE do server trả; không gọi mọi kết quả là cả nhóm cùng muốn.
  - Món thắng và offering có nguồn thật đúng context; tên/địa chỉ trong prototype là fixture, chưa là dataset verified. Refetch nếu nơi bán đổi, không còn thì thông báo và cho tạo phiên mới; không reroll resultId.
  - Nút CTA mở bản đồ: `🗺️ Mở chỉ đường Google Maps`.
  - Nút phụ: `Về trang chủ`.

### UI-09: Chưa đồng thuận (No Consensus)
- **Mục tiêu:** Xử lý tình huống không tìm được món ăn chung một cách tích cực, không đổ lỗi.
- **Giao diện:**
  - Lý do trung tính: *"Mỗi bạn hôm nay đều có gu ăn riêng. Không sao cả, hãy thử mở kèo khác nhé!"* (Tuyệt đối không nêu tên ai đã bỏ phiếu NO).
  - Nút hành động: `Tạo kèo mới ngay` hoặc `Về trang chủ`.

### UI-10: Network, expiry và cancel

Cache ghi fetchedAt; pending không tăng tiến độ nhóm. Reconnect refetch trước replay; stale round/pool/auth/expiry không gửi. Rời phiên active cần xác nhận hủy; terminal không mở lại phiếu. Không hứa nhóm chốt offline hoặc gửi nền khi OS kill.

### UI-11: Bạn ăn cùng & Kèo nhanh (Friends Screen)
- **Mục tiêu:** Quản lý bạn bè và kích hoạt kèo ăn trong 1 nốt nhạc.
- **Giao diện:**
  - Thêm bạn bằng friend code/link; không list/search user tùy ý qua tên hoặc upload danh bạ. Recipient accept mới thành pair.
  - Danh sách Bạn ăn cùng:
    - Avatar tròn, Tên, Tag mối quan hệ (`Bạn thân`, `Đồng nghiệp`).
    - Nút mời: user chọn bạn/context và xác nhận create+invite idempotent. Recipient xác nhận join, không tự ready/vote. Inbox hoạt động khi push denied; không suy Online/Bận từ fixture.
  - Menu 3 chấm: Xóa bạn bè an toàn.

### Panel hồ sơ trong prototype — tham khảo ngoài core
- **Mục tiêu:** Ghi nhận ý tưởng thị giác; chưa có task/contract cho bio, avatar tùy chọn hoặc hồ sơ kiêng cữ lâu dài. Không triển khai/persist các trường này theo bản HTML.
- **Cấu trúc:**
  1. *Avatar & Thông tin:*
     - Chọn avatar nhanh từ hàng icon (`M`, `😎`, `🍜`, `🥑`, `🍔`, `🦊`, `🐱`, `🍕`).
     - Tên hiển thị & Khẩu hiệu ăn uống (Bio).
     - Khối sao chép ID cá nhân `#MINH-8899`.
  2. *Khối Dị ứng & Chất cần tránh — ý tưởng mô phỏng, chưa thuộc scope được review:*
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
  3. *Tài khoản & Đồng bộ:* UI-14 P1/GM-28; provider chưa chốt, không tự thêm Google Drive hoặc account linking vào P0.
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
- Theo consent: 30 ngày/50 mục local, summary nhóm chỉ khi mọi người opt-in và ACL đúng roster; rút consent/xóa được thực thi server. Offline có nhãn fetchedAt; không raw votes/GPS/anchor/mood trong history mặc định.

### UI-14 P1 / UI-15 P0 / UI-16 P2

- UI-14: account link/recovery/history sync sau GM-27; lỗi giữ guest session, không chuyển ownership bằng email tự nhập.
- UI-15: chọn public anchor/coverage/radius/desiredAt và xem offering nguồn/lịch; manual/deny/out-of-coverage/unknown rõ. Khoảng cách đường chim bay tới anchor, không GPS cá nhân hoặc route.
- UI-16: weather/mood opt-in GM-31 sau core; stale/timeout/bỏ qua không chặn eligibility/vote, không override NO hoặc đổi pool sau start.

---

## 5. Bản đồ Component React Native (Component Mapping)

Khi triển khai code trong thư mục `mobile/src/`:

| HTML Prototype Element | React Native Component | Ghi chú kỹ thuật |
|---|---|---|
| `<div class="phone">` | `<SafeAreaView>` + `<KeyboardAvoidingView>` | Dùng `react-native-safe-area-context` |
| `<header class="appbar">` | `AppHeader` | Giữ fixed top, title + action icons |
| `<button class="primary">` | `AppButton variant="primary"` | `Pressable` có haptic feedback và `accessibilityRole="button"` |
| `<div class="flashcard">` | `DishCard` + `VoteActions` | Gesture library chỉ sau package/license review GM-02; ba nút hoạt động độc lập |
| Double-tap ❤️ | Tap recognizer + WANT action | Scroll cancel/TalkBack/reduced motion kiểm native; không bắt buộc Lottie hoặc dependency mới |
| `.dish-allergy-alert` | Ngoài core | Không port hồ sơ dị ứng/cảnh báo từ fixture thành cam kết an toàn |
| `.chips` / `.diet-tag-btn` | `SelectableChip` | `Pressable` bo tròn 99dp, icon `✓` khi active |
| `.friends-row` | `<FlatList horizontal>` | `showsHorizontalScrollIndicator={false}` |
| Scanner Viewport | `<CameraView>` | Expo Camera tích hợp quét mã barcode/QR |
| Toast float | `Toast` (Global context) | Fade in/out từ đỉnh màn hình |

Tên package trong mapping chỉ là ứng viên kỹ thuật. GM-02 sở hữu package/lockfile/config/runner; chưa cài package từ bảng này. Routes mỏng; use cases và adapters tách feature; domain không React/network, server là nguồn result.

---

## 6. Tiêu chí Hoàn thành & QA (DoD Checklist for UI)

- [ ] **Hiệu năng:** Đo trên Android và ghi thiết bị/phiên bản/kịch bản; không báo 60fps từ prototype chưa đo.
- [ ] **Hỗ trợ đầy đủ Dark Mode:** Chuyển đổi theme mượt mà, không bị chói hoặc sai màu nền thẻ.
- [ ] **Khả năng tiếp cận (Accessibility):**
  - Mọi nút bấm và chip có `accessibilityLabel` và `accessibilityHint`.
  - Không dựa duy nhất vào màu sắc (luôn có icon + nhãn chữ đi kèm).
  - Hoạt động chuẩn xác với tính năng TalkBack (Android) và VoiceOver (iOS).
- [ ] **Kiểm thử trên thiết bị thật:** Đã verify trên ít nhất 2 thiết bị Android kích thước màn hình khác nhau (màn nhỏ ~360dp và màn lớn ~412dp).
- [ ] Font 200%/320dp/safe area/touch48/contrast >=4.5:1/reduced motion/image fallback, loading/empty/error theo T-12.
- [ ] T-06/07/16/19/21/25: ready/context, Loại hết, pending/ACK, gesture, source/unknown và stable result có evidence thật.

Checklist là kế hoạch chưa thực thi. Chỉ reviewer độc lập nghiệm thu đúng revision; HTML và tests tooling không là native/backend proof. Trước code chạy readiness task; GM-01 vẫn review.
