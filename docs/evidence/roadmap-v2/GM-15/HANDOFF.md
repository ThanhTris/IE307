# GM-15 — Tiếp nhận decision engine legacy GM-06 sau rebase

2026-10-10 • Owner Vinh • Reviewer đề xuất Trung • Review Pending.

## Branch / commit / version

Branch `codex/gm-06-decision-engine`, kế thừa data branch
`codex/gm-03-taxonomy-data-contract` tại `feb2810` (PR #62 còn mở).
Main fetch mới nhất: `4f154af714411e81351e7761ceca281b1436fa68`.
Commit engine trước rebase `49c8a4a`, sau replay `ee41bcd`.
Policy decision-v2, engine contract 1.0.0; không nhận đây là GM-07 API DTO đã review.

GM-06 roadmap-v1 → GM-15 roadmap-v2 ([mapping](../../../project/TASK_RENUMBERING.md)),
issue hiện hành #76. Branch vẫn giữ tên cũ theo yêu cầu owner. GM-06 hiện tại là
database schema của Tâm: giữ nguyên task/AC/dependencies của main. Không áp
approval hoặc số issue cũ sang scope mới.

## Input / output / expected

- [Engine contract legacy](../../../../mobile/src/domain/decision/README.md):
  roster/pool khóa tường minh, WANT/OK/NO, KEEP/REMOVE, runtime validation,
  hai vòng, veto/score/tier; chỉ candidate set nội bộ.
- [Fixtures](../../../../tests/fixtures/decision-v2/README.md): 53 golden cases
  mô phỏng, expected viết độc lập; 6 decision/7 tier fixtures lịch sử giữ nguyên.
- [Tests](../../../../mobile/tests/decision.test.mjs): Node 24 node:test;
  expected đủ phiếu, veto, một món xác nhận, tie, tier, malformed input,
  repeat/order/frozen input; không network/I/O/RNG/clock trong engine.
- [Evidence v1](../../roadmap-v1/GM-06/HANDOFF.md),
  [checksum v1](../../roadmap-v1/GM-06/ARTIFACTS.json),
  [task trước v2](../../roadmap-v1/GM-06/TASK_BEFORE_V2.json) giữ lịch sử trước rebase.
  Nội dung evidence v1 nói working tree/parent cũ là mô tả thời điểm đó.

Đầu vào formal GM-15: GM-04 dictionary và GM-07 contracts.ts chưa bàn giao ở path
chuẩn/được reviewer duyệt. Patch này bảo toàn bản draft owner đã yêu cầu; không
tự tạo shared DTO, scaffold, dependency hoặc mở start/merge gate.

## AC / boundary / known limits

Luật NO/REMOVE, UNSET, hai vòng, score, tier và candidate tie set có tests thuần.
**Owner chọn candidate-only**: DECISION_READY không là persisted DECIDED. Backend
GM-20 phải chọn đều một lần, lưu winner/resultId/tie set/version/finalizedAt,
kiểm retry/terminal/auth và projection public. Không public votes/count/score/
tie set; caller chỉ đưa submissions đã gửi/xác nhận, không draft KEEP.

AC roadmap-v2 GM-15 mới ghi tie theo seed/retry. Engine hiện không nhận seed và
không chọn winner; đó là khoảng lệch cần reviewer chốt với contract GM-07/GM-20,
không tự triển khai RNG trái lựa chọn owner. Chưa claim toàn bộ GM-15 Done hoặc
dùng Closes #76. Typecheck/lint GM-02, SQL parity/finalize, auth/race/terminal,
native build chưa chạy. Retry deterministic của hàm không thay idempotency RPC.

## Verification sau rebase

Sau rebase: Node v24.15.0 chạy `node --test mobile/tests/decision.test.mjs`,
75 pass/0 fail; bundled Python 3.12.14 chạy 239 regression tests, OK. Repository
validator, task indexes và `git diff --check` Pass. Manifest legacy có 5 artifact
SHA-256 còn khớp; parent data không đổi; task BE GM-03/database GM-06 bằng main.
[Check results](REBASE_CHECKS.json) ghi ref/version và các phần Not run.

Merge gate GM-15 trên origin/main `4f154af` và parent `feb2810` đều BLOCKED:
GM-04/GM-07 còn backlog/chưa Approved và input paths chưa đủ. Giữ nguyên gate.
Không đổi expected, engine code hoặc snapshot để vượt checks.

## Bàn giao / target

PR engine target nhánh data đã rebase để diff chỉ có engine, không lặp catalogue
PR #62. Sau parent merge vào main, rebase/update/retarget và chạy tests/gate lại.
Reviewer Trung kiểm phần thuần cùng gap seed/upstream; GM-20 nhận fixtures để
triển khai finalize/SQL parity. Task status/assignment/approval vẫn nguyên trạng.
Không merge main, không tự Approved/Done. Gate kiểm trên origin/main mới và trên
parent target thực tế, không suy CI xanh thay review.
