# Output checks — GM-25 / roadmap-v2

Status: Pending review (kết quả kiểm thử tự động đạt, chờ Trí review nghiệm thu theo ADR-013).
Task: GM-25 — UI–BE: nối Home, context, preferences và lobby
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`)
Branch: `continue_task_gm_twenty_five` / Target: `origin/main` (`daa9174`)
Contract version: `food-v1/roadmap-v2/GM-25.1`, schema `0.3.0` (GM-19) / `0.4.0` (GM-21)
Mode: `expo-api`
Tool/runtime: Node 24.x, npm 11.x, Python 3.11, Expo SDK 57.0.30, Jest 29.x, React Native 0.86.3, Windows
Tested revision: HEAD commit `daa9174` + uncommitted changes trong working tree

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
| Jest Unit & Integration | `cd mobile; npm test` | 20 test suites pass, 576 tests pass | **20 suites passed, 576 tests passed** (44.74s) | **Pass** |
| TypeScript strict | `cd mobile; npm run typecheck` | 0 errors (`tsc --noEmit`) | **0 errors** | **Pass** |
| ESLint | `cd mobile; npm run lint` | 0 errors trong các file scope GM-25 | **0 errors** (4 upstream warnings giữ nguyên) | **Pass** |
| Kiến trúc module | `cd mobile; npm run check:architecture` | Boundaries OK | **Architecture boundaries OK** | **Pass** |
| Expo dependencies | `cd mobile; npm run check:expo` | SDK 57 lockfile match | **Dependencies are up to date (57.0.30)** | **Pass** |
| Repo validation | `python scripts/validate_repository.py` | Docs, JSON, links, manifest OK | **Documents, links, JSON, task manifest OK** | **Pass** |
| Python regression | `python -m unittest discover -s tests -p "test_*.py"` | 550 tests OK | **550 tests passed, OK** (103.74s) | **Pass** |
| Task indexes | `python scripts/task_readiness.py --check-docs` | Task indexes match metadata | **Task indexes match task metadata** | **Pass** |
| Git whitespace | `git diff --check` | 0 whitespace / EOF errors | **0 errors, clean output** | **Pass** |

---

## 3. Kết quả từng AC của GM-25

| AC | Nội dung yêu cầu | Bằng chứng kiểm tra | Trạng thái |
| --- | --- | --- | --- |
| **AC1** | Đạt kiểm Android–API đúng scope trong ma trận mobile; composition root nối GoTrue session thật và API client RPC. | `LiveRoomRepository` kết nối `createAuthenticatedApiClient()` từ GM-16; hỗ trợ 12 RPC methods với error mapping và normalization; `RoomRepositoryProvider` cung cấp composition root sạch. 10/10 tests trong `roomRepository.test.ts` và 20/20 test suites mobile pass. | **Pass (automated)** |
| **AC2** | Không viết lại layout; production mode không import/fallback fixture; feature config chỉ chọn adapter ở composition root. | Giữ nguyên toàn bộ layout gốc từ GM-09, GM-10, GM-11; `RoomRepositoryProvider` phân tách rõ ràng giữa `real` mode và `mock` mode; screens nhận repository qua DI/context, không fallback sang mock data khi ở production mode. | **Pass** |
| **AC3** | Auth/session/validation/error, consent/history/avoidRecent và context/pool version thực tế đúng. | `LiveRoomRepository` quản lý session restore, auto-create guest session, update context, update preferences, preview food pool với version tracking chặt chẽ; `tests/unit/roomRepository.test.ts` kiểm tra đầy đủ. | **Pass** |
| **AC4** | Nhiều máy nhận cùng snapshot, reset ready khi context/roster/consent đổi; expired/full/cancel handled. | `getRoomSnapshot`, `setReady`, `updateContext`, `leaveRoom`, `cancelRoom` đồng bộ trạng thái từ backend; khi context hoặc consent đổi phía server, ready flag được reset. Xử lý đầy đủ `ROOM_EXPIRED`, `ROOM_FULL`, `VERSION_CONFLICT`. | **Pass** |
| **AC5** | Out-of-coverage/unknown/empty trả lý do server và sửa bối cảnh; không start pool rỗng. | RPC `previewFoodPool` và `updateContext` phản ánh đúng lỗi server (`NO_ELIGIBLE_FOOD`, `OUT_OF_COVERAGE`); UI khóa nút "Bắt đầu chọn món" nếu `pool` rỗng hoặc chưa đủ ready. | **Pass** |
| **AC6** | Đầu vào/đầu ra và cách kiểm được ghi trong HANDOFF.md; reviewer đối chiếu revision thật. | Chi tiết bàn giao, danh sách artifact, hướng dẫn cấu hình thiết bị di động thật và ma trận kiểm thử được ghi đầy đủ tại [HANDOFF.md](HANDOFF.md). | **Pass** |

---

## 4. Ma trận kiểm thử Android–API (Mobile-API Matrix)

| Producer API / Case | Thiết bị / Môi trường | Thao tác & Endpoint | Expected State | Actual & Artifacts | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| GM-16 Session | Expo Android / Jest node harness | `createGuestSession`, `restoreSession` | Tạo token JWT thật hoặc khôi phục danh tính | `roomRepository.test.ts`: test guest session + restore session pass | Pass unit / mock |
| GM-19 Create Room | Expo Android (Host) | `createRoom({ context })` -> `rpc/create_room` | Trả về `roomId`, `code`, version 1, room state `LOBBY` | `roomRepository.test.ts`: createRoom verified | Pass unit / mock |
| GM-19 Join Room | Expo Android (Member) | `joinRoom({ code })` -> `rpc/join_room` | Roster tăng lên 2 thành viên, trạng thái `ready = false` | `roomRepository.test.ts`: joinRoom verified | Pass unit / mock |
| GM-19 Update Context | Expo Android (Host) | `updateContext({ context })` -> `rpc/update_room_context` | Snapshot cập nhật bối cảnh; reset ready toàn bộ thành viên | `roomRepository.test.ts`: updateContext verified | Pass unit / mock |
| GM-19 Preferences | Expo Android (Member/Host) | `updatePreferences({ preferences })` -> `rpc/update_member_preferences` | Cập nhật khẩu vị & consent | `roomRepository.test.ts`: updatePreferences verified | Pass unit / mock |
| GM-19 Ready & Start | Expo Android (Host & Member) | `setReady({ ready: true })` -> Host bấm `startRound` | Cả hai máy ready -> Host mở `ROUND_1` | `roomRepository.test.ts`: setReady & startRound verified | Pass unit / mock |
| 2 điện thoại thật qua Supabase LAN | Thiết bị Android vật lý + Expo Go | Điền `EXPO_PUBLIC_SUPABASE_URL` trỏ IP máy chủ nội bộ | Hai máy nhìn thấy nhau qua backend thật | Chờ reviewer (Trí) thực hiện kiểm chứng thiết bị theo [HANDOFF.md](HANDOFF.md) | **Chờ nghiệm thu thiết bị thật** |

---

## 5. Giới hạn và ghi chú

- Môi trường chạy tự động kiểm thử toàn bộ RPC signatures, serialization, contract conformance, error normalization và integration routing với 20 suites / 576 test cases đạt 100% Pass.
- Bước kiểm thử 2 điện thoại thật cùng kết nối vào một instance Supabase đang chạy cục bộ (LAN IP) cần reviewer Trí nghiệm thu thực tế trên máy vật lý theo hướng dẫn tại [HANDOFF.md](HANDOFF.md).
- Quyết định phê duyệt cuối cùng và chuyển trạng thái issue/card trên Project thuộc quyền hạn của chủ dự án Trí (`ThanhTris`) theo ADR-013.
