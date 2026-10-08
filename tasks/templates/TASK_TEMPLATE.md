# Mẫu task hai gate

Copy vào tasks/backlog/GM-XX.md; thay placeholders. Frontmatter scalar, các ID cách dấu phẩy:

```yaml
---
github_issue:
assignment_status: proposed
id: GM-XX
numbering: roadmap-v1
title: Kết quả cần bàn giao
status: backlog
owner: Tên người làm
reviewer: Tên khác owner
priority: P0
size: M
start_dependencies: GM-01
merge_dependencies: GM-01
parallel_with:
baseline: food-v1
spec: docs/specs/FOOD_DATA_SPEC.md
planned_week: Theo dependency map
---
```

Start deps chặn phần độc lập; merge deps chặn tích hợp/merge và luôn cộng start deps. Mọi dependency phải có số nhỏ hơn task hiện tại; task mới cấp số tiếp theo, không lấp mã cũ bằng scope khác. Task đổi số có previous_id trong mapping; task mới không tự đặt previous_id. Không dùng dependencies cũ. parallel_with đối xứng/khác owner/không có start ancestor; được có merge ancestor và số lớn hơn vì đây không phải dependency. Không đổi assignment hay Approved chỉ để mở khóa.

## Mục tiêu và phạm vi

Output/in-scope/non-goals, spec/ADR/FR và contract version.

## Acceptance criteria

- [ ] AC kiểm được, evidence và trường hợp lỗi/unknown.

## Dependency gate

### Trước bắt đầu

Chạy `python scripts/task_readiness.py --task GM-XX`. Thêm từng dòng checkbox link GM-ID khớp chính xác start_dependencies (không gom nhiều ID một dòng).

- [ ] [GM-01](../review/GM-01.md): Done/Approved, reviewer khác owner, ngày/evidence/version hợp lệ.
- [ ] Assignment accepted, patch/test plan và contract/file ownership đã chốt.

### Trước merge

Chạy `python scripts/task_readiness.py --task GM-XX --gate merge --base-ref origin/main`. Thêm từng dòng checkbox khớp merge_dependencies; kiểm thêm start deps.

- [ ] [GM-01](../review/GM-01.md): Done/Approved, đúng task/evidence và PR/merge commit trên target.
- [ ] Cập nhật target/branch; integration tests thật và review độc lập cho revision hiện tại.

## Song song và bàn giao

GM-ID song song cụ thể hoặc N/A; giới hạn cùng owner/reviewer/file.

### Phần làm trước và phần chờ tích hợp

- Làm trước: module/UI/fixtures độc lập cụ thể, không chỉ “toàn bộ task”.
- Chờ tích hợp: AC/input nào phải dùng API/schema/data/runner thật.
- Contract: version/commit, input/output/error và owner upstream chốt.
- File ownership: thư mục/file của task, shared file ai sửa; GM-02 giữ tooling, GM-05 điều phối schema.
- Bàn giao: PR/commit/output/version/test/evidence/task sau/giới hạn; evidence mới ở docs/evidence/roadmap-v1/GM-XX/.

## Context và patch plan

File cụ thể, patch nhỏ, dependency/license/provider review; migration/rollback nếu có.

## Test plan

Lệnh/runner/scenario/environment/evidence; mock khác thật, Not run khác Pass. Validator/unit/readiness --check-docs/diff và test feature.

## Báo cáo

Đã làm / còn lại / blocker + owner / PR / evidence / bước tiếp theo.

## Review

Pending. Theo [mẫu review](REVIEW_TEMPLATE.md); AI không tự Approved/Done. Reviewer duyệt cả hai gate/AC/DoD mới chuyển done; merge theo [workflow](../../docs/project/TEAM_WORKFLOW.md).
