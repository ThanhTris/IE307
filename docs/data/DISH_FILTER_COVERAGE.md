# Độ phủ dữ liệu cho bộ lọc khẩu vị

Sinh bởi `python scripts/dish_filter_coverage.py` từ `supabase/seed/catalogue/dishes.json` (dataset 1.1.0, test_demo). Không sửa tay; chạy lại script sau khi dữ liệu đổi.

## Tổng quan

| Trường | Có dữ liệu | Bộ lọc dùng |
|---|---|---|
| Nhóm món (bữa chính) | 33/39 (85%) | Loại món |
| Nhóm món (Ăn vặt) | 5/39 (13%) | Loại món khi chọn Ăn vặt |
| `origin` (miền) | 1/39 (3%) | Ẩm thực |
| `flavor` (ít nhất 1 vị đã biết) | 0/39 (0%) | Hương vị |
| Béo / Ngậy | 0/39 (0%) | Hương vị |
| `mealSlots` | 30/39 (77%) | Chọn pool theo bữa |
| `temperature` | 2/39 (5%) | Thẻ món |
| Giá quan sát | 39/39 (100%) | Thẻ món |
| Ảnh có quyền dùng | 0/39 (0%) | Thẻ món |

Số món theo bữa: sáng 14, trưa 23, tối 7, ăn vặt 1. Một bữa cần ít nhất 10 món để tạo phòng bình thường (5 khi chấp nhận thiếu món).

## Món theo từng mục lọc

| Mục | Số món | Món |
|---|---|---|
| Bữa chính · Cơm | 13 | Cơm cá chiên, Cơm chay, Cơm sườn, Cơm bò, Cơm đậu hủ sốt cà, Cơm thịt kho, Cơm gà, Cơm trộn, Cơm chiên, Cơm tôm rim, Cơm cá kho, Cơm canh khổ qua, Cơm tấm |
| Bữa chính · Bún / Phở | 12 | Phở bò, Phở gà, Bún thịt nướng, Bún mọc, Bún chay, Bún riêu, Bún gạo lứt, Bún đậu, Bún riêu chay, Bún nem nướng, Bún bò chay, Bún bò |
| Bữa chính · Mì / Miến / Hủ tiếu | 6 | Mì trộn, Mì, Nui, Mì Ý, Miến, Hủ tiếu |
| Bữa chính · Lẩu & Nướng | 0 | — |
| Bữa chính · Bánh mì / Xôi | 2 | Bánh mì, Xôi |
| Bữa chính · Cháo / Súp | 0 | — |
| Ăn vặt · Đồ chiên & Xiên que | 0 | — |
| Ăn vặt · Các loại bánh mặn | 4 | Bánh cuộn, Bánh ướt, Bánh bao, Bánh cuốn |
| Ăn vặt · Món trộn & Cuốn | 1 | Salad |
| Ăn vặt · Ốc & Hải sản | 0 | — |
| Ăn vặt · Bánh ngọt | 0 | — |
| Ăn vặt · Chè & Kem | 0 | — |
| Ăn vặt · Trái cây & Đồ chua | 0 | — |
| Ăn vặt · Đồ ăn vặt khô | 0 | — |
| Ẩm thực · Miền Bắc | 1 | Bánh cuốn |
| Ẩm thực · Miền Trung | 0 | — |
| Ẩm thực · Miền Nam | 0 | — |
| Ẩm thực · Miền Tây | 0 | — |
| Hương vị · Cay | 0 | — |
| Hương vị · Chua / Chua cay | 0 | — |
| Hương vị · Ngọt | 0 | — |
| Hương vị · Mặn / Thanh đạm | 0 | — |

Món chưa thuộc nhóm nào: Burger.
