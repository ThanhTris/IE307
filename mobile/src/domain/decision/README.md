# GM-15 — decision-v2 domain (legacy GM-06)

Draft implementation, review Pending. Task contract GM-15.2; evaluator contract1.0.0, additive selection contract1.0.0, algorithm u32-murmur3-rejection-v1. Owner ngày2026-10-11 đã chốt bổ sung selector theo seed để giữ AC, xem [ADR012](../../../../docs/architecture/decisions/ADR-012-seeded-domain-selection.md). Engine legacyGM-06 chuyển sang GM-15; currentGM-06 là DB schema.

## Interface

- `evaluateDecision(input: unknown): DecisionEvaluation` kiểm locked roster/pool/policy/round và matrices, trả candidate set nội bộ; không đổi hành vi evaluator/fixtures cũ.
- `decideWithSeed(input: unknown): SeededDecision` nhận `SeededDecisionInput = DecisionInput & { seed: string }`, validate seed rồi evaluate. Chỉ DECISION_READY chuyển sang DECISION_SELECTED + winnerId; các nhánh khác giữ nguyên, không winner.
- `selectWinner(candidateIds: readonly string[], seed: string): string` chọn một choice; unique/nonempty IDs và seed canonical8 lowercase hex bắt buộc, sai ném RangeError. Seed0/ffffffff hợp lệ, không trim/coerce/default.
- `scoreVotes(want, ok)` =2W+OK, `classifyTier(n, want, eligible)` theo DECISION_SPEC; số đếm sai ném RangeError, không bù veto bằng điểm.
- `choiceMapping.ts`: `mapAcceptedBallots` map row IDs sang choice IDs từ locked rows và accepted server ballots; `selectedResultFields` map winner choice về row vòng kết quả và whitelist4 fields policy/reason/tier/winnerRoundDishId. Không import API/network/database.

```typescript
const selected = decideWithSeed({
  policyVersion: "decision-v2", seed: "00000001", roster: ["a", "b"],
  pool: ["bun", "pho"], round: 1,
  round1: { a: { bun: "WANT", pho: "WANT" }, b: { bun: "WANT", pho: "WANT" } },
});
// DECISION_SELECTED, winnerId="pho", UNANIMOUS_WANT/PERFECT.
// Still not a persisted RoomResult/DECIDED room.
```

## Input và invariants

Roster/pool explicit nonempty arrays of unique nonblank strings, exact identity (no trim/name/alias merge). Pool contains immutable **choiceId**, not dishId/offeringId/round row ID. Capacity/context/poolVersion/auth/expiry do GM-19/20 kiểm trước call. Cùng dish/khác venue hoặc variant giữ lựa chọn và metadata riêng theo locked pool.

Matrices own memberUserId→choiceId→vote; regular/null-prototype records only. Missing member/choice hoặc UNSET → WAITING, không default OK/KEEP. Unknown IDs, null/array/enum/round/rootfield sai → INVALID_INPUT với escaped deterministic JSON Pointer, không chứa vote value. `round2` absent là chưa gửi, không null/default KEEP. Caller đưa **server accepted/ACK sau Gửi/xác nhận**, không public ownVotes/snapshot/draft KEEP. Mapper từ chối UNSET và duplicate member/row votes; phiếu thiếu giữ absent cho evaluator chờ.

Đợi đủ vòng1: M mọi WANT → exact M/PERFECT; nếu M rỗng, A không NO: A rỗng EMPTY_INTERSECTION, còn A phải vòng2 kể cả một lựa chọn. Vòng2 tính lại A, đợi mọi KEEP/REMOVE, không thêm món/vòng3; REMOVE loại, S rỗng ALL_REMOVED. Max2W+OK trong S, ties exact set, tier PERFECT/CONSENSUS/COMPROMISE theo WANT vòng1.

| status | Fields thêm | Boundary |
| --- | --- | --- |
| INVALID_INPUT | issues | private diagnostic, candidateIds=[] |
| WAITING | waitingRound, INCOMPLETE_BALLOT | không finalize |
| ROUND_2 | candidateIds=A | server chuyển vòng |
| DECISION_READY | reasonCode, matchTier | evaluator private tie set |
| DECISION_SELECTED | reasonCode, matchTier, winnerId | private choice sau seed selection |
| NO_CONSENSUS | EMPTY_INTERSECTION/ALL_REMOVED, tier NO_CONSENSUS | winner absent, server persist null |

All outputs contain policyVersion/candidateIds sorted ordinal; không phải ranking/RoomState. Diagnostics/ties/matrix/score/count không public/log. selectedResultFields không thêm resultId/finalizedAt/winnerDish: backend lấy toàn bộ metadata từ đúng locked row rồi persist transaction. GM-07 types/guard/mock dùng canonical decision-v2 labels, không TIER_1/2 hoặc policy food-v1.

## Seed / backend

Selector copy/sort IDs theo JS UTF-16 ordinal; counter uint32 seed; Murmur3 finalizer, counter+1 mod2^32; reject draw>=2^32-(2^32 mod n), sau đó draw mod n. Constants/vectors/format ở ADR012. Không ambient RNG/clock/locale/mutation/I/O/package. Đây là deterministic noncrypto PRNG, không chứng minh entropy/security/uniform distribution bằng vài vectors. GM-20 tạo private decision seed phù hợp một lần (không tự reuse opaque poolSeed), lock/persist seed+algorithm+winner và trả result cũ khi retry; terminal không reroll. Seed không do client chọn/gửi.

## Chạy và evidence

Node24 từ root:

```sh
node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs
node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json
```

Mobile đã có locked dependencies: `npm run typecheck`, `npm run lint`, `npm test -- --watchman=false`, `npm run check:architecture`. Node type stripping không thay tsc. CI domain chạy cả hai suites/report riêng vì Jest chỉ nhận .test.ts/tsx.

[CHECKS](../../../../docs/evidence/roadmap-v2/GM-15/CHECKS.md), [HANDOFF](../../../../docs/evidence/roadmap-v2/GM-15/HANDOFF.md), [mapping](../../../../docs/evidence/roadmap-v2/GM-15/CONTRACT_MAPPING.md), [fixtures](../../../../tests/fixtures/decision-v2/README.md) ghi revision/actual/giới hạn. Historical [v1 handoff](../../../../docs/evidence/roadmap-v1/GM-06/HANDOFF.md) và domain-case-results.json giữ nguyên, không dùng làm output của seed patch. Không SQL parity/transaction/auth/race/persisted retry/native claims hoặc tự Approved/Done.


## GM15.3 — opt-in v4 domain

`dishPolicyV4.ts` exports decideDishSessionV4 and removalCapV4 under policy
`dish-decision-v4/ADR-019-30PCT-MIN1`. It receives locked roster2–20/initial pool10–20,
complete ACKed ballot maps and server seed; returns private typed decisions/Top3 and
round1BallotCount. R1 remaining1 opens R2; R2 cap30% min1; scores solely R1; deterministic
cutoff includes winner. No preference weighting, public RPC or host/timer permission.
See [v4 handoff](../../../../docs/evidence/roadmap-v2/GM-15/v4/HANDOFF.md),
[fixtures](../../../../tests/fixtures/decision-v4/README.md). Run
`node --test mobile/tests/dishPolicyV4.test.mjs` from root; Node24 is required.
Use the new entry point explicitly; existing v2/v3 exports and consumers do not change.
