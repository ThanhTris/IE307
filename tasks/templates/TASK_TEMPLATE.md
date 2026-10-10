# Mẫu task có đầu vào/đầu ra — roadmap-v2

Mỗi task có owner/reviewer khác nhau, một scope nghiệm thu. UI màn mock và nối API là task riêng. Tham khảo [lộ trình](../../docs/project/IMPLEMENTATION_ROADMAP.md).

```yaml
---
github_issue:
assignment_status: proposed
id: GM-XX
previous_ids:
numbering: roadmap-v2
title: Đầu ra cần bàn giao
status: backlog
owner: Người làm
reviewer: Người kiểm
track: UI
stage: screens
contract_version: food-v1/roadmap-v2/GM-XX.1
priority: P0
size: M
start_dependencies: GM-05, GM-07
merge_dependencies: GM-05, GM-07
parallel_with:
baseline: food-v1
spec: docs/specs/UI_SPEC.md
planned_week: Theo dependency
---
```

Khai báo entry tương ứng trong tasks/task-id-map.json: new_id, previous_ids (scope cũ nếu có), title, track, stage, inputs [{task, artifact, gate}], outputs [path], verification {mode, tool, entrypoint, expected, cases}. ID producer nhỏ hơn consumer, input path có trong outputs producer. Output phải có docs/evidence/roadmap-v2/GM-XX/CHECKS.md; API task có supabase/tests/http/GM-XX.http. Path dự kiến phải nằm trong scope; không thêm placeholder chỉ để qua kiểm.

## Mục tiêu và phạm vi

Scope / ngoài scope / spec / contract version.

## Đầu vào bắt buộc và đầu ra bàn giao

| Task cung cấp | Artifact phải nhận | Thời điểm |
| --- | --- | --- |
| GM-ID/link | path + version/commit | start hoặc merge |

Liệt kê output paths, cách chạy/đọc, task nhận. Các path chưa tồn tại là kế hoạch, phải có file thật khi bàn giao.

## Acceptance criteria

- [ ] AC theo scope và loại evidence; UI mock được nghiệm thu riêng, API/native có task riêng.

## Context và patch plan

Trước phần này thêm mục `## Đầu ra chạy được và nghiệm thu`: mode/tool/entrypoint/expected/cases khớp verification, output request suite/CHECKS.md và checklist tái lập. Theo [chuẩn đầu ra](../../docs/project/TASK_OUTPUT_REQUIREMENTS.md) và [mẫu checks](CHECKS_TEMPLATE.md), UI phải mở Expo, API có actual response/assertions, Data đủ field/schema/fixture cho BE; task nền/contract/domain kiểm đúng stage. Không chỉ file hoặc hình thiết kế.

File cụ thể; reuse scaffold/component/contract; ai sở hữu shared file; migration/rollback.

## Test plan

Lệnh và expected result cho scope thay đổi, không lặp capability demo không liên quan. Repo validator/regression/check-docs/diff và feature checks cần thiết.

## Dependency gate

### Trước bắt đầu

- [ ] [GM-05](../backlog/GM-05.md): Done trên Project, output/HANDOFF/commit có trên nhánh làm việc.
- [ ] [GM-07](../backlog/GM-07.md): Done trên Project, output/HANDOFF/commit có trên nhánh làm việc.

Chạy readiness --task GM-XX; để đối chiếu upstream trên target thêm --base-ref origin/main.

### Trước merge

- [ ] [GM-05](../backlog/GM-05.md): Done trên Project, contract/manifest/output/HANDOFF khớp target; kiểm PR/commit thật.
- [ ] [GM-07](../backlog/GM-07.md): Done trên Project, contract/manifest/output/HANDOFF khớp target; kiểm PR/commit thật.

Checker --gate merge --base-ref origin/main; review cả start inputs và current revision.

## Song song và bàn giao

Các task cụ thể, khác owner và không có start ancestor; không copy shared tooling/types.

### Phần làm trước và phần chờ tích hợp

Phần làm độc lập / inputs chờ / mock-vs-real / HANDOFF.md. Dùng [mẫu bàn giao](HANDOFF_TEMPLATE.md).

## Báo cáo và review

Đã làm/còn lại/blocker/owner/evidence tại docs/evidence/roadmap-v2/GM-XX/. Pending; không tự Approved/Done.
