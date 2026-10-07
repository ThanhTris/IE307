## Task và phạm vi

Task ID/link Markdown:
Owner / reviewer khác owner:
Assignment accepted / baseline / spec / ADR:
Vấn đề và hành vi sau thay đổi:

## Dependency gate trước triển khai

| Task phải xong trước | Link task/PR | Status Done + Decision Approved | Reviewer/ngày/evidence | Đầu ra/version đã dùng |
| --- | --- | --- | --- | --- |
| GM-XX | | | | |

- [ ] Đã chạy `python scripts/task_readiness.py --task GM-XX`, đối chiếu mọi dependency và evidence; không coi merged PR là Done.
- [ ] Đã nhận việc, owner/reviewer thực tế cập nhật trong task; không còn dependency thiếu review.
- Task làm song song / interface/file cần phối hợp:
- Thay đổi contract/scope/privacy và task phía sau chịu ảnh hưởng:

## Acceptance criteria

| AC từ task | Pass/Fail/Not run | Evidence/output/phiên bản | Còn lại hoặc N/A có lý do |
| --- | --- | --- | --- |
| | | | |

## Verification

- [ ] `python scripts/validate_repository.py`
- [ ] `python -m unittest discover -s tests -p "test_*.py"`
- [ ] `python scripts/task_readiness.py --check-docs` (regenerate bằng `--write-docs` nếu task đổi)
- [ ] `git diff --check`
- Code: typecheck/lint/domain; SQL: migration/RLS/transaction/race; native: thiết bị/Android/build/a11y/offline (ghi lệnh/kết quả hoặc N/A có lý do):
- Food data: source/license/coverage/menu-hours/freshness/unknown/overnight/fixture-vs-real (nếu áp dụng):

## Bàn giao và review

PR/commit/artifact version để reviewer đối chiếu:
Evidence path (không token/raw votes/GPS):
Migration/rollback hoặc N/A:
Task sau nhận đầu ra / contract/dataset version:
Known issues, blocker và owner xử lý:

- [ ] Reviewer độc lập đã đối chiếu từng AC và evidence theo `tasks/templates/REVIEW_TEMPLATE.md`.
- [ ] Khi Approved, ghi Reviewed-by/Reviewed-at/Decision/Review-evidence trong task rồi mới chuyển Done và sinh lại task indexes.

AI thực hiện không tự tick review hoặc ghi Approved. CI xanh không chứng minh reviewer đã duyệt, nguồn quán còn đúng hoặc native đã đạt.
