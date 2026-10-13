# GM-18 — Kế hoạch triển khai

Phần ngày2026-10-12 dưới đây là lịch sử; mục tích hợp2026-10-13 và
CHECKS/HANDOFF hiện hành thay các blocker GM17/verified đời trước.

Ngày 2026-10-12. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Nhánh `codex/gm-18-catalogue-eligibility`, base `9188c736def7e125266f8cce2314b9f1f5c31b81`.
Contract GM-07.1 / food 1.1.0 / schema 0.1.0. Start gate live đạt:
GM-06 và GM-07 Done, artifact/HANDOFF có trên main và nhánh này.
User yêu cầu bắt đầu GM-18 và giữ quy ước tên nhánh của repo.

1. Pure TypeScript eligibility: coverage/radius, freshness, lịch quán–món,
   timezone/overnight/date exception/last order, availability/meal slot;
   rank mềm, không ghép profile/giá của nhiều offering, tối đa 8 dish/variant.
2. Migration 0018 với kernel SQL và projection từ typed DB; dùng cùng input và
   đối chiếu TS/SQL trên 42 fixture legacy đã có. Adapter fixture 1.0 → 1.1 chỉ
   bổ sung binding schedule/null fields và contract version của fixture dataset; không sửa fixture gốc hoặc dữ liệu thật.
3. Test thêm last order, holes/boundary, fixture rejection, request limits,
   seed/order, null và winner refetch; query chính bundle draft GM-08 riêng.
4. Bàn giao CHECKS/HANDOFF/http examples, source hashes và lệnh tái lập.
   Chạy typecheck/lint/mobile tests, Python regression/repo/docs/diff.

Phần tích hợp quyền RPC/RLS/rate limit chờ GM-17. Không cấp quyền app hoặc tạo
security-definer bypass trong GM-18. Radius/time horizon là tham số policy bắt
buộc của kernel; giá trị test không phải policy đã được reviewer chốt.
Fixture SQL/TS không thay query catalogue verified hoặc Android–API evidence.
Không tự Approved/Done, commit/push hoặc sync GitHub.

## Tích hợp GM-17 ngày 2026-10-13

User yêu cầu hoàn thiện GM-18 sau GM-17; PR #111 đã merge tại
4a38588f515c6121a38c605bf50e209d570b90bd. Nhánh đã rebase trên main này.
Schema 0.2.0 / GM-17.1 / ADR-014/015, không sửa migration 0001–0004 hoặc 0018
đã bàn giao. Migration mới 0005 thêm API boundary; PL/pgSQL gọi kernel 0018
ở runtime sau khi toàn bộ migrations áp dụng. Không chiếm prefix 0019 của GM-19.

User chọn policy tối đa 10 km và 7 ngày trong hội thoại này. Cấu hình server
private, không nhận clock/seed/fixture flag/bundle/userId từ request.
Thêm auth/validation/rate-limit, explicit DTO projection, active member/result
lookup và winner refetch. Không dùng guard mutation require_room cho result read
terminal; kiểm member/expiry bằng luật GM-17, không viết phiếu/room/result.

Kiểm PostgreSQL 0.2.0, SQL claims riêng, HTTP JWT GoTrue/PostgREST thật, actual
mobile client/guards qua transport real; data thật giữ draft và query empty theo
ADR-014. Positive scenario chỉ fixture trong DB disposable. Tách evidence cũ
khỏi integration mới; device consumer cases tiếp tục handoff GM-24/25/27.
