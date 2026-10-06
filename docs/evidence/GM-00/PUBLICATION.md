# Công bố GitHub và xóa lưu trữ

Ngày 2026-10-06, theo yêu cầu chủ dự án push bộ nền mới/task và xóa thư mục lưu trữ.

- Target xóa được Resolve-Path và kiểm nằm trong workspace; legacy/manabi không còn. Nguồn cũ có trong lịch sử Git commit 6086c16.
- 25 issues: GM-00 review + 24 tasks kế hoạch. 20 task gắn Assignee đề xuất cho 5 collaborator; 4 task Trung để trống vì chưa chấp nhận lời mời. GM-00 gắn ThanhTris để đề xuất review.
- Mỗi issue có scope/AC/test plan/spec/dependency và nhãn assignment:proposed. Không có task triển khai nào bị đánh Done.
- 36 task Manabi đóng với not_planned vì đổi đề tài; không xóa nội dung issue và không báo hoàn thành.
- Read-back API đã kiểm nhãn/assignee; manifest chỉ chứa metadata công khai, không có credential. [Danh sách](github-publication.json).
- Check cuối: validator working tree, diff/check và validator commit snapshot trước push. Hash commit/push và CI được báo trong kết quả cuối; không tự ghi CI pass trước khi chạy.
- Phạm vi code push là prototype/scripts/cấu trúc và bộ nền đã soạn, chưa phải app Expo/API hoàn chỉnh.
