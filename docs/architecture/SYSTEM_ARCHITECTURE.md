# Kiến trúc hệ thống — Manabi

Trạng thái: **đề xuất triển khai; phạm vi giai đoạn đầu local-first đã được chủ dự án chọn, ADR-004 còn chờ review kỹ thuật**. Cập nhật 05/10/2026. Chưa có app/API/database production trên `main`.

Manabi chỉ nghiên cứu tiếng Nhật: deck/card tùy biến, flashcard, SRS, Matching, Four Choices, Word Ninja và pilot quiz Gemini/ảnh đời sống. [Prototype Manabi](../../design/prototypes/manabi-vocabulary.html) là giao diện đã chọn; native cần safe area/accessibility/layout thích ứng.

## 1. Tổng thể

    Giai đoạn đầu: Expo React Native + TypeScript strict (Android-first)
      → UI/feature state → domain: schema/import/SRS/game
      → local repository → SQLite: content JSON + metadata/index
      → JSON backup/import chủ động

    Nhánh tùy chọn sau review: auth + sync worker → Supabase/PostgreSQL JSONB
      → quyền, version/receipt/cursor và conflict policy
    Pilot AI/ảnh sau cổng consent, quota, nguồn/giấy phép và review riêng

Mobile đọc/ghi dữ liệu học qua repository local. Giai đoạn đầu không có login, upload hoặc cloud sync; nhánh online sau này phải có thông báo và xác nhận scope. Thiếu mạng/Gemini/backend không chặn core. UI không giữ Gemini key/service-role/database credentials hoặc tự gọi provider.

## 2. Ranh giới module

| Module | Trách nhiệm |
| --- | --- |
| frontend | Navigation/screens, safe-area/accessibility, feature state, repository adapters; sync worker chỉ khi bật nhánh online |
| frontend/src/domain | Contract/validation theo deck, migration/import, scheduler deterministic, game/quiz eligibility, conflict policy |
| frontend/src/ui | Tokens/components theo prototype; không scheduler/quota/persistence |
| backend | Nhánh online/pilot sau review: API/Edge Function adapters, auth/consent/quota/source validation, lỗi ổn định/provider proxy |
| backend/supabase | Nhánh cloud tùy chọn: migrations, RLS, RPC/functions, seed demo không nhạy cảm, SQL/security tests |
| schemas | JSON contracts versioned; mẫu cần mở rộng bằng task/migration trước production |

Domain interfaces không phụ thuộc UI/backend. Boundary validate JSON; không biến JSON người dùng thành query/code/template thực thi. [CARD_JSON](../specs/CARD_JSON_SPEC.md) phân biệt nội dung linh hoạt với metadata có cấu trúc.

## 3. Database và version

Giai đoạn đầu dùng SQLite TEXT JSON local và JSON backup theo [DATA_STORAGE](../specs/DATA_STORAGE_SPEC.md)/[ADR-004](decisions/ADR-004-json-storage-and-database.md). Supabase/PostgreSQL JSONB chỉ là phương án cloud tùy chọn sau review; [MongoDB](../research/DATABASE_FEASIBILITY.md) là alternative chưa chọn.

- Decks: metadata, fieldSchema/templates/mapping versioned.
- Cards: fields JSON, contentVersion/contentHash, confirmedContentVersion/confirmedContentHash, recordVersion/owner/timestamps/tombstone.
- Card_schedules: state/dueAt/lastReviewedAt/tham số scheduler/reps/lapses/schedulerVersion, khóa owner-card-template. Ôn bài không đổi contentVersion.
- Review_events là rating trực tiếp append-only; game/quiz attempts độc lập, không giả review trực tiếp.
- Sync_outbox local và sync_changes/sync_receipts server: idempotency/version/cursor.
- Quiz_items/assignments: source target và candidates versions/hashes, prompt/model/validator version/approval.
- Image_assets/image_card_links: license/ghi công và mapping nghĩa/source version.
- Consents/ai_daily_usage/ai_reservations: policy/revoke, counters/reservation atomic.

Index cho ownership/dueAt/deck/version; không gộp toàn deck/history vào JSON tăng vô hạn. Hash canonical versioned; nội dung/sense/mapping đổi làm confirmation/quiz/ảnh stale. Confirmation phải khớp version **và** hash, không boolean tồn tại vĩnh viễn.

## 4. Luồng core

Deck/card: form theo fieldSchema → validate required/type/length/key → transaction content/version/invalidation → local UI. Outbox chỉ thêm khi nhánh sync được duyệt. Import paste/CSV có mapping/preview lỗi/trùng/policy skip-merge và rollback. [DECK_CARD](../specs/DECK_CARD_SPEC.md), [IMPORT](../specs/IMPORT_SPEC.md)

Flashcard/SRS: query schedule đến hạn bằng index → reveal → user rating Again/Hard/Good/Easy → transaction review-event/schedule. Outbox chỉ thêm khi nhánh sync được duyệt. Resume/force-close không tự chấm; event trùng không áp hai lần. Scheduler versioned/UTC ngoài screen. [FLASHCARD](../specs/FLASHCARD_SPEC.md), [SRS](../specs/SRS_SPEC.md)

Game: Matching/Four Choices/Word Ninja chọn card đã học và cặp nghĩa rõ. Lựa chọn đầu đủ điều kiện là signal phụ; bom/miss thao tác/auto-hit không là quên. Progress tách rating trực tiếp/game/quiz; modifier quiz bắt đầu shadow, chưa đổi lịch thật. [GAMES](../specs/GAMES_SPEC.md), [PROGRESS](../specs/PROGRESS_SPEC.md)

Backup JSON version/checksum snapshot/preview/transaction restore thuộc core local. **Nhánh auth/sync tùy chọn sau review:** guest→account preview scope; secure token, login B không thấy cached A. Outbox push có baseVersion/capability, server auth/RLS/schema rồi commit canonical+receipt. Pull cursor/tombstone; conflict trả record/version để policy/preview, không ghi đè bằng clock client. Review-events dedup/replay, không tin dueAt projection tùy ý client. [AUTH_SYNC](../specs/AUTH_SYNC_SPEC.md), [BACKUP](../specs/BACKUP_SPEC.md)

## 5. Gemini pilot

1. Chỉ tài khoản có card demo không nhạy cảm đã sync/học/xác nhận, consent và tuổi/vùng/tier hợp lệ. Điều kiện chưa chốt thì flag AI tắt, core tiếp tục.
2. Client gửi IDs/version/direction tối đa 5 target/lượt; server đọc payload tối thiểu theo owner/snapshot hashes, khóa answer từ card. Không email/history/toàn deck.
3. Atomic reservation bảo đảm approvedNewQuestions + activeReservations ≤ 10 theo calendar day server Asia/Ho_Chi_Minh, generation counter tối đa 2 lượt/user/ngày. Global request/token/RPM cap riêng; Google Pacific RPD không phải ngày quota sản phẩm.
4. Regular generateContent tối đa 5 drafts; không Gemini Batch API. Tối đa 1 retry tạm thời/request có backoff; reject/retry tính provider budget, không bù semantic lỗi vô hạn.
5. Schema/ID/duplicate/meaning validation + reviewer độc lập biết tiếng Nhật. Needs_review không phát như verified. Approved assignment/counter commit cùng transaction; rejected/expired release slot. Approved sau TTL phải reserve/recheck.
6. Cache theo quyền/owner, source target+candidates/hash/version, prompt/model/validator. Source edit/revoke/report dừng phát khi cần; poll/replay/chơi lại assignment không gọi AI/trừ quota tạo mới.
7. Attempt đầu nguồn còn hiệu lực là record riêng; vừa xem đáp án lúc duyệt không tạo signal đủ điều kiện. SRS shadow policy versioned, bật modifier thật chỉ sau pilot/review.

Error/timeout/429/quota có code/fallback Four Choices local. Key admin ở server secret store. [AI_QUIZ](../specs/AI_QUIZ_SPEC.md), [ADR-003](decisions/ADR-003-ai-quiz-boundary.md), [Free Tier](../research/GEMINI_FREE_TIER_FEASIBILITY.md)

## 6. Ảnh đời sống

Biên tập 30–50 nghĩa cụ thể, mỗi ảnh/mapping/bốn lựa chọn được duyệt nghĩa + source/license/ghi công. Tìm một lần cho nghĩa mới rồi dùng mapping hợp lệ; không query/provider/Gemini từng lượt chơi. Quota ảnh riêng, key Gemini không cấp quyền ảnh. API chỉ đọc approved nguồn còn khớp; lỗi media/quyền/mơ hồ bỏ câu/fallback text. Cache theo terms provider. [IMAGE_CONTEXT](../specs/IMAGE_CONTEXT_SPEC.md)

## 7. Security, evidence và release

RLS/owner tests bao phủ dữ liệu; consent server version/revoke và purge không để outbox stale khôi phục dữ liệu xóa. Logs chỉ request ID/version/latency/quota/error/reject/cache/fallback; không raw card/prompt/model output/PII/key. [DATA_PRIVACY](../specs/DATA_PRIVACY_SPEC.md)

Benchmark theo [NFR](../product/NON_FUNCTIONAL_REQUIREMENTS.md): fixture 10.000 card/50.000 review events, Android release thật, query plan/latency/memory/size và network/crash/replay. Mục tiêu chưa đo. Core offline độc lập, pilot không đạt flag tắt/listing chỉ claim chức năng nghiệm thu. [RELEASE](../specs/RELEASE_SPEC.md)

Cần review contract/version/consent/quota/retention/ngưỡng pilot và task dependencies trước implementation.
