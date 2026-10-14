# Tests

[Plan](../docs/testing/TEST_PLAN.md). [Decision fixtures](fixtures/decision-v2/README.md) được engine legacy GM-06 (roadmap-v2 GM-15) thực thi bằng `node --test mobile/tests/decision.test.mjs` với Node 24. Chưa SQL parity hoặc backend finalize; GM-20 nhận fixtures để tích hợp thật. E2E theo roadmap-v2 GM-33.

Regression tooling chạy bằng `python -m unittest discover -s tests -p "test_*.py"`: metadata/review/approval/evidence/dependency/DAG/parallel/P0 release/gate/checklist/generated-index drift/CLI exits. Ca mô phỏng Approved chỉ trên bản sao trong bộ nhớ, không duyệt task thật. CI chạy cùng lệnh và `python scripts/task_readiness.py --check-docs`. Source hiện có mobile unit/domain và SQL/HTTP runners GM-06/08/17/18/19; xem [Supabase README](../supabase/README.md) và CHECKS/HANDOFF từng task. Unit tooling hoặc HTTP trên máy tính không thay native/app integration evidence.

Regression backend runner và quyền sở hữu runtime GM-19: `node --test tests/backend-runner.test.mjs tests/gm19-runtime-files.test.mjs`. Các file kiểm là synthetic, không dùng token thật; chạy thường/preflight Fail không được xóa runtime phiên khác. Bộ này không chứng minh lifecycle RPC hoặc real-JWT HTTP Pass.

[GM-03 food fixtures](fixtures/food-data-v1/README.md): 42 ca/27 dataset mô phỏng, input/expected cho GM-18 (mã nguồn lịch sử GM-30), 10 món cơ sở để kiểm pool <=8. test_food_fixtures kiểm tính nhất quán dữ liệu/expected và các mốc đã viết rõ; không thực thi eligibility hoặc chứng minh parity TypeScript/SQL. Clock cấu trúc cố định, không dùng ngày hiện tại. Không đưa fixture vào seed thật.

[GM-03 audit/review package](../docs/evidence/GM-03/REVIEW_PACKAGE.md): test_data_preparation_audit kiểm lỗi có file/entity/dòng/trường, duplicate/FK/source/unit/giá/lịch, guard fixture publish, CSV/checksum drift, tính ổn định và cách ly báo cáo. `python data-preparation/scripts/validate_data_preparation.py` chỉ đọc artifact; 9 nhóm kiểm không thay review nội dung/freshness hiện tại hoặc thuật toán.
