# Đóng góp

Đọc [AGENTS](AGENTS.md), [AIDD](docs/project/AIDD_PROCESS.md), [workflow](docs/project/TEAM_WORKFLOW.md). Nhận phần độc lập sau start gate; không phải đợi merge deps. Owner/reviewer là đề xuất, xác nhận người thực tế và contract version trước triển khai.

Branch gợi ý `feature/gm-xx-ten-ngan`; AI dùng `codex/` khi được yêu cầu tạo branch. PR liên kết task, AC, evidence và giới hạn chưa kiểm tra. Không tự duyệt code của mình. Phân công trên GitHub mang nhãn assignment:proposed; thành viên tự chọn công việc cuối cùng và cập nhật người nhận thực tế.

Trước code: `python scripts/task_readiness.py --task GM-XX`. Trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref; kiểm cả hai loại deps và PR/commit/test tích hợp thật. Điền [PR template](.github/pull_request_template.md) và [review](tasks/templates/REVIEW_TEMPLATE.md). Draft được còn merge blocker; Done không chứng minh đã merge. Sau đổi task chạy --write-docs/--check-docs, validator, regression và diff.
