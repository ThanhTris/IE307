> Hồ sơ lịch sử dùng mã task cũ trước khi đánh số roadmap-v1. Không dùng các GM-ID bên dưới để nhận việc hiện tại; xem [bảng mã cũ–mới](../../project/TASK_RENUMBERING.md). Liên kết task (nếu có) đã trỏ tới mã mới; kết quả/lệnh cũ được giữ nguyên.

# Evidence thực hiện — song song và thứ tự merge

Ngày: 2026-10-08. Người thực hiện: Codex. Reviewer dự kiến: Trí. Không phải quyết định Approved; GM-28 giữ review, 30 task triển khai vẫn backlog/proposed.

## Yêu cầu và thay đổi

Chủ dự án đồng ý áp dụng đề xuất: viết phần độc lập song song, tích hợp/merge theo thứ tự. [ADR-006](../../architecture/decisions/ADR-006-parallel-start-ordered-merge.md) ghi quyết định quy trình và giới hạn; không tự duyệt scope sản phẩm.

- Chuyển 31 task food-v1 sang start_dependencies/merge_dependencies, giữ GM-00 lịch sử. Giữ nguyên owner/reviewer/priority và các cạnh phụ thuộc tích hợp cũ.
- Start: GM-28 trước code; GM-04/11/27/30 chờ GM-03. Sau GM-28 có 26 task đủ dependency để nhận phần độc lập thay vì chỉ GM-01/03; chưa đồng nghĩa nhận việc hoặc có runtime. Bốn task data mở sau contract GM-03.
- Gắn các cặp cụ thể GM-07/08, GM-12/13, GM-13/14, GM-04/27, GM-27/30; tổng 28 cặp đối xứng khác owner. Mỗi task ghi phần làm trước, AC cần tích hợp thật, version/file ownership/handoff.
- Validator: active/draft review cần start deps; Done cần cả hai; cho phép parallel merge ancestor, vẫn cấm start ancestor/cycle/unknown/owner trùng và P0 bị extension chặn.
- Merge checker đọc snapshot Git --base-ref, đối chiếu dependency task/evidence Approved đúng revision; không tự fetch, chứng minh implementation commit đã merge, hay tự merge.
- Đồng bộ workflow/AGENTS/DoD/plan/AI prompt/templates PR/issue/task/review và bốn indexes sinh từ task.

## Kiểm tra

- `python scripts/validate_repository.py`: đạt kiểm cấu trúc/link/metadata/graph/FR.
- `python -m unittest discover -s tests -p "test_*.py"`: 61 tests đạt. Approvals trong regression chỉ ở memory, không duyệt task thật.
- Regression bao gồm start mở 26 task sau approval giả lập, contract mở bốn task data, in-progress/review với merge blocker, Done không bypass, target thiếu/khác revision, merge CLI cần ref và đọc HEAD thực tế không ghi Git.
- `python scripts/task_readiness.py --task GM-13`: exit 1, chờ GM-28 đúng trạng thái thực tế.
- `python scripts/task_readiness.py --task GM-13 --gate merge --base-ref origin/main`: exit 1, chờ các upstream và GM-28. Ref local đọc được: `3d5c2240126a7e29f70c0a8e36723db0b1fea43b`; không fetch/xác minh remote mới.
- Indexes được sinh lại bằng --write-docs, kiểm --check-docs và diff trước bàn giao.

## Giới hạn

Python launcher có cảnh báo tìm vị trí C:\Python314\python.exe nhưng lệnh/tests thực thi được; không sửa môi trường. Không chạy native/backend vì chưa triển khai; không dùng tests tooling làm evidence app. Không sửa prototype HTML đang có thay đổi của người dùng; không commit/push/sync issue. Chưa có review độc lập cho food-v1, không mở gate bằng approval giả.

Người merge vẫn phải xác minh upstream PR/merge commit đã vào target, cập nhật branch, kiểm test tích hợp thật và review revision cuối. Done/local metadata không chứng minh code đã merge.
