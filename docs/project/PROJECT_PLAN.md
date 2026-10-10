# Kế hoạch dự án — roadmap-v2

2026-10-10. 38 task sau GM-00: 34 P0 gồm review baseline GM-01, 1 P1, 3 P2. [Lộ trình UI–BE–Data](IMPLEMENTATION_ROADMAP.md) là hướng dẫn thực hiện; [task summary](TASK_SUMMARY.md) là phân công, [dependency map](TASK_DEPENDENCIES.md) là gate.

UI: GM-02 cấu trúc → GM-05 component từ mẫu → GM-09..14 màn mock → GM-24..31 tích hợp. BE: GM-03 cấu trúc → GM-07 contract/client → GM-15..23 xử lý nghiệp vụ. Data: GM-04 fields → GM-06 database → GM-08 nhập/kiểm data → GM-18 API lọc món.

Chỉ bắt đầu phần phụ thuộc khi nhận đúng artifact/version upstream; mọi dependency nhỏ hơn task hiện tại. Chọn merge lần lượt 01..38 không gặp dependency ngược. Viết song song theo input cụ thể, không mở đồng loạt 26 task sau baseline. Task UI mock có scope nghiệm thu riêng, không chờ toàn bộ API.

Đợt đầu sau review: Tuấn shell UI, Trí shell BE, Vinh dictionary. Trang chuẩn bị inventory component, Tâm/Trung review data/API plan; sau nền mới triển khai module phụ thuộc. Owner/reviewer vẫn đề xuất. Lịch 8 tuần là giả định cũ cần ước lượng lại theo nguồn lực/hạn môn học; chưa có ngày cam kết.

GM-32 regression → GM-33 QA/pilot → GM-34 APK/demo. GM-35 account P1; GM-36 OCR, GM-37 AI, GM-38 weather/mood P2 không chặn core. Yêu cầu nguồn/giờ/khu vực/NO/privacy giữ nguyên food-v1.

[Mapping và cách dùng lại sandbox](TASK_RENUMBERING.md) · [ADR-009](../architecture/decisions/ADR-009-foundation-first-task-slicing.md) · [workflow](TEAM_WORKFLOW.md).
