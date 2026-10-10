# GM-03 — đồng bộ main và giải quyết conflict PR #62

**Decision: Pending.** Evidence tích hợp, không phải approval của reviewer.

Đã fetch origin trước xử lý; target main là `aeb1a83`. Branch PR giữ `codex/gm-03-taxonomy-data-contract`; head trước sync `cf4e0bd3d957a51ad6e1f0251d2b4509bdc854fa`. [PR #62](https://github.com/ThanhTris/IE307/pull/62) là PR thường nhắm main, liên kết Closes #40.

Main có thay đổi đánh số roadmap-v1 và hai gate kể từ merge base `3d5c224`; conflict ở REPOSITORY_STRUCTURE.md và tasks/backlog/GM-03.md. Merge main vào branch PR để giữ lịch sử; không merge PR vào main hoặc tự duyệt task.

## Quy tắc giải quyết

- Giữ metadata roadmap-v1 từ main: previous_id/numbering, start_dependencies=GM-01, merge_dependencies=GM-01, parallel_with và hai gate. Giữ status backlog, assignment proposed, reviewer Tâm và AC chưa Approved.
- Giữ tiến độ/evidence GM-03, thư mục data-preparation và catalogue/forms/fixtures; thay mô tả “chưa có evidence” bằng kết quả draft thực tế.
- REPOSITORY_STRUCTURE giữ mô tả data-preparation và các mã mới GM-10 location, GM-11 eligibility, GM-08 dataset, GM-02 bootstrap, GM-05 schema.
- Giữ nội dung/schema/UUID/mapping/giá/license/expected và checksum snapshot nguyên trạng. Evidence trước đổi mã ở docs/evidence/GM-03 giữ nguyên. Audit warning/fixture/doc lịch sử mang mã cũ; [mapping chính thức](../../../project/TASK_RENUMBERING.md) đổi review GM-28→GM-01, schema GM-04→GM-05, dataset GM-27→GM-08, eligibility GM-30→GM-11. Không đổi scope/code thuật toán.

## Bàn giao

[Review package lịch sử từng AC](../../GM-03/REVIEW_PACKAGE.md), [handoff có chú thích mã hiện hành](../../../../data-preparation/docs/HANDOFF.md), [task hiện hành](../../../../tasks/backlog/GM-03.md). Mục tiêu 60–80 còn thiếu (39 món), ảnh chưa đủ bằng chứng/artwork=null và nơi bán thật thuộc GM-08; engine/TypeScript–SQL parity thuộc GM-11, chưa chạy. Không suy checks pass thành Approved hoặc dữ liệu đang bán.

228 regression tests đạt, repository validator/task indexes và audit 9/9 nhóm đạt. Diff check phát hiện hai khoảng trắng cuối dòng Markdown trong tài liệu UI từ main; đổi thành backslash xuống dòng Markdown, giữ nội dung/ngắt dòng, rồi kiểm lại. Không sửa code UI. Snapshot/config/forms/fixtures và evidence GM-03 trước sync nguyên trạng. Start/merge gate vẫn BLOCKED bởi GM-01 review; không tự mở gate.

[Lệnh/output kiểm tích hợp](MAIN_SYNC_CHECKS.json) ghi kết quả thật, không viết lại output/lệnh lịch sử. Evidence mới dùng thư mục roadmap-v1 này theo AGENTS.md của main.
