# Tasks — food-v1

[Master backlog](backlog/MASTER_BACKLOG.md) · [Dependency map](../docs/project/TASK_DEPENDENCIES.md) · [Workflow](../docs/project/TEAM_WORKFLOW.md) · [Mẫu task](templates/TASK_TEMPLATE.md) · [Mẫu review](templates/REVIEW_TEMPLATE.md).

GM-00 đã review baseline cũ. [GM-01](done/GM-01.md) chờ review bộ data/quy trình mới; 30 task triển khai còn backlog. Mã hiện hành chạy GM-01 → GM-38, mọi dependency chỉ trỏ số nhỏ hơn. Xem [lộ trình và bảng mã cũ–mới](../docs/project/TASK_RENUMBERING.md); previous_id chỉ tra lịch sử, không là dependency. Các cặp parallel_with vẫn được làm phần độc lập song song.

Markdown frontmatter là nguồn trạng thái. start_dependencies chặn viết phần độc lập; merge_dependencies chặn tích hợp/merge và cộng thêm start deps. parallel_with khác owner, không quan hệ start, được có quan hệ merge. Trước merge dùng --gate merge --base-ref origin/main sau cập nhật ref và kiểm PR/commit/test thật. Khi chuyển trạng thái, move file đúng backlog/in-progress/review/done và sửa status; không copy. Chạy --write-docs để retarget link và sinh bảng, rồi validator/--check-docs. Không tự Approved/Done.

`python scripts/task_readiness.py --task GM-XX`: kiểm trước làm; BLOCKED không bắt đầu. `--all`: xem tổng. `--write-docs`: sinh lại 4 bảng sau đổi task; `--check-docs`: CI kiểm drift.

Owner/reviewer proposed tới khi người nhận xác nhận. Approved cần reviewer độc lập/ngày/evidence thật, không chỉ folder done hoặc merge PR. [GitHub mapping](../docs/project/GITHUB_TASKS.md) là lịch sử remote lần kiểm trước; task mới local chưa sync.
