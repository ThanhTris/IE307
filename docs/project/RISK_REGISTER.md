# Risk register — Manabi

Cập nhật 02/10/2026. Owner rủi ro là người theo dõi, không phải người tự duyệt đóng rủi ro. Đây là dự báo kế hoạch, chưa có số liệu app production.

| ID | Rủi ro | Xác suất / tác động | Dấu hiệu và giảm thiểu | Owner | Task/gate |
| --- | --- | --- | --- | --- | --- |
| R01 | Phạm vi core + ba game + sync + AI + ảnh vượt đồ án | Cao / Cao | Đường core local trước, optional flag, 6 phase theo dependency; không cắt validator/fallback để giữ feature | Trí | G0, 030, 032 |
| R02 | Points đều nhưng công sức thực lệch | Trung bình / Cao | 32 owner+6 review/người là estimate; re-estimate sau phase 1, pairing có giới hạn, tối đa 2 active | Trí | TEAM workflow |
| R03 | JSON tùy biến gây dữ liệu/truy vấn/migration sai | Cao / Cao | Schema version, validate, dueAt/ownership/index ngoài JSON, atomic migration/restore | Tâm | 004, 010, 022, 034 |
| R04 | Chọn Mongo chỉ vì JSON, thiếu auth/offline/backend | Cao / Cao | Spike official docs/query/cost; Mongo không tự cho mobile sync; giữ baseline đến ADR được duyệt | Tâm | 004, ADR-004 |
| R05 | Sync conflict/replay mất hoặc nhân bản thẻ/history | Trung bình / Cao | Outbox/event ID/version/tombstone, two-device tests, backup trước release | Trí | 015, 022, 027 |
| R06 | Game/AI đoán đúng làm dueAt giãn sai | Cao / Cao | Tách event với flashcard rating, shadow default, bounded policy + replay/rollback, human approval | Vinh | 017, 023, 024 |
| R07 | Gemini JSON đúng nhưng nội dung sai/mơ hồ | Cao / Cao | Card confirmed là đáp án, alias/semantic reject, corpus held-out, assessor tiếng Nhật, report/invalidate | Trung | 006, 018, 020, 024 |
| R08 | Không có assessor đủ tiếng Nhật độc lập | Trung bình / Cao | Tìm assessor trước AI/image gate; chưa đủ chuyên môn không phát câu/ảnh và không claim đúng | Trung | 005, 006, 019, 024 |
| R09 | Một admin key free hết quota/token do nhiều user/retry | Cao / Trung bình | 10 approved/user/day + global calls/tokens/reservation/idempotency/circuit breaker/cache; đo project thật | Trí | 021, 024, 027 |
| R10 | Đối tượng tuổi/vùng/tier không phù hợp Gemini terms | Cao / Cao | Owner xác nhận trước pilot, card demo không nhạy cảm; không dùng key free như giấy phép public release | Trung | 006, 021, 033 |
| R11 | Key/token/private card/PII lộ qua client/log/payload | Trung bình / Cao | Secret server, minimal fields/opt-in, log khử PII, RLS A/B, retention/deletion tests | Trí | 009, 021, 027, 028 |
| R12 | Ảnh sai nghĩa/thiếu license/cache permission | Cao / Cao | 30–50 concrete senses, provenance+checkedAt+attribution, curator/assessor, fallback text | Tuấn | 019, 025 |
| R13 | Word Ninja/mobile hiệu năng/khả năng truy cập không đạt | Trung bình / Trung bình | Luật core trước effect, device benchmark, pause/lifecycle/reduce-motion/tap alternative | Tuấn | 013, 026, 031 |
| R14 | Prototype bị hiểu là app đã hoàn thành | Trung bình / Cao | Status backlog rõ; build/evidence thật; claim release khớp tests, không báo số liệu từ mock | Trang | 002, 030, 032 |
| R15 | DOCX/workbook/status lệch và merge thiếu thông tin | Cao / Trung bình | Task MD authoritative, registry metadata, regenerate trước push, CI validation + reviewer checks | Trí | TEAM workflow, 036 |
| R16 | Build/store/signing/policy khiến không phát hành đúng kế hoạch | Trung bình / Cao | Internal build sớm; secret ngoài Git, upload cần owner và policy review; core offline không chết | Trí | 003, 033, 032 |
| R17 | Báo cáo dồn cuối kỳ, thiếu evidence đáng tin | Cao / Cao | Evidence mỗi task + before-push status; report từ số liệu thật, failure cases/citation audit | Trung | 024, 030, 035, 036 |

Cập nhật likelihood/impact từ evidence khi nhận task; mỗi blocker phải có owner, điều kiện gỡ và bước tiếp theo. Không đổi API/stack/tier hoặc bỏ consent chỉ để đóng blocker. Khi AI/ảnh không đạt, tắt pilot và báo giới hạn; core flashcard/SRS/game/backup vẫn dùng offline.
