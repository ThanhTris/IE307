# Đặc tả nhập dữ liệu

## Nguồn

CSV, XLSX, paste text, Quizlet export text và Anki notes plain text.

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
