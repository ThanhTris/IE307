# GM-15 — kiểm bổ sung review PR #101

Owner Vinh; reviewer đề xuất Trung trong repo, Trí review cuối theo comment. Review/assignment/contract Pending.
Main d9e83d9; parent d428a80 (GM-04.2/core1.1.0). Engine decision-v2/1.0.0.
Tested revision/hashes trong domain-case-results.json; report working tree có HEAD cũ nhưng hashes đúng bộ source đã chạy. Feature revision sẽ pin sau commit.
Mac Node24.15.0, Python3.12.14/pandas/lxml hiện có; npm ci khôi phục đúng lockfile nền, không thêm dependency/config.

## Chạy lại

Từ root:
1. node --test mobile/tests/decision.test.mjs
2. node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json
3. python3 -X utf8 -m unittest discover -s tests -p 'test_*.py'
4. python3 scripts/validate_repository.py
5. python3 scripts/task_readiness.py --check-docs
6. python3 scripts/task_readiness.py --task GM-15 --gate merge --base-ref origin/main
7. git diff --check

Từ mobile sau npm ci: npm run typecheck; npm run lint; npm test -- --watchman=false; npm run check:architecture.
npm run check ban đầu: typecheck/lint Pass, Jest Fail do sandbox Watchman fchmod ngoài workspace. Jest chạy lại với flag --watchman=false:6/6 Pass; architecture Pass. Không sửa config/cấp quyền Watchman hoặc ghi aggregate cũ Pass.

## Input → expected → actual

[Actual](domain-case-results.json):87 evaluator vectors (53 golden+28 roster+6 legacy) và7 tier helpers,94/94 Pass. Full vectors so toàn output; legacy6 so status/candidateIds theo parity map,7 helper so tier. Expected tĩnh độc lập, không sinh bằng engine. Mỗi evaluator kiểm repeat/permutation/frozen input/unchanged; cùng revision/runtime sinh report hai lượt byte-identical.
| Kiểm | Input / expected | Actual / assertion | Kết quả |
| --- | --- | --- | --- |
| WANT unanimous | unanimous/multiple-unanimous/roster-n-unanimous | DECISION_READY exact M,UNANIMOUS_WANT/PERFECT | Pass |
| NO/fallback | empty-intersection/fallback-veto | EMPTY_INTERSECTION hoặc ROUND_2 đúng A không NO | Pass |
| Thiếu/UNSET | missing-member/dish,unset-round1/2,roster-n-unset | WAITING,không default OK/KEEP | Pass |
| Một món | single-fallback/single-confirmed/round2-not-submitted | Thiếu ACK vẫn WAITING,vẫn xác nhận vòng2 | Pass |
| REMOVE | all-removed/removed-high-score/roster-n-all-removed | ALL_REMOVED hoặc exact survivors,không REMOVE trong candidates | Pass |
| Hai vòng | third-round/round2-vetoed-dish/round2-after-unanimous/empty | INVALID_INPUT,không vòng3/thêm lựa chọn | Pass |
| Tie/tier | tie/even-half/majority/odd/all-ok/roster-n-tie và7 helpers | Exact max-score set và tier theo ngưỡng | Pass candidate-only |
| Roster2–8 |28 explicit inputs,4 case mỗi size | WANT/UNSET/KEEP/REMOVE/allOK tie mỗi size | Pass |
| Formula/exhaustive |81 matrices vòng1, mọi KEEP/REMOVE trên A; helpers2–8 | Veto/max-W,2W+OK=n+W | Pass |
| Input sai | UUID-like/duplicate/unknown ID/enum/round/policy/null/array/prototype/escaped paths | INVALID_INPUT exact issues và own-key | Pass |
| Pure/repeat/order | frozen/reversed input,forbidden RNG/clock/log | Same evaluation,no mutation/side effects | Pass,không backend retry |
| Node suite | suite riêng .mjs |104/104 tests,0 skipped | Pass Mac |
| Reporter |87 evaluator+7 helpers |94/94 assertions,repeat same bytes | Pass Mac |
| Strict typecheck/lint | GM-02 tsc/ESLint |Pass | Pass Mac |
| Foundation Jest/architecture | --watchman=false/static guard |6/6 Jest,architecture OK | Pass Mac,không native smoke |
| Python/repo/index/diff | Parent GM-04 mới + engine supplements |435 regression OK/0 skipped,repo/index/diff Pass | Pass |
| Upstream gate | GM-04 proposal/GM-07 DTO absent |BLOCKED GM-04/07 | Chờ review |
| Seed/winner AC | Main/issue yêu cầu seed→winner; evaluator trả candidateIds |Selector chưa triển khai theo boundary owner | Chưa đáp ứng AC,review proposal |

## CI và boundary

[CI riêng](../../../../.github/workflows/decision.yml) chạy Node24 suite/report và upload decision-domain-actual. Jest GM-02 chỉ nhận .test.ts/.test.tsx; không suy Jest Pass rằng .mjs đã chạy. Foundation CI vẫn typecheck/lint/Jest/architecture; package/lock/config giữ nguyên.
[Mapping](CONTRACT_MAPPING.md) ghi field/version/parent và gap seed/winner. [Parity map](../../../../tests/fixtures/decision-v2/parity-map.json) bàn giao từng ID/projection cho SQL. SQL parity/auth/transaction/concurrency/expiry/terminal/persisted retry: Not run, GM-20 nhận fixtures. Không cần API/Postman/native task sau để test domain, không claim các phần đó.
GM-07 DTO chưa bàn giao/Approved nên adapter cross-contract integration Not run. Candidate/ties/matrix/score internal, không public. Repeat pure function không chứng minh seeded uniform winner hoặc persisted retry. Không tự đổi AC/Approved/Done/merge.
 [Patch plan](PATCH_TEST_PLAN.md) · [HANDOFF](HANDOFF.md)

Retarget cuối: PR #62 merged d9e83d9c091b4487f7188bdfb7906e8f950db378. Engine rebase5 commits, no conflict, PR #101 base main; gate vẫn BLOCKED do metadata GM-04/07, không coi merge là Decision Approved. Post-rebase actual report/source revision trong domain-case-results.json.
