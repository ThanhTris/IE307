# GM-01 — bàn giao bản chia task để review

2026-10-10. Owner Codex; reviewer Trí. Contract `food-v1/roadmap-v2/GM-01.1`. Chủ dự án xác nhận đã duyệt và cho phép ghi Done/Approved, xem [review](REVIEW.md). Revision nền `4f154af714411e81351e7761ceca281b1436fa68` + working-tree cập nhật chuẩn đầu ra; chưa có commit mới. Không giả SHA review độc lập do người dùng cung cấp.

## Đầu vào và đầu ra

Đầu vào lịch sử: [GM-00 v0.2](../../GM-00/BASELINE_V02_2026-10-07.md), yêu cầu chia lại của chủ dự án và bằng chứng sandbox ghi trong [report](REPLAN_2026-10-10.md). Approval GM-00 không thay approval food-v1.

- [Lộ trình](../../../project/IMPLEMENTATION_ROADMAP.md): UI structure → component → màn mock → API/native; BE structure → contract/client → APIs; Data fields → DB → import.
- [Danh sách và owner](../../../project/TASK_SUMMARY.md), [dependency](../../../project/TASK_DEPENDENCIES.md), [artifact đầu vào/đầu ra](../../../project/TASK_HANDOFFS.md).
- [Mapping v1–v2](../../../project/TASK_RENUMBERING.md), snapshot 31 task cũ và task map machine-readable; scope cũ không bị mất khi tách task.
- Task/PR/review/handoff templates và checker được cập nhật đồng bộ; báo cáo có lệnh và kết quả verification.

## Cách dùng và giới hạn

Từ root chạy `python scripts/validate_repository.py`, `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`. Kết quả trước ghi nhận review: PASS và 87 tests, xem [checks](CHECKS.md). Sau ghi nhận chạy lại indexes/readiness; start input GM-01 được mở theo approval của chủ dự án, không bỏ gate merge với target.

GM-02 (Tuấn), GM-03 (Trí), GM-04 (Vinh) nhận baseline độc lập; Codex hỗ trợ GM-02/03 theo yêu cầu triển khai của chủ dự án. Những owner/reviewer vẫn giữ nguyên; không giả assignment GitHub đã được thành viên nhận. Khi chuyển status sinh lại indexes. Trước merge kiểm target ref đã cập nhật, artifact thật và review/commit upstream; bản approval working tree chưa tồn tại trên origin/main.

Chưa import code sandbox, chưa có schema/API/dataset thật ở main, chưa sync GitHub issues, chưa commit/push. Bản task/mock/placeholder không chứng minh native hoặc dữ liệu đã chạy. Nếu cần đổi scope, cập nhật task map, task, ADR liên quan và sinh lại indexes; không sửa snapshot/evidence cũ.
