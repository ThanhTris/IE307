# ADR-006 — Tách điều kiện bắt đầu và merge

Ngày: 2026-10-08. Chủ dự án đã yêu cầu áp dụng cách làm nhánh song song rồi merge theo thứ tự. Trạng thái: đã soạn theo ủy quyền; review độc lập trong GM-01 vẫn Pending. Không đổi approval của GM-00 hoặc tự duyệt food-v1.

## Bối cảnh

Danh sách dependencies từng chặn cả bắt đầu lẫn nghiệm thu; validator cấm parallel_with giữa ancestor/descendant. UI phải chờ API, khảo sát phải chờ schema, pure rules phải chờ data thật dù có thể viết phần độc lập theo contract.

## Quyết định

- Task food-v1 dùng start_dependencies và merge_dependencies; GM-00 giữ nguyên hồ sơ lịch sử.
- Start: GM-01 duyệt baseline/spec/API/UI/data model trước code. GM-05, GM-06, GM-08, GM-11 chờ GM-03 chốt taxonomy/DTO/templates. Chưa có runner thì soạn module/tests độc lập và ghi Not run, không tự thêm package.
- Merge: giữ phụ thuộc tích hợp cũ, cộng start deps. Không bỏ security/schema/dataset/QA. Chuỗi merge không phải chuỗi bắt đầu.
- parallel_with đối xứng, khác owner, không phụ thuộc start; được phép phụ thuộc merge. Cùng owner xếp ca, không tự đổi phân công.
- In-progress/review (kể cả draft review) cần start deps Approved; Done cần cả hai loại deps Approved và mọi AC/evidence thật, reviewer độc lập. Draft review không đồng nghĩa đủ merge.
- Checker merge cần --base-ref: kiểm dependency task/evidence Approved cùng revision trên snapshot Git đích. Không tự fetch/merge, không chứng minh implementation commit/CI/GitHub approval. Người merge kiểm PR/commit ancestry và cập nhật nhánh trước test lại.
- Mỗi task ghi phần làm trước/phần tích hợp thật, contract version/file ownership. GM-02 giữ tooling/package/lockfile, GM-05 điều phối schema/migration numbering. Đổi contract phải chốt với owner/reviewer upstream và báo downstream.
- P1/P2 được soạn isolated draft nếu còn người, merge sau GM-27; không lấy nguồn lực P0 mặc định, không tự bật provider/paid API.

## Hệ quả

Sau GM-01 có 26 task đủ dependency để nhận phần độc lập, 4 task chờ GM-03; không có nghĩa 30 task đã nhận hoặc có thể làm đồng thời với sáu thành viên. Chốt contract version trong draft PR; checker chỉ kiểm bản ghi, không thay reviewer.

Nhánh viết sớm có thể phải sửa adapter khi implementation đổi. Giảm rủi ro bằng contract fixtures versioned, file riêng, draft PR sớm và merge từng dependency. Không coi fixture là dữ liệu bán thật hoặc native/backend evidence.

## Kiểm chứng

Regression: merge deps pending không chặn in-progress; start deps pending vẫn chặn; merge ancestor được song song; start ancestor/cycle/unknown/same owner bị từ chối; Done không bypass merge deps; target thiếu/khác evidence bị chặn; indexes khớp metadata.

[Workflow](../../project/TEAM_WORKFLOW.md) · [Dependency map](../../project/TASK_DEPENDENCIES.md) · [GM-01](../../../tasks/review/GM-01.md).
