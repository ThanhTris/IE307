# GM-20 — patch/test plan

Owner Vinh, reviewer Trí. Contract `food-v1/roadmap-v2/GM-20.3`.
Owner yêu cầu triển khai plan ngày2026-10-14, chọn runner tự động + Bruno.
Scope triển khai ban đầu chưa commit/push/PR. Ngày2026-10-15 owner đã yêu cầu
kiểm main rồi commit/push và mở PR vào main với Closes #81. Không tự Approved/Done.

## Trạng thái chuẩn bị

Đã fetch `origin/main` và tạo branch `codex/gm-20-vote-finalize`, ban đầu trên
`ad68526ae821232829525a668df62182e3df44ef`. Working tree ban đầu sạch; nhánh
GM-15 cũ và mọi cache/dataset giữ nguyên. Start checker đã chạy lại bằng credential có quyền đọc Project lúc2026-10-14T12:36:49Z
và đạt READY_TO_CLAIM trên đúng target. Không dùng board/cache/local để bypass.
Plan được owner giao triển khai; reviewer Trí còn kiểm revision/code/AC sau.


Main cập nhật `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6` đã được fast-forward
trên cùng branch, giữ patch chưa commit. GM-22 đã chiếm schema0.4.0; chuyển
migration draft0020 thành0023 và registry0.5.0 để nâng cấp sau0022. Không sửa
migration đã merge; đồng bộ path artifact cho downstream/indexes.

## Input nhận trên target

- GM-06: schema0001, typed mappings và supplemental reference identities ADR015.
- GM-07: DTO/client/guards hiện hành; submit payload và canonical decision result.
- GM-15: evaluator1.0.0, selector1.0.0, `u32-murmur3-rejection-v1`, static fixtures.
- GM-19: migration0019/lifecycle/pinned pool/private ACK/auth/version/lock helpers.
  HANDOFF và source manifest nhận từ target; hồ sơ approval lịch sử không được
  viết lại thành quyết định review hiện hành.

## Patch boundary

Thêm0023, không sửa migration đã merge. Giữ DTO GM-07; `submit_ballot` nhận
requestId, room_id, round, pool_version, intent_id, expected_version và votes.
Round2 dùng cùng endpoint. Finalize chỉ private, không public host finalize.

Private storage bổ sung cho original wire intent/request ID, accepted semantic
hash và canonical ACK của submission; seed/algorithm của result. Không thêm
seed vào API/client, không parse opaque rooms.poolSeed làm decision seed.
Các schema/tables/functions private revoke theo mẫu nền; fixed search_path,
caller từ auth.uid, qualified references và lock order reference_epoch→room.

Request hash bao gồm immutable attempt/version/body; ballot semantic hash sort
các row/vote pairs, scope room/caller/round/poolVersion, không dùng version/ID
attempt để tạo submission mới. Exact request ACK trước state/version/expiry;
request ID khác payload409; known intent/same semantic payload không ghi lại,
known intent/changed ballot409. Wire IDs được echo nguyên dạng; receipt của ACK
attempt khớp requestId envelope, ownSubmission giữ wire identity của accepted row.

Pool và roster từ server khóa; validate exact coverage/unique rows/correct round
values trước INSERT. Không UNSET/default KEEP/OK. Đợi đủ mọi member rồi SQL kernel
đối chiếu domain fixtures, chọn đúng M/A/S, score/tier, tối đa2vòng. Round2 copy
pinned cards sang row IDs mới, giữ choiceId, tăng poolVersion; không refetch food.

Dùng pgcrypto4bytes để tạo canonical8hex seed riêng lúc chốt winner, SQL unsigned
32bit arithmetic đúng selector và order UUID ASCII ổn định. Persist seed/result
cùng transaction. Phiếu/result/version/history/event/inbox atomic; exception phải
rollback mọi business row, không return failure với submission đã ghi dở.

History chỉ từ frozen snapshot và actual scoped consent enabled/not revoked/
not expired, grantedAt hợp lệ; thiếu consent không tự cấp quyền. Personal theo
owner, group chỉ đủ roster/consents, TTL<=30ngày và canonical groupKey bàn giao
GM-21; không gọi helper0021 chưa có trên target. Retry không ghi lại history đã
xóa. Không làm endpoint consent/delete hoặc thay user settings của GM-21.

Neutral event/inbox chỉ refs room/result/recipients, không votes/seed/ties/scores.
Push permission không suy từ inbox membership; sender/network là GM-23 sau commit.
Thay snapshot bằng forward migration: persisted result, final round đúng reason/
winner row, pinned winner card, current-round ownVotes/ownSubmission và progress.
Không room-state DECISION_SELECTED public hoặc serialize evaluator diagnostics.

## Test plan và fixture ownership

- Owned disposable PG/PostgREST với real GoTrue guests và synthetic positive food;
  tạo namespace/ownership marker và verify trước setup/reset/cleanup. Không reset
  app database, không promote source draft hoặc dùng service_role trên client.
- Pure SQL/domain parity: static evaluator/roster/seeded/tier fixtures; independent
  expected giữ nguyên. Không sinh expected từ SQL implementation.
- Real HTTP/GM07 client:2–8members, both rounds, receipt/snapshot/guard, same dish
  different variant/venue choice, wrong enum/duplicate/incomplete/UNSET/outsider/
  bad JWT/stale version-pool-round/expiry and no private data exposure.
- Concurrency: duplicate requests và intents, same-version two submissions,
  last-submit/cancel, lost response after commit then exact retry. Assert unique
  submission/result/seed/history/event/inbox và immutable result/version/time.
- Fault injection chỉ owned test DB: fail event/history write after result and
  assert whole submit/finalize rollback. Consent complete/partial/revoked/expired/
  absent; no history resurrection on ACK/reconcile after deletion.
- Bruno collection + GM20.http, automatic runner and keep/reset/stop modes. Use
  ignored runtime environment, safe diagnostic/no token/raw ballot logging,
  cleanup exactly owned resources even on failed run.
- GM19 regression, domain suites, mobile tsc/lint/Jest/architecture, full Python,
  repository validator/index check/diff. Commands/results/Not run recorded honestly.

## Evidence / downstream

CHECKS/HANDOFF + source hashes/base/head/schema/contract + actual sanitized
input/expected/actual/assertions. GM21 nhận history writer/group key; GM23 nhận
neutral event contract; GM26/27/31 nhận submit/round2/result/ACK/error/retry cases.
MOBILE_API_TEST_MATRIX: producer server checks riêng; Android app/API/UI, durable
outbox/restart và sender/native chưa thuộc kiểm nghiệm của GM20. Không package,
UI, deployment hoặc dependency ngược. Trí review revision và fresh merge gate;
AI không tự xác nhận nghiệm thu.

## Sửa theo review PR115 ngày2026-10-15

[Comment Trí](https://github.com/ThanhTris/IE307/pull/115#issuecomment-6182634572)
kiểm commit2c1b023 và owner yêu cầu sửa/push lại trong chat.

- Snapshot và kiểm round phiếu mới lấy max round đã persist trong locked rows,
  fallback1; không suy từ CANCELLED/result hoặc poolVersion.
- Thêm runtime cases hủy round2 trước phiếu và sau một KEEP, kiểm cả hai caller,
  exact pool row IDs, own receipt/votes/submission, hasSubmitted, replay và terminal
  từ chối phiếu mới. Thêm lobby poolVersion>1 vẫn round1.
- Runner dùng process.execPath + cliArgs('status') của nền; official Node entrypoint
  tự map Windows/Linux/macOS/arch. Không sửa package hoặc cài alias sai tên.
- Chạy lại SQL/HTTP và GM19 regression trên DB disposable, domain/Python/root checks.
  CI mới launch CLI executable thật trên Windows/macOS/Linux bằng Node24/npm ci.
  Không gọi đây là HTTP/SQL Windows hoặc Android Pass.
- Hai Expo compatibility jobs đỏ được reviewer chấp nhận riêng trong comment;
  giữ dependency và workflow nền, không claim all checks passed hoặc approval/Done.
