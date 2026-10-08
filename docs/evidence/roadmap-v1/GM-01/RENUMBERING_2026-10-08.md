# Evidence — đánh số task theo lộ trình

Ngày: 2026-10-08. Người thực hiện: Codex. Reviewer: Trí, chưa có quyết định Approved. Task hiện hành: [GM-01](../../../../tasks/review/GM-01.md), trước đây là GM-28.

## Phạm vi và kết quả

Chủ dự án yêu cầu task sau chỉ phụ thuộc số trước, không để task 03 cần task 28. Đã đánh lại GM-01..31 theo topo của cả start_dependencies và merge_dependencies; giữ GM-00 lịch sử. GM-01 là review food-v1, GM-03 taxonomy chỉ chờ GM-01, GM-27 release, GM-28..31 mở rộng.

[Mapping và lộ trình](../../../project/TASK_RENUMBERING.md) · [ADR-007](../../../architecture/decisions/ADR-007-task-roadmap-numbering.md) · [Mapping JSON](../../../../tasks/task-id-map.json).

Đối chiếu toàn bộ 32 task với snapshot đầu lượt: title/owner/reviewer/priority/status/assignment_status/github_issue giữ nguyên theo identity cũ–mới; start/merge/parallel edges sau ánh xạ khớp hoàn toàn, không khác biệt. Có 126 khai báo dependency tính riêng hai gate (có thể trùng giữa hai gate), tất cả trỏ ID nhỏ hơn. Không đảo/xóa phụ thuộc thật để ép thứ tự. 28 cặp song song vẫn được giữ.

Đồng bộ filename/metadata/checklist, FR/spec/API/test plan, workflow/templates và generator. Các ID trong tài liệu lịch sử được đánh dấu là mã cũ; issue URL không đổi, remote chưa sync. Evidence mới dùng namespace roadmap-v1 để không đè folder mã cũ.

## Kiểm tra đã chạy

- `python scripts/validate_repository.py`: đạt links/metadata/FR/mapping/ID liên tiếp/graph/numeric dependency.
- `python -m unittest discover -s tests -p "test_*.py"`: 68 tests đạt. Thêm regression forward start/merge edge dù không cycle, mapping một-một, previous_id khớp, thiếu số, JSON lỗi và taxonomy đúng gate mới. Approvals giả lập chỉ tồn tại trong memory tests.
- `python scripts/task_readiness.py --write-docs` và `--check-docs`: bốn indexes đã sinh lại và khớp.
- `python scripts/task_readiness.py --task GM-03`: exit 1 đúng kỳ vọng, chỉ WAIT GM-01 review.
- Cùng task với `--gate merge --base-ref origin/main`: exit 1 đúng kỳ vọng, vẫn WAIT GM-01. Ref local là `3d5c2240126a7e29f70c0a8e36723db0b1fea43b`, không fetch/xác minh trạng thái remote mới.
- `git diff --numstat -- tasks/done/GM-00.md docs/evidence/GM-00`: không có thay đổi; giữ nguyên approval/evidence lịch sử.
- `git diff --check`: đạt sau đổi số; kiểm lại trước bàn giao.

## Giới hạn

GM-01 vẫn review; 30 task triển khai vẫn backlog/proposed. Không tự Approved/Done, commit/push/sync issue hoặc chạy native/backend. Không chỉnh prototype đang có thay đổi ngoài phạm vi. Cảnh báo Python launcher không ngăn validator/tests chạy; không sửa môi trường.

Người review/merge cần đối chiếu scope/contract và PR/commit đúng revision; số task và CI không thay evidence tích hợp thật. Không coi cùng GM-ID trên branch dùng mã cũ là cùng task hiện hành.
