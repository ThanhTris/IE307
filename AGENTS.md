# Hướng dẫn AI coding agent — Gì Cũng Được

## Bối cảnh

Dự án Android-first React Native giúp nhóm chọn món. Bộ nền mới gồm plan, spec, prototype và skeleton; chưa có ứng dụng/API triển khai.

Nguồn yêu cầu: chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan → prototype/research. [Migration plan](docs/project/MIGRATION_PLAN.md) ghi giả định chờ review. Không dùng commit đề tài cũ làm yêu cầu active.

## AIDD

Trước code: task có owner, reviewer khác owner, scope, AC, spec, patch/test plan và contract version. `start_dependencies` phải được review; được viết phần độc lập theo contract/fixture dù `merge_dependencies` chưa xong. Trước tích hợp/merge cần cả hai loại dependency Approved, đúng bản task/evidence trên nhánh đích, kiểm PR/commit và test thật. Theo ADR-006, parallel_with cho phép quan hệ merge trước/sau nhưng không quan hệ start trước/sau. GM-00 chỉ duyệt v0.2; food-v1 vẫn chờ GM-01. Chạy `python scripts/task_readiness.py --task GM-XX` trước code; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref. Checker không tự fetch/merge hoặc thay review.

Đọc [workflow](docs/project/TEAM_WORKFLOW.md), [DoD](docs/project/DEFINITION_OF_DONE.md). AI không tự duyệt hoặc ghi Done. Thay phạm vi/kiến trúc/quyền riêng tư phải ghi ADR và hỏi owner khi chưa có ủy quyền. Cập nhật tài liệu/UI không cần task mới mỗi lần; gom vào task nền khi phù hợp.

Mã task hiện hành theo roadmap-v1: GM-01..31, dependency phải có số nhỏ hơn task. Xem docs/project/TASK_RENUMBERING.md và tasks/task-id-map.json khi tra mã cũ; previous_id không là dependency. Giữ evidence lịch sử, evidence mới dùng docs/evidence/roadmap-v1/GM-XX/. Không tự đổi số issue hoặc sync GitHub khi chỉ đổi mã task local.

## React Native

- Expo + TypeScript strict; routes mỏng trong `mobile/src/app`; screens/use cases theo feature; domain độc lập UI/network.
- Chưa thêm package/lockfile hoặc thư viện native trước khi task bootstrap đủ dependency và reviewer chấp thuận dependency.
- FlatList, safe area, dark mode, font scaling, TalkBack, nút thay thế swipe.
- Server là nguồn chốt trạng thái/kết quả; local giữ nháp/cache. Không giả offline nhóm.

## Dữ liệu

- WANT/OK/NO; thiếu phiếu không phải OK. NO không thể thành winner.
- Hai vòng tối đa; server chọn một lần, kết quả ổn định qua retry/reconnect.
- Giữ kín phiếu bằng quyền database/RPC, không chỉ ẩn UI. Host không xem phiếu thô người khác.
- Supabase là đề xuất ADR chờ review. RPC đặc quyền kiểm auth/membership/version/expiry, fixed search_path, lock room và idempotency.
- Không secret/service_role trong client; không log phiếu/token; không gửi dữ liệu sang AI mặc định.
- Catalogue cuisine/category/nhiệt độ/vị phải có offering quán–món trong coverage và lịch quán/lịch món phù hợp trước tạo pool; source/freshness/unknown/overnight theo FOOD_DATA_SPEC. GPS chỉ gợi điểm ăn công cộng, không tự share GPS host.
- OCR/AI/weather/mood/fairness qua nhiều bữa là mở rộng, không chặn MVP. Ảnh cần quyền sử dụng; không tuyên bố an toàn dị ứng từ tên món.

## Bàn giao

Chạy `python scripts/validate_repository.py`, regression `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`, kiểm diff và evidence. Sau đổi metadata task sinh lại indexes bằng `--write-docs`. Done phải có Decision Approved, reviewer độc lập/ngày và Review-evidence file thật. HTML phải ghi rõ mô phỏng; native build có evidence riêng. Không sinh tài liệu đề tài cũ để vượt kiểm tra. Sinh Word mới khi có yêu cầu/template chốt.

Không tự commit/push nếu chưa được yêu cầu. Validator không thay review độc lập.
