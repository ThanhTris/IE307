# Prompt AIDD

Task: GM-XX. Đọc AGENTS, task, dependency đã duyệt và linked specs/ADR. Tóm tắt scope và AC, ghi patch/test plan trước sửa. Chỉ triển khai scope đã mở khóa. Không gửi dữ liệu thật/secret cho model.

Sau sửa: chạy kiểm phù hợp, lưu evidence, nêu AC đạt/chưa đạt, lỗi/blocker và giới hạn kiểm thử. Chuyển review, không tự Done. Đổi contract/architecture ngoài scope phải hỏi owner với đề xuất cụ thể.

Chạy `python scripts/task_readiness.py --task GM-XX` trước code. Nếu BLOCKED/IN_REVIEW thì chỉ báo dependency thiếu và làm phần được ủy quyền không phụ thuộc, không tự đánh Done. Xem parallel_with để phối hợp task độc lập. Sau task metadata đổi, chạy --write-docs và --check-docs; review theo `tasks/templates/REVIEW_TEMPLATE.md`, phải bàn giao version/PR/evidence cho task sau.
