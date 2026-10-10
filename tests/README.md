# Tests

[Plan](../docs/testing/TEST_PLAN.md). Fixtures là contract ví dụ, chưa được thuật toán app/SQL thực thi. GM-06, GM-14 chạy parity thật; E2E ở GM-26.

Regression tooling chạy bằng `python -m unittest discover -s tests -p "test_*.py"`: metadata/review/approval/evidence/dependency/DAG/parallel/P0 release/gate/checklist/generated-index drift/CLI exits. Ca mô phỏng Approved chỉ trên bản sao trong bộ nhớ, không duyệt task thật. CI chạy cùng lệnh và `python scripts/task_readiness.py --check-docs`. Test domain/app/SQL theo FOOD/T-* chưa có runner triển khai; unit tooling không thay native/data evidence.

[GM-03 food fixtures](fixtures/food-data-v1/README.md): 42 ca/27 dataset mô phỏng, input/expected cho GM-30, 10 món cơ sở để kiểm pool <=8. test_food_fixtures kiểm tính nhất quán dữ liệu/expected và các mốc đã viết rõ; không thực thi eligibility hoặc chứng minh parity TypeScript/SQL. Clock cấu trúc cố định, không dùng ngày hiện tại. Không đưa fixture vào seed thật.
