# GM-15 — CHECKS review fix 2026-10-11

Owner Vinh, review implementation Pending (Trí theo PR101). Base main **3076c3deb2937223a007b82211a61a2d61b63c84**. Task GM-15.2/policy decision-v2; evaluator1.0.0 + selector1.0.0 / u32-murmur3-rejection-v1. Tested sourceRevision và SHA256 ở [actual report mới](review-20261011/domain-case-results.json) và [verification](review-20261011/verification.json); code commit pin trong manifest, evidence-only commit sau không sửa source đã test. Historical domain-case-results.json/MAIN_RETARGET_20261010 giữ nguyên, không chuyển old outputs sang revision mới.

Mac Node24.15.0/npm11.12.1/Python bundled3.12.14 có pandas/lxml. Do root package.json và package-lock.json trên OneDrive dataless khiến npm chờ đọc, mobile/full Python/validator chạy **temporary worktree** /tmp/anyfood-gm15-check-20261011 với same rebased HEAD và bytes source/fixtures patch đồng nhất. Symlink existing locked mobile/node_modules, không cài package hoặc đổi lock/config; data snapshots giữ nguyên. Node reporter/suites chạy checkout chính. File flags skip-worktree tạm chỉ giúp rebase hai root files có cùng Git blob trên base/head; gỡ sau thao tác, không overwrite nội dung cloud files.

## Lệnh thật và kết quả

Từ root checkout chính (Node24):

```sh
node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json
python3 scripts/task_readiness.py --check-docs
git diff --check
```

Temporary worktree/root, bundled Python:

```sh
/Users/hoangvinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
```

Temporary worktree/mobile:

```sh
npm run typecheck
npm run lint
npm test -- --watchman=false
npm run check:architecture
```

| Kiểm | Input → expected → actual/assertion | Kết quả |
| --- | --- | --- |
| Core evaluator | 53golden+28roster+6legacy, 7tier helpers giữ expectations; NO/UNSET/REMOVE/2round/formula/invariants | 104 old Node tests vẫn Pass;153 reporter checks gồm supplement dưới |
| Seeded winner | 59 static vectors, trong đó28roster2–8; M/tie/highest-score/repeat/reversed/frozen | DECISION_SELECTED + exact winner/reason/tier;169/169 total Node tests,0 skipped |
| No early selection | WAITING/ROUND_2/INVALID/NO_CONSENSUS + invalid/missing seeds | không winnerId; không default OK/KEEP hoặc seed |
| Seed format/rejection | seed00000000/00000001/ffffffff/331da083, invalid uppercase/null/int/length; n3 drawffffffff reject | Static arithmetic winner vectors Pass; upper seed wrap handled |
| Veto/REMOVE | mapped beef/chicken choices, removed high-score +512seed sweep per case | winner không NO/REMOVE; one-choice nonunanimous vẫn mọi ACK vòng2 |
| Choice/DTO | accepted BallotVoteItem.roundDishId→row→choice; distinct same dish at2venues, round2 row mapping | no identity merge; selected fields only4keys; winnerDish từ đúng locked row/venue/price |
| Result convention | GM-07 actual mock scenarios + types/runtime guard canonical policy/reason/tier | decision-v2/PERFECT hoặc NO_CONSENSUS; reject food-v1/TIER_1/2/NONE/HIGHEST_SCORE và inconsistent winner;16 new Jest checks |
| Full mobile | tsc strict, ESLint, Jest --watchman=false, architecture | Pass;7 suites/282 tests;4 existing warnings,0 lint errors |
| Reporter |146 evaluator+selector vectors +7helpers; input/expected/actual/repeat/permutation/unchanged |153/153 Pass;2 outputs byte-identical cùng revision/runtime |
| Python regression | current main + patch, offline pandas/lxml pipeline |524 tests OK,0 skips; intentional negative notebook probe prints ERROR while suite OK |
| Repository/index/diff | links/contracts/task indexes/whitespace | Pass sau evidence files tồn tại |
| Gate dependency | script đọc fresh GitHub Project | BLOCKED_PROJECT_UNVERIFIED: credential thiếu read:project; không kết luận upstream chưa Done |

Lần đầu full Jest sau vocabulary patch có1 failure do old test còn expect reason NO_CONSENSUS. Đã đổi expected sang EMPTY_INTERSECTION theo DECISION_SPEC/schema, thêm tier/policy assertions; final full rerun282/282 Pass. Không chỉnh expectations seed từ implementation. `npm run check -- --watchman=false` ban đầu truyền flag tới command cuối nên Jest vẫn gặp Watchman fchmod ngoài sandbox; dùng lệnh Jest riêng bên trên Pass, không đổi package/config/timeout hoặc báo aggregate đó Pass. Tsc/lint/architecture chạy riêng Pass.

## Dependency / AC / giới hạn

Không còn GM-07 absent: main đã chứa DTO/client/mock từ PR104. Review comment Trí ngày11/10 báo ProjectGM-04/07 Done và checkerREADY_FOR_MERGE_REVIEW trên revision reviewer; local checker thiếu quyền Project, cần reviewer chạy lại trên head cuối. Checker authority đã đổi ADR011 trên main, không dùng repo metadata cũ để ghi dependencies BLOCKED.

Owner đã chốt **bổ sung selector theo seed, giữ AC**: domain input/seed→winner nay có implementation/vectors, không đổi AC thành N/A. Seed/algorithm và supplement canonical GM-07 vocabulary vẫn cần Trang/Trí review, không tự Approved/Done/merge.

No SQL parity/auth/RLS/transaction/last-submit-cancel race/immutable terminal/persisted ACK-result retry hoặc secure server entropy validation; thuộc GM-20. Không engine nào kiểm catalogue eligibility/giờ/coverage GM-18/19, không 190offering→pool mặc định. Mock còn UI simulation/self-confirm/scenario forcing, không multi-user RPC acceptance. Không native Android/Windows run hoặc API/GPT/crawl/package additions. Seeded deterministic tests không là chứng minh statistical uniform/security; backend supplies private entropy, persists once and must not accept client seed.

[HANDOFF](HANDOFF.md) · [Mapping](CONTRACT_MAPPING.md) · [Patch/test plan](PATCH_TEST_PLAN.md) · [ADR012](../../../architecture/decisions/ADR-012-seeded-domain-selection.md).
