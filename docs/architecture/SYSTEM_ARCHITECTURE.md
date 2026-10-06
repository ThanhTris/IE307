# Kiến trúc đề xuất

Draft for review • [ADR 001](decisions/ADR-001-stack.md).

```text
Expo Router → feature screens → use cases → repository interfaces
                                  ↓                  ↓
                        pure decision helpers    Supabase adapter
                        (preview/test only)          ↓
                                        Auth + snapshot RPC + Realtime
                                                     ↓
                                         Postgres transaction / RLS
                                                     ↓
                                       authoritative room + result
```

- `mobile/src/app`: layouts/routes; không thuật toán match hoặc gọi RPC rải rác.
- `features/<feature>`: screens/components/hooks/use cases/repository interface; không import chéo internals.
- `domain/decision`: types/validation/policy mô phỏng; không import React/Supabase. Backend chốt thật.
- `data`: Supabase, secure session, drafts/cache, codecs; validate input trước đưa vào domain.
- `shared`: design tokens, primitive UI, error mapping.
- `supabase/migrations`: schema/policies/RPC/indexes có version, SQL tests. Không cần Express/Nest riêng.

Local state giữ nháp/card index/modal. Server giữ roster/pool/version/submission/result. Realtime báo version đổi; client refetch snapshot được phân quyền. Bỏ event version cũ; ACK mới đánh dấu submitted. Timeout retry cùng requestId; version conflict refetch trước retry.

Phiếu chỉ owner và function đặc quyền được đọc. Snapshot/event không chứa raw votes. Host không có quyền đọc phiếu người khác; quyền operator database là khác quyền host. Không tuyên bố mã hóa đầu cuối.

Mất mạng không tạo/chốt nhóm. Reconnect lấy server snapshot; chỉ phục hồi nháp cùng round/pool và chưa submitted. Nháp stale bỏ sau thông báo. Terminal result không bị cache ghi đè.

Mục tiêu free tier demo, không cam kết miễn phí vô hạn; kiểm quota/pause trước demo, không tự nâng paid plan. Maps URL mở app ngoài, không lấy danh sách quán. [Nguồn](../research/TECHNOLOGY_NOTES.md).
