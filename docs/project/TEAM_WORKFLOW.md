# Workflow AIDD — food-v1

Task Markdown là nguồn trạng thái; bảng tổng hợp và dependency map sinh từ task, GitHub có thể còn scope cũ. Phân công proposed chỉ là gợi ý. Khi nhận việc, người nhận và reviewer khác owner xác nhận, cập nhật assignment_status=accepted; nhãn GitHub chỉ đổi khi có ủy quyền sync.

## Trước nhận việc và code

1. Mở [dependency map](TASK_DEPENDENCIES.md), chọn task đúng phạm vi và chạy `python scripts/task_readiness.py --task GM-XX`.
2. Đối chiếu từng dependency trong task: file đúng status=done, Reviewed-by đúng reviewer khác owner, Reviewed-at có ngày, Decision=Approved, Review-evidence trỏ file thật; mở PR/commit/evidence và xem đầu ra dùng được. CI/merge/checkbox không tự thay quyết định review.
3. READY_TO_CLAIM cho phép nhận việc; READY_TO_START cho phép bắt đầu sau khi patch/test plan, package/license/provider và môi trường đã reviewer chốt. BLOCKED/IN_REVIEW thì chưa code phần phụ thuộc; ghi blocker và chọn task độc lập đủ gate.
4. Cặp parallel_with chỉ nghĩa không có quan hệ trước/sau; từng task vẫn phải đạt gate riêng. Một task chính/người; phối hợp file/schema/contracts và reviewer. Không bắt cả nhóm chờ một “lớp tuần” nếu task riêng đã đủ dependency.
5. Chuyển backlog → in-progress, sửa status và người nhận thực tế cùng lúc; chốt file dự kiến, giả định, patch nhỏ và test plan. Không tạo hai bản task.

## Thực hiện và bàn giao

Triển khai đúng scope; cập nhật spec/ADR trước đổi contract/schema/privacy. Ghi AC/evidence thật, lỗi/giới hạn/owner; chưa chạy hoặc mock không tính native/SQL pass. Bàn giao contract/dataset/migration version và PR/commit cho task sau. Chuyển review khi đủ evidence, dùng [mẫu PR](../../.github/pull_request_template.md) và [mẫu review](../../tasks/templates/REVIEW_TEMPLATE.md).

Reviewer kiểm từng AC, dependency, source data và [DoD](DEFINITION_OF_DONE.md). Chỉ reviewer độc lập mới ghi:
```text
Reviewed-by: tên khớp reviewer trong task
Reviewed-at: YYYY-MM-DD
Decision: Approved
Review-evidence: docs/evidence/GM-XX/REVIEW.md
```
Đường evidence phải là file thật; ghi version/PR/commit được review trong evidence. Pending/Changes requested giữ task review/in-progress. Sau Approved chuyển tasks/done, đổi status và đánh dấu AC/gate đã đối chiếu. AI thực hiện không tự Approved/Done.

Nếu scope đầu vào đã Done thay đổi đáng kể, lập review bổ sung/tách task và rà downstream; không giữ dấu Approved cũ để mở khóa nội dung mới. Không hạ dependency để né chờ review. GM-00 là baseline v0.2 đã duyệt; scope data food-v1 được soạn tại GM-28, chưa được duyệt nên chưa mở khóa code mới.

## Cập nhật chỉ mục và kiểm trước bàn giao

```text
python scripts/task_readiness.py --write-docs
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

--write-docs sinh bốn bảng và retarget link Markdown tới task sau khi chuyển thư mục; không đổi status/approval/assignment. --all là báo cáo trạng thái, không phải gate cho từng task. CI chạy validator, regression và kiểm bảng/link đã đồng bộ; các lệnh không chứng minh human review có thật.

Khi có app, thêm typecheck/lint/unit/Android từ runner thực tế GM-01; SQL từ GM-04. Dataset thật cần nguồn, freshness, người kiểm khác người nhập; fixtures tách rõ. Không tự commit/push/sync issue khi chưa được yêu cầu.
