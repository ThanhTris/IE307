# Backend đề xuất — Supabase

Skeleton, chưa có project/config/schema chạy. GM-04/06/08/12 sẽ tạo migration/RLS/RPC theo [data model](../docs/architecture/DATA_MODEL.md) và [contract](../docs/architecture/API_CONTRACT.md).

`migrations/` thứ tự timestamp; `seed/` catalogue demo; `tests/` SQL permission/concurrency. Không dùng dashboard changes thay migration. Mọi security definer function fixed search_path, qualified tables, kiểm auth/member/state và explicit GRANT. Mỗi room transition atomic; không publish raw votes qua Realtime.

Free tier chỉ là mục tiêu chi phí; xác minh quota/cleanup/pause trước khi triển khai. Không tạo remote project hoặc bật paid plan trong đợt cấu trúc này.
