# Context cho AI

AI bắt đầu bằng `AGENTS.md`, sau đó đọc đúng task và spec được liên kết. Không dùng toàn bộ tài liệu legacy làm prompt mặc định.

## Context tối thiểu cho một task

- Task ID, mục tiêu và non-goals.
- File/module được phép sửa.
- Spec/ADR liên quan.
- Acceptance criteria và test cases.
- Lệnh kiểm tra và evidence path.
- Quyết định cần hỏi con người.

Tài liệu cũ nằm trong `docs/ai/legacy` chỉ để tra cứu prototype. Nội dung của chúng không được ưu tiên hơn task/spec hiện tại.
