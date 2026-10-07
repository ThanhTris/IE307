# Đóng góp

Đọc [AGENTS](AGENTS.md), [AIDD](docs/project/AIDD_PROCESS.md), [workflow](docs/project/TEAM_WORKFLOW.md). Nhận task sau review dependency; owner/reviewer trong backlog là đề xuất, cập nhật người thực tế trước triển khai.

Branch gợi ý `feature/gm-xx-ten-ngan`; AI dùng `codex/` khi được yêu cầu tạo branch. PR liên kết task, AC, evidence và giới hạn chưa kiểm tra. Không tự duyệt code của mình. Phân công trên GitHub mang nhãn assignment:proposed; thành viên tự chọn công việc cuối cùng và cập nhật người nhận thực tế.

Trước code: `python scripts/task_readiness.py --task GM-XX`; dependency map nêu cặp song song. Điền bảng dependency/AC/evidence trong [PR template](.github/pull_request_template.md). Review dùng [mẫu](tasks/templates/REVIEW_TEMPLATE.md); merge không tự Done. Sau đổi task chạy --write-docs/--check-docs, validator, regression và diff.
