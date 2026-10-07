# Evidence — cập nhật yêu cầu/task 2026-10-06

Yêu cầu chủ dự án: bổ sung kết bạn nhanh, vị trí lần mở đầu và review ngoài app; cập nhật task và tổng hợp phạm vi.

## Đã kiểm

- GitHub REST đọc 25 issue đang mở thuộc project:gi-cung-duoc và 6 collaborator; GM-00 status:review, GM-01..24 status:backlog; tất cả assignment:proposed. Trung là TrungNQ2645, đã có 4 Assignee đề xuất.
- PATCH và đối chiếu response body cho GM-00/05/06/08/09/13/14/15/17/19/20/24: 12 issue. Giữ Assignee/state; bỏ assignment:needs-collaborator ở 4 issue Trung. GM-20 đổi title/cỡ thành QR join, vị trí và mở review / L.
- Cập nhật dependency GM-08 thêm GM-03, GM-13 thêm GM-12; AC nền/tích hợp tách rõ, không giảm quyền riêng tư hay luật quyết định.
- python scripts/validate_repository.py: PASS documents/links/JSON/25 task records/dependencies/FR traceability.
- git diff --check: PASS. Đã kiểm diff task/dependency/phân công.

## Giới hạn

Đợt này chỉ cập nhật tài liệu và issue. Không triển khai app/API, không chạy native build/permission/geocoding/deep link, không tự review Done. Không commit/push; Markdown/spec/ADR mới còn ở local, issue nêu rõ điều này. Kế hoạch ngày cụ thể chưa có lịch bắt đầu/hạn môn học. Project custom fields không được coi là đã đồng bộ hoặc chứng minh đã nhận việc chỉ từ issue labels.

[Tổng hợp task](../../project/TASK_SUMMARY.md) · [Spec bổ sung](../../specs/SOCIAL_DISCOVERY_SPEC.md).
