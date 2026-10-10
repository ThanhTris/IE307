# Food data dictionary — GM-03

Contract dự thảo `food-v1.gm03-draft.1`, ngày 2026-10-08, branch `sanbox`. [Task GM-03](../../tasks/backlog/GM-03.md), [kế hoạch](../evidence/roadmap-v1/GM-03/IMPLEMENTATION_PLAN.md). Food-v1/assignment/contract vẫn chờ review độc lập; không thay quyền duyệt dataset hoặc chọn backend. Nguồn yêu cầu: [FOOD_DATA_SPEC](../specs/FOOD_DATA_SPEC.md), [catalogue](../specs/CATALOG_PREFERENCES_SPEC.md), [data model](../architecture/DATA_MODEL.md), [API](../architecture/API_CONTRACT.md).

## Đọc và dùng ở đâu

| Thành phần | File | Trách nhiệm |
| --- | --- | --- |
| Kiểu dữ liệu FE/domain | [types.ts](../../mobile/src/domain/catalogue/types.ts) | DTO thuần, không SDK/UI/network |
| Key/version cố định | [taxonomy.ts](../../mobile/src/domain/catalogue/taxonomy.ts) | Nhiệt độ, vị, intensity, buổi và version |
| Kiểm hợp đồng | [validateDataset.ts](../../mobile/src/domain/catalogue/validateDataset.ts) | Shape, trường/dòng, refs/unique/freshness/metadata; không import/publish |
| JSON mẫu để nhập liệu | [food-v1.template.json](../../supabase/seed/templates/food-v1.template.json) | Envelope rỗng, draft; thay metadata trước dùng |
| Ví dụ bản ghi | [gm03-dataset.json](../../tests/fixtures/food-v1/gm03-dataset.json) | Chỉ dữ liệu mô phỏng, không phải seed quán thật |
| Case context/pool | [gm03-cases.json](../../tests/fixtures/food-v1/gm03-cases.json) | Expected do người soạn đặt cho review/GM-11 |

JSON dùng camelCase. SQL/table/FK/indices và import transaction thuộc GM-05; mapping trường SQL cần chốt khi review. Vị trí template trong `supabase/seed` theo task hiện hành; JSON và domain không phụ thuộc Supabase, không có RPC/database được gọi. GM-08 nhập nguồn thật; GM-11 tính eligibility/ranking; GM-12 khóa snapshot. Không sao chép validator client để thay kiểm quyền server.

## ID, version và giá trị chưa biết

- ID là ASCII in thường: chữ/số, dấu `-` hoặc `.` giữa các đoạn; không đổi ID theo tên hiển thị. Ví dụ `dish-rice`, `venue-a`, `off-rice-a`. ID duy nhất trong từng entity collection; không dùng số thứ tự dòng làm ID.
- `contractVersion` xác định cấu trúc; `datasetVersion` xác định lần phát hành dữ liệu; `dish.version` và `taxon.version` xác định revision bản ghi. Không đổi nghĩa ID hoặc key cũ tại chỗ; thay contract/mapping phải review và version mới.
- Cuisine và origin chưa biết dùng mảng rỗng; categoryIds và mealSlots phải có ít nhất một nhãn đã biên tập. Không mặc định breakfast cho mọi món. Trường bắt buộc không được bỏ; nullable phải ghi `null`, không chuỗi rỗng/0 giả.
- `ingredientTags: null` = chưa xác minh thành phần; `[]` chỉ dùng khi có bằng chứng cho danh sách rỗng. Không có cờ `allergenSafe`, không suy an toàn dị ứng từ tên/ảnh.
- Tên/alias Unicode NFKC, trim, gom whitespace, lowercase để phát hiện trùng; giữ dấu tiếng Việt. Tên/alias không trùng trong hoặc giữa các món. Variant không phải món canonical mới chỉ vì khác chi nhánh; tên gần nhau vẫn cần người biên tập kiểm.

## Taxonomy

Taxon có `id/version/type/key/label/description/status/sourceRef`. `status=active|deprecated`; món mới không tham chiếu deprecated. Key duy nhất theo type. `sourceRef` phải tham chiếu nguồn có `appliesTo=editorial`.

| Type/trường | Key và nghĩa | Phân biệt cần giữ |
| --- | --- | --- |
| cuisine | ID biên tập như `cuisine-vn` (Việt); có thể mở rộng Thái/Hàn sau review | Phong cách ẩm thực, không là nơi đang có quán bán |
| origin | ID biên tập như `origin-south` (Nam Bộ), đa nhãn hoặc chưa biết | Nguồn gốc món, không dùng để lọc địa lý |
| category | `category-rice`, `category-hotpot`, `category-grill` trong mẫu; đa nhãn | Sở thích mềm; người chọn lẩu và người chọn nướng không tạo veto giao rỗng |
| temperature | `hot`, `warm`, `cold`, `ambient`, `unknown` | Nhiệt độ khi phục vụ; hot không có nghĩa cay |
| flavor | Các chiều `spicy`, `salty`, `sweet`, `sour` | Mỗi chiều có intensity riêng; biết cay không suy được các vị còn lại |
| intensity | `none`, `low`, `medium`, `high`, `unknown` | none có bằng chứng không có vị đó; unknown chưa biết |
| meal_slot | `breakfast`, `lunch`, `dinner`, `snack` | `late_night` chỉ là timeHint; không là mealSlot thứ năm |

`flavor=null` = chưa có profile; profile có đủ bốn chiều, chiều thiếu bằng chứng dùng unknown. `temperature=null` = chưa có annotation; unknown là nhãn đã ghi nhận chưa biết. Không tự suy profile từ tên hoặc từ origin. Taxonomy trong fixture chỉ là một tập mẫu; chưa là danh mục 60–80 món đã review.

## Dictionary các entity

Mọi `checkedAt/validUntil/observedAt/expiresAt` là UTC ISO `YYYY-MM-DDTHH:mm:ss[.SSS]Z`; datetime không timezone hoặc ngày không có thật bị từ chối. `validUntil > checkedAt`; tại publish, checkedAt không tương lai và validUntil phải còn hạn. `reviewedBy` phải khác `enteredBy` khi đã verified/published. Metadata không chứng minh review ngoài đời đã xảy ra.

| Entity | Trường | Null, đơn vị và liên kết |
| --- | --- | --- |
| Dataset envelope | contractVersion, datasetVersion, kind, status, enteredBy, reviewedBy, checkedAt, validUntil và các arrays | kind fixture/survey; status draft/verified/published. Arrays rỗng chỉ dùng để khởi tạo draft |
| Dish | id/version/name/aliases/description/cuisineIds/originIds/categoryIds/mealSlots/ingredientTags/temperature/flavor/artwork | Cuisine/origin/category trỏ taxon đúng type; artwork null khi chưa có ảnh có quyền dùng |
| Artwork | uri/sourceRef/license | URI HTTPS hoặc `asset://`; source phải loại artwork và quyền dùng rõ. Metadata chưa là bằng chứng file thật/license thật |
| Venue | id/branchName/address/adminAreaId/lat/lng/timezone/status/serviceModes/sourceRef/checkedAt/validUntil | Một chi nhánh một ID. lat [-90,90], lng [-180,180], không GPS user; active/closed/unknown; core dine_in |
| Offering | id/venueId/dishId/variantId/variant/menuSource/scheduleId/serviceMode/status/price/temperature/flavor/checkedAt/validUntil | Unique branch+dish+variant+serviceMode. menuSource trỏ nguồn menu; schedule phải thuộc chính offering. Profile override nằm trên cùng offering |
| Price | min/max/unit/currency/servingSize/sourceRef | Cả object null nếu chưa biết; min/max không âm, min<=max. VND; unit person/portion/group; servingSize số người dương hoặc null. Không chia giá nhóm/phần thành giá/người khi chưa có bằng chứng |
| Schedule | id/ownerType/ownerId/timezone/weekly/sourceRef/checkedAt/validUntil | Owner venue/offering phải có thật; một weekly schedule/owner. Timezone IANA phải khớp chi nhánh; nguồn hours |
| Weekly day | dayOfWeek/status/intervals | ISO Monday=1..Sunday=7, ghi đủ bảy ngày một lần. unknown/closed có intervals rỗng; open có >=1 ca |
| Interval | startTime/endTime/endDayOffset/is24Hours | HH:mm 00:00–23:59; offset 0/1. Ca phải tiến <=24h; qua đêm ví dụ 22:00–02:00 offset=1. Ca 24h dùng 00:00–00:00 offset=1 và flag=true |
| Date exception | id/scheduleId/localDate/status/intervals/lastOrder/sourceRef/checkedAt/validUntil | YYYY-MM-DD ở timezone schedule. Một exception/date/schedule, thay lịch thường. lastOrder HH:mm hoặc null, chỉ khi open; ca đêm diễn giải theo ngày/interval ở GM-11 |
| Availability override | id/offeringId/state/sourceRef/observedAt/expiresAt | available/sold_out/paused/unknown; nguồn menu. expiresAt>observedAt; hết hạn trở về unknown, không thành available |
| Coverage | id/name/boundary/datasetVersion/sourceRef/checkedAt/validUntil | Một polygon ring `[lng,lat]`, >=3 điểm khác nhau và đóng kín; nguồn location. Dataset version khớp envelope. Đây là vùng khảo sát, không là mọi quán trong vùng |
| Public anchor | id/name/lat/lng/coverageId | Điểm công cộng thuộc coverage đã công bố; không lưu GPS người dùng |
| Source | id/locator/usageRights/appliesTo/enteredBy/reviewedBy/status/checkedAt/validUntil | locator chỉ nơi truy lại bằng chứng; áp dụng editorial/menu/price/hours/location/artwork. Không token/link riêng tư. Mỗi nhóm thông tin cần nguồn đúng loại |

Price object gộp `priceMin/priceMax/unit/currency/servingSize/sourceRef` trong spec để không có giá thiếu đơn vị/nguồn; offering.variantId là key ổn định, variant là tên hiển thị. `weekly_schedules` trong spec được nhóm thành Schedule.weekly; nguồn/freshness chung chỉ khi bằng chứng bao phủ toàn bộ tuần. Nếu các ca có nguồn khác nhau cần revision contract trước khi nhập, không tự gộp mất nguồn.

Validator kiểm shape, refs, uniqueness, closed ring, giờ/ca trong một ngày và metadata. Nó chưa kiểm polygon tự cắt/diện tích/anchor nằm trong vùng, khoảng cách Haversine, ca hôm trước giao ngày sau, effective lastOrder/override theo desiredAt, nguồn thật hoặc tính hợp pháp của license. GIS/SQL constraints/import ở GM-05; eligibility/time/giá card đồng thời ở GM-11; quality review/publish ở GM-08. UTC parser không thay server time authority.

## Fixture/pool và snapshot

`FoodPoolFixture` ghi context anchor/coverage/radiusM/desiredAt/mealSlot/serviceMode/timeHint/budget nullable, contextVersion/datasetVersion/poolSeed, preferenceCategoryIds theo các member mô phỏng và expectedPool. Radius tính mét, >0; mức trần/range thời gian sản phẩm vẫn chờ review, không tự chọn ở đây.

Một card gồm dishId/variantId/offeringIds; pool <=8 card, không lặp dishId, refs phải khớp dish+variant. Nếu một dish có nhiều variant, chọn một để tránh card trùng; cần nhiều card/variant phải sửa contract cùng constraints phòng ở GM-05/GM-12. expectedPool rỗng được giữ rỗng. Không có thuật toán sinh pool hoặc xếp thứ hạng trong GM-03.

Case seed-replay lưu cùng input/version/seed và expected snapshot. Đây là ví dụ yêu cầu deterministic, chưa chứng minh thuật toán. GM-11 cần chạy selector thật trên các ca này và bổ sung SQL parity. Snapshot phòng sau start và update catalogue không đổi phiên thuộc GM-12, không được coi đã test từ JSON.

Các expectedReason là nhãn giải thích fixture, chưa là error enum RPC public. Mẫu synthetic có nguồn fixture:// và rights fixture-only, giá/tọa độ/giờ hoàn toàn tổng hợp. Không dùng để gợi ý đi ăn, không publish. Không có ảnh bên ngoài trong patch này; `artwork=null` là fallback bằng tên.

## Nhập → review → publish

1. Copy template; đổi ID/version/editor và ngày thật, nhập nguồn có quyền dùng. Tham khảo fixture để biết field shape, không copy giá/địa chỉ/giờ tổng hợp làm data khảo sát.
2. Chạy `validateFoodDataset(value)` cho shape/ref; đọc errors theo JSON path, ví dụ `$.offerings[0].price`. Validator không sửa dữ liệu hoặc ghi database.
3. Người khác kiểm từng nguồn, menu/lịch/giá/ảnh/tọa độ, xác nhận usage rights; điền reviewedBy và trạng thái verified. Ảnh thiếu quyền để null, giá chưa biết để null.
4. Trusted importer/server ở task sau gọi `validateFoodDataset(value, {purpose:'publish', now: serverTime})` trước transaction; fixture, thiếu review, source/child stale hoặc tập rỗng bị chặn. Đây chỉ là preflight contract; còn phải kiểm auth publisher, bằng chứng thật, SQL constraints và import nguyên tử.
5. Publish version/quality report/rollback, revalidate nguồn con theo hạn riêng. Hạn dataset không kéo dài nguồn/offering/schedule đã hết hạn. Không thay snapshot phiên đã start.

Menu/giờ 7 ngày và tọa độ 30 ngày trong spec vẫn là đề xuất chờ review, không hardcode thành policy ở validator. [Hướng dẫn test](../evidence/roadmap-v1/GM-03/USER_TEST.md), [báo cáo](../evidence/roadmap-v1/GM-03/REPORT.md).
