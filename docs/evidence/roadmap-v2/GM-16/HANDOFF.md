# GM-16 — Guest auth/session handoff

Owner Trí, reviewer Tâm, nhánh `codex/gm-16-guest-session` từ main9f71bba.
Contract `food-v1/roadmap-v2/GM-16.1`; schema input0.1.0 không đổi.
Chưa commit/push/review/Approved/Done; HTTP/SQL/rate429 đã Pass, native/expiry
còn Not run trong CHECKS.
Package SecureStore57.0.4 được chủ dự án cho phép trực tiếp cùng chọn reviewer Tâm.

## Artifact thực tế

| File | Cách dùng / expected | Task nhận |
| --- | --- | --- |
| mobile/src/data/auth/session.ts | SessionManager + required auth/storage/clearPrivateData ports; restore/refresh/logout và generation guard | GM-17/19/22/25/31 |
| mobile/src/data/auth/transport.ts | GoTrue HTTP, validated public key/origin, sanitized errors/timeout/Retry-After | GM-25 |
| mobile/src/data/auth/storage.ts | Một SecureStore entry; encrypted native persistence, không plaintext fallback | GM-25/31 |
| mobile/src/data/auth/index.ts / README.md | createAuthenticatedApiClient composition và ví dụ cho consumer | GM-25/31 |
| mobile/src/data/api/client.ts | Optional authSession injection; business RPC lấy fresh token và drop stale auth generation | GM-25..31 |
| mobile/tests/unit/authSession.test.ts / authTransport.test.ts | Behavioral/error/security/race tests, synthetic ports | Reviewer |
| supabase/config.toml | Anonymous auth local enabled; email signup disabled; finite rate limits | GM-17/BE APIs |
| supabase/tests/auth.sql | 7 auth.uid/default-deny pgTAP assertions, transaction rollback | GM-17/reviewer |
| supabase/tests/http/GM-16.http | Auth requests/expected responses/placeholders; không token thật | Reviewer/GM-25 |
| scripts/gm16_auth_check.mjs | Actual auth adapter compiled in memory; loopback CLI guard; HTTP and optional SQL/429 assertions | Reviewer |
| supabase/tests/bruno/GM-16 / scripts/gm16_bruno_setup.mjs | Bruno10 requests/tests; ignored local public-key environment, runtime-only tokens | Owner/reviewer |
| docs/architecture/API_CONTRACT.md | GM-16.1 auth supplement; public DTO không đổi, GoTrue khác business RPC idempotency | GM-07/25/31 |

Không profile/room migration hoặc SQL phát token. GoTrue owns auth.users/session;
id/isGuest của SessionUser từ server user response, không metadata userId. Bảng
private schemaGM-06 giữ default deny; quyền nghiệp vụ/retention ở GM-17.

## Chạy lại từ clone sạch

Node>=22.13, npm, Python có timezone data. Tại root:

```powershell
cd mobile
npm ci --no-audit --no-fund
npm run check
npm run check:expo
npm run bundle:android
cd ..
npm ci --no-audit --no-fund
npm run backend:start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gm16_rate_limit_setup.ps1
node scripts/gm16_auth_check.mjs --sql --rate-limit
node scripts/gm16_bruno_setup.mjs
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

Backend command chỉ khi đúng local project/Docker Linux engine đã sẵn sàng.
Không reset database/volume để chạy checks. CLI start chỉ áp migration còn thiếu;
nếu local đã có draft0001 khác revision phải dùng môi trường disposable được
review. Runner reads public key vào memory, không dump CLI status hoặc tokens.
Rate-limit setup chỉ thay Auth container local, giữ database volume; probe sẽ
throttle local test IP qua trusted Kong header. SQL rollback không thay HTTP auth.
Bruno: Open Collection → supabase/tests/bruno/GM-16, environment Local.private,
Run Collection tuần tự1 iteration. Không export raw response chứa token.
Nếu database đang chạy chưa có schema, kiểm migration list --local rồi áp dụng
migration up --local; ngày2026-10-12 đã áp0001/0002/0003 upstream mà không reset.

## Consumer boundary

GM-25 lấy `{session,client}` từ createAuthenticatedApiClient với config HTTPS/
public key và clearPrivateData callback từ repositories. Restore bằng
`session.restoreSession()` lúc khởi động, không tự tạo guest khi restore fail.
Guest creation là intent rõ; có persisted session thì creation bị từ chối.
Public SessionResponse giữ access token để tương thích GM-07, consumer không
persist/log nó. Refresh token chỉ auth adapter/SecureStore.

GM-31 clear tất cả private draft/cache/outbox khi callback chạy, không replay
identity cũ. Callback failure chặn identity switch đến logout cleanup thành công.
GM-17 dùng auth.uid()/membership trên server; client displayName/metadata không
là quyền. Native AppState/background refresh wiring và màn UI thuộc tích hợp.

## Kết quả / review còn lại

68 adapter tests Pass; full mobile9 suites/356 tests, typecheck/lint/architecture
Pass (4 warnings nền). Cold shell timeout được giữ report riêng; rerun không
tăng timeout đạt. Python bundled524 tests Pass toàn bộ sau khi sửa khóa taxonomy
Windows bằng msvcrt và probe cp1252 decode byte trực tiếp. In-memory
validator fixture chuẩn hóa mọi task để không kế thừa status thực từ Project.
Expo dependency check + Android bundle Pass. Ngày2026-10-12 Docker29.4.3 và
Supabase local đã chạy: HTTP runner8 cases + bounded real HTTP429 Pass, SQL7
assertions Pass, Bruno4.2.1 desktop10/10 requests/tests Pass. Xem
HTTP_CHECK.txt/RATE_LIMIT_CHECK.txt/BRUNO_CHECK.md. GoTrue error_code thực tế
đã được xử lý, có5 regression cases bổ sung. Expiry thực và native secure
persistence/restart chưa chạy.

Trước merge: fetch target mới, kiểm gate merge, phối hợp shared config/client/spec
bổ sung với producers GM-03/07 và review hash revision thật; upstream files có
thay đổi có thể làm fingerprint gate chặn trên target cũ. Không bypass checker
bằng local approval. Không được nhận handoff này như dependency Done khi còn
Not run/Fail. Tâm kiểm độc lập, Trí quyết định nghiệm thu/Project Done sau đủ AC.

Rollback code: bỏ composition auth và package/config supplement trước tích hợp;
không sửa0001/drop auth.users hoặc xóa Docker volume. Khi đã dùng thật, không
xóa secure entry trừ logout rõ ràng; guest mất token không có recovery trong P0.
