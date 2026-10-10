# GM-15 — bàn giao engine decision-v2 legacy GM-06

Owner Vinh; reviewer đề xuất Trung trong repo, Trí review cuối theo comment PR. Review Pending.
Branch codex/gm-06-decision-engine; PR #101 đã retarget main sau PR #62 merge.
Main d9e83d9; parent d428a80384d3dc238936d8a0311c4d4b1ee247f9. Engine1.0.0/policy decision-v2.
GM-06 hiện hành là DB schema của Tâm; engine legacy GM-06 → GM-15, không sửa task schema.

## Upstream / version

GM-04 proposal food-v1/roadmap-v2/GM-04.2, food shape1.1.0/core1.1.0 trên parentd428a80, feature8f90af5 đã nhận; review Trí Pending. GM-07 mobile/src/data/api/contracts.ts chưa bàn giao/Approved.
[Mapping](CONTRACT_MAPPING.md) chỉ rõ roster/pool/ACK/vote → input và internal output → server finalize. Đây là mapping draft, không DTO/adapter đã review.
Start/merge gate BLOCKED GM-04/07. Owner cho làm phần draft độc lập không là dependency Approved.

## Output / cách chạy

- [Engine](../../../../mobile/src/domain/decision/index.ts) và [contract](../../../../mobile/src/domain/decision/README.md): roster/pool khóa tường minh, WANT/OK/NO, KEEP/REMOVE, missing/UNSET chờ, score/tier/reason, hai vòng, candidate-only.
- [Fixtures](../../../../tests/fixtures/decision-v2/README.md):53 golden giữ byte +28 roster2–8, expected tĩnh độc lập. [Parity map](../../../../tests/fixtures/decision-v2/parity-map.json) kê IDs/projection và6 decision/7 tier legacy giữ nguyên.
- [Tests](../../../../mobile/tests/decision.test.mjs): node --test mobile/tests/decision.test.mjs (root,Node24) →104/104 Pass.
- [Reporter](../../../../mobile/scripts/check-decision.mjs): node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json →87 evaluator +7 helper,94/94 Pass. [Actual](domain-case-results.json) có input/expected/actual/assertions/runtime/revision/code hashes.
- [CI Node riêng](../../../../.github/workflows/decision.yml): chạy suite .mjs và reporter, upload artifact decision-domain-actual. Không dựa Jest để khám phá .mjs.
- [CHECKS](CHECKS.md) ghi commands/environments/Pass/Not run; [patch plan](PATCH_TEST_PLAN.md).

## Kết quả trên revision hiện hành

Mac Node24.15.0. npm ci khôi phục dependencies đã khóa; package/lock/config nền GM-02 giữ nguyên. npm run typecheck và npm run lint Pass; npm test -- --watchman=false →6/6 foundation tests; npm run check:architecture Pass.
npm run check ban đầu dừng ở Jest do sandbox Watchman fchmod. Chạy lại với flag CLI (không sửa config/quyền Watchman) Pass; không báo aggregate ban đầu Pass.
Bundled Python3.12.14/pandas/lxml:435 regression OK/0 skipped; repository/index/diff checks Pass. Node report sinh hai lượt cùng revision/runtime byte-identical, frozen input/repeat/permutation đều đạt.
Engine index.ts,53 golden và2 fixture lịch sử giữ nguyên byte. Docs/test suite/CI mới có diff rõ; không claim cả5 historical artifacts bất biến sau bổ sung này.
Code không thêm RNG/clock/log/network/database. No API/GPT/crawl or app dependency additions.

## AC còn chờ / boundary

Veto/UNSET/two rounds/score/tier/exact candidate set/purity có tests. Candidate-only chưa đạt AC mới input/seed → winner. Owner đã chọn candidate-only: proposal giữ evaluator thuần và để GM-20 chọn đều một lần dưới lock, persist winner/result/version, trả ACK/result cũ qua retry.
Trí cần chốt proposal đó hoặc selector có seed tại GM-15; chưa tự thêm RNG, đổi task/spec/AC hoặc ghi Done. No seed/winner selector implementation.
GM-20 nhận parity map/vectors; SQL parity/auth/transaction/concurrency/expiry/terminal/persisted retry Not run. Repeat evaluator không thay backend retry. Không cần API/Postman/native task sau để test domain.
Caller chỉ dùng ACK của hành động Gửi/xác nhận, không draft KEEP; internal output/candidate/ties/raw matrix/count/score không public. Projection/DTO GM-07/20 chưa review; cross-contract integration Not run.

## Rebase / review / rollback

Data PR #62 đã merge tại d9e83d9; PR #101 đã rebase lên origin/main và retarget main. Diff chỉ engine/fixtures/tests/evidence/CI, không lặp data. Không tự merge hoặc Approved/Done.
Đã rebase3 engine commits từ parentf5a8304 lên d428a80; không conflict, giữ main foundation và data snapshots. Feature/evidence revision mới được pin trong CHECKS/PR.
Evidence lần trước [REBASE_CHECKS](REBASE_CHECKS.json), [MAIN_SYNC](MAIN_SYNC_20261010.json) và [v1](../../roadmap-v1/GM-06/HANDOFF.md) là historical, không claim tests/typecheck mới từ những file cũ.
Rollback riêng engine commits, giữ parent data/catalogue nguyên trạng.

Retarget cuối: PR #62 merged d9e83d9c091b4487f7188bdfb7906e8f950db378. Engine rebase5 commits, no conflict, PR #101 base main; gate vẫn BLOCKED do metadata GM-04/07, không coi merge là Decision Approved. Post-rebase actual report/source revision trong domain-case-results.json.
