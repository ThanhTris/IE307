# Đặc tả lưu trữ dữ liệu — Manabi

Trạng thái: **Proposed — đặc tả để review và triển khai theo task**. Cập nhật ngày 02/10/2026. Tài liệu mô tả hợp đồng logic, chưa chứng minh database, migration hoặc backend đã chạy.

Liên kết yêu cầu: FR-02, FR-03, FR-06, FR-11, FR-13, FR-14, FR-15, FR-16, FR-17; NFR-03, NFR-04, NFR-05, NFR-08, NFR-09, NFR-12 trong [yêu cầu sản phẩm](../product/PRODUCT_REQUIREMENTS.md). Căn cứ: [CARD_JSON_SPEC.md](CARD_JSON_SPEC.md), [SRS_SPEC.md](SRS_SPEC.md), [AI_QUIZ_SPEC.md](AI_QUIZ_SPEC.md), [IMAGE_CONTEXT_SPEC.md](IMAGE_CONTEXT_SPEC.md), [API_CONTRACT.md](../architecture/API_CONTRACT.md) và [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md).

## 1. Mục tiêu và lựa chọn database

Nội dung card phải linh hoạt theo người học, đồng thời truy vấn lịch ôn, kiểm tra quyền, migration và đồng bộ có thể tái lập. Giữ phương án hiện có: SQLite trên mobile, PostgreSQL/Supabase khi người dùng chọn đồng bộ. `fields` và `fieldSchema` lưu JSON ở SQLite và JSONB ở PostgreSQL; metadata dùng cột/index riêng. Không chuyển sang MongoDB chỉ vì cần JSON. [Đánh giá MongoDB](../research/DATABASE_FEASIBILITY.md) ghi phương án thay thế chưa được chọn.

Mobile đọc/ghi qua local repository. API và database cloud không được chặn flashcard, lịch ôn hoặc Matching/Four Choices/Word Ninja đã có dữ liệu. Prototype [manabi-vocabulary.html](../../design/prototypes/manabi-vocabulary.html) là tham chiếu giao diện.

## 2. JSON linh hoạt nhưng có hợp đồng

- Deck định nghĩa `fieldSchema` và `cardTemplates`; card chứa `fields` theo schema của deck. `fieldKey` ổn định khi đổi label, có grammar `^[a-z][a-z0-9_]{0,63}$`.
- Nội dung có thể là từ, cách đọc, nghĩa, ví dụ hoặc ghi chú theo phạm vi card tiếng Nhật. Dữ liệu ảnh/audio chỉ là reference đã được kiểm tra; không đặt binary/base64 không giới hạn vào card.
- `schemaVersion` xác định cấu trúc; `contentVersion` và `contentHash` xác định phiên bản nội dung. `confirmedContentVersion`/`confirmedContentHash` chỉ khớp nội dung mà người học đã xác nhận. Khi sửa trường tham gia quiz, sense hoặc mapping hỏi–đáp, tăng phiên bản và thu hồi xác nhận cho phiên bản mới.
- Ownership, lịch ôn, lịch sử học, consent, quota, provenance AI, trạng thái duyệt ảnh và khóa đồng bộ không nằm trong `fields` người dùng tùy biến.
- Validator kiểm tra envelope và kiểm tra `fields` theo đúng `fieldSchema`/version. Không chấp nhận key nguy hiểm như `__proto__`, `constructor`, `prototype`, key không theo grammar, type sai, độ dài/kích thước vượt cấu hình hoặc reference không hợp lệ.
- JSON Schema không phải cơ chế chạy code. Template chỉ là danh sách field có thể hiển thị; không cho thực thi JavaScript, SQL, HTML tùy ý hoặc biểu thức từ file import. Markdown nếu có phải render an toàn, không chạy raw script.
- Cấu hình giới hạn gồm số field, độ dài text, kích thước card/file import, số event/batch và độ sâu JSON; có version, thống nhất client/server và phải chốt trong task trước implementation. Các giới hạn không được thay đổi âm thầm giữa hai bên.

Các schema trong `schemas/` hiện là hợp đồng dữ liệu mẫu; task persistence phải bổ sung contract/migration metadata trước khi bật sync/AI. Không diễn giải dữ liệu mẫu là database production đã hoàn chỉnh.

## 3. Các thực thể logic

Tên bảng dưới đây là thiết kế logic. Tên vật lý snake_case ở SQLite/PostgreSQL có thể khác tên camelCase ở API, nhưng mapping phải có test.

| Thực thể | Dữ liệu tối thiểu | JSON hoặc record riêng |
| --- | --- | --- |
| `decks` | `id`, `ownerId`, `name`, `schemaVersion`, `recordVersion`, timestamps, `deletedAt` | `fieldSchema`, `cardTemplates`, mapping hỏi–đáp có version |
| `cards` | `id`, `ownerId`, `deckId`, `schemaVersion`, `contentVersion`, `contentHash`, xác nhận nội dung, `recordVersion`, timestamps, `deletedAt` | `fields`, tags; không chứa toàn bộ lịch sử |
| `card_schedules` | `ownerId`, `cardId`, `templateId`, `state`, `dueAt`, `lastReviewedAt`, tham số scheduler, `reps`, `lapses`, `schedulerVersion`, `recordVersion` | Schedule là metadata truy vấn được |
| `review_events` | `eventId`, `ownerId`, `cardId`, `templateId`, rating trực tiếp, thời gian, scheduler/source version | Append-only; không ghi quiz thành rating trực tiếp |
| `game_sessions`/`game_attempts` | Session/attempt ID, owner, game type, card/source version, lựa chọn đầu, kết quả, eligibility | Tín hiệu game độc lập với review trực tiếp |
| `quiz_items` | Owner, item/version, nguồn card/version/hash, direction/sense, prompt/model/validator version, review status | Stem/options/explanation và provenance có schema |
| `quiz_attempts` | `attemptId`, owner, item/version, source hash, lựa chọn đầu, kết quả, eligibility/reason | Append-only; câu lỗi/stale không đổi SRS |
| `image_assets`/`image_card_links` | URL/ID nguồn, tác giả, license/ghi công, thời điểm kiểm tra, card/hash/sense, trạng thái duyệt | Mapping ảnh–nghĩa có version, không sửa card |
| `sync_outbox` | Event ID, owner local/account scope, entity ID/type, operation, base version, device ID, status/retry | Local payload versioned; không chứa secret |
| `sync_changes`/`sync_receipts` | Server sequence, owner, event ID, canonical version, kết quả accepted/conflict | Pull cursor và idempotency durable |
| `consents` | Owner, policy/provider version, purpose, trạng thái, granted/revoked time | Backend xác minh trước gọi dịch vụ ngoài |
| `ai_daily_usage`/`ai_reservations` | Owner, day bucket/timezone, approved/reserved counts, request/reservation ID, expiry/status | Counter atomic; tách provider budget |

Lưu `card_schedules` riêng để nội dung card không bị đổi version khi người học chỉ ôn bài. Khóa logic `(ownerId, cardId, templateId)` duy nhất. MVP có thể dùng một template học mặc định; việc phát thêm hướng/template không được tạo lịch trùng mà chưa có policy. Metadata card và schedule vẫn nằm ngoài `fields` JSON.

ID dùng định danh ổn định xuyên local/API/cloud; server không đổi ID khi đồng bộ. Timestamp API là ISO 8601 UTC. Local chọn kiểu integer epoch hoặc text UTC nhất quán và test round trip. Không dùng giờ hiển thị theo thiết bị để quyết định quyền/quota.

## 4. Quy tắc xác nhận và hash nguồn

`contentHash` tính từ biểu diễn canonical có version: nội dung dùng cho học/quiz, sense mục tiêu, hướng và mapping field liên quan. Phải xác định rõ chuẩn Unicode, thứ tự key và serialization; không hash raw JSON có khoảng trắng/thứ tự key tùy ý. `hashAlgorithmVersion` được lưu để nâng cấp.

Card được phát vào AI chỉ khi không xóa/archive, đã học, có một nghĩa mục tiêu rõ và:

```text
confirmedContentVersion == contentVersion
confirmedContentHash == contentHash
```

Câu quiz/mapping ảnh chỉ được phát khi version/hash của nguồn còn khớp. Mọi card đáp án nhiễu cũng cần source version/hash; không chỉ kiểm tra card đáp án đúng. Đổi `fieldSchema` hoặc mapping deck làm các nguồn liên quan stale theo rule migration, kể cả khi raw `fields` không đổi.

Quiz không được tự ghi nghĩa/cách đọc mới vào card. Một câu đã báo lỗi hoặc mất nguồn có thể giữ attempt/version cho truy vết theo retention policy nhưng không được tạo tín hiệu lịch ôn mới.

## 5. Truy vấn và index dự kiến

Index phải xuất phát từ truy vấn thực tế và kiểm tra query plan trên fixture. Không tạo index mọi key JSON người dùng tự thêm.

| Truy vấn | Index/constraint dự kiến |
| --- | --- |
| Deck của tài khoản, còn hiệu lực | `decks(owner_id, deleted_at, updated_at, id)` |
| Card trong deck, phân trang | `cards(owner_id, deck_id, deleted_at, id)` |
| Card đến hạn | `card_schedules(owner_id, due_at, card_id)` và index `(owner_id, deck_id, due_at, card_id)` nếu schedule có `deck_id` kiểm soát |
| Review theo card | `review_events(owner_id, card_id, reviewed_at, event_id)` |
| Chống replay review/quiz/sync | Unique key theo owner + event/attempt/request ID |
| Pull thay đổi | `sync_changes(owner_id, server_sequence)` với cursor ổn định |
| Source invalidation | `quiz_items(owner_id, source_card_id, source_content_version, review_status)` và bảng quan hệ nguồn ứng viên nếu cần |
| Giới hạn AI mỗi ngày | Unique `ai_daily_usage(owner_id, day_bucket, timezone)`; unique reservation request theo owner |

Ví dụ query logic card đủ điều kiện, không phải migration SQL hoàn chỉnh:

```sql
SELECT c.id, c.fields, c.content_version, c.content_hash
FROM cards AS c
JOIN card_schedules AS s
  ON s.owner_id = c.owner_id AND s.card_id = c.id
WHERE c.owner_id = :authenticated_owner
  AND c.deck_id = :deck_id
  AND c.deleted_at IS NULL
  AND s.state <> 'new'
  AND c.confirmed_content_version = c.content_version
  AND c.confirmed_content_hash = c.content_hash
ORDER BY s.due_at, c.id
LIMIT :bounded_limit;
```

Backend còn kiểm tra archive, consent, sense, hướng/mapping và schema trước tạo quiz. `owner_id` lấy từ JWT hợp lệ; không tin owner do client gửi. PostgreSQL bật và test RLS cho tất cả bảng có dữ liệu người học. JSONB GIN/expression index chỉ thêm khi query tìm nội dung thật cần; chức năng tìm kiếm local phải thống nhất normalization tiếng Nhật.

## 6. Transaction, outbox và đồng bộ

1. Tạo/sửa card: validate → ghi card, invalidation và outbox trong một SQLite transaction. Không báo thành công khi mới ghi một phần.
2. Ôn flashcard: ghi review event, cập nhật schedule và outbox trong cùng transaction. Game/quiz attempt tạo event riêng và policy riêng; shadow mode chưa đổi schedule thật.
3. Worker gửi batch có giới hạn, `eventId`, `entityId`, `baseVersion`, `deviceId`; mỗi operation idempotent. Retry dùng cùng ID, không tạo review thứ hai.
4. Backend kiểm tra quyền và version, commit canonical change và receipt cùng transaction. Unique ID ngăn cùng request bị tính quota/cập nhật lịch hai lần.
5. Nếu base version khác canonical version, trả conflict có các version cần thiết. Không dùng last-write-wins dựa đồng hồ client để ghi đè lịch sử im lặng. Card nội dung có preview/resolve; review event bất biến được gộp theo ID rồi replay scheduler theo ordering đã định nghĩa.
6. Pull dùng server cursor ổn định và page limit, có tombstone. Client apply page và cursor nguyên tử; mất mạng giữa page không được bỏ qua thay đổi.
7. Guest/local owner scope tách khỏi account scope. Đăng nhập, đăng xuất, nhập local vào account hoặc đổi tài khoản cần lựa chọn/transaction và test; không tự đẩy deck local sang tài khoản mới.

Backoff, thời hạn receipt/tombstone và offline window tối đa phải có cấu hình được reviewer duyệt. Nếu cursor quá cũ sau purge, trả `RESYNC_REQUIRED` và tạo snapshot kiểm soát; không giả vờ delta đã đủ.

## 7. Quota AI và reservation

Pilot dùng key Gemini của admin ở backend. Hạn mức sản phẩm là **10 câu mới được duyệt/người/ngày**, không phải 10 HTTP request và không phải 10 lượt chơi lại. Ngày là calendar day của server theo `Asia/Ho_Chi_Minh`; thiết bị đổi múi giờ không tạo quota mới. Ngày reset RPD của Google theo Pacific và RPM/TPM là giới hạn khác; theo dõi provider budget riêng theo project/model hiện hành.

- Mỗi request có `requestId` ổn định; request lặp trả receipt hiện có. Lượt chơi lại cùng `itemId`/version đã sở hữu không trừ thêm quota tạo mới.
- Trước lời gọi Gemini, backend atomically reserve tối đa số slot còn lại sao cho `approvedNewQuestions + activeReservedQuestions + requestedSlots <= 10`. Cạnh tranh nhiều thiết bị phải bị ràng buộc tại server, không chỉ bằng nút disabled ở UI. Counter `generationRequestsUsed` cùng day bucket giới hạn tối đa 2 lượt tạo/user/ngày, mỗi request regular `generateContent` tối đa 5 nháp; không phải Batch API và không có lượt bù semantic lỗi vô hạn.
- Chỉ sau auth/ownership, consent, eligibility/source hash và reservation mới gọi provider. Đồng thời kiểm tra global request/token/burst budget để một key chung không bị hết hạn mức do số tài khoản tăng.
- Draft hợp lệ chưa duyệt không phải câu đã kiểm chứng. Khi câu được duyệt và nguồn còn khớp, commit đúng số slot mới vào `approvedNewQuestions` trong transaction cùng trạng thái item/receipt. Không vượt số slot đã reserve.
- Câu rejected/nguồn thay đổi dùng release cho slot chưa commit. Chúng vẫn tiêu tốn provider request/token budget; tối đa 1 retry tạm thời có backoff/request dùng cùng request ID và vẫn tính provider cap, không được retry vô hạn vì counter 10 câu còn trống. Poll/replay receipt không tạo generation request mới.
- Reservation có TTL/status và job reconcile. Crash/timeout không làm mất slot vĩnh viễn hoặc mở hai lần. Nếu draft được duyệt sau khi reservation hết hạn hoặc ngày server khác ngày reserve, release slot cũ và reserve/recheck quota ngày hiện tại trước approve; không tự ghi approved vượt hạn mức.
- Cache chỉ tái dùng khi quyền, nguồn/hash, prompt/model/validator version và approval còn hợp lệ. Không chia sẻ nội dung deck riêng giữa owner. `approvedQuestionAssignmentId` unique kiểm soát cấp câu mới: assignment mới được duyệt cho người dùng áp quota mới, lấy lại assignment/item/version đã có dùng idempotency/replay và không trừ lần hai.
- Client mất mạng/429/global budget exhausted vẫn dùng game/flashcard offline. Không thay quota bằng trạng thái lịch ôn trong JSON card.

Provider cap, batch size, TTL và retry budget là cấu hình deployment cần đối chiếu AI Studio trước demo; spec không tự cam kết Free Tier cung cấp một số request/ngày cố định.

## 8. Xóa, backup và migration

- Archive chỉ loại khỏi học/quiz; không tương đương xóa tài khoản. Xóa card/deck tạo tombstone, thu hồi quiz/ảnh nguồn liên quan và sync tới thiết bị khác.
- Purge theo retention policy đã duyệt; khi xóa account phải xử lý card, schedule, event, quiz, consent, reservations và dữ liệu cloud/cache thuộc account. Lịch sử cần cho nghiên cứu không được giữ dữ liệu định danh mặc định.
- Nguồn ảnh dùng chung và ghi công độc lập với nội dung deck có quy tắc retention riêng; chỉ xóa reference thuộc người học khi thích hợp. Không tái sử dụng nội dung deck đã xóa trong cache AI.
- Backup JSON versioned chứa deck/card/schedule/event thuộc phạm vi người học chọn và manifest hash. Không xuất key/token, service credentials hoặc cache vận hành. Import lại phải validate/version-check, preview duplicate/merge và rollback khi lỗi.
- Nâng schema deck có preview ảnh hưởng, migration tái lập và fixture. Đổi label không đổi field key; đổi type/xóa field cần policy giữ/map/xóa dữ liệu. Không rewrite mọi thẻ chỉ vì label đổi.
- Migration database chạy nguyên tử hoặc có checkpoint/rollback đã kiểm thử; version không tăng nếu bước dữ liệu thất bại. Export trước thao tác mất dữ liệu, migration có thể resume sau app bị đóng.

## 9. Acceptance và evidence cho task triển khai

Đây là các kiểm tra cần làm, chưa phải kết quả đã đạt:

1. Fixture 10.000 card tiếng Nhật với nhiều schema/Unicode/tag; đo query card đến hạn, phân trang, memory, thời gian import/sync và database size trên Android thật. Ghi thiết bị, build, dataset seed, query plan và p50/p95; ngưỡng theo NFR/task, không tự công bố hiệu năng chưa đo.
2. Invalid JSON, unsafe key, type/length sai, thiếu required field, media reference sai và template code bị từ chối; schema migration giữ dữ liệu đúng.
3. Hai tài khoản A/B không đọc/ghi/card-ID scan dữ liệu của nhau; không có API key/database secret trong mobile/export/log.
4. Offline→online, batch retry, app crash giữa transaction/page, event trùng, hai thiết bị sửa cùng card, clock skew và cursor hết retention không mất/nhân đôi lịch sử.
5. Card/source candidate sửa khi Gemini đang chạy làm output stale; content/hash/confirmation mismatch không được phát quiz/ảnh hoặc tạo learning signal.
6. Hai request đồng thời khi còn một slot không tạo hơn 10 câu mới/ngày; retry không trừ hai lần; rejected/expired reservation được reconcile; Google project quota độc lập với ngày sản phẩm.
7. Xóa/restore/purge, export→import round trip, guest→account và đổi account không trộn ownership. Service AI lỗi không chặn flow học offline.

Task phải lưu test/evidence, có reviewer khác người thực hiện và human approval theo [Definition of Done](../project/DEFINITION_OF_DONE.md). Không đánh dấu Done chỉ vì spec đã được viết.
