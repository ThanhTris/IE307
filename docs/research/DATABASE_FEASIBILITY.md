# Đánh giá JSON và MongoDB cho Manabi

Ngày kiểm tra nguồn: 04/10/2026. Trạng thái: **nghiên cứu và host SQLite spike MANABI-004**, chưa có benchmark Android, migration app hay backend triển khai. Tài liệu không thay thế task, spec hoặc review kiến trúc.

## Kết luận đề xuất

MongoDB phù hợp kỹ thuật với card có trường tùy biến. Tuy nhiên, JSON là cách biểu diễn nội dung; chọn JSON không bắt buộc chọn MongoDB. Chủ dự án chốt **SQLite local-first, chưa có auth/cloud sync trong giai đoạn đầu** ngày 04/10/2026; backup/import dùng JSON versioned. Supabase/PostgreSQL JSONB là hướng tùy chọn sau review, MongoDB chưa được chọn. [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md) giữ trạng thái Proposed đến khi reviewer Vinh đánh giá spike.

## 1. Yêu cầu dữ liệu thật của ứng dụng

Người học có thể thêm các field như từ, cách đọc, nghĩa, ví dụ, mẹo nhớ và reference ảnh. Deck có `fieldSchema` có version; card có `fields` JSON. Nội dung linh hoạt nhưng `ownerId`, trạng thái/lịch SRS, khóa/version đồng bộ, xác nhận nghĩa, quota và lịch sử vẫn có cấu trúc kiểm soát. Thiết kế cụ thể ở [DATA_STORAGE_SPEC.md](../specs/DATA_STORAGE_SPEC.md).

Không lưu mọi card/history của deck vào một JSON lớn. Mỗi card/event có identity và lifecycle riêng; điều này giảm phạm vi conflict, cho phân trang, index và cập nhật nhỏ. Ảnh/audio không đặt binary không giới hạn trong card.

## 2. So sánh hai phương án

| Tiêu chí | SQLite + Supabase/PostgreSQL JSONB | SQLite + API + MongoDB Atlas |
| --- | --- | --- |
| Nội dung tùy biến | JSON/JSONB, version và validator | Embedded BSON document, version và validator |
| Học/game offline | SQLite local; sync phải thiết kế | SQLite local; sync phải thiết kế |
| Auth/quyền | Supabase Auth và PostgreSQL RLS theo owner | Chọn auth provider và kiểm tra owner tại API |
| Truy vấn SRS | Cột/index rõ; JSONB cho nội dung | Field/index rõ; không để SRS trong user fields |
| Backend cho Gemini | Edge Function và secrets | Backend/Function riêng và secrets |
| Review/history/statistics | Quan hệ, constraint và transaction | Collections/reference/aggregation; thiết kế transaction |
| Công tích hợp | Phù hợp baseline, ít module vận hành mới | Thêm API, auth integration, deployment, permissions |
| Rủi ro chính | RLS sai, sync/conflict và quota gói miễn phí | API authorization, sync/conflict, gói miễn phí và tutorial App Services đã EOL |

Đánh giá công việc trong bảng là suy luận từ kiến trúc Manabi và khả năng sản phẩm, không phải số liệu đo thời gian triển khai. Không có phương án nào tự giải quyết đồng bộ nhiều thiết bị chỉ bằng việc chọn database.

## 3. PostgreSQL và SQLite đã hỗ trợ JSON

PostgreSQL có kiểu `json`/`jsonb`, toán tử truy vấn và index cho JSONB. Cách lưu `fields` JSONB cộng metadata/cột chuẩn hóa cho phép thêm trường nội dung mà không tạo migration cho mỗi field người dùng định nghĩa. SQLite có chức năng JSON; Expo SQLite lưu database qua lần khởi động app. [PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html), [Supabase JSON](https://supabase.com/docs/guides/database/json), [SQLite JSON functions](https://www.sqlite.org/json1.html), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)

Supabase có Auth/RLS để kiểm soát row theo user; team vẫn phải viết và test policy, không coi bật Supabase là đủ an toàn. SQLite là persistence local, không cung cấp sync cloud tự động. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Expo local-first](https://docs.expo.dev/guides/local-first/)

## 4. MongoDB phù hợp khi được thiết kế đúng

MongoDB lưu BSON, document nhị phân kiểu JSON có thêm kiểu như Date; không phải file JSON nguyên văn. Document có thể có field khác nhau và MongoDB hỗ trợ schema validation. Nếu áp dụng, giữ mỗi card/document riêng, `fields` là nội dung tùy biến và metadata có type ổn định. Document tối đa 16 MiB; không embed mảng card/history tăng vô hạn trong deck. [MongoDB documents](https://www.mongodb.com/docs/manual/core/document/), [MongoDB schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/)

Kiến trúc thay thế khả thi:

```text
Android app → SQLite + outbox
                    ↓ HTTPS/JWT
                 Backend API → MongoDB Atlas qua driver
                    ↓
                 Gemini/nguồn ảnh
```

API phải validate auth và ownership ở mọi thao tác, áp quota, quản lý secret và conflict; mobile không có connection string database. Index theo owner/deck/dueAt/version, không theo mọi field tự do. Operation một document nguyên tử; chuỗi nhiều document cần transaction hoặc event/outbox đảm bảo retry/replay. [MongoDB compound indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/), [MongoDB atomicity/transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

### Không copy trực tiếp JSON Schema của repo

Contract trong `schemas/` dùng Draft 2020-12 có `$ref`/`$defs`. MongoDB `$jsonSchema` theo Draft 4 subset, không hỗ trợ một số keyword như `$ref`, `$schema`, `format`, và cần `bsonType` cho integer BSON. Migration phải tạo validator BSON envelope riêng và vẫn kiểm tra `fields` theo schema deck ở app/backend. Đây là công bổ sung cụ thể khi đổi DB. [MongoDB $jsonSchema](https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/)

### Không dựa vào tutorial Realm/Atlas Sync cũ

Thông báo chính thức ghi Atlas Device Sync, SDKs cloud, Data API và nhiều App Services đã EOL ngày 30/09/2025, có tác động tới auth/user management/functions/permissions liên quan. Không chọn chúng làm hạ tầng sync mới. MongoDB database/Atlas và driver không bị hiểu là đã ngừng hoạt động; Realm persistence local nguồn mở là vấn đề khác với dịch vụ cloud sync đã retired. [Thông báo EOL App Services](https://www.mongodb.com/docs/api/doc/atlas-app-services-admin-api-v3/)

## 5. Gói miễn phí và chi phí demo

Atlas Free hiện giới hạn 0,5 GB BSON chưa nén cộng index, 500 connections, 100 operations/giây và 10 GB vào/10 GB ra mỗi chu kỳ 7 ngày. Không có managed backup; tự pause sau 30 ngày không hoạt động. Demo nhỏ có thể dùng gói này, nhưng API host, auth, media storage và backup là phần riêng. [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)

Supabase Free hiện có 500 MB database, 1 GB file storage và 5 GB egress; project pause sau một tuần không hoạt động và automatic backup không bao gồm. Hai lựa chọn đều cần kế hoạch export/restore và kiểm tra hoạt động trước demo; không cam kết vận hành miễn phí vô hạn. [Supabase pricing](https://supabase.com/pricing)

Ước lượng dung lượng minh họa, chưa đo: 6 tài khoản × 1.000 card × khoảng 2 KiB/card ≈ 11,7 MiB raw; 6 × 50 lượt ôn/ngày × 60 ngày × 0,5 KiB/event ≈ 8,8 MiB raw. Index, quota/quiz/sync metadata làm tăng tổng; ảnh không nằm trong giả định này. Dùng fixture 10.000 card và lịch sử có seed để đo lại trước quyết định capacity.

## 6. Điều kiện nếu owner muốn chuyển MongoDB

1. Spike trên fixture thật: CRUD/JSON validation, query SRS/index, migration/version, ownership A/B và export/import.
2. Chốt auth provider, backend deployment, secret manager, media storage, backup và cost limit; không chỉ chọn tên database.
3. Chốt outbox/idempotency/cursor/conflict/tombstone và transaction review-event/schedule.
4. Chốt counter/reservation quota 10 câu mới được duyệt/người/ngày; kiểm thử đồng thời trước gọi Gemini.
5. Review ADR thay ADR-001, sửa system/API contracts và task/dependencies; chỉ sau quyết định mới triển khai adapter MongoDB.

Giữ repository interface và JSON contract trung lập để có thể nghiên cứu adapter khác sau. Không triển khai cả hai backend trong MVP vì làm tăng đáng kể phạm vi kiểm thử và đồng bộ.

## 7. Evidence host SQLite của MANABI-004

Spike MANABI-004 trên nhánh triển khai dùng SQLite đi kèm Python, SQL migration v1 và fixture hai `fieldSchema`/bốn card tiếng Nhật tổng hợp. Kết quả máy host ghi SQLite 3.50.4, `PRAGMA user_version=1`, bốn truy vấn due/search/tag/version đều có index trong `EXPLAIN QUERY PLAN`; có kiểm Unicode/custom field, scope local, rollback khi event ID trùng và JSON backup roundtrip/checksum sai không ghi dữ liệu. Runner và evidence thuộc task triển khai, không nằm trong gói tài liệu `main`. Đây là chứng cứ khả thi của schema trên máy host, chưa đo p50/p95 với 10.000 card trên Android, chưa test RLS/cloud hoặc migration nâng cấp từ DB người dùng thật.
