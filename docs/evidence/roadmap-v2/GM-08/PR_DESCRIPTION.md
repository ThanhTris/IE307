# fix(data): align description provenance and test real GM-08 bundle

## Task và phạm vi

GM-08 (Issue #69), owner HoaiTam/Tâm, reviewer ThanhTris/Trí.
Branch codex/gm-08-verified-data-import → main; upstream GM-04 PR #62 / GM-06 PR #102.
Food 1.1.0 / schema 0.1.0; dataset 0.4.1.

Bundle thật có fieldSources.description hợp lệ theo GM-04 nhưng DB 0001 chưa cho
khóa đó, khiến transaction nạp bị reject 23514. Thêm migration 0003 sửa 11 ràng buộc
provenance; giữ 0001 frozen và UUID/FK/closed-key checks.

Bổ sung runner nạp chính bundle vào DB test riêng, query và đối chiếu mọi typed
field/count/quan hệ/giá/tọa độ/null, nạp lại không trùng và rollback. Dùng cùng typed
upsert engine của importer; giữ draft/nonfixture và các trường chưa biết. CI có
step actual bundle và lưu results/readback để tái lập.

## Start gate và merge gate

- Start gate đọc live Project: xem docs/evidence/roadmap-v2/GM-08/real-db/start-gate.txt.
- Merge gate/ref target và reviewer nghiệm thu revision cuối: chưa kiểm trong lượt này.
- Không đổi wire fields/privacy/grants hoặc tạo API; chỉ sửa storage parity và DB-test runner.

## Verification

| Kiểm | Kết quả | Evidence |
| --- | --- | --- |
| Actual bundle DB load/query/typed fields/counts/null/reimport/rollback | 44/44 Pass; 21 venues / 18 dishes / 190 offerings / 154 intervals | real-db/results.json, real-db/readback.json |
| Production import/receipt/concurrency/rollback regression (fixture riêng) | 31/31 Pass | real-db/synthetic-regression.json |
| Full Python | 514/514 Pass, 0 skip | real-db/python-regression.txt |
| Linux locale C / cp1252 guard tests | 6/6 Pass | real-db/linux-encoding.txt |
| Repo validator/docs freshness/diff | Pass | real-db/verification.json |

Bundle hash 0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02
không đổi. DB test đã drop; dữ liệu readback giữ nguyên draft/null/unknown,
0 publish receipts. Verified catalogue publish chưa chạy; verified manifest giữ nguyên.

## Bàn giao

Cách chạy: docs/evidence/roadmap-v2/GM-08/real-db/README.md và supabase/seed/README.md.
Source hashes/tested base eaa96d7 + patch trong real-db/results.json.
HANDOFF: docs/evidence/roadmap-v2/GM-08/HANDOFF.md.
Review/merge và chuyển Done do reviewer/nhóm thực hiện trên revision cuối.
