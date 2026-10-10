> Lịch sử: các mã task trong tài liệu này thuộc thời điểm soạn/roadmap-v1 (hoặc mã cũ được ghi bên dưới). Lộ trình hiện hành: [roadmap-v2](../../project/IMPLEMENTATION_ROADMAP.md); không dùng mã trong tài liệu này để mở gate.

# ADR-007 — Mã task theo thứ tự triển khai

Ngày: 2026-10-08. Chủ dự án yêu cầu task sau chỉ phụ thuộc task trước theo số 1..N. Đã soạn theo ủy quyền; review độc lập GM-01 vẫn Pending, không tự Accepted/Approved.

## Quyết định

Đánh lại 31 task theo thứ tự topo của hợp start/merge dependencies, không đảo ngược cạnh hay xóa prerequisite thật để ép số. Giữ hai gate của ADR-006 và khả năng viết phần độc lập song song. GM-00 giữ hồ sơ lịch sử; GM-01 là review baseline; GM-27 là release; GM-28..31 là phần mở rộng.

Validator kiểm mọi dependency nhỏ hơn task hiện tại, ID liên tiếp từ 01 và mapping previous_id/numbering đúng. parallel_with không phải dependency nên được chứa số trước hoặc sau. Không bắt task N đợi N-1 nếu không có phụ thuộc.

Cập nhật metadata, filenames, checklist, API/spec/FR traceability, docs, generator và tests cùng một lần; scope/owner/reviewer/priority/status/issue URL không thay. [Bảng mã cũ–mới](../../project/TASK_RENUMBERING.md) và mapping JSON giữ dấu vết. Issue remote không tự sync. Evidence cũ giữ địa chỉ/kết quả; evidence mới tách namespace roadmap-v1 để tránh ID tái sử dụng gây nhầm.

## Kiểm chứng

Regression: hai gate chỉ phụ thuộc số nhỏ, forward edge dù không cycle cũng fail; không trùng/hổng ID; mapping một-một; GM-03 chờ GM-01; các cặp song song/release không mất; links/indexes/FR/evidence vẫn hợp lệ. Không chạy app/native/backend trong việc đổi số.
