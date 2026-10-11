# GM-08 — Handoff

Owner HoaiTam/Tâm đã nhận việc ngày2026-10-11 theo user; ThanhTris/Trí review cuối
(Issue#69). In progress, không Approved/Done. Branch codex/gm-08-verified-data-import;
input origin/main7060b8825ad72ee9442d8890719f82451d473c33, PR#62 GM-04/PR#102 GM-06.
Baseline đã commit/push `1d247fe387ee9461277eb0141517a298675f6419`,
[PR #103](https://github.com/ThanhTris/IE307/pull/103) Open, không Draft; chưa Approved/merge.
Bản sửa comment review đang local, chưa commit/push; tested hashes trong verification.json
và sql-results.json. [Evidence baseline](baseline-1d247fe/manifest.json) giữ nguyên bytes.

Contract food-v1/roadmap-v2/GM-08.1; food1.1.0/schema0.1.0. GM-04/06 Done trên
Project#2, gate live đã đạt; Markdown upstream chậm không tự là blocker theo ADR-011.
Các output upstream/mapping/schema/HANDOFF đã có và khớp main. CA máy Python thiếu:
chạy checker với SSL_CERT_FILE=/etc/ssl/cert.pem, giữ verify TLS, không bypass gate.

## Output

| File | Cách dùng / expected | Người nhận |
| --- | --- | --- |
| [Importer](../../../../supabase/seed/import_food_data.py) / [README](../../../../supabase/seed/README.md) | validate/stage offline; trusted-local publish/query/rollback sau review/hash/expiry guards | Trí/GM-18 và BE |
| [Journal0002](../../../../supabase/migrations/0002_food_import_receipts.sql) | Supabase migration up --local sau review; private RLS/revoke, no client policy/RPC/login | Trí/GM-06/17 |
| [Draft adapter](../../../../scripts/gm08_prepare_draft.py) | copy frozen draft thành1.1.0, source SHA/counts/reject audit; không verify | Vinh/Tâm |
| [Manifest](../../../../supabase/seed/verified/manifest.json) | state awaiting verification, actual verified counts0 | GM-18/19 không dùng draft làm seed |
| [Dataset handoff](../../../data/DATASET_HANDOFF.md) | nguồn/coverage/version/giới hạn và trách nhiệm tiếp theo | Data/BE |
| [CHECKS](CHECKS.md) / [SQL actual](sql-results.json) |28 unit/31 SQL assertions sau review fix, synthetic approval/data; real PostgreSQL | Trí tái lập |
| [CI workflow](../../../../.github/workflows/gm08-import.yml) | Linux cp1252 unit + real disposable SQL, artifact gm08-sql-results-linux; run bản sửa pending push | Trí kiểm độc lập trên đúng commit |
| [PR description](PR_DESCRIPTION.md) | bản mô tả phản ánh PR Open, kết quả local, CI pending và dữ liệu còn thiếu | HoaiTam cập nhật sau push |

Reproduce theo CHECKS/README từ clone sạch. Python stdlib, không package/provider
mới. Real SQL runner tạo/xóa DB riêng, giữ unrelated sentinel; không reset DB đang
có dữ liệu, không mount Docker socket vào container khác hoặc remote deploy.

## Rollback / điều kiện tiếp nhận

Rows mới delete và existing rows phục hồi nội dung/version tăng, exact after-state
+latest-active guard/FK; không CASCADE hoặc sửa locked core snapshot. Một receipt
cũ có thể lệch row versions sau rollback bản mới nên query/reimport cũ sẽ bị chặn;
review một version mới để republish. Không âm thầm delete rows/ca thiếu trong input.
Migration0001 frozen;0002 chỉ receipt journal, không thay food wire/schema version.

Dữ liệu thật chưa đủ:39 draft dishes/247 quan sát giá/21 branch names không là
verified venues/offerings/hours/coverage/rights. Artworknull; valid structure không
là nghiệm thu. Vinh/Trí cần bàn giao bundle/evidence thật; Tâm nhập và người khác
review đúng hash trước publish. AC pilot và query verified thật vẫn Not run.
Không nghiệm thu phần thiếu bằng synthetic suite hoặc CI; chưa được đóng task.

## Sửa review PR #103

Theo [comment của ThanhTris](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6101624086):
reason thiếu quota bắt buộc chuỗi có nội dung, không stringify null/sai kiểu;
CLI cấu hình stdout/stderr UTF-8/LF trước parse/DB; flush output để lỗi output sau DB
được báo trạng thái chưa xác định và kiểm receipt. Regression decode bytes/parse JSON,
success/reject/query tiếng Việt, template null và lỗi output sau simulated commit.
Query encoding test mock riêng DB boundary; 31 ca SQL dùng PostgreSQL thật riêng.
Không có bộ dữ liệu thật mới được bàn giao; verified counts vẫn0, publish/query thật
Not run. Merge riêng phần công cụ cần chủ dự án chấp nhận phạm vi partial delivery;
chưa có quyết định đó, GM-08 vẫn In Progress.
