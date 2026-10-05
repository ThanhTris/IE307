# Nhóm và phân công Manabi

Người thực hiện và reviewer trong kế hoạch chỉ là đề xuất tham khảo, không bắt buộc. Thành viên có thể nhận task được đề xuất cho người khác; trao đổi trong nhóm để tránh nhận trùng và cập nhật người thực hiện thực tế khi bắt đầu. GitHub Assignees để trống đến khi có người nhận. Reviewer thực tế phải khác người thực hiện.

Nhóm gồm sáu thành viên. Phân công dưới đây là kế hoạch dự kiến, chưa bắt đầu triển khai. [Danh mục 36 task](../../tasks/backlog/MASTER_BACKLOG.md) là nguồn chi tiết owner/reviewer/dependency/đầu ra.

| Thành viên | Task đề xuất | Số task | Trách nhiệm |
| --- | --- | --- | --- |
| Trí | 002, 014, 020, 025, 026, 032 | 6 | BE, điều phối; CI, sync, gateway, benchmark, security, release |
| Trang | 006, 007, 013, 019, 030, 033 | 6 | UI/FE; UI nền/settings, deck/card, flashcard, Four Choices, quiz UI, accessibility |
| Tâm | 003, 009, 015, 018, 027 | 5 | Data; contract/spike SQLite, repository, cloud schema, pipeline ảnh, lifecycle |
| Vinh | 004, 010, 016, 022, 023, 034 | 6 | Data; fixture, import, SRS, shadow signal, đánh giá AI độc lập, regression |
| Trung | 005, 008, 011, 017, 021, 029, 035 | 7 | FE/BE/data; corpus, auth, Matching, validator, backup, QA, báo cáo |
| Tuấn | 001, 012, 024, 028, 031, 036 | 6 | FE/BE/data; Expo, Word Ninja, UI ảnh, dashboard, integration, slide/demo |

## Ranh giới UI, dữ liệu và tích hợp

- 009: Tâm sở hữu schema/migration/repository CRUD. 033: Trang sở hữu UI deck/card, form động và tích hợp repository; Tâm hỗ trợ contract, Tuấn và Tâm review.
- 010: Vinh sở hữu import/parser/transaction; Trung làm UI mapping/preview. 021: Trung sở hữu cả backup service và UI/file picker, Tâm review dữ liệu.
- 027: Tâm sở hữu lifecycle/consent state/delete; Trung làm UI. 008 do Trung sở hữu cả auth UI và logic; Trung hỗ trợ UI conflict cho 014 của Trí.
- 028: Tuấn sở hữu dashboard/UI/tích hợp; Vinh cung cấp query/metrics. 031: Tuấn tích hợp liên tục từ core đầu tiên; Trí review contract/build, không chờ cuối kỳ.
- 018: Tâm làm pipeline nguồn/quyền/metadata ảnh; 024: Tuấn làm bài tập ảnh. Trung làm validator 017; Vinh giữ holdout và đánh giá 023 độc lập.
- Mỗi owner chịu trách nhiệm nối các phần và evidence của task; không để phần hỗ trợ trở thành công việc không có người chịu trách nhiệm.

## Cân bằng tải

Số task không đại diện số giờ: Tâm có năm task nhưng persistence/schema rủi ro cao; Trung có bảy task và phần hỗ trợ UI nên cần kiểm tải trước mỗi đợt. Trí còn điều phối/merge và xử lý contract ngoài sáu task owner.

Trước khi nhận task, estimate theo AC đã chốt, ghi riêng công owner, hỗ trợ và review; không mặc định review nào cũng một điểm. Chưa có estimate chi tiết hoặc thời gian rảnh nên chưa cam kết tải bằng nhau hay deadline. Cuối đợt nền tảng đo công thực tế và điều chỉnh kế hoạch; không nhận thêm auth/AI/ảnh khi core hoặc công hỗ trợ đang quá tải. Tối đa hai task active/người, ưu tiên hoàn tất một luồng.

## Công việc core có thể phối hợp sớm

Sau 003/001: Tâm làm 009; Vinh làm fixture 004; Trang làm UI nền/settings 006; Trí làm CI 003. Sau repository được duyệt: Trang làm 033, Vinh làm 016/import, Trung làm 021 và UI import, Tuấn làm harness 031, Trí hỗ trợ review/tích hợp và chuẩn bị đo/log an toàn. Công harness có thể bắt đầu sớm nhưng smoke chỉ hoàn tất sau 033/008. Không yêu cầu import/backup chờ màn CRUD khi repository/contract đã đủ và được review.

## Review và pilot

Reviewer cụ thể nằm trong danh mục task, luôn khác owner; thay đổi schema/SRS/auth/sync có cả người data và fullstack review. Reviewer chỉ duyệt phần không do mình viết; nếu người hỗ trợ viết phần code đang review, bổ sung reviewer độc lập cho phần đó. Không ép số lượt review bằng nhau.

Vinh điều phối holdout/đánh giá AI, Trung phát triển generator/validator. Cần assessor biết tiếng Nhật độc lập với người viết prompt/mapping để duyệt nghĩa; chưa xác định được người phù hợp thì pilot không mở. Tâm review phương pháp không mặc nhiên thay assessor. Quyền ảnh và consent có evidence riêng.

Core và release có thể hoàn tất khi online/AI/ảnh tắt. Task mở rộng bắt đầu khi đủ điều kiện nghiệm thu và nguồn lực. Phân công này chưa là quyết định review độc lập hoặc trạng thái Done. Workflow task/DOCX khi triển khai theo [TEAM_WORKFLOW](TEAM_WORKFLOW.md); giai đoạn hiện tại chỉ cập nhật tài liệu kế hoạch.
