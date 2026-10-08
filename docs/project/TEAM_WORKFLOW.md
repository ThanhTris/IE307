# Workflow — viết song song, merge có thứ tự

Task Markdown là nguồn trạng thái; GitHub có thể còn scope cũ. Theo [ADR-006](../architecture/decisions/ADR-006-parallel-start-ordered-merge.md), chủ dự án đã yêu cầu tách hai gate. GM-01 vẫn chờ Trí review food-v1, không tự mở khóa từ GM-00.

## Trước bắt đầu phần độc lập

Mã hiện hành GM-01..31 theo [lộ trình](TASK_RENUMBERING.md); dependency chỉ được trỏ số nhỏ hơn. GM-03 chờ review GM-01, không chờ account GM-28. parallel_with là cặp phối hợp, không là điều kiện chặn nên có thể chứa số lớn hơn. Issue/evidence cũ phải tra mapping, không suy task theo số cũ.

1. Chạy `python scripts/task_readiness.py --task GM-XX` (mặc định --gate start); chỉ start_dependencies phải Done/Approved với reviewer/ngày/evidence hợp lệ.
2. Owner/reviewer xác nhận nhận việc, assignment_status=accepted; chốt patch/test plan và phần “Làm trước” trong task. READY_TO_CLAIM chưa có nghĩa đã nhận việc.
3. Draft PR ghi commit contract/fixtures cụ thể: input/output/error/nullable/version và owner upstream, dựa trên spec/API/data model đã review. Interface chưa rõ hoặc đổi thì thống nhất trước phần bị ảnh hưởng; không tự đoán/copy shared types.
4. Dùng nhánh riêng; mặc định `codex/gm-xx-mo-ta` khi agent tạo nhánh. Viết UI/view model/adapter/pure rules/tests với fake đúng contract dù merge_dependencies chưa Done. Ghi rõ mock và Not run nếu thiếu runner; không dùng mock đóng AC thật.
5. Chuyển backlog → in-progress và sửa status cùng lúc, không copy task. Được mở draft PR/review sớm, chưa đồng nghĩa đủ merge. Mỗi người một task chính; không bắt cả nhóm chờ cùng lớp.

## File ownership và contract

- GM-02 (Tuấn): package/lockfile/config/runner. Task khác đề xuất dependency qua review, không tự tạo tooling cạnh tranh.
- GM-03 (Vinh): taxonomy/DTO/templates; GM-05 (Tâm): schema/SQL setup/migration numbering. Khảo sát GM-08 và schema GM-05 làm song song sau GM-03.
- GM-04 (Trang): shared UI primitives. Screen dùng interface đã chốt; fake trong test/feature riêng, không ghi đè primitives đang làm.
- Feature owner giữ file patch plan; shared adapters/types/routes/fixtures phải ghi người sửa trong PR. Migration/test/fixture tên task riêng; không sửa migration đã merge.
- Đổi API: cập nhật spec/ADR khi cần, báo owner/reviewer upstream và downstream; review lại revision mới, không tái dùng Approved cũ.
- Có thể dùng stacked branch để chạy thử; PR ghi cha. Cha merge xong thì cập nhật/rebase/retarget về target, kiểm diff chỉ còn scope mình và chạy lại tests. Không tự merge cả stack.

## Trước merge từng PR

1. Xem [dependency map](TASK_DEPENDENCIES.md). Cả start_dependencies và merge_dependencies phải Done/Approved; task/evidence upstream đúng revision trên target. Không đợi task không liên quan.
2. Cập nhật ref target (fetch sau khi xác nhận remote), chạy:

   `python scripts/task_readiness.py --task GM-XX --gate merge --base-ref origin/main`

   Checker in SHA snapshot local. Chưa fetch được thì không tuyên bố remote mới. BLOCKED_ON_BASE = task/evidence upstream thiếu hoặc khác revision. READY_FOR_MERGE_REVIEW chỉ xác nhận đầu vào, không tự cho phép merge.
3. Điền PR/merge commit upstream trong mẫu PR, kiểm code đã vào target chứ không chỉ task Markdown. Có thể dùng `git merge-base --is-ancestor <merge-commit> <target-ref>`; với squash dùng commit squash thực tế, không dùng SHA nhánh cũ. Checker không tự kiểm phần này.
4. Cập nhật branch từ target, xử lý conflict contract/schema/types; chạy typecheck/lint/test/native/SQL theo AC trên tích hợp thật. Thiếu runner/evidence thì giữ draft/review, không ghi pass.
5. Reviewer độc lập kiểm AC, hai gate, nguồn data và [DoD](DEFINITION_OF_DONE.md), duyệt revision hiện tại. CI xanh không thay review. Với docs-only, kiểm docs/regression/diff thay native/SQL và ghi N/A rõ.
6. Sau Approved chuyển task done, sinh indexes và kiểm diff; thay code tiếp phải review lại. Người phụ trách merge theo dependency. Downstream chỉ mở merge khi bản Done/evidence upstream đã vào target.

Done = scope được review, không tự chứng minh PR đã merge. P1/P2 được soạn isolated draft nếu còn người, vẫn merge sau GM-27 và không chiếm nguồn lực P0 mặc định.

## Review và bàn giao

Chỉ reviewer độc lập ghi trong task:

```text
Reviewed-by: tên khớp reviewer khác owner
Reviewed-at: YYYY-MM-DD
Decision: Approved
Review-evidence: docs/evidence/roadmap-v1/GM-XX/REVIEW.md
```

Evidence ghi PR/commit/version/AC/test thật, không token/raw votes/GPS. AI không tự Approved/Done. Assignment proposed vẫn là đề xuất. Dùng [mẫu PR](../../.github/pull_request_template.md) và [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).

```text
python scripts/task_readiness.py --write-docs
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

Generator sinh bốn indexes và sửa link sau khi chuyển task; không đổi status/approval/assignment. --all chỉ là báo cáo. Validator không thay test native/SQL/review thật. Không tự commit/push/sync issue nếu chưa được yêu cầu.
