# API contract dự kiến

## Quy ước

- JSON UTF-8, timestamp ISO 8601 UTC.
- Write qua sync có `eventId`, `baseVersion` và idempotency.
- Error có `code`, `message`, `details` và `retryable`.
- Client không dùng service-role key.

## Nhóm API

| Nhóm | Cơ chế | Mục đích |
| --- | --- | --- |
| Auth | Supabase Auth | Đăng ký, đăng nhập, refresh, logout |
| Deck/Card CRUD | PostgREST + RLS | Đồng bộ record canonical |
| Batch sync | Edge Function/RPC | Push/pull event theo cursor |
| Import | Local trước; Edge Function tùy kích thước | Parse/validate batch lớn nếu cần |
| Backup | Edge Function hoặc client export | Xuất dữ liệu versioned JSON |

## Batch sync đề xuất

`POST /functions/v1/sync` nhận deviceId, cursor và events. Response trả accepted event ids, conflicts, server changes và next cursor. Conflict phải trả cả server version và client event; UI hoặc policy mới quyết định merge, không ghi đè im lặng.
