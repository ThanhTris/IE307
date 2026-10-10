# ADR-011 — Project Done là nguồn nghiệm thu dependency

Date: 2026-10-10
Status: quyết định quy trình theo xác nhận trực tiếp của chủ dự án “oke sửa giúp tui đi”; không approval implementation của task khác

## Bối cảnh

GM-03/04 đã được chủ dự án đóng issue/chuyển Done nhưng main còn task Markdown review/backlog. Checker local chặn GM-06 dù đầu ra đã merge. Chủ dự án yêu cầu dùng cột Done để mở task, tránh cập nhật trạng thái thủ công ở hai nơi.

## Quyết định

- Nguồn nghiệm thu hiện hành là Status=Done trên [Project #2](https://github.com/users/ThanhTris/projects/2), đúng repo/issue của GM-01..38 trong [mapping](../../../tasks/project-gate.json). Không lấy Issue Closed, PR merged, draft/PR card, item archived hoặc task ID cũ làm Done. GM-00 là baseline lưu trữ, vẫn kiểm local Approved.
- Checker đọc snapshot mới mỗi lần chạy, phân trang đầy đủ; thiếu credential/quyền Project, mạng, item hoặc status không xác minh được thì chặn. Không cache/fallback local khi live thất bại, không mutation hay thêm package.
- Start: chỉ các start deps cần Done, output và HANDOFF trong nhánh làm việc. Phần độc lập không phải đợi merge deps.
- Merge: cộng start và merge deps, tất cả Done, bắt buộc --base-ref; contract/baseline/stage, task-map entry và nội dung output/HANDOFF local phải khớp snapshot target. Không so status/checklist/assignment trong task Markdown vì chúng có thể chậm cập nhật. Người merge vẫn kiểm upstream PR/commit, target freshness và integration tests thật.
- Done là xác nhận nghiệm thu của chủ dự án theo quy trình đã chốt, không bằng chứng máy rằng người nào đã chuyển, revision nào đã review hoặc test đạt. Trí review/merge cuối; task Trí viết vẫn cần người kiểm độc lập. AC, bảo mật, nguồn data và chuẩn đầu ra không giảm.
- Không tự ghi Approved/Done vào repo/Project. Nếu chuyển Markdown thành done thì vẫn cần review fields/evidence thật theo DoD. Các bản ghi hiện hữu và evidence lịch sử không bị ghi đè.
- Indexes và validator CI offline kiểm cấu trúc/truy vết; không thực thi Project gate hay mở task. --approval-source local giữ chẩn đoán lịch sử, không được dùng để vượt Project gate.

## Hệ quả

Task tiếp theo không còn phải chờ ghi lại trạng thái vào Markdown. Mỗi máy cần quyền đọc Project; token repo-only/GITHUB_TOKEN CI không mặc nhiên có quyền này. Done nhưng chưa nhận đầu ra vẫn bị chặn; Done chưa merge không cho tích hợp. Thay scope/artifact cần review lại và bỏ Done trong lúc làm lại. Checker không chứng minh quyền tác giả review hoặc approved commit chỉ bằng cột Done.

[Hướng dẫn chạy](../../project/PROJECT_READINESS.md) · [Workflow](../../project/TEAM_WORKFLOW.md) · [DoD](../../project/DEFINITION_OF_DONE.md).
