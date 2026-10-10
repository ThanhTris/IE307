# GM-03 phần 4 — fixtures món/nơi bán/giờ ăn

**Toàn bộ dữ liệu là mô phỏng.** Không dùng tìm quán, seed ứng dụng, publish, chứng minh review/licensing thật hoặc tuyên bố an toàn dị ứng. `verified`, reviewer và quyền sử dụng trong bản ghi chỉ mô phỏng trạng thái cho thuật toán tương lai. `fixtureOnly=true`, nguồn `example.invalid`, artwork/ingredientTags=null. Tọa độ là ô lưới giả lập quanh (0,0), không là GPS người dùng hoặc coverage Thủ Đức.

Phần 3 đã commit **2e61a5712a07fe4834e92f907a278cb0740c7174** trên codex/gm-03-taxonomy-data-contract trước khi tạo bộ này. Phần 4 là dữ liệu đầu vào/expected cho GM-30, chưa thực thi eligibility/ranking/SQL/TypeScript. GM-03 vẫn chờ review GM-28 và reviewer độc lập.

## Quy mô và file

42 ca, 27 dataset tình huống, 13 nhóm và 36 assertions. Dataset cơ sở có 10 món, 2 quán giả lập, 10 offering, 24 hàng lịch quán/món (Thứ Sáu và Thứ Bảy), 8 taxonomy, 4 nguồn, 1 coverage, 1 public anchor và 1 datasetVersion: tổng 61 bản ghi. Các ngày khác không nằm trong các ca này, không suy là quán mở cả tuần.

| File | Nội dung |
| --- | --- |
| [base.json](base.json), [base-csv](base-csv/bundle.json) | Dataset cơ sở theo contract 1.0.0; 11 CSV entity tương đương JSON, UTF-8 BOM |
| [datasets.json](datasets.json) | Map datasetKey → bundle đầy đủ đã resolve, không cần merge/patch hay sửa tay |
| [cases.json](cases.json) | Đầu vào, nhóm/spec, thời điểm, offering được nhận/loại/cần xác nhận và điều kiện pool |
| [registry.json](registry.json) | ID/khóa bất biến dành riêng cho fixture; thay tên không đổi UUID |
| [quality.json](quality.json), [manifest.json](manifest.json) | Số liệu, checksum/bytes và SHA generator; không coi checksum là version hay approval |

10 món: Gà nướng, Cá nướng, Lẩu rau, Lẩu nấm, Suất lẩu và nướng đa nhãn, Cơm gà, Bún bò, Phở bò, Salad, Xôi. Tất cả có hậu tố mô phỏng. Suất đa nhãn là lựa chọn được định nghĩa riêng trong fixture, không được thêm vào catalogue thật. Đầu vào hơn 8 dùng kiểm giới hạn; pool kỳ vọng nhiều nhất 8. Nếu chỉ có 3 candidate thì dùng 3; không lấy món giả để bù.

DatasetVersion **1.0.0 chỉ dành cho fixtures**, độc lập catalogue thật 0.2.0. FixtureVersion `food-fixtures-v1` là hợp đồng ca kiểm thử; không thay API app. ID: stable_id(entity, `fixture:gm03:food-v1:` + registryKey). Không tái dùng UUID món thật; không sinh ID lại từ tên. Mỗi dataset tình huống là bản sao mô phỏng độc lập, không phải các bản publish nối tiếp; bản ghi thay đổi được tăng version.

## Đọc một ca

Các key bắt buộc: `id/group/description/specRefs/datasetKey/evaluatedAt/input/expected`. Suite có fixtureVersion/fixtureOnly/contractVersion/validationAt/part3Commit/cases/comparisons.

- `datasetKey`: tra trực tiếp datasets.json, mỗi bundle có đầy đủ 11 entity arrays.
- `input.context`: public anchor/coverage/radiusM/desiredAt/mealSlot/timeHint/serviceMode/budget/avoidRecent/contextVersion. Không truyền GPS người dùng.
- `preferencesByParticipant`: A/B giả lập chọn category; không phải phiếu WANT/OK/NO. `poolSeed` cố định. `timeSelection` ghi scheduled/now, requestedAt và bufferMinutes để kiểm nguồn thời gian.
- `expected.eligibleOfferingIds`: tập offering chính xác được dùng tạo candidate, **chưa phải pool tám món cuối cùng**.
- `excludedOfferings`: loại có lý do rõ. `needsConfirmationOfferings`: nguồn/giờ/buổi/context thiếu hoặc hết hiệu lực, không vào pool khả thi. Ba tập partition toàn bộ offering của dataset tương ứng.
- `expected.pool`: minSize/maxSize, uniqueBy `(dishId, variant)`, requiredCategoryCodes và includeAllEligibleCandidates. Alias không thêm candidate; cùng món/variant ở hai quán chỉ một candidate với nhiều offering refs; hai variant khác nhau có thể là hai candidate. Với đủ 10 candidate, kiểm pool có 8 và có đại diện các nhóm, không chỉ định tám món thắng. Đây là default fill-to-limit của fixture để kiểm thao tác cắt pool.
- `assertions/details`: điều kiện giữ giá/unknown, không ghép đặc tính, normalizedDesiredAt, aliasResolutions, trạng thái tồn món hay yêu cầu xác nhận lại. Reason là nhãn mô tả fixture, **không phải enum API GM-30**.

Fixture context dùng budget nullable hoặc khoảng `{min,max,currency:VND,unit:person}` để mô tả ý nghĩa kiểm thử. GM-30 có thể dùng adapter cho shape request thực tế; không tự coi format fixture này là public API. Không cộng điểm/xếp hạng trong bộ fixture. Mọi đặc tính card phải có một offering hợp lệ cùng đáp ứng; `profile-no-merge` cấm ghép nóng/giá 20.000/cay từ hai quán.

`comparisons.sameOrderedPool` yêu cầu kết quả thuật toán tương lai giống nhau cả tập và thứ tự khi snapshot/context/seed giống nhau, kể cả đảo thứ tự nguồn. Không có expected ordered pool cố định để áp đặt cách xếp hạng. Validator chỉ kiểm các input so sánh tương đương; GM-30 mới chạy thuật toán và đối chiếu output.

## Ma trận tình huống

| Nhóm | Số ca | Điều kiện chính |
| --- | ---: | --- |
| pool | 4 | 10→8, 8→8, 3→3, không offering→rỗng có lý do |
| preferences | 2 | A nướng/B lẩu, cả hai bỏ qua; ưu tiên mềm, không veto |
| identity | 4 | Đa nhãn, alias, variant, cùng món/variant tại hai quán |
| price | 4 | Thiếu giá, vượt budget, budget null, giá nhóm chưa biết số người |
| profile | 2 | Thuộc tính unknown, không ghép giá/nhiệt độ/vị khác offering |
| meal | 1 | Buổi chưa xác định cần xác nhận, không giả lunch |
| overnight | 5 | 21:59:59, 22:00, 00:30, 01:59:59, 02:00 theo giờ địa phương |
| schedule | 3 | Giao lịch quán/món, nghỉ giữa ca, ngày đóng chặn ca qua đêm |
| geography | 3 | Ngoài coverage, ngoài radius, origin Nam không lọc nơi bán |
| freshness | 5 | Trước/đúng/sau hạn nguồn; menu/lịch unknown |
| availability | 4 | sold_out/paused còn hạn; hết override→unknown; lịch không chứng minh live stock |
| context | 3 | Đặt giờ không cộng buffer, ăn ngay cộng một lần, desiredAt đã qua cần xác nhận/reset ready |
| determinism | 2 | Lặp input và đảo thứ tự nguồn; so sánh thêm với pool-ten |

## Thời gian và validation

Structural `validationAt=2026-10-08T00:00:00Z`, nguồn checkedAt 2026-10-07. Các ca dùng evaluatedAt/desiredAt ngày 2026-10-09/10; timezone Asia/Ho_Chi_Minh. Không dùng thời gian máy hiện tại. Validator contract nhận validationAt để các dữ liệu hết hạn tại ngày đánh giá vẫn là đầu vào snapshot hợp lệ. GM-30 phải kiểm freshness tại thời điểm đánh giá ca, không dùng validationAt làm giờ eligibility.

Baseline desiredAt/evaluatedAt là 2026-10-10T05:00:00Z (12:00 Thứ Bảy). Ca nguồn expires đúng 05:00:00Z: 04:59:59 còn hạn, 05:00:00 hết hạn. Dataset còn tới 2026-10-20 không che nguồn con hết hạn. Ca 22:00 Thứ Sáu đến 02:00 Thứ Bảy dùng `[start,end)` và endDayOffset=1; ngoại lệ đóng Thứ Bảy áp dụng cả phần kéo qua từ ca Thứ Sáu. Ca 24h có is24Hours=true và offset=1 rõ ràng.

Các ca scheduled/now dùng cửa sổ phục vụ ngắn 12:00–12:10 để phát hiện cộng buffer hai lần: cộng sai thêm 15 phút sẽ ra ngoài lịch. Các ca có lịch verified nhưng stock unknown chỉ được mô tả “dự kiến phục vụ theo lịch”. Override expired không trở thành available. Nguồn/giờ/meal unknown không tương đương stock unknown có lịch hợp lệ.

Expected được viết rõ trong [generator](../../../data-preparation/scripts/food_fixtures.py), không tính từ thuật toán lọc/ranking. Validator kiểm schema, ID/FK, dấu mô phỏng, partition expected, bounds, category references, giá nguồn, cross-case input và coverage assertions; **không chứng minh thuật toán GM-30 đúng**. [Spec food](../../../docs/specs/FOOD_DATA_SPEC.md) và [catalogue](../../../docs/specs/CATALOG_PREFERENCES_SPEC.md) là nguồn quy tắc.

## Chạy và mở rộng

Mở [notebook](../../../data-preparation/notebooks/prepare_food_fixtures.ipynb), chọn Python kernel có pandas hiện có, Run All: cấu hình → dataset → ma trận/input → expected → giờ/nguồn → kiểm → xuất/đọc lại. Path tự tìm repo, folder đầu ra tự tạo. Notebook executed được lưu riêng trong `data-preparation/datasets/food-fixtures/reports/` Git-ignored; source notebook không lưu output. Không package/API/SQL hoặc ảnh thật.

```bash
# Kiểm file đã có, không ghi lại
python3 data-preparation/scripts/food_fixtures.py --check
# Sinh lại sau khi đã rà thay đổi fixture/expected
python3 data-preparation/scripts/food_fixtures.py
# Runner cần Python đã có pandas
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_food_fixtures.ipynb --offline
python3 -m unittest discover -s tests -p 'test_food_fixtures.py'
```

CLI generator/validator chỉ dùng stdlib. Export trong repo chỉ được vào folder fixture này hoặc datasets/food-fixtures; từ chối ghi vào seed/snapshots thật. Khi thêm ca: chọn khóa bất biến, viết expected từ spec, khai báo assertion/details rõ, tăng fixture version nếu thay contract ca, kiểm diff và sinh lại manifest. Không gọi reference eligibility để sinh expected. Khi GM-30 có TypeScript/SQL, hai adapter đọc cùng JSON, kiểm offering sets/constraints và comparison; parity chưa chạy ở phần này. Chưa kiểm trực tiếp Jupyter kernel hoặc approval reviewer.
