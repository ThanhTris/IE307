# Backend đề xuất — Supabase

Skeleton, chưa có project/config/schema chạy. GM-05, GM-09, GM-12, GM-14, GM-11 sẽ tạo migration/RLS/RPC theo [data model](../docs/architecture/DATA_MODEL.md) và [contract](../docs/architecture/API_CONTRACT.md).

`migrations/` thứ tự timestamp; `seed/` dataset verified GM-08 và fixture mô phỏng tách biệt; `tests/` SQL permission/concurrency. Không dùng dashboard changes thay migration. Mọi security definer function fixed search_path, qualified tables, kiểm auth/member/state và explicit GRANT. Mỗi room transition atomic; không publish raw votes qua Realtime.

Free tier chỉ là mục tiêu chi phí; xác minh quota/cleanup/pause trước khi triển khai. Không tạo remote project hoặc bật paid plan trong đợt cấu trúc này.

GM-05 bàn giao SQL config/runner/migration trước GM-08 seed và GM-11 eligibility. [Food data](../docs/specs/FOOD_DATA_SPEC.md) là core: offerings/schedules/coverage/source freshness. Chưa có dataset quán thật được publish.
