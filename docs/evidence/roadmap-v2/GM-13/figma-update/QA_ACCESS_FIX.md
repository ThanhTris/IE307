# GM-13 — đường vào QA từ Home chính

Ngày2026-11-03, sau commit bước6 `1999447`.

Người dùng không thấy “Công cụ kiểm thử” trên Home `/` dù hướng dẫn
handoff yêu cầu mở từ đó. IndexRoute chưa truyền onOpenFoundation;
điều kiện render của HomeScreen vì vậy ẩn toàn bộ công cụ. Route QA
`/dev/home` có callback nên kiểm trước đây chưa phát hiện lỗi ở `/`.

IndexRoute nay truyền callback trong development. Test điều hướng có
sẵn kiểm cả `/` và `/dev/home` qua Foundation → Result → NoConsensus →
Home. Không đổi nhãn mock, cơ chế phiên, product result hoặc real-mode guard.

Live gate13:12:46Z ngày03/11: READY_TO_CLAIM. Không cập nhật Project.
Kiểm targeted routes:12/12 Pass104.378s; có cả đường từ Home chính.
TypeScript, lint hai file sửa (0 warnings) và git diff --check: Pass.
Expo Go trên thiết bị cần người dùng tải lại và xác nhận; chưa ghi Pass.

SOURCE_MANIFEST.json/CHECKS.json giữ snapshot đã kiểm của bước6;
full936 tests và bundle Android cũ không là kiểm của bản vá này.
