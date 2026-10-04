# ADR 003 — Ranh giới quiz Gemini của Manabi

## Trạng thái

Proposed ngày 02/10/2026; cần owner/reviewer kỹ thuật/quyền riêng tư xác nhận trong MANABI-001 và task pilot trước implementation. Không thay thế ADR-001/002 hoặc [ADR-004](ADR-004-json-storage-and-database.md) về stack/dữ liệu.

## Bối cảnh

Manabi tiếng Nhật cần câu hỏi một đáp án đúng, ba nhiễu từ card đã học. Key chung của admin phải ở server, có auth/consent/quota và kiểm chất lượng. Quiz là pilot online có duyệt; flashcard/SRS/ba game đã lưu tiếp tục offline.

## Quyết định đề xuất

- Pilot chỉ card demo không nhạy cảm đã sync/học/xác nhận của tài khoản có consent và điều kiện tuổi/vùng/tier phù hợp. Client gửi IDs/version/direction; Edge Function đọc payload tối thiểu theo owner, key admin trong secret store.
- Backend khóa đáp án từ source contentVersion/hash được xác nhận; Gemini draft stem/ba candidate IDs/lời giải. Validator schema/semantics và reviewer độc lập người biết tiếng Nhật duyệt trước phân phối. Không cộng đồng/deck sharing trong phạm vi.
- Tối đa 10 câu mới đã duyệt cấp/user/calendar day `Asia/Ho_Chi_Minh`, reservation atomic trước provider và commit cùng assignment unique. Tối đa 2 lượt tạo × 5 nháp/user/ngày; một retry tạm thời/request, provider budget vẫn tính nháp reject/retry. Global request/token/RPM cap theo project thật riêng với quota sản phẩm/Google Pacific RPD.
- Cache/source/prompt/model/validator version; requestId/assignment idempotent, replay không gọi AI/trừ quota mới. Draft hết reservation TTL cần recheck trước approve; semantic lỗi không bù vô hạn. Offline/consent/quota/provider lỗi fallback Four Choices local/flashcard.
- Attempt là event riêng và policy SRS shadow versioned. Câu stale/reported/đã xem đáp án trong lúc duyệt không tạo tín hiệu học đủ điều kiện; không biến quiz thành rating trực tiếp. [SRS](../../specs/SRS_SPEC.md)

## Hệ quả và việc chưa quyết

Backend cần auth/RLS/ownership, consent version/revoke, source validator, reservation/TTL/reconcile, generation/global budget, review authorization và retention/purge. Deck local-only/private không tự đủ điều kiện Gemini Free Tier. [Rà soát Free Tier](../../research/GEMINI_FREE_TIER_FEASIBILITY.md) là cổng trước pilot, consent không bỏ qua điều khoản.

Nguồn executable contracts, endpoint/status/lỗi ở [API_CONTRACT](../API_CONTRACT.md), quality gates ở [AI_QUIZ](../../specs/AI_QUIZ_SPEC.md), counters/transactions ở [DATA_STORAGE](../../specs/DATA_STORAGE_SPEC.md). Đo quality/latency/token/cost trên câu được duyệt, concurrency/idempotency/expiry/reset/source-change tests trước bật. Chưa có cam kết capacity miễn phí vô hạn.

Firebase AI Logic là proxy alternative chưa chọn. Ảnh đời sống có provider/license/quota và pipeline duyệt riêng, không dùng key Gemini như giấy phép ảnh; ADR này không chọn nhà cung cấp ảnh.
