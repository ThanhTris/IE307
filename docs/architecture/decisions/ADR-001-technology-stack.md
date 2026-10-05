# ADR 001 — Công nghệ Manabi

## Trạng thái

Đề xuất, chờ review kỹ thuật trước triển khai.

## Quyết định đề xuất

- Expo React Native, TypeScript strict, Development Build và Expo Router.
- Android là nền tảng nghiệm thu chính.
- SQLite lưu dữ liệu core offline; JSON cho nội dung card và backup.
- Supabase Auth/PostgreSQL JSONB/RLS là phương án mở rộng tài khoản và đồng bộ sau core.
- Backend giữ khóa dịch vụ, kiểm quyền, consent và quota cho pilot Gemini/ảnh.

## Lý do

Ứng dụng cần giao diện mobile, học offline và dữ liệu bền vững trên thiết bị. Nội dung card linh hoạt theo [ADR-002](ADR-002-flexible-card-json.md); thiết kế database theo [ADR-004](ADR-004-json-storage-and-database.md) và [DATA_STORAGE](../../specs/DATA_STORAGE_SPEC.md).

## Điều kiện triển khai

Dependency/version/license/kích thước phải được ghi trong task và reviewer chấp thuận. Pilot theo [ADR-003](ADR-003-ai-quiz-boundary.md); lỗi dịch vụ ngoài không chặn core. Expo/API sẽ được triển khai theo task nền tảng và các cổng nghiệm thu trong kế hoạch.
