# Bắt đầu Manabi

Manabi đang ở giai đoạn lập kế hoạch, đặc tả và UI mẫu. 36 task đã có phân công dự kiến cho sáu người; chưa triển khai app Expo/API.

## Thứ tự đọc

1. [Yêu cầu sản phẩm](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md) và [NFR](../product/NON_FUNCTIONAL_REQUIREMENTS.md).
2. [Kiến trúc](../architecture/SYSTEM_ARCHITECTURE.md), [lưu trữ](../specs/DATA_STORAGE_SPEC.md) và [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md).
3. [UI mẫu](../../design/prototypes/manabi-vocabulary.html) và [ghi chú UI](../../design/prototypes/UI-IMPLEMENTATION-NOTES.md).
4. [Kế hoạch](PROJECT_PLAN.md), [phân công](TEAM_AND_RESPONSIBILITIES.md), [danh mục task](../../tasks/backlog/MASTER_BACKLOG.md) và [workflow](TEAM_WORKFLOW.md).
5. [AGENTS](../../AGENTS.md) khi làm việc với AI.

## Phạm vi triển khai

Core Android dùng SQLite: deck/card, import, flashcard/SRS, ba game, tiến độ và backup JSON. Không yêu cầu đăng nhập. Auth/sync mở sau core; AI/ảnh là pilot có consent, kiểm chất lượng, quyền sử dụng và review riêng.

Trước khi nhận task, chốt owner/reviewer, AC, dependency, spec liên quan và test plan. Triển khai theo dependency đã được duyệt. Tích hợp và kiểm thử từ luồng core đầu tiên; xem các đợt trong kế hoạch.

## Chuẩn bị repository

```powershell
git clone https://github.com/ThanhTris/IE307.git
cd IE307
python scripts/validate_repository.py
```

Xem [bản đồ thư mục](REPOSITORY_STRUCTURE.md) để đặt file đúng vị trí. Task MANABI-001 chuẩn bị Expo; lệnh chạy/build sẽ được bổ sung trong `frontend/README.md` khi có scaffold. Mở HTML trong `design/prototypes/` để xem UI mẫu.
