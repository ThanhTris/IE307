# Bắt đầu Manabi từ `main`

`main` công bố phạm vi, đặc tả, kiến trúc và prototype UI để bắt đầu dự án. Đây chưa phải ứng dụng Expo chạy được; mã thử nghiệm trong `.work/` của một máy không có trong clone mới. Không lấy backlog hoặc task Memo còn sót trong `main` làm việc Manabi.

## Quyết định hiện hành

- Chỉ nghiên cứu học tiếng Nhật, Android-first. Core gồm deck/card, flashcard, lịch ôn, Matching, Four Choices, Word Ninja và backup JSON.
- Giai đoạn đầu dùng SQLite trên thiết bị, không tài khoản và không cloud sync; nội dung card linh hoạt theo `fieldSchema`/`fields` JSON. [ADR-004](../architecture/decisions/ADR-004-json-storage-and-database.md) ghi quyết định phạm vi của chủ dự án. Trạng thái review kỹ thuật của ADR vẫn theo chính ADR.
- Gemini quiz và bài tập ảnh đời sống là pilot sau core, theo cổng consent, tính đúng nghĩa, nguồn/quyền ảnh và review trong các spec. Supabase/PostgreSQL là phương án cloud tùy chọn sau này, không là dependency để học offline.
- [Prototype Manabi](../../design/prototypes/manabi-vocabulary.html) và [ghi chú UI hiện hành](../../design/prototypes/UI-IMPLEMENTATION-NOTES.md) là tham chiếu giao diện. Prototype dùng dữ liệu mẫu, không chứng minh chức năng app production.

## Nguồn task và thứ tự bắt đầu

Task Manabi chi tiết, acceptance criteria, dependency, evidence và trạng thái review nằm trên nhánh từ xa **`origin/codex/manabi-task004-restore-2026-10-04`** tại `tasks/`. Đây là snapshot được giữ lại, không phải nhánh `main`; kiểm trạng thái mới nhất ở đó trước khi nhận việc. Không suy trạng thái Done từ bản tóm tắt này hoặc từ output AI. `tasks/backlog/MASTER_BACKLOG.md` trên `main` chỉ là chỉ mục, không thay các task chi tiết.

Tại snapshot 05/10/2026 của nhánh trên: MANABI-001 nằm trong `tasks/done`; MANABI-002 trong `tasks/in-progress`; MANABI-004 trong `tasks/review`; MANABI-003 và MANABI-005 còn ở `tasks/backlog`. Task còn review không tự mở khóa task phụ thuộc. Nếu nhánh triển khai thay đổi, trạng thái task trên nhánh đó được ưu tiên sau yêu cầu mới của chủ dự án.

Có thể xem task mà không chuyển khỏi `main`:

```powershell
git fetch origin
git ls-tree -r --name-only origin/codex/manabi-task004-restore-2026-10-04 tasks/
git show origin/codex/manabi-task004-restore-2026-10-04:tasks/in-progress/manabi-002-expo-foundation.md
```

Thứ tự đọc khi nhận việc:

1. [AGENTS](../../AGENTS.md), [yêu cầu sản phẩm](../product/PRODUCT_REQUIREMENTS.md), [kế hoạch](PROJECT_PLAN.md) và [quy trình](TEAM_WORKFLOW.md).
2. Task Manabi được giao trên nhánh triển khai, dependency và acceptance criteria của nó; rồi mới đọc spec/ADR mà task dẫn tới.
3. Với UI, xem prototype và ghi chú UI; với data, xem [DATA_STORAGE_SPEC](../specs/DATA_STORAGE_SPEC.md) và ADR-004. Chỉ triển khai phần task được giao và ghi evidence để reviewer khác owner kiểm.

Các cổng tổng quát: G1 nền tảng Expo/CI và quyết định dữ liệu → G2 core local/deck/SRS/flashcard/backup → G3 ba game và tiến độ → G4 pilot AI/ảnh khi đủ điều kiện → G5 chất lượng → G6 bàn giao. [PROJECT_PLAN](PROJECT_PLAN.md) có dependency và điều kiện nghiệm thu; số task không phải thứ tự chạy.

## Clone và kiểm tra tài liệu

```powershell
git clone https://github.com/ThanhTris/IE307.git
cd IE307
git switch main
git fetch origin
python scripts/validate_repository.py
```

Clone `main` **chưa có `package.json` trong `apps/mobile`**, nên chưa có lệnh `npm run start` hoặc `expo start` để chạy app từ nhánh này. Expo foundation thuộc MANABI-002 trên nhánh triển khai. Sau khi nhận task và có checkout triển khai, dùng lệnh do task/README của app ở checkout đó quy định; không chạy lệnh của prototype HTML để kết luận app Android đã hoạt động. Bản tài liệu nền trên `main` không chứa registry task/DOCX; quy trình push task hoặc code triển khai xem [TEAM_WORKFLOW](TEAM_WORKFLOW.md).
