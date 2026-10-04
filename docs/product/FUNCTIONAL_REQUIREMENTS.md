# Yêu cầu chức năng — Manabi

Ngày 02/10/2026. Danh mục này mô tả hành vi phải triển khai/kiểm tra; không phải danh sách tính năng đã chạy. `Core` thuộc MVP offline, `Extension` là bước mở rộng, `Pilot` cần cổng nghiên cứu và review. Mỗi task ghi FR áp dụng và evidence kiểm tra theo đặc tả liên kết.

| ID | Yêu cầu và hành vi nghiệm thu | Mức | Đặc tả |
| --- | --- | --- | --- |
| FR-01 | Bắt đầu học không cần đăng nhập; chọn mặt thẻ, giới hạn phiên ôn, giao diện hệ thống/sáng/tối và reduce-motion; giữ cài đặt sau restart | Core | [FLASHCARD](../specs/FLASHCARD_SPEC.md), [GAMES](../specs/GAMES_SPEC.md) |
| FR-02 | Tạo/sửa/archive/khôi phục deck, trường nội dung và mặt thẻ; key ổn định; thay type/xóa field có preview/migration, không mất nội dung im lặng | Core | [DECK_CARD](../specs/DECK_CARD_SPEC.md), [CARD_JSON](../specs/CARD_JSON_SPEC.md) |
| FR-03 | CRUD card, tìm kiếm/tag, xác nhận nội dung và một nghĩa mục tiêu; chỉnh sửa tăng content version và vô hiệu quiz/ảnh cũ; ownership/metadata ngoài fields | Core | [DECK_CARD](../specs/DECK_CARD_SPEC.md) |
| FR-04 | Paste/CSV UTF-8, map cột, preview lỗi/trùng, chọn skip/merge rõ ràng; ghi transaction và report created/skipped/merged/failed | Core | [IMPORT](../specs/IMPORT_SPEC.md) |
| FR-05 | Học mới/ôn đến hạn, mặt trước/sau theo template; chỉ sau reveal mới chọn rating; resume không tự chấm hoặc ghi lặp event | Core | [FLASHCARD](../specs/FLASHCARD_SPEC.md) |
| FR-06 | Lịch ôn deterministic có version, bốn rating, event append-only/idempotent, UTC storage; quiz chỉ tín hiệu phụ và mặc định shadow mode | Core | [SRS](../specs/SRS_SPEC.md) |
| FR-07 | Matching 3–4 cặp từ card đã học, phản hồi đúng/sai và kết thúc session; không lộ pair ID hoặc dùng cặp mơ hồ | Core | [GAMES](../specs/GAMES_SPEC.md) |
| FR-08 | Four Choices local một đáp án + ba nhiễu khác nghĩa; lấy lựa chọn chủ động đầu tiên; không đủ dữ liệu thì giải thích và quay lại học thẻ | Core | [GAMES](../specs/GAMES_SPEC.md) |
| FR-09 | Word Ninja có ba mạng, nhịp tăng có giới hạn và reduce-motion; bom/auto-hit/lỗi thao tác không tạo bằng chứng nhớ/quên | Core | [GAMES](../specs/GAMES_SPEC.md) |
| FR-10 | Tiến độ tách review trực tiếp, game và quiz; hiển thị đến hạn/lịch sử/accuracy có mẫu số; không đổi điểm game thành “đã thuộc” | Core | [PROGRESS](../specs/PROGRESS_SPEC.md) |
| FR-11 | Xuất/nhập backup JSON versioned; kiểm schema/checksum, preview xung đột và rollback; không xuất secret | Core | [BACKUP](../specs/BACKUP_SPEC.md) |
| FR-12 | Auth tùy chọn qua provider, login/logout/session expiration; guest vẫn học được; chuyển ownership sau confirm, không trộn dữ liệu tài khoản | Extension | [AUTH_SYNC](../specs/AUTH_SYNC_SPEC.md) |
| FR-13 | Outbox/cursor sync có event ID/base version; phát hiện xung đột, không ghi đè im lặng; replay không nhân đôi review/game | Extension | [AUTH_SYNC](../specs/AUTH_SYNC_SPEC.md), [DATA_STORAGE](../specs/DATA_STORAGE_SPEC.md) |
| FR-14 | AI tạo bản nháp từ card demo đã học/được xác nhận; đáp án khóa từ nguồn, ba nhiễu có ID; review ngữ nghĩa độc lập trong pilot, report lỗi, stale invalidation | Pilot | [AI_QUIZ](../specs/AI_QUIZ_SPEC.md) |
| FR-15 | Key Gemini chung của admin chỉ ở backend; tối đa 10 câu mới đã duyệt/người/ngày Asia/Ho_Chi_Minh; 5 nháp/lượt, tối đa 2 lượt tạo; global request/token cap, atomic reservation/idempotency/cache; lỗi/quota thì Four Choices local | Pilot | [AI_QUIZ](../specs/AI_QUIZ_SPEC.md) |
| FR-16 | API tìm ảnh có quyền sử dụng cho 30–50 nghĩa cụ thể; chỉ phát ảnh đã duyệt nghĩa, nguồn/ghi công và OCR/nội dung không lộ đáp án. Bài “nhìn ảnh, chọn nghĩa tiếng Việt” có đúng bốn lựa chọn: một nghĩa chuẩn từ card đã học/được xác nhận và ba nhiễu cùng miền nghĩa nhưng không trùng/đồng nghĩa/mơ hồ. Thiếu ảnh hoặc ba nhiễu hợp lệ thì bỏ câu/fallback; lưu provenance và version của card, ảnh, model, prompt, bộ kiểm tra | Pilot | [IMAGE_CONTEXT](../specs/IMAGE_CONTEXT_SPEC.md) |
| FR-17 | Thông báo dữ liệu/consent dịch vụ ngoài, thu hồi consent, export/xóa theo scope; không gửi private deck mặc định; điều kiện Gemini không phù hợp thì tắt AI | Core + Extension | [DATA_PRIVACY](../specs/DATA_PRIVACY_SPEC.md) |
| FR-18 | Android build chạy core offline, có empty/loading/error/retry an toàn; chỉ chức năng đã nghiệm thu xuất hiện trong listing, feature flag cho pilot | Release | [RELEASE](../specs/RELEASE_SPEC.md) |

## Thứ tự và nghiệm thu

FR-02–FR-06 và contract JSON/lưu trữ phải ổn trước game. FR-12–FR-13 là điều kiện cho flow server AI có card đồng bộ của tài khoản; không phải điều kiện mở core offline. FR-14–FR-16 không chặn nghiệm thu FR-01–FR-11. Pilot không đạt thì giữ feature flag tắt trong build release.

Fixture không nhạy cảm bao phủ Unicode, thiếu reading, nhiều nghĩa, đồng âm `橋`/`箸`, ít card, fields tự định nghĩa, import trùng, sửa card, mất mạng, restart và event lặp. Review chỉ rõ FR đạt, evidence, FR chưa chạy và hạn chế.
