# BE — Supabase local, schema và RPC

Stack đã được chủ dự án xác nhận tại ADR-001. GM-03 là tooling/config/health nền. Source hiện có schema/import GM-06/08, auth/ACL/retention, eligibility/room/ballot/history/social/notifications GM-16..23 và dish-session v3 (0026/schema0.8.0). Contract B/v4 và phần Top3/history/policy mới còn cần owner triển khai theo [phạm vi BE/Data](../docs/project/BE_DATA_ONLY_SCOPE_2026-10-25.md) và [audit](../docs/project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md); không coi source đầy đủ là database đang chạy đã được migrate hoặc dataset đã publish.

## Chạy từ clone sạch

Node >=22.13 (đã dùng 24.15.0), npm, Docker Desktop engine Linux containers. Không cần Supabase account/token. Chạy tại root, không phải thư mục supabase:

```powershell
npm ci
npm run backend:start
npm run backend:status
npm run backend:smoke
npm run backend:test
npm run backend:stop
```

CLI pin 2.120.0, runner gọi shim bằng Node, không phụ thuộc `.cmd`/Unix shell. Start tải Docker images nếu chưa có; cần mạng/dung lượng. Project `gi-cung-duoc-local`, API54321/DB54322. Không deploy/link/login, tạo remote project/paid plan. CLI/Docker cần quyền cache/profile/pipe nếu sandbox chặn.

GM-16 rate-limit probe cần GoTrue có trusted client key. Sau `backend:start`, chạy
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gm16_rate_limit_setup.ps1`;
script chỉ thay Auth container local, giữ database volume và đặt
`GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For` để Kong cung cấp bucket key. Không
đưa biến này vào mobile hoặc public client.

HTTP: GET `http://127.0.0.1:54321/auth/v1/health` → 200 + JSON name=GoTrue, version/description nonempty; runner kiểm assertions, không theo redirect. SQL có 3 assertions: DB postgres, PostgreSQL>=17, query arithmetic; transaction rollback. Output/environment tại [CHECKS](../docs/evidence/roadmap-v2/GM-03/CHECKS.md). Đây không là nghiệm thu API nghiệp vụ.

Status chỉ in project/API URL loopback, bỏ keys/password/token. Không paste raw CLI status vào Git/evidence. Credential local mặc định không dùng cho dữ liệu thật; runner chỉ target loopback, không cam kết Docker bind mọi port chỉ loopback. Kiểm firewall/network publishing trước chia sẻ LAN; không dùng mạng không tin cậy.

## Kiểm đúng stage và deployed revision

- GM-06: `python scripts/gm06_schema_check.py --report <local-report.json>`; schema/reference/schedule/rollback trên DB test riêng.
- GM-17: `python scripts/gm17_access_check.py --report <local-report.json>`; SQL RLS/retention và đối chiếu ACL local với DB fresh. Assertion kiểm đúng registry contract GM-17, không giới hạn số migration về sau.
- GM-18/19: xem [GM-18 HANDOFF](../docs/evidence/roadmap-v2/GM-18/HANDOFF.md) và [GM-19 HANDOFF](../docs/evidence/roadmap-v2/GM-19/HANDOFF.md) cho real-JWT HTTP/disposable fixtures/Bruno; không dùng health hoặc mock thay test nghiệp vụ.
- Runtime ownership của runner GM-19 có regression `node --test tests/gm19-runtime-files.test.mjs`; không cleanup credential/control files của phiên khác.

Git pull không tự nâng cấp database. Trước dùng endpoint kiểm migration ledger và functions/definitions thật, không chỉ schema_versions. Database local có draft objects ngoài ledger cần backup và kế hoạch reconcile được Trí chốt; không tự reset/drop schema, đánh dấu migration applied hoặc sửa migration đã merge để che drift. Bộ kiểm disposable không tự đồng bộ app DB. Khi API/màn mới chưa thuộc task Done thì ghi rõ Not implemented/Not run, không nghiệm thu toàn app.

## Lỗi và reset

Thiếu CLI: npm ci root. Thiếu engine: bật Docker Desktop Linux containers; không tự đổi WSL/Windows features hoặc chấp nhận điều khoản. Port bận: kiểm project đang dùng, không stop/reset project khác. Services chưa chạy: health fail/connection failure/exit nonzero, không báo Pass. Stop giữ volume, chỉ project này, không all/no-backup.

Reset xóa dữ liệu **chỉ database local project này**, không nằm trong smoke/test:

```powershell
npm run backend:reset:local -- --confirm-local
```

Bắt xác nhận, kiểm config/project/ports/status; CLI luôn local/no-seed, từ chối extra flags. Backup trước reset; đợt smoke không cần chạy reset thật.

## Quy ước

GM-06 sở hữu migrations sau dictionary GM-04; `YYYYMMDDHHMMSS_gmXX_description.sql`, không sửa migration đã merge. Seed templates GM-04, verified GM-08, chưa bật seed. GM-07 chốt DTO/errors/client, task API thêm xử lý theo [contract](../docs/architecture/API_CONTRACT.md). RPC kiểm auth/membership/state/version/expiry/lock/idempotency; security definer fixed search_path/qualified table/explicit GRANT; RLS giữ kín raw votes. Chưa triển khai/kiểm những bảo mật nghiệp vụ đó tại GM-03.

[Tests](tests/README.md) · [Shared functions](functions/_shared/README.md) · [Handoff GM-03 lịch sử](../docs/evidence/roadmap-v2/GM-03/HANDOFF.md). Trí review mọi task theo ADR-013; Done đọc live trên Project, không suy từ hồ sơ Pending lịch sử. AC bắt buộc còn Fail/Not run vẫn cần xử lý ở đúng scope trước nghiệm thu.
