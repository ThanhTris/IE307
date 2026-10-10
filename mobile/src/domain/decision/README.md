# GM-15 — decision-v2 engine (legacy GM-06)

Engine TypeScript thuần, draft theo yêu cầu owner; reviewer Trung còn Pending.
Policy `decision-v2`, **engine contract** `1.0.0` (namespace riêng, không phải food
contract). Parent lịch sử GM-03: `42a821c28144c0667839d485edf2b9462d463937`.
[Patch/test plan](../../../../docs/evidence/roadmap-v1/GM-06/PATCH_TEST_PLAN.md) và
[handoff/evidence](../../../../docs/evidence/roadmap-v1/GM-06/HANDOFF.md).

## Interface

`index.ts` xuất DecisionInput, DecisionEvaluation, Ballots, các loại phiếu/tier,
constants và ba hàm đồng bộ:

- `evaluateDecision(input: unknown): DecisionEvaluation`: kiểm input runtime.
- `scoreVotes(want: number, ok: number): number`: trả 2W+OK; không thay veto.
- `classifyTier(n: number, want: number, eligible: boolean): MatchTier`: áp ngưỡng
  spec; eligible=false trả NO_CONSENSUS. Helpers ném RangeError nếu count không
  là số nguyên an toàn/âm, WANT vượt n hoặc eligibility sai kiểu.

```typescript
const input: DecisionInput = {
  policyVersion: "decision-v2",
  roster: ["a", "b"], pool: ["choice-pho"], round: 2,
  round1: { a: { "choice-pho": "WANT" }, b: { "choice-pho": "OK" } },
  round2: { a: { "choice-pho": "KEEP" }, b: { "choice-pho": "KEEP" } },
};
// DECISION_READY, candidateIds=[choice-pho], ACCEPTABLE_FINAL, COMPROMISE.
// Chưa có winnerId/resultId và chưa persist DECIDED.
```

Roster/pool bắt buộc là arrays khác rỗng, ID chuỗi không rỗng/blank, không trùng.
ID giữ nguyên, so sánh chính xác; không trim/gộp alias/suy ID từ tên. Pool chứa ID
**lựa chọn đã khóa**; upstream giữ dishId/variant/offering metadata. Engine không
kiểm UUID/nơi bán. Capacity/pool limit, context, version khóa và quyền truy cập
do start/RPC adapter kiểm theo spec.

round bắt buộc 1 hoặc 2. round1 bắt buộc object; `{}` là chưa có phiếu. round2 chỉ
được có ở round=2; bỏ field tương đương chưa ai gửi, không tương đương KEEP.
Matrices: memberId → object choiceId → vote. Chỉ own properties được tính;
nhận object thường/null-prototype, không array/class instance. Thiếu key/UNSET
khiến WAITING; null, enum khác và own key mang undefined là sai kiểu, không phải
phiếu gửi. JSON không dùng null thay phiếu chưa gửi. Root field lạ bị từ chối.

**Caller chỉ đưa phiếu đã được server chấp nhận sau hành động Gửi/xác nhận.**
Không dùng draft KEEP UI làm submission. Engine không xác thực người gửi hoặc
phân biệt draft tự điền với hành động người dùng; đây là boundary của RPC.

## Kết quả nội bộ

Mọi output có policyVersion và candidateIds, ID sắp xếp bằng JS sort ổn định,
không là thứ tự xếp hạng. Status đánh giá không bổ sung RoomState.

| status | Fields thêm | Ý nghĩa |
| --- | --- | --- |
| INVALID_INPUT | issues: `{code,path}[]` | candidateIds rỗng; sai schema/version/reference/transition |
| WAITING | waitingRound: 1 hoặc 2; reasonCode=INCOMPLETE_BALLOT | candidateIds rỗng; chưa đủ xác nhận |
| ROUND_2 | không thêm field | candidateIds đúng A, kể cả một món |
| DECISION_READY | reasonCode, matchTier | tập M hoặc toàn bộ tập điểm cao nhất; server phải chọn/lưu |
| NO_CONSENSUS | reasonCode, matchTier=NO_CONSENSUS | EMPTY_INTERSECTION hoặc ALL_REMOVED |

Ready: UNANIMOUS_WANT/PERFECT hoặc ACCEPTABLE_FINAL với tier theo WANT vòng 1.
Không trả score/count/matrix/ai veto trong kết quả hợp lệ. Fields không áp dụng
được bỏ, không điền null. Diagnostics có codes INVALID_INPUT/NOT_MEMBER/
INVALID_DISH, path JSON Pointer đã escape, không chứa giá trị phiếu. Chúng vẫn
chứa ID nội bộ và **không được public/log tùy ý**; không là API error envelope.
Issues sắp xếp theo path rồi code, không phụ thuộc thứ tự input.

Sau kiểm schema, đợi đủ vòng 1 kể cả input round=2; không early unanimous hoặc
no-consensus. Vòng 2 tính lại A, từ chối món bị NO hoặc mở vòng 2 khi M khác rỗng/
A rỗng. Đợi tất cả KEEP/REMOVE trước tính S. Không round=3/field round3, không sửa
input hoặc dùng I/O/RNG/clock.

## Boundary tích hợp

Deterministic evaluation không chứng minh retry transaction. Backend phải lock
room, kiểm auth/membership/poolVersion/expiry/idempotency; chọn ngẫu nhiên đều
**một lần** trong candidateIds; persist resultId/winnerId/tiedIds/policyVersion/
finalizedAt và trả kết quả cũ khi retry/reconnect. Terminal không được gọi engine
để reroll/mở vòng 2. Không gửi matrix/tie set ra client; public snapshot theo
API_CONTRACT. Client không có phiếu người khác để tính engine.

## Chạy tests

Từ repo root với Node 24 có type stripping/node:test:

```sh
node --test mobile/tests/decision.test.mjs
```

Bản bổ sung review: Node24.15.0,104 domain tests; strict typecheck/lint GM-02 đã chạy riêng bằng dependencies đã khóa. Package/config/lockfile không đổi. SQL parity/seeded winner/persisted retry chưa kiểm; upstream/reviewer Pending.
[CHECKS v2](../../../../docs/evidence/roadmap-v2/GM-15/CHECKS.md) và [mapping/boundary proposal](../../../../docs/evidence/roadmap-v2/GM-15/CONTRACT_MAPPING.md).
CI Decision domain chạy Node suite riêng; từ root chạy node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json để xuất94 checks mô phỏng, không live votes.
