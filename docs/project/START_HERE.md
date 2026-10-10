# Đọc từ đây — food-v1

2026-10-07. Android-first React Native giúp nhóm chọn món có nơi bán phù hợp khu vực/buổi/giờ, rồi đạt đồng thuận trong hai vòng. Repo hiện là docs/prototype/skeleton, chưa app/API/native evidence.

1. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md), [PRD](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md).
2. [Food data spec](../specs/FOOD_DATA_SPEC.md), [spec index](../specs/README.md), [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md).
3. [Dependency map và trạng thái bắt đầu](TASK_DEPENDENCIES.md), [task summary](TASK_SUMMARY.md), [phân công](TEAM_AND_RESPONSIBILITIES.md), [tiến độ](PROJECT_PLAN.md).
4. [Workflow](TEAM_WORKFLOW.md), [DoD](DEFINITION_OF_DONE.md), [mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [mẫu PR](../../.github/pull_request_template.md), [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).
5. [UI plan](UI_IMPLEMENTATION_PLAN.md), [test plan](../testing/TEST_PLAN.md), [audit repo lịch sử — mã cũ](../evidence/GM-28/REPOSITORY_AUDIT.md).

Task hiện hành roadmap-v2 đánh số GM-01 → GM-38; mọi dependency chỉ trỏ số nhỏ hơn. Đọc [lộ trình UI–BE–Data](IMPLEMENTATION_ROADMAP.md), [bảng nhận/bàn giao](TASK_HANDOFFS.md) và [mapping scope cũ–mới](TASK_RENUMBERING.md). Số tăng không bắt các task độc lập phải chờ nhau.

GM-00 duyệt v0.2; GM-01 chờ review food-v1 nên start gate code vẫn chưa mở. Sau review baseline, được viết phần độc lập dù merge deps chưa xong. Nhận việc: `python scripts/task_readiness.py --task GM-XX`; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref và kiểm PR/commit/test thật. [ADR-006](../architecture/decisions/ADR-006-parallel-start-ordered-merge.md) giải thích hai gate.

38 task sau GM-00 (34 P0 gồm review baseline, 1 P1, 3 P2), assignment triển khai main vẫn proposed. Kết quả sandbox được tái sử dụng theo mapping và revision đã review. GitHub chưa sync scope mới; [prototype HTML](../../design/prototypes/gi-cung-duoc.html) là mẫu dựng UI, không là native evidence. Lịch ngày chờ nhóm chốt; không tự commit/push.
