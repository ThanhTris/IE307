# Bàn giao đầu ra task — GM-07 / roadmap-v2

Task / owner / reviewer / track / stage: GM-07 / Trang (@rosy179) / Trí (@ThanhTris) / BE / api-contract  
Branch / target: `codex/gm-07-api-contract-and-mock` / `main`  
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-07.1` / `0.1.0` / `1.1.0`  
Issue liên kết: [#68](https://github.com/ThanhTris/IE307/issues/68) trên [Project #2](https://github.com/users/ThanhTris/projects/2)  

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version | Lệnh kiểm / cách dùng | Expected output | Task nhận |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mobile/src/data/api/contracts.ts` | GM-07 | GM-07.1 | `import type { RoomSnapshot, ApiClient } from '@/data/api';` | Định kiểu TypeScript strict cho toàn bộ DTOs, errors và RPC | GM-09..14 (UI screens), GM-24..31 (Integration) |
| `mobile/src/data/api/client.ts` | GM-07 | GM-07.1 | `import { ApiClientImpl } from '@/data/api';` | Client gọi RPC Supabase có transport injection, auto requestId, timeout và map lỗi | GM-24..31 (Integration) |
| `mobile/src/data/api/mock.ts` | GM-07 | GM-07.1 | `import { MockApiClient } from '@/data/api';` | Mock adapter giả lập 6 mode (`default`, `loading`, `empty`, `error`, `expired`, `stale`) và in-memory state | GM-09..14 (UI screens, đặc biệt là GM-12 của Trang) |
| `mobile/src/data/api/index.ts` | GM-07 | GM-07.1 | `import { createApiClient } from '@/data/api';` | Factory helper chuyển đổi linh hoạt giữa real client và mock adapter | Toàn bộ ứng dụng React Native |
| `mobile/tests/unit/apiContract.test.ts` | GM-07 | GM-07.1 | `npx jest mobile/tests/unit/apiContract.test.ts` | Test suite cho client, mock modes và room state machine | Reviewer |
| `tests/test_api_contract_gm07.py` | GM-07 | GM-07.1 | `python -m unittest tests/test_api_contract_gm07.py` | Kiểm tra tính bao phủ và khớp hợp đồng `API_CONTRACT.md` (6/6 tests OK) | CI / Reviewer |

---

## 2. AC và kết quả kiểm tra

| Tiêu chí AC | Trạng thái | Môi trường & Lệnh kiểm | Bằng chứng | Ghi chú |
| :--- | :---: | :--- | :--- | :--- |
| **Bao phủ endpoints core trong API_CONTRACT** | **Pass** | `python -m unittest tests/test_api_contract_gm07.py` | [CHECKS.md](CHECKS.md) (Case 1) | 29 RPC methods bao quát toàn bộ modules: auth, discovery, room, preferences, voting, friends, inbox, devices, history |
| **Đối chiếu schema, enum & error codes** | **Pass** | `python -m unittest tests/test_api_contract_gm07.py` | [CHECKS.md](CHECKS.md) (Case 2) | Khớp hoàn toàn với schema `0001_core_schema.sql` và đặc tả `API_CONTRACT.md` |
| **Mock adapter cùng interface, đủ 6 mode** | **Pass** | `mobile/src/data/api/mock.ts` & test suite | [CHECKS.md](CHECKS.md) (Case 3) | Hỗ trợ 6 mode hoạt động phục vụ UI kiểm thử các ca biên (empty, error, expired, version conflict) |
| **Transport xử lý timeout, requestId, bảo mật** | **Pass** | `mobile/src/data/api/client.ts` & test suite | [CHECKS.md](CHECKS.md) (Case 4) | Inject token an toàn, map lỗi chuẩn hóa, không log thông tin nhạy cảm |
| **Khung API / client scaffold sạch** | **Pass** | `node mobile/scripts/check-architecture.mjs` | [CHECKS.md](CHECKS.md) (Case 5) | Đạt kiểm tra ranh giới kiến trúc, không vi phạm module isolation |

---

## 3. Hướng dẫn sử dụng cho các task UI tiếp theo

### Dành cho task GM-09..14 (UI Screens, bao gồm GM-12):
Để sử dụng Mock Adapter trong các màn hình:
```typescript
import { createApiClient, MockApiClient } from '@/data/api';

// Khởi tạo client ở chế độ mock mặc định
const client = createApiClient('mock');

// Hoặc ép chế độ để kiểm thử giao diện lỗi / rỗng:
const mockClient = new MockApiClient({ mode: 'empty' });
const { data: emptyPool } = await mockClient.previewFoodPool(...);
```

### Dành cho task GM-24..31 (Tích hợp API thật):
```typescript
import { createApiClient } from '@/data/api';

// Khởi tạo client ở chế độ gọi Supabase thật
const client = createApiClient('real', {
  baseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  initialToken: userToken,
});
```

---

## 4. Checklist người nhận (Downstream Verification)

- [x] Đã nhận đầu vào từ GM-02 (`_layout.tsx`), GM-03 (`config.toml`), GM-04 (`FOOD_DATA_DICTIONARY.md`), GM-06 (`0001_core_schema.sql`).
- [x] File thực tế và hướng dẫn chạy sạch đã bàn giao trong `mobile/src/data/api/`.
- [x] Input/Output/Errors và DTOs tuân thủ strict typing TypeScript, không dùng `any` bừa bãi.
- [x] Đã chạy kiểm tra tự động và đạt 100% test pass.
- [ ] Reviewer độc lập (Trí / `@ThanhTris`) kiểm tra nội dung PR và nghiệm thu.
