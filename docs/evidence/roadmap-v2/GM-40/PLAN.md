# GM-40 — Patch/test plan

Owner Vinh; reviewer Trí. Assignment accepted theo yêu cầu triển khai của Vinh
ngày 2026-10-21; không xác nhận approval hoặc thay Status trên Project.
Base `afb1dca13b91bef30062aca018e5457908d244bc`, branch `codex/gm-40-dish-catalogue`.
Profile/schema 1.0.0; contract `dish-catalogue-v1/roadmap-v2/GM-40.1`.

## Mốc A — dữ liệu độc lập

Nhận GM-04 dictionary, GM-06 schema, GM-07 DTO, GM-08 bundle/HANDOFF từ main;
kiểm checksum tại [upstream inventory](UPSTREAM.json). Readiness live Project
phải đạt trước code. Bổ sung đúng metadata issue #125 và ngoại lệ P0 bổ sung sau
GM-34 theo issue; không thay approval/dependency task cũ hoặc trạng thái Project.

Giữ 39 món/UUID, mapping 216/2/1; sinh bundle, schema, template, manifest và báo cáo
từ snapshot offline. Giữ record version 2; preparationMethods=null vì chưa có
evidence mới. Bỏ quán khỏi runtime profile, giữ menu URLs/IDs làm nguồn. Tách 247
quan sát giá, giữ đơn vị/khẩu phần/ngày nguồn. Artwork chưa đủ review giữ null.
Fixtures mô phỏng riêng, không biến dữ liệu thật thành fixture hoặc ngược lại.

Test: required/null/unknown, alias/trùng/Unicode/ID/FK/taxonomy type, evidence,
rights, price/unit/nonfinite/time, profile không nhận entity quán, template trống,
two offline builds/hash, mọi giá trị món cũ và từng quan sát giá được bảo toàn.

## Mốc duyệt — Trí

[ADR-018](../../../architecture/decisions/ADR-018-dish-catalogue-profile.md) mô tả
release storage, snapshot discriminator/FK, private adapter và RPC riêng. Issue
yêu cầu “Chốt supplement/ADR hẹp với Trí trước thay schema/API”. Chờ quyết định
thật cho ADR; không coi việc Vinh yêu cầu triển khai là review thay Trí.

## Mốc B — sau ADR được duyệt

Fetch main và kiểm artifact/Git/DB ledger lại; chọn migration còn trống. Importer
và private storage thực hiện validate/stage/import/readback/reimport/rollback trên
DB test riêng. RPC read/preview có auth, DTO/guard riêng. Conditional FK chỉ nới
nguồn catalogue, giữ legacy offering guards. Adapter snapshot pin release; copy
đủ metadata qua round 2 và giữ integrations GM-21/23. Không thêm public create-room
flow/UI, không đổi cap hoặc eligibility food-v1.

SQL assertions thật tại `supabase/tests/dish_catalogue.sql`, JWT HTTP runner và
`supabase/tests/http/GM-40.http`: import atomicity/conflicts/rollback/ACL, catalogue
không cần quán, old/new snapshot, old transition/finalize/retry/privacy/history.
Trước merge chạy readiness --gate merge --base-ref origin/main; gate không thay
test thực hoặc review Trí. Không tạo file placeholder báo Pass cho các đầu ra này.

## Kiểm chung và bàn giao

Python regression, repository validator, task index check, diff check ở mốc A.
SQL/HTTP/domain/mobile typecheck/lint/tests/architecture ở mốc B theo thay đổi thật.
CHECKS/HANDOFF phân biệt Pass/Fail/Not run; không tuyên bố SQL/API/Android từ offline
test. Không thêm package, gọi AI, reset app DB hoặc Approved/Done.
Ngoại lệ commit/push/PR: Vinh đã yêu cầu mở PR ngày 2026-10-21; chỉ bàn giao mốc A và ADR chờ review.
