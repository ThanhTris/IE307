# Yêu cầu sản phẩm Memo Vocabulary

## Người dùng

- Người tự học ngoại ngữ hoặc thuật ngữ chuyên ngành.
- Học sinh, sinh viên cần ghi nhớ kiến thức.
- Giáo viên/phụ huynh chuẩn bị bộ thẻ và theo dõi việc học ở mức cơ bản.

## Luồng chính

1. Người dùng đăng nhập hoặc dùng local-first mode.
2. Tạo deck và chọn schema trường, hoặc nhập CSV/Excel/văn bản.
3. Ánh xạ cột, xem trước, sửa và lưu card.
4. Học card mới; lật thẻ và tự đánh giá.
5. Ôn card đến hạn hoặc luyện bằng game.
6. Xem tiến độ, thẻ thường sai và xuất backup.
7. Khi có mạng, đồng bộ thay đổi với tài khoản.

## Yêu cầu chức năng

### Deck và card

- CRUD deck/card, tìm kiếm, tag, flag và archive.
- Deck định nghĩa field schema có key ổn định, label, type, required và side mặc định.
- Card lưu `fields` JSON; không phụ thuộc cố định vào front/back/reading/meaning.
- Template mặt trước/sau chọn field theo key.

### Import

- Hỗ trợ CSV, XLSX và paste text.
- Tự gợi ý delimiter nhưng cho phép đổi.
- Ánh xạ cột, xem trước, sửa trực tiếp và báo lỗi theo dòng.
- Chính sách duplicate: skip, merge hoặc create copy; mặc định không ghi đè im lặng.

### Study và SRS

- Trạng thái New, Learning, Review và Relearning.
- Rating Again, Hard, Good, Easy.
- Lưu review event bất biến để truy vết.
- Hiển thị due count, new count, learning count và session result.

### Games

- Chỉ lấy card đã học và có đủ field cần thiết.
- Matching: 3-4 cặp, không có nội dung trùng trong một lượt.
- Four Choices: một đáp án đúng và ba distractor hợp lệ.
- Word Ninja: ba mạng; bom/lỗi thao tác không được coi là quên card.
- Chỉ câu trả lời chủ động đầu tiên tạo learning signal; vật phẩm auto-complete không ảnh hưởng SRS.

### Tài khoản và đồng bộ

- Email/password hoặc magic link ở MVP.
- Dữ liệu người dùng tách bằng RLS.
- Offline queue, retry, idempotency và hiển thị trạng thái sync.
- Conflict không được làm mất dữ liệu; card/deck dùng version và updatedAt.

## Yêu cầu phi chức năng

- Mở màn hình chính dưới 2 giây trên thiết bị mục tiêu sau cold start hợp lý.
- Danh sách 1.000 card vẫn cuộn ổn định bằng virtualization.
- Không block JavaScript thread bằng parser/tính toán lớn trong render.
- Touch target, font scaling, screen reader label, contrast và safe area đạt mức chấp nhận.
- Không lưu secret trong app; session lưu bằng cơ chế bảo mật của Expo.
- Backup JSON có version và có thể import lại sau khi validate.

## Không thuộc MVP

AI tạo nội dung trực tiếp, social/community, classroom workflow đầy đủ, payment và moderation quy mô lớn.
