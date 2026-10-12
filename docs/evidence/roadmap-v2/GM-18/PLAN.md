# GM-18 — Kế hoạch phần độc lập

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
