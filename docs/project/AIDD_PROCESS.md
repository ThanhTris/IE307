# AIDD — từ ý định đến bằng chứng

Intent → Spec → Context → Patch plan → Implement → Verify → Independent review.

- Intent: kết quả thực tế cần đạt cho người chọn món, giới hạn và giả định.
- Spec: ID yêu cầu, AC có thể kiểm, state machine, contract, quyền và tình huống lỗi.
- Context: đưa cho AI đúng task, linked spec/ADR, fixture; không đưa secret/phiếu thật vào prompt.
- Patch plan: file sở hữu, contract version, phần độc lập với fixture và phần chờ tích hợp thật. Start deps chưa Done trên Project/thiếu output thì chưa dùng đầu vào đó; merge deps chưa xong vẫn được viết phần độc lập đã chốt.
- Implement: code theo feature/domain/data; không để screen quyết định winner.
- Verify: evidence thực tế cho từng AC; phân biệt test không chạy, test fail và test pass.
- Review: người khác owner xác nhận; AI không tự đánh Done. Cập nhật task/spec/ADR nếu đổi quyết định.

[Mẫu task](../../tasks/templates/TASK_TEMPLATE.md), [DoD](DEFINITION_OF_DONE.md), [traceability](../specs/TRACEABILITY.md).

Trước code chạy `python scripts/task_readiness.py --task GM-XX` cho start gate; theo [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md), checker lấy Done Project làm nghiệm thu dependency và kiểm output/HANDOFF, không chờ đồng bộ Markdown. Trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref, đối chiếu artifact/version, kiểm PR/commit và integration thật. [Dependency map](TASK_DEPENDENCIES.md) tách hai thứ tự; parallel_with có thể có quan hệ merge. Done cần AC/test/review thật theo [workflow](TEAM_WORKFLOW.md); AI không tự Approved/Done. Sinh lại indexes offline sau đổi metadata, không dùng chúng thay gate live.
