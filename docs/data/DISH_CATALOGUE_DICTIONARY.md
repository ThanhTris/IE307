# GM-40 — Data dictionary catalogue món

Contract: **dish-catalogue-v1/roadmap-v2/GM-40.1**; profile/schema **1.0.0**;
dataset **1.1.0** trong namespace catalogue riêng. Trạng thái: draft, test/demo,
chưa review schema/API; [ADR-018](../architecture/decisions/ADR-018-dish-catalogue-profile.md).
Schema JSON này là hợp đồng dữ liệu offline, không phải migration database.

## Cách chạy và giới hạn

Từ root repository, Python 3 stdlib, không cài package và không dùng network.
Toàn bộ regression upstream cần Python >=3.11 (đã kiểm bằng 3.12.14):

```sh
python3 data-preparation/scripts/dish_catalogue.py --check
python3 data-preparation/scripts/dish_catalogue.py --input supabase/seed/catalogue/dishes.json
python3 -m unittest discover -s tests -p test_dish_catalogue.py -v
```

Sinh lại sau thay đổi đầu vào có chủ ý: `python3 data-preparation/scripts/dish_catalogue.py --write`.
Không sửa tay artifact rồi dùng --write để che khác biệt. --check so byte output và
hash input. Lệnh build không import/activate DB. Importer QA riêng tái sử dụng storage0026 và RPC đã merge; xem HANDOFF GM-40. Không đổi schema/API hoặc coi ADR-018 đã Approved.

## Hình thức và liên kết

Root bắt buộc đủ profile, contractVersion, datasetVersion, usageScope, fixtureOnly,
entities. profile=dish-catalogue-v1, contractVersion=1.0.0, usageScope=test_demo;
entities chỉ có dishes, taxonomy, dataSources, priceReferences, fieldEvidence.
Mọi array có thể rỗng để dùng template, nhưng catalogue hiện hành có 39 món.
Dữ liệu thật draft fixtureOnly=false; fixture mô phỏng fixtureOnly=true. Không dùng
flag này làm approval. Profile hiện tại chỉ nhận status/reviewStatus=draft và reviewedBy=null;
verified/published cần hợp đồng review riêng, không đổi cờ để vượt validator.

UUID của món giữ nguyên từ registry bất biến; đổi tên không đổi ID. sourceDishIds
là ID khảo sát opaque, không phải aliases hoặc UUID món mới. Alias chỉ tên tương
đương; source menu item và biến thể vẫn có ID/metadata provenance riêng. Validator
so NFC, casefold, khoảng trắng, **giữ dấu** và từ chối collision để review rõ ràng;
không fuzzy matching hoặc tự gộp. cuisineIds/categoryIds FK tới taxonomy đúng type.
sourceRef và mọi fieldSources FK tới dataSources. Mỗi fieldEvidence unique(dishId,field),
priceReference ID unique; taxonomy unique(type,code).

Không giữ venues/venueDishes/schedules/coverage/anchors trong bundle mới. Nguồn menu
URL không chứng minh món đang bán, quán gần người dùng hoặc nơi bán đã xác minh.
FOOD_DATA_SPEC và importer food-v1 legacy giữ nguyên. Xem [giới hạn room adapter](../architecture/decisions/ADR-018-dish-catalogue-profile.md).

## Required, null và unknown

Mọi key trong các bảng bên dưới là **required về cấu trúc**; nullable có nghĩa key
phải hiện diện nhưng value có thể null. Không có default ngầm. Null là chưa có
thông tin; enum unknown là chưa xác định theo vocabulary; not_applicable chỉ khi
có bằng chứng không áp dụng. Array [] là chưa có nhãn có evidence, không có nghĩa
món không thuộc cuisine/buổi nào hoặc phù hợp mọi buổi. preparationMethods=null
là chưa có evidence chung cho món gốc; không lấy cách nấu một offering gán toàn nhóm.

Giữ các enum cuisine/category từ registry upstream; không đoán từ tên. Origin là
north/central/south/unknown/not_applicable, không phải địa điểm bán. Temperature:
hot/warm/cold/ambient/unknown. Flavor gồm spicy/salty/sweet/sour với present
boolean|null và intensity none/low/medium/high/unknown; không suy an toàn dị ứng.
MealSlots: breakfast/lunch/dinner/snack; timeHints có late_night, không đổi thành snack.
Known/nonempty mô tả, alias, taxonomy, buổi/đặc tính phải có fieldEvidence; provenance
chỉ ghi lý do/nguồn, không tự xác minh độ chính xác. Giữ evidence draft cũ nguyên nghĩa.

## Giá, ảnh, nguồn và thời gian

priceReferences là **quan sát độc lập**, không phải giá chuẩn của món gốc. value là
số tiền theo currency và unit; null không phải 0. unit: portion/item/person/group/kg/
menu_item_unspecified; servingSize null nếu không rõ. Không tự quy thành person,
không tính average hay min/max chung. priceRaw giữ nguyên text nguồn; checkedAt
ISO 8601 UTC Z (normalize từ offset); validUntil null nếu không có bằng chứng hạn.
Mỗi quan sát pin snapshotSha256 và sourceMenuItemId; ID UUIDv5 từ dishId+menuItemId+
snapshotSha256, không từ display name hoặc thời gian chạy. Nguồn URL qua sourceRef.
Không trộn dữ liệu giữa các nguồn dù cùng món. Thiếu value cho phép currency/unit=null.

Art khác null phải có URL, sourceRef hợp lệ, usageRights sử dụng được, license,
attribution trên cả ảnh và dataSource. Schema artwork kế thừa shape legacy;
validator bổ sung guard quyền. Đợt này toàn bộ artwork=null; không suy license từ URL,
không tải ảnh hoặc publish assets. Không gọi quan sát menu là ảnh được cấp quyền.

checkedAt là ngày nguồn cũ, không phải ngày chạy GM-40. validUntil=null không phải
còn hạn vô thời hạn. Offline validation kiểm cấu trúc/ngày hợp lệ và thứ tự thời gian;
không dùng clock, không xác nhận freshness/availability hiện tại. enteredBy giữ tác giả
lịch sử, reviewedBy=null; không bịa reviewer. Source usageRights unknown được giữ để
nghiên cứu test/demo, không là quyền tái phân phối hoặc approval production.

## Version và manifest

Dataset1.1.0: 30 món có meal evidence mới tăng version2→3; 9 món giữ version2.
Các giá trị khác giữ nguyên; preparationMethods=null không tạo nội dung suy luận mới. Nếu biên tập giá trị món, tăng record version, giữ UUID và pin
release mới; dataset version SemVer tách record version/schema version/hash.
Manifest chứa hash raw bytes UTF-8 LF của bundle và schema, counts từng entity,
inputSha256 và reconciliation 39/18/216/2/1. Hash không chứa chính manifest và không
là xác nhận review. Hai lần build offline phải cho cùng byte/checksum. Snapshot và
legacy verified manifest không đổi. Build không activation; importer chỉ cho owned QA, không production publish.

## Các trường

Bảng field kế thừa shape món/taxonomy/nguồn food 1.1.0 và bổ sung preparationMethods,
priceReferences, fieldEvidence. Bảng dưới được ghi từ schema hiện tại; schema và
semantic validator cùng là hợp đồng, không chỉ kiểm JSON type.

### dishes

| Field | Kiểu / giá trị | Required | Nullable | Ý nghĩa / nguồn / đơn vị |
| --- | --- | --- | --- | --- |
| `id` | string | Có | Không | ID ổn định UUIDv5 từ registry key bất biến |
| `name` | string | Có | Không | Tên món gốc |
| `description` | string / null | Có | Có | Mô tả có nguồn |
| `aliases` | array<string> | Có | Không | Tên tương đương; không tự đưa topping vào alias |
| `cuisineIds` | array<string> | Có | Không | Cuisine đa nhãn; [] + classificationStatus unknown khi chưa biết |
| `categoryIds` | array<string> | Có | Không | Họ món và cách chế biến đa nhãn |
| `mealSlots` | array<breakfast, lunch, dinner, snack> | Có | Không | Buổi ăn; [] khi chưa xác minh |
| `timeHints` | array<late_night> | Có | Không | Thông tin bổ sung, không thay lịch |
| `classificationStatus` | unknown, needs_review, reviewed | Có | Không | Trạng thái xác minh thuộc tính |
| `origin` | north, central, south, unknown, not_applicable / null | Có | Có | Nguồn gốc, tách nơi bán |
| `ingredientTags` | array<string> / null | Có | Có | Thành phần có nguồn, không bảo đảm dị ứng |
| `temperature` | hot, warm, cold, ambient, unknown / null | Có | Có | Nhiệt độ phục vụ |
| `flavor` | object / null | Có | Có | 4 vị: present true/false/null + intensity |
| `artwork` | object / null | Có | Có | Ảnh: url/sourceRef/usageRights/license/attribution |
| `sourceDishIds` | array<string> | Có | Không | ID khảo sát để truy vết; không coi tên biến thể là alias. |
| `status` | draft, verified, published | Có | Không | Trạng thái món |
| `version` | integer | Có | Không | Integer >=1; record revision, không phải dataset version. |
| `reviewStatus` | draft, verified, published | Có | Không | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| `sourceRef` | string / null | Có | Có | FK dataSources.sourceRef; không nullable trừ nested artwork theo shape legacy. |
| `fieldSources` | object | Có | Không | Map nhóm thông tin → sourceRef; không có nguồn không tự điền. |
| `checkedAt` | string / null | Có | Có | UTC Z, ngày kiểm nguồn; nullable theo shape entity, không thay ngày hiện tại. |
| `validUntil` | string / null | Có | Có | UTC Z hoặc null; không tự đặt hạn. |
| `enteredBy` | string | Có | Không | Tác giả nguồn, không phải reviewer. |
| `reviewedBy` | string / null | Có | Có | Hiện phải null; chưa review. |
| `preparationMethods` | array<grilled, fried, stir_fried, steamed, boiled, braised, stewed, roasted, mixed, sous_vide, pan_seared, other> / null | Có | Có | Controlled preparation code; nullable. Không suy từ tên. |

### taxonomy

| Field | Kiểu / giá trị | Required | Nullable | Ý nghĩa / nguồn / đơn vị |
| --- | --- | --- | --- | --- |
| `id` | string | Có | Không | ID ổn định UUIDv5 từ registry key bất biến |
| `type` | cuisine, origin, category | Có | Không | Loại taxonomy; temperature/flavor/meal là enum trong codebook |
| `code` | string | Có | Không | Mã trong taxonomy_v1.json; category có family:/preparation: |
| `label` | string | Có | Không | Tên hiển thị |
| `description` | string / null | Có | Có | Giải thích ngắn, không suy nguồn gốc từ nơi bán |
| `status` | draft, verified, published | Có | Không | Trạng thái taxonomy |
| `origin` | north, central, south, unknown, not_applicable / null | Có | Có | Nguồn gốc Việt, không phải nơi bán |
| `version` | integer | Có | Không | Integer >=1; record revision, không phải dataset version. |
| `reviewStatus` | draft, verified, published | Có | Không | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| `sourceRef` | string / null | Có | Có | FK dataSources.sourceRef; không nullable trừ nested artwork theo shape legacy. |
| `fieldSources` | object | Có | Không | Map nhóm thông tin → sourceRef; không có nguồn không tự điền. |
| `checkedAt` | string / null | Có | Có | UTC Z, ngày kiểm nguồn; nullable theo shape entity, không thay ngày hiện tại. |
| `validUntil` | string / null | Có | Có | UTC Z hoặc null; không tự đặt hạn. |
| `enteredBy` | string | Có | Không | Tác giả nguồn, không phải reviewer. |
| `reviewedBy` | string / null | Có | Có | Hiện phải null; chưa review. |

### dataSources

| Field | Kiểu / giá trị | Required | Nullable | Ý nghĩa / nguồn / đơn vị |
| --- | --- | --- | --- | --- |
| `sourceRef` | string | Có | Không | FK dataSources.sourceRef; không nullable trừ nested artwork theo shape legacy. |
| `locator` | string | Có | Không | URL/file nguồn có thể truy vết |
| `usageRights` | unknown, granted, licensed, public_domain, denied | Có | Không | Quyền sử dụng dữ liệu, không suy từ công khai |
| `license` | string / null | Có | Có | License/thỏa thuận cụ thể |
| `attribution` | string / null | Có | Có | Ghi công nếu yêu cầu |
| `status` | draft, verified, published | Có | Không | Trạng thái nguồn |
| `version` | integer | Có | Không | Integer >=1; record revision, không phải dataset version. |
| `reviewStatus` | draft, verified, published | Có | Không | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| `fieldSources` | object | Có | Không | Map nhóm thông tin → sourceRef; không có nguồn không tự điền. |
| `checkedAt` | string / null | Có | Có | UTC Z, ngày kiểm nguồn; nullable theo shape entity, không thay ngày hiện tại. |
| `validUntil` | string / null | Có | Có | UTC Z hoặc null; không tự đặt hạn. |
| `enteredBy` | string | Có | Không | Tác giả nguồn, không phải reviewer. |
| `reviewedBy` | string / null | Có | Có | Hiện phải null; chưa review. |

### priceReferences

| Field | Kiểu / giá trị | Required | Nullable | Ý nghĩa / nguồn / đơn vị |
| --- | --- | --- | --- | --- |
| `id` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `dishId` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `sourceMenuItemId` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `menuName` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `priceRaw` | string | Có | Không | Giữ text nguồn nguyên trạng. |
| `value` | number / null | Có | Có | Số tiền theo currency/unit; >=0 hoặc null, không mặc định 0. |
| `currency` | VND, USD, THB, KRW, JPY, CNY, EUR, other / null | Có | Có | Xem quy tắc entity và liên kết bên trên. |
| `unit` | portion, item, person, group, kg, menu_item_unspecified / null | Có | Có | Xem quy tắc entity và liên kết bên trên. |
| `servingSize` | string / null | Có | Có | Xem quy tắc entity và liên kết bên trên. |
| `sourceRef` | string | Có | Không | FK dataSources.sourceRef; không nullable trừ nested artwork theo shape legacy. |
| `checkedAt` | string | Có | Không | UTC Z, ngày kiểm nguồn; nullable theo shape entity, không thay ngày hiện tại. |
| `validUntil` | string / null | Có | Có | UTC Z hoặc null; không tự đặt hạn. |
| `snapshotSha256` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `status` | "snapshot_observation" | Có | Không | Xem quy tắc entity và liên kết bên trên. |

### fieldEvidence

| Field | Kiểu / giá trị | Required | Nullable | Ý nghĩa / nguồn / đơn vị |
| --- | --- | --- | --- | --- |
| `dishId` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `field` | name, description, aliases, cuisineIds, categoryIds, mealSlots, timeHints, origin, temperature, flavor, ingredientTags, preparationMethods | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `sourceRef` | string | Có | Không | FK dataSources.sourceRef; không nullable trừ nested artwork theo shape legacy. |
| `basis` | string | Có | Không | Giữ cơ sở evidence cũ (owner_grouping/reference...), chưa nâng thành verified. |
| `note` | string | Có | Không | Xem quy tắc entity và liên kết bên trên. |
| `sourceMenuItemIds` | array<string> | Có | Không | ID menu opaque làm evidence, không là offering/quán runtime. |

Nested flavor: bốn vị, mỗi vị bắt buộc present và intensity; present=false đòi none,
present=true không dùng none, present=null đòi unknown. IngredientTags là nullable
array thông tin nguồn có bằng chứng, không là cam kết allergy. Nested artwork đủ
url/sourceRef/usageRights/license/attribution, theo guard nêu trên. fieldSources là
map source UUID, không giữ dữ liệu vị trí cá nhân. preparationMethods codes kế thừa
categoryGroups.preparation trong taxonomy_v1.json; không thêm vocabulary mới.

## Đầu vào và báo cáo

[Bundle](../../supabase/seed/catalogue/dishes.json), [manifest](../../supabase/seed/catalogue/manifest.json),
[quality report](../../supabase/seed/catalogue/QUALITY_REPORT.md),
[schema](../../supabase/seed/templates/dish-catalogue-v1.schema.json),
[template trống](../../supabase/seed/templates/dish-catalogue-v1.template.json) và
[fixture mô phỏng](../../tests/fixtures/dish-catalogue-v1/README.md).
Giữ mapping 219 dòng trong snapshot nguồn; manifest pin checksum mapping và quality
report ghi trạng thái 216/2/1. Hai needs_review và một excluded không được biến thành
món/alias chỉ để tăng số lượng. Importer QA dùng storage/runtime hiện có; không tạo RPC mới.

## Bổ sung kiểm admission sau review PR #129 — 2026-10-22

Vocabulary lấy từ taxonomy_v1.json: cuisine.code thuộc cuisines; origin.code thuộc
origins; category.code bắt buộc namespace family: hoặc preparation: cùng mã trong
categoryGroups tương ứng. Code đúng nhưng sai type/namespace vẫn bị từ chối tại
entities.taxonomy[i].code (TAXONOMY_CODE), dù dish FK trỏ tới đúng UUID. Không sửa
registry, suy code từ tên hoặc nhận mã mở rộng âm thầm.

Price observation unique cả ID và natural key (dishId, sourceMenuItemId, snapshotSha256).
ID bắt buộc bằng UUIDv5 với namespace UUID.NAMESPACE_URL và key UTF-8 chính xác:
`anyfood:gm40:price:{dishId}:{sourceMenuItemId}:{snapshotSha256}`.
UUID khác không hợp thức hóa quan sát trùng, kể cả thay amount. Khác snapshot hoặc
khác menu item vẫn là quan sát riêng khi ID theo đúng công thức. --input và build
cùng áp dụng các guard này; không đổi version/schema hoặc các ID hợp lệ đã xuất.

## Supplement bữa ăn 1.0.0 / dataset1.1.0

Đầu vào `data-preparation/config/meal_slot_evidence_v1.json` chứa 5 nguồn web/PDF,
URL/ngày kiểm/checksum snapshot và 44 quan sát tường minh cho 30 UUID. Builder
không tra cứu mạng, không suy nhãn từ tên hoặc giờ quán. fieldEvidence của mealSlots
trỏ supplement, note chứa sourceRef/locator/observation và evidence legacy được giữ.
Các nhóm fieldSources cũ giữ nguyên; không coi ngày kiểm mealSlots là kiểm lại giá.

Nguồn gồm Vietnam Airlines breakfast guide, menu trưa SIS Đà Nẵng tháng10/2017,
menu CVK Q7 tháng01/2026, Saigon Block lunch và Oppa Eatery lunch/dinner. PDF được
đối chiếu vị trí hàng/cột trên ảnh render. Đây là bằng chứng xuất hiện dưới nhãn bữa
cụ thể, có menu trường học và nguồn quốc tế; chưa chứng minh mọi biến thể phù hợp,
dinh dưỡng người lớn, địa điểm Thủ Đức hoặc món đang bán. Bữa ăn vẫn là nhãn draft.

Sáng14/trưa23/tối7/snack1; overlap, 9 món chưa có nhãn. Chỉ trưa đủ phép thử20 món
không kèm bộ lọc khác. Shortfall chi tiết trong quality report; không điền unknown
thành mọi bữa. 33 nguồn, 151 fieldEvidence, 247 giá cũ, artwork toàn null; các nguồn
mới rights unknown, không tự cấp license. Snapshot/registry/meal labels legacy không sửa.
