# Quy ước đóng góp

## Nhánh và commit

- Nhánh task: `feat/<task-id>-ten-ngan`, `fix/<task-id>-ten-ngan`, `docs/<task-id>-ten-ngan`.
- Commit: `<type>(<scope>): <mô tả> [<task-id>]`.
- Không làm trực tiếp trên `main` sau khi dự án đã có CI.

## Luồng task

1. Chọn task đã đủ thông tin trong `tasks/backlog`.
2. Gán owner/reviewer và chuyển file sang `tasks/in-progress`.
3. Tạo nhánh, triển khai, kiểm thử và thêm evidence.
4. Mở pull request theo template.
5. Sau khi merge, chuyển task sang `tasks/done` và cập nhật workbook.

## Review

- Người viết không tự duyệt thay cho reviewer.
- Thay đổi schema, migration, auth/RLS, SRS hoặc sync cần ít nhất một fullstack và một data reviewer.
- Thay đổi giao diện phải kiểm tra Android và iOS hoặc ghi rõ nền tảng chưa kiểm tra.
