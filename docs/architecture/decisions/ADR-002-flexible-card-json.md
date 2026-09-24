# ADR 002 Flexible card JSON

## Trạng thái

Accepted ngày 24/09/2026.

## Quyết định

Deck sở hữu `fieldSchema` JSON; card lưu giá trị trong `fields` JSON. Các giá trị phục vụ query, lịch ôn, ownership và sync được lưu ở cột chuẩn hóa.

## Lý do

Người dùng có thể tự định nghĩa trường mà không cần migration cho mỗi loại thẻ. Cột chuẩn hóa tránh việc mọi truy vấn phải quét JSON và giúp sync/SRS đáng tin cậy.

## Hệ quả

Cần JSON Schema versioning, migration cho schema deck, validation khi import và quy tắc xử lý field bị đổi/xóa.
