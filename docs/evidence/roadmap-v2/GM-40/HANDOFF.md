# GM-40 — Catalogue draft và đường nạp QA

## Bản hiện hành GM40.2 — nhận producer GM18.2

Đọc [handoff mới](rich-projection/HANDOFF.md), [plan](rich-projection/PLAN.md) và
[checks](rich-projection/CHECKS.md). Source bundle/schema1.0.0/dataset1.1.0 giữ nguyên;
adapter rich, schema/template stage, coverage và QA nhận0033/GM18.2 đã merge.
Các số liệu/runtime0026 và trạng thái review bên dưới là evidence lịch sử, không
thay kết quả supplement mới. Không SQL/API mới hoặc tự Approved/Done.


Cập nhật 2026-10-23 theo [review PR #129](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6346930509).
Owner Vinh, reviewer Trí. **Review/chưa Done; không tự Approved hoặc đổi Project**.
Target main `0d571b7316c0443bc766dca564407fd0abf521ac`; patch tiếp từ head `9e7a45b`.
Revision/hash thực của lượt kiểm xem [QA results](qa-results.json) và [patch manifest](PATCH_MANIFEST.json).

## Đầu ra hiện hành

| Artifact | Hợp đồng / nội dung |
| --- | --- |
| [Dictionary](../../../data/DISH_CATALOGUE_DICTIONARY.md), [schema](../../../../supabase/seed/templates/dish-catalogue-v1.schema.json), [template](../../../../supabase/seed/templates/dish-catalogue-v1.template.json) | dish-catalogue-v1/GM-40.1, schema1.0.0 |
| [Bundle](../../../../supabase/seed/catalogue/dishes.json), [manifest](../../../../supabase/seed/catalogue/manifest.json), [quality](../../../../supabase/seed/catalogue/QUALITY_REPORT.md) | Dataset1.1.0; 39 món, 18 taxonomy, 33 sources, 247 giá, 151 fieldEvidence; draft/test_demo |
| [Meal supplement](../../../../data-preparation/config/meal_slot_evidence_v1.json) | v1.0.0, 5 nguồn/44 quan sát/30 UUID; snapshot URL/hash/ngày kiểm; không sửa lịch sử |
| [Builder](../../../../data-preparation/scripts/dish_catalogue.py) | Offline deterministic, schema+semantic validation; giữ hai admission fixes đã được review |
| [Importer](../../../../supabase/seed/import_dish_catalogue.py) | validate→stage→import nguyên tử→readback; chỉ QA sở hữu |
| [QA runner](../../../../scripts/gm40_catalogue_check.py), [SQL assertions](../../../../supabase/tests/dish_catalogue.sql), [HTTP suite](../../../../supabase/tests/http/GM-40.http) | DB riêng, JWT HTTP thật, worker, expected–actual; cleanup có marker |
| [Checks](CHECKS.md), [plan](PLAN.md), [ADR supplement](../../../architecture/decisions/ADR-018-dish-catalogue-profile.md) | Kết quả thật, scope và phần chưa nghiệm thu |

39 UUID giữ nguyên, 18 GM-08 là tập con; mapping219 vẫn216/2/1. Giá và nguồn khảo sát
cũ không sửa, menu variant không biến thành alias. 30 món tăng version2→3 vì bổ sung
meal evidence; 9 giữ version2. Sáng14/trưa23/tối7/snack1, 9 chưa biết; chưa đủ20 món
sáng/tối/snack. Nguồn mới có menu trường học và quốc tế, không là availability Thủ Đức.
Ảnh/ingredient/flavor/preparation chưa đủ căn cứ giữ null, không suy an toàn dị ứng.

## Nhận runtime đã merge, không tạo schema/API song song

Nhận [GM-20 dish-v3 handoff](../GM-20/dish-v3/HANDOFF.md): migration
`0026_dish_session_policy.sql`, schema0.8.0, wire `dish-session-v3/ADR-019`, policy
`dish-decision-v3`. Hash migration trong qa-results.json; không sửa file đã merge.

Runtime authority là `dish_v3_private.catalogues` và snapshot runtime0026. Importer
map id→dishId, giữ nguyên name/description/artwork/mealSlots/cuisineIds/categoryIds.
Release ID `dish-catalogue-v1:1.1.0`, source_sha pin **toàn bundle bytes**. Staging
lưu cả bundle đầy đủ và stage.json projection; runtime readback so đúng projection,
không tuyên bố DB cards chứa toàn bộ price/evidence/record version. Không ghi đè18
món legacy, không insert quán giả hoặc thêm entity nơi bán để tạo pool.

Endpoint thật **POST /rest/v1/rpc/dish_session** (qua gateway) hoặc **/rpc/dish_session**
(trên PostgREST QA riêng). Commands create/snapshot/join/start/submit/finalize có sẵn;
request `{command,payload}`, response envelope `ok/data` hoặc `ok/error`. Auth JWT
role authenticated; client giữ wire/guard của GM-20. Không thêm read_dish_catalogue/
preview_dish_catalogue được đề xuất ban đầu; không quảng cáo các tên đó là API đã chạy.

ADR-018 vẫn Proposed: supplement đối chiếu mới dùng **storage/RPC hiện hữu, không đổi
schema/API**. Thiết kế gm40_private/discriminator/adapter SQL cũ chưa triển khai/chưa duyệt.
Không đổi luật 10–20 món, timer, veto/score/tier/seed/history/consent hoặc ACL.

## Tái lập offline và QA

Python>=3.11 (đã kiểm3.12.14), Docker/Supabase local hiện có. Không cài package.

```sh
python3 data-preparation/scripts/dish_catalogue.py --check
python3 -m unittest discover -s tests -p 'test_dish_catalogue*.py' -v
python3 supabase/seed/import_dish_catalogue.py validate --manifest supabase/seed/catalogue/manifest.json
python3 supabase/seed/import_dish_catalogue.py stage --manifest supabase/seed/catalogue/manifest.json --staging-dir data-preparation/datasets/gm40-stage
python3 scripts/gm40_catalogue_check.py
```

Sinh lại có chủ ý bằng builder --write; không sửa trực tiếp JSON sinh ra. Raw PDF/HTML
ở datasets bị ignore, builder chạy từ supplement có hash/locator nên không cần mạng
hoặc cache để clone sạch chạy được. Re-capture/biên tập nguồn là thay đổi có version,
không lấy ngày chạy mới thay checkedAt. Không crawl hoặc gọi AI khi build/test.

QA runner đọc auth schema/config local trong bộ nhớ, tạo DB `gm08_check_<random16hex>`
template0 có gm40_qa_owner marker, áp migrations tại QA rồi verify schema/definitions.
Tạo PostgREST loopback riêng và JWT ký hợp lệ cho synthetic auth.users QA, chạy tick
worker đã verify. **Không phải đăng nhập GoTrue/Android thật**. Không in credential/
ballot; không lưu token trong evidence. Runner finally stop worker/REST và drop đúng
DB có marker. App DB chỉ đọc introspection, không migrate/reset/publish. App local
hiện chưa có0026; không dùng health hoặc endpoint54321 làm bằng chứng triển khai main.

CLI import/readback/activate yêu cầu --database và --namespace khớp marker + schema
verify, từ chối postgres/app DB. Cùng release/version/hash là no-op; đổi bytes cùng
version báo conflict. Version mới import inactive trừ --activate; activate đổi con trỏ
trong transaction. Khôi phục dùng `activate --release-id dish-catalogue-v1:1.1.0` với
cùng ownership flags; không xóa release hoặc sửa hash. Runner kiểm restore/rollback và
snapshot đã khóa không đổi; bản1.1.1 trong test chỉ là candidate QA, không bundle phát hành.
Không trỏ CLI vào DB ứng dụng hoặc tự tạo marker để vượt guard.

HTTP suite cung cấp placeholders; runner tự điền/gọi/assert trong vòng đời DB tạm rồi
dọn. Không lưu endpoint/token dùng lại sau cleanup. Muốn kiểm tương tác cần harness
QA có namespace/credential riêng do owner quản lý; không dùng fixture đã cleanup.

## Bằng chứng và phần còn lại

qa-results.json ghi expected–actual từng ca: real bundle readback, reimport/conflict,
atomic rollback/restore, pool trưa10/20 đúng tag/nội dung/ID/hash, shortage không giảm
count, auth/outsider, real cards qua hai vòng/kết quả/reconnect, legacy fixture result/
FK/IDs không đổi, ACL và worker. Legacy fixture mô phỏng tách dữ liệu thật. Không nhận
đây là kiểm trên dữ liệu production hoặc chứng minh mọi possible category filter đủ20.

Chưa có frontend/Expo/Android/Places integration, chưa publish production hoặc Trí
nghiệm thu. Quyền ảnh unknown, nullable và thiếu nhãn theo quality report tiếp tục
bàn giao. Không mở lại GM-08, không đổi Project status, không tự đóng #125/merge.
Review Trí quyết định AC còn lại/approval. Lịch sử mốc A và sửa validator giữ trong
CHECKS/offline-results/review-fix-results, không dùng kết quả cũ thay lượt QA hiện hành.
