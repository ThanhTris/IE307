# Nhóm và phân công Manabi

Vai trò sáu thành viên được chủ dự án xác nhận ngày 02/10/2026: Trí trưởng nhóm/BE; Trang UI/FE; Tâm và Vinh data; Trung và Tuấn có khả năng FE, BE và data. Phân công dưới đây là kế hoạch đề xuất dựa trên vai trò đó; chưa có task triển khai được hoàn thành.

| Thành viên | Vai trò | Task owner | Công việc chính |
| --- | --- | --- | --- |
| Trí | Trưởng nhóm, BE | 003, 009, 015, 021, 027, 033 | CI/build, auth, sync, gateway/quota Gemini, security và Android release |
| Trang | UI/FE | 007, 008, 014, 020, 026, 031 | Component từ prototype, flashcard, Four Choices, quiz UI, hiệu năng và accessibility |
| Tâm | Data | 004, 010, 016, 022, 028, 034 | JSON/Mongo spike, SQLite/cloud schema, backup, consent data lifecycle, schema-driven CRUD |
| Vinh | Data | 005, 011, 017, 023, 029, 035 | Fixture, import, scheduler, study signal, progress/history và regression dữ liệu |
| Trung | FE/BE/data | 006, 012, 018, 024, 030, 036 | Corpus/rubric, Matching, AI generator/validator, AI evaluation, core QA và báo cáo |
| Tuấn | FE/BE/data | 002, 013, 019, 025, 032, 037 | Expo foundation, Word Ninja, nguồn ảnh/ảnh UI, integration và slide/demo |

Tâm sở hữu domain/schema của task CRUD MANABI-034; Trang pairing kiểm form/render theo prototype. Trí phối hợp thiết kế contract, không làm thay tất cả backend. Trung/Tuấn đều có coding, không chỉ làm QA/tài liệu.

## Balance bằng points tương đối

| Thành viên | Task owner | Owner points | Task review | Review points | Tổng |
| --- | --- | --- | --- | --- | --- |
| Trí | 6 | 32 | 6 | 6 | 38 |
| Trang | 6 | 32 | 6 | 6 | 38 |
| Tâm | 6 | 32 | 6 | 6 | 38 |
| Vinh | 6 | 32 | 6 | 6 | 38 |
| Trung | 6 | 32 | 6 | 6 | 38 |
| Tuấn | 6 | 32 | 6 | 6 | 38 |

Mỗi người có 2 task 3 points, 2 task 5 points và 2 task 8 points. Points đo độ lớn/rủi ro tương đối; không phải giờ, không đảm bảo công sức thực bằng nhau. QA, tài liệu và nghiên cứu cần thiết cho task nằm trong estimate; review 1 point/task là estimate riêng. Tổng 192 owner + 36 review = 228 points; MANABI-001 hiện tại không tính vào tải phát triển tương lai. Sau phase 1 nhóm đo tốc độ thực và đổi estimate/phân công khi cần, ghi lý do trong registry/task.

## Review và chuyên môn

Reviewer chính luân phiên theo cặp Trí ↔ Trung (BE/AI), Trang ↔ Tuấn (FE/game), Tâm ↔ Vinh (data). Mỗi người review 6 task người khác. Reviewer không phải owner và không tự lấy output AI làm review. Review security/architecture cần cross-check Trí; thay đổi UI/schema liên ngành cần Trang/Tâm tham gia nếu ảnh hưởng module của họ.

Review nghĩa tiếng Nhật/AI/ảnh cần assessor biết tiếng Nhật độc lập với người viết prompt/mapping; hiện chưa gán người đủ chuyên môn. Reviewer task phải tìm assessor và lưu đánh giá; nếu chưa có năng lực này, gate semantic vẫn chưa đạt dù code chạy. Giấy phép/consent cần kiểm theo nguồn; code reviewer không mặc nhiên thay được assessor nội dung.

## Cập nhật trước push và phối hợp

- Tối đa hai task active/người; mọi dependency qua review trước khi bắt đầu task phụ thuộc.
- Owner cập nhật status, phần đã làm/còn lại, errors/blockers, file đổi, tests/evidence, ngày cập nhật và bước tiếp theo trong task Markdown.
- Khi push task hoặc code triển khai, sinh lại DOCX tiến độ cùng task để trưởng nhóm/reviewer xem trước khi merge. Hướng dẫn/lệnh ở [TEAM_WORKFLOW](TEAM_WORKFLOW.md).
- “Đã làm xong” nghĩa là review nếu chưa có quyết định độc lập. Chỉ reviewer chấp thuận Definition of Done mới chuyển done.
- Không push key/deck riêng tư/dữ liệu thật; báo blocker sớm, không điền “không lỗi” khi chưa kiểm.

Metadata kế hoạch và task/status thật nằm trên nhánh triển khai; báo cáo tiến độ và workbook được sinh từ nguồn đó. Bản `main` công bố phân công tổng quát, không công bố từng file task. Không xem bản Memo cũ trong lịch sử là phân công hiện tại.
