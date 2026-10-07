# Tasks — food-v1

[Master backlog](backlog/MASTER_BACKLOG.md) · [Dependency map](../docs/project/TASK_DEPENDENCIES.md) · [Workflow](../docs/project/TEAM_WORKFLOW.md) · [Mẫu task](templates/TASK_TEMPLATE.md) · [Mẫu review](templates/REVIEW_TEMPLATE.md).

GM-00 đã review baseline cũ. [GM-28](review/GM-28.md) chờ review bộ data/quy trình mới; 30 task triển khai còn backlog. Có 31 task sau GM-00, gồm gate tài liệu GM-28; không gọi mọi task là đã triển khai.

Markdown frontmatter là nguồn trạng thái. dependencies là các điều kiện AND; parallel_with là cặp độc lập có owner khác (vẫn cần gate riêng). Khi chuyển trạng thái, move file đúng backlog/in-progress/review/done và sửa status; không copy. Chạy --write-docs để retarget link task và sinh bảng, rồi validator/--check-docs để kiểm.

`python scripts/task_readiness.py --task GM-XX`: kiểm trước làm; BLOCKED không bắt đầu. `--all`: xem tổng. `--write-docs`: sinh lại 4 bảng sau đổi task; `--check-docs`: CI kiểm drift.

Owner/reviewer proposed tới khi người nhận xác nhận. Approved cần reviewer độc lập/ngày/evidence thật, không chỉ folder done hoặc merge PR. [GitHub mapping](../docs/project/GITHUB_TASKS.md) là lịch sử remote lần kiểm trước; task mới local chưa sync.
