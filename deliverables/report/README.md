# Báo cáo Manabi

`main` giữ nguồn đặc tả, workflow và UI. Báo cáo DOCX yêu cầu, kế hoạch, tiến độ và workbook phân công được sinh trên nhánh triển khai khi có registry/task Markdown tương ứng. Không đưa bản tiến độ theo từng task vào commit tài liệu nền này.

Nguồn đặc tả hiện tại nằm trong `docs/product`, `docs/specs`, `docs/architecture` và `docs/project`. Công cụ sinh và kiểm báo cáo là `scripts/build_manabi_reports.py`, `scripts/build_manabi_workbook.mjs` và `scripts/validate_handoff.py`. DOCX là snapshot để đọc/review, không thay spec hoặc quyết định reviewer. Hình/PDF render QA ở `.work/`, không commit.
