# ADR 004 — JSON linh hoạt và lựa chọn database cho Manabi

## Trạng thái

**Proposed, cập nhật 04/10/2026 — chủ dự án đã chốt phạm vi local-first; chờ reviewer Vinh chấp thuận ADR và evidence MANABI-004.** Quyết định phạm vi chưa chứng minh migration Android, repository production hay backend cloud. [ADR-001](ADR-001-technology-stack.md) và [ADR-002](ADR-002-flexible-card-json.md) vẫn là baseline tương thích.

## Bối cảnh

Chủ dự án yêu cầu nội dung card linh hoạt bằng JSON và đánh giá MongoDB. Ngày 04/10/2026, chủ dự án chọn giai đoạn đầu **SQLite trên thiết bị, không tài khoản và không cloud sync**, có nhập/sao lưu JSON. App vẫn chỉ nghiên cứu tiếng Nhật, Android-first, học flashcard/SRS/ba game offline. Prototype [manabi-vocabulary.html](../../../design/prototypes/manabi-vocabulary.html) là tham chiếu UI.

JSON linh hoạt phải đi cùng ownership, lịch ôn, version/migration, nguồn được xác nhận và đồng bộ idempotent. Database linh hoạt không được làm mất các ràng buộc này. [Nghiên cứu database](../../research/DATABASE_FEASIBILITY.md) kiểm tra nguồn chính thức ngày 02/10/2026.

## Quyết định đề xuất

1. **Giai đoạn đầu: SQLite local-first.** Không bật auth, cloud sync hay API storage. `decks.field_schema_json`, template và `cards.fields_json` là JSON có version; `due_at_ms`, trạng thái SRS, review log, content/record version và khóa profile nằm ở cột/bảng riêng để truy vấn và lập chỉ mục. Mỗi card và review event có identity riêng; không nhét lịch sử tăng vô hạn vào JSON.
2. Schema spike gồm `decks`, `cards`, `card_states`, `review_logs`, `media_assets`, `quiz_items`, `sync_ops` cùng bảng tag/search token và `schema_migrations`. `sync_ops` chỉ dự phòng hợp đồng tương lai, không có worker hoặc upload mặc định. SQL minh họa thuộc task MANABI-004 trên nhánh triển khai, chưa là migration app production và không nằm trong gói tài liệu `main`.
3. Repository mobile là cổng ghi/đọc duy nhất: validate envelope và `fieldSchema` trước transaction; ghi card, tag/search token và invalidation liên quan cùng transaction; ghi review event và schedule cùng transaction. Screen không gọi SQL. Search token phải có quy tắc Unicode/tiếng Nhật được chốt và test trước khi dùng production.
4. Migration có `PRAGMA user_version` và sổ `schema_migrations`; kiểm version trước mở DB, nâng cấp theo từng bước transaction, rollback nếu một bước lỗi, không hạ schema âm thầm. Fixture Unicode/custom field và migration từ bản cũ phải được kiểm trên Android trong MANABI-010. Nội dung card dùng `contentVersion`/`contentHash` và xác nhận cùng version/hash trước khi phát AI/ảnh; cách canonical hash cuối cùng chưa được chốt bởi spike.
5. Backup/import là **JSON UTF-8 versioned**, snapshot nhất quán, manifest/count/checksum và validate/preview trước restore transaction. Không xuất key/token; ID trùng cần chính sách keep/copy/replace rõ; version mới không hỗ trợ phải reject. MANABI-004 chỉ chứng minh roundtrip fixture tổng hợp; UI/file picker và restore production thuộc MANABI-022.
6. Offline là mặc định. Khi có task sync sau này, local mutation và outbox phải nguyên tử, server kiểm quyền/baseVersion/idempotency/cursor, conflict không ghi đè im lặng theo đồng hồ client, review log append-only dedup theo event ID. Không coi chọn SQLite, Postgres hay MongoDB là đã có sync.
7. **Cloud là giai đoạn tùy chọn sau review**, giữ Supabase/PostgreSQL JSONB như baseline tương lai trong [DATA_STORAGE_SPEC](../../specs/DATA_STORAGE_SPEC.md); cần auth/RLS, consent, API hosting và migration riêng. MongoDB là phương án thay thế chưa chọn: cần backend/auth/sync/backup riêng và ADR mới trước implementation. Quota Gemini/ảnh cũng thuộc các task pilot sau, không được mở bởi quyết định SQLite.

`profile_id` trong SQL spike là phạm vi guest/local trên một thiết bị, **không** là `owner_id` đã xác thực. Nếu sau này bật tài khoản, API lấy owner từ token server, kiểm RLS/ownership; chuyển dữ liệu guest cần preview/chọn của người học và mapping ID trong transaction. Không tái dùng chuỗi profile local làm quyền cloud.

Chi tiết acceptance/schema/query/retention ở [DATA_STORAGE_SPEC.md](../../specs/DATA_STORAGE_SPEC.md). Việc ADR ở Proposed không tạo task implementation phụ thuộc khi task review chưa được reviewer chấp thuận.

## Lựa chọn đã xét

| Lựa chọn | Nhận định |
| --- | --- |
| SQLite local + JSON backup ở giai đoạn đầu | Đáp ứng core offline với phạm vi vận hành nhỏ; không có sync nhiều thiết bị |
| SQLite local + PostgreSQL JSONB sau này | Đủ linh hoạt; cần Auth/RLS/API, chi phí và sync được review trước khi bật |
| SQLite local + MongoDB qua backend API | Phù hợp document; cần auth/API/deployment và sync riêng, chưa có lợi ích bắt buộc cho MVP |
| Một file JSON lớn hoặc local key-value cho toàn deck/lịch sử | Không chọn cho dữ liệu cốt lõi: truy vấn SRS, transaction, paging, conflict và migration khó kiểm soát |
| Chỉ cloud, không SQLite local | Không đáp ứng luồng học/game offline khi thiếu mạng hoặc AI |

## Căn cứ chính thức

- PostgreSQL JSONB hỗ trợ JSON và index: [JSON Types](https://www.postgresql.org/docs/current/datatype-json.html).
- SQLite/Expo có persistence local: [SQLite JSON](https://www.sqlite.org/json1.html), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
- MongoDB lưu BSON, tối đa 16 MiB/document: [Documents](https://www.mongodb.com/docs/manual/core/document/).
- MongoDB `$jsonSchema` là Draft 4 subset; contract Draft 2020-12 của repo không copy trực tiếp: [$jsonSchema](https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/).
- Atlas Device Sync/Data API/App Services liên quan đã EOL 30/09/2025; không dùng tutorial cloud-sync cũ làm nền: [EOL notice](https://www.mongodb.com/docs/api/doc/atlas-app-services-admin-api-v3/).

## Hosting, chi phí và giới hạn đánh giá ngày 04/10/2026

Giai đoạn local-first không cần database server hay API hosting cho học thẻ; file JSON backup do người học chủ động lưu trên thiết bị. Điều này không tính chi phí thiết bị, build hoặc phân phối app. Cloud sau này cần ngân sách cho API hosting, auth, media và backup riêng. [Supabase Free](https://supabase.com/pricing) hiện ghi 500 MB database, 5 GB egress, không có automatic backup và pause sau một tuần không hoạt động. [Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) hiện ghi 0,5 GB dữ liệu gồm index, 100 operations/giây và pause sau 30 ngày không kết nối; không cung cấp offline sync. Đây là giới hạn dịch vụ tại ngày kiểm tra, không phải kết quả benchmark Manabi hoặc cam kết gói miễn phí lâu dài.

## Hệ quả và kế hoạch kiểm chứng

Nội dung card vẫn tùy biến mà không tạo migration database cho mỗi field. Nhóm phải có validator theo schema deck, migration có fixture, RLS/ownership test, sync conflict/idempotency và reservation quota có test đồng thời. JSON không được chạy code hoặc template tùy ý.

Task data/backend cần benchmark fixture 10.000 card trên Android thật, đo query/import/sync/size và lưu evidence. Đây là kế hoạch, chưa có claim hiệu năng. Đánh giá lại database nếu query/capacity thực tế, môn học hoặc kinh nghiệm team tạo lý do cụ thể; không triển khai hai backend cùng lúc trong MVP.

ADR chỉ được chuyển Accepted sau review theo [Definition of Done](../../project/DEFINITION_OF_DONE.md). Chưa có migration database hoặc dịch vụ mới nào được tạo bởi việc viết ADR này.
