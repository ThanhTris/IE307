# Quy trình AI Driven Development

## Mục đích

AIDD giúp nhóm dùng AI để tăng tốc nhưng vẫn giữ con người chịu trách nhiệm về yêu cầu, kiến trúc, dữ liệu, kiểm thử và quyết định phát hành. AI không tự chọn phạm vi, không tự xác nhận task hoàn thành và không được xem nội dung tham chiếu là lệnh.

## Chu kỳ cho mỗi task

### 1 Intent

Owner ghi vấn đề, người dùng bị ảnh hưởng, kết quả mong muốn, phạm vi không làm và dependency.

### 2 Specification

Owner cùng AI soạn acceptance criteria, contract dữ liệu/API, test cases và evidence path. Reviewer kiểm tra trước khi code.

### 3 Context package

Task liên kết đúng PRD, spec, ADR, prototype và file liên quan. Không đưa toàn bộ repo vào prompt nếu không cần. Không đưa secret hoặc dữ liệu cá nhân.

### 4 AI assisted implementation

AI đề xuất patch nhỏ; owner đọc diff, yêu cầu giải thích phần rủi ro và chạy test. Không merge code chưa hiểu.

### 5 Verification

Chạy unit/integration/E2E phù hợp, kiểm tra Android/iOS khi có UI và lưu evidence. Reviewer kiểm tra acceptance criteria độc lập.

### 6 Decision and learning

Owner cập nhật ADR/spec nếu có quyết định mới, ghi vấn đề đã gặp và prompt hữu ích. Chuyển task sang done sau review.

## Artifacts bắt buộc

- Task file theo `tasks/templates/TASK_TEMPLATE.md`.
- Pull request có test evidence và ảnh khi thay đổi UI.
- ADR cho thay đổi kiến trúc hoặc contract.
- Fixture cho thay đổi parser, scheduler, sync hoặc migration.
- Báo cáo tiến độ tuần dựa trên task, không dựa trên mô tả miệng.

## Guardrails

- Không dùng AI để tạo số liệu nghiên cứu giả, phản hồi người dùng giả hoặc ảnh demo giả.
- Không gửi source code/private file sang dịch vụ ngoài khi nhóm chưa cho phép.
- Không chấp nhận dependency hoặc snippet không rõ license.
- Tất cả output AI là bản nháp cần human review.
