# GM-08 — Handoff

Owner HoaiTam/Tâm đã nhận việc ngày2026-10-11 theo user; ThanhTris/Trí review cuối
(Issue#69). In progress, không Approved/Done. Branch codex/gm-08-verified-data-import;
input origin/main7060b8825ad72ee9442d8890719f82451d473c33, PR#62 GM-04/PR#102 GM-06.
Working tree chưa commit, tested hashes trong verification.json và sql-results.json.

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
| [CHECKS](CHECKS.md) / [SQL actual](sql-results.json) |20 unit/31 SQL assertions, synthetic approval/data; real PostgreSQL | Trí tái lập |

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
