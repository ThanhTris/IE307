# GM-08 — Import plan

2026-10-11 (UTC+7). Owner HoaiTam/Tâm nhận việc theo yêu cầu trực tiếp của user;
reviewer ThanhTris/Trí theo Issue #69. Branch codex/gm-08-verified-data-import.
Scope food-v1/roadmap-v2/GM-08.1; food interchange1.1.0, schema0.1.0.
Input main7060b8825ad72ee9442d8890719f82451d473c33, PR#62 GM-04 và PR#102 GM-06.
Gate live READY_TO_CLAIM; nguồn Project#2, không fallback local/cache.
Python máy thiếu CA; SSL_CERT_FILE=/etc/ssl/cert.pem giữ kiểm TLS đầy đủ.

## Patch và ownership

- Importer stdlib supabase/seed/import_food_data.py: validate/dry-run, immutable
  staging, kiểm review độc lập + hash evidence, atomic local admin publish, query,
  idempotency và rollback có guard. Không remote endpoint/credential/client write.
- Reuse validator GM-04/mapping GM-06, không sửa frozen0001 hoặc legacy snapshots.
- Migration0002 chỉ journal vận hành private để giữ before/after trong cùng TX,
  không thêm field/schema business; RLS/revoke client, không RPC/publisher login.
  Receipt giúp xử lý crash sau commit, rollback không sửa core snapshots/room.
- Manifest verified ghi trạng thái chưa có dataset được nghiệm thu; không chuyển
  catalogue39 draft, fixture hoặc dữ liệu giá delivery thành verified/dine_in.
- Chuẩn bị audit draft/provenance/coverage thiếu, hướng dẫn người nhập và reviewer.

## Test plan

- Missing/duplicate keys, FK, stale/fixture/license/reviewer, reviewed content hash,
  timezone/coverage polygon, giờ quán giao giờ món/overnight/date exception/unknown.
- Real isolated PostgreSQL17: atomic partial failure, idempotent reimport,
  version/content conflict, rollback, external drift/later-version/refs refuse,
  schedule group binding, unrelated sentinel/core untouched, client deny.
- UTF-8/LF file/subprocess, root regression, validator, indexes/diff và merge gate.
- Mọi positive fixture/simulated review chỉ test tooling, không verified evidence.

## Giới hạn dữ liệu thật

GM-04 bàn giao39 món draft,247 giá ở21 chi nhánh; venue/offering/schedule/coverage
arrays rỗng. Menu usage rights/freshness/dine_in/lịch và review độc lập chưa có.
Publish dataset thật và query offering thật còn chờ nguồn/biên bản từ Vinh/Trí;
không tự Approve/Done hoặc hạ AC pilot. Tooling có thể hoàn thiện trước.

## Bản sửa review PR #103 — 2026-10-11

Baseline commit `1d247fe387ee9461277eb0141517a298675f6419`; PR Open, không Draft.
Theo comment ThanhTris: strict string reason khi thiếu quota; UTF-8/LF stdout/stderr
trước parse/DB, kiểm bytes JSON dưới cp1252 và lỗi output sau DB; thêm workflow GM-08
unit encoding và real disposable SQL/report. Không sửa frozen0001/contract/dataset thật.
Giữ evidence cũ tại baseline-1d247fe, chạy lại unit/SQL/regression và ghi source hashes.
Bản sửa này chưa commit/push; không tự Approve/Done hoặc chấp nhận merge partial.

## Sửa Linux CI locale — baseline b59d610

Không đổi production importer/schema. Test harness giữ LC_ALL=C, dùng path ASCII
và escape Unicode trong Python -c; nội dung JSON/reject/query vẫn tiếng Việt.
Workflow in Python/filesystem/stdout/UTF8-mode. Tái lập trước/sau trên Linux Docker
filesystem ASCII + cp1252 + UTF8 mode0; chạy lại root regression/SQL/hash/gate.
Giữ evidence b59d610 và link CI Fail, không dùng local macOS Pass thay Linux CI.
