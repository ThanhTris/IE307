# Output checks — GM-07 / roadmap-v2

Status: Executed — Pass
Task / owner / reviewer / scope: GM-07 / Trang (@rosy179) / Trí (@ThanhTris) / BE: API contract, client và mock
Branch / target / thời điểm: `codex/gm-07-api-contract-and-mock` / `main` / 2026-10-11
Contract version / schema version / dataset version: `food-v1/roadmap-v2/GM-07.1` / `0.1.0` (GM-06) / `1.1.0` (GM-04)
Mode: `contract`
Tool/runtime versions / OS: Node.js v22.11.0, Python 3.11, Windows 11
Upstream artifact đã nhận:
- GM-02: `mobile/src/app/_layout.tsx` (shell layout)
- GM-03: `supabase/config.toml` (local BE config)
- GM-04: `docs/data/FOOD_DATA_DICTIONARY.md` (contract proposal 1.1.0)
- GM-06: `supabase/migrations/0001_core_schema.sql` (frozen schema 0.1.0, PR #102)

## Setup và cách chạy lại

1. Kiểm tra boundary kiến trúc module:
   ```sh
   node mobile/scripts/check-architecture.mjs
   ```
   Kết quả mong đợi: `Architecture boundaries OK (static guard, not a substitute for review).`

2. Chạy bộ kiểm thử hợp đồng tự động GM-07:
   ```sh
   python -m unittest tests/test_api_contract_gm07.py
   ```
   Kết quả mong đợi: `Ran 6 tests ... OK`

3. Chạy kiểm tra tính hợp lệ toàn bộ tài liệu và liên kết repo:
   ```sh
   python scripts/validate_repository.py
   python scripts/task_readiness.py --check-docs
   git diff --check
   ```

## Kết quả từng case / AC

| AC / case | Tool + lệnh | Input / setup | Expected + assertion | Actual + artifact thật | Pass/Fail/Not run | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **AC1: Bao phủ endpoints core** | Python test runner `test_api_contract_gm07.py` | Quét interface `ApiClient` trong `mobile/src/data/api/contracts.ts` | Khai báo đủ 29 methods (auth, discovery, room, preferences, ready, vote, friends, inbox, device, history) | 29/29 methods được định nghĩa với DTO tường minh, khớp `API_CONTRACT.md` | **Pass** | Khung hợp đồng hoàn chỉnh cho BE và UI |
| **AC2: Đối chiếu schema & error codes** | Python test runner `test_api_contract_gm07.py` | Đối chiếu danh sách `ErrorCode` với `API_CONTRACT.md` & `0001_core_schema.sql` | Đầy đủ 25 mã lỗi nghiệp vụ chuẩn + 3 mã lỗi hạ tầng (`NETWORK_ERROR`, `TIMEOUT`, `UNKNOWN_ERROR`) | Mọi mã lỗi đều có enum type, không lỗi tự do | **Pass** | Chuẩn hóa lỗi cho toàn app |
| **AC3: Mock adapter cùng interface, đủ 6 mode** | Test suite `apiContract.test.ts` & Python runner | Khởi tạo `MockApiClient` với mode: `default`, `loading`, `empty`, `error`, `expired`, `stale` | Khớp interface `ApiClient`, cho phép chuyển đổi mode; không fallback ngầm | `MockApiClient` thực thi đầy đủ 6 mode, có dữ liệu mẫu thực tế và in-memory state transition | **Pass** | Phục vụ màn hình GM-09..14 |
| **AC4: Transport & bảo mật token / privacy** | `mobile/src/data/api/client.ts` | Gọi `ApiClientImpl` với `MockTransport` | Tự sinh `requestId` idempotency; inject `Authorization: Bearer <token>`; map lỗi timeout/status; không log token/vote thô | Header token được gán đúng, requestId có tiền tố `req_`, error envelope sạch dữ liệu nhạy cảm | **Pass** | Bảo mật danh tính & phiếu bầu |
| **AC5: Khung API / client kiểm contract** | Architecture guard & repository validator | Quét cấu trúc `mobile/src/data/api/` | Không vi phạm ranh giới kiến trúc (data không gọi trực tiếp UI, features dùng repository) | `check-architecture.mjs` trả về mã 0, static guard OK | **Pass** | Đạt chuẩn scaffold sạch |

## Bao phủ đầu ra bàn giao

| Artifact | Phạm vi | Version/commit | Task nhận | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| `mobile/src/data/api/contracts.ts` | DTOs, Enums, Error Envelopes, `ApiClient` interface | `food-v1/roadmap-v2/GM-07.1` | GM-09..14, GM-24..31 | **Sẵn sàng** |
| `mobile/src/data/api/client.ts` | `ApiClientImpl` + `FetchTransport` (Supabase RPC) | `food-v1/roadmap-v2/GM-07.1` | GM-24..31 (Integration) | **Sẵn sàng** |
| `mobile/src/data/api/mock.ts` | `MockApiClient` + Presets dữ liệu thực tế | `food-v1/roadmap-v2/GM-07.1` | GM-09..14 (UI screens) | **Sẵn sàng** |
| `mobile/src/data/api/index.ts` | Re-exports + `createApiClient(mode)` factory | `food-v1/roadmap-v2/GM-07.1` | Toàn bộ UI & Features | **Sẵn sàng** |
| `mobile/tests/unit/apiContract.test.ts` | Test suite cho client, mock và lifecycle | `food-v1/roadmap-v2/GM-07.1` | Reviewer | **Sẵn sàng** |
| `tests/test_api_contract_gm07.py` | Kiểm tra tự động tính bao phủ và parity | `food-v1/roadmap-v2/GM-07.1` | Reviewer / CI | **Sẵn sàng** |

## Blocker và giới hạn

- Không có blocker. Tất cả các artifact đầu vào từ GM-02, GM-03, GM-04 và GM-06 đều đã sẵn sàng trên `main`.
- Giới hạn đã ghi nhận: Task GM-07 chỉ bàn giao tầng Hợp đồng (Contracts), Lớp gọi API (Client) và Mock Adapter phục vụ phát triển độc lập cho UI và chuẩn bị tích hợp. Việc triển khai xử lý nghiệp vụ cụ thể trong database/RPC thuộc phạm vi các task BE tiếp theo (GM-15..23).
