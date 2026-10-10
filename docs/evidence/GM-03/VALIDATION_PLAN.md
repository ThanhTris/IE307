# GM-03 phần 5 — patch/test plan để review

Ngày soạn: 2026-10-10. Owner: Vinh; reviewer đề xuất: Tâm. **Decision: Pending**; chưa có xác nhận phân công hoặc review plan từ Tâm. Chủ dự án yêu cầu triển khai tooling draft trong cuộc trao đổi; điều này không thay approval dependency GM-28. [Task](../../../tasks/backlog/GM-03.md), [spec](../../specs/FOOD_DATA_SPEC.md), [workflow](../../project/TEAM_WORKFLOW.md).

## Patch plan

1. Commit riêng fixtures phần 4, đã kiểm 184 regression tests, không push: `27854223b2670a8b73ed61f32c0a82501456cccd`.
2. Thêm `data-preparation/scripts/validate_data_preparation.py`: audit chỉ đọc các artifact đã theo dõi; tái dùng validator contract, mapping, editorial và fixtures. Kiểm manifest/checksum/byte size, registry UUID, dữ liệu sinh lại trong bộ nhớ, metadata nguồn/giá, CSV–JSON, schema/FK và expected fixture. Không sửa dataset, gọi mạng/API hoặc cài package.
3. Thêm notebook xem audit, các trường thiếu và lỗi minh họa trên bản sao trong bộ nhớ. Báo cáo chạy cục bộ và notebook executed nằm datasets Git-ignored. Không viết vào snapshots/fixtures bằng audit.
4. Thêm regression tests: input hỏng trả lỗi có file/entity/dòng/trường; ID trùng/FK/source/unit/giá/lịch/publish fixture; checksum và CSV drift; cùng input/clock cho cùng báo cáo, không network hoặc thay dữ liệu thật.
5. Bàn giao report máy, nguồn/license, inventory checksum và bảng từng AC trong review package; cập nhật hướng dẫn agent. Phần 5 giữ working tree để owner/reviewer xem.

## Test plan

- Audit draft catalogue/forms ở `2026-10-10T03:00:00Z`, clock cố định phục vụ đối chiếu lịch sử; **không xác nhận dữ liệu còn hạn hôm nay**. Suite fixture dùng validationAt riêng `2026-10-08T00:00:00Z`; evaluatedAt trong từng ca giữ nguyên để GM-30 kiểm freshness.
- Chạy hai lần audit/notebook offline, so báo cáo cùng checksum và các input không đổi; không chạy thuật toán eligibility để sinh/kiểm expected.
- Chạy toàn bộ `python -m unittest discover -s tests -p 'test_*.py'`, repository validator, task index và diff check. Readiness GM-03 ghi riêng BLOCKED, không coi đó là review mở khóa.
- Các thiếu sót hợp lệ ở draft (ảnh null, thiếu mô tả/phân loại, validUntil/reviewer null, catalogue chỉ 39 món, offering/lịch thật chưa có) là cảnh báo/hạng mục review, không che thành dữ liệu verified.
- Chưa kiểm Jupyter kernel, native, SQL, TypeScript–SQL parity, chất lượng ảnh hoặc quyền dùng menu thực tế. Không tự đánh dấu AC hay task Approved/Done.

Reviewer cần chốt phạm vi 39/60–80, lựa chọn taxonomy/mapping, nguồn nội dung/giá, cách dùng license/ảnh, nullable/freshness và patch/test plan này trước quyết định chấp thuận chính thức. Không có ADR/schema/app/SQL mới trong phần 5.
