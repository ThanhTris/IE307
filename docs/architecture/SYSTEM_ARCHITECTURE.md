# Kiến trúc food-v1 — chờ review dependency

Expo Router → feature screens → use cases/domain/repository interfaces → Supabase RPC + SQLite/secure session adapters. Server transaction/RLS quyết định roster/pool/submission/result; Realtime chỉ báo version để refetch. Local giữ own drafts/cache/outbox/history có consent. [ADR-001](decisions/ADR-001-stack.md) vẫn Proposed.

Push: room invite/finalize transaction ghi notification event → trusted sender sau commit → Expo/FCM → device tap → restore auth/snapshot. Không service key ở app, không network push trong transaction, không tin payload push làm winner. [Spec](../specs/NOTIFICATIONS_LINKS_SPEC.md).

Outbox persist trước network, ACK trước version, attempt id mới chỉ khi conflict bị từ chối rõ; khi resume kiểm auth/roster/round/pool/expiry. Cache không chốt nhóm offline. [Spec](../specs/OFFLINE_SYNC_SPEC.md).

Context/consent/recent history được server khóa cùng pool; local giờ chỉ đề xuất host xác nhận. Group history đúng roster/consent, phiếu thô owner only. GM-10 GPS/manual gợi public anchor, GM-08 core dataset venue–dish–lịch, GM-11 eligibility theo coverage/radius/giờ, GM-12 tạo/khóa pool. Room chỉ giữ context điểm công cộng đã xác nhận, không raw GPS; history không giữ điểm này mặc định.

mobile/src/app routes mỏng; features identity/rooms/voting/results/partners/history/notifications, domain/decision độc lập React/network; data/local và data/supabase adapters. supabase/migrations/tests/functions theo trách nhiệm, không server Express riêng. Trên sanbox có package/runner và feature bootstrap thử QR/link/SQLite/local notification của GM-02, chưa có backend/tính năng nhóm hoặc APK đã build; review vẫn Pending. [Data model](DATA_MODEL.md), [RPC](API_CONTRACT.md), [cấu trúc](../project/REPOSITORY_STRUCTURE.md).

[Food spec](../specs/FOOD_DATA_SPEC.md) và [dependency map](../project/TASK_DEPENDENCIES.md) tách location sớm khỏi GM-23 QR/review muộn, tránh phụ thuộc vòng result/location. Backend SQL setup ở GM-05, native runner GM-02, scope review mới GM-01.
