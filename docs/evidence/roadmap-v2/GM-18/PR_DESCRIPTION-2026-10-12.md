# feat(backend): add independent GM-18 food eligibility kernel

GM-18 / Issue #79, owner @HoaiTam, reviewer @ThanhTris.
Branch codex/gm-18-catalogue-eligibility → main.

Bổ sung TypeScript và SQL kernel lọc offering theo coverage/radius, freshness,
lịch quán–món/ngoại lệ/overnight/last order, meal slot và availability. Rank mềm
sau eligibility, card từ một offering và pool tối đa 8 dish/variant unique.
Winner refetch lọc đúng winner trước cap, không thay kết quả đã chốt.

Migration 0018 thêm private invoker/helper; giữ nguyên schema migrations cũ,
RLS và quyền app. Runner kiểm expected sets từ 42 fixture gốc cùng edge cases,
complete TS/SQL parity, typed DB snapshot và rejection của bundle GM-08 draft thật.

Validation: 139 SQL assertions / 60 cases, 68 eligibility tests (237 domain regression),
288 mobile và 544 Python tests Pass; repo/docs/diff Pass. Mobile lần đầu có 1 shell
timeout 5000 ms; chạy lại cùng ngưỡng và check cuối Pass, evidence giữ cả hai lượt.
CI bổ sung test/parity artifact; CI của revision này chưa chạy trước push.

Merge gate live còn chờ GM-17 (Todo), xem merge-gate.txt.
Start gate live đạt trên base 9188c73; xem start-gate.txt. CHECKS.md và HANDOFF.md
nêu source hashes, lệnh tái lập và kết quả. Đây là phần độc lập của GM-18, chưa
public RPC/auth/rate-limit tích hợp GM-17 hoặc Android–API/verified catalogue AC.
Policy radius/time horizon và public projection cần review trước tích hợp.
Chưa đề nghị Done/merge toàn bộ task; không tạo liên kết tự đóng issue.
