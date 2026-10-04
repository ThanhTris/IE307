# Đặc tả JSON backup/restore — Manabi

Liên kết: FR-11/17, NFR-03/05/08/12; [CARD_JSON](CARD_JSON_SPEC.md), [DATA_STORAGE](DATA_STORAGE_SPEC.md), [DATA_PRIVACY](DATA_PRIVACY_SPEC.md).

## Định dạng đề xuất

JSON UTF-8 versioned, không file database đang chạy. Manifest có `format`, `formatVersion`, `createdAt`, app/schema/scheduler versions, counts và SHA-256 từng tập record theo canonical serialization task contract chốt. Payload deck/card/mapping, scheduling/review/game history, settings và provenance quiz/ảnh được phép lưu. Hợp đồng/schema thực thi là task riêng; schema mẫu hiện tại chưa đủ backup hoàn chỉnh.

Không access/refresh token, Gemini key, signing, raw log, data tài khoản khác. Media không tự nhúng nếu quyền không cho phép; giữ ID/source/license mapping phù hợp. Deck export để chuyển cho người khác không mặc định lịch sử cá nhân; full personal backup cảnh báo có nội dung riêng tư.

## Export và restore

Snapshot nhất quán từ transaction. Đích qua system file picker/share có chủ ý, không upload bên ngoài mặc định. Restore validate size/schema/version/checksum, preview counts/errors/duplicate/ownership trước commit; không tin path/HTML/URL từ file. Version mới chưa hỗ trợ reject, không ghi phần parse được.

Restore default dataset local mới hoặc merge policy rõ; ID trùng preview keep-existing/restore-copy/replace đã confirm. Remap ID giữ foreign references. Account khác không nhận ownership chỉ vì ownerId trong backup; server verify/remap sau auth. Failure rollback toàn bộ. Restore qua migration review vào schema hiện tại, không hạ DB schema.

## Nghiệm thu

Roundtrip custom/Unicode/SRS/events counts + semantic hashes; corrupt/checksum/version/oversize reject không đổi DB; cancel không mutation; fail giữa restore rollback; copy-ID giữ references; export không secrets/user khác; picker cancel an toàn; offline export/restore.
