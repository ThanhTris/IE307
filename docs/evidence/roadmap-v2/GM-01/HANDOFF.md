# GM-01 — bàn giao bản chia task để review

2026-10-10. Owner Codex; reviewer Trí. Contract `food-v1/roadmap-v2/GM-01.1`. Trạng thái: chờ review, không phải Approved/Done. Revision là working tree trên `aeb1a83`, chưa có commit/PR mới; reviewer phải gắn SHA thực tế khi duyệt.

## Đầu vào và đầu ra

Đầu vào lịch sử: [GM-00 v0.2](../../GM-00/BASELINE_V02_2026-10-07.md), yêu cầu chia lại của chủ dự án và bằng chứng sandbox ghi trong [report](REPLAN_2026-10-10.md). Approval GM-00 không thay approval food-v1.

- [Lộ trình](../../../project/IMPLEMENTATION_ROADMAP.md): UI structure → component → màn mock → API/native; BE structure → contract/client → APIs; Data fields → DB → import.
- [Danh sách và owner](../../../project/TASK_SUMMARY.md), [dependency](../../../project/TASK_DEPENDENCIES.md), [artifact đầu vào/đầu ra](../../../project/TASK_HANDOFFS.md).
- [Mapping v1–v2](../../../project/TASK_RENUMBERING.md), snapshot 31 task cũ và task map machine-readable; scope cũ không bị mất khi tách task.
- Task/PR/review/handoff templates và checker được cập nhật đồng bộ; báo cáo có lệnh và kết quả verification.

## Cách dùng và giới hạn

Từ root chạy `python scripts/validate_repository.py`, `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`. Kỳ vọng PASS và 80 tests. `python scripts/task_readiness.py --task GM-02` hiện phải BLOCKED bởi GM-01 đang review; đây là kết quả đúng, không tự mở gate.

Sau review GM-01 đúng revision, GM-02 (Tuấn), GM-03 (Trí), GM-04 (Vinh) có thể nhận việc độc lập. Những owner/reviewer khác là đề xuất, cần xác nhận. Khi chuyển status sinh lại indexes. Trước merge kiểm target ref đã cập nhật, artifact thật và review/commit upstream.

Chưa import code sandbox, chưa có schema/API/dataset thật ở main, chưa sync GitHub issues, chưa commit/push. Bản task/mock/placeholder không chứng minh native hoặc dữ liệu đã chạy. Nếu cần đổi scope, cập nhật task map, task, ADR liên quan và sinh lại indexes; không sửa snapshot/evidence cũ.
