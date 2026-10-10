# Hướng dẫn AI coding agent — Gì Cũng Được

## Bối cảnh

Dự án Android-first React Native giúp nhóm chọn món. Bộ nền gồm plan/spec/prototype, shell Expo GM-02 và BE local runner GM-03 đang kiểm/nghiệm thu; chưa triển khai tính năng/schema/API nghiệp vụ.

Nguồn yêu cầu: chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan → prototype/research. [Migration plan](docs/project/MIGRATION_PLAN.md) ghi giả định chờ review. Không dùng commit đề tài cũ làm yêu cầu active.

## AIDD

Trước code: task có owner, reviewer khác owner, scope, AC, spec, patch/test plan và contract version. `start_dependencies` phải được review; được viết phần độc lập theo contract/fixture dù `merge_dependencies` chưa xong. Trước tích hợp/merge cần cả hai loại dependency Approved, đúng bản task/evidence trên nhánh đích, kiểm PR/commit và test thật. Theo ADR-009 (cập nhật ADR-006), parallel_with cho phép quan hệ merge trước/sau nhưng không quan hệ start trước/sau. GM-00 chỉ duyệt v0.2; food-v1 vẫn chờ GM-01. Chạy `python scripts/task_readiness.py --task GM-XX` trước code; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref. Checker không tự fetch/merge hoặc thay review.

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

## Chuẩn bị dữ liệu GM-03

Đọc [handoff](data-preparation/docs/HANDOFF.md) để biết nguồn/snapshot/giới hạn, [taxonomy](data-preparation/docs/TAXONOMY.md) để biết giá trị chuẩn và cách gộp món. Notebook/config/snapshot trong `data-preparation/` là draft owner yêu cầu; không mở khóa GM-28, không dùng làm seed đã review. Giữ nguyên pilot/cache; mặc định offline, không gọi lại AI.

## Bàn giao

Đầu ra theo docs/project/TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md: UI mở Expo thấy/tương tác các mục task; BE có Postman/curl/runner input-response-assertions thật (nền/contract/domain kiểm đúng stage); Data đủ field/schema/template/fixture/version để BE làm song song. Mỗi task có CHECKS.md + HANDOFF.md; API task có request suite supabase/tests/http/GM-XX.http. Not run/Fail của AC bắt buộc chặn Done; placeholder/docs CI không thay output thật. Shell Expo Go không bị native module crash; tính năng không hỗ trợ Expo Go cần development/native build evidence riêng. Plan cấu trúc đã được chủ dự án xác nhận tại docs/project/FOUNDATION_IMPLEMENTATION_PLAN.md, không thay approval baseline/package.

Chạy `python scripts/validate_repository.py`, regression `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`, kiểm diff và evidence. Sau đổi metadata task sinh lại indexes bằng `--write-docs`. Done phải có Decision Approved, reviewer độc lập/ngày và Review-evidence file thật. HTML phải ghi rõ mô phỏng; native build có evidence riêng. Không sinh tài liệu đề tài cũ để vượt kiểm tra. Sinh Word mới khi có yêu cầu/template chốt.

Không tự commit/push nếu chưa được yêu cầu. Validator không thay review độc lập.
