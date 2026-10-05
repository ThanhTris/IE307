# Bản đồ thư mục Manabi

Cấu trúc repository Manabi và nơi đặt tài liệu, mã nguồn, dữ liệu mẫu.

| Thư mục | Nội dung |
| --- | --- |
| `frontend/` | App Expo, màn hình, logic học offline và SQLite |
| `frontend/src/domain/` | Logic thuần: import, scheduler, game policy và validation; không phụ thuộc UI |
| `frontend/src/ui/` | Tokens và components dùng chung |
| `backend/` | API local khi phát triển, triển khai server khi cần; chưa chọn framework |
| `backend/supabase/` | Hướng dẫn cấu hình cloud tùy chọn sau review |
| `schemas/` | Hợp đồng JSON; dữ liệu mẫu trong `examples/` |
| `design/prototypes/` | UI HTML đã chốt và ghi chú chuyển sang native |
| `docs/` | Sản phẩm, spec, kiến trúc, nghiên cứu và quy trình |
| `docs/deliverables/` | Báo cáo, slide, demo, release và gói nộp bài |
| `tasks/` | Task dự kiến; Markdown/registry chi tiết khi bắt đầu triển khai |
| `scripts/` | Kiểm tra repository, sinh workbook/DOCX và kiểm handoff |

## Quy ước

`AGENTS.md`, `README.md`, `.env.example` và cấu hình Git/CI nằm ở gốc. Frontend và backend dùng hợp đồng trong `schemas/`; logic học offline nằm trong `frontend/src/domain/`.

Task Markdown lưu phạm vi, trạng thái và evidence khi triển khai. Registry phục vụ báo cáo đặt tại `tasks/project-tasks.json` khi có đủ dữ liệu. Báo cáo sinh theo [workflow](TEAM_WORKFLOW.md).
