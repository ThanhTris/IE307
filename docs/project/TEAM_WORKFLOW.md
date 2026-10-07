# Workflow AIDD

Task Markdown là nguồn trạng thái. Phân công chỉ là đề xuất; người nhận cập nhật owner/reviewer thực tế. Reviewer khác owner và không duyệt phần chính mình viết.

GitHub issue là nơi thành viên chọn việc. `assignment:proposed` với Assignee gợi ý không nghĩa đã nhận task. Khi nhận, thành viên xác nhận, đổi nhãn sang `assignment:accepted`, cập nhật owner/reviewer thực tế và trạng thái Markdown. Đã xác minh Trung là collaborator @TrungNQ2645 ngày 2026-10-06; Assignee vẫn là đề xuất, không nghĩa đã nhận việc.

1. Đọc PRD/spec/ADR/task; dependency chỉ mở khi task done có quyết định review có ngày và người duyệt.
2. Chuyển backlog → in-progress khi nhận việc; ghi giả định, file dự kiến, patch nhỏ nhất, test plan.
3. Triển khai đúng scope, cập nhật AC và evidence khi kiểm thật. Nếu bị chặn ghi lý do/owner xử lý; không giả completion.
4. Chạy kiểm phù hợp: docs validator; code thêm typecheck/lint/unit; UI Android; backend RLS/RPC/concurrency.
5. Chuyển task review; ghi đã làm/còn lại/lỗi/file/test/bước tiếp theo. Reviewer đối chiếu từng AC và evidence.
6. Chỉ người review độc lập chấp thuận mới done. AI thực hiện không tự duyệt; backlog task phụ thuộc chưa được mở khi dependency còn review.

Giai đoạn hiện tại là baseline tài liệu và prototype, chưa bắt đầu 27 task triển khai v0.2. GM-00 đã được review/chấp thuận; task triển khai chỉ chuyển in-progress khi thành viên nhận việc. Word mới là artifact tùy yêu cầu, không thay Markdown.

## Kiểm trước commit/push

`python scripts/validate_repository.py` và `git diff --check`. Khi có app thêm lệnh kiểm đã được GM-01 xác nhận trong mobile/README; không ghi lệnh chưa tồn tại là đã chạy. Hook kiểm tài liệu theo commit qua `--git-tree`. Không tự commit/push nếu chủ dự án chưa yêu cầu.

Mọi thay đổi contract/schema/quyết định cập nhật spec/ADR trước code phụ thuộc. Prototype tham chiếu UI, không thay nguồn yêu cầu. Legacy không thuộc CI active.
