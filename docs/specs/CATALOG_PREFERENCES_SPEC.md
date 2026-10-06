# CATALOG & PREFERENCES SPEC

Draft v0.1 • FR-03..04.

## Catalogue

60–80 món do nhóm biên soạn, ID ổn định; món có tên, mô tả ngắn, nhiều categoryIds, mealSlots, ingredientTags nếu biết, nguồn ảnh/license nếu có. Không tải ảnh mạng không có quyền; MVP dùng minh họa tự tạo hoặc icon kèm tên.

Catalogue xuất bản có version; phiên đã mở giữ snapshot. Món không có nguồn/độ tin cậy về thành phần ghi “chưa xác minh”, không tự nhận an toàn dị ứng. Bộ demo chỉ là fixture, không phải dữ liệu quán thực tế.

## Ưu tiên loại món

- Từng người chọn nhiều loại, có thể bỏ qua. Chọn “nướng” không có nghĩa cấm mọi món thuộc “lẩu”.
- Lọc theo buổi ăn trước; xếp nhóm món theo tổng số sở thích khớp, xen các nhóm để tránh chỉ có món của một người.
- Bộ vòng 1 tối đa 8 món, mỗi category được chọn có đại diện khi catalogue cho phép; deterministic khi cùng seed/version. Nếu ít hơn 8 thì dùng số có sẵn, không lặp món.
- Món đa nhãn, ví dụ “lẩu nướng”, chỉ được đưa vào catalogue nếu nhóm đã xác định nó là một lựa chọn có nghĩa. Không tự ghép tên bằng AI.
- Khi không có món theo buổi ăn, UI báo catalogue chưa có và cho host đổi buổi ở lobby; không phát phòng bỏ phiếu rỗng.

## Loại trừ

MVP dùng NO ở cấp món trong phiên. Không xây hồ sơ bệnh/dị ứng. Nếu có tên thành phần, chỉ là hỗ trợ đọc thông tin; người dùng tự chọn NO. P2 dietary filter cần riêng spec và dữ liệu được kiểm chứng.

## Acceptance criteria

- CAT-01: cùng room snapshot thì tập món trên mọi máy giống nhau.
- CAT-02: A chọn nướng, B chọn lẩu không làm tập ứng viên rỗng chỉ vì giao category rỗng.
- CAT-03: pool không trùng ID, không đổi khi remote catalogue cập nhật.
- CAT-04: “Gì cũng được” và nhiều category đều hợp lệ; không mặc định NO theo category không chọn.
