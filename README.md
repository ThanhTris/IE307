# Gì Cũng Được

Ứng dụng Android React Native giúp nhóm tối đa 20 người chọn món trong tối đa hai vòng. Host chọn 10–20 món từ catalogue độc lập quán/vị trí, nhóm bỏ phiếu, server chốt kết quả ổn định rồi hỗ trợ tìm quán cho món thắng. Đây là hướng đích ADR-019/020; runtime v3 và phiên legacy vẫn giữ policy đã pin.

Roadmap-v2 • ngữ cảnh cập nhật 2026-10-25. Source có nền Expo/UI baseline, schema/import, client/mock, engine, auth/RLS, eligibility, room/ballot/history/social/notifications và dish-session v3 (0026/schema0.8.0). Contract B/v4, luật R2 mới, Top3 và history tương ứng còn phần triển khai; source và DB đang chạy phải được kiểm riêng. [Phạm vi hiện hành chỉ BE/Data](docs/project/BE_DATA_ONLY_SCOPE_2026-10-25.md) và [audit source/UI](docs/project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md) chỉ rõ đầu ra cần bổ sung; FE chờ Trí chốt Figma. Status/assignee/Deadline hiện hành xem [Project #2](https://github.com/users/ThanhTris/projects/2), không suy từ thư mục task hoặc evidence lịch sử. Hai gate: đủ start deps thì viết phần độc lập; đủ merge deps và tích hợp thật mới merge.

## Đọc để hiểu dự án

Task đã đánh số theo lộ trình GM-01 → GM-40; dependency chỉ trỏ số nhỏ hơn. [Bảng mã cũ–mới](docs/project/TASK_RENUMBERING.md) giúp tra issue/evidence cũ; không dùng mã cũ để nhận task hiện tại.

1. [Mô tả hệ thống cho cả nhóm](docs/product/SYSTEM_OVERVIEW.md).
2. [PRD](docs/product/PRODUCT_REQUIREMENTS.md), [21 yêu cầu chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md), [spec index](docs/specs/README.md).
3. [40 task và trạng thái](docs/project/TASK_SUMMARY.md), [tiến độ theo dependency](docs/project/PROJECT_PLAN.md), [phân công đề xuất](docs/project/TEAM_AND_RESPONSIBILITIES.md).
4. [Kế hoạch UI](docs/project/UI_IMPLEMENTATION_PLAN.md), [test plan](docs/testing/TEST_PLAN.md), [AIDD/DoD](docs/project/TEAM_WORKFLOW.md).
5. [Kiến trúc](docs/architecture/SYSTEM_ARCHITECTURE.md), [data](docs/architecture/DATA_MODEL.md), [API](docs/architecture/API_CONTRACT.md), [nghiên cứu 8 đối thủ](docs/research/LECTURER_APPS_REVIEW_2026-10-07.md).

Phạm vi core dự kiến gồm guest/QR/link, friends/push, realtime/outbox/history, taxonomy/catalogue món độc lập; quán–món–lịch bán/coverage chỉ còn ở baseline legacy, Places là bước sau kết quả; không phải mọi mục đã triển khai. Account P1; OCR/AI/weather–mood P2. Phân công theo Project; Trí (`ThanhTris`) review mọi task, kể cả task Trí làm, theo ADR-013. [GitHub mapping](docs/project/GITHUB_TASKS.md) và [workflow](docs/project/TEAM_WORKFLOW.md).

```text
mobile/       shell/components, client/mock/auth, decision/eligibility domains
supabase/     schema/import, RLS, room/ballot/history/social RPC, dish-session v3
docs/         mô tả/PRD/spec/ADR/plan/test/evidence
tasks/        scope/AC/dependencies; Done live trên Project, không từ folder
design/       design system/prototype HTML mô phỏng cũ
tests/        fixtures/E2E và validator regression
scripts/      validator, dependency gate/indexes và backend local runner
data-preparation/ notebooks và công cụ khảo sát/xử lý dữ liệu
```

Kiểm tài liệu: `python scripts/validate_repository.py`, `git diff --check`. Validator không thay review của Trí hoặc native/API/data evidence.

Chạy UI: theo [mobile README](mobile/README.md), `cd mobile`, `npm ci`, `npm start` (Expo Go LAN). Chạy BE: theo [Supabase README](supabase/README.md), tại root `npm ci`, bật Docker Linux engine, `npm run backend:start`, `npm run backend:smoke`, `npm run backend:test`. Git pull và health200 không chứng minh DB/RPC đã đồng bộ: kiểm ledger/definitions trước dùng, không tự reset database có dữ liệu. [Chuẩn output UI/BE/Data](docs/project/TASK_OUTPUT_REQUIREMENTS.md) và [checklist 40 task](docs/project/TASK_OUTPUT_CHECKLIST.md) ghi phép nghiệm thu từng task, không chỉ file/checkbox.
[Chuẩn bị dữ liệu](data-preparation/README.md): khảo sát thực đơn khu Thủ Đức cũ, chuẩn hóa tên món và truy vết về menu nguồn. Dữ liệu cục bộ cùng CSV sinh ra nằm trong thư mục datasets được Git bỏ qua.

[Prototype HTML](design/prototypes/gi-cung-duoc.html) không là bằng chứng đáp ứng food-v1. Mở bằng browser hoặc local HTTP; nó không chứng minh QR/push/SQL/realtime. [Bắt đầu](docs/project/START_HERE.md).

Trước nhận việc: `python scripts/task_readiness.py --task GM-XX`. Checker đọc Done hoặc Needs Update trên GitHub Project làm xác nhận nghiệm thu baseline dependency; Needs Update không nghiệm thu supplement; cần quyền đọc `read:project`, không dùng Issue Closed hoặc cache thay Done/Needs Update. Xem [Project readiness](docs/project/PROJECT_READINESS.md). Trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref; đối chiếu artifact/version trên target, PR/commit và integration thật theo [workflow](docs/project/TEAM_WORKFLOW.md). [Dependency map](docs/project/TASK_DEPENDENCIES.md) có hai thứ tự và cặp song song. Sau đổi task: `--write-docs`, rồi `--check-docs` (offline, không mở task); regression: `python -m unittest discover -s tests -p "test_*.py"`. [PR template](.github/pull_request_template.md) và [review template](tasks/templates/REVIEW_TEMPLATE.md).

[GM-04 food/core field contract](docs/data/FOOD_DATA_DICTIONARY.md): schema/template, field coverage và 166 ca mô phỏng offline cho GM-06/07. [GM-08 handoff](docs/data/DATASET_HANDOFF.md) bàn giao bundle thật trên DB test; dữ liệu lọc chưa biết giữ null/unknown/empty, không gọi fixture là dataset production đã publish. SQL/eligibility/lifecycle có bộ kiểm riêng theo HANDOFF từng task.
