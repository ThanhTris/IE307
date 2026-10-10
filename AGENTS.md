# Hướng dẫn AI coding agent — Gì Cũng Được

## Bối cảnh

Dự án Android-first React Native giúp nhóm chọn món. Bộ nền gồm plan/spec/prototype, shell Expo GM-02 và BE local runner GM-03 đang kiểm/nghiệm thu; chưa triển khai tính năng/schema/API nghiệp vụ.

Nguồn yêu cầu: chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan → prototype/research. [Migration plan](docs/project/MIGRATION_PLAN.md) ghi giả định chờ review. Không dùng commit đề tài cũ làm yêu cầu active.

## AIDD

Trước code: task có owner, reviewer khác owner, scope, AC, spec, patch/test plan và contract version. Theo ADR-011 được chủ dự án chốt ngày 2026-10-10, `start_dependencies` lấy Done trên GitHub Project #2 làm xác nhận nghiệm thu của chủ dự án, không bắt đồng bộ Done/Approved trong Markdown để mở task. Được viết phần độc lập dù `merge_dependencies` chưa xong. Trước tích hợp/merge cần cả hai loại dependency Done trên Project, đủ output/HANDOFF, đúng contract/manifest/artifact trên nhánh đích, kiểm PR/commit và test thật. GM-00 là baseline lịch sử, vẫn kiểm approval local. Theo ADR-009, parallel_with không có quan hệ start trước/sau. GM-01 roadmap-v2 đã được chủ dự án xác nhận duyệt ngày 2026-10-10, xem docs/evidence/roadmap-v2/GM-01/REVIEW.md; không thay approval của task sau. Chạy `python scripts/task_readiness.py --task GM-XX` trước code; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref. Checker chỉ đọc Project, không tự fetch/merge, duyệt hoặc đổi trạng thái.

Đọc [workflow](docs/project/TEAM_WORKFLOW.md), [DoD](docs/project/DEFINITION_OF_DONE.md). AI không tự duyệt hoặc ghi Done. Thay phạm vi/kiến trúc/quyền riêng tư phải ghi ADR và hỏi owner khi chưa có ủy quyền. Cập nhật tài liệu/UI không cần task mới mỗi lần; gom vào task nền khi phù hợp.

Mã task hiện hành theo roadmap-v2: GM-01..38, dependency phải có số nhỏ hơn task. Xem docs/project/IMPLEMENTATION_ROADMAP.md, TASK_RENUMBERING.md và tasks/task-id-map.json (previous_ids chỉ truy vết scope cũ, có thể một–nhiều). Giữ snapshot/evidence roadmap-v1; evidence mới dùng docs/evidence/roadmap-v2/GM-XX/. UI: cấu trúc GM-02 → component theo mẫu GM-05 → màn mock GM-09..14 → tích hợp GM-24..31. BE: cấu trúc GM-03 → contract/client GM-07 → API; Data: field GM-04 → DB GM-06 → import GM-08. Mỗi task nhận artifact/version upstream, không tự đoán hoặc dựng lại nền. Không tự sync GitHub khi chỉ chia task local.

## React Native

- Expo + TypeScript strict; routes mỏng trong `mobile/src/app`; screens/use cases theo feature; domain độc lập UI/network.
- Chưa thêm package/lockfile hoặc thư viện native trước khi task bootstrap đủ dependency và reviewer chấp thuận dependency.
- FlatList, safe area, dark mode, font scaling, TalkBack, nút thay thế swipe.
- Server là nguồn chốt trạng thái/kết quả; local giữ nháp/cache. Không giả offline nhóm.

## Dữ liệu

- WANT/OK/NO; thiếu phiếu không phải OK. NO không thể thành winner.
- Hai vòng tối đa; server chọn một lần, kết quả ổn định qua retry/reconnect.
- Giữ kín phiếu bằng quyền database/RPC, không chỉ ẩn UI. Host không xem phiếu thô người khác.
- Supabase được chủ dự án xác nhận duyệt tại ADR-001/hồ sơ GM-01 ngày 2026-10-10; chỉ chọn stack, không thay nghiệm thu bảo mật. RPC đặc quyền kiểm auth/membership/version/expiry, fixed search_path, lock room và idempotency.
- Không secret/service_role trong client; không log phiếu/token; không gửi dữ liệu sang AI mặc định.
- Catalogue cuisine/category/nhiệt độ/vị phải có offering quán–món trong coverage và lịch quán/lịch món phù hợp trước tạo pool; source/freshness/unknown/overnight theo FOOD_DATA_SPEC. GPS chỉ gợi điểm ăn công cộng, không tự share GPS host.
- OCR/AI/weather/mood/fairness qua nhiều bữa là mở rộng, không chặn MVP. Ảnh cần quyền sử dụng; không tuyên bố an toàn dị ứng từ tên món.

## Chuẩn bị dữ liệu legacy GM-03 → roadmap-v2 GM-04

[Handoff hiện hành](docs/evidence/roadmap-v2/GM-04/HANDOFF.md) đối chiếu nhánh data cũ với roadmap-v2. GM-03 hiện tại là BE structure của Trí; không thay task đó bằng metadata dữ liệu. GM-03 roadmap-v1 nhận scope tại GM-04/GM-07; verified import là GM-08; food eligibility là GM-18. [Đồng bộ v1 lịch sử](docs/evidence/roadmap-v1/GM-03/MAIN_SYNC.md) và evidence đời trước giữ nguyên, mã cũ không là task hiện tại.

Đọc [handoff dữ liệu](data-preparation/docs/HANDOFF.md), [taxonomy](data-preparation/docs/TAXONOMY.md), [dictionary](data-preparation/docs/DATA_DICTIONARY.md) và [forms](data-preparation/templates/README.md) cho nguồn/ID/nullable/CSV/JSON/validator. [Catalogue](data-preparation/docs/EDITORIAL_CATALOGUE.md) có 39 món draft, giá theo menu; artwork chưa review giữ null. Giữ snapshot/cache/pilot nguyên trạng, mặc định offline, không gọi lại AI hoặc dùng làm verified seed. Contract v2 đề xuất ở [dictionary food/core](docs/data/FOOD_DATA_DICTIONARY.md), [field coverage](docs/data/FIELD_COVERAGE.md), schema/template trong supabase/seed/templates và [cases GM-04](tests/fixtures/food-v1/README.md). Chạy `python scripts/validate_field_contracts.py --cases` và `python scripts/build_field_contracts.py --check`; food adapter 1.1.0 không đổi snapshot 1.0.0. [Checks GM-04](docs/evidence/roadmap-v2/GM-04/CHECKS.md) là contract assertions, chưa SQL/RPC/eligibility hoặc approval.

[Fixtures food](tests/fixtures/food-data-v1/README.md) mô phỏng cho eligibility GM-18, fixtureOnly=true, clock cố định; verified/reviewer/license chỉ mô phỏng, không nghiệm thu parity. [Review package lịch sử](docs/evidence/GM-03/REVIEW_PACKAGE.md) cho Tâm; chạy `python data-preparation/scripts/validate_data_preparation.py` để audit chỉ đọc. validStructure không là approval/publish/freshness hiện tại.

## Bàn giao

Đầu ra theo docs/project/TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md: UI mở Expo thấy/tương tác các mục task; BE có Postman/curl/runner input-response-assertions thật (nền/contract/domain kiểm đúng stage); Data đủ field/schema/template/fixture/version để BE làm song song. Mỗi task có CHECKS.md + HANDOFF.md; API task có request suite supabase/tests/http/GM-XX.http. Not run/Fail của AC bắt buộc chặn Done; placeholder/docs CI không thay output thật. Shell Expo Go không bị native module crash; tính năng không hỗ trợ Expo Go cần development/native build evidence riêng. Plan cấu trúc đã được chủ dự án xác nhận tại docs/project/FOUNDATION_IMPLEMENTATION_PLAN.md, không thay approval baseline/package.

Chạy `python scripts/validate_repository.py`, regression `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`, kiểm diff và evidence. Sau đổi metadata task sinh lại indexes bằng `--write-docs`. Project Done là nguồn nghiệm thu dependency; AI không tự chuyển Done. Nếu chuyển task Markdown vào tasks/done thì vẫn phải có Decision Approved, reviewer độc lập/ngày và Review-evidence thật, không tự tạo để khớp board. Validator/indexes là offline, không mở task. `--approval-source local` chỉ chẩn đoán lịch sử, không là cách vượt gate Project. Thiếu credential/quyền read:project/mạng hoặc item không xác minh được phải chặn, không dùng Issue Closed hay cache thay Done. Xem docs/project/PROJECT_READINESS.md. HTML phải ghi rõ mô phỏng; native build có evidence riêng. Không sinh tài liệu đề tài cũ để vượt kiểm tra. Sinh Word mới khi có yêu cầu/template chốt.

Không tự commit/push nếu chưa được yêu cầu. Validator không thay review độc lập.
