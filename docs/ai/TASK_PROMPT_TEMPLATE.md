# Prompt AIDD

Task: GM-XX. Đọc AGENTS, start deps đã duyệt và linked specs/ADR. Ghi contract version, file ownership, scope/AC/patch/test plan. Chỉ viết phần độc lập trong task khi đủ start gate, dùng fixture rõ nhãn; không gửi dữ liệu thật/secret cho model.

Sau sửa: chạy kiểm phù hợp, lưu evidence, nêu AC đạt/chưa đạt, lỗi/blocker và giới hạn kiểm thử. Chuyển review, không tự Done. Đổi contract/architecture ngoài scope phải hỏi owner với đề xuất cụ thể.

Chạy `python scripts/task_readiness.py --task GM-XX` trước code. BLOCKED start thì không viết; merge deps còn pending không chặn phần độc lập theo contract đã chốt. Trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref, kiểm upstream PR/commit và test tích hợp thật. Review sớm có thể còn blocker, không tự Approved/Done. Sau đổi metadata chạy --write-docs/--check-docs; dùng `tasks/templates/REVIEW_TEMPLATE.md`, bàn giao version/PR/evidence.
