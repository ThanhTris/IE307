# Context cho AI — Manabi tiếng Nhật

Bắt đầu từ `AGENTS.md`, sau đó đọc task đang làm, dependency, acceptance criteria, linked spec/ADR và PRD/plan khi cần. Thứ tự nguồn yêu cầu theo `AGENTS.md`.

## Gói context tối thiểu cho một task

- Task ID, mục tiêu người dùng, phạm vi làm/không làm và dependency đã được duyệt.
- File/module được phép sửa; contract dữ liệu/API và spec/ADR liên quan.
- Giả định cần owner quyết định, acceptance criteria, test cases và evidence path.
- Trạng thái hiện có của code: prototype HTML là tham chiếu UI; `frontend` chưa có app production.

Với quiz Gemini, phải nêu rõ đáp án chuẩn từ card đã xác nhận, ba nhiễu được kiểm tra, consent, provenance và fallback offline. Với ảnh đời sống, phải nêu nguồn/quyền dùng và duyệt ảnh–nghĩa. Không gửi dữ liệu riêng tư hoặc toàn bộ deck cho dịch vụ ngoài theo mặc định. Dùng `TASK_PROMPT_TEMPLATE.md` để giao từng task.

AI phải thực hiện rule [cập nhật task và DOCX trước push](../project/TEAM_WORKFLOW.md). Word là snapshot để trưởng nhóm review, task Markdown lưu trạng thái canonical. Không tự đóng Done và không coi checker/report generator là review độc lập.
