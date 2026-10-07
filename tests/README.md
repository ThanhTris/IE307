# Tests

[Plan](../docs/testing/TEST_PLAN.md). Fixtures là contract ví dụ, chưa được thuật toán app/SQL thực thi. GM-11/12 chạy parity thật; E2E ở GM-21.

Regression tooling chạy bằng `python -m unittest discover -s tests -p "test_*.py"`: metadata/review/approval/evidence/dependency/DAG/parallel/P0 release/gate/checklist/generated-index drift/CLI exits. Ca mô phỏng Approved chỉ trên bản sao trong bộ nhớ, không duyệt task thật. CI chạy cùng lệnh và `python scripts/task_readiness.py --check-docs`. Test domain/app/SQL theo FOOD/T-* chưa có runner triển khai; unit tooling không thay native/data evidence.
