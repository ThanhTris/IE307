# GM-03 — Kế hoạch bản nháp

Ngày 2026-10-08; branch `sanbox`, đầu vào commit `36132e9`. Chủ dự án yêu cầu qua task tiếp theo sau khi test GM-02. `task_readiness.py --task GM-03` trả BLOCKED vì GM-01 còn review. Theo ủy quyền hiện tại, Codex soạn bản nháp; không tự nhận thay Vinh/Tâm, đổi assignment hoặc Approved/Done, không mở gate downstream.

## Scope và contract

Thực hiện taxonomy cuisine/origin/category/temperature/flavor/mealSlots, DTO, data dictionary, JSON template và fixtures. Nguồn: FOOD_DATA_SPEC, CATALOG_PREFERENCES_SPEC, DATA_MODEL, API_CONTRACT. Contract dự thảo `food-v1.gm03-draft.1`; dữ liệu thuần JSON/TypeScript, độc lập provider. Không tạo SQL/database/API/UI, thuật toán eligibility/ranking GM-11 hoặc catalogue/quán khảo sát thật GM-08. Không thêm dependency/lockfile, ảnh mạng, credentials hoặc publish dữ liệu.

## Patch plan

- `mobile/src/domain/catalogue/`: types, taxonomy và validator thuần; không UI/SDK/network.
- `tests/fixtures/food-v1/`: dataset mô phỏng, context/pool cases cho review và downstream. Có label fixture, nguồn nội bộ, giá/tọa độ tổng hợp; không trộn với seed thật.
- `supabase/seed/templates/food-v1.template.json`: envelope nhập liệu rỗng theo contract; chưa là migration/seed được chạy. Vị trí theo patch plan task, nội dung độc lập backend.
- `docs/data/FOOD_DATA_DICTIONARY.md`, README fixtures/seed: ID/version/null/unit/rights/freshness/ownership và cách dùng.
- `mobile/tests/catalogueContract.test.ts`: kiểm valid và field errors/ref/boundaries/fixture pool; không mô phỏng rồi báo eligibility thật.
- `tasks/backlog/GM-03.md` và `docs/evidence/roadmap-v1/GM-03/`: tiến độ, test card, output và báo cáo; giữ metadata/gates.

## Test plan

Kiểm multi-label/alias trùng, temperature tách spicy, unknown vs none; giá nullable/unit/negative/min>max, tọa độ/ring/timezone/time/date/overnight; FK/unique offering/owner schedule; nguồn/ảnh quyền dùng và review khác nhập ở publish. Fixture không được publish; con stale không được hạn dataset che. Pool tối đa 8, không trùng dish/variant, không sinh ứng viên khi rỗng; scenarios category xung đột, meal/budget/seed/context và overnight/out-of-coverage có input/expected mô phỏng.

Chạy `npm.cmd run check` và kiểm Python validator/regression/indexes/diff. Bàn giao lệnh test cụ thể, path fixtures và kết quả mong đợi; test này không yêu cầu Expo Go hoặc Android SDK. Không commit/push tự động.
