# GM-20 — bàn giao submit và finalize

Owner Vinh, reviewer Trí. Owner yêu cầu commit/push và mở PR ngày2026-10-15,
sau fetch/kiểm main. Chưa Approved/Done; Trí review revision PR.
Baseline nhận `origin/main`/HEAD `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`;
branch `codex/gm-20-vote-finalize`. Source hashes và kết quả cuối ở CHECKS/manifest.
Migration0023/schema0.5.0 chạy sau GM-22/0022 trên main mới.
Project start/merge dependencies đã kiểm live, không dùng local approval thay gate.

## Artifact / version

- `supabase/migrations/0023_finalize.sql`: contract GM-20.3, schema0.5.0,
  private evaluator/selector decision-v2 1.0.0, transactional submit/finalize.
- [Storage supplement](CONTRACT_STORAGE.md): wire→UUID, request/intent hash,
  pinned pools/snapshot, seed, consent writer/group key, neutral events.
- `supabase/tests/finalize.sql`: pgTAP boundary + seed vector.
- `scripts/gm20_http_check.mjs` + `gm20_http_fixture.py`: static expected parity,
  real guest JWT/PostgREST/client GM-07, concurrency, fault injection, owned cleanup.
- `supabase/tests/http/GM-20.http`, [Bruno](../../../../supabase/tests/bruno/GM-20/README.md).

Dùng đúng code/contract GM-06/07/15/19 trên target. Không nhận helper GM-21/23
chưa merge. `public.submit_ballot` là RPC duy nhất để gửi hai vòng; finalize private.
Không UI/RPC host-finalize, package/config/lockfile/SQL seed promotion hay deployment.

## Chạy / kiểm

```sh
npm ci
node scripts/backend.mjs start
node scripts/gm20_http_check.mjs
# Nếu Python mặc định thiếu libs, dùng runtime đã có, không cài thêm:
# GM20_PYTHON=/path/to/python node scripts/gm20_http_check.mjs
node scripts/gm20_http_check.mjs --bruno
node scripts/gm20_http_check.mjs --against
# Regression nguyên assertions GM19 trên fixture đang giữ:
node scripts/gm20_gm19_regression.mjs
# Reset DB disposable sở hữu sau regression, rồi kiểm lại GM20:
node scripts/gm20_http_check.mjs --against --reset
node scripts/gm20_http_stop.mjs
```

Node24, Python pandas/lxml, Docker, Supabase CLI2.120.0. Runtime status/keys chỉ
ở RAM hoặc ignored0600 files. Runner xác minh config local/guest namespace/DB marker;
không reset DB ứng dụng. Tạo DB `gm08_check_<namespace-prefix>` và PostgREST owned,
gateway loopback54332. Stop/Ctrl+C dọn owned DB/container/tagged identities;
Supabase nền vẫn chạy. Reset Bruno tạo phòng mới, không đụng fixture khác.
Không dùng `backend:reset` hoặc promote catalogue draft để có test positive data.

## Kết quả / AC

Đối chiếu [CHECKS](CHECKS.md), `http-results-final.json`, `regression-gm19/http-results-final.json`, `parity.json`,
`sql-run.txt`; expected parity giữ nguyên GM-15, không sinh từ SQL engine.
HTTP cases dùng DB disposable và JWT thật, client/guard GM-07 thật.
Runner0case/failure không là evidence Pass. Revision dirty được xác định bằng
baseline + manifest/checksum; không mô tả đây là commit đã review.

## Consumer handoff

[Ma trận case bàn giao](MOBILE_HANDOFF.md) ghi request/status và expected UI chưa kiểm Android.

| Task | Nhận từ GM-20 | Phần consumer còn kiểm |
| --- | --- | --- |
| GM-21 | Writer scoped consent/TTL30days và canonical group key trong supplement | settings/grant/revoke/delete API, retained projection/ACL, app history |
| GM-23 | Neutral ROOM_RESULT_READY refs + per-recipient inbox/TTL7days, dedupe | sender ngoài transaction, notification consent, delivery retry/push |
| GM-26 | submit exact current pool; WANT/OK/NO vs KEEP/REMOVE; receipt; errors | Android interaction/UNSET draft, stale feedback/auth/version UI |
| GM-27 | current/final round pool, progress, persisted result/tier/reason | Android round2/result/reconnect UI and app→API assertions |
| GM-31 | attempt replay vs semantic intent replay, accepted receipt, expired/stale, lost response | durable outbox/restart, account isolation/cache/reconcile, Android lifecycle |

Ma trận [mobile/API](../../../testing/MOBILE_API_TEST_MATRIX.md): producer SQL/HTTP
và mobile unit tests tách khỏi device. Chưa Android build/device/app→API→UI cho
submit/result. Endpoint54332 là loopback máy dev; điện thoại không truy cập localhost
máy tính. Consumer cần endpoint HTTPS test được cấu hình đúng Supabase/Auth/public
key placeholders theo transport GM-16, hoặc emulator host mapping nếu được harness
cho phép; không tắt TLS/trust checks hoặc đưa service_role vào app. UI/native build
và fixture endpoint mobile tiếp tục thuộc consumer, không dependency ngược GM-20.

## Giới hạn / review

Không deployment SQL production hoặc đo throughput. Foundation dùng global reference
lock; runner xác nhận consistency/races của local PG17, không claim performance SLO.
History có member flag nhưng không có actual scoped consent thì không ghi; không tự
cấp quyền. Result immutable/retry không đồng nghĩa nơi bán còn available; API
get_result_offerings GM-18 revalidates riêng. Không network/push trong transaction.
Bruno collection là walkthrough; server suite chứa thêm parity/races/fault/consent.
Trí vẫn cần review source revision, contract supplement, từng AC và merge gate mới.

## Trạng thái kiểm

Xem CHECKS và manifest cho các lượt đã chạy trên main mới, kết quả reset/regression
và cleanup. Kiểm trước PR ngày2026-10-15 xác nhận main vẫn c20f7c2, checksum
code/fixtures đã test không đổi. Owner đã cho phép commit/push/mở PR; chưa review.
Suite Bruno desktop/Android chưa chạy.

Local application DB kiểm chỉ đọc lúc2026-10-14T15:09Z vẫn có migrations0001..0019
và draft0020 từ lượt thử trước; chưa có0022/0023. Bản cuối chỉ được apply/kiểm trên
DB disposable. Không dùng DB nền này làm evidence bản cuối hoặc reset nó để sửa
lịch sử migration; nâng cấp môi trường ứng dụng cần plan riêng và giữ dữ liệu.

## Sửa review PR115 ngày2026-10-15

Theo [comment Trí](https://github.com/ThanhTris/IE307/pull/115#issuecomment-6182634572)
trên commit2c1b023, snapshot đã đổi sang max round persist, không suy từ state/result
hoặc poolVersion. Phiếu mới cũng kiểm cùng round persist để CANCELLED ở vòng2
trả ROOM_TERMINAL với version hiện hành; retry accepted vẫn trả ACK gốc.

Runner gọi entrypoint Node chính thức bằng process.execPath + cliArgs('status'),
không tự ghép tên cli-win32. Tests mới bao phủ hai ca hủy vòng2 và lobby có
poolVersion>1. Workflow `.github/workflows/gm20-cli.yml` launch CLI thật qua cùng
entrypoint trên Windows/macOS/Linux, không là kiểm SQL/HTTP trên ba hệ điều hành.
[Review fix evidence](review-fix-2026-10-15/README.md) ghi kết quả và CI revision.
Hai mobile CI đỏ ở check Expo được reviewer chấp nhận ngoại lệ cho lần review này;
không đổi package nền, không claim all checks passed hoặc tự Approved/Done.
