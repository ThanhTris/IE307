# Memo — Modern UI Reference & AI Implementation Playbook

> Tài liệu nghiên cứu và đặc tả giao diện dành cho AI coding agent, designer và developer.
>
> Cập nhật: 23/09/2026
> Phạm vi: `memo-vocabulary.html` — ứng dụng flashcard/SRS mobile-first, giao diện tiếng Việt.
> Trạng thái: Design direction; tài liệu này không tự thay đổi business logic hiện tại.

---

## 0. Cách AI phải sử dụng tài liệu này

Trước khi sửa giao diện, AI phải đọc theo thứ tự:

1. `AI-CONTEXT-HANDOFF.md` — chức năng, luồng, ràng buộc kỹ thuật.
2. `UI-IMPLEMENTATION-NOTES.md` — hành vi và component hiện có.
3. Tài liệu này — ngôn ngữ thị giác và pattern UI mới.
4. `memo-vocabulary.html` — nguồn sự thật cuối cùng của markup, CSS và JavaScript.

Nếu tài liệu thiết kế mâu thuẫn với logic hoặc hook hiện có, phải giữ logic/hook và điều chỉnh thiết kế quanh chúng.

Các ràng buộc không được phá vỡ:

- Không chuyển dự án sang framework mới; tiếp tục dùng Vanilla HTML/CSS/JavaScript.
- Không thay routing URL hash hiện có.
- Không xóa hoặc đổi `data-od-id`; phải giữ đủ 152 inspection anchors.
- Không đổi các hook như `data-screen`, `data-nav`, `data-action`, `data-rating` và các hook được liệt kê trong tài liệu handoff.
- Không làm mất dữ liệu mẫu, trạng thái tương tác hoặc hành vi bàn phím.
- Giao diện tiếp tục dùng tiếng Việt tự nhiên; nội dung học tiếng Nhật phải hiển thị đúng Kanji/Furigana.
- Thiết kế cho màn hình 390–430px trước, sau đó mới mở rộng tablet/desktop.

---

## 1. Kết luận thiết kế

### Tên hướng thiết kế

**Memo Adaptive Glass**

Một hệ giao diện học tập tập trung, lấy cấu trúc yên tĩnh của Linear/Vercel làm nền, dùng Liquid Glass có chọn lọc cho lớp điều hướng và điều khiển, đồng thời kế thừa các pattern học tập đã được chứng minh từ Quizlet, Duolingo và Anki.

### Câu mô tả ngắn cho AI

> A calm, mobile-first learning interface with solid content surfaces and a restrained adaptive-glass control layer; compact like Linear, legible like Vercel Geist, content-first like Notion, fast like Raycast, approachable like Quizlet, guided like Duolingo, and faithful to Anki's spaced-repetition model.

### Tỷ trọng tham khảo

Đây là tỷ trọng định hướng, không phải tỷ lệ sao chép pixel:

| Nguồn | Vai trò trong Memo | Tỷ trọng gợi ý |
|---|---|---:|
| Apple Liquid Glass | Vật liệu cho navigation/control nổi | 18% |
| Microsoft Fluent 2 | Phân lớp solid/Mica/Acrylic/modal smoke | 10% |
| Linear | Mật độ, focus, hierarchy, sidebar/header | 14% |
| Vercel Geist | Grid, typography, trạng thái kỹ thuật | 12% |
| Notion | Điều hướng nội dung và màn hình tài liệu/editor | 8% |
| Raycast | Command/search, shortcut, phản hồi nhanh | 8% |
| Quizlet | Flashcard, swipe/flip, study modes | 12% |
| Duolingo | Tiến trình, next-best-action, động lực học | 8% |
| Anki | Mô hình SRS, queue, rating, flags | 10% |

Không được bê nguyên nhận diện, màu sắc, icon độc quyền, mascot hoặc bố cục đặc trưng của một sản phẩm. Memo phải là sự tổng hợp có chọn lọc và giữ nhận diện Indigo riêng.

---

## 2. Nghiên cứu các mẫu UI quốc tế hiện đại

### 2.1 Apple — Liquid Glass: glass là lớp chức năng

Nguồn chính thức: [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials) và [Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass).

Điểm nên học:

- Liquid Glass tạo một lớp chức năng riêng cho control và navigation nổi phía trên content.
- Nội dung có thể cuộn phía dưới để duy trì cảm giác không gian và ngữ cảnh.
- Biến thể regular phù hợp với sidebar, alert và popover có chữ; clear phù hợp hơn với nền media giàu hình ảnh.
- Màu của control cần tiết chế để đảm bảo độ rõ.
- Shape của control nên đồng tâm với container và màn hình.
- Không chồng glass lên glass và không đưa glass vào toàn bộ content layer.

Áp dụng vào Memo:

- Dùng glass cho bottom navigation, floating study toolbar, picker, action sheet và compact filter bar.
- Flashcard, form field, setting section và deck row dùng nền solid hoặc gần solid.
- Khi nội dung cuộn dưới thanh điều hướng, thêm scroll-edge fade để chữ/icon luôn rõ.

Không áp dụng:

- Không làm mọi card trong suốt.
- Không đặt chữ dài trực tiếp trên nền blur thay đổi liên tục.
- Không mô phỏng lens/refraction quá mạnh bằng nhiều pseudo-element gây nhiễu hoặc giảm hiệu năng.

### 2.2 Microsoft Fluent 2 — mỗi vật liệu có nhiệm vụ

Nguồn chính thức: [Fluent 2 — Material](https://fluent2.microsoft.design/material).

Fluent phân biệt bốn nhóm:

- **Solid:** nền nội dung phổ biến và dễ đọc nhất.
- **Mica:** nền ứng dụng có tint nhẹ theo môi trường, dùng cho lớp nền lớn.
- **Acrylic:** kính mờ bán trong suốt cho menu/popover ngắn hạn.
- **Smoke:** lớp tối phía sau dialog để báo hiệu tương tác blocking.

Áp dụng vào Memo:

- App background = Mica-inspired: nền xanh-xám/ivory rất nhạt, không blur realtime.
- Content card = Solid.
- Picker, context menu, editor toolbar = Acrylic-inspired.
- Modal backdrop = Smoke; dialog phía trên phải rõ và không bị blur.

### 2.3 Material 3 Expressive — biểu cảm có hệ thống

Nguồn chính thức: [Material Design 3](https://m3.material.io/).

Điểm nên học:

- Motion physics được chuẩn hóa bằng token thay vì mỗi component có easing khác nhau.
- Shape, typography và màu sắc có thể linh hoạt nhưng phải theo semantic role.
- Button group, toolbar và progress indicator phản hồi trực quan hơn mà không cần trang trí thừa.
- Adaptive component tốt hơn việc thu nhỏ nguyên layout desktop.

Áp dụng vào Memo:

- Dùng motion token chung cho screen enter, card flip, modal và toast.
- Rating buttons có semantic shape/color khác nhau nhưng nằm trong một family.
- Trên mobile dùng bottom sheet; trên màn hình rộng mới dùng centered modal hoặc side sheet.

Không áp dụng:

- Không dùng toàn bộ shape library trang trí.
- Không đổi hình dạng control liên tục chỉ để gây ấn tượng.

### 2.4 Linear — giao diện yên tĩnh, scan nhanh

Nguồn chính thức: [Linear UI refresh, 12/03/2026](https://linear.app/changelog/2026-03-12-ui-refresh).

Điểm nên học:

- Header, navigation và view controls nhất quán giữa mọi workflow.
- Icon được đồng bộ kích thước và nét vẽ.
- Sidebar được làm dịu để phần nội dung chính nổi bật.
- Comment/action trở nên nhẹ hơn, giảm khối UI thừa.

Áp dụng vào Memo:

- Mọi màn hình dùng chung cấu trúc page header: back/title/context/actions.
- Icon chrome dùng cùng family SVG, stroke 1.75–2px, kích thước 18–20px.
- Thanh điều hướng không cạnh tranh với flashcard và nội dung học.
- Mật độ vừa phải: ưu tiên dòng/section rõ hơn là hàng loạt card nổi.

### 2.5 Vercel Geist — rõ, kỹ thuật và có quy tắc

Nguồn chính thức: [Geist Design System](https://vercel.com/geist/introduction), [Typography](https://vercel.com/geist/typography), [Colors](https://vercel.com/geist/colors), [Sheet](https://vercel.com/geist/sheet).

Điểm nên học:

- Hệ thống màu phân vai rõ: background, component, border, high-contrast action, text/icon.
- Sans và Mono có vai trò khác nhau; số liệu, code, shortcut và ID dùng mono/tabular numerals.
- Sheet dùng cho context liên quan mà trang gốc vẫn hữu ích; modal dùng cho quyết định blocking.
- Empty, error, loading, destructive state là component thực sự, không phải phần bổ sung cuối cùng.

Áp dụng vào Memo:

- Dùng mono cho interval, shortcut, số queue, tag kỹ thuật và thông tin SRS.
- Dùng tabular numerals cho `12`, `4`, `21 ngày`, `%` và timer.
- Note info/card details có thể là side sheet trên desktop nhưng là bottom sheet trên mobile.
- Cài đặt dùng fieldset/section rõ ràng, có helper text và error state.

### 2.6 Shopify Polaris — một màn hình, một mục tiêu

Nguồn chính thức: [Shopify App Design — Navigation](https://shopify.dev/docs/apps/design/navigation).

Điểm nên học:

- Page title ngắn, nói đúng mục đích của màn hình.
- Một trang nên tập trung vào một mục tiêu chính.
- Navigation label là danh từ ngắn, dễ scan.
- Action label theo cấu trúc động từ + đối tượng.
- Tabs chỉ dùng cho các view cùng scope; không dùng tabs như điều hướng toàn app.
- Điều hướng chính không nên bị lặp lại trong body.

Áp dụng vào Memo:

- `Hôm nay`, `Bộ thẻ`, `Trò chơi`, `Tiến độ` là navigation noun.
- CTA dùng `Bắt đầu ôn`, `Thêm bộ thẻ`, `Nhập thẻ`, `Lưu thay đổi`.
- Mỗi màn hình chỉ có một primary CTA nổi bật.
- `Các trường` / `Mẫu thẻ` là tabs hợp lý vì cùng thuộc một loại thẻ.

### 2.7 Notion — content-first và điều hướng có phân cấp

Nguồn chính thức: [Notion — Navigate with the sidebar](https://www.notion.com/help/navigate-with-the-sidebar).

Điểm nên học:

- Sidebar gom navigation theo nhóm, hỗ trợ section, recent và search.
- Search có thể mở nhanh bằng `Cmd/Ctrl + K`.
- Nội dung chính giữ bề mặt đơn giản, tránh chrome lấn át.
- Progressive disclosure: chi tiết ít dùng nằm trong menu hoặc section có thể mở.

Áp dụng vào Memo:

- Desktop/tablet có sidebar group theo `Học`, `Thư viện`, `Công cụ`, `Cài đặt`.
- Mobile giữ bottom navigation tối đa 4–5 mục.
- Advanced review settings mặc định thu gọn.
- Tìm bộ thẻ/tag bằng command-search thay vì thêm nhiều filter cố định.

### 2.8 Raycast — tốc độ và thao tác bàn phím

Nguồn chính thức: [Raycast UI API](https://developers.raycast.com/api-reference/user-interface).

Điểm nên học:

- UI quy về các primitive rõ: List, Grid, Detail, Form.
- ActionPanel gom action theo context và gắn shortcut.
- Render trạng thái có ích càng sớm càng tốt; loading phải xuất hiện ngay.
- Người dùng có thể hoàn thành luồng chính mà không cần chuột.

Áp dụng vào Memo:

- Command/search mở bằng `/` hoặc `Cmd/Ctrl + K` trên desktop.
- Shortcut hiện trong tooltip/menu: `Space`, `1–4`, `Z`, `F`, `/`.
- Menu thẻ chỉ chứa action liên quan trực tiếp đến thẻ hiện tại.
- Import phải có preview hoặc skeleton ngay sau khi chọn file/dán dữ liệu.

### 2.9 Quizlet — flashcard trực quan và nhiều cách luyện

Nguồn chính thức: [Quizlet Flashcards](https://quizlet.com/features/flashcards), [Quizlet Learn](https://quizlet.com/features/learn), [Quizlet 101](https://quizlet.com/content/quizlet101).

Điểm nên học:

- Flashcard là interaction trung tâm; flip/swipe cần trực tiếp và dễ hiểu.
- Phân loại đơn giản `Biết` / `Đang học` phù hợp với người mới.
- Một bộ nội dung có thể dùng lại cho Flashcards, Learn, Test và game.
- Phiên học ngắn, có next step rõ và đồng bộ tiến độ.

Áp dụng vào Memo:

- Giữ tap/Space để lật thẻ; gesture swipe chỉ thêm khi không xung đột scroll.
- Có thể cung cấp chế độ đơn giản hai lựa chọn cho người mới, trong khi chế độ SRS đầy đủ vẫn dùng 4 mức.
- Từ một deck, hiển thị các mode `Ôn thẻ`, `Trắc nghiệm`, `Ghép thẻ`, `Word Ninja`.
- Không tách game khỏi tiến độ học; kết quả game phải quay về deck/goal liên quan.

### 2.10 Duolingo — dẫn người dùng đến bước tiếp theo

Nguồn chính thức: [The Science Behind Duolingo's Home Screen Redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/) và [Duolingo Teaching Method](https://blog.duolingo.com/duolingo-teaching-method/).

Điểm nên học:

- Learning path giảm câu hỏi “bây giờ nên học gì?”.
- Nội dung mới, review và story được trộn theo một lộ trình có chủ đích.
- Tiến độ có điểm hiện tại và nút quay về vị trí hiện tại khi người dùng cuộn xa.
- Gamification hỗ trợ hành vi học, không thay thế nội dung học.

Áp dụng vào Memo:

- Home phải có một `next best action`: ví dụ `Ôn 12 thẻ đến hạn`.
- Streak/XP là secondary context, không được lớn hơn nhiệm vụ học hôm nay.
- Sau một phiên học, đề xuất hành động tiếp theo dựa trên trạng thái thực.
- Không biến Memo thành bản sao đường học ngoằn ngoèo hoặc dùng mascot.

### 2.11 Anki — mô hình SRS chính xác và hiệu quả

Nguồn chính thức: [Anki Manual — Studying](https://docs.ankiweb.net/studying.html), [Adding/Editing](https://docs.ankiweb.net/editing), [Deck Options](https://docs.ankiweb.net/deck-options.html).

Điểm nên học:

- Queue có semantic rõ: Mới, Đang học, Đến hạn.
- Sau khi xem đáp án, người dùng đánh giá `Học lại`, `Khó`, `Được`, `Dễ` và thấy interval tiếp theo.
- Shortcut `1–4`, `Space/Enter` giúp review nhanh.
- Flag là metadata ở cấp card; tag là metadata ở cấp note.
- Action hiếm nằm trong menu More thay vì luôn hiển thị.

Áp dụng vào Memo:

- Không đổi semantic SRS chỉ vì làm đẹp UI.
- `Được` là lựa chọn phổ biến/khuyến nghị về hierarchy nhưng không tự chọn thay người dùng.
- Interval phải gần label rating, dùng mono/tabular numerals.
- Flags, tags, bury/suspend và card info phải đúng cấp dữ liệu.

---

## 3. Kiến trúc thị giác đề xuất cho Memo

### 3.1 Ba lớp bề mặt

```text
Layer 3 — Transient control
Picker, popover, action sheet, toast, floating toolbar
Material: Acrylic / Adaptive Glass

Layer 2 — Persistent navigation
Bottom dock, compact header, tablet sidebar
Material: Regular Glass, opacity cao hơn transient control

Layer 1 — Content
Flashcard, deck row, setting fieldset, import preview
Material: Solid / tinted solid; không blur

Layer 0 — Environment
App background và ambient tint
Material: Mica-inspired static gradient; không blur realtime
```

Quy tắc:

- Tối đa hai lớp glass nhìn thấy cùng lúc trong trạng thái bình thường.
- Không đặt glass panel bên trong glass panel.
- Text dài luôn nằm trên solid hoặc glass có opacity cao.
- Khi modal mở, content phía sau dùng Smoke/dim; dialog không bị blur.

### 3.2 Nhận diện màu

Giữ Memo Indigo làm màu thương hiệu, giảm cảm giác dashboard SaaS bằng nền ấm/lạnh trung tính và màu trạng thái dịu.

```css
:root {
  color-scheme: light;

  --memo-canvas: #f5f6fa;
  --memo-canvas-warm: #f7f5f0;
  --memo-surface: #ffffff;
  --memo-surface-subtle: #f1f3f7;
  --memo-ink: #141824;
  --memo-muted: #687083;
  --memo-faint: #939bad;

  --memo-indigo: #4f46e5;
  --memo-indigo-strong: #3730a3;
  --memo-indigo-soft: #eeefff;

  --memo-new: #2563eb;
  --memo-learning: #d97706;
  --memo-due: #059669;
  --memo-danger: #dc4955;

  --memo-line: rgba(20, 24, 36, 0.10);
  --memo-line-strong: rgba(20, 24, 36, 0.17);

  --memo-glass: rgba(255, 255, 255, 0.66);
  --memo-glass-strong: rgba(255, 255, 255, 0.82);
  --memo-glass-line: rgba(255, 255, 255, 0.72);
  --memo-smoke: rgba(14, 18, 28, 0.24);
}
```

Không dùng:

- Gradient tím-xanh bão hòa làm background.
- Glow neon quanh CTA.
- Màu khác nhau cho mọi card không có semantic.
- Text xám nhạt trên glass sáng.

### 3.3 Typography

| Vai trò | Font stack | Dùng cho |
|---|---|---|
| Display/UI | `Inter`, `SF Pro`, `Segoe UI`, system sans | Heading, navigation, button, body |
| Japanese | `Noto Sans JP`, `Hiragino Sans`, sans-serif | Kanji, Kana, Furigana |
| Mono | `SF Mono`, `IBM Plex Mono`, `Consolas` | Interval, shortcut, timer, tag kỹ thuật |

Scale mobile đề xuất:

- Display card term: 40–56px tùy độ dài.
- Page title: 24px/30px, weight 720–760.
- Section title: 17px/23px, weight 680–720.
- Body: 15px/22px.
- Label: 13px/18px, weight 600.
- Metadata: 11–12px/16px, mono hoặc tabular.

Quy tắc:

- Không dùng uppercase letter-spacing rộng cho câu tiếng Việt dài.
- Không dùng serif trang trí cho UI control.
- Tối đa ba mức weight trong cùng một viewport chính.
- `font-variant-numeric: tabular-nums` cho số queue, interval và thống kê.

### 3.4 Shape và spacing

```text
Spacing unit: 4px
Common gaps: 8 / 12 / 16 / 20 / 24 / 32

Radius control: 12px
Radius input: 14px
Radius card: 18px
Radius glass panel: 22px
Radius modal: 24px
Radius pill: 999px — chỉ cho chip/status
```

Shape phải có quan hệ đồng tâm: container radius 24px thì control sát mép dùng radius khoảng 16–18px, không dùng radius ngẫu nhiên.

### 3.5 Elevation

```css
--shadow-content:
  0 1px 2px rgba(15, 23, 42, 0.04),
  0 8px 24px rgba(15, 23, 42, 0.06);

--shadow-glass:
  0 16px 44px rgba(30, 35, 55, 0.12),
  0 3px 10px rgba(30, 35, 55, 0.06),
  inset 0 1px 0 rgba(255, 255, 255, 0.82);

--shadow-modal:
  0 28px 80px rgba(10, 14, 24, 0.22),
  0 8px 24px rgba(10, 14, 24, 0.12);
```

Không dùng bóng đen lệch cứng hoặc nhiều shadow khác nhau không theo semantic.

---

## 4. Component recipes

### 4.1 `GlassDock`

Vai trò: bottom navigation trên mobile.

- Cách cạnh trái/phải/dưới 10–12px và tôn trọng safe area.
- Cao phần control 58–64px.
- 4 mục chính; mục ít dùng đặt trong profile hoặc More.
- Active item dùng icon + label + nền indigo rất nhạt; không dùng pill lớn quanh toàn mục.
- Regular glass opacity cao; content cuộn bên dưới có edge fade.
- Có fallback nền solid 94% nếu không hỗ trợ `backdrop-filter`.

### 4.2 `CompactHeader`

- Cao 52–56px.
- Vùng giữa thật sự center, không lệch do số lượng action hai bên.
- Back bên trái; title/context ở giữa; tối đa hai icon action bên phải.
- Khi scroll, header có thể trở thành glass nhưng ở top position ban đầu nên gần như trong suốt.

### 4.3 `NextActionHero`

Vai trò: ưu tiên học hôm nay, không phải banner quảng cáo.

- Một câu ngắn: `Hôm nay còn 12 thẻ đến hạn`.
- Một primary CTA: `Bắt đầu ôn`.
- Progress dùng bar hoặc vòng nhỏ; không hiển thị cả hai.
- New/Learning/Due nằm ở hàng phụ, số dùng tabular numerals.
- Không dùng illustration stock hoặc gradient blob.

### 4.4 `DeckRow`

- Ưu tiên row hoặc compact card, không biến thư viện thành bento grid.
- Nội dung: tên deck, số thẻ, mastery/progress, due badge.
- Toàn row là hit target; overflow menu là hit target độc lập.
- Hover/press thay đổi background và scale tối đa 0.99; không nhấc card quá 2px.
- Empty deck có message và action cụ thể.

### 4.5 `StudyCard`

- Solid surface; không dùng glass cho vùng cần tập trung đọc.
- Term nằm trung tâm quang học, không nhất thiết trung tâm toán học.
- Reading nằm gần term; meaning/example chỉ xuất hiện sau flip.
- Tag và flag là metadata phụ, không cạnh tranh với term.
- Có trạng thái front/back rõ bằng content và transition, không cần label lớn `Mặt trước`/`Mặt sau`.
- Touch target cho audio tối thiểu 44px.
- Flip 3D nhẹ 220–300ms; không lạm dụng perspective gây chóng mặt.

### 4.6 `RatingBar`

- Chỉ hiện sau khi reveal/flip đáp án.
- Bốn lựa chọn: `Học lại`, `Khó`, `Được`, `Dễ`.
- Interval nằm trực tiếp dưới hoặc trên label, dùng mono nhỏ.
- `Được` có hierarchy cao hơn một cấp nhưng cả bốn vẫn dễ bấm.
- Các màu là semantic tint, không bão hòa mạnh.
- Shortcut `1–4` hiện ở desktop hoặc khi có bàn phím; không chiếm diện tích trên mobile.

### 4.7 `AcrylicPicker`

- Dùng cho loại thẻ, deck, flag và lựa chọn ngắn.
- Modal/picker là sibling phía trên backdrop, không nằm sau lớp blur.
- Item selected dùng checkmark vector + tint, không chỉ đổi màu chữ.
- Tối đa 7 item trước khi thêm search/scroll.
- Enter xác nhận, Escape đóng trên desktop.

### 4.8 `EditorToolbar`

- Floating glass toolbar ở đáy khi chỉnh thẻ.
- Nhóm action bằng divider mảnh: text style, color/highlight, structure, media.
- Icon SVG nhất quán; không dùng emoji làm chrome.
- Toolbar không che field đang focus; cuộn field vào vùng nhìn thấy khi keyboard mở.
- Trạng thái active dùng nền tint + `aria-pressed`.

### 4.9 `SettingsSection`

- Solid fieldset, header rõ, helper text ngắn.
- Control liên quan nằm trong cùng section; advanced mặc định collapse.
- Toggle bên phải, label/helper bên trái.
- Numeric input có unit hiển thị rõ.
- Warning chỉ dùng khi thay đổi thật sự có rủi ro; không tô vàng toàn màn hình.

### 4.10 `CommandSearch`

- Tìm deck, tag, card hoặc mở action.
- Kích hoạt bằng icon search và `Cmd/Ctrl + K` hoặc `/` khi không focus input.
- Kết quả chia nhóm; highlight phần match; hỗ trợ phím mũi tên và Enter.
- Mobile dùng full-screen search sheet, desktop dùng centered command dialog.

### 4.11 `Toast`

- Dùng cho action nhẹ như `Đã sao chép`, `Đã gắn cờ`, `Đã hoàn tác`.
- Không dùng toast thay cho error cần xử lý.
- Tự đóng sau 2–3 giây; có `role="status"`.
- Glass mạnh hoặc solid dark tùy contrast; không chồng lên rating/action quan trọng.

---

## 5. Áp dụng theo từng màn hình Memo

### 5.1 `#learn` — Hôm nay

Lấy cảm hứng từ Duolingo + Linear + Quizlet.

Thứ tự nội dung:

1. Compact header: brand, streak nhỏ, avatar.
2. NextActionHero: số thẻ đến hạn và `Bắt đầu ôn`.
3. Queue summary: Mới / Đang học / Đến hạn.
4. `Tiếp tục học`: tối đa 2–3 deck gần nhất.
5. `Luyện nhanh`: các mode có liên hệ tới deck hiện tại.
6. Insight nhỏ: tiến độ tuần hoặc từ hay sai.

Loại bỏ:

- Nhiều hero card cạnh tranh nhau.
- Streak/XP lớn hơn nhiệm vụ học.
- Grid icon màu sắc giống launcher thiếu hierarchy.

### 5.2 `#decks` — Thư viện

Lấy cảm hứng từ Notion + Linear + Anki.

- Header có title, search, `Thêm`.
- Search/filter trong compact toolbar, không tạo hàng chip dài cố định.
- Deck hiển thị dưới dạng list row có progress.
- Flag filter mở qua filter sheet; active filter hiển thị bằng một removable chip.
- `Ôn theo cờ này` xuất hiện dưới dạng context banner khi có filter hợp lệ.

### 5.3 `#study` — Phiên ôn tập

Lấy cảm hứng từ Anki + Quizlet + Apple control layer.

- Content layer chỉ có flashcard và nội dung cần nhớ.
- Header/queue strip/action bar là control layer nổi.
- Không hiển thị bottom app navigation.
- Tap/Space lật thẻ; 1–4 đánh giá; Z undo; F mở flag.
- Sau rating, chuyển thẻ bằng motion ngắn 180–240ms; không confetti mỗi thẻ.
- Chỉ dùng celebration khi hoàn thành phiên hoặc mốc thật sự.

### 5.4 `#import` — Nhập thẻ

Lấy cảm hứng từ Vercel + Raycast + Shopify.

- Một luồng step-by-step: Nguồn → Phân tích → Ánh xạ → Preview → Nhập.
- Step hiện tại nổi bật, step chưa tới không giả clickable.
- Preview xuất hiện sớm.
- Error gắn với hàng/cột cụ thể.
- Primary CTA chỉ là action tiếp theo của step.

### 5.5 `#note-edit` — Chỉnh sửa thẻ

Lấy cảm hứng từ Notion + Raycast + Anki.

- Metadata loại thẻ/deck ở compact summary đầu trang.
- Mỗi field có label, helper/validation và editor rõ.
- Toolbar nổi chỉ xuất hiện khi cần chỉnh format.
- Media field chưa có nội dung có thể collapse.
- `Lưu thay đổi` là primary action; auto-save nếu có phải báo trạng thái rõ.

### 5.6 `#note-types` — Loại thẻ

- Tabs `Các trường` / `Mẫu thẻ` nằm dưới header và giữ vị trí ổn định.
- Field list hỗ trợ reorder với drag handle rõ.
- Preview front/back là solid card, không glass.
- Destructive action đặt trong overflow hoặc danger zone.

### 5.7 `#review-settings` — Cài đặt ôn tập

Lấy cảm hứng từ Vercel fieldset + Material adaptive component.

- Chia section theo mental model, không theo tên biến kỹ thuật.
- Preset bar sticky/glass nhẹ; body setting solid.
- Advanced section collapse.
- Thay đổi ảnh hưởng lịch học có preview/cảnh báo cụ thể.
- Dùng segmented control khi các lựa chọn loại trừ nhau và có tối đa 3–4 lựa chọn.

### 5.8 `#games` và minigames

Lấy cảm hứng từ Quizlet/Duolingo nhưng giữ Memo trưởng thành hơn.

- Game selection dùng 3 row/card có illustration hình học đơn giản hoặc icon vector.
- Mỗi game nói rõ mục tiêu, thời lượng và deck nguồn.
- Trong game, chrome tối thiểu; timer/score không lấn câu hỏi.
- Feedback đúng/sai nhanh, không rung/flash mạnh.
- Result giải thích `đã nhớ tốt` và `cần ôn lại`, không chỉ XP.

### 5.9 `#profile` — Tiến độ

- Ưu tiên insight có hành động: tỷ lệ nhớ, lịch học, nhóm từ hay sai.
- Tránh dashboard với quá nhiều mini-chart.
- Chỉ dùng chart khi người dùng có đủ dữ liệu.
- Mỗi chart phải có text summary và không phụ thuộc duy nhất vào màu.

---

## 6. Motion và phản hồi

```css
:root {
  --motion-fast: 140ms;
  --motion-control: 190ms;
  --motion-panel: 280ms;
  --motion-card: 260ms;

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}
```

| Tình huống | Motion |
|---|---|
| Tap/press | scale 0.98–0.99 trong 100–140ms |
| Hover desktop | translateY tối đa -1px |
| Screen enter | fade + translateY 4–6px, 180–220ms |
| Bottom sheet | translateY + fade, 260–320ms |
| Center modal | scale 0.97 → 1 + fade, 220–280ms |
| Flashcard flip | rotateY + crossfade, 220–300ms |
| Toast | slide/fade 180ms; giữ 2–3 giây |

Quy tắc:

- Motion giải thích quan hệ không gian hoặc xác nhận hành động.
- Không animation loop ở màn hình học chính.
- Không stagger cả danh sách mỗi lần quay lại màn hình.
- `prefers-reduced-motion: reduce` phải bỏ transform/flip phức tạp và dùng crossfade.

---

## 7. Accessibility và hiệu năng

### Accessibility

- Text thường đạt WCAG AA.
- Touch target tối thiểu 44×44px.
- Focus ring luôn nhìn thấy khi dùng bàn phím.
- Màu trạng thái luôn đi kèm label/icon/pattern.
- Modal trap focus, Escape đóng và trả focus về trigger.
- `aria-live` cho toast và feedback game phù hợp.
- Card flip phải cập nhật trạng thái cho screen reader.
- Không tự phát audio khi người dùng đã bật reduced motion hoặc có lựa chọn tắt autoplay.

### Glass performance budget

- Không quá 3 vùng `backdrop-filter` hoạt động đồng thời.
- Không blur một phần tử fullscreen đang animate liên tục.
- Ưu tiên background tĩnh cho app environment.
- Khi thiết bị yếu hoặc không hỗ trợ blur, dùng nền `rgba(255,255,255,.94)` và border/shadow nhẹ.
- Chỉ animate `transform` và `opacity` trong các transition thường xuyên.

Fallback:

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--memo-line);
  box-shadow: var(--shadow-glass);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass-surface {
    background: var(--memo-glass);
    border-color: var(--memo-glass-line);
    backdrop-filter: blur(20px) saturate(145%);
    -webkit-backdrop-filter: blur(20px) saturate(145%);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

---

## 8. Anti-patterns: những dấu hiệu làm UI trông như AI tạo

AI không được:

- Tạo background với nhiều blob tím/xanh phát sáng.
- Cho mọi section vào card bo 24px.
- Dùng bento grid chỉ vì trông “hiện đại”.
- Dùng pill cho mọi button, tab và input.
- Dùng emoji làm icon hệ thống.
- Dùng glass cho vùng chứa đoạn văn hoặc form dài.
- Chồng blur, border trắng và glow lên nhau.
- Viết marketing copy chung chung thay cho UI text cụ thể.
- Thêm chart giả, số liệu giả hoặc badge không có chức năng.
- Dùng card có cùng chiều cao một cách máy móc khi nội dung khác nhau.
- Tạo hero quá lớn khiến nhiệm vụ học nằm dưới fold.
- Thay nội dung thật bằng Lorem Ipsum.
- Tạo desktop dashboard thu nhỏ trên mobile.
- Thay đổi UI mà không có loading, empty, error, pressed, focus và disabled state.

Dấu hiệu Memo cần giữ:

- Indigo nhận diện rõ nhưng tiết chế.
- Typography chắc, dễ đọc, hỗ trợ tiếng Nhật.
- Nội dung học là nhân vật chính.
- Khoảng trắng có chủ đích.
- Motion ngắn và phản hồi nhanh.
- Mỗi màn hình có một hành động tiếp theo dễ hiểu.

---

## 9. Design contract có cấu trúc cho AI

```yaml
product:
  name: Memo
  type: flashcard_and_spaced_repetition
  primary_language: vi-VN
  learning_language: ja-JP
  architecture: single_file_vanilla_spa
  primary_viewport: 390-430px

design_direction:
  name: Memo Adaptive Glass
  personality: [calm, focused, precise, warm, modern]
  content_surface: solid
  navigation_surface: regular_glass
  transient_surface: acrylic_glass
  modal_backdrop: smoke
  brand_color: memo_indigo

interaction:
  touch_target_min: 44px
  primary_action_per_screen: 1
  keyboard_first_on_desktop: true
  reduced_motion_required: true
  loading_empty_error_states_required: true

glass_rules:
  use_for: [bottom_nav, compact_header, floating_toolbar, picker, popover, toast]
  never_use_for: [study_card, long_form, long_text, settings_body, nested_glass]
  max_simultaneous_blurred_regions: 3

non_negotiable:
  preserve_hash_routes: true
  preserve_business_logic: true
  preserve_data_od_id_count: 152
  preserve_existing_hooks: true
  no_framework_migration: true
  no_emoji_for_ui_chrome: true
```

---

## 10. Master prompt để giao cho AI coding agent

```text
Bạn đang redesign ứng dụng Memo trong file `memo-vocabulary.html`.

Trước khi thay đổi code, hãy đọc đầy đủ:
1. `AI-CONTEXT-HANDOFF.md`
2. `UI-IMPLEMENTATION-NOTES.md`
3. `MODERN-UI-REFERENCE-PLAYBOOK.md`
4. Toàn bộ phần liên quan trong `memo-vocabulary.html`

Mục tiêu là triển khai design direction “Memo Adaptive Glass”: một ứng dụng học tập mobile-first, bình tĩnh, tập trung và hiện đại. Nội dung dùng solid surfaces; glass chỉ dùng cho navigation và transient controls. Học hỏi nguyên tắc từ Apple Liquid Glass, Microsoft Fluent 2, Linear, Vercel Geist, Notion, Raycast, Quizlet, Duolingo và Anki nhưng không sao chép nhận diện hoặc layout nguyên bản của bất kỳ sản phẩm nào.

Ràng buộc kỹ thuật:
- Không thêm framework hoặc build system.
- Không viết lại ứng dụng từ đầu.
- Không thay routing hash hoặc business logic.
- Bảo tồn chính xác 152 `data-od-id` anchors.
- Bảo tồn các data hook và event hook hiện có.
- UI phải là tiếng Việt tự nhiên và hỗ trợ Kanji/Furigana.
- Thiết kế mobile-first ở 390–430px.
- Mọi modal toàn cục phải ở đúng root layer; backdrop không được nằm trên dialog.

Nguyên tắc thiết kế:
- Content layer solid và dễ đọc.
- Glass layer chỉ dành cho bottom dock, compact header khi scroll, floating editor toolbar, picker, popover và toast.
- Không glass-on-glass.
- Không gradient tím-xanh, neon glow, bento grid tràn lan, pill cho mọi thứ hoặc emoji làm UI icon.
- Mỗi màn hình chỉ có một primary action rõ.
- Dùng icon SVG đồng nhất, touch target tối thiểu 44px, focus state rõ.
- Cung cấp loading, empty, error, disabled, pressed, selected và success states.
- Tôn trọng reduced motion và có fallback khi backdrop-filter không được hỗ trợ.

Quy trình:
1. Inventory các token/component hiện có và nêu phần sẽ tái sử dụng.
2. Chỉ sửa một nhóm component/màn hình trong mỗi pass.
3. Không sửa logic không liên quan.
4. Sau mỗi pass, kiểm tra syntax JavaScript và đếm `data-od-id`.
5. Kiểm tra viewport 390px, 430px và desktop rộng.
6. Báo cáo file/section đã đổi, trạng thái đã kiểm tra và các rủi ro còn lại.

Ưu tiên triển khai:
P0: App shell, design tokens, glass material primitives và modal layering.
P1: `#study`, RatingBar và editor toolbar.
P2: `#learn` và `#decks`.
P3: import, note editor, note types và review settings.
P4: games, result và profile.

Không được triển khai toàn bộ P0–P4 trong một lần nếu chưa render và xác minh từng giai đoạn.
```

---

## 11. Prompt ngắn theo màn hình

### Home

```text
Redesign `#screen-learn` theo Memo Adaptive Glass. Tạo một next-best-action rõ cho số thẻ đến hạn; streak và XP chỉ là secondary context. Dùng solid content cards và glass chỉ ở app navigation/header. Giữ nguyên hook, dữ liệu và logic hiện có. Tránh bento dashboard, hero gradient và decorative blob.
```

### Deck library

```text
Redesign `#screen-decks` thành thư viện deck dạng list dễ scan, lấy hierarchy từ Linear/Notion và semantic queue từ Anki. Search/filter nằm trong compact toolbar; filter cờ mở qua sheet và active filter hiện bằng removable chip. Không biến mọi deck thành card nổi lớn.
```

### Study

```text
Redesign `#screen-study` thành distraction-free review surface. Flashcard là solid focal surface; compact header, queue strip và rating controls là functional control layer. Tap/Space flip; 1–4 rate; Z undo; F flag. Giữ chính xác logic SRS, interval và state hiện có. Motion nhanh, reduced-motion safe, không confetti theo từng thẻ.
```

### Note editor

```text
Redesign `#screen-note-edit` như một focused structured editor. Metadata ở đầu trang, field content ở solid sections, formatting actions trong floating acrylic toolbar. Dùng SVG icon, aria-pressed và keyboard handling. Không để keyboard hoặc toolbar che field đang chỉnh.
```

### Settings

```text
Redesign `#screen-review-settings` thành các semantic fieldset rõ ràng. Preset bar có thể sticky/glass nhẹ; setting body luôn solid. Advanced groups mặc định collapse. Mọi thay đổi ảnh hưởng lịch học cần helper text hoặc warning cụ thể. Không thay logic FSRS/SM-2.
```

---

## 12. Acceptance checklist

### Visual hierarchy

- [ ] Trong 3 giây có thể xác định hành động chính của mỗi màn hình.
- [ ] Content nổi bật hơn navigation chrome.
- [ ] Glass chỉ xuất hiện ở lớp chức năng.
- [ ] Không có glass panel lồng glass panel.
- [ ] Chỉ một primary CTA trên mỗi trạng thái chính.

### Interaction

- [ ] Touch target đạt ít nhất 44×44px.
- [ ] Pressed, selected, disabled, loading, empty, error và success state đầy đủ.
- [ ] Keyboard shortcut không xung đột input/editor.
- [ ] Modal trap focus và trả focus đúng trigger.
- [ ] Back/close behavior nhất quán.

### Learning UX

- [ ] New/Learning/Due giữ đúng semantic.
- [ ] Rating chỉ xuất hiện sau reveal/flip.
- [ ] Interval nằm gần rating tương ứng.
- [ ] Flags và tags giữ đúng cấp card/note.
- [ ] Next action sau phiên học có ý nghĩa.

### Accessibility

- [ ] Contrast text thường đạt WCAG AA.
- [ ] UI không phụ thuộc màu để truyền đạt trạng thái.
- [ ] Focus ring nhìn thấy rõ.
- [ ] Reduced motion hoạt động.
- [ ] Screen reader nhận biết flashcard front/back và toast.

### Technical integrity

- [ ] JavaScript parse thành công.
- [ ] `data-od-id` vẫn đủ 152.
- [ ] Mọi hash route vẫn hoạt động.
- [ ] Không có modal bị backdrop đè/blur/chặn click.
- [ ] Không có nội dung bị bottom dock hoặc keyboard che.
- [ ] Có fallback khi `backdrop-filter` không hỗ trợ.

### Anti-template review

- [ ] Không blob gradient trang trí.
- [ ] Không bento grid không cần thiết.
- [ ] Không pill cho mọi component.
- [ ] Không emoji làm chrome.
- [ ] Không Lorem Ipsum/số liệu giả.
- [ ] Không animation lặp vô nghĩa.

---

## 13. Nguồn tham khảo chính thức

Truy cập ngày 23/09/2026:

1. [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
2. [Apple — Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)
3. [Microsoft Fluent 2 — Material](https://fluent2.microsoft.design/material)
4. [Google Material Design 3](https://m3.material.io/)
5. [Linear — UI refresh, March 2026](https://linear.app/changelog/2026-03-12-ui-refresh)
6. [Vercel Geist Design System](https://vercel.com/geist/introduction)
7. [Vercel Geist — Typography](https://vercel.com/geist/typography)
8. [Vercel Geist — Colors](https://vercel.com/geist/colors)
9. [Shopify App Design — Navigation](https://shopify.dev/docs/apps/design/navigation)
10. [Notion — Navigate with the sidebar](https://www.notion.com/help/navigate-with-the-sidebar)
11. [Raycast — User Interface](https://developers.raycast.com/api-reference/user-interface)
12. [Quizlet — Flashcards](https://quizlet.com/features/flashcards)
13. [Quizlet — Learn](https://quizlet.com/features/learn)
14. [Quizlet 101](https://quizlet.com/content/quizlet101)
15. [Duolingo — Home Screen Redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
16. [Duolingo Teaching Method](https://blog.duolingo.com/duolingo-teaching-method/)
17. [Anki Manual — Studying](https://docs.ankiweb.net/studying.html)
18. [Anki Manual — Adding/Editing](https://docs.ankiweb.net/editing)
19. [Anki Manual — Deck Options](https://docs.ankiweb.net/deck-options.html)
