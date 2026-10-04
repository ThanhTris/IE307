# Quản lý task Manabi

`main` chỉ có chỉ mục và mẫu task. Trạng thái, acceptance criteria, dependency và evidence của task Manabi nằm trên nhánh `origin/codex/manabi-task004-restore-2026-10-04`; xem [Bắt đầu Manabi](../docs/project/START_HERE.md). Các file PM/Memo từ baseline cũ còn trong `tasks/in-progress` **không phải task Manabi đang làm** và không mở khóa công việc. Không nhận task từ tên thư mục trên `main` khi chưa kiểm nhánh triển khai.

- `backlog`: task đã định nghĩa nhưng chưa bắt đầu.
- `in-progress`: đang có owner thực hiện; tối đa hai task active mỗi người.
- `done`: đã đạt Definition of Done và được review.
- `templates`: mẫu task chuẩn.

Task Markdown trên nhánh triển khai là nguồn chi tiết cho acceptance criteria, evidence và quyết định reviewer. Workbook/DOCX nếu có là bản tổng hợp sinh từ task, không phải trạng thái độc lập.
