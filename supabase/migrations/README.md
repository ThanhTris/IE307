# GM-06 — Migrations và SQL runner local

`0001_core_schema.sql`: schema 0.1.0, nhận food/core 1.1.0 (GM-04.2), 29 entity
tables + schedule_groups/schema_versions. Đây là storage baseline, chưa API/RPC
hoặc policy app. Không seed catalogue thật. [Mapping](../../docs/data/DATABASE_MAPPING.md).

Từ root repository, Node theo package.json, Python 3.12+, Docker Linux engine:

```sh
npm ci
npm run backend:start
npm run backend:smoke
python3 scripts/gm06_schema_check.py --report /tmp/gm06-sql-results.json
```

Expected: `result: Pass`, 62 SQL assertions, 596 mapped paths / 374 columns,
hai schedule race cases (READ COMMITTED/REPEATABLE READ), fresh migration,
rollback giữ unrelated data, upgrade/reapply. Runner kiểm đúng container local
`supabase_db_gi-cung-duoc-local` / Postgres17, không nhận db-url hoặc remote ref,
không reset database đang dùng. Nó tạo database `gm06_check_<random>`, copy **DDL**
auth.users từ local Supabase, chạy migration/pgTAP và synthetic templates, rồi
drop đúng DB nó vừa tạo. Không copy auth data/secret. pgTAP dùng extension đã có
trong Supabase image, không thêm dependency package.

`supabase/tests/schema_contract.sql` có marker fixture để runner inject templates
fixtureOnly=true. Không chạy file trực tiếp mà bỏ qua marker hoặc gọi là seed thật.
Report không chứa credential/user thật. Rerun SQL suite nếu thay schema/test/runner.
Start CLI chạy mọi migration chưa áp dụng; local project đã giữ version0001 cũ
trong lúc draft thì dùng DB riêng của runner cho kết quả revision hiện hành.
Chỉ reset local khi đã xác nhận đó là môi trường disposable; reset không là lệnh
cần thiết của runner và không tự reset DB có dữ liệu người dùng.

## Numbering và thay đổi sau bàn giao

Numeric prefix duy nhất tăng dần: GM-06 giữ `0001`; task sau thêm `0002_<scope>.sql`
trở lên theo lịch reviewer điều phối. Không dùng mã task làm migration version;
không sửa file đã merge/applied vào môi trường dùng chung. Schema version tăng
trong migration mới; contract/dataset version độc lập. Khi tạo migration mới,
chạy upgrade có dữ liệu và integration tests cho task bị ảnh hưởng.

`supabase/schema/gm06_helpers.sql` và `gm06_relations.sql` là bản nguồn dễ đọc
được embedded trong 0001, không phải migration bổ sung. Không apply riêng các
source đó. Sau bàn giao thay helper phải bằng migration mới.

## Rollback

[0001_core_schema.down.sql](../rollback/0001_core_schema.down.sql) nằm **ngoài**
directory migrations, không được CLI apply khi start. Chỉ dùng trên disposable
DB thử nghiệm, sau khi rollback downstream migrations. Nó xóa đúng bảng/trigger/
helper của GM-06 và dữ liệu task, không CASCADE sang public tables ngoài scope.
Role publisher là cluster-wide nên giữ NOLOGIN role; không drop role đang được DB
khác dùng. Runner tự chứng minh unrelated table/row vẫn còn rồi reapply migration.
Rollback dataset/published revision thực tế thuộc GM-08, khác rollback schema này.

Sau kiểm thử, có thể dùng `npm run backend:stop` cho project local này. Runner
không dừng các project/container khác.
