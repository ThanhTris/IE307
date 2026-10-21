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

Kết quả cuối: **573/573 regression**, **21/21 contract**, repository/index/diff đạt.
[Offline results](offline-results.json) và [patch manifest](PATCH_MANIFEST.json) pin kết quả/source; chưa có SQL/HTTP evidence.

[PR preparation](PR_PREPARATION.json): đã fetch và đối chiếu GitHub main; gate upstream đạt READY_FOR_MERGE_REVIEW.
Kết quả gate không gỡ điểm duyệt ADR hoặc các AC SQL/API còn Not run. PR chỉ bàn giao mốc A, không tự đóng #125.
