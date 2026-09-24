# Memo ↔ Antigravity ↔ OpenDesign handoff

## 1. Mục đích của tài liệu

Đọc tài liệu này trước khi chỉnh prototype Memo. Đây là hợp đồng kỹ thuật và
thiết kế để Antigravity có thể tiếp tục code cùng prototype đang được preview
bằng OpenDesign mà không làm mất các luồng đã có.

Prototype hiện tại là một single-page mobile-first app trong
`memo-vocabulary.html`. Nội dung học là từ vựng tiếng Nhật; ngôn ngữ giao diện
toàn bộ là **100% Tiếng Việt** tự nhiên, đồng bộ và chuẩn mực.

Tài liệu UI chi tiết hơn nằm ở
`UI-IMPLEMENTATION-NOTES.md` và cẩm nang kỹ thuật chuyên sâu tại `AI-CONTEXT-HANDOFF.md`. Khi các tài liệu có vẻ khác nhau, ưu tiên:

1. yêu cầu mới nhất của người dùng;
2. cấu trúc và hook đang chạy trong `memo-vocabulary.html`;
3. cẩm nang kỹ thuật `AI-CONTEXT-HANDOFF.md` và ghi chú trong `UI-IMPLEMENTATION-NOTES.md`.

## 2. Chạy và preview

Thư mục làm việc:

```text
C:\Code\IE307\Project
```

Chạy server tĩnh từ thư mục này:

```powershell
python -m http.server 4173
```

Preview chính:

```text
http://127.0.0.1:4173/memo-vocabulary.html#study
```

Các route dùng để kiểm tra nhanh:

```text
#learn              Trang chủ / Hôm nay (Today dashboard)
#decks              Thư viện bộ thẻ & Thanh lọc theo cờ (Review by Flag)
#import             Nhập thẻ thông minh (CSV/Excel, Paste, Quizlet & Anki auto-parse)
#study              Phiên học tập trung (Lật 3D 2 chiều, Hoàn tác, Cờ đa màu, Đánh giá trực tiếp)
#note-edit          Chỉnh sửa thẻ (Thanh công cụ nổi cao cấp, Custom Picker Modal)
#note-types         Cấu trúc loại thẻ (Tab Các trường + Tab Mẫu thẻ)
#review-settings    Cài đặt ôn tập chuẩn Anki Mobile (FSRS, Bảng Easy Days, Tự động chuyển thẻ)
#games              Trung tâm trò chơi (Danh mục minigames)
#ninja              Word Ninja (Từ vựng rơi lượn sóng từ đỉnh màn hình, bom ziczac)
#matching           Ghép thẻ (Nối thẻ Kanji và nghĩa tiếng Việt)
#multiple-choice    Trắc nghiệm 4 đáp án
#result             Tổng kết điểm & tiến độ vòng chơi
#profile            Hồ sơ học tập & thống kê lỗi sai
```

Ứng dụng đổi màn hình bằng hash, không dùng router framework. Khi thêm màn
hình, phải thêm `section.screen` có id `screen-<route>` và gọi qua
`showScreen('<route>')` hoặc `data-screen="<route>"`.

## 3. Phân chia trách nhiệm khi dùng chung với OpenDesign

### OpenDesign

- dùng để xem prototype, kiểm tra bố cục responsive và thử hướng visual;
- dùng các mốc `data-od-id` để nhận diện phần UI;
- đề xuất hoặc kiểm tra thay đổi về layout, spacing, màu và typography;
- không tự ý thay đổi tên route, tên field hoặc hook tương tác.

### Antigravity

- là nơi chỉnh code thật trong `memo-vocabulary.html`;
- triển khai hành vi nút, state, mapping field và các route;
- dùng thay đổi nhỏ có kiểm soát, không thay toàn bộ file bằng bản sinh mới;
- sau mỗi thay đổi phải mở lại preview và kiểm tra cả trạng thái mặc định lẫn
  trạng thái sau khi bấm.

### Quy trình phối hợp an toàn

1. Mở preview bằng route cần sửa.
2. Xác định phần UI qua `data-od-id` và hook tương tác.
3. Chỉnh đúng vùng HTML/CSS/JS liên quan trong `memo-vocabulary.html`.
4. Refresh preview; kiểm tra desktop width và mobile width tối đa 430px.
5. Ghi thay đổi vào `UI-IMPLEMENTATION-NOTES.md` nếu thay đổi cấu trúc,
   hành vi hoặc design token.
6. Nếu yêu cầu chưa đủ rõ để quyết định hành vi, dừng và hỏi người dùng;
   không tự tạo thêm workflow mới.

Không đưa token, API key, cookie hoặc thông tin đăng nhập vào source code hay
tài liệu. OpenDesign chỉ cần URL preview và các anchor ổn định; credential
phải do môi trường OpenDesign quản lý.

## 4. Nguyên tắc sản phẩm đã chốt

- Tên hiển thị: `Memo`.
- **Giao diện chính toàn bộ bằng 100% Tiếng Việt** tự nhiên, chuẩn mực thuật ngữ học tập & Spaced Repetition (SRS).
- Dữ liệu học thử nghiệm bằng tiếng Nhật (Kanji/Furigana), giải nghĩa bằng tiếng Việt / tiếng Anh.
- Phong cách: đơn giản, tập trung vào flashcard (tối giản như Quizlet, thuật toán sâu như Anki), không biến thành dashboard nhiều thông tin rườm rà.
- Màu thương hiệu: Memo indigo (`#4F46E5`) trên nền sáng dịu (`#F8FAFC`); prototype light-only.
- Không thêm dark-mode switch nếu người dùng chưa yêu cầu lại.
- Bốn lựa chọn chấm điểm SRS trực quan dạng pastel: `Học lại (Again)` [Đỏ san hô], `Khó (Hard)` [Vàng hổ phách], `Được (Good)` [Indigo], `Dễ (Easy)` [Xanh ngọc].
- Thanh đếm hàng chờ chỉ hiển thị 3 chỉ số cần thiết: `Mới / Đang học / Đến hạn`; không dùng số thứ tự vô nghĩa `1 trên 3`.
- `Hôm nay (#learn)` là màn hình tổng quan; `Bộ thẻ (#decks)` là thư viện bộ thẻ kèm lọc theo cờ. Hai tab tách biệt mục đích rõ ràng.

## 5. Cấu trúc UI cần giữ

### Review (`#study`)

Review là chế độ học tập trung cao độ (Focus mode), tự động ẩn thanh điều hướng đáy và các thành phần gây xao nhãng. Header gồm:

- Nút Back quay lại thư viện;
- Tiêu đề `Ôn tập` căn giữa chuẩn;
- Nút Hoàn tác `↶` (Undo) cho phép hủy kết quả vừa chấm ngay lập tức;
- Nút Gắn cờ đa màu sắc `⚑ / 🚩` (Flag toggle & mở modal cờ);
- Nút menu ba chấm `Tùy chọn thẻ` (Card options).

**Menu Tùy chọn thẻ:** Gồm 4 chức năng tinh giản (`Chỉnh sửa thẻ`, `Cài đặt ôn tập`, `Hẹn lại lịch ôn`, `Thông tin thẻ`), đã loại bỏ sheet trung gian `Tác vụ khác` thừa thãi.

**Flashcard 3D & Chấm điểm tức thì:**
- Lật thẻ 2 chiều 3D trực quan: Chạm vào bất kỳ vị trí nào trên mặt thẻ flashcard hoặc bấm phím `Space` để lật qua lại giữa Mặt trước (Kanji + Furigana) và Mặt sau (Nghĩa + Câu ví dụ).
- Huy hiệu Cờ trên thẻ (`.card-tag-flag-pill`): Nằm ở góc thẻ, hiển thị chấm màu và tên cờ rõ ràng. Chạm vào huy hiệu cờ sẽ mở ngay Modal Gắn cờ (có `stopPropagation` để không gây lật thẻ ngoài ý muốn).
- Bốn nút rating SRS xuất hiện ngay dưới thẻ khi lật, thiết kế dạng thẻ nổi pastel mềm mại, hiển thị rõ khoảng cách ôn tập tiếp theo (1 phút, 1 ngày, 3 ngày, 7 ngày) và phím tắt bàn phím `1`, `2`, `3`, `4`.

### Kiến trúc Modal & Quy tắc Stacking Context (Tối quan trọng)

- **Vị trí DOM:** Toàn bộ Modal tương tác toàn cục (`#flag-picker-modal`, `#custom-picker-layer`) **phải đặt trực tiếp dưới gốc `.app-frame`** (ngay trước `#toast`), KHÔNG đặt lồng trong bất kỳ `<section class="screen">` nào.
- **Quy tắc Xếp lớp Stacking Context:**
  - Lớp nền mờ `.study-sheet-backdrop` có `position: absolute; inset: 0; z-index: 1; backdrop-filter: blur(6px)`.
  - Khung hộp thoại dialog (`.flag-picker-dialog`, `.custom-picker-dialog`, `.study-sheet`) **bắt buộc phải có `position: relative; z-index: 2`**.
  - *Nếu thiếu thuộc tính này, lớp backdrop mờ sẽ đè lên trên dialog, làm mờ nội dung và nuốt toàn bộ sự kiện click chuột/chạm tay của người dùng.*

Các anchor quan trọng:

```text
study-screen
study-header
study-queue-counts
study-flashcard
study-term
study-reading
study-answer
study-answer-word
study-answer-meaning
study-example
study-reveal
study-rating-actions
study-menu
study-sheet-layer
```

### Note editor (`#note-edit`)

Đây là nơi sửa nội dung note, không phải nơi định nghĩa schema. Mỗi field có
editor riêng; field media rỗng mặc định thu gọn. Rich Text Editor Toolbar áp
dụng cho field đang active:

- Bold, Italic, Underline, Strikethrough;
- font size;
- text color;
- Superscript, Subscript;
- audio/attachment.

Không thêm nút `Add field` vào màn Note editor. Thêm, xoá, đổi tên, đổi kind và
sắp xếp field chỉ làm trong Note Type editor.

Anchor chính:

```text
note-edit-screen
note-edit-header
note-fields
note-toolbar-dock
```

### Note Type (`#note-types`)

Note Type là một màn riêng, có header `Back`, tiêu đề `Note type`, `Save` ở
góc trên. Người dùng chọn built-in hoặc custom type. Custom type được clone từ
`Basic`, sau đó người dùng tự đặt tên và chỉnh schema.

Hai tab có trách nhiệm tách biệt:

#### Fields

Định nghĩa dữ liệu của note:

- tên field;
- kind: Text / Audio / Image;
- đổi thứ tự;
- thêm field;
- xoá field custom.

Field built-in được bảo vệ. Tên mặc định dùng tiền tố để dễ hiểu:
`frontText`, `frontReading`, `frontAudio`, `frontImage`, `backText`,
`backExample`, `backTranslation`, `backAudio`, `backImage`.

#### Cards

Định nghĩa card sinh ra từ note:

- chọn card type: Basic, reversed, optional reverse hoặc Cloze;
- chọn Card 1, Card 2...;
- chọn `Front card` hoặc `Back card`;
- map các field đã định nghĩa vào từng mặt;
- thêm reverse card;
- xem live preview.

Không gộp toolbar rich text vào tab Cards. Toolbar thuộc Note editor/Fields;
Cards chỉ quyết định cấu trúc thẻ và mapping.

Anchor chính:

```text
note-types-screen
note-types-header
note-type-fields
template-map
template-preview
```

### Review settings (`#review-settings`)

Màn hình cấu hình học chuyên sâu chuẩn Anki Mobile 100% bằng Tiếng Việt với 9 nhóm:

1. **Thanh Mẫu cấu hình (Preset Bar):** Chọn preset (`Mặc định`, `Ôn tập chuyên sâu`, `Cấu hình tuỳ chỉnh`) và nút Lưu.
2. **Giới hạn ngày (Daily Limits):** Thẻ mới/ngày & Ôn tập tối đa/ngày với 3 tab (`Mẫu chung` / `Bộ thẻ này` / `Chỉ hôm nay`).
3. **Thẻ Mới (New Cards):** Bước học (`1m 10m`), Khoảng cách mức Được/Dễ.
4. **Hỏng (Lapses):** Bước học lại, Ngưỡng thành thẻ bám (`8`), Hành động thẻ bám (`Chỉ gắn Nhãn`).
5. **Thứ tự hiển thị & FSRS:** Thuật toán SRS thế hệ mới.
6. **Âm thanh & Bộ hẹn giờ:** Tự động phát âm, thời gian tối đa.
7. **Tự động chuyển thẻ (Auto-advance):** Đếm ngược chuyển câu hỏi và câu trả lời.
8. **Easy Days (Ngày học nhẹ trong tuần):**
   - Tiêu đề card: `Easy Days (Ngày học nhẹ)` tinh gọn 1 dòng.
   - Bố cục cột: Cột `Ngày` (68px) và 3 cột mức độ `Tối thiểu • Giảm tải • Bình thường` thẳng hàng với các nấc trượt.
   - 7 thanh slider điều chỉnh theo từng ngày trong tuần kèm phản hồi toast.
9. **Nâng cao (Advanced SM-2):** Hệ số khoảng cách, độ dễ ban đầu.

### Trung tâm trò chơi (Minigames)

- **#games:** Danh mục 3 minigame phản xạ.
- **#matching (Ghép thẻ):** Nối thẻ Kanji tiếng Nhật với giải nghĩa tiếng Việt tương ứng.
- **#ninja (Word Ninja):** Từ vựng rơi từ đỉnh màn hình xuống (không xuất hiện giữa chừng) theo quỹ đạo lượn sóng tự nhiên (organic wave), kèm bom ziczac nguy hiểm trừ tim (`❤️❤️❤️`).
- **#multiple-choice (Trắc nghiệm):** Chọn 1 trong 4 đáp án nghĩa chính xác.
- **#result (Kết quả):** Màn hình tổng kết điểm số XP và độ chính xác.

## 6. State model hiện tại

Prototype đang dùng JavaScript thuần trong cùng file HTML. State chỉ tồn tại
trong browser session; chưa có backend/database.

### `studyCards`

Mỗi card học thử có các giá trị tổng quát:

```js
{
  term,
  reading,
  answer,
  example,
  translation,
  tags,
  fields: {
    frontText: { value, html },
    frontReading: { value, html },
    backText: { value, html },
    backExample: { value, html },
    backTranslation: { value, html }
  }
}
```

Khi thêm field custom, phải cập nhật `fields` của card qua helper hiện có,
không truy cập trực tiếp bằng một key cố định trong render nếu field có thể bị
đổi tên.

### `noteTypeLibrary`

Mỗi note type có `name`, `builtIn`, `base` và `fields`. Custom type clone từ
Basic và giữ schema riêng trong session.

### `templateState`

Mapping card hiện tại có dạng:

```js
{
  activeSide: 'front' | 'back',
  activeCardId: 'card-1',
  cards: [
    {
      id,
      name,
      type,
      mapping: { front: ['fieldId'], back: ['fieldId'] }
    }
  ]
}
```

Khi sửa mapping, luôn dùng card đang active; không giả định chỉ có Card 1.

## 7. Hook và quy ước code

Các hook sau là API nội bộ của prototype, cần giữ ổn định:

- navigation: `data-screen`, `data-nav`, `data-back`;
- review: `data-action`, `data-study-action`, `data-study-menu-action`,
  `data-rating`;
- game: `data-choice`, `data-ninja-answer`, `data-match-type`;
- OpenDesign inspection: `data-od-id` (hiện có đúng **152 anchor** được xác minh và bắt buộc bảo tồn 100%).

Khi thêm nút mới, bắt buộc gắn một hook hành vi rõ ràng và một accessible
label nếu nút chỉ có icon. Không tạo nút chỉ đổi hình nhưng không có tác dụng.

Khi thay đổi text hoặc layout, ưu tiên CSS override có phạm vi rõ ràng và giữ
design token ở `:root`. Không thêm màu tuỳ ý rải rác nếu có thể dùng token.

## 8. Kiểm tra bắt buộc sau khi sửa

Chạy kiểm tra cú pháp và anchors từ workspace:

```powershell
# 1. Kiểm tra không có lỗi cú pháp JavaScript
node -e "const fs = require('fs'); const html = fs.readFileSync('memo-vocabulary.html', 'utf8'); const scripts = html.match(/<script>([\s\S]*?)<\/script>/g); scripts.forEach((s) => new Function(s.replace(/<\/?script>/g, ''))); console.log('Syntax OK');"

# 2. Kiểm tra số lượng OpenDesign anchors (phải >= 152)
powershell -Command "(Select-String -Path 'memo-vocabulary.html' -Pattern 'data-od-id').Matches.Count"
```

Tối thiểu phải kiểm tra các luồng:

1. `#study`: lật thẻ 3D 2 chiều, bốn rating pastel, nút hoàn tác `↶`, gắn cờ `⚑/🚩` và modal cờ đa màu, menu ba chấm;
2. `#decks`: thanh lọc cờ và banner "Ôn theo cờ này";
3. `#note-edit`: mở modal chọn loại thẻ/bộ thẻ, toolbar nổi frosted glass, gắn cờ trong header, lưu thẻ;
4. `#note-types`: Fields, clone Basic, add/remove/reorder custom field, Cards, add reverse card, mapping và Preview;
5. `#review-settings`: bảng Easy Days thẳng hàng, các toggle và accordion;
6. `#ninja`: từ vựng rơi lượn sóng từ đỉnh màn hình, chém từ và né bom;
7. không có lỗi console và không có nút mới bị dead click.

## 9. Giới hạn prototype cần nói rõ

- Chưa có persistence backend/database.
- Import file hiện là prototype UI; chưa phải pipeline import production.
- Scheduling/FSRS chỉ là UI setting, chưa tính lịch thật.
- RTE lưu HTML trong memory; màn review hiện render giá trị text cho nội dung
  mẫu.
- Game Word Ninja có animation và tương tác prototype, chưa có game engine
  hoặc scoring backend.

## 10. Quy tắc hỏi lại

Nếu yêu cầu mới không nói rõ một trong các điểm sau thì phải hỏi người dùng
trước khi sửa:

- hành vi lưu dữ liệu hay chỉ preview;
- field thuộc Front hay Back;
- thay đổi là nội dung note, schema Fields hay template Cards;
- action nào được đưa vào menu chính hay More actions;
- có cần backend/persistence hay chỉ giữ prototype session.

Không tự suy đoán để làm một màn hình mới nếu yêu cầu còn có thể hiểu theo
nhiều cách.
