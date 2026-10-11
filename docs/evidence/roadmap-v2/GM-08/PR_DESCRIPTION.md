# feat(data): add verified importer and prepare fresh Thu Duc pilot for review

GM-08 cần dữ liệu quán–món thật được xác minh trước publish. Bổ sung importer
validate → stage → independent review → publish/query/idempotency/rollback,
reject stale/fixture/broken refs và schema food1.1.0/GM-06 receipt migration.

Dùng lại crawler GM-04, thêm capture directory riêng và UTF-8 CLI; lấy mới27 nguồn
ngày2026-10-11. Adapter kiểm HTML/CSV hashes và provenance, giữ247 mapping cũ,
không tự gán dish cho item mới/đổi tên. Pilot0.4.1 có21branches/18dishes/190offerings/
154platform venue schedules; quota đạt. Source snapshots/catalogue gốc giữ nguyên.

Hồ sơ Pending gồm worksheet theo IDs, source rights/consent draft và freshness
policy proposal. User xác nhận chưa có quyền/policy được chốt. Giờ món/serviceMode,
physical venue hours (có conflict Jollibee), coverage/anchors và independent review
vẫn cần bằng chứng thật. Không dùng platform hours làm giờ món, không gán TTL/
license/reviewer giả. Candidate chưa verified/published; manifest verified counts0.

Validation:

- Full macOS bundled Python3.13.3:508/508 Pass,0 skipped (pandas/lxml đầy đủ).
- Linux localeC/cp1252:60cases/54Pass/6dependency skips; current notebook22cases/
  16Pass/6dependency skips. Parser/export có kiểm trong full macOS suite.
- Actual crawler27captures; fresh pilot validate/stage Pass; Pending-review publish
  reject trước DB Pass. Native Windows Not run.
- Repository/docs-freshness/diff/YAML checks Pass. Importer/schema SQL31/31 từ local/
  CI head1021560 có source hashes unchanged; synthetic data, không thay real publish.

GM-08 giữ In Progress. Actual verified dataset publish/query Not run; chưa đủ AC
để nghiệm thu Done hoặc merge toàn bộ task. Sau bổ sung facts/rights/policy phải
stage mới và independent review đúng hash trước publish/DB query.

Evidence: docs/evidence/roadmap-v2/GM-08/verification.json;
pilot: supabase/seed/draft/gm08-survey-v0.4.1/README.md.
Upstream: GM-04 PR#62, GM-06 PR#102, implementation base7060b88.
