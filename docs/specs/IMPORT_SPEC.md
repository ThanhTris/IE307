# Đặc tả nhập dữ liệu — Manabi

Truy vết: FR-04, NFR-03/08/12; [CARD_JSON](CARD_JSON_SPEC.md), [DECK_CARD](DECK_CARD_SPEC.md). Paste/CSV thuộc core; XLSX/Anki/Quizlet conversion không tự mở rộng trong task parser.

## Nguồn

MVP ưu tiên paste text và CSV UTF-8 chứa tiếng Nhật/Vietnamese. XLSX, Quizlet export text và Anki notes plain text là nhánh mở rộng sau khi parser/preview cơ bản đạt. Không tự gọi API hoặc lấy dữ liệu từ tài khoản ứng dụng khác.

Giới hạn đề xuất trước benchmark/review: file ≤ 5 MiB, ≤ 10.000 rows/lần; quá giới hạn báo chia file, không truncate. Không đánh dấu imported card đã học/confirmed tự động. Card học bình thường sau người dùng preview; AI cần xác nhận nghĩa riêng. Media URL không tải bên ngoài mặc định.

## Pipeline

1. Đọc nguồn và giới hạn kích thước an toàn.
2. Phát hiện encoding, header, row/column delimiter.
3. Chuẩn hóa row nhưng giữ nguyên source cho preview.
4. Người dùng map source columns vào field keys của deck.
5. Validate required/type/length và đánh dấu lỗi theo row.
6. Phát hiện duplicate theo fingerprint các field được chọn.
7. Preview, sửa và chọn chính sách duplicate.
8. Ghi transaction; nếu lỗi nghiêm trọng thì rollback toàn bộ batch.

## Acceptance rules

- 100 card nhập thành công từ file hợp lệ.
- Row lỗi không biến thành card rỗng.
- Không ghi đè duplicate im lặng.
- Parser có fixture cho dấu phẩy, tab, xuống dòng, quote, Unicode Việt/Nhật và cell rỗng.
- Import report ghi số created/skipped/merged/failed.
- Hủy preview không mutation; lỗi ghi transaction rollback; empty/header-only/oversize sai báo rõ. Duplicate merge chỉ khi người học chọn, tăng contentVersion và invalidate source quiz/ảnh cũ; không đụng review history âm thầm.
- Spreadsheet formula/script text coi là dữ liệu, không execute. Export CSV nếu thêm cần neutralize formula injection mà vẫn giữ source theo policy; đây không phải import XLSX đã triển khai.
