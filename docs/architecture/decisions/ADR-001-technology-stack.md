# ADR 001 Technology stack

## Trạng thái

Accepted ngày 24/09/2026.

## Quyết định

Dùng Expo React Native với TypeScript và development build; Expo Router cho navigation; SQLite cho offline; Supabase Auth/PostgreSQL/JSONB/RLS cho backend và sync.

## Lý do

Một codebase phù hợp nhóm sáu người và thời gian hai tháng. Stack bám nội dung IE307, hỗ trợ release Android/iOS và giảm công vận hành backend.

## Hệ quả

Nhóm phải kiểm thử native capability bằng development build, thiết kế offline queue rõ ràng và không để UI gọi Supabase trực tiếp.
