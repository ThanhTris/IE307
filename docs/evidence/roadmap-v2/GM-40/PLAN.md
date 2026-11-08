# GM-40 — Patch/test plan hiện hành

## Bản hiện hành GM40.2 — nhận producer GM18.2

Đọc [handoff mới](rich-projection/HANDOFF.md), [plan](rich-projection/PLAN.md) và
[checks](rich-projection/CHECKS.md). Source bundle/schema1.0.0/dataset1.1.0 giữ nguyên;
adapter rich, schema/template stage, coverage và QA nhận0033/GM18.2 đã merge.
Các số liệu/runtime0026 và trạng thái review bên dưới là evidence lịch sử, không
thay kết quả supplement mới. Không SQL/API mới hoặc tự Approved/Done.


Owner Vinh; reviewer Trí. Scope tiếp nhận từ comment PR #129 ngày2026-10-23;
start gate đọc Project thật READY_TO_START, base main0d571b7. Không tự Done/Approved.
Contract file dish-catalogue-v1/GM-40.1 schema1.0.0, dataset1.1.0;
runtime nhận sẵn dish-session-v3/ADR-019/schema0.8.0, migration0026.

1. Giữ39 UUID/18 GM-08 shared, mapping216/2/1, giá247 và snapshots lịch sử.
   Supplement bữa có version/URL/hash/ngày kiểm, locator+observation tường minh;
   chỉ tăng version30 món có biên tập, không suy nhãn từ tên/giờ quán để đạt quota.
2. Tái sử dụng storage0026/RPC hiện hữu. Bổ sung đối chiếu ADR-018, giữ Proposed;
   không thay schema/API, migration/room authority/luật chọn món. Đề xuất SQL ban đầu
   chưa triển khai, cần Trí chốt nếu muốn thay schema/API về sau.
3. Validate→stage→transaction→readback: projection tường minh, release/version/hash
   pin; no-op/conflict, rollback/activation/restore; chỉ owned QA/test_only=true.
4. QA DB/REST riêng có marker, JWT ký thật với synthetic QA identities, worker verify;
   assertions nội dung pool trưa10/20/shortage, auth/ACL, chuyển vòng/kết quả/reconnect,
   snapshot khóa, legacy fixture IDs/FK/results giữ nguyên. Không reset/migrate app DB.
5. Offline unit/negative/source preservation/two builds; runtime regression riêng,
   full Python/repository/index/diff, live merge gate sau fetch main. Evidence pin
   nguồn/code/migration/hash/expected–actual; không log token hoặc phiếu.

Chưa kiểm Android/FE/Places hoặc production publish; đây là Data/BE, không thêm package,
không tạo RPC preview đề xuất khi chưa cần, không gán approved theo kết quả validator.
[HANDOFF](HANDOFF.md) ghi lệnh và khôi phục; [CHECKS](CHECKS.md) ghi kết quả thực.
