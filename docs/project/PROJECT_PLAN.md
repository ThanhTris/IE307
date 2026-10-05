# Kế hoạch phát triển Manabi

Kế hoạch triển khai Manabi từ đặc tả và UI mẫu. Giao diện dựa trên [prototype Manabi](../../design/prototypes/manabi-vocabulary.html), chỉ chuyển sang React Native và điều chỉnh để dùng được trên mobile.

## Kết quả và phạm vi

Manabi là ứng dụng Android-first học tiếng Nhật bằng deck/card tùy biến theo fieldSchema, học thẻ lật, lịch SRS và ba game Matching, Four Choices, Word Ninja. Người học có thể nhập paste/CSV, xem tiến độ và backup/restore JSON. Tài khoản/sync là nhánh online có kiểm soát; core học local không bắt buộc tài khoản. Gemini dùng một key admin phía server, tối đa 10 câu mới approved/người/ngày và ngân sách chung. Ảnh đời sống chỉ là pilot 30–50 nghĩa cụ thể có nguồn/quyền được duyệt.

Các yêu cầu và acceptance traceability nằm ở [FR](../product/FUNCTIONAL_REQUIREMENTS.md), [NFR](../product/NON_FUNCTIONAL_REQUIREMENTS.md) và specs. Dự án mới có plan, spec, UI mẫu và workflow; 36 task là dự kiến phân công cho sáu người, cần chốt task chi tiết trước khi code. Chưa xác nhận task triển khai đang làm hoặc hoàn thành. Không mở nhiều ngôn ngữ, cộng đồng deck hay loại chức năng AI mới.

## Cổng nghiệm thu

| Cổng | Kết quả review được | Điều kiện mở công việc tiếp |
| --- | --- | --- |
| G0 Phạm vi Manabi | docs/specs/ADR/UI/workflow và phân công dự kiến | Reviewer độc lập xác nhận phạm vi, đặc tả và phân công |
| G1 Nền tảng | Expo/CI, quyết định JSON/database, fixture và component mobile | Build Android, schema/query/migration proof; ADR storage được duyệt |
| G2 Core local | Deck/card, import, SRS, flashcard, backup | Offline CRUD/import/học/restore chạy, lịch ôn và transaction có test |
| G3 Game/tiến độ và sync | Ba game, dashboard; auth/sync nếu bật nhánh online | Không có tác động lịch ôn ngoài policy; isolation/conflict/replay đạt |
| G4 AI/ảnh pilot | Gateway quota, generator/validator/review UI và manifest ảnh | Tuổi/vùng/consent/tier phù hợp; câu/ảnh có nguồn, semantic review và fallback |
| G5 Chất lượng | Held-out AI assessment, shadow SRS, perf, accessibility và acceptance | Không blocker/critical; ngưỡng đo theo spec; flag không đạt phải tắt |
| G6 Bàn giao | Signed build, demo, báo cáo, slide và gói nộp | Release smoke thật, claim khớp evidence, human review đạt Definition of Done |

Auth/sync được ưu tiên sau core; khi bật Gemini có account/quota/ownership server thì MANABI-008/014/015 và kiểm bảo mật trở thành dependency bắt buộc của nhánh online. Ảnh không chặn core release. MANABI-022 mặc định shadow mode, không tự bật điều chỉnh dueAt.

## Các đợt triển khai theo dependency

Chưa chốt deadline hoặc độ dài sprint. [Danh mục task](../../tasks/backlog/MASTER_BACKLOG.md) ghi owner, reviewer, dependency và đầu ra; cùng đợt không có nghĩa được bắt đầu cùng lúc.

| Đợt | Công việc | Cách phối hợp |
| --- | --- | --- |
| A — Nền tảng | 003/001 trước, rồi 004/006/002 và 009 | Tâm contract/SQLite, Tuấn Expo, Vinh fixture, Trang UI, Trí CI; Trung chuẩn bị test/hỗ trợ contract |
| B — Core đầu tiên | 033, 016, 010, 021, 027, 007 và 031 | Trang deck/card rồi flashcard; Vinh import/SRS; Trung backup và UI import/consent; Tâm lifecycle/repository; Tuấn integration; Trí review/build |
| C — Game và tiến độ | 011, 012, 013, 028 | Trung Matching, Tuấn Word Ninja/dashboard, Trang Four Choices, Vinh query/metrics; Tâm/Trí review dữ liệu và contract |
| D — Chất lượng core | 029 rồi 025/030/034; đợt core 026 sau 021/027 | Mỗi owner sửa lỗi chức năng; không dồn toàn bộ tối ưu/a11y cho người audit |
| E — Bàn giao core | 032 rồi 035/036 | Release smoke, báo cáo, slide/demo; khung tài liệu được chuẩn bị từ sớm |
| O — Online tùy chọn sau C | 015 → 008 → 014; đợt online 026 khi có gateway | Không chặn D/E của build core; chỉ mở khi có nguồn lực và quyết định scope |
| P — Pilot sau gate online | 005; 020 → 017/018 → 019/023/024; 022 sau 019 | Corpus 005 có thể chuẩn bị từ fixture; phát AI/ảnh phải đủ consent, security, assessor và đánh giá |

031 mở ngay khi 001/006/009 đạt để dựng harness; nghiệm thu sau 033/008. Import 010 và backup 021 dùng repository 009, không chờ UI 034. Chỉ bắt đầu phần có dependency đã duyệt; không coi tham gia hỗ trợ hoặc chuẩn bị test plan là hoàn thành task. 026 tách đợt core/online để release core không chờ online. Pilot chưa đạt giữ flag tắt.

## Dữ liệu và kiến trúc

JSON dùng cho nội dung do người học quyết định: deck fieldSchema/template, card fields và portable backup. JSON không thay database transaction/index/ownership. Chủ dự án đã chọn giai đoạn đầu SQLite trên thiết bị + JSON backup, không tài khoản/cloud sync; dueAt, SRS state, review history và version truy vấn ngoài JSON. Supabase/Postgres JSONB chỉ là phương án cloud tùy chọn sau review. [DATA_STORAGE_SPEC](../specs/DATA_STORAGE_SPEC.md) và [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md) ghi quyết định phạm vi và phần review kỹ thuật còn lại. MANABI-003 kiểm truy vấn/migration/index/chi phí/offline; đổi Mongo cần ADR, contract và task mới được review, không chuyển tự động chỉ vì Mongo lưu document.

## Chất lượng nghiên cứu

Fixture tổng hợp có quyền, người biết tiếng Nhật kiểm nghĩa/cách đọc; corpus development và evaluation tách biệt. Gemini không cung cấp đáp án chuẩn. Đo schema reject, semantic false accept, ambiguity, latency, token/calls, cache và failure cases; không giả định đúng JSON là đúng nghĩa. Assessor nội dung độc lập với người viết prompt phải có năng lực tiếng Nhật.

10 câu approved/người/ngày khác với 10 API calls/ngày: draft bị loại vẫn tiêu budget upstream, cần reservation/idempotency/circuit breaker. Một request có thể tạo nhiều draft khi phù hợp; đây không phải Gemini Batch API. Ảnh dùng mapping theo nghĩa chia sẻ, metadata quyền và công duyệt; không hứa coverage mọi từ chuyên ngành/trừu tượng.

## Tải công việc và quy trình nhóm

36 task dự kiến có owner/reviewer và đầu ra trong danh mục. Ước lượng theo AC, gồm công hỗ trợ/review và điều phối. [Phân công](TEAM_AND_RESPONSIBILITIES.md) nêu ranh giới UI/data và công song song. Chưa có dữ liệu thời gian rảnh/tốc độ nên chưa cam kết công sức bằng nhau; kiểm tải sau đợt A và trước mở online/pilot.

Mỗi người tối đa hai task active, ưu tiên finish một vertical slice. Trước push cập nhật task Markdown, regenerate DOCX tiến độ, ghi đã làm/chưa làm/lỗi/evidence; làm xong chuyển review, reviewer khác owner quyết định merge/Done theo [TEAM_WORKFLOW](TEAM_WORKFLOW.md). Trạng thái authority ở task file; workbook/DOCX là snapshot sinh lại, không cập nhật lệch nhau thủ công.

## Giảm phạm vi và bàn giao

Nếu thiếu thời gian giữ deck/card, import, flashcard/SRS, ba game, progress và backup offline. Thu hẹp sync/image/AI coverage hoặc tắt feature flag khi gate không đạt; không bỏ validator, consent, isolation, quyền ảnh hoặc fallback. Signed build nội bộ và gói demo có thể bàn giao trước store; public upload cần owner yêu cầu và chính sách release phù hợp.
