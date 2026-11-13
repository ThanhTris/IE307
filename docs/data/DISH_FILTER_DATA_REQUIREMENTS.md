# Yêu cầu dữ liệu cho bộ lọc khẩu vị

Ngày 2026-11-13. Áp dụng cho catalogue món (GM-40) mà backend dùng để chọn pool (ADR-024). Độ phủ hiện tại xem
[DISH_FILTER_COVERAGE.md](DISH_FILTER_COVERAGE.md); mẫu điền là
[`data-preparation/templates/dish_filter_enrichment.csv`](../../data-preparation/templates/dish_filter_enrichment.csv).

## Backend dùng dữ liệu thế nào

1. **Chọn pool theo bữa:** chỉ những món có `mealSlots` chứa bữa của phòng mới được bốc. Món thiếu `mealSlots` không
   bao giờ vào pool.
2. **Ưu tiên mềm khi chủ phòng bắt đầu:** mỗi món được cộng điểm theo số khẩu vị của từng thành viên mà nó khớp (nhóm
   món, miền, từng vị). Mọi thành viên ngang nhau, không ưu tiên chủ phòng. Món thiếu dữ liệu không bị trừ điểm,
   chỉ không được cộng, nên dữ liệu càng đủ thì pool càng sát khẩu vị.
3. **Thẻ món (flashcard):** hiện nhóm món, miền, bữa, nhiệt độ, các vị và giá; trường nào trống thì không hiện.

## Trường bắt buộc cho mỗi món

| Trường | Kiểu / giá trị cho phép | Bộ lọc | Ghi chú |
|---|---|---|---|
| `dishId` | UUID ổn định | — | Không đổi giữa các bản dữ liệu |
| `name` | 1–256 ký tự | — | Tên hiển thị |
| `mealSlots` | mảng con của `breakfast`, `lunch`, `dinner`, `snack` | Bữa ăn | Bắt buộc có ít nhất 1 |
| `categoryIds` | mảng UUID nhóm món (bảng dưới) | Loại món | Ít nhất 1 nhóm; được thuộc cả nhóm bữa chính và nhóm Ăn vặt |
| `origin` | `north`, `central`, `south`, `west`, `unknown` | Ẩm thực | `west` = miền Tây Nam Bộ |
| `flavor.spicy` / `sour` / `sweet` | `{ present: true/false/null, intensity: none/low/medium/high/unknown }` | Cay; Chua / Chua cay; Ngọt | `null` nghĩa là chưa biết |
| `flavor.salty` | như trên | Mặn / Đậm đà (`medium`, `high`); Thanh đạm (`low`) | |
| Béo / Ngậy | thêm UUID `86089932-3503-5934-a401-60374d76a61d` vào `categoryIds` | Béo / Ngậy | Hợp đồng `flavor` chưa có trường này |
| `temperature` | `hot`, `warm`, `cold`, `ambient`, `unknown` | Thẻ món | |
| Giá | quan sát giá có `amount`, `currency`, `unit`, `sourceRef`, `observedAt` | Thẻ món | Hiện giá mới nhất; thiếu thì ẩn |
| `artwork` | URL + `usageRights` + `license` + `attribution` | Thẻ món | Chỉ ảnh có quyền dùng |
| `sourceRef` cho từng trường phân loại | UUID nguồn | — | Không có nguồn thì để `unknown`/`null` |

## Nhóm món và UUID

Nhóm có sẵn family trong taxonomy thì gắn family; nhóm chưa có family dùng UUID cố định dưới đây (backend đã nhận).

| Nhóm | UUID gắn vào `categoryIds` | Family hiện có |
|---|---|---|
| Cơm | `e69b5f45-580d-5ee3-9e43-360650b4c650` | `family:rice` |
| Bún / Phở | `14bc9d6f-…` (bún), `1f89baf1-…` (phở) | `family:bun`, `family:pho` |
| Mì / Miến / Hủ tiếu | `ac9e12a4-…` (mì), `a7033166-…` (miến), `1af6a10b-…` (hủ tiếu), `5cc8224c-…` (nui) | có |
| Lẩu & Nướng | `abd817da-4bee-58c2-936d-8f60aa7a5e80` | chưa có |
| Bánh mì / Xôi | `811f6aa0-…` (bánh mì), `87e3727e-…` (xôi) | có |
| Cháo / Súp | `28fdc48b-f3cb-5ea3-a33b-17a32a3277b7` | chưa có |
| Đồ chiên & Xiên que | `0164ed89-738b-572f-b499-1b2da5320a64` | chưa có |
| Các loại bánh mặn | `542c7681-…` (bánh bao), `5dcf86dc-…` (bánh cuốn), `6bcd10c4-…` (bánh ướt), `e78e10c2-…` (bánh cuộn) | có |
| Món trộn & Cuốn | `bab170d6-…` (salad) | có một phần |
| Ốc & Hải sản | `f77a6791-45e4-51cd-8792-452aa197ca2f` | chưa có |
| Bánh ngọt | `d2316212-3436-5178-8f44-5990a4ffda8f` | chưa có |
| Chè & Kem | `97c011b2-3d0b-5d4c-92fb-7d05eb6a6538` | chưa có |
| Trái cây & Đồ chua | `841b5fe8-df62-5f93-bf75-34a79de55195` | chưa có |
| Đồ ăn vặt khô | `b933e553-651e-5daa-bf13-489d7743a850` | chưa có |

UUID đầy đủ của family có trong `supabase/seed/catalogue/dishes.json`; UUID nhóm mới nằm trong
`mobile/src/features/context/services/dishSetupCatalogue.ts` (`PLACEHOLDER_IDS`). Khi nhóm data đưa nhóm mới vào
taxonomy, giữ đúng các UUID này để app và backend không phải đổi.

## Số lượng tối thiểu

- Mỗi bữa (sáng, trưa, tối, ăn vặt) cần **ít nhất 20 món** để host chọn được tối đa 20; dưới 10 thì phòng chỉ tạo được
  qua nút "Dùng N món", dưới 5 thì không tạo được.
- Mỗi nhóm món nên có **ít nhất 3 món** để ưu tiên theo nhóm có tác dụng.
- Hiện tại: bữa tối 7 món, **ăn vặt 1 món** (không tạo được phòng Ăn vặt), 9 nhóm chưa có món nào; miền và vị gần như
  trống. Chi tiết trong báo cáo độ phủ.

## Quy tắc

- Không bịa: mỗi giá trị phân loại cần nguồn (menu, bài viết, khảo sát); không có nguồn thì để `unknown`/`null`.
- Không suy ra an toàn dị ứng từ tên món.
- Ảnh chỉ dùng khi có quyền; còn lại để `null`.

## Quy trình cập nhật

1. Nhóm data điền `data-preparation/templates/dish_filter_enrichment.csv` (cột `fill…` + `sourceRef`), thêm món mới
   nếu cần.
2. Đưa vào pipeline GM-40 để ra bundle mới (ví dụ dataset 1.2.0), chạy
   `python3 data-preparation/scripts/dish_catalogue.py --check`.
3. Import lên DB QA bằng `scripts/gm40_catalogue_check.py` (không đụng DB ứng dụng), rồi chạy lại
   `python scripts/dish_filter_coverage.py` để cập nhật báo cáo.
4. Projection hiện tại của importer cơ bản chỉ đưa `mealSlots`, `cuisineIds`, `categoryIds`, `name`, `description`,
   `artwork` vào thẻ; cần bật projection giàu (GM18.2) hoặc mở rộng importer để `origin`, `flavor`, `temperature`,
   giá vào thẻ thì backend mới dùng được cho ưu tiên.
