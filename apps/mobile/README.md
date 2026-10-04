# Mobile app Manabi

Trên `main`, thư mục này mới là vị trí dự kiến cho Expo React Native; **chưa có `package.json` hoặc app để chạy `npm run start`/`expo start`**. Expo foundation thuộc MANABI-002 trên [nhánh task Manabi hiện hành](../../docs/project/START_HERE.md). `SETUP-002` là tên task Memo cũ, không áp dụng cho Manabi.

Yêu cầu cho task khởi tạo:

- TypeScript strict.
- Expo Development Build để có đường nâng cấp native khi cần.
- Expo Router cho navigation.
- SQLite cho offline data.
- Tách module theo feature: `decks`, `import`, `study`, `games`, `profile`; `sync` chỉ ở giai đoạn cloud tùy chọn sau review.
- Dùng Core Components, safe area, accessibility và responsive layout theo bài giảng IE307.

Giai đoạn đầu lưu SQLite trên thiết bị và backup JSON, không yêu cầu tài khoản/cloud sync. Đọc [ADR-004](../../docs/architecture/decisions/ADR-004-json-storage-and-database.md), [đặc tả flashcard](../../docs/specs/FLASHCARD_SPEC.md) và [ghi chú UI](../../design/prototypes/UI-IMPLEMENTATION-NOTES.md) trước khi triển khai. Lệnh chạy cụ thể phải được ghi trong README của checkout có scaffold Expo, sau khi MANABI-002 tạo app.
