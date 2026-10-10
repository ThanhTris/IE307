# Mở task bằng Done trên GitHub Project

Theo [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md), chủ dự án chuyển Done sau nghiệm thu. Task Markdown giữ scope/version; không cần chuyển Markdown sang done để mở task sau. AI không tự Approved/Done.

## Chạy

```text
python scripts/task_readiness.py --task GM-06
python scripts/task_readiness.py --task GM-06 --base-ref origin/main
python scripts/task_readiness.py --task GM-06 --gate merge --base-ref origin/main
```

Trước đối chiếu target, fetch đúng remote đã xác nhận. Checker không fetch/checkout/merge; origin/main chỉ là local ref, phải kiểm freshness. Nhánh làm việc phải nhận artifact upstream; Done không tự tải code. Không merge/reset một workspace đang có thay đổi chưa lưu chỉ để vượt gate.

## Quyền đọc

Checker dùng GH_TOKEN, sau đó GITHUB_TOKEN, hoặc credential GitHub đã đăng nhập qua Git credential helper (không hiển thị/lưu token). Token cần quyền đọc Project và quyền truy cập Project #2. Với classic token cần read:project; không cần quyền ghi Project. Token repo-only hoặc GITHUB_TOKEN trong CI có thể không đọc được Project. Với loại token khác phải có quyền tương đương và Project cho phép truy cập.

Tạo/cập nhật token bằng quản lý credential hiện có; không đặt token trong code, issue, command gửi lên chat hoặc file commit. Checker không tự mở rộng quyền hoặc thay credential. Nếu chưa có quyền, báo BLOCKED_PROJECT_UNVERIFIED; phải xử lý quyền trước khi gate live đạt. API tham chiếu: [GitHub Projects API](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects), [ProjectV2 fields](https://docs.github.com/en/graphql/reference/projects).

## Ý nghĩa kết quả

- READY_TO_CLAIM / READY_TO_START: start deps Done trên Project và có đủ output/HANDOFF; member acceptance vẫn kiểm riêng.
- DONE_ON_PROJECT: task đó Done trên Project và có output, không phải AI duyệt; không chứng minh code đã merge.
- BLOCKED: có dependency không Done, item thiếu/trùng/archived hoặc sai task/repo/issue.
- BLOCKED_PROJECT_UNVERIFIED: thiếu credential/quyền đọc, mất mạng hoặc API trả lỗi/không đầy đủ. Không dùng local/cache hoặc Issue Closed thay Done.
- BLOCKED_ARTIFACTS: upstream Done nhưng nhánh làm việc thiếu output/HANDOFF; nhận code đúng version trước.
- BLOCKED_ON_BASE: target thiếu/khác artifact, contract hoặc task-map entry; status/assignment Markdown khác nhau không tự là drift.
- READY_FOR_MERGE_REVIEW: đầu vào trên target đạt; vẫn cần review AC của chính PR, kiểm PR/commit upstream và chạy tests tích hợp thật.

Snapshot Project chỉ giữ trong RAM và in URL/thời điểm đọc; không ghi token/snapshot approval hoặc sửa status. Mapping [project-gate.json](../../tasks/project-gate.json) pin đủ issue GM-01..38, không đoán từ thứ tự issue hay lấy card cùng tên repo khác. Nếu đổi issue/scope phải cập nhật mapping và review lại; Done không tự xác định approved commit.

## Offline và CI

```text
python scripts/task_readiness.py --task GM-06 --approval-source local
python scripts/task_readiness.py --write-docs
python scripts/task_readiness.py --check-docs
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
```

Local source là chẩn đoán hồ sơ lịch sử, không được dùng để cho phép bắt đầu/merge trong workflow Project. Indexes sinh offline nên có thể hiển thị BLOCKED local dù gate live đạt. Validator không gọi mạng, vẫn kiểm cấu trúc/AC/graph/output của Markdown done, nhưng giao phần nghiệm thu dependency live cho checker trước code/merge. Pass CI không thay gate live, test app/API/data hoặc review con người.
