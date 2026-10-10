# GM-08 — Dataset và importer handoff

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

## Dữ liệu và việc cần bàn giao

39 món draft,18 taxonomy,27 sources,1 draft dataset0.2.0. Catalogue không có
venue/offering/weekly schedule/date exception/availability/coverage/public anchor.
247 giá menu tại21 chi nhánh là quan sát, không record quán đã xác minh, lịch bán,
quyền menu/ảnh hoặc bằng chứng phục vụ dine_in. Artwork=null; không suy rights từ URL.

Vinh bàn giao nguồn/ngày khảo sát/license/freshness/registries. Tâm nhập pilot
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
