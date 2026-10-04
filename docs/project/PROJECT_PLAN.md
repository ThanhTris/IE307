# Kế hoạch phát triển Manabi

Cập nhật 02/10/2026 theo yêu cầu chủ dự án. Đây là kế hoạch triển khai mới; repository hiện có prototype, tài liệu và fixture, chưa có app production. Giữ giao diện [prototype Manabi](../../design/prototypes/manabi-vocabulary.html), chỉ chuyển sang React Native và điều chỉnh để dùng được trên mobile.

## Kết quả và phạm vi

Manabi là ứng dụng Android-first học tiếng Nhật bằng deck/card tùy biến theo fieldSchema, học thẻ lật, lịch SRS và ba game Matching, Four Choices, Word Ninja. Người học có thể nhập paste/CSV, xem tiến độ và backup/restore JSON. Tài khoản/sync là nhánh online có kiểm soát; core học local không bắt buộc tài khoản. Gemini dùng một key admin phía server, tối đa 10 câu mới approved/người/ngày và ngân sách chung. Ảnh đời sống chỉ là pilot 30–50 nghĩa cụ thể có nguồn/quyền được duyệt.

Các chi tiết và acceptance traceability nằm ở [FR](../product/FUNCTIONAL_REQUIREMENTS.md), [NFR](../product/NON_FUNCTIONAL_REQUIREMENTS.md) và specs. Task chi tiết được theo dõi trên nhánh triển khai. Không mở nhiều ngôn ngữ, cộng đồng deck hay loại chức năng AI mới.

## Cổng nghiệm thu

| Cổng | Kết quả review được | Điều kiện mở công việc tiếp |
| --- | --- | --- |
| G0 Phạm vi Manabi | MANABI-001: docs/specs/ADR/36 task/phân công/DOCX | Reviewer độc lập xác nhận; thay thế baseline Memo cũ, không tự đánh dấu task cũ Done |
| G1 Nền tảng | Expo/CI, quyết định JSON/database, fixture và component mobile | Build Android, schema/query/migration proof; ADR storage được duyệt |
| G2 Core local | Deck/card, import, SRS, flashcard, backup | Offline CRUD/import/học/restore chạy, lịch ôn và transaction có test |
| G3 Game/tiến độ và sync | Ba game, dashboard; auth/sync nếu bật nhánh online | Không có tác động lịch ôn ngoài policy; isolation/conflict/replay đạt |
| G4 AI/ảnh pilot | Gateway quota, generator/validator/review UI và manifest ảnh | Tuổi/vùng/consent/tier phù hợp; câu/ảnh có nguồn, semantic review và fallback |
| G5 Chất lượng | Held-out AI assessment, shadow SRS, perf, accessibility và acceptance | Không blocker/critical; ngưỡng đo theo spec; flag không đạt phải tắt |
| G6 Bàn giao | Signed build, demo, báo cáo, slide và gói nộp | Release smoke thật, claim khớp evidence, human review đạt Definition of Done |

Auth/sync được ưu tiên sau core; khi bật Gemini có account/quota/ownership server thì MANABI-009/015/016 và kiểm bảo mật trở thành dependency bắt buộc của nhánh online. Ảnh không chặn core release. MANABI-023 mặc định shadow mode, không tự bật điều chỉnh dueAt.

## Sáu phase/sprint tương đối

Ngày bắt đầu/kết thúc và độ dài sprint do nhóm đặt sau G0; không áp lịch tám tuần cũ hoặc deadline tự suy ra.

| Phase | Trọng tâm | Task dự kiến |
| --- | --- | --- |
| 1 | Nền tảng, spike và nghiên cứu quyết định | 002–007 |
| 2 | Persistence/CRUD/import/SRS/backup/consent | 010, 011, 017, 022, 028, 034 |
| 3 | Flashcard, game, progress, cloud/auth/sync tùy nhánh | 008, 009, 012–016, 029 |
| 4 | Gateway/validator/quiz UI, image pilot, shadow signal | 018–021, 023, 025 |
| 5 | Đánh giá chất lượng, security, perf và QA | 024, 026, 027, 030, 031, 035 |
| 6 | Release, integration, report và demo | 032, 033, 036, 037 |

ID không phải thứ tự chạy. Trong cùng phase phải theo dependency, ví dụ 010 → 034 → 011/022 và 017/034 → 008. Đủ người không mở khóa task khi dependency còn review.

## Dữ liệu và kiến trúc

JSON dùng cho nội dung do người học quyết định: deck fieldSchema/template, card fields và portable backup. JSON không thay database transaction/index/ownership. Chủ dự án đã chọn giai đoạn đầu SQLite trên thiết bị + JSON backup, không tài khoản/cloud sync; dueAt, SRS state, review history và version truy vấn ngoài JSON. Supabase/Postgres JSONB chỉ là phương án cloud tùy chọn sau review. [DATA_STORAGE_SPEC](../specs/DATA_STORAGE_SPEC.md) và [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md) ghi quyết định phạm vi và phần review kỹ thuật còn lại. MANABI-004 kiểm truy vấn/migration/index/chi phí/offline; đổi Mongo cần ADR, contract và task mới được review, không chuyển tự động chỉ vì Mongo lưu document.

## Chất lượng nghiên cứu

Fixture tổng hợp có quyền, người biết tiếng Nhật kiểm nghĩa/cách đọc; corpus development và evaluation tách biệt. Gemini không cung cấp đáp án chuẩn. Đo schema reject, semantic false accept, ambiguity, latency, token/calls, cache và failure cases; không giả định đúng JSON là đúng nghĩa. Assessor nội dung độc lập với người viết prompt phải có năng lực tiếng Nhật.

10 câu approved/người/ngày khác với 10 API calls/ngày: draft bị loại vẫn tiêu budget upstream, cần reservation/idempotency/circuit breaker. Một request có thể tạo nhiều draft khi phù hợp; đây không phải Gemini Batch API. Ảnh dùng mapping theo nghĩa chia sẻ, metadata quyền và công duyệt; không hứa coverage mọi từ chuyên ngành/trừu tượng.

## Tải công việc và quy trình nhóm

36 task tương đối cho sáu người, mỗi người 6 task/32 implementation points + 6 review/6 points = 38 tổng. Coding, QA, nghiên cứu và docs nằm trong points task, không cộng trùng; MANABI-001 là việc tài liệu hiện tại có AI hỗ trợ, không nằm trong tải triển khai tương lai. [TEAM_AND_RESPONSIBILITIES](TEAM_AND_RESPONSIBILITIES.md) phản ánh vai trò user đã xác nhận. Ước lượng là đề xuất, không chứng minh số giờ bằng nhau; re-estimate sau phase 1 dựa dữ liệu thật và cân bằng lại.

Mỗi người tối đa hai task active, ưu tiên finish một vertical slice. Trước push cập nhật task Markdown, regenerate DOCX tiến độ, ghi đã làm/chưa làm/lỗi/evidence; làm xong chuyển review, reviewer khác owner quyết định merge/Done theo [TEAM_WORKFLOW](TEAM_WORKFLOW.md). Trạng thái authority ở task file; workbook/DOCX là snapshot sinh lại, không cập nhật lệch nhau thủ công.

## Giảm phạm vi và bàn giao

Nếu thiếu thời gian giữ deck/card, import, flashcard/SRS, ba game, progress và backup offline. Thu hẹp sync/image/AI coverage hoặc tắt feature flag khi gate không đạt; không bỏ validator, consent, isolation, quyền ảnh hoặc fallback. Signed build nội bộ và gói demo có thể bàn giao trước store; public upload cần owner yêu cầu và chính sách release phù hợp.
