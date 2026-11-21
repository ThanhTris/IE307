# Yêu cầu dữ liệu cho bộ lọc khẩu vị

Áp dụng ADR-024 và ADR-025 cho catalogue chọn pool. Báo cáo dưới đây đọc bundle GM-41 1.2.0. Độ phủ:
[DISH_FILTER_COVERAGE.md](DISH_FILTER_COVERAGE.md) (sinh bởi `python scripts/dish_filter_coverage.py`). Mẫu điền:
[`data-preparation/templates/dish_filter_enrichment.csv`](../../data-preparation/templates/dish_filter_enrichment.csv).

## Nguyên tắc: một món có NHIỀU giá trị

Món được ăn linh hoạt, nên **mọi trường lọc đều đa nhãn**. Ghi đủ mọi giá trị thật của món, mỗi giá trị có nguồn;
backend tính khớp nếu món có **bất kỳ** giá trị nào người chơi chọn.

| Mục lọc | Trường | Ví dụ một món |
|---|---|---|
| Bữa ăn | `mealSlots` (mảng) | cơm: `breakfast lunch dinner` |
| Loại món | `categoryIds` (mảng ID family) | bún chả: `bun` + `grill` |
| Miền | `cuisineIds` (mảng ID miền, mã `vi_north` `vi_central` `vi_south` `vi_west`) | hủ tiếu: `vi_south` + `vi_west` |
| Vị | `flavor` (mỗi vị một khóa: `spicy` `sour` `sweet` `salty` `fatty`) | cay **và** béo cùng lúc |

- **Một món thiếu `mealSlots` không bao giờ vào pool** của bữa nào. Gắn thiếu bữa thì món bị bỏ sót ở bữa còn lại.
- Món thiếu nhóm, miền hoặc vị không bị trừ điểm, chỉ không được cộng.
- `origin` (một giá trị) chỉ còn để tương thích dữ liệu cũ; **không điền mới** mà dùng `cuisineIds` miền.

## Mã và ID (một nguồn duy nhất)

[`data-preparation/config/filter_taxonomy_v2.json`](../../data-preparation/config/filter_taxonomy_v2.json) là bảng đầy đủ,
sinh bởi `python data-preparation/scripts/filter_taxonomy.py --write`. ID sinh bằng đúng `stable_id` của pipeline
(`taxonomy` + `category:family:<mã>` hoặc `cuisine:<mã>`), nên khớp với bundle hiện có. File taxonomy gốc
`taxonomy_v1.json` **giữ nguyên** vì manifest GM-40 ghim hash của nó.

**Family mới** (cần thêm vào taxonomy của bộ dữ liệu mới): `grill` `soup` `skewer` `fried_snack` `savory_cake`
`snail_seafood` `sweet_cake` `che` `ice_cream` `fruit_pickle` `dry_snack`. **Miền mới** (cuisine): `vi_north`
`vi_central` `vi_south` `vi_west`.

**Nhóm trên màn hình = tập family** (món thuộc nhóm nếu có bất kỳ family nào của nhóm):

| Nhóm | Family |
|---|---|
| Cơm | rice |
| Bún / Phở | bun, pho |
| Mì / Miến / Hủ tiếu | noodles, mien, hu_tieu, nui, banh_canh |
| Lẩu & Nướng | hotpot, grill |
| Bánh mì / Xôi | banh_mi, sticky_rice |
| Cháo / Súp | porridge, soup |
| Đồ chiên & Xiên que | fried_snack, fried_chicken, skewer |
| Các loại bánh mặn | banh_bao, banh_cuon, banh_uot, banh_cuon_wrap, savory_cake |
| Món trộn & Cuốn | salad, rolls |
| Ốc & Hải sản | snail_seafood |
| Bánh ngọt | sweet_cake |
| Chè & Kem | che, ice_cream |
| Trái cây & Đồ chua | fruit_pickle |
| Đồ ăn vặt khô | dry_snack |

Một món được thuộc **nhiều nhóm** (ví dụ cơm cháo) và cả nhóm bữa chính lẫn nhóm Ăn vặt.

## Trường cần cho mỗi món

| Trường | Giá trị cho phép | Bộ lọc |
|---|---|---|
| `mealSlots` | mảng con của `breakfast`, `lunch`, `dinner`, `snack`, ít nhất 1 | chọn pool theo bữa |
| `categoryIds` | ID family (bảng trên), ít nhất 1 | Loại món |
| `cuisineIds` | ID miền, 0 hoặc nhiều | Ẩm thực |
| `flavor.spicy/sour/sweet/salty/fatty` | `{ present: true/false/null, intensity: none/low/medium/high/unknown }`; `fatty` tùy chọn | Cay · Chua / Chua cay · Ngọt · Mặn / Đậm đà (`salty` mức `medium` hoặc `high`) · Thanh đạm (`salty` mức `low`) · Béo / Ngậy |
| `temperature` | `hot` `warm` `cold` `ambient` `unknown` | thẻ món |
| Giá | quan sát `amount`, `currency`, `unit`, `sourceRef`, `observedAt` | thẻ món |
| `artwork` | URL + `usageRights` + `license` + `attribution`; không có quyền thì `null` | thẻ món |

Mỗi giá trị phân loại cần nguồn (`sourceRef`: menu, bài viết, khảo sát). Không có nguồn thì để `unknown`/`null`; không
suy ra an toàn dị ứng từ tên món.

## Số lượng tối thiểu

- Mỗi bữa **≥ 20 món** (host chọn tối đa 20); dưới 10 chỉ tạo được qua "Dùng N món", dưới 5 thì không tạo được.
- Mỗi nhóm món **≥ 3 món**; mỗi miền có món tiêu biểu.
- Bản GM-40 1.1.0 có 39 món test/demo, trong đó tối 7 món và ăn vặt 1 món. Xem báo cáo độ phủ để đối chiếu bản GM-41.

## Bộ món Ăn vặt (bữa `snack`)

Ăn vặt là một bữa riêng trên màn tạo phòng, có 8 nhóm riêng (bảng nhóm ở trên: Đồ chiên & Xiên que, Các loại bánh mặn,
Món trộn & Cuốn, Ốc & Hải sản, Bánh ngọt, Chè & Kem, Trái cây & Đồ chua, Đồ ăn vặt khô). Backend đã nhận `snack` ở mọi
bước (tạo phòng, chọn pool, xếp hạng theo khẩu vị); thứ còn thiếu là **dữ liệu**.

- Catalogue GM-40 1.1.0 có **1 món** có `snack` (sáng 14, trưa 23, tối 7). Bundle GM-41 mở rộng độ phủ cả bốn bữa.
- Cần **ít nhất 24 món Ăn vặt**: mỗi nhóm trong 8 nhóm Ăn vặt **≥ 3 món**, và tổng ≥ 20 để host chọn được 20 món.
- Món ăn vặt cũng là món bình thường: đủ `categoryIds`, `cuisineIds`, `flavor`, giá, nguồn (`sourceRef`) như bữa chính.
- Một món ăn được cả bữa chính lẫn ăn vặt (bánh mì, xôi, cháo, bánh cuốn…) thì gắn **cả hai** `mealSlots` (ví dụ `breakfast snack`). Gắn thiếu thì món không vào pool của bữa còn lại.
- Nhóm Ăn vặt là tập family như nhóm bữa chính; món có thể thuộc nhiều family (ví dụ `fried_snack` + `skewer`). Không tạo nhóm hay mã ngoài bảng ở trên.
- Không bịa món, nhãn hay giá để cho đủ số lượng: món chưa có nguồn thì chưa đưa vào.

## Quy trình

[Xem cách phát sinh bundle GM-41 và chạy QA](../evidence/roadmap-v2/GM-41/HANDOFF.md). Các bước dưới đây mô tả quy trình biên tập và đầu vào GM-40.

1. Điền mẫu CSV (cột `fill…`, nhiều giá trị cách nhau bằng dấu cách):
   `fillFamilies` (`rice porridge`), `fillMealSlots` (`breakfast lunch dinner`), `fillRegions` (`vi_south vi_west`),
   `fillFlavors` (`spicy=high fatty=medium sour=present`), kèm `sourceRef`.
2. Kiểm: `python data-preparation/scripts/filter_taxonomy.py --validate <file.csv>` (mã sai, thiếu nguồn).
3. Ra bundle mới (ví dụ dataset 1.2.0) qua pipeline GM-40. **Schema `dish-catalogue-v1` hiện chỉ có 4 vị và taxonomy
   code của v1**: bộ dữ liệu mới cần mở rộng schema/codebook cho `flavor.fatty`, các family và miền mới (như
   `filter_taxonomy_v2.json`). Bundle 1.1.0 không đổi.
4. Dùng projection giàu (GM18.2) hoặc mở rộng importer để thẻ món có `cuisineIds`, `flavor`, `temperature`, giá;
   importer cơ bản chỉ đưa `mealSlots`, `cuisineIds`, `categoryIds`, `name`, `description`, `artwork`.
5. Import lên DB QA bằng `scripts/gm40_catalogue_check.py` (không đụng DB ứng dụng); chạy lại
   `python scripts/dish_filter_coverage.py` để cập nhật báo cáo.
