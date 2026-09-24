# Đặc tả dữ liệu deck và card dạng JSON

## Nguyên tắc

- `field key` là định danh ổn định, không đổi khi người dùng sửa label.
- Deck schema có version; mọi card ghi `schemaVersion`.
- `fields` chỉ chứa dữ liệu nội dung tùy biến.
- Ownership, lịch ôn, xóa mềm, version và timestamp là metadata có cột riêng.

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
