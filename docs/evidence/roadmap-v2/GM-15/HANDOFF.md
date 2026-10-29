# Current supplement — GM15.3 / v4, 2026-10-29

[V4 handoff](v4/HANDOFF.md) and [checks](v4/CHECKS.md) describe the new pure domain,
independent fixtures and receiving SQL contract. V2/v3 behavior remains pinned.
The section below is historical evidence for the accepted v2 baseline, not current
Project status or the v4 implementation. No approval/Done is written by the agent.

# GM-15 — bàn giao sau review ngày 2026-10-11

Owner Vinh; Trí review cuối theo issue76/PR101. Review Pending, không tự Done/merge. Branch codex/gm-06-decision-engine (legacy name), PR101 base main. Nhận main **3076c3deb2937223a007b82211a61a2d61b63c84** chứa PR62/102/103/104; rebase6 engine commits không conflict. GM-06 hiện hành là DB schema, không sửa task đó.

## Version / scope

Task GM-15.2; policy decision-v2; evaluator1.0.0 không đổi behavior/old expected; selector1.0.0/algorithm u32-murmur3-rejection-v1. Owner đã chọn bổ sung seed→winner ngày11/10 để giữ AC; [ADR012](../../../architecture/decisions/ADR-012-seeded-domain-selection.md). GM-04 food/core1.1.0, GM-06 schema0.1.0, GM-07 base GM-07.1 (PR104 merge0711782, reviewed code3f7f241) đã nhận. Data migration0003 không đổi luật decision hoặc biến190 offering thành eligible pool.

GM-07 supplement trong patch: narrow RoomResult labels/types/guard/mock theo DECISION_SPEC/schema (fields không đổi). Trang/Trí cần review supplement này; không tự đổi approval của GM-07. [Mapping](CONTRACT_MAPPING.md) + Jest assertions chỉ kiểm domain↔DTO vocabulary/choice identity; không backend integration.

## Output / cách gọi

- [Engine](../../../../mobile/src/domain/decision/index.ts): evaluator roster/pool khóa + selected winner qua explicit seed; seed canonical8 lowercase hex. [README](../../../../mobile/src/domain/decision/README.md) có ví dụ và invalid/nullability.
- [Mapper](../../../../mobile/src/domain/decision/choiceMapping.ts): accepted row IDs→choice, missing ACK không tự KEEP; winner choice→result row. Caller auth/room/round/poolVersion/expiry/ACK check trước mapping; roster server khóa, không public ownVotes.
- [Fixtures](../../../../tests/fixtures/decision-v2/README.md):53golden+28roster lịch sử giữ byte; seeded59 vectors mới, expected độc lập; [parity map](../../../../tests/fixtures/decision-v2/parity-map.json) + seeded-cases.json cho SQL GM-20. No SQL parity yet.
- Từ root Node24: `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` →169 tests; `node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json` →153 checks. Separate CI `.github/workflows/decision.yml`; không suy Jest nhận .mjs.
- Mobile: `npm run typecheck`; `npm run lint`; `npm test -- --watchman=false`; `npm run check:architecture`. New Jest decisionContract kiểm actual mock/type/guard/rows cùng all suites.
- [CHECKS](CHECKS.md) và [review-fix actual](review-20261011/domain-case-results.json) pin sourceRevision+SHA256/input/expected/actual/repeat/permutation/unchanged. Historical output/hashes không bị rewrite thành lần chạy mới.

## Downstream / review còn lại

GM-20 gọi decideWithSeed trên accepted locked snapshot, lưu seed/algorithm/winner/result/history/event dưới transaction, đọc ACK/result cũ trước version/retry. Server entropy/private seed không do client cung cấp, không implicit conversion từ rooms.poolSeed. selectedResultFields whitelist policy/reason/tier/winnerRoundDishId; winnerDish lấy đúng locked row; resultId/finalizedAt/persist mới chứng minh DECIDED. Không gửi matrices/counts/scores/ties/diagnostics/seed ra public.

Seeded domain/vector/repeat != cryptographic randomness, SQL parity, terminal immutability, auth/RLS, concurrency hoặc persisted retry. Những phép này Not run ở GM-15, thuộc GM-20; eligibility/location/hours GM-18/19 chưa được nghiệm thu bởi engine. Không API/network/GPT/crawl hoặc thay package/lockfile/config.

Review comment11/10 báo checker READY_FOR_MERGE_REVIEW do ProjectGM-04/07 Done. Local gate hiện BLOCKED_PROJECT_UNVERIFIED vì credential không đọc được Project; không còn ghi GM-07 absent hoặc dependency BLOCKED theo hồ sơ cũ. Reviewer chạy gate với quyền read:project, review seed/GM-07 supplement và revision mới trước merge; không dùng CI/tooling tự approve.

Mac execution dùng temporary worktree với bytes patch identical và existing locked node_modules do root package.json/lockfile OneDrive dataless đang chặn npm trong checkout chính. Hai root files giữ nguyên và skip-worktree tạm được gỡ sau thao tác; không commit flag/config/package. CHECKS ghi commands thật, lỗi Watchman ban đầu và rerun --watchman=false; native/Windows chưa chạy. Rollback seed/convention supplement riêng, giữ old evaluator/fixtures/data. Historical MAIN_SYNC/REBASE_CHECKS/MAIN_RETARGET_20261010 và v1 evidence giữ nguyên.
