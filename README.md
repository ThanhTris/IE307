# Gì Cũng Được

Ứng dụng Android React Native giúp nhóm 2–8 người chọn món thỏa hiệp có giải thích trong tối đa hai vòng, với bộ món có nơi bán phù hợp khu vực/giờ ăn, rồi xem quán/review. Card có ba nút; chạm hai lần chọn Muốn ăn. NO luôn loại món, server chốt kết quả một lần.

Baseline food-v1 • 2026-10-07. GM-00 đã review v0.2; GM-28 đang review scope data mới. Repo có spec/task/prototype/skeleton, chưa app/backend; task triển khai phải qua dependency gate trước khi bắt đầu.

## Đọc để hiểu dự án

1. [Mô tả hệ thống cho cả nhóm](docs/product/SYSTEM_OVERVIEW.md).
2. [PRD](docs/product/PRODUCT_REQUIREMENTS.md), [21 yêu cầu chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md), [spec index](docs/specs/README.md).
3. [31 task và trạng thái](docs/project/TASK_SUMMARY.md), [tiến độ theo dependency](docs/project/PROJECT_PLAN.md), [phân công đề xuất](docs/project/TEAM_AND_RESPONSIBILITIES.md).
4. [Kế hoạch UI](docs/project/UI_IMPLEMENTATION_PLAN.md), [test plan](docs/testing/TEST_PLAN.md), [AIDD/DoD](docs/project/TEAM_WORKFLOW.md).
5. [Kiến trúc](docs/architecture/SYSTEM_ARCHITECTURE.md), [data](docs/architecture/DATA_MODEL.md), [API](docs/architecture/API_CONTRACT.md), [nghiên cứu 8 đối thủ](docs/research/LECTURER_APPS_REVIEW_2026-10-07.md).

Core có guest/QR/link, friends/push, realtime/outbox/history, taxonomy món, data quán–món–lịch bán/coverage và lọc trước khi vote. Account P1; OCR/AI/weather–mood P2. Owner/reviewer đề xuất, thành viên tự nhận/đổi; không tự coi task Done. [GitHub mapping](docs/project/GITHUB_TASKS.md) ghi riêng phần chưa đồng bộ.

```text
mobile/       Expo Router/features/domain/adapters (skeleton)
supabase/     migrations/RPC/RLS/tests/trusted sender dự kiến
docs/         mô tả/PRD/spec/ADR/plan/test/evidence
tasks/        GM-00 done, GM-28 review, task triển khai backlog
design/       design system/prototype HTML mô phỏng cũ
tests/        fixtures/E2E và validator regression
scripts/      validator, dependency gate và task indexes
```

Kiểm tài liệu: `python scripts/validate_repository.py`, `git diff --check`. Validator không thay independent review/native evidence.

[Prototype HTML](design/prototypes/gi-cung-duoc.html) không là bằng chứng đáp ứng food-v1. Mở bằng browser hoặc local HTTP; nó không chứng minh QR/push/SQL/realtime. [Bắt đầu](docs/project/START_HERE.md).

Trước nhận việc: `python scripts/task_readiness.py --task GM-XX`. [Dependency map](docs/project/TASK_DEPENDENCIES.md) có thứ tự và cặp song song. Sau đổi task: `--write-docs`, rồi `--check-docs`; regression: `python -m unittest discover -s tests -p "test_*.py"`. [PR template](.github/pull_request_template.md) và [review template](tasks/templates/REVIEW_TEMPLATE.md).
