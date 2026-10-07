# Gì Cũng Được

Ứng dụng Android React Native giúp nhóm 2–8 người chọn món thỏa hiệp có giải thích trong tối đa hai vòng, rồi tìm quán/review theo vị trí. Card có ba nút; chạm hai lần chọn Muốn ăn. NO luôn loại món, server chốt kết quả một lần.

Baseline tài liệu v0.2 • 2026-10-07. GM-00 đã được review/chấp thuận. Hiện có spec/task/prototype/skeleton, chưa app Expo chạy được hoặc backend deploy. Không npm install root; GM-01 bootstrap sau khi thành viên nhận task.

## Đọc để hiểu dự án

1. [Mô tả hệ thống cho cả nhóm](docs/product/SYSTEM_OVERVIEW.md).
2. [PRD](docs/product/PRODUCT_REQUIREMENTS.md), [20 yêu cầu chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md), [spec index](docs/specs/README.md).
3. [27 task và trạng thái](docs/project/TASK_SUMMARY.md), [tiến độ 8 tuần](docs/project/PROJECT_PLAN.md), [phân công đề xuất](docs/project/TEAM_AND_RESPONSIBILITIES.md).
4. [Kế hoạch UI](docs/project/UI_IMPLEMENTATION_PLAN.md), [test plan](docs/testing/TEST_PLAN.md), [AIDD/DoD](docs/project/TEAM_WORKFLOW.md).
5. [Kiến trúc](docs/architecture/SYSTEM_ARCHITECTURE.md), [data](docs/architecture/DATA_MODEL.md), [API](docs/architecture/API_CONTRACT.md), [nghiên cứu 8 đối thủ](docs/research/LECTURER_APPS_REVIEW_2026-10-07.md).

Core có guest/QR/link, bạn quen/push, realtime, cache/outbox/history consent, context giờ/budget và location/review. Account nâng cao/venue radius P1, OCR/AI P2. Owner/reviewer đề xuất, thành viên tự nhận/đổi; không tự coi task Done. [GitHub mapping](docs/project/GITHUB_TASKS.md) ghi riêng phần chưa đồng bộ.

```text
mobile/       Expo Router/features/domain/adapters (skeleton)
supabase/     migrations/RPC/RLS/tests/trusted sender dự kiến
docs/         mô tả/PRD/spec/ADR/plan/test/evidence
tasks/        GM-00 review + GM-01..27 backlog
design/       design system/prototype HTML mô phỏng cũ
tests/        fixtures/E2E và validator regression
scripts/      validator tài liệu
```

Kiểm tài liệu: `python scripts/validate_repository.py`, `git diff --check`. Validator không thay independent review/native evidence.

[Prototype HTML](design/prototypes/gi-cung-duoc.html) chưa mô phỏng đầy đủ v0.2. Mở bằng browser hoặc local HTTP; nó không chứng minh QR/push/SQL/realtime. [Bắt đầu](docs/project/START_HERE.md).
