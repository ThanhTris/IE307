# Đặc tả deck/card — Manabi

Liên kết: FR-02/03, NFR-03/08/12; [CARD_JSON](CARD_JSON_SPEC.md), [DATA_STORAGE](DATA_STORAGE_SPEC.md). Hành vi đề xuất cần task/review trước triển khai.

## Nội dung và thao tác

Deck có name/description/tags, `fieldSchema`, template front/back và mapping dùng học/game. Mặc định tiếng Nhật có `term`, `reading`, `meaning`, `example`; người học thêm field nội dung cho nhu cầu riêng. Thêm field không mở rộng nghiên cứu nhiều ngôn ngữ.

Card giữ `fields` JSON theo key của deck. Validation gồm JSON Schema nền và validation động theo fieldSchema: required, type, length, key/reference/template tồn tại. Schema nền hiện có chỉ là contract mẫu; ownership/contentVersion/confirmation/timestamp/scheduling cần contract/migration riêng trước AI/sync.

CRUD local ghi transaction. Archive loại card/deck khỏi phiên mới nhưng giữ lịch sử và có restore. Hard delete cần preview các card/event liên quan và xác nhận; đề xuất backup trước thay đổi phá dữ liệu. Search theo term/reading/meaning/tag trên local, phân trang/virtualize. Không strip kanji/kana hay dấu tiếng Việt trong dữ liệu gốc; normalized search/fingerprint là index dẫn xuất.

`contentVersion` tăng khi sửa nội dung liên quan nghĩa/cách đọc/mapping. `confirmedAt` và `confirmedContentVersion` chứng minh người học xác nhận phiên bản đó; sửa lại thì xác nhận lại. Một `senseKey` chỉ một nghĩa mục tiêu. Meaning nhiều nghĩa chưa tách vẫn học thẻ nhưng không dùng quiz chấm điểm. “Đã học” lấy từ review/session hợp lệ, không từ thời điểm tạo card.

## Thay schema

Đổi label giữ key. Key unique ổn định; template không tham chiếu key không tồn tại. Thêm optional field có migration versioned; đổi type/xóa field bắt buộc preview record ảnh hưởng và chọn map/archive/xóa, không tự xóa fields cũ. Hủy preview không ghi gì. Từ chối migration nếu card không convert được chưa được xử lý. HTML/markdown/URL import là dữ liệu không đáng tin; render an toàn, không execute script.

## Nghiệm thu

Default/custom schema CRUD/archive/restore rồi restart; tìm Unicode/tag; key trùng/template sai reject; required/type sai chỉ field; đổi label giữ card; migration cancel/fail không mất data; sửa meaning invalidates confirmation/quiz/image cũ nhưng không viết lại attempts. Khi sync bật, user A không đọc/sửa B.
