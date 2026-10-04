# ADR 001 — Technology stack Manabi

## Trạng thái

Lịch sử: **Accepted ngày 24/09/2026** trong baseline trước. Ngày 02/10/2026 đổi tên/phạm vi sang Manabi tiếng Nhật; giữ hướng công nghệ để review lại ở MANABI-001. Việc kế thừa status lịch sử không là human approval cho đặc tả/tính năng mới hoặc migration database.

## Quyết định

Baseline giữ để tái xác nhận: Expo React Native với TypeScript strict/development build, Expo Router cho navigation; SQLite cho core offline; Supabase Auth/PostgreSQL JSONB/RLS cho auth/backend extension và sync. Android-first; iOS không là yêu cầu nghiệm thu bắt buộc hiện tại. Không có app/backend production chỉ vì ADR đã ghi stack.

Card JSON và metadata/schedule riêng theo [ADR-002](ADR-002-flexible-card-json.md)/[DATA_STORAGE](../../specs/DATA_STORAGE_SPEC.md). [ADR-004](ADR-004-json-storage-and-database.md) nghiên cứu MongoDB nhưng đề xuất giữ baseline, chưa chọn migration.

## Lý do

Một codebase phù hợp nhóm sáu người, bám nội dung IE307 và giảm công xây/vận hành auth/API mới. Milestone theo [PROJECT_PLAN](../../project/PROJECT_PLAN.md) và dependency của task; không suy ra deadline cố định từ ADR. Giao diện dùng prototype Manabi hiện có.

## Hệ quả

Nhóm phải kiểm thử native capability bằng development/release build, local transaction/outbox/conflict và RLS/owner isolation; UI không bỏ qua repository để gọi cloud trực tiếp. Supabase không tự giải quyết sync offline.

Dependency/version/license/size chốt trong task trước thêm package. Gemini/ảnh là pilot theo [ADR-003](ADR-003-ai-quiz-boundary.md), không làm core phụ thuộc provider. Trước triển khai task phụ thuộc, MANABI-001 phải được reviewer/human chấp thuận theo workflow.
