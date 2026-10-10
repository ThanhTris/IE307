> Lịch sử: các mã task trong tài liệu này thuộc thời điểm soạn/roadmap-v1 (hoặc mã cũ được ghi bên dưới). Lộ trình hiện hành: [roadmap-v2](../../project/IMPLEMENTATION_ROADMAP.md); không dùng mã trong tài liệu này để mở gate.

> Bối cảnh quyết định cũ. Yêu cầu food-v1 được cập nhật tại [ADR-005](ADR-005-food-location-time-data.md), chờ GM-01 review; phần location chỉ sau winner/venue P1 dưới đây không là scope hiện hành.

# ADR-004 — Baseline tài liệu mobile consensus v0.2

2026-10-07. Status: Proposed for independent review. Chủ dự án đã yêu cầu chuyển plan tiếp thu góp ý thành spec/task/tiến độ hiện hành. Đây là ủy quyền soạn lại phạm vi; không thay quyết định reviewer, không mở khóa GM-00 hoặc cài package.

## Quyết định ghi trong bản tài liệu

Giữ NO cứng/hai vòng/server chốt một lần; score 2W+OK tương đương ưu tiên WANT. decision-v2 thêm matchTier/contract lý do. Giữ double-tap WANT/ba nút theo chủ dự án, không vote vuốt dọc; khả dụng cần thử native và người dùng.

Đưa bạn quen/inbox GM-15, history tối thiểu/consent GM-17, push GM-18 và cache/outbox GM-24 vào P0. Account/recovery/history sync tách GM-28/P1; venue radius giới hạn dataset GM-08/P1; OCR/AI P2. Tổng 27 task triển khai, owner/reviewer vẫn đề xuất.

Context khóa server: meal/time hint/category/budget/history có nguồn; không dùng location suy quán có món nếu thiếu dữ liệu. Location foreground không persist/share mặc định, search review ngoài app có fallback. Push event sau commit, không payload authority.

## Privacy và đánh đổi cần review trước code

Local private draft/outbox/snapshot TTL24h + auth isolation; history30ngày/local50 mục, group summary mọi người opt-in, rút consent xóa group summary; push event7ngày/token inactive30ngày. Scheduler/quota/bảo vệ SQLite/provider geocoding/push credentials cần evidence. Nhãn kết quả lộ tổng hợp nhóm nhỏ nên không hứa ẩn danh.

Native development build và synchronous transaction/outbox tăng khối lượng core; lịch 8 tuần là đề xuất, spike sớm và kiểm tải. Không thêm Socket.IO song song Supabase Realtime hoặc AI dependency.

## Nguồn hiện hành

[Mô tả](../../product/SYSTEM_OVERVIEW.md), [spec index](../../specs/README.md), [API](../API_CONTRACT.md), [plan](../../project/PROJECT_PLAN.md), [tasks](../../../tasks/backlog/MASTER_BACKLOG.md). ADR-001/003 vẫn cần review lựa chọn kỹ thuật; version tài liệu không chứng minh các giả định đã được duyệt.
