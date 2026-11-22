# Độ phủ dữ liệu cho bộ lọc khẩu vị

Sinh bởi `python scripts/dish_filter_coverage.py --gm41` từ `supabase/seed/catalogue/gm41/dishes.json` (dataset 1.2.0, test_demo). Không sửa tay; chạy lại script sau khi dữ liệu đổi.

## Tổng quan

| Trường | Có dữ liệu | Bộ lọc dùng |
|---|---|---|
| Nhóm món (bữa chính) | 43/72 (60%) | Loại món |
| Nhóm món (Ăn vặt) | 25/72 (35%) | Loại món khi chọn Ăn vặt |
| Miền | 22/72 (31%) | Ẩm thực |
| `flavor` (ít nhất 1 vị đã biết) | 8/72 (11%) | Hương vị |
| Béo / Ngậy (`flavor.fatty`) | 3/72 (4%) | Hương vị |
| `mealSlots` | 72/72 (100%) | Chọn pool theo bữa |
| `temperature` | 6/72 (8%) | Thẻ món |
| Giá quan sát | 65/72 (90%) | Thẻ món |
| Ảnh có quyền dùng | 0/72 (0%) | Thẻ món |

Số món theo bữa: sáng 21, trưa 42, tối 22, ăn vặt 26. Một bữa cần ít nhất 10 món để tạo phòng bình thường (5 khi chấp nhận thiếu món).

## Món theo từng mục lọc

| Mục | Số món | Món |
|---|---|---|
| Bữa chính · Cơm | 13 | Cơm cá chiên, Cơm chay, Cơm sườn, Cơm bò, Cơm đậu hủ sốt cà, Cơm thịt kho, Cơm gà, Cơm trộn, Cơm chiên, Cơm tôm rim, Cơm cá kho, Cơm canh khổ qua, Cơm tấm |
| Bữa chính · Bún / Phở | 13 | Phở bò, Phở gà, Bún thịt nướng, Bún mọc, Bún chay, Bún riêu, Bún gạo lứt, Bún chả, Bún đậu, Bún riêu chay, Bún nem nướng, Bún bò chay, Bún bò |
| Bữa chính · Mì / Miến / Hủ tiếu | 8 | Bánh canh, Mì trộn, Mì Quảng, Mì, Nui, Mì Ý, Miến, Hủ tiếu |
| Bữa chính · Lẩu & Nướng | 6 | Bún thịt nướng, Bún chả, Lẩu mắm, Bún nem nướng, Lẩu Thái, Lẩu nấm |
| Bữa chính · Bánh mì / Xôi | 3 | Bánh mì, Xôi, Sandwich gà |
| Bữa chính · Cháo / Súp | 3 | Cháo lươn, Cháo gà, Súp cua |
| Ăn vặt · Đồ chiên & Xiên que | 3 | Bột chiên, Nem lụi, Nem chua rán |
| Ăn vặt · Các loại bánh mặn | 5 | Bánh ướt, Bánh xèo, Bánh bao, Bánh bèo, Bánh nậm |
| Ăn vặt · Món trộn & Cuốn | 3 | Gỏi cuốn, Bánh tráng trộn, Nem lụi |
| Ăn vặt · Ốc & Hải sản | 3 | Ốc móng tay xào bơ tỏi, Ốc hương hấp sả, Ốc len xào dừa |
| Ăn vặt · Bánh ngọt | 3 | Bánh bò, Bánh pía, Bánh da lợn |
| Ăn vặt · Chè & Kem | 3 | Chè bưởi, Kem bơ, Chè ba màu |
| Ăn vặt · Trái cây & Đồ chua | 3 | Cóc lắc, Ổi lắc, Xoài lắc |
| Ăn vặt · Đồ ăn vặt khô | 3 | Dừa sấy, Ô mai, Kẹo dừa |
| Ẩm thực · Miền Bắc | 6 | Phở bò, Phở gà, Ô mai, Bún chả, Bánh cuốn, Nem chua rán |
| Ẩm thực · Miền Trung | 9 | Cháo lươn, Mì Quảng, Bánh xèo, Kem bơ, Bánh bèo, Cơm gà, Nem lụi, Bánh nậm, Bún bò |
| Ẩm thực · Miền Nam | 4 | Gỏi cuốn, Bánh xèo, Hủ tiếu, Cơm tấm |
| Ẩm thực · Miền Tây | 6 | Bánh canh, Bánh xèo, Lẩu mắm, Bánh pía, Hủ tiếu, Kẹo dừa |
| Hương vị · Cay | 3 | Cháo lươn, Lẩu Thái, Bún bò |
| Hương vị · Chua / Chua cay | 2 | Bún riêu, Lẩu Thái |
| Hương vị · Ngọt | 3 | Bánh bò, Chè ba màu, Kẹo dừa |
| Hương vị · Béo / Ngậy | 3 | Kem bơ, Bánh bò, Kẹo dừa |
| Hương vị · Mặn / Đậm đà | 0 | — |
| Hương vị · Thanh đạm | 0 | — |

Món đa nhãn (≥ 2 giá trị): bữa 25/72, nhóm món 4/72, miền 2/72. Một món được thuộc nhiều bữa, nhiều nhóm, nhiều miền và nhiều vị; ghi đủ mọi giá trị có nguồn.

Món chưa thuộc nhóm nào: Burger.
