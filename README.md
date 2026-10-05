# Manabi

Manabi là đồ án ứng dụng Android hỗ trợ học từ vựng tiếng Nhật bằng flashcard, lịch ôn và ba trò chơi Matching, Four Choices, Word Ninja.

Dự án đang ở giai đoạn lập kế hoạch, đặc tả, UI mẫu và quy trình làm việc. Nhóm có sáu thành viên và 36 task dự kiến; ứng dụng Expo và backend chưa được triển khai.

## Phạm vi

- Tạo, chỉnh sửa và nhập bộ thẻ; nội dung linh hoạt theo `fieldSchema` và `fields` JSON.
- Học thẻ, tự đánh giá Again/Hard/Good/Easy, ôn theo lịch và xem tiến độ.
- Chơi Matching, Four Choices và Word Ninja từ các thẻ đã học.
- Lưu SQLite trên thiết bị, học offline và sao lưu/khôi phục JSON.
- Mở rộng tùy chọn: tài khoản và đồng bộ.
- Pilot: quiz Gemini từ card đã xác nhận và bài tập ảnh có nguồn/quyền sử dụng được duyệt. Đáp án chuẩn lấy từ card; câu lỗi không ảnh hưởng lịch ôn.

## Bắt đầu

1. [Hướng dẫn bắt đầu](docs/project/START_HERE.md).
2. [Yêu cầu sản phẩm](docs/product/PRODUCT_REQUIREMENTS.md), [chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md) và [phi chức năng](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md).
3. [Kế hoạch](docs/project/PROJECT_PLAN.md), [phân công sáu người](docs/project/TEAM_AND_RESPONSIBILITIES.md) và [36 task dự kiến](tasks/backlog/MASTER_BACKLOG.md).
4. [UI mẫu](design/prototypes/manabi-vocabulary.html) và [ghi chú triển khai UI](design/prototypes/UI-IMPLEMENTATION-NOTES.md).
5. [Workflow](docs/project/TEAM_WORKFLOW.md) và [hướng dẫn cho AI](AGENTS.md).

## Cấu trúc

```text
Manabi/
├─ frontend/       App Expo, UI, logic học offline và SQLite
├─ backend/        API chạy local khi phát triển, deploy khi cần
├─ schemas/        Hợp đồng JSON và dữ liệu mẫu
├─ design/         UI mẫu và ghi chú triển khai
├─ docs/           Sản phẩm, đặc tả, kiến trúc, kế hoạch và báo cáo
├─ tasks/          Phân công dự kiến và quy trình task
└─ scripts/        Kiểm tra tài liệu và sinh báo cáo
```

Chi tiết: [bản đồ thư mục](docs/project/REPOSITORY_STRUCTURE.md). `frontend/` và `backend/` hiện chứa hướng dẫn chuẩn bị triển khai.

## Kiểm tra tài liệu

```powershell
python scripts/validate_repository.py
```

Công cụ kiểm các file bắt buộc, JSON và liên kết nội bộ. Hướng dẫn sinh báo cáo khi có task triển khai nằm trong [TEAM_WORKFLOW](docs/project/TEAM_WORKFLOW.md).
