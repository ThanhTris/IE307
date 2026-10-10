# GM-06 — Output checks sau review PR #102

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), mode data-schema; review Pending.
Task ở `tasks/backlog/GM-06.md`, metadata backlog/proposed như baseline PR; owner đã nhận việc, Trí đang review bản sửa, chưa Approved/Done.
Reviewed PR head `b6690708a04850593300c8af2166d997d5b038a3`; nhận main
`fc092aa86ed12aa1181f230d85950bbb93913620` bằng merge chưa commit. Tested revision
là working tree sau sửa, không coi head cũ/main là commit chứa bản sửa. Nhận diện
bằng artifact SHA256 trong [SQL report](sql-results.json) và [verification](verification.json).
[Comment](https://github.com/ThanhTris/IE307/pull/102#issuecomment-6099597593),
[phân tích bản sửa](REVIEW_FIX.md), [baseline thật](review-baseline.json).

Contract GM-06.1, upstream GM-04.2 / food+core 1.1.0, schema 0.1.0, template
dataset0.1.0 fixtureOnly=true. Không thay field contract/verified dataset.
Mac arm64, Python3.13.3, Node26.0.0, CLI2.120.0, Docker28.3.2, PostgreSQL17.11,
image `public.ecr.aws/supabase/postgres:17.11.0.004`. SQL report ghi runtime/time/hash.

## Chạy lại từ repo root

Python3.12+, Docker Linux engine và stack GM-03 local:

```sh
npm ci
npm run backend:start
npm run backend:smoke
python3 scripts/gm06_schema_check.py --report /tmp/gm06-sql-results.json
npm run backend:test
python3 -m unittest discover -s tests -p 'test_gm06_schema_runner.py' -v
python3 scripts/build_field_contracts.py --check
python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 scripts/validate_repository.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/task_readiness.py --check-docs
git diff --check
npm run backend:stop
```

Runner chỉ Docker socket unix/npipe local, đúng container/config/image/PG17.
Tạo database ngẫu nhiên riêng, copy DDL auth.users thật (không row/secret), loại
bỏ đúng trigger gm06 khi copy DDL, apply migration, inject templates và chạy
pgTAP/concurrency/rollback/reapply. Cleanup đúng database được tạo bởi process;
không reset DB của người dùng. Grant test-only rollback trong transaction.

## SQL và AC

[SQL suite](../../../../supabase/tests/schema_contract.sql), [actual report](sql-results.json).

| AC / case | Expected | Actual / giới hạn | Kết quả |
| --- | --- | --- | --- |
| Mapping từng field/cột | Đủ JSON paths và SQL type/nullability | 596 paths /374 columns, catalog match | Pass |
| Schema/query,1–8 | Schema0.1.0, join offering/venue/dish/schedule và core | Query thật với templates synthetic | Pass |
| NULL/enum/price/time/shape/version/FK/core/role,9–62 | Valid rows lưu được; invalid rows đúng SQLSTATE; default deny | 62 assertions cũ đều đạt trên migration mới | Pass |
| Nested FK serialization,63–67 | Mọi nguồn/parent có BEFORE STATEMENT lock; private RLS/privilege; lock thiếu/key update fail closed | Catalog và SQL errors đúng; 20 bảng affected có trigger | Pass |
| Reference races | 2 family JSON/UUID-array × insert/update × RC/RR × reference/parent trước; mỗi ca 1 commit,1 reject,0 dangling | 16/16; tất cả contender thực sự chờ Lock; 23503 ở RC,40001 ở RR | Pass |
| Schedule races | Một interval persisted, một writer bị từ chối | 2/2 ở READ COMMITTED và REPEATABLE READ | Pass |
| Fresh/down/reapply | Migration chạy trên DB rỗng; giữ sentinel ngoài scope; upgrade lại | Tất cả phase đạt, no CASCADE | Pass |
| Không chờ khảo sát/API | Dùng fixtureOnly=true templates đủ kiểm schema | Không verified seed hoặc BE business feature | Pass |
| Handoff và review revision | Artifacts/lệnh/hash đầy đủ; reviewer kiểm revision mới | Handoff có; review độc lập Pending | Artifact Pass; review Pending |

Baseline migration head b669070 đã được chạy với test mới **trước sửa**:
JSON INSERT ↔ DELETE parent, READ COMMITTED, SET CONSTRAINTS IMMEDIATE sớm:
2 commit, danglingReferences=1. Report baseline lưu hash migration cũ; không giữ
62/62 cũ làm evidence cho bản sửa. Report hiện hành **67/67** và **16/16 +2/2 races**.

## Encoding/platform

| Môi trường | Expected / actual | Evidence | Trạng thái |
| --- | --- | --- | --- |
| macOS full runner +SQL | UTF-8 input/subprocess/report, toàn bộ SQL/race/down/reapply đạt | sql-results.json | Pass |
| Windows locale cp1252 mô phỏng | Bare locale read hỏng; runner đọc đúng Việt/Cơm gà và Unicode subprocess roundtrip | 2 regression tests, suite log | Pass cho mô phỏng |
| Linux Python3.13.3,locale ASCII,utf8Mode0 | Đọc templates Unicode và truyền SQL Unicode không phụ thuộc default locale | [encoding-linux.txt](encoding-linux.txt),2/2; container cách ly không socket/mạng | Pass cho encoding |
| Ubuntu full runner CI | Workflow start Supabase → full runner → SQL smoke → upload actual report → stop | ../../../../.github/workflows/gm06-schema.yml | Not run trước commit/push; cần đối chiếu artifact CI |
| Windows thật | Chạy full runner trên Docker Linux engine local/npipe | Owner xác nhận chưa có môi trường Windows | Not run; không thay bằng mô phỏng |

## Repo / integration / dependency gate

Regression **466 total =461 Pass +5 skipped**,0 failure; [regression.txt](regression.txt).
Backend Node unit8/8 và GM-04 contract cases166/166 Pass; builder không drift.
Validator/docs/diff và hashes xem verification.json. Local project đã đếm chính
xác 0 business/auth row trước guarded reset cài draft mới; health200 GoTrue
v2.197.0/assertions và foundation SQL3/3 đạt. Sau reset runner chạy lại để kiểm
DDL auth trigger mới. Không reset môi trường có dữ liệu người dùng.

Main fc092aa dùng Project Done theo ADR-011. Reviewer comment xác nhận dependency
đã đạt theo checker mới. Máy này chạy live start/merge checker trả
**BLOCKED_PROJECT_UNVERIFIED**; gh GraphQL xác nhận thiếu `read:project`.
Không nói GM-03 Review/GM-04 Backlog là blocker nghiệm thu theo quy tắc mới;
không dùng cache/Issue Closed/local approval source để thay xác minh live.

## Giới hạn

Shared private reference_epoch serialize write ở mọi bảng nguồn/parent liên quan,
gồm auth.users. Giữ transaction ngắn, retry toàn TX khi40001/40P01; đo tải và
review normalized FK trước tối ưu. 31 public tables +1 private guard table có RLS
forced; client/publisher không trực tiếp sửa epoch. No API member policies/RPC,
full freshness/publish/consent/cleanup/engine/verified data hoặc native acceptance.

Chưa commit/push, chưa trả lời comment hoặc đổi PR/Project; Trí review bản sửa
và các platform checks còn Not run trước quyết định merge.
