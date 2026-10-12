# ADR-013 — Trí review cuối cho mọi task

Date: 2026-10-12
Status: quyết định quy trình theo xác nhận trực tiếp của chủ dự án; không phải approval code hoặc AC của task

## Quyết định

- Trí (`ThanhTris`) là reviewer và người nghiệm thu cuối của tất cả task roadmap-v2, kể cả task Trí trực tiếp làm. Không cần chỉ định reviewer độc lập hoặc thành viên khác cho các task đó.
- Quyết định này thay yêu cầu reviewer khác owner của quy trình hiện hành và câu tương ứng trong ADR-011. Ngoại lệ owner đồng thời reviewer chỉ dành cho Trí trong roadmap-v2; không cho thành viên khác hoặc AI tự duyệt task của mình.
- Reviewer metadata là Trí; `proposed_reviewer` là `ThanhTris`. Validator cho phép cặp owner/reviewer này, nhưng vẫn kiểm đúng người ghi review, ngày hợp lệ, `Decision: Approved`, evidence thật và AC hoàn tất khi chuyển Markdown thành done. Metadata reviewer không tự tạo approval.
- Giữ nguyên nguồn Done trên Project theo ADR-011, start/merge gate, output/HANDOFF, contract/version, kiểm PR/commit và test thật. AI không tự ghi Approved/Done hay merge.
- Giữ nguyên hồ sơ review, tác giả và snapshot lịch sử. Không đổi assignee, status hoặc deadline trên Project chỉ để áp dụng quy tắc review.

## Giới hạn

Không có lớp kiểm người thứ hai bắt buộc cho task do Trí viết; Trí chịu trách nhiệm kiểm lại AC và evidence trước nghiệm thu. Quy tắc này chỉ nói về review task, không tự thay yêu cầu kiểm nguồn/nhập dữ liệu hoặc kiểm bảo mật trong spec.

[Workflow](../../project/TEAM_WORKFLOW.md) · [DoD](../../project/DEFINITION_OF_DONE.md).
