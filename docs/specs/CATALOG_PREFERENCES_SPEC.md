# CATALOG & PREFERENCES SPEC

food-v1 • 2026-10-07 • FR-03..04/20; chờ GM-28 review.

## Catalogue

Mục tiêu catalogue biên tập 60–80 món, ID ổn định; món có tên, mô tả ngắn, nhiều categoryIds, mealSlots, ingredientTags nếu biết, nguồn ảnh/license nếu có. Không tải ảnh mạng không có quyền; MVP dùng minh họa tự tạo hoặc icon kèm tên.

Catalogue xuất bản có version; phiên đã mở giữ snapshot. Món không có nguồn/độ tin cậy về thành phần ghi “chưa xác minh”, không tự nhận an toàn dị ứng. Bộ demo chỉ là fixture, không phải dữ liệu quán thực tế.

## Ưu tiên loại món

- Từng người chọn nhiều loại, có thể bỏ qua. Chọn “nướng” không có nghĩa cấm mọi món thuộc “lẩu”.
- Trước hết lọc offering verified theo coverage/anchor/radius/giờ quán–món/ngoại lệ/buổi ở [food spec](FOOD_DATA_SPEC.md); rồi xếp sở thích mềm và xen nhóm để tránh chỉ có món của một người.
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

## Context/card v0.2

Ảnh có source/license; giá nullable VNĐ/người có nguồn/khu vực/ngày, không giả giá khi thiếu. Budget/history là ưu tiên mềm, khóa context version cùng pool. [Context/history](CONTEXT_HISTORY_SPEC.md) là nguồn chi tiết; [UI](UI_SPEC.md) dùng double-tap WANT/ba nút, không vote vuốt dọc.

## Data food-v1

Cuisine Việt/Thái… và origin Bắc/Trung/Nam tách category và nơi bán. Temperature tách flavor/intensity; không suy vị từ tên. GM-03 bàn giao dictionary/biểu mẫu/fixtures; GM-27 nơi bán/menu/giờ có nguồn thật; GM-30 lọc eligibility trước GM-08 pool. Không có offering đạt điều kiện thì món biên tập không được vào gợi ý thực tế. Card/variant không ghép đặc tính từ nhiều quán thành lựa chọn không quán nào bán. [FOOD_DATA_SPEC](FOOD_DATA_SPEC.md) là nguồn quy tắc lịch/coverage/freshness.
