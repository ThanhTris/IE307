# AIDD — từ ý định đến bằng chứng

Intent → Spec → Context → Patch plan → Implement → Verify → Independent review.

- Intent: kết quả thực tế cần đạt cho người chọn món, giới hạn và giả định.
- Spec: ID yêu cầu, AC có thể kiểm, state machine, contract, quyền và tình huống lỗi.
- Context: đưa cho AI đúng task, linked spec/ADR, fixture; không đưa secret/phiếu thật vào prompt.
- Patch plan: tóm tắt file sửa, bước nhỏ nhất, kiểm thử trước khi code. Dependency chưa review thì chưa triển khai phần phụ thuộc.
- Implement: code theo feature/domain/data; không để screen quyết định winner.
- Verify: evidence thực tế cho từng AC; phân biệt test không chạy, test fail và test pass.
- Review: người khác owner xác nhận; AI không tự đánh Done. Cập nhật task/spec/ADR nếu đổi quyết định.

[Mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [DoD](DEFINITION_OF_DONE.md), [traceability](../specs/TRACEABILITY.md).
