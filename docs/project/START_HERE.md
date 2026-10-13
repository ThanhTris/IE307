# Đọc từ đây — food-v1

Android-first React Native giúp nhóm chọn món có nơi bán phù hợp khu vực/buổi/giờ, rồi đạt đồng thuận trong hai vòng. Repo có tài liệu, prototype và các phần triển khai theo task; trạng thái hiện hành xem trên Project và evidence đúng revision, không suy toàn bộ sản phẩm đã hoàn tất từ baseline.

1. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md), [PRD](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md).
2. [Food data spec](../specs/FOOD_DATA_SPEC.md), [spec index](../specs/README.md), [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md).
3. [Dependency map và trạng thái bắt đầu](TASK_DEPENDENCIES.md), [task summary](TASK_SUMMARY.md), [phân công](TEAM_AND_RESPONSIBILITIES.md), [tiến độ](PROJECT_PLAN.md).
4. [Workflow](TEAM_WORKFLOW.md), [DoD](DEFINITION_OF_DONE.md), [mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [mẫu PR](../../.github/pull_request_template.md), [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).
5. [UI plan](UI_IMPLEMENTATION_PLAN.md), [test plan](../testing/TEST_PLAN.md), [audit repo lịch sử — mã cũ](../evidence/GM-28/REPOSITORY_AUDIT.md).

Task hiện hành roadmap-v2 đánh số GM-01 → GM-39; mọi dependency chỉ trỏ số nhỏ hơn. Đọc [lộ trình UI–BE–Data](IMPLEMENTATION_ROADMAP.md), [bảng nhận/bàn giao](TASK_HANDOFFS.md) và [mapping scope cũ–mới](TASK_RENUMBERING.md). Số tăng không bắt các task độc lập phải chờ nhau.

GM-00 là baseline lịch sử; GM-01 đã được chủ dự án xác nhận duyệt ngày 2026-10-10. Theo ADR-014, checker dùng Done của card GM-00/#37 cho baseline GM-01; task sau vẫn kiểm gate riêng. Được viết phần độc lập khi start deps đủ dù merge deps chưa xong. Nhận việc: `python scripts/task_readiness.py --task GM-XX`; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref và kiểm PR/commit/test thật. [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md) là quy tắc gate hiện hành; Trí review tất cả task, kể cả task Trí làm, không yêu cầu review chéo theo ADR-013.

39 task sau GM-00 (34 P0 gồm review baseline, 2 P1, 3 P2). Phân công, Status và Deadline xem trên [Project #2](https://github.com/users/ThanhTris/projects/2); metadata assignment không tự thay xác nhận nhận việc. Kết quả sandbox được tái sử dụng theo mapping và revision đã review. [Prototype HTML](../../design/prototypes/gi-cung-duoc.html) là mẫu dựng UI, không là native evidence. Không tự commit/push.
