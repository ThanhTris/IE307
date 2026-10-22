# GM-40 — Handoff mốc dữ liệu offline

Owner Vinh; reviewer Trí; **chưa Approved/Done**. Branch `codex/gm-40-dish-catalogue`,
base `afb1dca13b91bef30062aca018e5457908d244bc`. Mốc dữ liệu được đóng gói thành commit/PR theo yêu cầu Vinh ngày 2026-10-21;
commit thực tế xem lịch sử Git/PR, không dùng base làm tested feature SHA. Schema/profile 1.0.0; contract `dish-catalogue-v1/roadmap-v2/GM-40.1`.

## Có thể dùng để review ngay

| Artifact | Nội dung |
| --- | --- |
| [Dictionary](../../../data/DISH_CATALOGUE_DICTIONARY.md) | Field/type/required/null/unknown/unit/source/ID/version, giới hạn legacy |
| [Schema](../../../../supabase/seed/templates/dish-catalogue-v1.schema.json) / [template](../../../../supabase/seed/templates/dish-catalogue-v1.template.json) | Profile JSON độc lập, template trống fixtureOnly=true |
| [Bundle](../../../../supabase/seed/catalogue/dishes.json) / [manifest](../../../../supabase/seed/catalogue/manifest.json) | 39 món draft, 18 taxonomy, 27 nguồn, 247 quan sát giá, 123 field evidence |
| [Quality report](../../../../supabase/seed/catalogue/QUALITY_REPORT.md) | Coverage và thiếu thông tin của từng món; không phải review/publish |
| [Builder/validator](../../../../data-preparation/scripts/dish_catalogue.py) | Offline CLI, không SQL/network/API |
| [Fixture](../../../../tests/fixtures/dish-catalogue-v1/README.md) / [tests](../../../../tests/test_dish_catalogue.py) | Mô phỏng tách thật; structural/semantic/identity/source preservation |
| [Patch/test plan](PLAN.md) / [ADR-018](../../../architecture/decisions/ADR-018-dish-catalogue-profile.md) | Đề xuất storage/API/private snapshot adapter chờ Trí |
| [Upstream](UPSTREAM.json) / [checks](CHECKS.md) | Base/artifact commit+hash, lệnh và giới hạn kiểm |

Mọi giá trị món cũ giữ nguyên; thêm preparationMethods=null, không tự suy tag từ tên.
39 UUID giữ nguyên; 18 món GM-08 là tập con, không cộng thành 57. Mapping nguồn đủ
219 dòng: 216 mapped, 2 needs_review, 1 excluded, pin checksum ở manifest. Menu variants
không tự thành aliases. Bundle mới không chứa entity quán/offering/lịch/coverage;
nguồn URL menu/ID mục menu được giữ làm provenance. Snapshot/cache/GPT/GM-08 không đổi.

## Tái lập từ clone sạch

Python 3 stdlib; regression toàn repo dùng Python >=3.11 (đã kiểm 3.12.14).
Không cài package, không cần notebook/kernel/token hoặc Docker ở mốc A:

```sh
python3 data-preparation/scripts/dish_catalogue.py --check
python3 data-preparation/scripts/dish_catalogue.py --input supabase/seed/catalogue/dishes.json
python3 -m unittest discover -s tests -p test_dish_catalogue.py -v
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
```

Sinh lại có chủ ý: `python3 data-preparation/scripts/dish_catalogue.py --write`.
Build hai lần từ input không đổi cho cùng byte/hash; --check từ chối output bị sửa
tay hoặc đầu vào lệch snapshot. Không ghi đè snapshot/cache/legacy manifest.

## Điểm duyệt bắt buộc và phần chưa triển khai

Theo issue #125: “Chốt supplement/ADR hẹp với Trí trước thay schema/API”.
**Trí cần duyệt ADR-018 trước mốc B**; đây là yêu cầu explicit của issue/plan,
không phải approval do agent tự thêm. ADR hiện Proposed, chưa có quyết định Trí.

Chưa tạo `supabase/seed/import_dish_catalogue.py`, migration tiến,
`supabase/tests/dish_catalogue.sql`, `supabase/tests/http/GM-40.http`, RPC catalogue,
DTO runtime/guard hoặc private room adapter. Không tạo placeholder để đánh dấu đạt
AC. Số migration/path/hash sẽ ghi sau khi được duyệt và cập nhật main lại. Ledger
và definitions DB chưa được kiểm tại mốc dữ liệu; chưa kết nối hoặc migrate DB.

Mốc B phải kiểm import/readback/reimport/conflict/atomicity/rollback, auth thật,
new/old snapshots, round2/finalize/result stability và GM-21/23 integrations. Public
create_room/RoomContext hiện tại chưa đổi; chưa cung cấp luồng public tạo phòng
không cần địa điểm. Consumer UI/Android/Places nằm ngoài GM-40. Chưa chạy SQL/HTTP,
không tuyên bố Done hoặc cho production dùng catalogue draft.

## Giới hạn dữ liệu

34/39 mô tả; 1/39 có alias; 5/39 cuisine; 39/39 category; 2/39 meal slots;
1/39 origin khác unknown; 2/39 temperature khác unknown. Flavor/ingredientTags/
preparationMethods/artwork chưa có giá trị chung đủ evidence (giữ null/unknown).
Các con số là coverage cấu trúc, không phải nhãn được review hoặc còn fresh.
247 quan sát giá snapshot giữ đơn vị menu_item_unspecified khi không rõ khẩu phần;
không tính giá/person, trung bình hoặc giá áp dụng toàn món. Quyền nguồn/ảnh chưa
biết không được nâng thành licensed; source dates cũ không là ngày kiểm mới.

## Bàn giao tiếp

Trí review ADR và mốc A; sau đó Vinh làm mốc B đúng PLAN. Trước merge cập nhật main,
chạy `python3 scripts/task_readiness.py --task GM-40 --gate merge --base-ref origin/main`
và đủ AC thực. Merge gate không thay ADR approval hoặc test. Không thêm dependency
ngược GM-40 vào task số nhỏ hơn, không mở lại GM-08 hoặc thay release GM-34.

Kết quả ban đầu 2026-10-21: **573/573 regression**, **21/21 contract**, repository/index/diff đạt.
[Offline results](offline-results.json) và [patch manifest](PATCH_MANIFEST.json) pin kết quả/source; chưa có SQL/HTTP evidence.

[PR preparation](PR_PREPARATION.json): đã fetch và đối chiếu GitHub main; gate upstream đạt READY_FOR_MERGE_REVIEW.
Kết quả gate không gỡ điểm duyệt ADR hoặc các AC SQL/API còn Not run. PR chỉ bàn giao mốc A, không tự đóng #125.

## Sau review PR #129 — 2026-10-22

Nhánh đã rebase từ main `d8245a02c85d5b3bc4888a826589e99c1dc58a6d` (PR #130).
Yêu cầu chọn món không cần điểm đến/GPS/quán được tiếp nhận tại
[ADR-019](../../../architecture/decisions/ADR-019-dish-first-room-policy.md).
Hai lỗi admission trong comment đã sửa: code taxonomy ngoài type/namespace codebook
bị từ chối, quan sát giá trùng natural key hoặc sai UUIDv5 bị từ chối. Bundle/schema/
manifest dữ liệu giữ byte cũ; không sửa snapshot legacy hoặc khôi phục điều kiện quán.
Chi tiết tái hiện/expected/actual tại [review fix](REVIEW_FIX.md).

### Endpoint, contract/version và consumer mốc B

| Đầu ra / interface | Contract/version | Tình trạng và nơi nhận |
| --- | --- | --- |
| File catalogue dishes.json / schema / template | dish-catalogue-v1 1.0.0; dataset1.0.0; GM-40.1 | Đã có, dữ liệu draft/test_demo; nguồn cho BE/DTO |
| POST /rest/v1/rpc/read_dish_catalogue | Đề xuất ADR-018; đọc release theo profile1.0.0; runtime DTO/envelope chờ chốt với GM-07 | Chưa triển khai; chưa có endpoint/auth setup có thể gọi thử |
| POST /rest/v1/rpc/preview_dish_catalogue | Đề xuất ADR-018, cùng profile; pin release/version/hash; runtime request/response guard chờ review | Chưa triển khai; không tự coi preview catalogue là pool phòng |
| Adapter private ghi/đọc snapshot món | Đề xuất ADR-018, release + dish/record version + choice IDs | Chưa triển khai; phải kiểm snapshot/round/finalize và legacy compatibility |
| Consumer DTO/client và create/preview/RoomContext | GM-07 nhận profile1.0.0; phiên runtime mới cần version được duyệt theo ADR-019 | GM-18/19 và GM-24/25 bỏ yêu cầu anchor/radius/GPS cho flow mới; không thuộc PR offline này |

Catalogue API độc lập không tự làm public create_room/RoomContext hết phụ thuộc
anchor/radius. Consumer phải nhận đúng version đã duyệt và thay API tạo phòng/pool,
không gửi UUID anchor/quán giả để qua legacy guard. Policy/contract/snapshot phiên cũ
được pin nguyên nghĩa; không đổi phiên đã bắt đầu hoặc sửa migration đã merge.
Mốc B cần migration tiến và regression readback/transition/finalize/ACL trước dùng.
Định dạng RPC/DTO ở bảng là đề xuất, chưa được ADR-018 approval và chưa có SQL/HTTP
bằng chứng chạy thật. Không tuyên bố đã có endpoint hoạt động chỉ vì có tên trong docs.

Luật phòng/pool/ready/timer/cap mới được điều phối riêng theo ADR-019 hiện hành;
không thêm vào validator catalogue hoặc PR này. Kiểm điện thoại tích hợp theo đợt
sau merge vẫn **Not run** tới khi có revision/kết quả thật; không coi việc hoãn kiểm
là Pass hoặc toàn bộ GM-40 Done.

### Nhận runtime mới từ main PR #131 — 2026-10-22

Target cuối lượt sửa là `0d571b7316c0443bc766dca564407fd0abf521ac`.
[Handoff runtime](../GM-20/dish-v3/HANDOFF.md) cung cấp endpoint **đã merge**
`POST /rest/v1/rpc/dish_session`, wire `dish-session-v3/ADR-019`, policy
`dish-decision-v3`, schema0.8.0/migration0026. Đây là RPC riêng; legacy
create_room/RoomContext không tự đổi nghĩa. FE DTO/screens còn là consumer tiếp theo.

GM-40 mốc B phải nhận contract đó để nối importer/release thay vì dựng lại runtime:
`dishes[].id` → `cards[].dishId`, giữ name/mealSlots/cuisineIds/categoryIds đúng
nguồn; release/source SHA/test flag phải nhất quán với immutable
`dish_v3_private.catalogues`. Schema hiện tại chỉ nhận test_only=true; active
mặc định false, không có dữ liệu thật được tự kích hoạt. Cơ chế load/activate/
rollback và source validation của GM-40 còn chờ triển khai/review, không hand-edit
active hash hoặc lấy fixture làm release thật. Hai RPC đọc/preview trong ADR-018
vẫn là **đề xuất chưa triển khai**, không nhầm với dish_session đã có trên main.

Private storage/room adapter đề xuất ở ADR-018 phải được đối chiếu lại với migration
0026 trước khi duyệt mốc B; không tạo hai nguồn chốt runtime song song. Snapshot
legacy giữ version/policy cũ; phiên v3 pin catalogue hash/cards theo handoff của nó.
Không sửa migration0026 đã merge hoặc đổi luật phòng trong PR catalogue này.

Dữ liệu hiện có chỉ 2/39 món có mealSlots được chứng minh. Runtime v3 đòi đúng
10–20 món qua lọc, nên việc bundle valid **không chứng minh tạo được phòng thật**;
không tự điền buổi ăn, hạ count hoặc bỏ lọc để vượt kiểm. Bàn giao nguồn/thiếu field
cho mốc B và consumer; kiểm điện thoại vẫn Not run theo đợt tích hợp sau merge.
