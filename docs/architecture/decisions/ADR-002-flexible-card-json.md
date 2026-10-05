# ADR 002 — Card JSON linh hoạt của Manabi

## Trạng thái

Đề xuất, chờ review kỹ thuật về schema, version, confirmation và lịch ôn trước triển khai.

## Quyết định

Deck sở hữu `fieldSchema` JSON versioned; card lưu nội dung trong `fields` JSON. Ownership, version/hash, lịch ôn, sync và xóa mềm nằm ngoài user fields, truy vấn được qua cột/index. SQLite TEXT JSON local, PostgreSQL JSONB cho nhánh cloud tùy chọn; JSON không bắt buộc MongoDB.

Thiết kế cần review: `card_schedules` riêng owner-card-template; card `contentVersion`/`contentHash` tách recordVersion và scheduler state; `confirmedContentVersion`/`confirmedContentHash` phải khớp nguồn trước quiz/ảnh. Sửa sense/mapping/nội dung làm nguồn cũ stale. [DATA_STORAGE](../../specs/DATA_STORAGE_SPEC.md), [ADR-004](ADR-004-json-storage-and-database.md)

## Lý do

Người học tiếng Nhật tự định nghĩa trường nội dung mà không cần thêm cột database cho mỗi field. Metadata/index riêng giúp query SRS, ownership và sync; schedule riêng tránh ôn bài làm thay content version. Không gộp mọi card/history vào một JSON tăng vô hạn.

## Hệ quả

Cần JSON Schema versioning, validator động theo deck, migration/preview cho đổi type/xóa field và import/backup fixtures. Field key ổn định khi đổi label; type/length/unsafe key/template code phải reject theo policy. Schema mẫu hiện tại chưa có hết metadata production và không được thêm trường im lặng vào contract closed.

Hash canonical có version, source invalidation, transaction/outbox, confirmation và index benchmark 10.000 card là acceptance đề xuất, chưa triển khai/đo. MongoDB validator Draft 4 không copy trực tiếp contract Draft 2020-12; phương án thay DB cần ADR/review riêng.
