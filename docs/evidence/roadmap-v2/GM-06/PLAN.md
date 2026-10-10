# GM-06 — Nhận việc và patch/test plan

2026-10-10 • Owner Tâm (@HoaiTam) • Reviewer Trí (@ThanhTris), review Pending.
Task [#67](https://github.com/ThanhTris/IE307/issues/67), contract `food-v1/roadmap-v2/GM-06.1`; schema 0.1.0.

## Authorization và đầu vào

Tâm báo GM-03/04 đã Done trên Project và yêu cầu trực tiếp bắt đầu GM-06 đúng quy trình. CLI xác minh #64/#65 Closed bởi ThanhTris; không có quyền read:project để tự đọc cột Project. `task_readiness.py --task GM-06 --base-ref origin/main` đã chạy và còn BLOCKED do main ghi GM-03 Review / GM-04 Backlog. Triển khai nhánh theo chỉ dẫn hiện tại; không ghi Approved thay reviewer hoặc sửa gate. Metadata task giữ backlog/proposed cho tới xác nhận reviewer/upstream; owner đã nhận việc và code chuẩn bị được ghi trong hồ sơ này. Trí cần đồng bộ review evidence upstream và review revision GM-06 trước merge.

Base nhận: `d9e83d9c091b4487f7188bdfb7906e8f950db378` (đã fetch).
GM-03: config/runner/package-lock tại base, contract GM-03.1; HANDOFF đọc.
GM-04: PR #62 merged tại base; food/core 1.1.0, GM-04.2; dictionary, 596 field paths, templates/schema/cases và HANDOFF đọc. Evidence feature `8f90af5555daad7506d16f59957d6e653c22b603`.

## Scope và ownership

Chỉ schema/migration/constraints/indexes/mapping, SQL synthetic fixture/tests, runner local và hồ sơ GM-06. Không đổi dictionary/DTO/API, seed thật, policy RLS cho app, engine hoặc task upstream.

- Typed columns snake_case cho mọi top-level field; object/structured array là JSONB có shape/required/enum/unknown-field constraints. UUID arrays giữ thứ tự, kiểm unique/reference; mapping từng nested path rõ ràng.
- Tách schedule group để FK scheduleId có đích duy nhất; FK owner/timezone, ca qua đêm/last order và date exceptions riêng.
- Auth references tới auth.users thật, không dùng profiles thay auth. Unique NULLS NOT DISTINCT cho tuple nullable. Không default vote/price/consent.
- RLS enabled/forced, revoke client privileges, chưa có member policies/RPC. Publisher NOLOGIN nội bộ chỉ food; importer local là DB admin ở môi trường test. Fixture mặc định không publish.
- Schema version tách contract/dataset. Migration 0001 có rollback riêng ngoài migrations; migration đã merge bất biến, task sau thêm số riêng.

## Kiểm chứng

Dùng runner GM-03/Supabase Postgres17 local; xác minh engine trước migrate. Không reset DB đang có dữ liệu người dùng; kiểm trên DB test riêng mới tạo, cleanup đúng DB đó. Migrate DB rỗng, upgrade có dữ liệu, rollback/reapply; SQL assertions cho FK/nullable/enum/unique/version/nested shape/overnight/timezone/default deny/internal publisher và query mẫu. Fixtures tổng hợp từ templates 1.1.0 không seed thật. Kiểm coverage 596 paths đối chiếu catalog PostgreSQL và sha256 revision.

Chạy contract checks upstream, repository validator, toàn bộ regression yêu cầu, --write-docs/--check-docs và git diff --check. CHECKS ghi lệnh/expected/actual/report cùng giới hạn. Không commit/push/sync GitHub hoặc Approved/Done.
