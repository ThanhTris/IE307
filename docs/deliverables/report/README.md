# Báo cáo Manabi

Dự án hiện có plan, spec, UI mẫu và workflow. Báo cáo DOCX tiến độ và workbook sẽ được sinh khi có đủ registry/task Markdown cho giai đoạn triển khai; chưa có tiến độ thực hiện được xác nhận để tổng hợp. Bản phân công sáu người hiện là dự kiến.

Nguồn đặc tả hiện tại nằm trong `docs/product`, `docs/specs`, `docs/architecture` và `docs/project`. Công cụ sinh và kiểm báo cáo là `scripts/build_manabi_reports.py`, `scripts/build_manabi_workbook.mjs` và `scripts/validate_handoff.py`. DOCX là snapshot để đọc/review, không thay spec hoặc quyết định reviewer. Hình/PDF render QA ở `.work/`, không commit.

## Điều kiện sinh báo cáo

Hiện chưa có DOCX/XLSX tiến độ, registry `tasks/project-tasks.json` hoặc 36 file task triển khai riêng. Phân công dự kiến được kiểm bằng `python scripts/validate_repository.py` từ danh mục task và bảng thành viên.

Khi triển khai, chuẩn bị registry và task Markdown với AC, trạng thái, owner/reviewer, dependency, ước lượng và evidence. Registry dùng ID MANABI-001–036; mỗi đợt có `id`, `name` và `gate` (G1–G6) hoặc `acceptance` để mô tả điều kiện nghiệm thu. Không cố định số task/điểm bằng nhau giữa các thành viên. Chọn reviewer chính trong registry, ghi reviewer phối hợp trong task.

Sau khi đủ nguồn, sinh workbook rồi DOCX, kiểm nội dung và render Word trước khi bàn giao theo workflow. Kiểm handoff yêu cầu báo cáo/manifest khớp nguồn; hiện chưa đạt điều kiện đó.
