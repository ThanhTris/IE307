# Output checks — GM-25 / roadmap-v2

Status: Pending review (đã sửa toàn bộ 7 điểm phản hồi từ review comment #6209239533 của Trí; tự động hóa đạt 100%, chờ Trí nghiệm thu thiết bị thật theo ADR-013).
Task: GM-25 — UI–BE: nối Home, context, preferences và lobby
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`)
Branch: `continue_task_gm_twenty_five` / Base: `origin/main` (`4a8cd64`)
Contract version: `food-v1/roadmap-v2/GM-25.1`, schema `0.3.0` (GM-19) / `0.4.0` (GM-21)
Mode: `expo-api`
Tool/runtime: Node 24.x, npm 11.x, Python 3.11, Expo SDK 57.0.30, Jest 29.x, React Native 0.86.3, Windows
Tested revision: `continue_task_gm_twenty_five` (sau merge `origin/main` `4a8cd64` và commit fix review comment 6209239533)

---

## 1. Setup và cách chạy lại

1. Clone sạch hoặc checkout branch `continue_task_gm_twenty_five`.
2. Kiểm tra package Expo:
   ```powershell
   cd mobile
   npm ci
   npm run check:expo
   ```
3. Chạy toàn bộ static checks trong `mobile/`:
   ```powershell
   npm run typecheck
   npm run lint
   npm run check:architecture
   ```
4. Chạy toàn bộ test suites của mobile (bao gồm unit, component, integration):
   ```powershell
   npm test
   ```
5. Chạy regression test toàn repo:
   ```powershell
   python scripts/validate_repository.py
   python -m unittest discover -s tests -p "test_*.py"
   python scripts/task_readiness.py --check-docs
   git diff --check
   ```

---

## 2. Kết quả kiểm thử tự động

| Kiểm tra | Lệnh | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| --- | --- | --- | --- | --- |
| Jest Unit & Integration | `cd mobile; npm test` | 23 test suites pass, 635 tests pass | **23 suites passed, 635 tests passed** (71.2s) | **Pass** |
| TypeScript strict | `cd mobile; npm run typecheck` | 0 errors (`tsc --noEmit`) | **0 errors** | **Pass** |
| ESLint | `cd mobile; npm run lint` | 0 errors trong các file scope GM-25 | **0 errors** (4 upstream warnings giữ nguyên) | **Pass** |
| Kiến trúc module | `cd mobile; npm run check:architecture` | Boundaries OK | **Architecture boundaries OK** | **Pass** |
| Expo dependencies | `cd mobile; npm run check:expo` | SDK 57 lockfile match | **Dependencies are up to date (57.0.30)** | **Pass** |
| Repo validation | `python scripts/validate_repository.py` | Docs, JSON, links, manifest OK | **Documents, links, JSON, task manifest OK** | **Pass** |
| Python regression | `python -m unittest discover -s tests -p "test_*.py"` | 550 tests OK | **550 tests passed, OK** (110.7s) | **Pass** |
| Task indexes | `python scripts/task_readiness.py --check-docs` | Task indexes match metadata | **Task indexes match task metadata** | **Pass** |
| Git whitespace | `git diff --check` | 0 whitespace / EOF errors | **0 errors, clean output** | **Pass** |

---

## 3. Kết quả từng AC của GM-25

| AC | Nội dung yêu cầu | Bằng chứng kiểm tra | Trạng thái |
| --- | --- | --- | --- |
| **AC1** | Đạt kiểm Android–API đúng scope trong ma trận mobile; composition root nối GoTrue session thật và API client RPC. | `LiveRoomRepository` kết nối `createAuthenticatedApiClient()` từ GM-16; hỗ trợ 12 RPC methods với error mapping và normalization; `RoomRepositoryProvider` cung cấp composition root sạch, loại bỏ implicit guest creation. 23/23 test suites mobile pass. | **Pass (automated)** / **Not run (thiết bị thật)** |
| **AC2** | Không viết lại layout; production mode không import/fallback fixture; feature config chỉ chọn adapter ở composition root. | Giữ nguyên layout gốc từ GM-09, GM-10, GM-11; `RoomRepositoryProvider` phân tách rõ ràng giữa `real` và `mock`; `context.tsx` & `preferences.tsx` báo lỗi thiếu phòng chứ không fallback fixture; `npm run check:architecture` đạt. | **Pass** |
| **AC3** | Auth/session/validation/error, consent/history/avoidRecent và context/pool version thực tế đúng. | `LiveRoomRepository.restoreSession()` tự đọc từ `SessionManager` persistent storage khi không có token; taxonomy UUID chuẩn hóa từ `taxonomy_registry_v1.json`; `gm25ReviewFeedback.test.tsx` (P1, P2) pass. | **Pass** |
| **AC4** | Nhiều máy nhận cùng snapshot, reset ready khi context/roster/consent đổi; expired/full/cancel handled. | `LobbyScreen` tự động `refreshSnapshot` khi nhận `VERSION_CONFLICT` / `CONTEXT_CHANGED`; hỗ trợ nút tải lại thủ công và polling 4s ở real mode; sử dụng `createDurableRequestId` và retry idempotency trên `TIMEOUT` / `NETWORK_ERROR`; `gm25ReviewFeedback.test.tsx` (P3, P4) pass. | **Pass** |
| **AC5** | Out-of-coverage/unknown/empty trả lý do server và sửa bối cảnh; không start pool rỗng. | `LobbyScreen` gọi `previewFoodPool`, khóa nút "Bắt đầu chọn món" và hiện banner cảnh báo khi rỗng pool / `NO_ELIGIBLE_FOOD`; `gm25ReviewFeedback.test.tsx` (P6) pass. | **Pass** |
| **AC6** | Đầu vào/đầu ra và cách kiểm được ghi trong HANDOFF.md; reviewer đối chiếu revision thật. | Chi tiết bàn giao, danh sách artifact, hướng dẫn cấu hình thiết bị di động thật và ma trận kiểm thử được ghi đầy đủ tại [HANDOFF.md](HANDOFF.md). | **Pass** |

---

## 4. Ma trận kiểm thử Android–API (Mobile-API Matrix)

| Producer API / Case | Thiết bị / Môi trường | Thao tác & Endpoint | Expected State | Actual & Artifacts | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| GM-16 Session | Expo Android / Jest harness | `restoreSession()` không token | Đọc session từ `SessionManager` persistent storage | `gm25ReviewFeedback.test.tsx` (P1) pass | **Pass (automated)** |
| GM-10 Preferences Taxonomy | Jest harness | `defaultPreferenceCatalogue` | Cuisines & categories mang authoritative UUIDs | `gm25ReviewFeedback.test.tsx` (P2) pass | **Pass (automated)** |
| GM-11 Lobby Conflict & Polling | Jest harness | `runWrite('ready')` gặp conflict | Tự động đọc lại snapshot mới và cập nhật version | `gm25ReviewFeedback.test.tsx` (P3) pass | **Pass (automated)** |
| GM-11 Durable Request ID & Idempotency | Jest harness | Retry khi timeout vs hành động mới | Giữ nguyên requestId khi lỗi mạng; cấp id mới cho intent mới | `gm25ReviewFeedback.test.tsx` (P4) pass | **Pass (automated)** |
| Composition Root Strict Real Mode | Jest harness | `RoomRepositoryProvider` (real không key) | Quăng lỗi cấu hình rõ ràng, không fallback | `gm25ReviewFeedback.test.tsx` (P5) pass | **Pass (automated)** |
| GM-19 Pool Eligibility Guard | Jest harness | `previewFoodPool` trả rỗng | Start button disabled, hiện thông báo bối cảnh | `gm25ReviewFeedback.test.tsx` (P6) pass | **Pass (automated)** |
| 2 điện thoại thật qua Supabase LAN | Thiết bị Android vật lý + Expo Go | Điền `EXPO_PUBLIC_SUPABASE_URL` trỏ IP máy chủ nội bộ | Hai máy nhìn thấy nhau qua backend thật | Chờ reviewer (Trí) thực hiện kiểm chứng thiết bị theo [HANDOFF.md](HANDOFF.md) | **Not run (Chờ nghiệm thu vật lý)** |

---

## 5. Giới hạn và ghi chú

- Toàn bộ 23 test suites / 635 test cases Jest và 550 tests Python đạt 100% Pass.
- Các yêu cầu kiểm thử trên 2 thiết bị Android vật lý qua mạng LAN được ghi rõ trạng thái **Not run** để Trí nghiệm thu thực tế theo [HANDOFF.md](HANDOFF.md), đảm bảo tuân thủ nghiêm ngặt quy định DoD của dự án.
- Quyết định phê duyệt cuối cùng và chuyển trạng thái issue/card trên Project thuộc quyền hạn của chủ dự án Trí (`ThanhTris`) theo ADR-013.
