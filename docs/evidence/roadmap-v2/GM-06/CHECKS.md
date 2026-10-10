# GM-06 — Output checks

Implementation kiểm xong trên nhánh local; review **Pending**, không Approved/Done.
Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), mode **data-schema**.
Branch `codex/gm-06-database-schema`, target origin/main, base
`d9e83d9c091b4487f7188bdfb7906e8f950db378`. Tested revision là **uncommitted working
tree**, nhận diện bằng SHA256 trong [sql-results.json](sql-results.json), không
giả định base commit chứa code GM-06.

Contract GM-06.1, upstream GM-04.2 / food+core 1.1.0; schema **0.1.0**.
Dataset template **0.1.0**, fixtureOnly=true, UUID mô phỏng; không verified seed.
Mac arm64, Python 3.13.3, Node 26.0.0, Supabase CLI 2.120.0, Docker 28.3.2,
PostgreSQL **17.11**, official image `public.ecr.aws/supabase/postgres:17.11.0.004`.
Chính xác runtime/test time/hash xem report; Android/native/API business N/A trong scope này.

## Setup và chạy lại

Từ repository root, có Docker Linux engine và Python 3.12+:

```sh
npm ci
npm run backend:start
npm run backend:smoke
python3 scripts/gm06_schema_check.py --report /tmp/gm06-sql-results.json
python3 scripts/build_field_contracts.py --check
python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 scripts/task_readiness.py --check-docs
python3 scripts/validate_repository.py
python3 -m unittest discover -s tests -p 'test_*.py'
git diff --check
```

SQL runner tạo DB random riêng, copy **DDL auth.users thật** từ local Supabase
(không data), apply migration, install pgTAP từ image, inject templates synthetic
trong transaction test. Không reset database người dùng. Sau test tạo committed
fixture chỉ trong DB disposable để thử hai concurrent writers; cuối cùng drop
đúng DB đó. Các statement role/grant trong suite rollback. No remote flags,
secret/service key, push/OCR/native hoặc verified import.

## SQL / acceptance criteria

[SQL suite](../../../../supabase/tests/schema_contract.sql) chứa input/assertion
từng case; [actual report](sql-results.json) giữ TAP **62/62 Pass**, phase outputs,
concurrency outcomes và SHA256 migration/runner/test/mapping/rollback.

| AC / case IDs | Input / phép kiểm thật | Expected → Actual | Kết quả |
| --- | --- | --- | --- |
| Mapping mọi field | Upstream field-coverage + catalog PostgreSQL | 596 paths, 374 columns; top-level SQL type/nullability đúng | Pass |
| Schema/version/query, 1–8 | Templates food/core; join offering/venue/dish/schedule, room/member, result/history/events | schema0.1.0; 1 dish/offering/result, 2 members/histories/events | Pass |
| NULL/enum/price/coordinate/timezone, 9–17 | NULL name, bad enum, -1/reversed price, lat91, partial coords, invalid IANA, private anchor | NOT NULL/CHECK từ chối | Pass |
| Version/PK, 18–20 | version0, sửa không tăng version, đổi stable ID | 23514, không thay persisted row | Pass |
| Scalar/array/JSON FK, 21–26, 56 | Auth user/taxonomy/source/consent UUID không tồn tại; source chỉ trong JSON bị xóa | 23503; reverse reference cũng bị chặn | Pass |
| Nested shape/unknown/roster, 27–30, 55, 62 | Thiếu flavor keys, budget thêm gps, radius0, roster1/null UUID element, duplicate consent users | Shape và context CHECK từ chối | Pass |
| Lịch/last order/coverage, 31–36, 53–54 | Overnight sai offset, last order tại end/thiếu offset, lệch timezone, closed có intervals, polygon không khép, duplicate interval, ngày 30/02 | Range/source/group/date CHECK/FK từ chối | Pass |
| Source/fixture/private/core, 37–43 | Self-review, fixture publish, token chưa có permission, self/unsorted pair, ACK hash/result sửa | CHECK/immutability từ chối | Pass |
| Default deny/publisher, 44–49, 57–61 | Role anon/authenticated thật; thêm SELECT tạm để kiểm RLS; publisher SET role với membership test-only | denied hoặc 0 rows; publisher chỉ food; không default OK/KEEP | Pass |
| Unique/pool, 50–52 | Offering variant NULL trùng tuple, result cùng room, ordinal8 | 23505/23514 | Pass |
| Concurrent schedule | Hai INSERT interval chồng nhau, READ COMMITTED và REPEATABLE READ | Mỗi mode 1 commit / 1 reject, 1 interval persisted | Pass |
| Fresh migration | Database rỗng riêng + Supabase auth.users DDL | Migration thực thi, schema version1 record | Pass |
| Rollback/upgrade | Schema có fixture + unrelated sentinel row; down; reapply | Xóa đúng schema task, sentinel giữ nguyên; reapply version1 record | Pass |
| Không chờ khảo sát/BE feature | Chỉ templates fixtureOnly và Supabase DB runner | Toàn bộ schema kiểm được mà không API/data thật | Pass |

## Kiểm repo / hồ sơ

Kết quả cuối lưu [verification.json](verification.json). Contract GM-04 cases
166/166 Pass; build --check không drift. Repo validator, regression, docs freshness,
diff check là checks tooling, không thay SQL hoặc review của con người.

`task_readiness.py --task GM-06 --base-ref origin/main` còn **BLOCKED**:
main giữ GM-03 Review / GM-04 Backlog dù Tâm xác nhận Project Done và CLI đọc
#64/#65 Closed bởi ThanhTris. CLI không có read:project. [PLAN](PLAN.md) ghi chỉ dẫn
triển khai của Tâm; không tự dựng approval/upstream evidence. Metadata GM-06 giữ
backlog/proposed tới xác nhận reviewer và đồng bộ upstream; owner đã nhận việc.
Không sửa checker/tests để vượt gate. Trí cần review plan/contract/revision và
upstream evidence trước đổi metadata start/review/Done hoặc merge.

## Giới hạn và người nhận

Schema cung cấp storage constraints và default-deny, không nghiệm thu quyền
member/RPC, full publish/freshness, eligibility/engine/finalize, consent withdrawal,
invitation permissions/push, TTL cleanup hoặc native. Ownership theo
[DATABASE_MAPPING](../../../data/DATABASE_MAPPING.md) và [HANDOFF](HANDOFF.md).
No new npm package/lockfile/config change. SQL helpers/reference guards cần đánh
giá tải với verified dataset ở GM-08/18; hiện chứng minh synthetic integrity.

Reviewer độc lập ghi REVIEW.md cho đúng SHA/commit sau khi nhận code; không copy
approval lịch sử. Không commit/push/issue sync trong lần triển khai này.
