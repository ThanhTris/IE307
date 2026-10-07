# Mẫu task có dependency gate

Copy vào tasks/backlog/GM-XX.md, thêm manifest bằng generator sau khi tạo; thay toàn bộ placeholder. Task source dùng frontmatter scalar (không YAML list):
```yaml
---
github_issue:
assignment_status: proposed
id: GM-XX
title: Kết quả cần bàn giao
status: backlog
owner: Tên người làm
reviewer: Tên khác owner
priority: P0
size: M
dependencies: GM-28
parallel_with:
baseline: food-v1
spec: docs/specs/FOOD_DATA_SPEC.md
planned_week: Theo dependency map
---
```

dependencies/parallel_with là các GM-ID cách nhau dấu phẩy. Dependencies phải đủ API/schema/dataset/runner/input thực sự dùng. parallel_with phải đối xứng, khác owner, không ancestor/descendant. Status backlog/in-progress/review/done; blocker ghi trong báo cáo, không tạo status tùy ý.

## Mục tiêu và phạm vi

Đầu ra/in-scope/out-of-scope, FR/spec/ADR, phiên bản contract. Không đóng task trên mock nếu AC yêu cầu tích hợp thật.

## Acceptance criteria

- [ ] AC kiểm được, liên kết test/evidence và nêu xử lý lỗi/unknown.

## Dependency gate

Chạy `python scripts/task_readiness.py --task GM-XX`.
- [ ] Từng dependency có link file task/PR, status=done, Reviewed-by đúng reviewer khác owner, ngày hợp lệ, Decision=Approved và Review-evidence có thật.
- [ ] Đọc đầu ra/version/test và xác nhận phù hợp task này.
- [ ] Owner/reviewer nhận việc, assignment_status=accepted; reviewer kiểm patch/test plan và dependency kỹ thuật.

## Song song và bàn giao

Ghi GM-ID cụ thể làm song song hoặc N/A; điều kiện từng gate, file/interface tránh ghi đè, reviewer cần điều phối.
Task sau nhận đầu ra / contract/schema/dataset/artifact version / giới hạn.

## Context và patch plan

File dự kiến, thay đổi nhỏ, package/provider/license/quota cần chốt, migration/rollback nếu có.

## Test plan

Lệnh/runner/environment/scenario/evidence; phân biệt docs/fixtures/native/backend. Chạy validator/unit/readiness --check-docs/diff; thêm kiểm feature tương ứng.

## Báo cáo

Đã làm / còn lại / blocker + owner / file / test output / evidence / PR hoặc commit / bước tiếp theo.

## Review

Pending. Dùng [mẫu review](REVIEW_TEMPLATE.md); AI không tự Approved. Khi reviewer độc lập duyệt, ghi Reviewed-by/Reviewed-at/Decision/Review-evidence trong task, chuyển done và sinh lại indexes.
