# GM-16 — Kế hoạch guest auth và session API

Ngày: 2026-10-11 (UTC+7). Trạng thái: implementation in progress, chưa Approved/Done.

## Phân công và nguồn hiện hành

- Owner: Trí / `ThanhTris`, theo xác nhận trực tiếp trong cuộc hội thoại và
  [issue #77](https://github.com/ThanhTris/IE307/issues/77) đã kiểm live.
- Reviewer độc lập: Tâm / `HoaiTam`, do chủ dự án chọn trực tiếp trong cuộc hội thoại.
- Issue hiện hành giao Trí; hạn trình nghiệm thu 2026-10-19, 18:00 UTC+7.
  Deadline không thay dependency gate/AC/review.
- File task trên main vẫn ghi owner Trung/proposed. Nhánh này đã đồng bộ owner
  Trí/reviewer Tâm, assignment accepted và status in-progress; sinh lại indexes/
  links, không ghi approval hoặc thay trạng thái Project.

## Baseline và đầu vào đã nhận

Nhánh: `codex/gm-16-guest-session`; target `main`.
Base: `9f71bba64b21c2b0795e1a80edbd93cb91a8f0ed` (merge PR #105).
Đã fetch lại origin/main và xác nhận HEAD = origin/main, ahead/behind 0/0.
Checkout main tại `C:/Code/IE307/Project` cũng cùng commit và sạch.

| Producer | Artifact | Contract / revision chứa artifact |
| --- | --- | --- |
| GM-03 | `supabase/config.toml`, local runner, HANDOFF | GM-03.1; commit sửa config gần nhất `0cf1dc0b247c717abce1bdd23fec8dba791835cc` |
| GM-06 | `supabase/migrations/0001_core_schema.sql`, mapping, HANDOFF | GM-06.1 / schema 0.1.0; commit sửa migration gần nhất `68d62f9988e32caa52ca283436edf2a12ee9f3c5` |
| GM-07 | `mobile/src/data/api/`, runtime guards, tests, HANDOFF | GM-07.1; follow-up đã nhận qua merge PR #105; dùng toàn bộ code ở base trên |

Lệnh `python scripts/task_readiness.py --task GM-16` thực thi thành công với
credential hiện có: `READY_TO_CLAIM`, snapshot live
`2026-10-11T15:41:58.602216+00:00`, không cache/fallback local.
Output owner Trung/reviewer Trí là metadata cũ, không thay phân công hiện hành.
Gate đạt về dependency/artifact; chưa xác nhận assignment/reviewer hoặc AC task.

## Phạm vi và contract

Contract task: `food-v1/roadmap-v2/GM-16.1`; schema đầu vào 0.1.0.
Thực hiện guest creation, restore/refresh/expiry/lost session/logout, caller
identity, secure token storage, private-cache cleanup và lỗi cho UI.
Không triển khai màn Home/login, account linking/recovery P1, room API, SQLite
outbox GM-31 hoặc access matrix/retention toàn hệ thống GM-17.

GM-07 có createGuestSession/restoreSession/logout nhưng đang gọi tên RPC
scaffold; không có RPC mint token thật. SessionResponse có access token và
expiresAt, chưa có refresh-token lifecycle. GoTrue là nơi phát/xác minh token;
SQL không tự phát JWT hoặc tin userId do client gửi.

Trước sửa code, chốt bổ sung trong API_CONTRACT và auth-specific types:

- Public ApiClient giữ DTO/error envelope và runtime validation hiện có.
  Không đưa refresh token vào snapshot, business RPC hoặc UI/log.
- Auth adapter sử dụng GoTrue signup/user/token/logout. Auth-specific transport
  hoặc injection vào client ánh xạ scaffold hiện có; business RPC tiếp tục dùng
  transport GM-07. Chốt một cách sau kiểm tests và đánh dấu supplement GM-16.1.
- Persisted session nội bộ gồm accessToken, refreshToken, expiry và identity
  đã xác minh; adapter refresh tách khỏi public SessionResponse nếu không cần
  đổi interface UI. Nếu đổi public interface, cập nhật mock/guards/consumer
  tests và version supplement, không tự thay GM-07 contract đã bàn giao.
- Nếu cần profile, migration mới cung cấp RPC đọc/khởi tạo profile chính caller
  theo mapping GM-06, dùng auth.uid(), fixed search_path, qualified tables,
  explicit revoke/grant. Không sửa migration 0001 hoặc mở quyền bảng private khác.
- Auth error chỉ trả mã chuẩn AUTH_REQUIRED/INVALID_INPUT/RATE_LIMITED/
  NETWORK_ERROR/TIMEOUT/MALFORMED_RESPONSE/UNKNOWN_ERROR; không raw error/token.

## Dependency cần reviewer chốt

Chủ dự án chọn Tâm kiểm độc lập và cho phép `expo-secure-store` trực tiếp ngày
2026-10-11. Đã pin package57.0.4 theo bundledNativeModules của Expo SDK57; cập nhật
package/lockfile và backup config. Đây không là approval implementation/AC.
Token không lưu AsyncStorage/SQLite/file plaintext.
Ưu tiên auth HTTP adapter theo transport injection đang có để không thêm SDK
Supabase/polyfill chỉ cho task này. Reviewer kiểm tradeoff trước code.

SecureStore wrapper có failure handling; không fallback plaintext khi native
module/storage lỗi. Kiểm config Android backup và Expo Go compatibility theo
version thực tế. Shell không tự khởi tạo auth/gọi mạng hoặc crash vì module mới.

## Patch theo thứ tự

1. Xác nhận reviewer độc lập và dependency; cập nhật phân công local đúng issue,
   chốt supplement auth/error/types và migration number theo quy ước GM-06.
2. Cấu hình anonymous auth chỉ local trong config GM-03, giữ rate limit hữu hạn.
   Kiểm phiên bản CLI/GoTrue thực tế; không deploy/link remote hoặc reset data.
3. Thêm auth HTTP adapter và `mobile/src/data/auth/session.ts`: secure persistence,
   startup restore, refresh trước expiry, single-flight refresh, serialized
   lifecycle operations, cancel/generation guard để response cũ không khôi phục
   session sau logout/auth change. Client userId không là căn cứ quyền.
4. Logout/auth loss: chặn request/replay private, clear token trong memory và
   secure storage, gọi private-cache cleanup port. Cleanup thất bại phải báo lỗi
   và giữ trạng thái chặn chuyển identity. Remote logout lỗi vẫn xóa local;
   báo rõ revoke chưa xác nhận. Không hứa JWT cũ vô hiệu ngay khi chưa hết hạn.
5. Failure/retry: timeout hữu hạn, backoff có giới hạn/jitter, respect Retry-After;
   không retry validation/auth rejection. Không blind retry anonymous signup
   khi chưa biết server tạo user hay chưa; không áp idempotency RPC vào GoTrue
   signup. Refresh không tạo song song, kiểm token rotation/reuse với GoTrue thật.
6. Migration auth/profile nếu cần, SQL test `supabase/tests/auth.sql`, HTTP suite
   `supabase/tests/http/GM-16.http`, integration runner local và adapter tests.
7. Chạy checks, đối chiếu input/expected/actual, hash revision; viết CHECKS/HANDOFF.
   Trình reviewer revision thật; không tự commit/push/Approved/Done.

## Ma trận nghiệm thu

| Case | Công cụ / assertions bắt buộc |
| --- | --- |
| Guest create | HTTP local: user thực trong auth.users, is_anonymous, token/expiry hợp lệ; profile caller nếu áp dụng |
| Restart restore | Session adapter + Android: cùng identity sau restart, token chỉ trong secure store; verify server user |
| Refresh/expiry | HTTP GoTrue + adapter: cùng user, token rotation, concurrency chỉ một refresh; expired token bị từ chối |
| Lost/revoked/corrupt session | Clear private data và state lỗi; không ngầm tạo identity mới khi restore fail |
| Transient network/timeout | Giữ session/draft phù hợp; retry bounded, không thêm guest sau unknown delivery; không response cũ resurrect |
| Rate limit | HTTP 429 thật từ local config hữu hạn + adapter Retry-After; không thay bằng fixture rồi ghi API Pass |
| Spoof | Auth A + userId/metadata giả B không đổi caller/quyền; thiếu JWT/forged JWT bị từ chối |
| Logout | Remote revoke/refresh reject, memory/secure storage/cache cleanup; logout offline/storage failure/concurrent refresh |
| Secrets | Request/result logs đã redact; không token/service_role trong source, report, SQL profile, bundle hoặc cache |
| Isolation | A logout -> B không đọc/replay private cache A; dùng cleanup port contract, không claim SQLite chưa triển khai |
| Scope/regression | Client/mock GM-07 giữ guards/errors/explicit real mode, shell chạy; không kéo P1/màn vào auth |

HTTP suite dùng URL/key/token placeholder; runner đọc credential local vào memory
và chỉ in assertions đã redact. Synthetic identities không là dữ liệu người dùng.
Setup/cleanup chỉ đúng local project; không stop/reset project khác. Không giảm
rate limit project đang có người dùng chỉ để test; dùng môi trường test cô lập.
SQL runner phải có assertions >0 và quyền auth thật; setting JWT claims trong SQL
không thay HTTP test xác minh JWT. HTTP không thay evidence secure storage native.

## Checks và bàn giao

Sau code chạy mobile typecheck/lint/tests/architecture, Expo dependency check,
Android bundle/smoke đúng scope; backend auth HTTP và SQL suites; repo validator,
Python regression, indexes/diff. Dùng runtime Windows thực tế, ghi rõ các baseline
failures đã biết của GM-07 nếu còn; không ghi full regression Pass khi có Fail.

```text
python scripts/task_readiness.py --task GM-16
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

Sau thay metadata chạy `--write-docs` rồi `--check-docs`. Trước merge fetch lại
origin/main và chạy `--task GM-16 --gate merge --base-ref origin/main`, kiểm
upstream commits/artifact không drift và integration trên revision cuối.

CHECKS ghi từng AC Pass/Fail/Not run, request/status/body đã che token, runtime,
schema/contract/device/tested hash. HANDOFF ghi cách chạy từ clone sạch, gọi
auth adapter, token/cache boundary cho GM-17/19/22/25 và task nhận tiếp.
Thiếu Docker/Android/reviewer hoặc package chưa review phải ghi blocker cụ thể;
không dùng mock/docs validator để đóng AC API/secure storage.

## Tài liệu kỹ thuật đã đối chiếu

- [Anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous): guest
  có identity thật và role authenticated; không lấy anon key làm user identity.
- [Session lifecycle](https://supabase.com/docs/guides/auth/sessions): access
  token và refresh token; xác minh giới hạn signout/expiry khi nghiệm thu.
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) và
  [local CLI config](https://supabase.com/docs/guides/local-development/cli/config).
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/):
  đối chiếu lại SDK 57/package pin và backup/native behavior trước dependency review.

## Trạng thái hiện tại

Plan đã lập; dependency start gate đạt live. Đã triển khai SessionManager,
AuthHttpTransport, SecureStore adapter và ApiClient injection, giữ public DTO
GM-07. Không thêm migration/profile RPC: GoTrue user endpoint xác minh identity;
profile/room tables giữ default deny. SQL auth.sql kiểm auth.uid/default deny,
không phát JWT. Đã có HTTP/SQL runner, HTTP examples và adapter tests.
Ngày2026-10-12 Docker local đã chạy; áp dụng migrations0001..0003 có sẵn trên
main bằng migration up --local, không reset. HTTP8 cases/SQL7 assertions Pass;
Bruno desktop4.2.1 collection10/10 requests/tests Pass. Bổ sung setup environment
gitignored và regression cho GoTrue error_code thực. Native Android secure
persistence và real rate429/expiry chưa chạy. Xem CHECKS/HANDOFF/BRUNO_CHECK.

Kiểm plan: repository validator và `--check-docs` Pass; `git diff --check`
không lỗi. Regression Python 3.14: 516 tests, 172 failures, 37 errors, 6 skipped.
Runtime thiếu `tzdata`/`Asia/Ho_Chi_Minh`, gây nhiều lỗi timezone và assertions
liên quan; chưa phân loại toàn bộ lỗi còn lại, không ghi suite Pass. Trước
implementation dùng runtime đủ timezone data và đối chiếu baseline trên cùng
runtime. Chưa thêm package môi trường hoặc sửa code để che lỗi.
