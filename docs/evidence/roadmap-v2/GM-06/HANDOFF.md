# GM-06 — Schema handoff

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), review Pending.
Branch `codex/gm-06-database-schema`, [PR #102](https://github.com/ThanhTris/IE307/pull/102), target main.
Reviewed head `b6690708a04850593300c8af2166d997d5b038a3`; nhận main
`fc092aa86ed12aa1181f230d85950bbb93913620` bằng merge chưa commit.
Bản sửa hiện là working tree chưa commit/push, tested SHA256 trong [SQL report](sql-results.json);
không coi head cũ/main là commit chứa bản sửa. Xem [REVIEW_FIX](REVIEW_FIX.md). Contract `food-v1/roadmap-v2/GM-06.1`, schema **0.1.0**,
upstream GM-04.2 / food-core 1.1.0 / template dataset0.1.0 fixtureOnly.

## File và cách dùng

| Artifact | Cách đọc/chạy | Expected / người nhận |
| --- | --- | --- |
| [0001 schema](../../../../supabase/migrations/0001_core_schema.sql) | Supabase start hoặc runner DB riêng | 29 food/core + 2 public internal tables + private reference_epoch, schema0.1.0; GM-07/08/16/17/18..23 |
| [Migration README](../../../../supabase/migrations/README.md) | npm ci/start → Python runner | Guard local, numbering/rollback/upgrade; mọi task BE |
| [Mapping](../../../data/DATABASE_MAPPING.md) / [machine](../../../data/database-mapping.json) | Lookup exact JSON path → physical column/nested CHECK | 596 paths /374 columns, units/privacy/null/refs; GM-07/08 |
| [SQL suite](../../../../supabase/tests/schema_contract.sql) | Inject fixture bằng runner, không chạy marker bỏ trống | 67/67 pgTAP +16 reference races +2 schedule races Pass; Trí có thể chạy lại |
| [Runner](../../../../scripts/gm06_schema_check.py) | `python3 scripts/gm06_schema_check.py --report /tmp/gm06-sql-results.json` | Fresh/mapping/race/rollback/upgrade Pass, cleanup riêng DB test |
| [Down migration](../../../../supabase/rollback/0001_core_schema.down.sql) | Chỉ disposable DB, qua runner | Không CLI tự apply, giữ unrelated data/role shared |
| [Checks](CHECKS.md) / [verification](verification.json) | Lệnh/input/expected/actual/hash | SQL thật và tooling tách rõ; không Approved |

Migrations đã bàn giao/merge bất biến. GM-06 điều phối number prefix; task sau
thêm `0002_<scope>.sql` trở lên, không sửa 0001 để thêm RPC/RLS/feature. Source helper
trong supabase/schema embedded ở 0001; không apply riêng. Dataset rollback GM-08
khác schema down; no verified seed/remote deploy mới.

## Quyền và contract cho downstream

- Typed columns snake_case; object/structured array JSONB có shape checks, refs
  deferred và reverse parent checks. SQL nullable không thay required-key input
  validation của GM-07/08. UUID arrays preserve order/unique, không null element.
- JSON/array FK: BEFORE STATEMENT tuple UPDATE hàng khóa private reference_epoch ở
  mọi nguồn/parent, kể cả auth.users; giữ đến commit dù constraint đã flush sớm.
  16 real races insert/update × JSON/array × RC/RR × hai thứ tự writer có0 dangling.
  Write liên quan bị serialize; giữ TX ngắn,40001/40P01 retry toàn TX. Đo tải và
  review normalized FK trước tối ưu; không xóa lock để tăng tốc.
- Schedule group PK làm đích scheduleId; importer GM-08 tạo nhóm từ binding
  owner/timezone/review_status rồi entity/ca trong một transaction. Set constraints
  immediate trước commit. Weekly group version nội bộ tự tăng khi sửa ca; row
  scheduleVersion riêng. Concurrent 40001 cần retry whole transaction.
- Local importer là admin postgres. Publisher NOLOGIN, chỉ food CRUD; chưa grant
  SET membership cho login nào trong migration. GM-08 chọn identity trusted dưới
  review; client/service_role không tự nhận role này.
- App tables default deny kể cả host; GM-17 cung cấp policy/RPC phù hợp. Chưa có
  API business hoặc test member quyền chi tiết. Không serialize public row/JSON
  bundle toàn bộ; GM-07 chốt projection/DTO. Preferences/votes/ties/token riêng tư.
- FK tới auth.users thật; auth/session GM-16. Results/ACK immutable, không default
  phiếu; engine/finalize/no-veto/candidate transaction GM-15/19/20. History tối
  thiểu/active consent/cleanup GM-21; social/push permission GM-22/23.
- Retention/cascade cần review cùng snapshot FK trước cleanup API; không xóa room/
  result còn được history tham chiếu hoặc vô tình xóa history bằng CASCADE.

## Kết quả / review gate

AC schema/mapping/constraints/role/version/runner/rollback/upgrade có SQL thật Pass
trên bản sửa theo CHECKS; fixtures synthetic, không app/native/verified evidence.
Repo regression466 total/461 Pass/5 skipped; backend8/8,contract166/166.
Encoding file/report/subprocess explicitUTF-8,reportLF. Regression cp1252 mô phỏng
và Linux ASCII utf8Mode0 đạt2/2; Windows thật Not run vì owner chưa có môi trường.
Full Linux runner có Ubuntu CI workflow, chưa chạy bản sửa trước commit/push;
reviewer xem artifact actual từ run trước nghiệm thu.

Theo ADR-011 main mới, nguồn dependency là Project Done. Trí comment xác nhận
dependency đã đạt theo checker mới. Local credential thiếu read:project nên live
start/merge trả BLOCKED_PROJECT_UNVERIFIED; không dùng local/status/Issue Closed
thay gate. Task metadata backlog/proposed như baseline PR; Trí re-review bản sửa trước Approved/Done/merge.

## Checklist người nhận

- [ ] Credential đủ read:project; xác minh Done live và input revision trên target; Trí review lại GM-06.
- [ ] Commit bản sửa/PR #102 được duyệt, migration/runner/test SHA khớp reports; đối chiếu Linux CI và Windows Not run.
- [ ] Clone/nhánh nhận updated; chạy lệnh SQL runner và đối chiếu report 67 assertions và16 reference races.
- [ ] Input food/core1.1.0, null/unit/source/fixture/group/version đúng mapping.
- [ ] Biết API/RLS chi tiết/publish/eligibility/cleanup còn thuộc task sau.
