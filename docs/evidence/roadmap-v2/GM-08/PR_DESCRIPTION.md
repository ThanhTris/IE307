## Task và phạm vi

Refs #69 — GM-08, owner HoaiTam, reviewer ThanhTris.
Branch `codex/gm-08-verified-data-import` → `main`; contract GM-08.1,
food1.1.0/schema0.1.0. PR #103 đang Open, không Draft; chưa được Approved/merge.

PR triển khai công cụ validate → staging → independent review → publish/query/rollback.
Dataset thật chưa đủ để nghiệm thu toàn bộ GM-08. Nếu merge riêng công cụ, cần chủ dự án
xác nhận partial delivery; task tiếp tục In Progress và không tự đóng Issue #69.

## Implementation và sửa review

- Importer stdlib dùng validator GM-04/mapping GM-06, không sửa migration `0001`.
- Staging giữ exact bytes/hash/counts/version; publish yêu cầu reviewer độc lập, source
  rights/freshness/coverage/hours/price/image checks và evidence gắn SHA256.
- Publish atomic, idempotent/concurrent retry, version guards; rollback từ chối
  drift/newer import/FK, giữ core snapshots và unrelated rows.
- Migration `0002_food_import_receipts.sql` chỉ journal private/RLS/revoked client access.
- Sửa reason thiếu quota: phải là chuỗi có nội dung; thiếu/null/empty/whitespace/
  boolean/number/list/object đều reject. Số coverage thực tế giữ nguyên.
- Chuẩn hóa JSON stdout/stderr UTF-8/LF trước parse/DB; kiểm success/reject/query tiếng
  Việt dưới cp1252, UTF-8 mode tắt, không traceback. Lỗi output sau DB báo
  `publicationPerformed: null` và yêu cầu kiểm receipt, không khẳng định đã rollback.
- Thêm workflow GM-08 riêng chạy encoding regression và SQL importer trên DB disposable,
  upload report `gm08-sql-results-linux` và cleanup luôn chạy.
- Sửa test harness cho Linux filesystem ASCII: path dùng ASCII, probe Python -c
  escape Unicode, vẫn kiểm JSON tiếng Việt. Giữ LC_ALL=C/cp1252/UTF-8 mode0,
  thêm log runtime; không thay production importer/schema hoặc bỏ assertions.

Review nguồn: https://github.com/ThanhTris/IE307/pull/103#issuecomment-6101624086.

## Dependency và tested revision

- GM-04 PR #62 và GM-06 PR #102: Done trên Project #2; artifact/HANDOFF khớp target.
- GM-06 merge/base implementation: `7060b8825ad72ee9442d8890719f82451d473c33`.
- Baseline PR hiện hành đã commit/push: `b59d6107953f40a4b5afa2aa46b875bfae4f77c6`.
- Target ref đã fetch: `00c4f27a97d4f1487dfed7c54c1253c766709a1a`; thay đổi sau base
  chỉ là hướng dẫn AGENTS, không đổi artifact upstream. Nhánh cần nhận target trước merge.
- Bản sửa được kiểm trên working tree của baseline; exact source hashes, thời điểm
  và kết quả dependency gate hiện tại nằm ở `verification.json`/`merge-gate.txt`.
- Gate dependency không thay review code/dataset hoặc quyền merge.

## Kiểm chứng và CI

| Kiểm tra bản sửa local | Kết quả |
| --- | --- |
| Unit GM-08 | 28/28 Pass |
| Linux filesystem ASCII/cp1252, UTF-8 mode tắt | Trước sửa:28 tests/4 errors; sau sửa:28/28 Pass |
| Linux default parent / ASCII subprocess | 28/28 Pass |
| SQL importer/PostgreSQL 17.11 | 31/31 Pass |
| Python regression | 494 tests: 489 Pass, 5 Skipped, 0 Fail |
| Node unit / foundation SQL / HTTP health | Giữ evidence Pass của baseline b59d610; tooling nền không đổi |
| Validator / docs freshness / whitespace | Pass |

SQL dùng PostgreSQL thật và database tự tạo/xóa; dữ liệu/review chỉ synthetic.
Encoding query test mock DB boundary; không tuyên bố query dataset thật.

CI b59d610 encoding và validate Fail do filesystem/argv trước CLI; SQL disposable Pass.
CI của bản sửa mới Pending cho đến khi push/chạy xong. Workflow/report sẽ nằm tại
https://github.com/ThanhTris/IE307/actions/workflows/gm08-import.yml.
Reviewer kiểm đúng commit SHA và `artifactHashes` trong artifact `gm08-sql-results-linux`.
CI SQL GM-06 ở baseline không chứng minh GM-08 SQL đã chạy trên CI.
Linux đã kiểm qua Docker Python3.13.3/aarch64, repo mount chỉ đọc/tắt mạng,
filesystem ASCII và default locale. CI Python3.12.15/x64 của bản sửa còn pending;
Windows chưa chạy bản sửa trực tiếp.

Evidence gốc của head1d247fe giữ nguyên ở
`docs/evidence/roadmap-v2/GM-08/baseline-1d247fe/manifest.json`.
Evidence local/CI Fail của b59d610 giữ nguyên ở
`docs/evidence/roadmap-v2/GM-08/baseline-b59d610/manifest.json`.
Fail logs: https://github.com/ThanhTris/IE307/actions/runs/38102929443/job/114362427281;
https://github.com/ThanhTris/IE307/actions/runs/38102929498/job/114362427294.
Baseline CI: https://github.com/ThanhTris/IE307/actions/runs/38073939317;
https://github.com/ThanhTris/IE307/actions/runs/38073939190.

## AC còn chờ và handoff

- Verified counts = 0; chưa có bundle venue/offering/hours/coverage thật được review độc lập.
- Publish và query offering dataset thật: Not run, chờ handoff từ Vinh và review độc lập.
- Giữ catalogue/draft/fixture nguyên trạng; không dùng synthetic tests thay verified seed.
- Quota thiếu cần số thực và lý do chuỗi được reviewer chấp nhận, không bịa data.
- Upsert không tự xóa row vắng mặt. Rollback tăng version; receipt cũ có thể cần phiên
  bản mới được review lại để publish tiếp.

Handoff/lệnh/giới hạn: `supabase/seed/README.md`, `docs/data/DATASET_HANDOFF.md`,
`docs/evidence/roadmap-v2/GM-08/{PLAN,CHECKS,HANDOFF}.md` và
`supabase/seed/verified/manifest.json`.

- [ ] ThanhTris review bản sửa, migration numbering/ownership và report đúng revision.
- [ ] CI GM-08 encoding + SQL của bản sửa đạt, artifact hashes khớp commit.
- [ ] Chủ dự án quyết định phạm vi partial delivery nếu muốn merge công cụ trước dataset.
- [ ] Nhận/review/publish/query dataset thật và bàn giao manifest/evidence trước Done.
