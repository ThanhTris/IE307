# Mẫu review và bàn giao dependency

Task ID / đường dẫn:
Owner thực tế:
Reviewer độc lập:
PR / commit hoặc phiên bản artifact được review:
Baseline / spec / dataset / migration version:

## Dependency được đối chiếu

| Task trước | Đường dẫn task/PR | Done? | Reviewer/ngày/quyết định | Evidence và đầu ra đã dùng |
| --- | --- | --- | --- | --- |
| GM-XX | điền link thật | chưa/đã | điền bản ghi thật | contract/dataset/build/test version |

Không chỉ nhìn merged/checkbox. Chạy `python scripts/task_readiness.py --task GM-XX`; đọc evidence của từng dependency. Nếu scope đầu vào thay đổi sau review, ghi task bị ảnh hưởng và review lại trước tiếp tục.

## Kết quả từng AC

| AC | Pass/Fail/Not run | Evidence/lệnh/output/môi trường | Giới hạn/blocker/owner |
| --- | --- | --- | --- |
| AC-… | | | |

Docs validator không thay test SQL/native hoặc kiểm nguồn dataset. Ghi riêng fixture mô phỏng với dữ liệu quán thật. Reviewer kiểm error/race/privacy/expiry/source freshness nếu thuộc scope. Owner không duyệt phần mình thực hiện.

## Quyết định

Reviewed-by: điền đúng reviewer trong task
Reviewed-at: YYYY-MM-DD
Decision: Pending
Review-evidence: đường dẫn file evidence có thật tính từ repo root

Reviewer chỉ đổi Decision thành Approved sau khi mọi AC/dependency/DoD đạt; ghi các trường trên ở task, chuyển file vào tasks/done và đổi status cùng lúc. Changes requested thì giữ review/in-progress, ghi lỗi và người xử lý. AI thực hiện không tự ghi Approved. PR merge không tự chuyển Done.

## Bàn giao task sau

Task nhận đầu ra:
Interface/types/RPC/schema/dataset/artifact version:
Lệnh chạy/tái hiện:
Migration/rollback hoặc N/A có lý do:
Giới hạn được reviewer chấp thuận:
