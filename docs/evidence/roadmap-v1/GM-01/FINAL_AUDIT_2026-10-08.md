# Evidence — rà soát cuối trước commit/push

Ngày: 2026-10-08. Người thực hiện: Codex. Task: [GM-01](../../../../tasks/review/GM-01.md). Reviewer Trí chưa Approved; không thay status/assignment hoặc mở khóa triển khai.

## Bổ sung sau evidence đổi số

- GM-19 có AC tích hợp history/recent penalty GM-17 nhưng thiếu merge dependency. Bổ sung GM-17 vào metadata, checklist và phần chờ tích hợp; giữ start gate GM-01 để UI/fixtures vẫn được làm độc lập.
- Làm rõ AC budget unknown/meal empty: thiếu giá không tự loại món; host phải xác nhận buổi trước ready. Pool rỗng báo lý do và cho đổi bối cảnh/reset ready, không tự nới buổi/khu vực/giờ bán. Context khóa sau start.
- Sinh lại indexes. Hiện có 127 khai báo dependency (31 start, 96 merge; có thể trùng giữa hai gate), không forward/self dependency hoặc cycle; giữ 28 cặp song song. Con số 126 trong evidence đổi số là snapshot trước bổ sung này, không sửa lịch sử.
- Thêm regression GM-19 được bắt đầu độc lập sau baseline review nhưng không được merge khi GM-17 chưa Approved. Approval trong test chỉ ở memory, không ghi vào task thật.

## Verification đã chạy

- `python scripts/task_readiness.py --write-docs`: đã sinh lại indexes.
- `python scripts/validate_repository.py`: đạt.
- `python -m unittest discover -s tests -p "test_*.py"`: 69 tests đạt.
- `python scripts/task_readiness.py --check-docs`: khớp metadata.
- `git diff --check`: đạt; có cảnh báo chuyển LF/CRLF, không có lỗi whitespace.
- `git diff --numstat -- tasks/done/GM-00.md docs/evidence/GM-00`: không có thay đổi.
- `git fetch origin`: thành công; trước commit `git rev-list --left-right --count HEAD...origin/main` trả `0 0`, HEAD là `3d5c224`.

## Phạm vi xuất bản và giới hạn

Chủ dự án yêu cầu commit/push bản cập nhật. Phạm vi là task/spec/workflow/templates/tooling/tests cùng evidence; không đưa thay đổi ngoài phạm vi ở `design/prototypes/gi-cung-duoc.html` và `design/assets/` vào commit. Bằng chứng thành công commit/push là output Git khi thực hiện, tài liệu này không tự khẳng định push đã hoàn tất.

GM-01 vẫn review; task triển khai vẫn backlog/proposed. Không tự Approved/Done, không sync nội dung/title GitHub issue/Project, không chạy native/backend hoặc tuyên bố có verified dataset thật. Validator/test tooling không thay review hoặc integration evidence.
