# Quy trình AI Driven Development — Manabi tiếng Nhật

AIDD dùng AI để hỗ trợ viết và kiểm tra, còn owner quyết định phạm vi và reviewer khác owner xác nhận kết quả. Trạng thái thực tế của repository phải được ghi trung thực: prototype HTML là tham chiếu UI, chưa phải app production.

## Chu kỳ của một task

1. **Intent:** owner ghi vấn đề người học gặp phải, kết quả cần đạt, phạm vi làm/không làm và dependency. Kiểm tra `tasks/in-progress`; nếu rỗng, xem `tasks/review` trước khi lấy việc từ backlog. Dependency chỉ mở khi reviewer chấp thuận.
2. **Specification:** task có acceptance criteria kiểm chứng được, linked spec/ADR, contract liên quan và đường evidence. Giả định đổi phạm vi, dữ liệu, kiến trúc, quyền riêng tư hoặc release cần owner quyết định trước phần bị ảnh hưởng.
3. **Context:** AI đọc yêu cầu hiện tại, `AGENTS.md`, task và linked spec theo thứ tự nguồn sự thật; chỉ lấy prototype/nghiên cứu/archive làm tham chiếu. Không đưa secret, deck riêng tư hay dữ liệu cá nhân vào prompt mặc định.
4. **Patch plan:** trước khi sửa, AI nêu patch nhỏ nhất, file dự kiến đổi, phép kiểm thử và rủi ro. Triển khai đúng phạm vi; không tự mở thêm ngôn ngữ, cộng đồng deck hay tính năng AI khác.
5. **Verification:** chạy test phù hợp với thay đổi, lưu output/fixture/screenshot/số liệu tại evidence path trong task. Tài liệu-only kiểm liên kết và nhất quán; code UI cần kiểm trên thiết bị mục tiêu khi có app.
6. **Review:** cập nhật task, chuyển sang `tasks/review`, để reviewer khác owner kiểm diff, acceptance criteria và evidence. Không coi output AI là review độc lập; task review chưa mở khóa task phụ thuộc.
7. **Decision:** sau khi reviewer chấp thuận và `DEFINITION_OF_DONE.md` đạt, chuyển sang `tasks/done`. Cập nhật spec/ADR nếu quyết định kỹ thuật thay đổi; ghi lại failure cases và bài học trong báo cáo nghiên cứu.

## Kiểm soát riêng cho hai hướng mới

- Quiz Gemini chỉ dùng card đã học và được xác nhận làm nguồn đáp án; model đề xuất câu dẫn/ba nhiễu. JSON hợp schema chưa đủ chứng minh đúng nghĩa. Câu chưa duyệt, nhiều đáp án đúng hoặc thiếu ba nhiễu hợp lệ bị loại; attempt lỗi không tác động SRS.
- Kết quả quiz là tín hiệu yếu hơn tự nhớ trực tiếp. Bước đầu đo ở shadow mode; điều chỉnh `dueAt` chỉ sau pilot, policy có version, giới hạn và test replay/rollback.
- Ảnh đời sống cần nguồn và quyền sử dụng kiểm chứng được, ghi công và duyệt ảnh–nghĩa. Gemini không phải kho ảnh có giấy phép.
- Core flashcard/SRS/ba game từ dữ liệu lưu local phải dùng được khi Gemini hoặc mạng lỗi. Không nhúng key vào app và không gửi toàn bộ deck/lịch sử học mặc định.

## Artifacts và evidence

Mỗi task có file theo `tasks/templates/TASK_TEMPLATE.md`; thay đổi dữ liệu/scheduler/import có fixture, thay đổi contract/kiến trúc có spec hoặc ADR, thay đổi UI có ảnh hoặc video trên thiết bị phù hợp. Có thể dùng PR hoặc diff review trong workspace, nhưng bằng chứng kiểm thử và quyết định reviewer phải truy vết được từ task. Không tạo số liệu nghiên cứu, feedback người dùng hay ảnh demo giả để thay evidence.

Trước mỗi push, cập nhật task và tái tạo DOCX theo [TEAM_WORKFLOW](TEAM_WORKFLOW.md). Bản tiến độ ghi đã làm/còn lại/lỗi/evidence; hook kiểm báo cáo đúng snapshot commit. Khi merge, giải quyết nguồn Markdown trước rồi sinh lại báo cáo. DOCX/XLSX không phải nguồn trạng thái độc lập.
