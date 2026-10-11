# GM-06 — Handoff engine decision-v2

2026-10-10 • Owner Vinh • Reviewer đề xuất Trung • Pending independent review.

Branch `codex/gm-06-decision-engine`, parent GM-03
`42a821c28144c0667839d485edf2b9462d463937`. Patch đang working tree, chưa commit,
push hoặc PR. Readiness trước code BLOCKED vì GM-03 backlog/chưa Approved.
Owner yêu cầu bản độc lập; không thay task/dependency/assignment approval.

## Artifact và contract

- [Patch/test plan](PATCH_TEST_PLAN.md): scope, quyền sửa và phần chưa kiểm.
- [Engine/contract](../../../../mobile/src/domain/decision/README.md): policy
  decision-v2, engine contract 1.0.0, TypeScript types và runtime validation.
- [Fixtures mô phỏng](../../../../tests/fixtures/decision-v2/README.md): 53 ca
  input/expected độc lập; giữ nguyên fixture lịch sử và dữ liệu GM-03.
- [Tests Node](../../../../mobile/tests/decision.test.mjs): 75 tests, gồm golden,
  6 decision/7 tier lịch sử, các assertions exhaustive/boundary/privacy/purity.

Engine chỉ trả candidate set nội bộ. DECISION_READY không là persist DECIDED.
Server phải kiểm auth/context/version/submission, chọn đều một lần, persist,
chống reroll và trả ACK/result cũ. WAITING không thêm RoomState; diagnostics/tie
set không được public. Chưa UI/network/SQL, không sửa tooling GM-02.

## Đối chiếu AC để Trung review

| AC | Evidence thuần | Giới hạn |
| --- | --- | --- |
| NO/REMOVE không winner; UNSET/thiếu member không finalize | Golden veto/incomplete/UNSET và exhaustive matrices | Engine trả tập ứng viên; backend chưa chọn/persist |
| 2W+OK/maxW tương đương; tier chẵn/lẻ/allOK | Fixtures spec, helper assertions 2–8 người, exhaustive tie/max WANT | Chưa SQL parity/typecheck |
| Hai vòng; một món vẫn xác nhận; tie set đúng | Single-fallback/confirmed, all-removed, ties, round=3/transition invalid | Terminal immutability và retry transaction thuộc backend |

AC vẫn chưa được reviewer đánh dấu đạt. DEC-01/02/06 và phần domain DEC-05/08 có
tests thuần; DEC-03/04/07 và RLS/privacy trên public RPC cần tích hợp thật.
Repeat evaluation ổn định không thay transaction/idempotency evidence.

## Kết quả kiểm tra

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Bundled Node v24.19.0, `--test --test-reporter=spec mobile/tests/decision.test.mjs` | 75 pass, 0 fail |
| Node mặc định v24.15.0, cùng lệnh tests | 75 pass, 0 fail; lệnh README chạy được |
| Bundled Python v3.12.14, `-m unittest discover -s tests -p 'test_*.py'` | 228 tests, OK |
| `python3 scripts/validate_repository.py` | Pass: documents/links/JSON/manifest/dependencies/FR traceability |
| `python3 scripts/task_readiness.py --check-docs` | Pass: task indexes match metadata |
| `git diff --check` | Pass |
| SHA-256 artifacts, whitespace 8 file mới, diff vùng GM-03/fixtures lịch sử | Pass; nguồn parent được bảo toàn |
| `python3 scripts/task_readiness.py --task GM-06` | BLOCKED: GM-03 backlog/chưa Approved; giữ nguyên gate |
| GM-02 typecheck/lint, SQL parity, native build, backend transaction/retry | Not run |

Node thực thi TypeScript bằng type stripping, không xác nhận strict typecheck.
75 tests gồm 53 golden cases, 6 decision/7 tier fixtures lịch sử và 9 tests nhóm
assertions khác. Các ca exhaustive kiểm 81 matrices vòng 1 và toàn bộ KEEP/REMOVE
trên A. Một lỗi thứ tự diagnostics được sửa trước lượt kiểm cuối; không thay
expected golden fixtures để che lỗi.

[Artifact checksums](ARTIFACTS.json) định danh engine/tests/fixtures của working
tree, không là commit hoặc approval. Tests/validator xanh không xác nhận nguồn
dữ liệu đã review, public RPC privacy hoặc server chọn/lưu đúng qua retry.

## Tiếp tục / tích hợp

Trung review revision thực tế, assignment và patch/contract; GM-01 review
food-v1, GM-03 review đúng data revision, GM-02 bootstrap/typecheck/lint/runner.
Backend dùng cùng fixtures để kiểm SQL parity, lock/finalize/idempotency và
projection public. Sau parent merge cập nhật nhánh và kiểm diff chỉ còn GM-06.
Trước merge fetch ref, chạy gate `--gate merge --base-ref origin/main`, đối chiếu
upstream task/evidence/PR/commit rồi integration tests. Không dùng draft mở gate.
