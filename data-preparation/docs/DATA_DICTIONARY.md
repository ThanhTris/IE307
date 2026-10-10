# Data dictionary — draft 1.0.0

Hợp đồng máy: [data_contract_v1.json](../config/data_contract_v1.json). Giá trị taxonomy: [taxonomy](TAXONOMY.md). Đầu vào theo [FOOD_DATA_SPEC](../../docs/specs/FOOD_DATA_SPEC.md); GM-28 chưa Approved. Đây là hợp đồng draft để review, không SQL/schema đã triển khai.

## Định danh và biểu diễn

UUIDv5: namespace UUIDv5(NAMESPACE_URL, `anyfood:food-v1:<entity>`), rồi UUIDv5(namespace, immutable registryKey). Giữ registry key trong cấu hình/registry, không lấy tên hiển thị để sinh lại ID. Registry món gốc dùng entity `dishes`; ID khảo sát nằm sourceDishIds. Bản ghi đổi nội dung tăng version nguyên dương; datasetVersion/contractVersion SemVer, checksum SHA-256 là nội dung artifact.

Các mã cuisine/category trong sourceProfiles của snapshot là mã tra cứu, không phải UUID. Registry taxonomy_registry_v1.json ánh xạ type/code → canonical UUID; adapter dùng registry này để dựng cuisineIds/categoryIds. Không coi registry label là nội dung đã review.

Bundle JSON có contractVersion, datasetVersion, fixtureOnly, entities. Tất cả entity arrays bắt buộc, cho phép []. CSV mỗi entity một file, header camelCase cùng JSON; bundle.json chỉ chứa metadata. Tên camelCase venueDishes/weeklySchedules/dateExceptions/availabilityOverrides/coverageAreas/publicAnchors/dataSources/datasetVersions tương ứng tên snake_case trong spec. Không rename contract app hiện có.

Mọi key trong bảng phải có. Nullable: JSON null, CSV ô trống. Array/object lưu JSON trong một ô CSV; [] là danh sách hiện chưa có dữ liệu, kết hợp classificationStatus/evidence để phân biệt chưa biết. Chuỗi rỗng không là mô tả hợp lệ; dùng null nếu nullable. Boolean true/false, số không kèm dấu phân cách/đơn vị. unknown chỉ dùng trong enum cho phép. Không dùng 0/false thay thiếu dữ liệu. CSV UTF-8 BOM, newline LF ở forms; snapshot nguồn giữ nguyên byte/CRLF.

Các cột sourceRef/checkedAt/validUntil/reviewedBy có thể null ở draft. verified/published cần nguồn, ngày kiểm, hạn còn hiệu lực và reviewer khác enteredBy. Fixture tuyệt đối không publish. Validator kiểm dữ liệu, không cấp quyền publisher hoặc chứng minh human approval. Giữ trạng thái unknown/quyền ảnh unknown khi thiếu bằng chứng; không tự thêm TTL 7/30 ngày đang chờ GM-28.

Nguồn theo nhóm trong fieldSources: name/description/taxonomy/image/menu/price/coordinates/address/hours/availability/coverage → UUID dataSources. Thiếu nguồn thì bỏ key đó, không ghi null. Artwork gồm url/sourceRef/usageRights/license/attribution; URL không cấp quyền ảnh. Flavor có đủ spicy/salty/sweet/sour, mỗi vị {present: true|false|null, intensity: none|low|medium|high|unknown}. profileOverrides chỉ chứa các trường taxonomy đã định nghĩa của riêng offering.

weeklySchedules.id là ID hàng ca; scheduleId là ID nhóm lịch dùng qua nhiều ca/ngày. Mọi hàng cùng nhóm phải cùng owner/timezone/reviewStatus. FK offering/date exception trỏ nhóm scheduleId. ownerType venue→venues.id, offering→venueDishes.offeringId. Có lịch quán và lịch món riêng, không dùng giờ menu giao hàng làm bằng chứng dine_in.

Khoảng giờ [start,end), dayOfWeek ISO 1–7, HH:mm địa phương. endDayOffset=1 cho qua đêm. 24h phải is24Hours=true và khoảng đúng 1440 phút. Closed/unknown: times null, offset null, is24Hours=false. Date exception closed chặn cả ca hôm trước kéo sang ngày đóng; interval [] không có nghĩa luôn mở. Quan hệ này là yêu cầu GM-30, validator chỉ kiểm hình dạng và tính nhất quán dữ liệu. Override hết expiresAt trở về unknown, không xác nhận còn món.

Giá không âm, min<=max, có giá phải có currency/unit; VND giữ giá nguồn, menu_item_unspecified không đổi sang giá/người. Không lấy giá rẻ của offering A và đặc tính của offering B thành card giả.

Đơn vị tọa độ WGS84 độ thập phân; GeoJSON dùng [lng,lat]. UTC timestamp ISO 8601 kết thúc Z. Timezone mặc định ở ví dụ Asia/Ho_Chi_Minh, mỗi quán phải có timezone được xác minh. Origin không lọc địa lý; coverage/anchor là công cộng, không chứa GPS người dùng.

## taxonomy

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| type | enum | Không | cuisine,origin,category | Loại taxonomy; temperature/flavor/meal là enum trong codebook |
| code | string | Không | Theo quy định trên | Mã trong taxonomy_v1.json; category có family:/preparation: |
| label | string | Không | Theo quy định trên | Tên hiển thị |
| description | string | Có | Theo quy định trên | Giải thích ngắn, không suy nguồn gốc từ nơi bán |
| status | enum | Không | draft,verified,published | Trạng thái taxonomy |
| origin | enum | Có | north,central,south,unknown,not_applicable | Nguồn gốc Việt, không phải nơi bán |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## dishes

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| name | string | Không | Theo quy định trên | Tên món gốc |
| description | string | Có | Theo quy định trên | Mô tả có nguồn |
| aliases | stringArray | Không | Theo quy định trên | Tên tương đương; không tự đưa topping vào alias |
| cuisineIds | uuidArray | Không | FK taxonomy.id | Cuisine đa nhãn; [] + classificationStatus unknown khi chưa biết |
| categoryIds | uuidArray | Không | FK taxonomy.id | Họ món và cách chế biến đa nhãn |
| mealSlots | stringArray | Không | breakfast,lunch,dinner,snack | Buổi ăn; [] khi chưa xác minh |
| timeHints | stringArray | Không | late_night | Thông tin bổ sung, không thay lịch |
| classificationStatus | enum | Không | unknown,needs_review,reviewed | Trạng thái xác minh thuộc tính |
| origin | enum | Có | north,central,south,unknown,not_applicable | Nguồn gốc, tách nơi bán |
| ingredientTags | stringArray | Có | Theo quy định trên | Thành phần có nguồn, không bảo đảm dị ứng |
| temperature | enum | Có | hot,warm,cold,ambient,unknown | Nhiệt độ phục vụ |
| flavor | flavor | Có | Theo quy định trên | 4 vị: present true/false/null + intensity |
| artwork | artwork | Có | Theo quy định trên | Ảnh: url/sourceRef/usageRights/license/attribution |
| sourceDishIds | stringArray | Không | Theo quy định trên | ID khảo sát làm cầu nối, không thay canonical UUID |
| status | enum | Không | draft,verified,published | Trạng thái món |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## venues

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| branchName | string | Không | Theo quy định trên | Một chi nhánh một ID |
| address | string | Có | Theo quy định trên | Địa chỉ công khai |
| adminAreaId | string | Có | Theo quy định trên | Mã hành chính từ nguồn; không tự sinh bằng tên |
| lat | number | Có | ; min=-90; max=90 | Latitude quán, độ thập phân |
| lng | number | Có | ; min=-180; max=180 | Longitude quán, độ thập phân |
| timezone | timezone | Không | Theo quy định trên | IANA timezone |
| status | enum | Không | active,closed,unknown | Trạng thái chi nhánh |
| serviceModes | stringArray | Không | dine_in,takeaway,delivery | Dine-in cần bằng chứng; menu giao hàng không đủ |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## venueDishes

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| offeringId | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| venueId | uuid | Không | FK venues.id | Chi nhánh bán |
| dishId | uuid | Không | FK dishes.id | Món gốc |
| variant | string | Có | Theo quy định trên | Tên biến thể/khẩu phần nguồn; null nếu chưa rõ |
| menuName | string | Không | Theo quy định trên | Tên nguyên trạng trên menu |
| menuSource | uuid | Có | FK dataSources.sourceRef | Nguồn menu |
| scheduleId | uuid | Có | FK weeklySchedules.scheduleId | Lịch món, không dùng thay lịch quán |
| serviceMode | enum | Có | dine_in,takeaway,delivery | Kiểu phục vụ được xác minh |
| priceMin | number | Có | ; min=0 | Giá thấp nhất theo cùng đơn vị |
| priceMax | number | Có | ; min=0 | Giá cao nhất theo cùng đơn vị |
| unit | enum | Có | portion,item,person,group,kg,menu_item_unspecified | Đơn vị giá nguồn, không tự quy giá/người |
| currency | enum | Có | VND,USD,THB,KRW,JPY,CNY,EUR,other | Mã tiền tệ, VND nguồn khảo sát |
| servingSize | string | Có | Theo quy định trên | Khẩu phần theo nguồn |
| profileOverrides | profile | Có | Theo quy định trên | Đặc tính có nguồn của riêng offering |
| artwork | artwork | Có | Theo quy định trên | Ảnh của offering, quyền riêng |
| status | enum | Không | draft,verified,published | Trạng thái offering |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## weeklySchedules

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| scheduleId | uuid | Không | Theo quy định trên | ID nhóm lịch; nhiều hàng ca/ngày dùng cùng scheduleId |
| ownerType | enum | Không | venue,offering | Chủ lịch |
| ownerId | uuid | Không | Theo quy định trên | ID chủ lịch tương ứng ownerType |
| dayOfWeek | integer | Không | ; min=1; max=7 | ISO weekday 1=Thứ Hai ..7=Chủ Nhật |
| startTime | time | Có | Theo quy định trên | Giờ địa phương HH:mm, gồm đầu |
| endTime | time | Có | Theo quy định trên | Giờ địa phương HH:mm, loại cuối |
| endDayOffset | integer | Có | ; min=0; max=1 | 0 cùng ngày, 1 qua đêm |
| is24Hours | boolean | Không | Theo quy định trên | 24h phải nguồn nói rõ; 00:00–23:59 không suy 24h |
| timezone | timezone | Không | Theo quy định trên | IANA timezone quán |
| status | enum | Không | open,closed,unknown | Closed khác chưa biết |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## dateExceptions

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| scheduleId | uuid | Không | FK weeklySchedules.scheduleId | Lịch chịu ngoại lệ |
| localDate | date | Không | Theo quy định trên | Ngày thực tế tại timezone quán |
| status | enum | Không | open,closed,unknown | Ngoại lệ thay lịch; đóng chặn phần ca đêm ngày trước |
| intervals | intervals | Không | Theo quy định trên | Các khoảng startTime/endTime/endDayOffset/is24Hours; [] khi closed/unknown |
| lastOrder | time | Có | Theo quy định trên | Giờ nhận món cuối theo nguồn |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## availabilityOverrides

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| offeringId | uuid | Không | FK venueDishes.offeringId | Offering |
| state | enum | Không | available,sold_out,paused,unknown | Tình trạng quan sát, hết hạn về unknown |
| source | uuid | Có | FK dataSources.sourceRef | Nguồn trạng thái |
| observedAt | utc | Không | Theo quy định trên | Thời gian quan sát UTC |
| expiresAt | utc | Không | Theo quy định trên | Hạn override UTC |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## coverageAreas

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| areaId | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| name | string | Không | Theo quy định trên | Tên vùng khảo sát |
| boundary | geojson | Có | Theo quy định trên | GeoJSON Polygon WGS84 [lng,lat]; null khi chưa xác minh |
| datasetVersion | semver | Không | Theo quy định trên | Phiên bản dataset chứa coverage |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## publicAnchors

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| anchorId | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| name | string | Không | Theo quy định trên | Tên điểm ăn công cộng |
| lat | number | Không | ; min=-90; max=90 | Latitude công cộng, không GPS người dùng |
| lng | number | Không | ; min=-180; max=180 | Longitude công cộng |
| coverageId | uuid | Không | FK coverageAreas.areaId | Vùng khảo sát |
| isPublic | boolean | Không | Theo quy định trên | Chỉ điểm công cộng, true |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## dataSources

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| sourceRef | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| locator | string | Không | Theo quy định trên | URL/file nguồn có thể truy vết |
| usageRights | enum | Không | unknown,granted,licensed,public_domain,denied | Quyền sử dụng dữ liệu, không suy từ công khai |
| license | string | Có | Theo quy định trên | License/thỏa thuận cụ thể |
| attribution | string | Có | Theo quy định trên | Ghi công nếu yêu cầu |
| status | enum | Không | draft,verified,published | Trạng thái nguồn |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## datasetVersions

| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |
|---|---|---|---|---|
| id | uuid | Không | Theo quy định trên | ID ổn định UUIDv5 từ registry key bất biến |
| datasetVersion | semver | Không | Theo quy định trên | SemVer phiên bản dữ liệu |
| contractVersion | semver | Không | Theo quy định trên | SemVer hợp đồng trường |
| status | enum | Không | draft,verified,published | Trạng thái dataset |
| checksum | sha256 | Có | Theo quy định trên | SHA-256 nội dung artifact; không thay version |
| artifactLocator | string | Có | Theo quy định trên | Vị trí artifact nguồn |
| previousVersionId | uuid | Có | FK datasetVersions.id | Phiên bản trước, null ở bản đầu |
| qualityReport | string | Có | Theo quy định trên | Đường dẫn report kiểm chất lượng |
| rollbackLocator | string | Có | Theo quy định trên | Artifact có thể khôi phục |
| version | integer | Không | ; min=1 | Phiên bản bản ghi, tăng khi nội dung đổi |
| reviewStatus | enum | Không | draft,verified,published | Trạng thái kiểm dữ liệu; khác trạng thái đang bán |
| sourceRef | uuid | Có | FK dataSources.sourceRef | Nguồn chính; bổ sung fieldSources cho từng nhóm thông tin |
| fieldSources | object | Không | Theo quy định trên | Map nhóm thông tin → sourceRef; không dùng để suy quyền ảnh |
| checkedAt | utc | Có | Theo quy định trên | Lần kiểm dữ liệu có bằng chứng, UTC |
| validUntil | utc | Có | Theo quy định trên | Hạn hiệu lực đã được chốt; draft thiếu để null |
| enteredBy | string | Không | Theo quy định trên | Người nhập hoặc mã agent có thể truy vết |
| reviewedBy | string | Có | Theo quy định trên | Reviewer độc lập; draft chưa review để null |

## Ví dụ và kiểm tra

[Hướng dẫn forms](../templates/README.md) chỉ vị trí CSV/JSON trống và bộ ví dụ fixture tương đương. Ví dụ từng trường có ngay ở templates/examples/dataset.json và CSV cùng entity.

GM-04 làm SQL constraints/import transaction; GM-27 xác minh quán/nguồn/giờ/quyền; GM-30 áp dụng lịch, coverage, giá và unknown để tạo pool. Bộ hợp đồng này không thực thi các task đó.
