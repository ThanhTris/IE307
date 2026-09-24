# Kiến trúc hệ thống

## Tổng thể

```text
React Native mobile app
  -> UI and feature modules
  -> domain services and JSON validation
  -> repository layer
  -> SQLite local database and sync queue
  -> Supabase Auth and API
       -> PostgreSQL with JSONB and RLS
       -> Edge Functions or RPC for batch operations
       -> Storage for optional media
```

Mobile luôn đọc/ghi qua repository local. Sync chạy nền khi có mạng và tài khoản hợp lệ. UI không phụ thuộc trực tiếp vào Supabase để tránh mất khả năng offline.

## Thành phần chính

- `apps/mobile`: route, screen, feature state, repositories và sync worker.
- `packages/domain`: entities, schema validator, import, scheduler, game policy.
- `packages/ui`: tokens và components dùng chung.
- `supabase`: database migrations, RLS, seed, functions.
- `schemas`: JSON contracts có version.

## Luồng dữ liệu

### Tạo hoặc sửa card

1. Form đọc `fieldSchema` của deck.
2. Dữ liệu được validate bằng JSON Schema.
3. Repository ghi card và sync event trong cùng transaction SQLite.
4. UI cập nhật từ local state.
5. Sync worker đẩy event idempotent lên backend.
6. Backend kiểm tra auth, RLS, version và trả record canonical.

### Study

1. Query các card đến hạn theo cột `dueAt`, `state` và giới hạn deck.
2. User rating tạo `review_event` bất biến.
3. Scheduler tính trạng thái mới và cập nhật card schedule trong transaction.
4. Review event và card update được đưa vào sync queue.

### Game

Game tạo session local từ card đã học. Kết quả chủ động đầu tiên được chuyển thành tín hiệu giới hạn; lỗi thao tác, bom và auto-complete chỉ ảnh hưởng điểm game.

## Backend và API

- Supabase Auth xác thực người dùng.
- PostgREST phục vụ CRUD có RLS cho luồng đơn giản.
- RPC/Edge Function xử lý sync batch, import/export lớn hoặc transaction nhiều bảng.
- API trả error code ổn định, không chỉ message tự do.
- Mọi write cần `eventId`, `recordId`, `baseVersion` và `clientUpdatedAt` khi qua sync.

## Database

- `decks`: metadata, `field_schema` JSONB, `card_templates` JSONB, version.
- `cards`: `fields` JSONB và các cột schedule/index chuẩn hóa.
- `review_events`: append-only event history.
- `game_sessions`: score, accuracy, duration và signal summary.
- `sync_changes`: idempotency, device, entity, operation và status.

## Authentication và authorization

- User chỉ đọc/ghi row có `user_id = auth.uid()`.
- Shared deck là phase sau; MVP không mở public write.
- Edge Function luôn kiểm tra JWT và không dùng service role trên client.

## Dịch vụ bên thứ ba

- Supabase cho auth/database/storage.
- Expo/EAS cho development build và release build.
- App Store Connect và Google Play Console cho phát hành thực tế, phụ thuộc tài khoản và xét duyệt.

## Quan sát và bảo mật

- Log không chứa nội dung card nhạy cảm hoặc token.
- Crash/error report phải loại PII.
- Sync conflict, migration failure và schema validation failure có metric riêng.
