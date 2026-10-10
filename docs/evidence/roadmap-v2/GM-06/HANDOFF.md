# GM-06 — Schema handoff

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), review Pending.
Branch `codex/gm-06-database-schema`, target main, base `d9e83d9`.
Local uncommitted working tree, tested SHA256 trong [SQL report](sql-results.json);
chưa có PR/commit GM-06. Contract `food-v1/roadmap-v2/GM-06.1`, schema **0.1.0**,
upstream GM-04.2 / food-core 1.1.0 / template dataset0.1.0 fixtureOnly.

## File và cách dùng

| Artifact | Cách đọc/chạy | Expected / người nhận |
| --- | --- | --- |
| [0001 schema](../../../../supabase/migrations/0001_core_schema.sql) | Supabase start hoặc runner DB riêng | 29 food/core + 2 internal tables, schema0.1.0; GM-07/08/16/17/18..23 |
| [Migration README](../../../../supabase/migrations/README.md) | npm ci/start → Python runner | Guard local, numbering/rollback/upgrade; mọi task BE |
| [Mapping](../../../data/DATABASE_MAPPING.md) / [machine](../../../data/database-mapping.json) | Lookup exact JSON path → physical column/nested CHECK | 596 paths /374 columns, units/privacy/null/refs; GM-07/08 |
| [SQL suite](../../../../supabase/tests/schema_contract.sql) | Inject fixture bằng runner, không chạy marker bỏ trống | 62/62 pgTAP Pass; Trí có thể chạy lại |
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

AC schema/mapping/constraints/role/version/runner/rollback/upgrade đã có SQL thật
Pass theo CHECKS; fixtures mô phỏng, không app/native/verified import evidence.
Repo checks xem verification.json. Trí review revision/contract/test plan trước
nghiệm thu. Tâm đã chỉ dẫn bắt đầu sau khi Project Done; main task/evidence GM-03/04
còn chưa đồng bộ nên formal checker BLOCKED. Không tự ghi Approved/Done hoặc làm
downstream checker READY bằng fixture/test results.

## Checklist người nhận

- [ ] Trí đồng bộ approval GM-03/04 đúng scope/revision trên target; review GM-06.
- [ ] Có commit/PR GM-06 được duyệt và đúng migration/runner SHA đã kiểm.
- [ ] Clone/nhánh nhận updated; chạy lệnh SQL runner và đối chiếu report 62 cases.
- [ ] Input food/core1.1.0, null/unit/source/fixture/group/version đúng mapping.
- [ ] Biết API/RLS chi tiết/publish/eligibility/cleanup còn thuộc task sau.
