# GM-06 — Mapping dictionary → PostgreSQL

Schema **0.1.0**, task contract `food-v1/roadmap-v2/GM-06.1`, nhận GM-04.2,
food/core interchange **1.1.0** tại `d9e83d9c091b4487f7188bdfb7906e8f950db378`.
Owner Tâm; reviewer Trí, Pending. Không là approval hoặc verified dataset.

[Mapping từng field](database-mapping.json) ghi đầy đủ **596 path** đúng
[coverage GM-04](field-coverage.json), kể cả nested/array/envelope: physical
table/column, SQL type, required/nullability, enum, FK, storage/privacy. Runner
đối chiếu toàn bộ path với upstream và **374 cột** với catalog PostgreSQL thật,
kiểm type/nullability của top-level columns. [Dictionary](FOOD_DATA_DICTIONARY.md)
là nguồn unit/default/source; không thay hoặc suy lại contract upstream.

## Quy tắc mapping

| JSON | PostgreSQL | Constraint / ghi chú |
| --- | --- | --- |
| camelCase entity/field | snake_case table/column | VD `venueDishes.offeringId` → `venue_dishes.offering_id` |
| UUID scalar | `uuid` | PK hoặc FK deferrable, `NO ACTION`; không client sinh user ID |
| UTC `...Z` | `timestamptz` | finite; wire UTC Z do DTO/importer; DB lưu instant và display theo session timezone |
| localDate | `date` | PostgreSQL kiểm ngày lịch thật |
| local HH:mm | `text` | CHECK pattern, offset 0/1 explicit; không timezone/cast máy khách |
| integer/version | `bigint` | min/max từ contract; version >=1, thay nội dung cần tăng version |
| price/coordinate/radius | `numeric` | finite, bound/min<=max; không đổi unit/group price thành giá/người |
| string/enum | `text` | min/max length, pattern/enum/const CHECK |
| string/UUID array | `text[]` / `uuid[]` | preserve order, uniqueItems, không phần tử null; GIN index |
| object/structured array | `jsonb` | CHECK shape/required/nullable/enum/extra fields; không nguyên row JSON |
| required + nullable | cột nullable, không default nghiệp vụ | SQL không phân biệt omitted với NULL; GM-07/08 phải validate key required trong input |
| nested nullable | JSON null theo schema | Parent SQL NULL được phép chỉ khi parent nullable; nested required kiểm khi parent có giá trị |
| bundle.contractVersion | `schema_versions.*_contract_version` | Không lặp wrapper trên từng core row; schema nhận food/core 1.1.0 |
| bundle.datasetVersion | `dataset_versions.dataset_version` / room pool provenance | GM-08 validate bundle version trong transaction; không tự publish |
| bundle.fixtureOnly | food row `fixture_only` | default **true**, CHECK không cho fixture publish; core fixture wrapper chỉ trong test runner |

`gm06_private.json_matches` dùng vocabulary đóng đã được thu gọn từ schema
GM-04: unknown keyword/field bị từ chối. Không là JSON Schema engine tổng quát.
Array/JSON UUID refs có deferred constraint trigger kiểm cả nguồn và parent
delete/update; không chỉ kiểm UUID đúng pattern. SECURITY DEFINER chỉ trên trigger
integrity, fixed search_path/qualified tables, revoke execute khỏi client; không
tạo RPC đọc dữ liệu riêng tư. Native FK xử lý scalar. Unique tuple nullable dùng
`UNIQUE NULLS NOT DISTINCT`, gồm offering variant và history/consent/device tuple.

## Bảng và ownership

11 bảng food: `taxonomy`, `dishes`, `venues`, `venue_dishes`, `weekly_schedules`,
`date_exceptions`, `availability_overrides`, `coverage_areas`, `public_anchors`,
`data_sources`, `dataset_versions`.

18 bảng core: `profiles`, `rooms`, `members`, `preferences`, `round_dishes`,
`submissions`, `votes`, `results`, `consents`, `histories`, `friend_invitations`,
`friends`, `room_invitations`, `inbox`, `devices`, `events`, `deliveries`, `idempotency`.

2 bảng storage nội bộ: `schema_versions`, `schedule_groups`. `profiles.user_id`
và mọi user FK trỏ **auth.users**, không dùng profiles như authority. History là
snapshot tối thiểu, không có GPS/anchor/preferences/mood/raw votes. App roles chưa
có policy hoặc table privileges; GM-17 cấp quyền theo ma trận và projection RPC.

## Nhóm lịch và import transaction

`weeklySchedules.id` là PK của từng ca; `scheduleId` là ID nhóm nhiều ca.
`schedule_groups` giữ schedule_id PK, owner_type/owner_id/timezone/review_status,
fixture_only và version nội bộ. venue_id/offering_id generated xác định đúng owner
FK. Cột `_schedule_owner_type` generated trên quán/offering hỗ trợ composite FK;
không phải field wire. Group version tăng khi thêm/sửa/xóa ca để serialize writer,
không thay weekly row version/snapshot `scheduleVersion`.

GM-08 tạo group một lần từ tập weekly rows có cùng binding, rồi insert entity và
các ca trong **một transaction**; `SET CONSTRAINTS ALL IMMEDIATE` trước commit
để fail toàn bộ nếu thiếu owner/group/refs. Không group rỗng; quán có lịch riêng,
món có lịch riêng và offering timezone khớp chi nhánh. Group cùng review_status
theo contract. Importer không sửa group đang dùng rồi bỏ các ca chưa cập nhật.

Ca [start,end), tối đa 24h, endDayOffset 0/1, is24Hours phải khớp duration.
Closed/unknown không có time/last order. Last order có offset/source hours và nằm
trong ca. Date exceptions closed/unknown có intervals=[]; interval open không
overlap, last order nằm trong một interval. Weekly overlap kiểm cả Sunday→Monday.
Row update trên group serialize concurrent writes; `40001` cần retry toàn bộ
transaction ở isolation REPEATABLE READ, không retry từng INSERT riêng.

## Quyền và version

Mọi 31 bảng bật và force RLS; PUBLIC/anon/authenticated bị revoke table privileges.
Không có policy cho app. `gm06_publisher` NOLOGIN/NOINHERIT/NOBYPASSRLS, policy
CRUD chỉ 11 bảng food + schedule_groups; không tự grant quyền SET role cho login hoặc
service_role. Existing publisher role không an toàn làm migration fail.

Importer **local test** là DB admin `postgres` trong container GM-03, không dùng
remote credential. Khi GM-08 cần một publisher login, reviewer phải chọn trusted
identity và provision membership; không đưa vào mobile. Test chỉ cấp membership
tạm trong transaction rồi rollback. Storage privileges không thay review nguồn,
license/freshness/publish pipeline của GM-08; read-time eligibility GM-18 phải
loại dữ liệu con hết hạn. Không CHECK `now()` để giả rằng row không thể hết hạn.

Schema/contract/dataset version độc lập. Stable PK không đổi. `results`,
`submissions`, `votes`, `idempotency` immutable sau insert (no-op retry được giữ);
muốn payload mới phải request/intent mới và logic GM-20. Default phiếu/giá/consent
không tồn tại. SQL không tự tính candidate/tier/veto/winner hoặc finalize.

## Query mẫu và cách kiểm

Admin/runner local, synthetic fixtures trong transaction test:

```sql
SELECT d.name, v.branch_name, o.price_min, o.price_max, o.unit,
       g.timezone, w.day_of_week, w.start_time, w.end_time, w.end_day_offset
FROM public.venue_dishes o
JOIN public.dishes d ON d.id = o.dish_id
JOIN public.venues v ON v.id = o.venue_id
JOIN public.schedule_groups g ON g.schedule_id = o.schedule_id
JOIN public.weekly_schedules w ON w.schedule_id = g.schedule_id;

SELECT r.id, r.winner_round_dish_id, r.match_tier, r.reason_code, r.finalized_at
FROM public.results r WHERE r.room_id = :room_id;
```

Query đầu là join/schema example, **chưa lọc eligibility hoặc published data**.
Không serialize rows ra client; shared response allowlist do GM-07/17/19/20.
Chạy [runner](../../scripts/gm06_schema_check.py) theo
[migrations README](../../supabase/migrations/README.md); kết quả thật trong
[CHECKS](../evidence/roadmap-v2/GM-06/CHECKS.md).

## Giới hạn giao cho task sau

GM-08 atomic import/publish/report/version rollback, verified data/license;
GM-16 auth/session; GM-17 RLS/member/security RPC; GM-18 eligibility/freshness;
GM-19/20 snapshot lock/state transitions/complete ballots/veto/idempotent finalize;
GM-21 active consent/group ACL/withdrawal/history cleanup; GM-22/23 invitation
permission, event recipient/opt-in/dispatch/ACK. SQL đã cung cấp field/refs và
ràng buộc storage, chưa chứng minh các API đó. Retention cần cùng review với FK
NO ACTION: không xóa room/result còn được history tham chiếu; không dùng CASCADE
để vô tình xóa history. TTL/cleanup hoặc detach snapshot cần migration của task
thực hiện sau khi policy được chốt. P2 weather/mood không nằm trong schema này.
