# BE — GM-03 Supabase local foundation

Stack đã được chủ dự án xác nhận tại ADR-001. GM-03 chỉ tooling/config/start/HTTP health/pgTAP nền, chưa schema/RPC/verified dataset/project remote.

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

HTTP: GET `http://127.0.0.1:54321/auth/v1/health` → 200 + JSON name=GoTrue, version/description nonempty; runner kiểm assertions, không theo redirect. SQL có 3 assertions: DB postgres, PostgreSQL>=17, query arithmetic; transaction rollback. Output/environment tại [CHECKS](../docs/evidence/roadmap-v2/GM-03/CHECKS.md). Đây không là nghiệm thu API nghiệp vụ.

Status chỉ in project/API URL loopback, bỏ keys/password/token. Không paste raw CLI status vào Git/evidence. Credential local mặc định không dùng cho dữ liệu thật; runner chỉ target loopback, không cam kết Docker bind mọi port chỉ loopback. Kiểm firewall/network publishing trước chia sẻ LAN; không dùng mạng không tin cậy.

## Lỗi và reset

Thiếu CLI: npm ci root. Thiếu engine: bật Docker Desktop Linux containers; không tự đổi WSL/Windows features hoặc chấp nhận điều khoản. Port bận: kiểm project đang dùng, không stop/reset project khác. Services chưa chạy: health fail/connection failure/exit nonzero, không báo Pass. Stop giữ volume, chỉ project này, không all/no-backup.

Reset xóa dữ liệu **chỉ database local project này**, không nằm trong smoke/test:

```powershell
npm run backend:reset:local -- --confirm-local
```

Bắt xác nhận, kiểm config/project/ports/status; CLI luôn local/no-seed, từ chối extra flags. Backup trước reset; đợt smoke không cần chạy reset thật.

## Quy ước

GM-06 sở hữu migrations sau dictionary GM-04; `YYYYMMDDHHMMSS_gmXX_description.sql`, không sửa migration đã merge. Seed templates GM-04, verified GM-08, chưa bật seed. GM-07 chốt DTO/errors/client, task API thêm xử lý theo [contract](../docs/architecture/API_CONTRACT.md). RPC kiểm auth/membership/state/version/expiry/lock/idempotency; security definer fixed search_path/qualified table/explicit GRANT; RLS giữ kín raw votes. Chưa triển khai/kiểm những bảo mật nghiệp vụ đó tại GM-03.

[Tests](tests/README.md) · [Shared functions](functions/_shared/README.md) · [Handoff](../docs/evidence/roadmap-v2/GM-03/HANDOFF.md). GM-03 chưa Done nếu HTTP/SQL bắt buộc Not run/Fail hoặc thiếu review Tâm.
