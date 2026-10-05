# Đặc tả dữ liệu deck/card JSON — Manabi

Truy vết: FR-02/03/04/11/13, NFR-03/08/12; [DECK_CARD](DECK_CARD_SPEC.md), [DATA_STORAGE](DATA_STORAGE_SPEC.md). Contract mẫu hiện tại chưa có toàn bộ metadata production; không tự thêm field vào schema closed hiện có trước task/migration.

## Nguyên tắc

- `field key` là định danh ổn định, không đổi khi người dùng sửa label.
- Deck schema có version; mọi card ghi `schemaVersion`.
- `fields` chỉ chứa dữ liệu nội dung tùy biến.
- Ownership, lịch ôn, xóa mềm, version và timestamp là metadata có cột riêng.
- Phạm vi nghiên cứu hiện tại là deck **tiếng Nhật**. Card có thể linh hoạt, nhưng quiz AI chỉ dùng mapping câu hỏi–đáp án rõ và nghĩa cụ thể đã được người học xác nhận.

## Ví dụ deck

```json
{
  "id": "deck_01",
  "name": "Tiếng Nhật N5",
  "schemaVersion": 1,
  "fieldSchema": [
    { "key": "term", "label": "Từ", "type": "text", "required": true },
    { "key": "reading", "label": "Cách đọc", "type": "text", "required": false },
    { "key": "meaning", "label": "Nghĩa", "type": "text", "required": true },
    { "key": "example", "label": "Ví dụ", "type": "text", "required": false }
  ],
  "cardTemplates": [
    { "id": "default", "front": ["term", "reading"], "back": ["meaning", "example"] }
  ]
}
```

## Ví dụ card

```json
{
  "id": "card_01",
  "deckId": "deck_01",
  "schemaVersion": 1,
  "fields": {
    "term": "学校",
    "reading": "がっこう",
    "meaning": "trường học",
    "example": "学校へ行きます。"
  },
  "tags": ["n5", "school"]
}
```

## Thay đổi schema

- Đổi label không đổi key và không cần sửa card.
- Thêm field optional tăng schema version; card cũ vẫn hợp lệ sau migration mặc định.
- Xóa field phải hỏi người dùng: archive dữ liệu, map sang field khác hoặc xóa vĩnh viễn.
- Đổi type cần migration preview và báo số card không chuyển đổi được.

## Local và backend

- SQLite: `field_schema_json` và `fields_json` lưu dạng TEXT JSON hợp lệ.
- PostgreSQL: dùng JSONB, thêm index có chọn lọc khi có use case truy vấn thật.
- `due_at`, `state`, `stability`, `difficulty`, `reps`, `lapses`, `version`, `updated_at`, `deleted_at` không đặt trong `fields`.

JSON là **định dạng nội dung**, không phải lựa chọn thay thế mọi database. Dữ liệu người dùng linh hoạt nhờ `fieldSchema` + `fields`; backend dùng JSONB vẫn lưu JSON mà có transaction/index/auth cho nhánh cloud tùy chọn. MongoDB/BSON được đánh giá trong nghiên cứu database, chưa mặc định chọn. Không gộp mọi card/lịch sử vào một file hoặc một document user tăng vô hạn.

## Validation và giới hạn đề xuất

- Deck field key unique, template chỉ key đã định nghĩa; schemaVersion đúng phiên bản được hỗ trợ. Validation động fieldSchema bổ sung required/type/length, vì JSON Schema card nền chưa kiểm được quan hệ với deck.
- `text`/`markdown` là chuỗi, `number` là finite number; `image`/`audio` giữ tham chiếu có quyền và metadata media riêng, không tin URL nhập. Schema nền có thể nhận array/null cho mẫu nhưng type mapping động và policy optional phải chốt ở task contract.
- Giới hạn đầu vào đề xuất cho review: 32 field/deck, 10.000 ký tự/text field, 128 KiB/card đã serialize. Nội dung lớn/media binary không nhét vào fields. Lỗi chỉ rõ card/field, không truncate dữ liệu âm thầm.
- Không dùng user-supplied JSON làm query database/lệnh model; whitelist keys/types, reject unsafe operators và HTML/scripts render theo chính sách an toàn.

## Nghiệm thu

Fixtures custom field/Unicode/required/type/oversize/key trùng/mapping sai; export-import semantic roundtrip; schema migration preview/cancel/rollback; metadata SRS truy vấn không parse cả fields; version edit invalidates quiz/ảnh; unknown version reject với lỗi rõ.

## Điều kiện dữ liệu cho quiz/ảnh — chưa triển khai

Đặc tả [AI_QUIZ_SPEC.md](AI_QUIZ_SPEC.md) và [IMAGE_CONTEXT_SPEC.md](IMAGE_CONTEXT_SPEC.md) cần biết phiên bản nội dung card, hướng hỏi–đáp, nghĩa mục tiêu và trạng thái người học đã xác nhận. Các thuộc tính kiểm soát này **không tự động có từ JSON mẫu hiện tại**; task dữ liệu phải thêm contract/migration có version trước khi bật AI. Không nhét trạng thái duyệt, bản quyền ảnh, prompt/model version hoặc kết quả quiz vào `fields` tùy biến. Khi người học sửa từ/nghĩa/cách đọc, quiz và ảnh gắn với phiên bản cũ phải hết hiệu lực cho lượt mới.
