# Bàn giao patch PR #104 — GM-07 / roadmap-v2

Owner Trang (@rosy179), reviewer Trí (@ThanhTris). Codex hỗ trợ patch theo yêu cầu Trí. [Issue #68](https://github.com/ThanhTris/IE307/issues/68), [PR #104](https://github.com/ThanhTris/IE307/pull/104), [Project #2](https://github.com/users/ThanhTris/projects/2).

## Follow-up GM-07 trên nhánh Trung

Nhánh `codex/gm-07-trung-verification`, tested code commit `77941b56146969ec562063f7b7c9351f69d0b675` trên base `main` `3076c3deb2937223a007b82211a61a2d61b63c84`. Factory kiểm tra runtime và chỉ chấp nhận chính xác `real` hoặc `mock`; thiếu, `undefined`, `null` và chuỗi sai đều throw lỗi cấu hình, không fallback sang mock. Public TypeScript mode vẫn bắt buộc. Test loading mặc định và delay tường minh 600 ms đều giữ thời gian chờ. Kết quả cập nhật ở [CHECKS.md](CHECKS.md#follow-up-patch-on-trungs-branch). Nhánh follow-up chưa merge; status/assignment/review của task không bị thay đổi.

Lượt sửa hiện tại: tested code commit **`3f7f2412ed253eb67109368373e997599e916689`** trên base PR `e482ccb3d9fec8051d71550a75916c9541fd2476`, target đã fetch `00c4f27a97d4f1487dfed7c54c1253c766709a1a`, ngày 2026-10-11 UTC+7. [Manifest hiện tại](read-isolation-fix/PATCH_MANIFEST.json) ghi hash code/spec/tests đã kiểm; [bàn giao/output mới](read-isolation-fix/README.md). Mobile/Python contract chạy lại trên commit này theo yêu cầu push của Trí; commit evidence tiếp theo chỉ đổi tài liệu/output. Nhánh đích PR #104: `codex/gm-07-api-contract-and-mock`; review độc lập/CI cần kiểm HEAD sau push. Lịch sử write/join: code `f0599f8c4b92bf372fc6e3e497389cd59cadf914` rồi evidence e482ccb, [manifest cũ](PATCH_MANIFEST.json). Chưa approve, merge hoặc đổi Done.

API contract `food-v1/roadmap-v2/GM-07.1`; adapter GM-04 proposal `1.1.0`; schema GM-06 `0.1.0`. Mock datasetVersion là fixture, không là verified dataset GM-08. Input GM-02/03/04/06 lấy trên target SHA trên; không thêm package/đổi lockfile/schema.

## Output

| Artifact | Thay đổi / task nhận |
| --- | --- |
| mobile/src/data/api/mock.ts | joinRoom dùng room.roomId; own fields riêng theo phòng/caller, private DTO được copy; GM-09..14 |
| mobile/src/data/api/responseGuards.ts | Guard typed-write và 8 read DTO/array/nested/version/state/timestamp/receipt; module nội bộ GM-07 |
| mobile/src/data/api/client.ts | Validate đọc/ghi trước success; restore lỗi giữ token; flat/nested/void writes giữ metadata; GM-24..31 |
| mobile/tests/unit/apiResponseValidation.test.ts | 117 runtime cases mới qua factory/mock; join/retry/invite, malformed success, receipt/metadata/void, wire retry |
| mobile/tests/unit/apiContract.test.ts | 18 runtime cases cũ tiếp tục pass |
| mobile/tests/unit/apiReadValidation.test.ts + apiMockIsolation.test.ts | 125 cases bổ sung; 8 reads, token, 2 caller/2 phòng/2 vòng/retry/private object mutation |
| docs/architecture/API_CONTRACT.md | Required payload, optional/null/void và metadata consistency |
| tests/test_api_contract_gm07.py | Chỉ dọn whitespace; 10 source contract checks, không thay runtime tests |

Chi tiết kết quả/giới hạn trong [CHECKS.md](CHECKS.md), [plan đã dùng](PR104_FIX_PLAN.md). Expo config và DTO pricing giữ nguyên.

## Chạy lại tests

Node >=22.13.0; npm; Python có timezone data (probe ZoneInfo bên dưới chạy được). Windows bật PYTHONUTF8. Runtime đã kiểm: Node 24.15.0/npm 11.12.1/Python bundled 3.12.14; ghi runtime thực tế nếu dùng bản khác.

PowerShell tại root checkout chứa patch:

```powershell
$env:PYTHONUTF8 = '1'
node --version
python --version
python -c "from zoneinfo import ZoneInfo; print(ZoneInfo('Asia/Ho_Chi_Minh'))"
Push-Location mobile
npm ci --no-audit --no-fund
npm test -- tests/unit/apiReadValidation.test.ts tests/unit/apiMockIsolation.test.ts
npm run check
Pop-Location
python -m unittest discover -s tests -p test_api_contract_gm07.py
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff origin/main --check
git diff --check
```

Expected: 2 suites mới/125 tests Pass; full mobile 6 suites/266 tests Pass; typecheck/lint/architecture exit 0 (4 lint warnings hiện có); Python GM-07 10 tests OK; validator/indexes/diff sạch. npm ci dùng lockfile hiện có, có thể bỏ nếu đã cài đúng dependencies. Cold Jest ở lượt trước từng timeout shell 5s; không tự tăng timeout để kết luận Pass.

Full regression và gate (gate cần read:project credential hiện có):

```powershell
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --task GM-07 --base-ref origin/main
git fetch origin main
python scripts/task_readiness.py --task GM-07 --gate merge --base-ref origin/main
```

Full regression Windows/UTF-8 hiện 476 tests, 1 failure + 5 errors; chính 6 ca cũng fail/error trên main (encoding probe + taxonomy locking). Pipeline legacy dùng Linux/macOS/WSL. Nếu lỗi khác tên/số lượng, đối chiếu cùng runtime/target trước phân loại; không ghi full suite Pass khi chưa đạt. git diff origin/main --check gồm local patch, còn git diff origin/main HEAD --check chỉ kiểm revision đã commit.

## Dùng adapter

Chọn mode tường minh khi tạo client: `createApiClient('real', ...)` dùng transport thật; `createApiClient('mock', ...)` dùng fixture. TypeScript không cho bỏ tham số mode, tránh vô tình dùng mock do thiếu cấu hình. `MockApiClient` hỗ trợ `default`, `loading`, `empty`, `error`, `expired` và `stale`; `loading` giữ request pending ít nhất 300 ms để UI render trạng thái chờ, còn `delayMs` có thể đặt lâu hơn.

```typescript
import { createApiClient, MockApiClient } from '@/data/api';
const mock = createApiClient('mock');
const empty = new MockApiClient({ mode: 'empty' });
const error = new MockApiClient({ mode: 'error', simulatedErrorCode: 'NETWORK_ERROR' });
const roundTwo = new MockApiClient({ scenario: 'round_two' });
```

Real factory/defaultTimeoutMs và wire retry được kiểm trong test mới. Caller tạo requestId trước attempt, giữ nguyên toàn body khi TIMEOUT:

```typescript
import { createApiClient, type SubmitBallotRequest } from '@/data/api';

async function submitWithOneRetry(
  baseUrl: string,
  userToken: string,
  request: SubmitBallotRequest & { requestId: string },
) {
  const client = createApiClient('real', {
    baseUrl,
    initialToken: userToken,
    defaultTimeoutMs: 15000,
  });
  const result = await client.submitBallot(request);
  if (!result.ok && result.error.messageKey === 'TIMEOUT') {
    return client.submitBallot(request);
  }
  return result;
}
```

baseUrl/token/request do cấu hình/caller cung cấp; không chứa secret trong evidence. Ví dụ một retry, chưa là outbox của task sau. Trên điện thoại dùng URL BE truy cập được; localhost là môi trường dev cần cấu hình đúng. Mode real không fallback mock khi lỗi.

## Review và giới hạn

- Hai P2 read validation/caller isolation của review trên e482ccb đã có patch và assertions hành vi; write/join của lượt trước tiếp tục pass.
- acceptRoomInvite mock vẫn là fixture delegate join GCD1, không nghiệm thu auth/pair/expiry RPC thật.
- Normalizer nội bộ giờ cần guard endpoint khi gọi trực tiếp; UI dùng ApiClient/factory, signature UI không đổi.
- Lượt hiện tại ghi tested code SHA và hash file đã test, evidence được commit riêng; CI và review phải áp dụng HEAD mới sau push, không dùng CI e482ccb để duyệt patch này.
- Chưa nghiệm thu SQL/RLS/RPC nghiệp vụ/native/verified data, không tự tick approval/Done. Nếu Trí làm owner code, reviewer cuối phải khác Trí theo workflow.
