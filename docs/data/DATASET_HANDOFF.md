# GM-08 — Dataset và importer handoff

## Phạm vi hiện hành — 2026-10-13

Theo Trí và [ADR-014](../architecture/decisions/ADR-014-test-data-and-baseline-project-card.md), GM-08 đã Done trên Project với đầu ra **dữ liệu thật trên DB test**. Bỏ yêu cầu phải có verified publish/coverage/public anchors đầy đủ hoặc xác minh độc lập để nghiệm thu task. Lịch từng món/serviceMode chưa biết giữ null. Các mục sau phần này là hồ sơ theo revision, không là blocker hiện hành.

BE/GM-18 được nhận [bundle0.4.1](../../supabase/seed/draft/gm08-survey-v0.4.1/bundle.json), version/hash/counts và [lệnh DB-test + query/readback](../evidence/roadmap-v2/GM-08/real-db/README.md) ngay, không chờ manifest verified có rows. 21 venues/18 dishes/190 offerings/154 venue schedule rows/27 sources/18 taxonomy/1 dataset; coverageAreas/publicAnchors bằng 0. Offering schedule/serviceMode chưa biết không được tự điền. Tái lập bằng `python scripts/gm08_real_bundle_check.py --input supabase/seed/draft/gm08-survey-v0.4.1/bundle.json` trên DB test riêng theo README; runner không nạp production hoặc DB đang dùng.

Query thật có thể trả empty/reasonCodes khi thiếu đầu vào địa điểm/giờ; positive boundary/coverage cases dùng fixture riêng để kiểm bộ lọc, không gọi fixture là coverage thật. Không yêu cầu Tâm mở lại GM-08 để bổ sung phần thiếu này. Giữ luật lọc vùng/bán kính/thời gian, ACL/privacy và production publish guards. Chấp nhận data test không đồng nghĩa verified/published hoặc hoàn tất luồng recommendation production.

Manifest `supabase/seed/verified/manifest.json` vẫn phản ánh 0/null; không sửa thành publish giả. Verified production publish không là AC của GM-08 hiện hành, cần phạm vi riêng do Trí giao nếu triển khai.

## Hồ sơ lịch sử theo revision

Cập nhật2026-10-11: [bundle thật trên DB test](../evidence/roadmap-v2/GM-08/real-db/README.md)
Pass44cases,21quán/18món/190offering; query/counts/typed fields/null/reimport/rollback
đã kiểm. Nạp draft vào DB test không cần chờ verified publish; giữ input/unknowns.
Verified manifest vẫn0, không phải dataset đã publish cho app. Các mục dưới giữ
lịch sử theo revision; xem real-db/ cho kiểm storage hiện hành.


2026-10-11. Owner HoaiTam/Tâm, reviewer ThanhTris/Trí. Contract
food-v1/roadmap-v2/GM-08.1; food1.1.0, schema0.1.0. In progress, chưa Done/Approved.

Input main7060b8825ad72ee9442d8890719f82451d473c33 gồm GM-04/PR#62 và GM-06/PR#102.
Dictionary/template/mapping/schema/HANDOFF đã đối chiếu đúng origin/main;
Project#2 GM-04 vàGM-06 Done. [Plan](../evidence/roadmap-v2/GM-08/PLAN.md).

## Artifact hiện có

- [Importer](../../supabase/seed/import_food_data.py) + [cách chạy](../../supabase/seed/README.md):
  preflight/staging/review-bound publish/receipt query/guarded rollback local.
- [Migration0002](../../supabase/migrations/0002_food_import_receipts.sql): journal
  private atomic; không thêm food fields hoặc sửa schema0001. No client privileges.
- [Manifest thực trạng](../../supabase/seed/verified/manifest.json): chưa có bundle
  verified; không tuyên bố datasetVersion/coverage/hash đã publish.
- [Draft audit](../evidence/roadmap-v2/GM-08/draft-audit.json): input source/hash,
  counts/unknowns/publish blockers thật; candidate copy1.0→1.1 không sửa snapshot.
- [SQL actual](../evidence/roadmap-v2/GM-08/sql-results.json) và
  [CHECKS](../evidence/roadmap-v2/GM-08/CHECKS.md): test tooling với synthetic data,
  simulated review, real PostgreSQL; không thay verified dataset AC.

Hướng dẫn nhập theo review mới: [GM08_DATASET_INTAKE](GM08_DATASET_INTAKE.md),
gồm field/FK, nullable/unknown, đầu vào thiếu và trình tự review/publish.
[CI head1021560](../evidence/roadmap-v2/GM-08/ci-1021560-checks.json) đạt12/12;
[SQL CI](../evidence/roadmap-v2/GM-08/ci-1021560-sql-results.json) đạt31/31
với source hashes khớp. Dữ liệu/review trong SQL vẫn synthetic.

## Dữ liệu và việc cần bàn giao

39 món draft,18 taxonomy,27 sources,1 draft dataset0.2.0. Catalogue0.2.0 không có
venue/offering/weekly schedule/date exception/availability/coverage/public anchor.
[Draft khảo sát0.3.0](../../supabase/seed/draft/gm08-survey-v0.3.0/README.md) đã chép metadata
nguồn thành21 venue/247 offering/154 lịch chi nhánh draft, giữ nguyên tọa độ/giờ/giá/ngày nguồn.
Giờ món/serviceMode/coverage/anchor/rights/freshness/review vẫn chưa xác minh; không là verified seed.
247 giá menu tại21 chi nhánh là quan sát, không record quán đã xác minh, lịch bán,
quyền menu/ảnh hoặc bằng chứng phục vụ dine_in. Artwork=null; không suy rights từ URL.

Tâm chủ động thu thập/chuẩn bị nguồn/ngày khảo sát/license/freshness/registries;
nhận handoff của Vinh nếu có. Phần dataset thật thuộc GM-08, không làm lại GM-04. Tâm nhập pilot
20–30 chi nhánh/15–20 món có offering trong vùng đã xác minh; ghi thiếu quota bằng
số thực. Trí hoặc người kiểm độc lập review bundle hash, các nhóm evidence và
coverage shortfall trước publish. Chưa có bằng chứng này nên verifiedRows=0.
Không lấy GPS cá nhân làm anchor, không bịa tọa độ/giờ/giá hoặc flip fixture flag.

## Consumer BE/GM-18

Chỉ nhận bundle/manifest thật sau review/publish. Receipt chứa hash/row-state trên
DB local; manifest đầu vào ghi counts/schema/dataset/coverage/timezone, source và
review evidence. Query local trong README dùng offeringId của đúng receipt,
join dish/venue/schedule và giữ priceMin/Max/unit/currency. Không endpoint app,
không lọc/rank eligibility; GM-18 thực thi freshness/coverage/unknown/desiredAt,
GM-19 khóa snapshot. Không deserialize toàn row cho client trước GM-07/17.

Rollback phục hồi nội dung, tăng row versions; strict drift/ref guards có thể
chặn rollback. Receipt cũ không tự reactivated; tái publish cần version mới review.
Không sửa room/pool/result/history đang chạy. Migration0001 đã frozen; journal0002
cần reviewer kiểm number/ownership trước merge cùng các nhánh BE có migration.


## Fresh GM-08 pilot0.4.1

User yêu cầu crawl mới và chuẩn bị hồ sơ quyền/freshness (chưa có căn cứ được chốt).
[Hồ sơ hiện hành](../../supabase/seed/draft/gm08-survey-v0.4.1/README.md):21branches,
18dishes,190offerings,154platform venue schedule rows; quota đạt, tất cả draft.
27 nguồn crawl thành công,4 nguồn cần render; source dates/hash thật retained.
Validate/staging Pass; Pending review reject trước DB. Worksheet và source-policy
proposal có sẵn; giờ offering/serviceMode, coverage/anchors, nguồn/quyền/freshness
và independent review vẫn Pending. Manifest verified0, publish/query Not run.
Không dùng lịch nền tảng như giờ món/physical dine_in; không gán TTL giả.
