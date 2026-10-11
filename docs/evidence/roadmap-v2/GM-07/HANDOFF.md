# Bàn giao đầu ra task — GM-07 / roadmap-v2

Task / owner / reviewer / track / stage: GM-07 / Trang (@rosy179) / Trí (@ThanhTris) / BE / api-contract  
Branch / target: `codex/gm-07-api-contract-and-mock` / `main`  
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-07.1` / `0.1.0` / `1.1.0`  
Issue liên kết: [#68](https://github.com/ThanhTris/IE307/issues/68) trên [Project #2](https://github.com/users/ThanhTris/projects/2)  
PR liên kết: [PR #104](https://github.com/ThanhTris/IE307/pull/104)

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version | Lệnh kiểm / cách dùng | Expected output | Task nhận |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mobile/src/data/api/contracts.ts` | GM-07 | GM-07.1 | `import type { RoomSnapshot, PoolDish, ApiClient } from '@/data/api';` | Định kiểu TypeScript strict cho toàn bộ DTOs, errors, pricing projection, submission receipt và RPC | GM-09..14 (UI screens), GM-24..31 (Integration) |
| `mobile/src/data/api/client.ts` | GM-07 | GM-07.1 | `import { ApiClientImpl } from '@/data/api';` | Client gọi RPC Supabase có `baseUrl` configuration, normalizeRpcResponse bảo toàn error envelope, caller requestId retention, timeout | GM-24..31 (Integration) |
| `mobile/src/data/api/mock.ts` | GM-07 | GM-07.1 | `import { MockApiClient } from '@/data/api';` | Mock adapter hỗ trợ 6 mode (`default`, `loading`, `empty`, `error`, `expired`, `stale`), 3 kịch bản đồng thuận (`unanimous`, `no_consensus`, `round_two`), idempotency map | GM-09..14 (UI screens, đặc biệt là GM-12 của Trang) |
| `mobile/src/data/api/index.ts` | GM-07 | GM-07.1 | `import { createApiClient } from '@/data/api';` | Factory helper chuyển đổi linh hoạt giữa real client (với baseUrl) và mock adapter | Toàn bộ ứng dụng React Native |
| `mobile/tests/unit/apiContract.test.ts` | GM-07 | GM-07.1 | `npm test` trong `mobile/` | Test suite 16 test cases kiểm tra client, mock modes, consensus rules, error envelope normalizer, idempotency cache | Reviewer / CI |
| `tests/test_api_contract_gm07.py` | GM-07 | GM-07.1 | `python -m unittest tests/test_api_contract_gm07.py` | Kiểm tra tính bao phủ và khớp hợp đồng `API_CONTRACT.md` (10/10 tests OK) | CI / Reviewer |
| `docs/architecture/API_CONTRACT.md` | GM-07 | GM-07.1 | Đọc bảng mapping projection & parity GM-04/GM-06 | Đặc tả chi tiết ánh xạ DTO -> DB, quy tắc idempotency, response normalizer | Toàn đội ngũ |

---

## 2. AC và kết quả kiểm tra theo review PR #104

| Tiêu chí AC / Review Item | Trạng thái | Lệnh kiểm | Kết quả kiểm tra thật | Ghi chú |
| :--- | :---: | :--- | :--- | :--- |
| **AC1: Bao phủ endpoints core trong API_CONTRACT** | **Pass** | `python -m unittest tests/test_api_contract_gm07.py` | 29/29 methods RPC định nghĩa DTO đầy đủ, đúng interface `ApiClient` | Auth, discovery, room, preference, ready, ballot, friends, inbox, devices, history |
| **AC2: Đối chiếu schema, enum & error codes** | **Pass** | `python -m unittest tests/test_api_contract_gm07.py` | Đủ 25 business errors + 3 transport errors; khớp `0001_core_schema.sql` | Enum tường minh, không để chuỗi tự do |
| **P1.1: Error Normalization (không nuốt lỗi)** | **Pass** | `npm test -- tests/unit/apiContract.test.ts` | `normalizeRpcResponse<T>` bảo toàn HTTP 200 + `{ok:false}`, phân biệt malformed | Đã sửa `setReady`, `submitBallot` và toàn bộ write RPCs |
| **P1.2: Caller RequestId Retention (Idempotency)** | **Pass** | `npm test -- tests/unit/apiContract.test.ts` | Caller truyền `requestId` được giữ nguyên khi timeout retry; cùng body trả ACK cũ, khác body trả `REQUEST_ID_REUSED` | DTOs và client hỗ trợ `requestId?: string` |
| **P2.1: Cấu hình Real Client & BaseUrl** | **Pass** | `npm test -- tests/unit/apiContract.test.ts` | `ClientConfig` hỗ trợ `baseUrl?: string`, `fetchFn`, `transport`; không ngầm trỏ localhost | URL request thực tế gửi đúng `baseUrl` cấu hình |
| **P2.2: DTO Parity với GM-04 / GM-06** | **Pass** | `npm test -- tests/unit/apiContract.test.ts` | `PoolDish` có `priceMin`, `priceMax`, `currency`, `unit`, `servingSize`, `price`; `RoomSnapshot` có `ownSubmission`, `datasetVersion`, `eligibilityVersion`, `evaluatedAt`; `toStoragePermission` map `provisional -> unknown` | Đã cập nhật bảng mapping trong `API_CONTRACT.md` |
| **P2.3: Mock Consensus Rules (NO không thể thắng)** | **Pass** | `npm test -- tests/unit/apiContract.test.ts` | All-NO trả `NO_CONSENSUS`, từ chối submit ở `LOBBY` với `INVALID_ROOM_STATE`, hỗ trợ scenarios `round_two`, `no_consensus`, `unanimous` | Nhất quán nguyên tắc cốt lõi của đồ án |
| **P2.4: Merge Gate & Clean Base Artifact** | **Pass** | `git diff origin/main mobile/app.config.ts` | Diff rỗng (0 dòng thay đổi so với main); chạy sạch `npx expo config --type public` | Không gây bẩn base artifact của GM-02 |

---

## 3. Hướng dẫn sử dụng cho các task UI tiếp theo

### Dành cho task GM-09..14 (UI Screens, bao gồm GM-12):
```typescript
import { createApiClient, MockApiClient } from '@/data/api';

// 1. Khởi tạo client ở chế độ mock mặc định (kịch bản unanimous):
const client = createApiClient('mock');

// 2. Kiểm thử kịch bản không đồng thuận (tất cả vote NO):
const noConsensusClient = new MockApiClient({
  mode: 'default',
  scenario: 'no_consensus',
});

// 3. Kiểm thử kịch bản chuyển sang Vòng 2 (Round 2):
const roundTwoClient = new MockApiClient({
  mode: 'default',
  scenario: 'round_two',
});

// 4. Kiểm thử các chế độ biên:
const emptyClient = new MockApiClient({ mode: 'empty' });
const errorClient = new MockApiClient({ mode: 'error', simulatedErrorCode: 'ROOM_NOT_FOUND' });
```

### Dành cho task GM-24..31 (Tích hợp API thật):
```typescript
import { createApiClient, ApiClientImpl, FetchTransport } from '@/data/api';

// Cách 1: Sử dụng factory createApiClient với baseUrl rõ ràng (hoàn toàn type-safe):
const client = createApiClient('real', {
  baseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co',
  initialToken: userToken,
  timeoutMs: 15000,
});

// Cách 2: Inject custom transport hoặc fetch function:
const customTransport = new FetchTransport('https://api.staging.gicungduoc.vn');
const customClient = new ApiClientImpl({
  transport: customTransport,
  initialToken: userToken,
});

// Ví dụ gọi submitBallot bảo toàn requestId khi retry sau timeout:
const clientRequestId = 'req_vote_' + Date.now();
const result = await client.submitBallot({
  roomId: 'room_123',
  round: 1,
  poolVersion: 1,
  intentId: 'intent_user_abc',
  expectedVersion: 3,
  votes: [{ roundDishId: 'dish_1', vote: 'WANT' }],
  requestId: clientRequestId, // Caller/outbox kiểm soát ID
});

if (!result.ok) {
  if (result.error.messageKey === 'TIMEOUT') {
    // Retry an toàn với cùng requestId + cùng body
    const retryResult = await client.submitBallot({
      ...,
      requestId: clientRequestId,
    });
  }
}
```

---

## 4. Checklist người nhận (Downstream Verification)

- [x] Đã nhận đầu vào từ GM-02 (`_layout.tsx`), GM-03 (`config.toml`), GM-04 (`FOOD_DATA_DICTIONARY.md`), GM-06 (`0001_core_schema.sql`).
- [x] Đã xử lý triệt để 6 nhóm góp ý từ reviewer `@ThanhTris` tại PR #104.
- [x] Type-safe 100%, không type error, không bypass `any`.
- [x] `mobile/app.config.ts` revert hoàn toàn về `origin/main`, không làm bẩn base artifact.
- [x] Đã chạy kiểm tra tự động và đạt 100% test pass (22 Jest tests, 10 Python contract tests).
- [ ] Reviewer độc lập (Trí / `@ThanhTris`) nghiệm thu PR #104.
