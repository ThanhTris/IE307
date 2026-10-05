# Mobile app Manabi

Thư mục này mới là vị trí dự kiến cho Expo React Native; **chưa có `package.json` hoặc app để chạy**. Expo foundation là task dự kiến MANABI-001 trong [kế hoạch Manabi](../docs/project/PROJECT_PLAN.md). Chốt task chi tiết trước khi triển khai.

Yêu cầu cho task khởi tạo:

- TypeScript strict.
- Expo Development Build để có đường nâng cấp native khi cần.
- Expo Router cho navigation.
- SQLite cho offline data.
- Tách module theo feature: `decks`, `import`, `study`, `games`, `profile`; `sync` chỉ ở giai đoạn cloud tùy chọn sau review.
- Dùng Core Components, safe area, accessibility và responsive layout theo bài giảng IE307.

Giai đoạn đầu lưu SQLite trên thiết bị và backup JSON, không yêu cầu tài khoản/cloud sync. Đọc [ADR-004](../docs/architecture/decisions/ADR-004-json-storage-and-database.md), [đặc tả flashcard](../docs/specs/FLASHCARD_SPEC.md) và [ghi chú UI](../design/prototypes/UI-IMPLEMENTATION-NOTES.md) trước khi triển khai. Lệnh chạy cụ thể phải được ghi trong README của checkout có scaffold Expo, sau khi MANABI-001 tạo app.
