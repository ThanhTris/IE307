# Đọc từ đây — food-v1

2026-10-07. Android-first React Native giúp nhóm chọn món có nơi bán phù hợp khu vực/buổi/giờ, rồi đạt đồng thuận trong hai vòng. Repo hiện là docs/prototype/skeleton, chưa app/API/native evidence.

1. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md), [PRD](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md).
2. [Food data spec](../specs/FOOD_DATA_SPEC.md), [spec index](../specs/README.md), [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md).
3. [Dependency map và trạng thái bắt đầu](TASK_DEPENDENCIES.md), [task summary](TASK_SUMMARY.md), [phân công](TEAM_AND_RESPONSIBILITIES.md), [tiến độ](PROJECT_PLAN.md).
4. [Workflow](TEAM_WORKFLOW.md), [DoD](DEFINITION_OF_DONE.md), [mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [mẫu PR](../../.github/pull_request_template.md), [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).
5. [UI plan](UI_IMPLEMENTATION_PLAN.md), [test plan](../testing/TEST_PLAN.md), [audit repo](../evidence/GM-28/REPOSITORY_AUDIT.md).

GM-00 duyệt baseline v0.2; GM-28 chờ review yêu cầu data mới. Tất cả code food-v1 còn bị chặn bởi gate mới, không coi GM-00 Approved là duyệt scope bổ sung. Nhận việc: chạy `python scripts/task_readiness.py --task GM-XX`, kiểm từng dependency/evidence.

31 task sau GM-00 (gồm gate tài liệu), các task triển khai chưa nhận việc. GitHub mapping chưa sync scope mới; [prototype HTML](../../design/prototypes/gi-cung-duoc.html) chỉ mô phỏng và có thay đổi của người dùng, không là native evidence. Lịch ngày chờ nhóm chốt; không tự commit/push.
