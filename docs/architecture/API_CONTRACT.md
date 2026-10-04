# Hợp đồng API — Manabi

Trạng thái: **Proposed, chưa triển khai**; chờ human review MANABI-001/task API. Cập nhật 02/10/2026. Core dùng SQLite offline; endpoints không là điều kiện mở flashcard/game. Baseline Supabase Auth + PostgreSQL JSONB/RLS, chưa chọn MongoDB.

Nguồn: [DATA_STORAGE](../specs/DATA_STORAGE_SPEC.md), [AUTH_SYNC](../specs/AUTH_SYNC_SPEC.md), [AI_QUIZ](../specs/AI_QUIZ_SPEC.md), [IMAGE_CONTEXT](../specs/IMAGE_CONTEXT_SPEC.md), [DATA_PRIVACY](../specs/DATA_PRIVACY_SPEC.md). Ví dụ chưa thay schema/migration executable trong task.

## 1. Quy ước

- JSON UTF-8, UTC ISO 8601, contract/schema version/capability negotiation. Owner do server lấy từ JWT, không tin client ownerId.
- Payload/batch/fields bounded theo config versioned; reject key/type/version/code/query/operator không hợp lệ.
- Sync write có eventId/entityId/baseVersion/deviceId; create baseVersion 0. Mutation khác có requestId/idempotency; retry cùng ID trả receipt, không thực hiện provider/mutation hai lần.
- Không client service-role/Gemini key/connection string. Backend auth/consent/source/quota trước mọi provider call.
- Error chuẩn: code/message/retryable/requestId/details. Details metadata an toàn, không raw card/prompt/secret.
- HTTP 401 auth; 403 quyền/policy; 409 source/version; 422 validation; 429 quota; 503 tạm unavailable. Poll đọc status không gọi Gemini.
- Reviewer role do server xác minh, không client tự nhận.

## 2. Nhóm API dự kiến

| Nhóm | Cơ chế | Trách nhiệm |
| --- | --- | --- |
| Auth | Supabase Auth | Login/refresh/logout; secure session |
| Deck/card | RLS read; sync RPC/function write | Owner/canonical/version/receipt, không bypass sync |
| Sync | POST /functions/v1/sync | Push events/pull cursor, conflict/tombstone |
| Consent | POST /functions/v1/consent | Grant/revoke purpose/policy version server |
| Quiz create | POST /functions/v1/generate-quiz | Tối đa 5 nháp/lượt, reservation/source/validator |
| Quiz status | GET /functions/v1/quiz-request?requestId=… | queued/running/needs_review/ready/rejected/expired |
| Quiz review | POST /functions/v1/review-quiz | Reviewer độc lập approve/reject, assignment/quota commit |
| Quiz attempt/report | POST /functions/v1/quiz-attempt; POST /functions/v1/report-quiz | Attempt đầu idempotent; report dừng phát câu lỗi |
| Ảnh | GET /functions/v1/image-context?deckId=…&cardId=… | Đọc câu ảnh đã duyệt, không live search mỗi lượt |
| Image report | POST /functions/v1/report-image | Dừng mapping lỗi, lý do bounded |
| Account deletion | POST /functions/v1/delete-account | Reauth/scope preview, purge job idempotent |
| Backup/import | Local transaction/file picker | Version/checksum/preview/ownership, sync sau consent |

Task có thể nhóm handlers khác nhưng phải version/update contract trước đổi semantics. Bảng không yêu cầu xây thêm admin UI hoặc auth provider mới.

## 3. Sync

Request minh họa:

~~~json
{
  "contractVersion": 1,
  "deviceId": "device_01",
  "cursor": "cursor_00012",
  "events": [
    {
      "eventId": "event_01",
      "deviceId": "device_01",
      "entityType": "card",
      "entityId": "card_01",
      "operation": "upsert",
      "baseVersion": 3,
      "clientUpdatedAt": "2026-10-02T06:00:00Z",
      "payload": {
        "schemaVersion": 1,
        "fields": { "term": "学校", "meaning": "trường học" }
      }
    }
  ]
}
~~~

Đây là payload fragment, không card hoàn chỉnh đã validate. Task mở schema/capability cho schedule/game/quiz và metadata; sync-event.schema.json mẫu chưa hỗ trợ mọi entity, không đổi enum im lặng.

Response có acceptedEventIds/conflicts/changes/nextCursor/hasMore/serverTime và canonical versions. Conflict gồm entityId, base/current version và server/client record được phép xem; không echo log. Canonical+receipt+change commit một transaction; local apply page+cursor nguyên tử. Receipt lặp không ghi lại event.

Review-events append-only dedup/replay theo ordering/scheduler policy; server không tin client viết dueAt tùy ý. Card_schedules tách contentVersion. Tombstone xóa/archive, stale outbox không resurrect. Cursor quá retention trả RESYNC_REQUIRED và snapshot flow theo task. [AUTH_SYNC](../specs/AUTH_SYNC_SPEC.md)

## 4. Consent/policy

Grant/revoke có requestId/purpose/policyVersion/action, gắn authenticated account/server timestamps và UI evidence theo task. Client consent=true không thay record consent server. Revoke chặn call mới/queued chưa chạy, không hứa thu hồi nội dung đã gửi provider.

Pilot Gemini chỉ card demo không nhạy cảm đã sync/học/xác nhận và một sense rõ. Tuổi/vùng/tier chưa chốt hoặc không hợp lệ trả AI_POLICY_BLOCKED; private deck chặn mặc định, cần data/provider decision riêng. Guest/core vẫn học offline.

## 5. Generate quiz

JWT và Idempotency-Key khớp requestId. Input IDs/version/direction, không raw cả deck/key:

~~~json
{
  "requestId": "quiz_request_01",
  "deckId": "deck_01",
  "targetCardIds": ["card_01", "card_02"],
  "candidateCardIds": ["card_03", "card_04", "card_05", "card_06"],
  "direction": "term_to_meaning",
  "quizSpecVersion": 1,
  "expectedSources": [
    { "cardId": "card_01", "contentVersion": 2, "contentHash": "sha256:..." },
    { "cardId": "card_02", "contentVersion": 1, "contentHash": "sha256:..." }
  ]
}
~~~

Target IDs unique, tối đa 5; candidate list bounded theo config và ownership. Server kiểm schema/learned/confirmed version+hash/mapping/sense/ba nhiễu khác nghĩa, snapshot mọi sources. Correct answer ghép từ card; Gemini chỉ draft stem/candidate IDs/explanation, không sửa card/answer.

Quota: 10 câu mới đã duyệt cấp/user/calendar day Asia/Ho_Chi_Minh, tối đa 2 lượt tạo/ngày; server-derived date. Transaction reservation bảo đảm reserved + approved ≤ 10 trước gọi provider và counter generationRequestsUsed không vượt 2. Regular generateContent tối đa 5 nháp/request, tối đa 1 retry tạm thời có backoff/request, mọi retry/reject tính provider budget. Không bù semantic lỗi vô hạn.

Global request/token/RPM cap theo project thật riêng với product quota; Google RPD Pacific không cùng ngày quota sản phẩm. Không đủ slots/candidates thì giảm/bỏ yêu cầu, không ép 10 câu.

Receipt minh họa:

~~~json
{
  "requestId": "quiz_request_01",
  "status": "needs_review",
  "draftItemIds": ["quiz_01", "quiz_02"],
  "quota": {
    "date": "2026-10-02",
    "timezone": "Asia/Ho_Chi_Minh",
    "newApprovedLimit": 10,
    "approved": 0,
    "reserved": 2,
    "generationRequestsUsed": 1,
    "generationRequestsLimit": 2,
    "resetsAt": "2026-10-02T17:00:00Z"
  }
}
~~~

queued/running có thể HTTP 202; needs_review chưa là ready. Poll/replay cùng requestId không provider call, không generation request mới. Cạn quota/global budget trả RATE_LIMITED + fallback local. Reservation TTL/status/reconcile có version theo DATA_STORAGE.

## 6. Duyệt/assignment/cache

Reviewer độc lập người biết tiếng Nhật, server-authorized. Request có requestId/itemId/itemVersion/sourceHash/decision/reason bounded; kiểm lại sources/policy/consent và reservation. Expired hoặc ngày server hiện tại khác reservation day thì release slot cũ và reserve/recheck ngày hiện tại trước approve. Approved item/assignment/counter commit cùng transaction; approvedQuestionAssignmentId unique chống cấp/trừ hai lần. Rejected/expired release slot nhưng không hoàn provider budget.

Resource ready có item/assignment/version, stem/options, sources target+candidates hashes, provenance model/prompt/validator, reviewStatus và expiry. Task chốt answer/explanation chỉ ở review/feedback flow; nháp chưa duyệt không phát như verified, lời giải model không sửa card.

Cache theo owner/quyền + sources/direction/sense/schema/prompt/model/validator. Chơi lại cùng assignment/version không gọi Gemini/trừ câu mới; assignment mới áp quota cấp mới. Source/mapping/sense đổi hoặc report làm stale/suspend. Cache private A không cho B.

## 7. Attempt/report

Attempt có attemptId/assignmentId/itemVersion/sourceHash/firstOptionId/answeredAt và session metadata tối thiểu. Backend kiểm quyền/approval/source/lựa chọn đầu và đối chiếu answer nguồn; retry receipt không thêm attempt. Câu reported/stale hoặc vừa thấy answer lúc duyệt có signalEligibility=false/reason; không ghi thành rating Again/Hard/Good/Easy.

Report có requestId/assignmentId/itemVersion/category/note bounded; dừng phát tới review lại. Invalid signal không sửa SRS; provenance đủ replay/shadow. [SRS](../specs/SRS_SPEC.md)

## 8. Image context

GET chỉ câu approved cho sourceVersion/hash/sense còn khớp. Response tối thiểu: imageId/correctCardId/ba distractorCardIds, cardContentVersion/contentHash/senseKey/questionVersion, displayUrl/sourcePageUrl/creator/licenseName/licenseUrl/attributionText/cacheAllowed/reviewStatus/retrievedAt/reviewedAt/expiresAt.

Biên tập 30–50 nghĩa/quyền/semantics ngoài endpoint phát bài; không live-search/Gemini từng lượt. Quota ảnh riêng. Thiếu quyền/mapping/candidates/reported trả NO_VERIFIED_IMAGE; tải ảnh lỗi bỏ câu/fallback. Report ownership/idempotent, không sửa card. [IMAGE_CONTEXT](../specs/IMAGE_CONTEXT_SPEC.md)

## 9. Delete và error codes

Delete cần reauth theo provider/requestId/scope preview; trả jobId/status. Backend tombstone/purge account/cache/consent và không để outbox sống lại dữ liệu; personal backup đã export ngoài thiết bị không xóa từ server được. [DATA_PRIVACY](../specs/DATA_PRIVACY_SPEC.md)

Codes: AUTH_REQUIRED, FORBIDDEN, CONSENT_REQUIRED, AI_POLICY_BLOCKED, SOURCE_NOT_SYNCED, SOURCE_CHANGED, INSUFFICIENT_STUDIED_CARDS, AMBIGUOUS_CHOICES, VALIDATION_FAILED, UNSUPPORTED_SCHEMA, CONFLICT, RESYNC_REQUIRED, RATE_LIMITED, AI_UNAVAILABLE, REVIEW_REQUIRED, NO_VERIFIED_IMAGE. Retry chỉ lỗi tạm thời, không đổi request ID để lách cap. Error UI giữ phiên học/fallback local.

## 10. Cổng trước code

Task chốt executable schemas, config limits/TTL, reviewer auth, consent evidence, canonical hash, assignment lifecycle, transaction/retention và error matrix. Test A/B isolation/replay/2devices/source-edit, reservation expiry và đổi ngày, global429/revoke/purge/no-private-log/core offline. Contract không thay human approval MANABI-001/dependencies.
