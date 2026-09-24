# MEMO PROJECT — SYSTEM HANDOFF & CONTEXT GUIDE FOR AI AGENTS
> **Tài liệu chuyển giao kỹ thuật & ngữ cảnh dự án toàn diện cho các AI Agent và Developer tiếp quản.**
> **Cập nhật ngày:** 23/09/2026
> **Phiên bản:** 2.8 (Stacking Context Resolution, Global Modal Architecture & CDP Verification Pass)
> **Tệp mã nguồn trung tâm:** `memo-vocabulary.html` (Single-page mobile-first application)

---

## 1. Tổng quan Dự án (Project Executive Summary)

- **Tên ứng dụng:** **Memo** (Flashcard & Spaced Repetition System học từ vựng tiếng Nhật).
- **Mục tiêu sản phẩm:** Ứng dụng ôn tập thẻ ghi nhớ tối giản, hiện đại, lấy cảm hứng kết hợp giữa Quizlet (lật thẻ 3D trực quan, tương tác mượt) và Anki (thuật toán Spaced Repetition SM-2/FSRS, hệ thống loại thẻ Note Type, trường dữ liệu mở rộng, gắn cờ đa màu sắc và cấu hình ôn tập chuyên sâu).
- **Ngôn ngữ nội dung học:** Tiếng Nhật (Kanji, Furigana/Reading) kèm dịch nghĩa và câu ví dụ.
- **Ngôn ngữ giao diện (UI):** **100% Tiếng Việt** tự nhiên, đồng bộ, chuẩn xác theo thuật ngữ học tập & SRS (có chú thích thuật ngữ kỹ thuật trong ngoặc đơn ở những vị trí cần thiết như `Mặt trước (Front)`, `Cơ bản (Basic)`).
- **Môi trường & Preview:**
  - Workspace: `c:\Code\IE307\Project`
  - Web Server: `http://127.0.0.1:4173/memo-vocabulary.html`
  - Định dạng viewport: Mobile-first (được tối ưu xem tốt nhất ở chiều rộng 430px hoặc trên điện thoại).

---

## 2. Kiến trúc & Nguyên tắc Kỹ thuật (Technical Principles)

1. **Kiến trúc SPA không Framework (Pure Vanilla HTML5 / Modern CSS3 / ES6+):**
   - Toàn bộ giao diện, stylesheet và logic nằm trọn vẹn trong file duy nhất `memo-vocabulary.html`.
   - Điều hướng màn hình bằng **URL Hash** (`#learn`, `#decks`, `#study`, `#import`, `#note-edit`, `#note-types`, `#review-settings`, `#games`, `#matching`, `#ninja`, `#multiple-choice`, `#result`, `#profile`).
   - Hàm `showScreen(screenName)` quản lý ẩn/hiện các `<section class="screen" id="screen-[name]">`.
   - **Vị trí các Modal toàn cục (`#flag-picker-modal`, `#custom-picker-layer`):** Đặt trực tiếp dưới gốc `.app-frame` (ngay trước `#toast`), KHÔNG đặt lồng trong bất kỳ `<section class="screen">` nào. Điều này đảm bảo modal có thể mở mượt mà từ bất kỳ màn hình nào (`#study`, `#note-edit`, `#decks`) mà không bị ảnh hưởng bởi thuộc tính `display: none` của các màn hình không active.
   - **Quy tắc Xếp lớp Stacking Context cho Modal Dialogs:**
     - Lớp nền mờ `.study-sheet-backdrop` có `position: absolute; inset: 0; z-index: 1; backdrop-filter: blur(6px)`.
     - Hộp thoại bên trong (`.flag-picker-dialog`, `.custom-picker-dialog`, `.study-sheet`) **bắt buộc phải có `position: relative; z-index: 2`**.
     - *Cảnh báo kỹ thuật:* Nếu thiếu `position: relative; z-index: 2`, lớp backdrop sẽ đè lên trên dialog, khiến lớp kính mờ làm mờ toàn bộ chữ bên trong modal và chặn mọi cú click chuột/chạm tay của người dùng.
2. **Bảo tồn Tuyệt đối 152 Inspection Anchors (`data-od-id`):**
   - Dự án tích hợp hệ thống kiểm thử tự động OpenDesign với các thẻ `data-od-id`. Khi bổ sung hoặc sửa giao diện, **tuyệt đối không xóa bất kỳ thuộc tính `data-od-id` nào** đã có (hiện có đúng 152 anchor được xác minh).
3. **Design Tokens nhất quán tại `:root`:**
   - Palette màu: Nền sáng `--bg: #F8FAFC`, thẻ trắng `--surface: #FFFFFF`, màu chữ `--fg: #0F172A`, màu thương hiệu Memo Indigo `--accent: #4F46E5`, các màu trạng thái học: Xanh lục `--green: #10B981`, Đỏ thẫm `--danger: #EF4444`, Vàng hổ phách `--amber: #F59E0B`.

---

## 3. Các tính năng & Màn hình đã hoàn thiện (Completed Modules)

### Màn hình 1: Trang chủ / Hôm nay (`#screen-learn`)
- Hero card tóm tắt mục tiêu ngày: thanh tiến độ học, số thẻ cần ôn, nút bấm lớn "Bắt đầu ôn tập".
- Dải chỉ số: `0 Mới`, `12 Đang học`, `4 Đến hạn`.
- Phím tắt truy cập nhanh 3 minigame ôn tập phản xạ (`Ghép thẻ`, `Word Ninja`, `Trắc nghiệm`).
- Danh sách các bộ thẻ đang học dở dang.

### Màn hình 2: Thư viện bộ thẻ & Lọc theo cờ (`#screen-decks`)
- Hiển thị danh sách bộ thẻ kèm thanh tiến độ thành thạo và huy hiệu số thẻ đến hạn.
- **Thanh lọc theo cờ (Review by Flag Bar):** Tích hợp các chip cờ 🔴 Đỏ, 🟠 Cam, 🟡 Vàng, 🟢 Lục, 🔵 Lam, 🟣 Tím.
- **Banner Ôn tập theo cờ tương tác (`#flag-review-banner`):** Khi chạm vào bất kỳ màu cờ nào, banner xuất hiện với chấm màu cờ, tên cờ, số lượng thẻ gắn cờ và nút bấm **"Ôn theo cờ này"** (`#btn-start-flag-study`) cho phép vào thẳng phiên học tập trung chỉ gồm các thẻ mang màu cờ đó.
- Nút thêm/nhập bộ thẻ dẫn tới `#import`.

### Màn hình 3: Nhập thẻ thông minh (`#screen-import`)
- Hỗ trợ 3 phương thức:
  1. Tải file CSV / Excel.
  2. Dán văn bản thô (có tùy chọn ký tự phân cách Delimiter: Tab, Phẩy `,`, Chấm phẩy `;`, Gạch đứng `|`).
  3. **Nhập từ Quizlet & Anki:** Bộ phân tích cú pháp tự động (Auto-parser) nhận diện định dạng xuất của Quizlet (Tab/Dấu gạch ngang) và Anki (header tag `#separator:tab`, `#tags`, `#html`). Kèm hướng dẫn xuất thẻ tiếng Việt rõ ràng và nút nạp dữ liệu mẫu nhanh.
- **Ánh xạ cột (Column Mapping):** Bố cục dạng CSS Grid `1fr 132px` thẳng hàng tăm tắp; các cột chuẩn `Mặt trước`, `Cách đọc`, `Ý nghĩa`, `Ví dụ` cho phép gán từng cột sang Mặt trước, Mặt sau hoặc Bỏ qua. Hỗ trợ modal đổi tên tiêu đề cột thủ công.
- Bảng Preview thẻ tương tác trực tiếp: cho phép chỉnh sửa nội dung từng ô và nút xóa từng dòng trước khi lưu.

### Màn hình 4: Phiên học tập trung (`#screen-study`)
- **Tập trung cao độ (Distraction-free):** Tự động ẩn thanh điều hướng đáy khi đang học.
- Thanh công cụ phía trên: Nút quay lại, tiêu đề phiên học, nút **Hoàn tác (Undo)** kết quả vừa chấm, nút **Gắn cờ (Flag)** và nút menu ba chấm.
- **Huy hiệu Cờ & Nhãn trên Thẻ (`#study-card-meta-tags`):**
  - Trực tiếp trên thẻ flashcard, góc trên bên trái hiển thị huy hiệu cờ dạng pill (`.card-tag-flag-pill`) với chấm màu và tên cờ rõ ràng kèm các tag (`#jlpt-n5`, `#lesson-01`).
  - Chạm vào huy hiệu cờ trên thẻ sẽ lập tức mở Modal Gắn cờ mà không kích hoạt lật thẻ (Stop propagation).
  - Chạm vào icon cờ trên thanh công cụ trên cùng cũng mở Modal Gắn cờ đồng bộ; nếu modal đang mở, chạm lại vào icon cờ sẽ đóng modal (Toggle behavior).
- **Lật thẻ 3D 2 chiều (Bidirectional Flip):** Chạm vào phần nội dung thẻ hoặc bấm phím `Space` để lật qua lại mượt mà giữa Mặt trước (Kanji + Furigana) và Mặt sau (Nghĩa tiếng Anh/Việt + Câu ví dụ).
- **Bảng điều khiển Modal Sheet & Menu tùy chọn:** Menu gồm 4 chức năng cốt lõi tinh gọn (`Chỉnh sửa thẻ`, `Cài đặt ôn tập`, `Hẹn lại lịch ôn`, `Thông tin thẻ`), đã loại bỏ mục trung gian thừa `Tác vụ khác` giúp giao diện không bị trùng lặp.

### Màn hình 5: Chỉnh sửa thẻ (`#screen-note-edit`)
- **Floating Island Toolbar:** Thanh công cụ định dạng nổi bo góc 18px với hiệu ứng kính mờ (Frosted glass) cao cấp, cố định ở mép dưới `sticky; bottom: 12px;` thuận tiện cho thao tác ngón cái. Phân nhóm: Định dạng chữ (In đậm, In nghiêng, Gạch chân, Gạch ngang), Dạ quang Highlight, Đổi màu chữ, Tạo chỗ trống Cloze `[...]`, Danh sách gạch đầu dòng, Xóa định dạng `Tx`, Chèn ảnh và Phát âm.
- **Custom Centered Picker Modal:** Modal popup hiện đại chọn Loại thẻ (`Cơ bản (Basic)`, `Cơ bản & Đảo ngược (Reversed)`, `Điền chỗ trống (Cloze)`) và Bộ thẻ (Deck) với mô tả chi tiết và dấu tích xanh.
- **Modal Gắn cờ đa màu sắc (Flag Picker Modal):** Mở ra 6 màu cờ chuẩn Anki (Đỏ, Cam, Vàng, Lục, Lam, Tím) kèm tính năng **Tùy biến tên nhãn cờ** (ví dụ: gán cờ Đỏ thành "Từ vựng thi JLPT"). Nút cờ trên toolbar và huy hiệu trên thẻ đồng bộ màu tức thì. Khi chọn màu cờ, cờ được highlight tức thì, không bị tắt đột ngột, người dùng có thể gõ đổi tên nhãn cờ (hỗ trợ phím `Enter`) hoặc bấm nút "Xong" để đóng modal. Dialog được thiết lập `position: relative; z-index: 2` đảm bảo hiển thị sắc nét nổi bật trước lớp backdrop mờ.
- Các trường thông tin chuẩn mực: Thuật ngữ mặt trước, Furigana cách đọc, Nghĩa mặt sau, Câu ví dụ và Bản dịch ví dụ.

### Màn hình 6: Cấu trúc loại thẻ (`#screen-note-types`)
- Quản lý các mẫu loại thẻ: `Cơ bản (Basic)`, `Cơ bản & Đảo ngược (Reversed)`, `Điền chỗ trống (Cloze)`.
- Tab `Các trường`: Quản lý các trường thông tin của thẻ, nhân bản từ mẫu, sắp xếp vị trí và xóa trường.
- Tab `Mẫu thẻ`: Quản lý các mẫu hiển thị (Card templates), thêm thẻ đảo ngược (Reverse card) và live preview mặt trước / mặt sau.

### Màn hình 7: Cài đặt ôn tập chuẩn Anki Mobile 100% (`#screen-review-settings`)
- Được dựng tỉ mỉ bám sát 6 ảnh chụp màn hình từ Anki Mobile chính thức, toàn bộ nhãn và điều khiển được chuẩn hóa tiếng Việt:
  1. **Thanh Mẫu cấu hình (Preset Bar):** Chọn preset (`Mặc định`, `Ôn tập chuyên sâu`, `Cấu hình tuỳ chỉnh cá nhân`) và nút Lưu màu xanh.
  2. **Giới hạn ngày (Daily Limits):** Thẻ mới/ngày & Ôn tập tối đa/ngày với 3 tab segmented (`Mẫu chung` / `Bộ thẻ này` / `Chỉ hôm nay`), hộp cảnh báo màu vàng và các toggle switch:
     - `Thẻ mới không tính vào giới hạn ôn tập 🌐`
     - `Áp dụng giới hạn từ trên xuống 🌐`
  3. **Thẻ Mới (New Cards):** Bước học (`1m 10m`), Khoảng cách mức Được/Dễ, Lệnh chèn tuần tự/ngẫu nhiên.
  4. **Hỏng (Lapses):** Bước học lại (`10m`), Ngưỡng thành thẻ bám (`8`), Hành động với thẻ bám (`Chỉ gắn Nhãn`).
  5. **Thứ tự hiển thị & FSRS:** Tùy chọn ưu tiên thẻ mới/ôn tập và thuật toán FSRS thế hệ mới.
  6. **Âm thanh & Bộ hẹn giờ:** Số giây trả lời tối đa, đồng hồ bấm giờ, tự động phát âm, `Dừng đồng hồ khi bấm trả lời`.
  7. **Tự động chuyển thẻ (Auto-advance):** `Số giây hiển thị câu hỏi`, `Số giây hiển thị câu trả lời`, `Chờ âm thanh phát xong`, `Hành động khi hết giờ câu hỏi` (Hiện đáp án / Lật mặt thẻ ngay), `Hành động khi hết giờ câu trả lời` (Tạm hoãn thẻ / Đánh giá Tốt / Bỏ qua).
  8. **Easy Days (Ngày học nhẹ trong tuần):**
     - Tiêu đề card: `Easy Days (Ngày học nhẹ)` tinh gọn trên 1 dòng duy nhất, không bị tràn/rớt chữ.
     - Hàng tiêu đề cột chuyên biệt (`.easy-day-col-header`): `Ngày` (cột trái 68px) và 3 cột mức độ `Tối thiểu` — `Giảm tải` — `Bình thường` (cột phải căn thẳng hàng với các nấc trượt).
     - 7 thanh trượt điều chỉnh khối lượng học cho từng ngày trong tuần (`Thứ 2` đến `Chủ nhật`) kèm các nấc chấm tròn trực quan và phản hồi toast tức thì khi kéo.
  9. **Nâng cao (Advanced SM-2):** Khoảng tối đa (`36500`), Độ dễ ban đầu (`2,50`), Phần chênh mức Dễ (`1,30`), Hệ số khoảng cách (`1,00`), Khoảng cách mức Khó (`1,20`), Khoảng mới (`0,00`).

### Màn hình 8, 9, 10, 11, 12: Trung tâm trò chơi (Games Hub & Minigames)
- **#games:** Danh mục 3 minigame phản xạ từ vựng.
- **#matching (Ghép thẻ):** Nối thẻ Kanji tiếng Nhật với thẻ giải nghĩa tương ứng, có phản hồi hướng dẫn tiếng Việt chuẩn ("Chạm vào một từ tiếng Nhật, sau đó chọn nghĩa tương ứng.").
- **#ninja (Word Ninja):**
  - Từ vựng rơi từ mép trên đỉnh màn hình xuống (không xuất hiện giữa chừng) với tốc độ rơi 5.8s – 6.8s.
  - Quỹ đạo bay lượn sóng tự nhiên (Organic drifting trajectory) kèm góc nghiêng xoay nhẹ.
  - Tự động xáo trộn làn và đổi tọa độ ngẫu nhiên mỗi khi rơi xong hoặc khi chém trúng từ đúng.
  - Nút BOM ziczac nguy hiểm, chạm trúng sẽ mất tim (`❤️❤️❤️`).
- **#multiple-choice (Trắc nghiệm):** Chọn 1 trong 4 đáp án nghĩa chính xác ("Chọn nghĩa tiếng Anh tương ứng của từ.").
- **#result (Kết quả):** Màn hình tổng kết điểm số XP, độ chính xác và tỷ lệ hoàn thành vòng chơi.

---

## 4. Hướng dẫn Dành cho AI Agent tiếp quản (Agent Guidelines)

Khi tiếp tục thực hiện các yêu cầu mới của người dùng trong dự án này:

1. **Bảo tồn tính toàn vẹn của mã:**
   - Giữ nguyên các hàm cốt lõi: `showScreen`, `renderStudyCard`, `setCardFlipped`, `resetNinja`, `randomizeNinjaTargets`, `openFlagPickerModal`, `syncImportState`, `openCustomPicker`, v.v.
   - Luôn bảo tồn đủ **152 data-od-id anchors** (không bao giờ được giảm).
2. **Kiểm tra cú pháp & tính toàn vẹn sau mỗi lần sửa (Verification Script):**
   - Chạy lệnh sau để đảm bảo không phát sinh lỗi cú pháp JavaScript:
     ```powershell
     node -e "const fs = require('fs'); const html = fs.readFileSync('memo-vocabulary.html', 'utf8'); const scripts = html.match(/<script>([\s\S]*?)<\/script>/g); scripts.forEach((s) => new Function(s.replace(/<\/?script>/g, ''))); console.log('Syntax OK');"
     ```
   - Kiểm tra số lượng anchor:
     ```powershell
     powershell -Command "(Select-String -Path 'memo-vocabulary.html' -Pattern 'data-od-id').Matches.Count"
     ```
3. **Thẩm mỹ thiết kế (UI/UX) & Ngôn ngữ:**
   - Đảm bảo toàn bộ văn bản giao diện là tiếng Việt tự nhiên, thống nhất với các màn hình hiện có.
   - Giữ phong cách hiện đại, tinh giản, thân thiện, loại bỏ các chi tiết thừa.
   - Tuân thủ palette biến CSS `:root` và hệ thống bo góc chuẩn `14px - 20px`.
