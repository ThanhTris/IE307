Current versioned canonical writer results are in
[GM20.4 CHECKS](canonical-writer/CHECKS.md). Historical results below do not claim
this new supplement or consumer/native integration passed.

# GM-20 — kết quả kiểm patch

Owner Vinh, reviewer Trí. Contract `food-v1/roadmap-v2/GM-20.3`, schema `0.5.0`,
policy `decision-v2`, evaluator/selector `1.0.0`.
Branch `codex/gm-20-vote-finalize`, HEAD/base
`c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`; tests được ghi trước commit.
[Manifest](manifest.json) chốt checksum source và reports; không phải approval.

macOS arm64, Node24.15.0, Python3.12.14 bundled, Docker29.1.3,
Supabase CLI2.120.0, PG17.11.0.004/PostgREST16.4/GoTrue2.197.0.
Chỉ DB disposable có marker/namespace, JWT GoTrue guest thật và dữ liệu mô phỏng;
actualDataPromoted=false. Không reset DB ứng dụng hoặc thêm package/lockfile.

Start gate live Project đạt READY_TO_CLAIM lúc2026-10-14T12:36:49Z trên ad68526.
Sau fetch và fast-forward lên main c20f7c2, merge gate đạt READY_FOR_MERGE_REVIEW;
[readiness](readiness.txt) ghi lần cuối. Checker không đổi Project/approval, không
thay review của Trí. Ref đã fetch trong lượt này; trước merge phải fetch/kiểm lại.

## Kết quả thực thi

| Kiểm | Kết quả / bằng chứng |
| --- | --- |
| SQL/domain parity | Pass140 vectors evaluator/roster/seeded, expected giữ nguyên GM-15; [input–expected–actual](parity.json) |
| SQL boundary | Pass11 pgTAP, gồm registry GM-22/schema0.4.0 không bị ghi đè; [output](sql-run.txt) |
| HTTP GM-20 | Pass22 nhóm trên main mới qua client/guards GM-07; [report cuối](http-results-final.json) |
| Reset owned / rerun | Pass22 nhóm và parity sau `--against --reset`; DB tạo lại đầy đủ migrations, không signup thêm hoặc đụng DB nền |
| Regression GM-19 | Pass32 HTTP +15 pgTAP trên nền GM-20/GM-22; [report](regression-gm19/http-results-final.json), [SQL](regression-gm19/sql-run.txt), [adapter](regression-gm19/adapter.json) |
| Domain | Pass169 tests, Node24 node:test |
| Backend/runtime/CLI runner | Pass20 tests, node:test, gồm CLI native macOS |
| Python regression | Pass550 tests bằng Python3.12.14, 32.634s |
| Mobile typecheck | Pass `tsc --noEmit` |
| Mobile lint | Pass0 errors,4 warnings có sẵn ở contracts.ts/index.ts |
| Mobile Jest | Pass11 suites/382 tests, `--watchman=false` |
| Architecture | Pass guard hiện hành |
| Repository / task indexes / diff | Pass validator, `--check-docs`, `git diff --check`; không thay review/runtime checks |
| Cleanup / runtime | Pass DB0, tagged guests0, REST0, private files0; [cleanup](cleanup.json), [runtime](runtime-cleanup.json) |

HTTP report giữ summary assertion đã che dữ liệu; input/request và expected chi tiết
ở runner/Bruno/GM-20.http, parity dùng fixtureOnly=true. Không log raw votes/token.
Lượt review fix ngày15/10 chạy trực tiếp đủ11 assertions SQL và22 nhóm HTTP,
bao gồm ca cancel vòng2; report cuối ghi source hashes. Lượt ngày14/10 từng retest
thêm assertion11 sau suite10. Không sửa actual cũ thành kết quả chưa chạy.

## Đối chiếu acceptance criteria

| AC | Kết quả producer |
| --- | --- |
| Mobile coverage/handoff | Pass tài liệu [consumer matrix](MOBILE_HANDOFF.md); Android app→API→UI chưa chạy, thuộc GM-26/27/31 |
| ACK/intent/hash/version | Pass exact replay, opaque wire IDs, semantic replay với receipt khớp attempt, TTL ACK, reused/different intent, stale/expiry, một submission/member/round |
| Hai vòng/chốt một lần | Pass unanimous, NO, exact round2/new rows, một choice cần xác nhận, REMOVE/ALL_REMOVED, score/tier/persisted seed; không vòng3 |
| Atomicity/history/event | Pass lỗi sau result/history rollback toàn submit; consent absent/full/partial/revoked/expired/frozen snapshot; history đã xóa không hồi sinh; event/inbox refs tối thiểu |
| Parity/races/privacy | Pass140 vectors, roster2–8, duplicate/same-version/last-submit-cancel, response mất sau commit; host không đọc phiếu người khác/seed/ties |
| Bàn giao tái lập | Pass runner/owned reset-stop/.http/Bruno collection/supplement/source manifest; Trí chưa review revision này |

## Lệnh tái lập

```sh
# Runtime/dependencies từ lockfile hiện có; Supabase local đã chạy.
GM20_PYTHON=/path/to/python node scripts/gm20_http_check.mjs
GM20_PYTHON=/path/to/python node scripts/gm20_http_check.mjs --bruno
GM19_PYTHON=/path/to/python node scripts/gm20_gm19_regression.mjs
GM20_PYTHON=/path/to/python node scripts/gm20_http_check.mjs --against --reset
node scripts/gm20_http_stop.mjs
node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
node --test tests/backend-runner.test.mjs tests/gm19-runtime-files.test.mjs
python -m unittest discover -s tests -p "test_*.py"
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile test -- --watchman=false
npm --prefix mobile run check:architecture
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

Regression wrapper đổi bootstrap namespace/endpoint/output, giữ nguyên toàn bộ
`tests()` và expected GM-19; checksum assertion trong adapter.json. Không sửa runner,
migration hoặc evidence upstream. Reset sau regression chỉ DB/REST do phiên này sở hữu.

## Giới hạn và lịch sử kiểm

Bruno desktop collection chưa chạy trong UI;9 requests được bàn giao để reviewer
walkthrough. HTTP tự động đã chạy thực tế, không gọi đó là Bruno desktop Pass.
Android/native/outbox, sender/push, deployment/production performance chưa chạy;
consumer scope trong HANDOFF không là dependency ngược. Chưa Approved/Done.

OneDrive từng gây ECANCELED/mmap và suite0case/Fail; owner đã phục hồi file local.
Đã đối chiếu13 checksum với backup, đọc lại source, materialize nguyên byte vài
file giữ handle cũ, fetch/fast-forward và chạy lại SQL/HTTP/regression/validator/diff.
Không dùng các lượt lỗi làm evidence Pass. Các lỗi fixture immutable ACK UPDATE,
generated auth column, consent trùng và quiet psql đã sửa trước các lượt đạt.
Guard immutable và business consent không bị nới. Watchman bị sandbox ở lần mặc định;
flag tái lập Jest không thay project config. Không coi type stripping là typecheck.

0020 draft đổi thành0023/schema0.5.0 vì main đã có0022/schema0.4.0. Registry GM-22
được giữ nguyên, upstream migrations không sửa. Tests chỉ apply bản cuối trên DB
disposable; không coi local application DB đã được nâng cấp/deploy bản cuối.

Ngày2026-10-15 owner yêu cầu commit/push/mở PR sau kiểm main. Fetch xác nhận
main vẫn c20f7c2, source/fixture hashes khớp bản SQL/HTTP đã kiểm. Không chạy lại
SQL/HTTP vì main và code nghiệp vụ không đổi; validator/index/diff và gate Project
được kiểm lại. Trí còn review contract/code/revision/AC, chưa tự nghiệm thu.

Local application DB kiểm chỉ đọc lúc2026-10-14T15:09Z vẫn có migrations0001..0019
và draft0020 từ lượt thử trước; chưa có0022/0023. Bản cuối chỉ được apply/kiểm trên
DB disposable. Không dùng DB nền này làm evidence bản cuối hoặc reset nó để sửa
lịch sử migration; nâng cấp môi trường ứng dụng cần plan riêng và giữ dữ liệu.

Trước PR ngày2026-10-15: Python regression chạy lại550 tests/52.885s, Pass.
[Pre-PR checks](pre-pr-checks.json) ghi ref đã fetch, gate live, checksum và các kiểm offline.

[Attempt setup thất bại ban đầu](regression-gm19/attempts/2026-10-14-setup-failure.json)
được giữ riêng để truy vết,0case/Fail do thiếu thư mục report; không tính vào lượt
regression cuối32groups/15pgTAP đã đạt.

## Review fix ngày2026-10-15 — input commit2c1b023

[Comment reviewer](https://github.com/ThanhTris/IE307/pull/115#issuecomment-6182634572)
yêu cầu giữ round2 sau cancel và sửa executable lookup trên Windows.
Chi tiết phạm vi/test ở [review evidence](review-fix-2026-10-15/README.md).

- Snapshot/new ballot guard dùng max persisted round, fallback1, không suy từ
  state/result/poolVersion. Hai cancel cases và lobby context bump được thêm vào
  suite, tăng19→22 groups; kiểm pinned rows/receipt/votes/progress và terminal.
- Dùng official Node entrypoint theo helper nền, giữ dependency/lockfile. macOS
  native CLI + backend/runtime tests20 Pass; Python550/40.323s, domain169 Pass.
- Regression GM1932 HTTP/15pgTAP Pass. GM20 parity140/pgTAP11 và22 HTTP groups
  được chạy trên DB disposable mới/reset; source hash phải khớp report cuối.
- Windows/Linux/macOS CLI workflow đã Pass native executable/version trên cả ba
  OS ở commit7622fad, xem [CI proof](review-fix-2026-10-15/cli-ci.json). Không gọi
  0 API case là API Pass hoặc coi test Mac là Windows.
- Không thay package Expo; hai job mobile compatibility đỏ đã được Trí chấp nhận
  ngoại lệ riêng ở comment. Không claim all checks passed hoặc reviewer approval.

Lượt review fix chốt sau reset:22 HTTP/140 parity/11 SQL Pass; GM1932/15 Pass,
cleanup DB0/guest0/REST0/private files0. Parent revision2c1b023 + dirty source hash
trong manifest xác định bản đã kiểm. CLI native ba OS đã Pass sau push; source
không đổi giữa commit7622fad được CI kiểm và commit bổ sung evidence này.
# Legacy consent compatibility regression — 2026-10-27

Migration 0031/schema 0.9.2 corrects account-default inheritance leaking into legacy room consent preparation. GM-20 history expectations remain unchanged: none/no snapshot 0, valid 3, partial/expired/revoked 1. The complete frozen GM-20 HTTP scenarios passed **22/22** on an ownership-verified disposable Auth+REST QA target. The local adapter preserves the `tests()` body byte-for-byte and only binds QA transport/evidence plus the existing GM-21 preference-before-ready fixture ordering. Delete/retry, rollback, races and privacy remain asserted. Evidence stays local under `review-results/ci-legacy-consent-fix-20261027/`; see GM-21 CHECKS/HANDOFF for the forward migration, worker pin and other regressions. Application DB deployment, remote CI and Android are not inferred from this local run.
