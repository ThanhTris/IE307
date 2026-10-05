# Đặc tả tài khoản và đồng bộ — Manabi

Liên kết: FR-12/13/17, NFR-01/03/04/05/08. Extension không chặn core offline. Provider dự kiến theo [DATA_STORAGE](DATA_STORAGE_SPEC.md)/ADR; chưa có app/auth production.

## Tài khoản

Guest học không cần login. Login có thông báo upload và preview chọn chuyển deck local vào account, không tự tải toàn bộ guest data. Provider auth, token secure storage; không tự giữ password/service-role key.

Logout chọn giữ bản local riêng hoặc xóa cached account data; giải thích trước thao tác. Không hiện account A sau login B. Session expired dừng sync/AI, local data được phép vẫn học; reauth không reset SRS. Delete theo DATA_PRIVACY.

## Đồng bộ

Local transaction ghi mutation + outbox. Event `eventId`, `deviceId`, entityId/type, operation, baseVersion, UTC timestamp, payload/schemaVersion và ownership server verify. Push/pull cursor, accepted event không gửi vô hạn; server auth/schema/version/size trước write, không tin client ownerId.

BaseVersion sai trả conflict server record/version + client change; không last-write-wins im lặng bằng client clock. UI giữ server/giữ copy/merge preview; reviews/game/quiz attempts append-only dedup ID. Tombstone delete/archive truyền thiết bị khác. Contract mới có migration/capability gate, không gửi payload mới cho app cũ thiếu khả năng đọc.

## Quan hệ AI

Pilot server chỉ card demo không nhạy cảm đã sync, ownership/learned/confirmed verified và consent/điều khoản phù hợp. Guest vẫn Four Choices local. Không mở AI rộng cho private deck trong task auth/sync, cần provider/data decision riêng.

## Nghiệm thu

A/B isolation/spoof owner; guest upload cancel; logout/login B không lộ A; token expired/network loss; replay dedup; edits hai máy conflict; tombstone không sống lại từ outbox; cursor resume; unsupported schema lỗi ổn định; sync lỗi core vẫn học.
