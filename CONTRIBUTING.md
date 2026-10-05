# Quy ước đóng góp

## Nhánh và commit

- Nhánh task: `feat/<task-id>-ten-ngan`, `fix/<task-id>-ten-ngan`, `docs/<task-id>-ten-ngan`.
- Commit: `<type>(<scope>): <mô tả> [<task-id>]`.
- Không làm trực tiếp trên `main` sau khi dự án đã có CI.

## Luồng task

1. Đọc [Bắt đầu Manabi](docs/project/START_HERE.md), kế hoạch và phân công dự kiến. Trước khi triển khai, chốt task Markdown với phạm vi, acceptance criteria, dependency và linked spec.
2. Gán owner/reviewer và chuyển file sang `tasks/in-progress`.
3. Tạo nhánh, triển khai, kiểm thử và thêm evidence.
4. Mở pull request theo template.
5. Cập nhật task và DOCX trước push theo [TEAM_WORKFLOW](docs/project/TEAM_WORKFLOW.md); chỉ chuyển `done` sau review độc lập đạt DoD. Merge nguồn trước rồi sinh lại artifacts.

## Review

- Người viết không tự duyệt thay cho reviewer.
- Thay đổi schema, migration, auth/RLS, SRS hoặc sync cần ít nhất một fullstack và một data reviewer.
- Thay đổi giao diện phải kiểm Android mục tiêu; iOS chưa thuộc phạm vi bắt buộc. Ghi rõ thiết bị và nền tảng chưa kiểm tra.
