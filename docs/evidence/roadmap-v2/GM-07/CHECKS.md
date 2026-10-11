# Output checks — GM-07 / roadmap-v2

Status: Executed — Pass
Task / owner / reviewer / scope: GM-07 / Trang (@rosy179) / Trí (@ThanhTris) / BE: API contract, client và mock
Branch / target / thời điểm: `codex/gm-07-api-contract-and-mock` / `main` / 2026-10-11
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-07.1` / `0.1.0` (GM-06) / `1.1.0` (GM-04)
Mode: `contract`
Tool/runtime versions / OS: Node.js v22.11.0, Python 3.11, Windows 11
Upstream artifact đã nhận:
- GM-02: `mobile/src/app/_layout.tsx` (shell layout), `mobile/app.config.ts` (khớp chính xác `origin/main`)
- GM-03: `supabase/config.toml` (local BE config)
- GM-04: `docs/data/FOOD_DATA_DICTIONARY.md` (contract proposal 1.1.0), `docs/data/FIELD_COVERAGE.md`
- GM-06: `supabase/migrations/0001_core_schema.sql` (frozen schema 0.1.0, PR #102)

---

## Setup và cách chạy lại

1. Kiểm tra boundary kiến trúc module:
   ```sh
   node mobile/scripts/check-architecture.mjs
   ```
   Kết quả: `Architecture boundaries OK (static guard, not a substitute for review).`

2. Chạy bộ kiểm thử Jest cho API contracts, client và mock:
   ```sh
   cd mobile && npm test -- tests/unit/apiContract.test.ts
   ```
   Kết quả: 16 test cases pass (bao gồm error normalization, requestId retry idempotency, mock consensus scenarios, permission mapping, baseUrl configuration).

3. Chạy toàn bộ test suites trong mobile:
   ```sh
   cd mobile && npm test
   ```
   Kết quả: 3 test suites passed, 22 tests passed (`apiContract.test.ts`, `routes.test.tsx`, `AppShellScreen.test.tsx`).

4. Chạy bộ kiểm thử hợp đồng tự động GM-07 bằng Python:
   ```sh
   python -m unittest tests/test_api_contract_gm07.py
   ```
   Kết quả: `Ran 10 tests in 0.005s ... OK`.

5. Kiểm tra tính hợp lệ toàn bộ tài liệu và liên kết repo:
   ```sh
   python scripts/validate_repository.py
   python scripts/task_readiness.py --check-docs
   git diff origin/main mobile/app.config.ts
   ```
   Kết quả: Tài liệu hợp lệ, diff rỗng trên base artifact `app.config.ts`.

---

## Chi tiết kết quả kiểm tra theo các điểm Review PR #104

| Hạng mục review | Vị trí code / Test case | Thiết lập kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. [P1] Error Normalization** | `client.ts:normalizeRpcResponse()`, `apiContract.test.ts` (Block 1) | Giả lập HTTP 200 trả `{ ok: false, error: { messageKey: 'VERSION_CONFLICT' } }` và malformed `{ foo: 'bar' }` cho `setReady`, `submitBallot` | Không bao giờ biến lỗi server thành thành công; bảo toàn `messageKey`, trả `MALFORMED_RESPONSE` khi rỗng cờ `ok` | Caller nhận đúng `{ ok: false, error: { messageKey: 'VERSION_CONFLICT' } }`; malformed nhận `MALFORMED_RESPONSE` | **Pass** |
| **2. [P1] RequestId Retention khi Retry** | `contracts.ts`, `client.ts`, `mock.ts`, `apiContract.test.ts` (Block 2) | Caller cung cấp `requestId` cố định khi gọi `submitBallot`. Gọi lần 1 thành công, lần 2 retry cùng ID/payload; lần 3 retry cùng ID khác payload | Lần 2 nhận ACK idempotent cũ; lần 3 bị từ chối với `REQUEST_ID_REUSED`. Không âm thầm sinh lại ID | Lần 2 trả đúng version/state cũ; lần 3 trả lỗi `REQUEST_ID_REUSED` | **Pass** |
| **3. [P2] Cấu hình Real Client & BaseUrl** | `client.ts:ClientConfig`, `apiContract.test.ts` (Block 3) | Khởi tạo `new ApiClientImpl({ baseUrl: 'https://api.mycustomdomain.com', fetchFn })` | Client gửi HTTP request tới đúng domain cấu hình; không ngầm fallback localhost | URL gửi đi khớp 100% với `baseUrl` truyền vào; compile TypeScript không lỗi type | **Pass** |
| **4. [P2] DTO Parity GM-04 / GM-06** | `contracts.ts`, `API_CONTRACT.md`, `test_api_contract_gm07.py` | Kiểm tra projection giá, đơn vị, khẩu phần, submission receipt và enum permission | `PoolDish` có `priceMin`, `priceMax`, `currency: VND`, `unit: menu_item_unspecified`, `servingSize: 1`, `DishPrice`; `RoomSnapshot` có `ownSubmission`, `datasetVersion`, `eligibilityVersion`, `evaluatedAt`; `toStoragePermission` map `'provisional' -> 'unknown'` | Các trường định nghĩa chặt chẽ, khớp bảng ánh xạ trong `API_CONTRACT.md` | **Pass** |
| **5. [P2] Mock Consensus Rules** | `mock.ts:submitBallot()`, `apiContract.test.ts` (Block 4) | Nộp ballot khi phòng ở `LOBBY`; kịch bản all-NO; kịch bản `round_two`; kịch bản `unanimous` | `LOBBY` bị từ chối với `INVALID_ROOM_STATE`; all-NO trả `winner: null, reasonCode: 'NO_CONSENSUS'`; `round_two` chuyển phòng sang `ROUND_2` | NO không bao giờ thắng; state machine hoạt động đúng kịch bản thiết lập | **Pass** |
| **6. [P2] Clean Base Artifact** | `mobile/app.config.ts` | So sánh working tree với `origin/main` | Không thay đổi artifact thuộc phạm vi GM-02 | `git diff origin/main mobile/app.config.ts` trả về 0 diff; Expo config đọc bình thường | **Pass** |

---

## Bao phủ đầu ra bàn giao

| Artifact | Phạm vi | Version | Task nhận | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| `mobile/src/data/api/contracts.ts` | DTOs, Enums, Error Envelopes, Pricing, Receipts, `ApiClient` interface | `food-v1/roadmap-v2/GM-07.1` | GM-09..14, GM-24..31 | **Sẵn sàng** |
| `mobile/src/data/api/client.ts` | `ApiClientImpl` + `FetchTransport` (Supabase RPC) + Response Normalizer | `food-v1/roadmap-v2/GM-07.1` | GM-24..31 (Integration) | **Sẵn sàng** |
| `mobile/src/data/api/mock.ts` | `MockApiClient` + 6 Modes + 3 Scenarios + Idempotency Map | `food-v1/roadmap-v2/GM-07.1` | GM-09..14 (UI screens) | **Sẵn sàng** |
| `mobile/src/data/api/index.ts` | Re-exports + `createApiClient(mode, config)` factory | `food-v1/roadmap-v2/GM-07.1` | Toàn bộ UI & Features | **Sẵn sàng** |
| `mobile/tests/unit/apiContract.test.ts` | Test suite 16 test cases cho client, mock, consensus và normalizer | `food-v1/roadmap-v2/GM-07.1` | Reviewer | **Sẵn sàng** |
| `tests/test_api_contract_gm07.py` | Kiểm tra tự động tính bao phủ và parity (10 tests) | `food-v1/roadmap-v2/GM-07.1` | Reviewer / CI | **Sẵn sàng** |
| `docs/architecture/API_CONTRACT.md` | Bổ sung chi tiết projection, mapping DB và quy tắc đồng thuận | `food-v1/roadmap-v2/GM-07.1` | Reviewer / Core Team | **Sẵn sàng** |
