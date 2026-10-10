# Gì Cũng Được

Ứng dụng Android React Native giúp nhóm 2–8 người chọn món thỏa hiệp có giải thích trong tối đa hai vòng, với bộ món có nơi bán phù hợp khu vực/giờ ăn, rồi xem quán/review. Card có ba nút; chạm hai lần chọn Muốn ăn. NO luôn loại món, server chốt kết quả một lần.

Baseline food-v1 • workflow cập nhật 2026-10-08. GM-00 đã review v0.2; GM-01 đang review scope mới. Repo có spec/task/prototype và bản nháp bootstrap GM-02 trên sanbox theo yêu cầu tiếp tục của chủ dự án; chưa có app tính năng/backend hoặc APK đã build. Hai gate vẫn giữ nguyên cho review/merge. Xem [test GM-02](docs/evidence/roadmap-v1/GM-02/USER_TEST.md) và [báo cáo](docs/evidence/roadmap-v1/GM-02/REPORT.md).

## Đọc để hiểu dự án

Task đã đánh số theo lộ trình GM-01 → GM-31; dependency chỉ trỏ số nhỏ hơn. [Bảng mã cũ–mới](docs/project/TASK_RENUMBERING.md) giúp tra issue/evidence cũ; không dùng mã cũ để nhận task hiện tại.

1. [Mô tả hệ thống cho cả nhóm](docs/product/SYSTEM_OVERVIEW.md).
2. [PRD](docs/product/PRODUCT_REQUIREMENTS.md), [21 yêu cầu chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md), [spec index](docs/specs/README.md).
3. [31 task và trạng thái](docs/project/TASK_SUMMARY.md), [tiến độ theo dependency](docs/project/PROJECT_PLAN.md), [phân công đề xuất](docs/project/TEAM_AND_RESPONSIBILITIES.md).
4. [Kế hoạch UI](docs/project/UI_IMPLEMENTATION_PLAN.md), [test plan](docs/testing/TEST_PLAN.md), [AIDD/DoD](docs/project/TEAM_WORKFLOW.md).
5. [Kiến trúc](docs/architecture/SYSTEM_ARCHITECTURE.md), [data](docs/architecture/DATA_MODEL.md), [API](docs/architecture/API_CONTRACT.md), [nghiên cứu 8 đối thủ](docs/research/LECTURER_APPS_REVIEW_2026-10-07.md).

Core có guest/QR/link, friends/push, realtime/outbox/history, taxonomy món, data quán–món–lịch bán/coverage và lọc trước khi vote. Account P1; OCR/AI/weather–mood P2. Owner/reviewer đề xuất, thành viên tự nhận/đổi; không tự coi task Done. [GitHub mapping](docs/project/GITHUB_TASKS.md) ghi riêng phần chưa đồng bộ.

Bản nháp GM-03: [bản đồ dữ liệu FE/contract/template](docs/data/FOOD_DATA_DICTIONARY.md) và [cách test](docs/evidence/roadmap-v1/GM-03/USER_TEST.md). Có DTO/validator và fixture tổng hợp, chưa có dataset quán thật/SQL/eligibility hoặc màn hình sản phẩm mới.

```text
mobile/       Expo Router và spike GM-02; features/domain/adapters nền
supabase/     migrations/RPC/RLS/tests/trusted sender dự kiến
docs/         mô tả/PRD/spec/ADR/plan/test/evidence
tasks/        GM-00 done, GM-01 review, task triển khai backlog
design/       design system/prototype HTML mô phỏng cũ
tests/        fixtures/E2E và validator regression
scripts/      validator, dependency gate và task indexes
```

Kiểm tài liệu: `python scripts/validate_repository.py`, `git diff --check`. Validator không thay independent review/native evidence.

[Prototype HTML](design/prototypes/gi-cung-duoc.html) không là bằng chứng đáp ứng food-v1. Mở bằng browser hoặc local HTTP; nó không chứng minh QR/push/SQL/realtime. [Bắt đầu](docs/project/START_HERE.md).

Trước nhận việc: `python scripts/task_readiness.py --task GM-XX`. Trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref; kiểm PR/commit và integration thật theo [workflow](docs/project/TEAM_WORKFLOW.md). [Dependency map](docs/project/TASK_DEPENDENCIES.md) có hai thứ tự và cặp song song. Sau đổi task: `--write-docs`, rồi `--check-docs`; regression: `python -m unittest discover -s tests -p "test_*.py"`. [PR template](.github/pull_request_template.md) và [review template](tasks/templates/REVIEW_TEMPLATE.md).
