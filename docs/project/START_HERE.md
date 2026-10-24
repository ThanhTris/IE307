# Đọc từ đây — dish-first và baseline legacy

Android-first React Native giúp nhóm chọn món trước, tìm quán sau. [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md) là hướng đích; food-v1/location-first giữ cho phiên legacy. Đọc [audit BE/Data hiện hành](BE_DATA_AUDIT_2026-10-24.md) và [phần việc bổ sung](BE_DATA_FOLLOWUPS_2026-10-24.md) để phân biệt code đã merge, khoảng thiếu và thứ tự nhận việc. UI đang chờ Trí chốt, chưa cập nhật trong đợt này. Trạng thái đọc Project, không suy hoàn tất từ prototype hoặc tài liệu.

1. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md), [PRD](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md).
2. [Food data spec](../specs/FOOD_DATA_SPEC.md), [spec index](../specs/README.md), [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md).
3. [Dependency map và trạng thái bắt đầu](TASK_DEPENDENCIES.md), [task summary](TASK_SUMMARY.md), [phân công](TEAM_AND_RESPONSIBILITIES.md), [tiến độ](PROJECT_PLAN.md).
4. [Workflow](TEAM_WORKFLOW.md), [DoD](DEFINITION_OF_DONE.md), [mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [mẫu PR](../../.github/pull_request_template.md), [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).
5. [UI plan](UI_IMPLEMENTATION_PLAN.md), [test plan](../testing/TEST_PLAN.md), [audit repo lịch sử — mã cũ](../evidence/GM-28/REPOSITORY_AUDIT.md).

Task hiện hành roadmap-v2 đánh số GM-01 → GM-40; mọi dependency chỉ trỏ số nhỏ hơn. Đọc [lộ trình UI–BE–Data](IMPLEMENTATION_ROADMAP.md), [bảng nhận/bàn giao](TASK_HANDOFFS.md) và [mapping scope cũ–mới](TASK_RENUMBERING.md). Số tăng không bắt các task độc lập phải chờ nhau. Các supplement dùng gate artifact/PR riêng, không thêm dependency ngược vào baseline.

GM-00 là baseline lịch sử; GM-01 đã được chủ dự án xác nhận duyệt ngày 2026-10-10. Theo ADR-014, checker dùng Done của card GM-00/#37 cho baseline GM-01; task sau vẫn kiểm gate riêng. Được viết phần độc lập khi start deps đủ dù merge deps chưa xong. Nhận việc: `python scripts/task_readiness.py --task GM-XX`; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref và kiểm PR/commit/test thật. [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md) là quy tắc gate hiện hành; Trí review tất cả task, kể cả task Trí làm, không yêu cầu review chéo theo ADR-013.

40 task sau GM-00 (35 P0 gồm review baseline và GM40, 2 P1, 3 P2). Phân công, Status và Deadline xem trên [Project #2](https://github.com/users/ThanhTris/projects/2); metadata assignment không tự thay xác nhận nhận việc. Project có40 card vì GM01 dùng alias GM00. [Prototype HTML](../../design/prototypes/gi-cung-duoc.html) không là native evidence. Không tự commit/push.
