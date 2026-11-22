# GM-41 — Bàn giao catalogue release v1

Dùng [bundle 1.3.0](../../../../supabase/seed/catalogue/release-v1/dishes.json) với [manifest và SHA-256](../../../../supabase/seed/catalogue/release-v1/manifest.json). Schema dữ liệu `1.1.0` giữ nguyên. Bundle giữ phạm vi `test_demo`, gồm 253 món. Tiêu chí hiện hành ở [đặc tả release v1](../../../data/RELEASE_V1_CATALOGUE_SPEC.md). Các ghi chú bản 1.2.0 phía dưới giữ làm lịch sử.

## Đầu vào cho Tâm

- [Danh sách UUID, tên món và từng đợt](../../../../data-preparation/editorial/release-v1/handoff.json). CSV từng đợt nằm cùng thư mục, có `sourceRef`, ngày kiểm và ghi chú cho từng giá trị. UUID mới dùng `stable_id('dish', 'gm41:' + registryKey)`.
- 39 mô tả đã có được lấy từ overlay 1.2.1 của GM-47. Còn 214 món thiếu mô tả và 253 món thiếu ảnh có license. Kiểm quyền của nguồn mô tả, lưu URL nguồn ảnh, license, tác giả và ghi công theo GM-47. Gộp bằng UUID; đừng đổi khoá khi sửa tên hiển thị.
- Trong nhóm giá quan sát, chỉ ghi dòng có giá cụ thể, cỡ/phần nếu được nêu và các điều kiện phí/thuế có nguồn. Giá lưu từ menu lịch sử cần được xác nhận lại nếu UI muốn hiển thị như giá hiện tại.
- Bản thử đã vượt các ngưỡng phần dữ liệu của GM-41. Trí vẫn cần kiểm chất lượng nguồn và gán nhãn. GM-51 chạy lại checker trên bundle đã gộp và bàn giao staging cùng GM-52 sau khi GM-41/47 được nghiệm thu.

## Tái lập bản 1.3.0

```sh
for batch in data-preparation/editorial/release-v1/batch-*.csv; do
  python data-preparation/scripts/filter_taxonomy.py --validate "$batch" || exit
done
python data-preparation/scripts/dish_catalogue.py --check
python data-preparation/scripts/dish_catalogue.py --gm41 --check
python data-preparation/scripts/dish_catalogue.py --release-v1 --write
python data-preparation/scripts/dish_catalogue.py --release-v1 --check
python scripts/dish_filter_coverage.py
python scripts/dish_filter_coverage.py --check
python scripts/release_catalogue_check.py --bundle supabase/seed/catalogue/release-v1/dishes.json
```

Checker ở dòng cuối trả exit 1 khi còn thiếu mô tả hoặc ảnh. Hai lỗi đó vẫn chặn phát hành. Xem [kết quả kiểm và độ phủ](CHECKS.md).

```sh
npm run qa:start -- --run-id gm41-v1-review --api-port 55271 --db-port 55272
python scripts/gm41_catalogue_check.py --release-v1 --qa-manifest .work/qa/gm41-v1-review/manifest.json --report .work/gm41-v1-review-results.json
npm run qa:stop -- --run-id gm41-v1-review
```

Dùng [runbook GM-03](../GM-03/RUNBOOK_QA.md) để kiểm quyền sở hữu và loopback. QA này kiểm bốn phòng 20 món, import và readback. Sau khi có bundle production và staging, chạy lại smoke trên đúng môi trường theo GM-51/GM-52.

## Lịch sử bản 1.2.0

[Issue #170](https://github.com/ThanhTris/IE307/issues/170), Vinh thực hiện và Trí review. Catalogue `1.2.0` dùng schema `1.1.0`, profile `dish-catalogue-v1`, phạm vi `test_demo`. Giữ nguyên 39 UUID, mapping menu, tên và 247 giá quan sát của GM-40 1.1.0. Thêm 33 món có nguồn. UUID món mới sinh từ `stable_id('dish', 'gm41:' + registryKey)`. Khi đổi tên hiển thị, giữ nguyên registryKey.

- [CSV biên tập đã điền](../../../../data-preparation/editorial/gm41/dish_filter_enrichment.csv) có một dòng cho mỗi quan sát. Một món có thể có nhiều nguồn. Các cột `fill…` nhận mã cách nhau bằng dấu cách. `sourceRef` là URL nguồn, `note` tóm tắt bằng chứng cho những mã trên cùng dòng. Nhãn bữa lấy từ ngữ cảnh bữa được mô tả, khung phục vụ của menu, hoặc cách dùng biên tập theo suất độc lập có ghi trong note. Đây là nhãn cho chọn pool, không phải lịch bán.
- [Codebook bộ lọc](../../../../data-preparation/config/filter_taxonomy_v2.json) cung cấp ID cho 11 family và 4 miền bổ sung. `origin` chỉ giữ dữ liệu cũ. Schema mới thêm `flavor.fatty` tùy chọn cạnh bốn vị chuẩn. `present` trong CSV thành `{present:true,intensity:"unknown"}`, ô trống giữ thông tin cũ hoặc để chưa biết. Xem [schema](../../../../supabase/seed/templates/dish-catalogue-gm41.schema.json).
- [Bundle và manifest](../../../../supabase/seed/catalogue/gm41/) chứa nguồn, field evidence, giá và SHA-256. Giá là quan sát từng dòng menu, giữ đơn vị và quy cách đã biết, không quy sang giá/người. Món mới chưa có ảnh đủ quyền để `artwork=null`. Không suy thành phần dị ứng.
- [Báo cáo độ phủ](COVERAGE_1_2.md) đếm nhóm ăn vặt trong đúng bữa ăn vặt. Burger giữ family `burger` theo GM-40. Family này hiện không nằm trong 14 nhóm hiển thị của app.

### Tái lập bản 1.2.0

Dùng Python 3.12 và Node theo repo. Lệnh tạo bundle và báo cáo chạy offline.

```sh
python data-preparation/scripts/filter_taxonomy.py --check
python data-preparation/scripts/filter_taxonomy.py --validate data-preparation/editorial/gm41/dish_filter_enrichment.csv
python data-preparation/scripts/dish_catalogue.py --check
python data-preparation/scripts/dish_catalogue.py --gm41 --write
python data-preparation/scripts/dish_catalogue.py --gm41 --check
python scripts/dish_filter_coverage.py --gm41
python scripts/dish_filter_coverage.py --gm41 --check
```

QA dùng [runbook GM-03](../GM-03/RUNBOOK_QA.md). Mỗi lượt dùng run-id và cổng riêng. GM-41 dùng cùng bộ xác thực manifest/ownership và importer nguyên tử của `gm40_catalogue_check.py`, với projection GM18.2 và bundle mới. Dùng DB disposable mới vì các phòng HTTP trong lượt chạy giữ bản catalogue đã pin. Cuối bài kiểm runner khôi phục release ban đầu, sau đó `qa:stop` dọn cả namespace.

```sh
npm run qa:start -- --run-id gm41-review --api-port 55171 --db-port 55172
python scripts/gm41_catalogue_check.py --qa-manifest .work/qa/gm41-review/manifest.json --report .work/gm41-review-results.json
npm run qa:stop -- --run-id gm41-review
```

### Ghi chú staging của bản 1.2.0

Tâm dùng UUID của bundle 1.2.0 để gộp mô tả và ảnh đã xét quyền trong [GM-47](https://github.com/ThanhTris/IE307/issues/176). GM-51 sở hữu xác minh và phát hành bản catalogue cho hosted. GM-52 sở hữu staging và kiểm ledger, RPC, auth/cờ runtime theo main. Sau khi staging nạp bản catalogue phát hành, cần ghi lại hash release và tạo phòng 10 món qua `dish_session/create` contract B-supplement cho `breakfast`, `lunch`, `dinner` và `snack`. Với JWT QA, kiểm ACK 200, snapshot ghim đúng release/hash và đúng 10 ID khác nhau có bữa tương ứng. Không dùng `acceptShortage` cho smoke này. Xem [yêu cầu staging](https://github.com/ThanhTris/IE307/issues/170#issuecomment-7018370523), [GM-51](https://github.com/ThanhTris/IE307/issues/187) và [GM-52](https://github.com/ThanhTris/IE307/issues/188).
