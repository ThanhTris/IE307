# Kế hoạch dự án — roadmap-v2

Roadmap-v2 có 40 mã task GM-01…GM-40. Project có 40 card: GM-01 dùng alias baseline GM-00/#37, các card riêng còn lại là GM-02…GM-40. Phân loại priority và phạm vi hiện hành xem trực tiếp trên Project #2; [lộ trình UI–BE–Data](IMPLEMENTATION_ROADMAP.md) là hướng dẫn thực hiện; [task summary](TASK_SUMMARY.md) là phân công, [dependency map](TASK_DEPENDENCIES.md) là gate.

UI: GM-02 cấu trúc → GM-05 component từ mẫu → GM-09..14 màn mock → GM-24..31 tích hợp. BE: GM-03 cấu trúc → GM-07 contract/client → GM-15..23 xử lý nghiệp vụ. Data: GM-04 fields → GM-06 database → GM-08 nhập/kiểm data → GM-18 API lọc món.

Chỉ bắt đầu phần phụ thuộc khi nhận đúng artifact/version upstream; mọi dependency nhỏ hơn task hiện tại. Chọn merge theo dependency của GM-01…GM-40, không theo thứ tự số cứng. Viết song song theo input cụ thể, không mở đồng loạt task sau baseline. Task UI mock có scope nghiệm thu riêng, không chờ toàn bộ API.

Đợt đầu sau review: Tuấn shell UI, Trí shell BE, Vinh dictionary. Trang chuẩn bị inventory component, Tâm/Trung review data/API plan; sau nền mới triển khai module phụ thuộc. Owner/reviewer vẫn đề xuất. Lịch 8 tuần là giả định cũ cần ước lượng lại theo nguồn lực/hạn môn học; chưa có ngày cam kết.

GM-32 regression → GM-33 QA/pilot → GM-34 APK/demo. GM-35 account P1; GM-36 OCR, GM-37 AI, GM-38 weather/mood P2 không chặn core. Yêu cầu nguồn/giờ/khu vực/NO/privacy giữ nguyên food-v1.

[Mapping và cách dùng lại sandbox](TASK_RENUMBERING.md) · [ADR-009](../architecture/decisions/ADR-009-foundation-first-task-slicing.md) · [workflow](TEAM_WORKFLOW.md).
