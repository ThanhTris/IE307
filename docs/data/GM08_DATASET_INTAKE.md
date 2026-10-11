# GM-08 — Nhận dữ liệu khảo sát để nhập và review

Cập nhật2026-10-11: [bundle thật trên DB test](../evidence/roadmap-v2/GM-08/real-db/README.md)
Pass44cases,21quán/18món/190offering; query/counts/typed fields/null/reimport/rollback
đã kiểm. Nạp draft vào DB test không cần chờ verified publish; giữ input/unknowns.
Verified manifest vẫn0, không phải dataset đã publish cho app. Các mục dưới giữ
lịch sử theo revision; xem real-db/ cho kiểm storage hiện hành.


Theo [review PR #103 ngày 2026-10-11](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6104616256).
Owner GM-08 HoaiTam/Tâm chủ động thu thập/chuẩn bị/nhập khảo sát; có thể nhận
handoff của Vinh nếu có. ThanhTris/Trí hoặc người khác người nhập kiểm độc lập. GM-08 vẫn In Progress, chưa có dataset verified/published.

## Dùng đúng contract

Danh sách dưới đây giúp chuẩn bị handoff, không thay toàn bộ field contract.
Lấy key/type/enum/nullable/FK từ [dictionary GM-04](FOOD_DATA_DICTIONARY.md),
[schema food1.1.0](../../supabase/seed/templates/food-v1.schema.json) và
[template](../../supabase/seed/templates/food-v1.template.json).
Template có `fixtureOnly=true` và dữ liệu mô phỏng, không phải nguồn khảo sát.
Các CSV legacy ở data-preparation dùng contract1.0.0; importer nhận JSON1.1.0.
[Draft adapter](../../scripts/gm08_prepare_draft.py) chuyển bản sao catalogue,
giữ snapshot/ID gốc; không tự xác minh hoặc nhập các quan sát giá thành offering.

## Bundle cần bàn giao

| Nhóm | Nội dung và liên kết cần kiểm | Bằng chứng cần nhận |
| --- | --- | --- |
| dishes | id/name, cuisineIds/categoryIds/mealSlots/timeHints, classificationStatus, temperature/flavor | Phân loại món được kiểm lại; thiếu vị/cay giữ unknown/null đúng schema |
| venues | Chi nhánh cụ thể: id/branchName/address/adminAreaId/lat/lng/timezone/serviceModes/scheduleId | Địa chỉ, tọa độ, giờ quán và hình thức phục vụ của đúng chi nhánh |
| venueDishes | offeringId → venueId + dishId; menuName/menuSource/scheduleId/serviceMode, priceMin/Max/unit/currency | Menu/giá/đơn vị/giờ bán của đúng món tại đúng quán; không trộn giá hoặc giờ giữa các quán |
| weeklySchedules | scheduleId/ownerType/ownerId/timezone; dayOfWeek/status/startTime/endTime/endDayOffset/is24Hours/lastOrder/lastOrderDayOffset | Hai nhóm lịch riêng cho venue và offering, cùng timezone, có giao giờ bán; trước publish ghi đủ 7 ngày |
| coverageAreas/publicAnchors | areaId/name/boundary/datasetVersion; anchorId/name/lat/lng/coverageId/isPublic | Polygon vùng khảo sát thật (GeoJSON [lng,lat]) và điểm ăn công cộng trong vùng; không dùng xuất xứ món hoặc GPS cá nhân |
| dataSources và metadata | locator/usageRights/license/attribution, sourceRef/fieldSources; checkedAt/validUntil/enteredBy/reviewedBy/reviewStatus/version | Nguồn thật, căn cứ được phép dùng, ngày kiểm và chính sách hạn dùng, người kiểm độc lập |
| taxonomy/datasetVersions | IDs và FK từ registry hiện hành; version của bundle phù hợp datasetVersion | Registry, thay đổi/version và báo cáo chất lượng; tooling tính checksum/manifest từ bytes thật |
| dateExceptions/availabilityOverrides | Chỉ thêm ngoại lệ ngày cụ thể hoặc quan sát còn/hết món thực tế | Ngày nghỉ/giờ khác thường, thời điểm quan sát và hạn override; có thể để arrays rỗng nếu không có quan sát |

Dữ liệu Tâm thu thập hoặc nhận từ Vinh cần bundle/bảng khảo sát và evidence, nguồn/ngày
khảo sát, căn cứ quyền sử dụng và chính sách freshness, ID registry/coverage.
Không suy license từ URL; `license` có thể ghi căn cứ/biên bản cho phép sử dụng,
không bắt buộc là giấy phép thương mại. Ảnh chưa có quyền dùng giữ null.
Không gán validUntil tùy ý hoặc ghi tên reviewer để mở gate.

## Required key, null và unknown

Key required vẫn phải xuất hiện. Giá trị chỉ được null khi schema cho phép;
JSON dùng `null`, không dùng chuỗi `"null"` hoặc chuỗi rỗng thay mọi kiểu.
CSV legacy để ô trống qua đúng adapter, không đưa trực tiếp vào importer1.1.0.
`unknown` chỉ dùng ở enum cho phép; không tự thêm field vào contract.

| Trường hợp | Nhập thế nào | Giới hạn khi publish/dùng đề xuất |
| --- | --- | --- |
| Mô tả/ảnh món, variant/servingSize/profileOverrides chưa có | null nếu nullable; temperature/flavor theo schema | Unknown cay không có nghĩa không cay |
| Chưa biết giá | Nhóm giá chưa biết giữ null | Không ghi 0 để biểu diễn thiếu giá; giá có số cần unit/currency và nguồn; không chia giá nhóm thành giá/người |
| Chưa biết last order | lastOrder và lastOrderDayOffset cùng null | Không đoán bằng giờ đóng cửa; nếu biết thì cả hai cùng có giá trị trong khoảng mở cửa |
| Chưa biết tọa độ/giờ/nguồn/quyền/ngày kiểm/hạn/reviewer | Giữ draft/unknown/null trong giới hạn schema | Nullable ở draft không đủ điều kiện verified/publish hoặc chọn vào pool |
| Chưa biết ngày quán mở | status unknown; startTime/endTime/endDayOffset null, is24Hours false | Publish không nhận unknown; closed chỉ khi xác minh quán nghỉ ngày đó |
| Mở 22:00–02:00 hôm sau | startTime 22:00, endTime 02:00, endDayOffset 1 | Cùng ngày dùng offset0; không thêm overnight/availableFrom/availableTo; lịch không khẳng định tồn kho hiện tại |

Mỗi row publish cần `reviewStatus=verified/published`, checkedAt thật không tương lai,
validUntil còn hạn và sau ngày kiểm, reviewedBy khác enteredBy và khớp người
review bundle. FieldSources phải trỏ nguồn đúng nhóm: venue address/coordinates/hours,
offering menu/hours (và price khi có giá), coverage coverage, anchor coordinates.
Nguồn, FK, tọa độ trong polygon, lịch và các điều kiện khác vẫn phải qua validator.

## Draft khảo sát đã chuẩn bị

Theo phạm vi user chọn, [pilot Thủ Đức cũ0.3.0](../../supabase/seed/draft/gm08-survey-v0.3.0/README.md)
đã có21 venues,247 venueDishes và154 dòng weeklySchedules draft; giữ39 món gốc.
Tọa độ/giờ nguồn đã có trong menuOfferings của snapshot gốc, được chép có provenance;
không phải metadata mới được khảo sát/xác minh. Lịch này chỉ là giờ listing nền tảng,
không tự dùng làm giờ món/dine_in. Một ngày thiếu giờ giữ unknown.
[Script](../../scripts/gm08_prepare_survey.py) chạy offline, giữ snapshots và IDs món;
source-records giữ mapping UUID và giá/ngày/checksum. Stage chỉ Pending; verified counts vẫn0.
Việc bổ sung dữ liệu thuộc GM-08 của Tâm; không cần chờ Vinh mới chuẩn bị được pilot.

## Audit catalogue trước khi bổ sung khảo sát

[Audit hiện tại](../evidence/roadmap-v2/GM-08/data-intake-followup.json) trên head1021560:
39 dishes draft, 18 taxonomy, 27 sources, 1 dataset draft0.2.0;
247 quan sát giá/21 tên chi nhánh. Draft không có venues/venueDishes/weeklySchedules/
coverageAreas/publicAnchors. Preflight publish có 286 lỗi thuộc SOURCE/RIGHTS/
STALE/REVIEW/UNREVIEWED/COVERAGE; verified counts vẫn0.

| Đầu vào còn thiếu | Bên cung cấp/kiểm | Điều kiện mở bước tiếp |
| --- | --- | --- |
| Khảo sát chi nhánh/menu/serviceModes và ID mapping | Tâm thu thập/nhập; Vinh hỗ trợ nếu có | Record quán–món thật, không chỉ tên quán/quan sát menu delivery |
| Tọa độ, lịch quán/lịch món đủ 7 ngày, coverage polygon/anchor | Tâm thu thập, người khác kiểm độc lập | Có evidence theo chi nhánh, giao lịch, vị trí trong vùng |
| Quyền dùng nguồn/ảnh, ngày kiểm, chính sách freshness | Bên khảo sát/chủ nguồn và reviewer | Có căn cứ; không tự điền license/TTL để bỏ lỗi |
| Review độc lập gắn đúng staged bundle SHA256 | Reviewer khác Tâm; Trí nghiệm thu cuối | Review thực tế sau stage, Approved và evidence hashes; không dùng simulated review |
| Publish/query bundle thật và bàn giao manifest/receipt | Tâm sau review | Counts/version/coverage/timezone/hash và join offering thật được kiểm trên PostgreSQL |

Pilot mục tiêu20–30 chi nhánh/15–20 món có offering. Nếu thiếu, giữ số thực và lý
do chuỗi có nội dung để reviewer quyết định chấp nhận. Exceptions/overrides có
thể bằng0; không ép mọi bảng có số dương. CI xanh chỉ chứng minh tooling.

## Trình tự nhập và kiểm

Tạo bản sao draft vào đường dẫn mới (không overwrite stage); lệnh chạy từ repo root:

```sh
python3 scripts/gm08_prepare_draft.py --output /tmp/gm08-candidate-new.json --report /tmp/gm08-draft-audit-new.json
```

Tâm bổ sung dữ liệu và evidence thật theo contract, kiểm/review phân loại draft.
Khi bundle đã sẵn sàng, validate và stage vào thư mục mới:

```sh
python3 supabase/seed/import_food_data.py validate --input /path/food-real.json --report /tmp/gm08-preflight.json
python3 supabase/seed/import_food_data.py stage --input /path/food-real.json --output /path/gm08-stage-new
```

Tooling tự sinh bundle.json/manifest.json/preflight.json/review-template.json,
counts/version/coverage/timezone/hash. Review template giữ Pending, reviewer và
reviewedAt null đến khi người kiểm độc lập thực sự review. Nếu sửa bundle phải
stage mới, review lại đúng hash; không chỉnh tay manifest để làm đủ quota.

Sau review migration/code và review dataset thực tế Approved, chạy publish/query
theo [README](../../supabase/seed/README.md#local-publish--query--rollback), dùng
bundleSha256 thật của stage/receipt. Lưu report và assertions query join
dish/venue/offering/schedule, giá/đơn vị, receipt/checksum/versions/counts;
cập nhật [manifest verified](../../supabase/seed/verified/manifest.json),
[CHECKS](../evidence/roadmap-v2/GM-08/CHECKS.md),
[HANDOFF](../evidence/roadmap-v2/GM-08/HANDOFF.md) và verification đúng revision.
Các AC này hiện Not run, chưa được chốt Done hoặc đề nghị merge toàn bộ GM-08.


## Lần cào mới và hồ sơ review hiện hành

[Fresh pilot0.4.1](../../supabase/seed/draft/gm08-survey-v0.4.1/README.md) có21branches/
18dishes/190offerings/154venue schedule rows, đáp ứng quota nhưng vẫn draft.
User xác nhận chưa có căn cứ quyền nguồn và policy; [hồ sơ Proposed/Pending](../../supabase/seed/draft/gm08-survey-v0.4.1/SOURCE_RIGHTS_AND_FRESHNESS.md)
được soạn để review. Dùng worksheet theo IDs/hash mới để thu dữ kiện thiếu.
0.3.0 và audit catalogue ở trên là lịch sử; không phải phần hiện vẫn thiếu venue
record. Khảo sát/review content, rights/freshness/coverage/giờ món vẫn chưa hoàn tất.


## Phiếu xác minh theo chi nhánh

[21phiếu/190offering](../evidence/roadmap-v2/GM-08/completion-survey/README.md)
đã gắn candidate0.4.1hash; user xác nhận chưa có khảo sát thực tế, cần nhóm điền
physical hours/giờ món/serviceModes/quyền/freshness/coverage evidence.
6chênh lệch giờ listing để ưu tiên kiểm, không tự chọn giờ một nguồn làm verified.
Phường Thủ Đức OSM hiện tại không là ranh giới quận Thủ Đức cũ. Phiếu giữ Pending,
không phải JSON import. Sau bổ sung phải stage mới và independent review thật.

Bổ sung Internet2026-10-11: [21hồ sơ nguồn đã điền quan sát công khai](../evidence/roadmap-v2/GM-08/public-intake/README.md). Dữ kiện này cần review; confirmed fields và quyền nguồn chưa tự chốt.
