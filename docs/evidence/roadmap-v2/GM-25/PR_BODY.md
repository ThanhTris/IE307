## Task và phạm vi

- **Task**: GM-25 roadmap-v2 — UI–BE: nối Home, context, preferences và lobby.
- **Related Issue**: [#86](https://github.com/ThanhTris/IE307/issues/86)
- **Task spec**: `tasks/backlog/GM-25.md`
- **Owner**: Trang (`rosy179`), **Reviewer**: Trí (`ThanhTris`).
- **Contract version**: `food-v1/roadmap-v2/GM-25.1`, schema `0.3.0` (GM-19) / `0.4.0` (GM-21).
- **Branch**: `continue_task_gm_twenty_five` → `main`.
- **Mục tiêu & Scope**:
  - Thay mock adapter bằng `LiveRoomRepository` kết nối API RPC backend thật ở luồng: Home (`/`) → Tạo phòng (`/create-room`) / Vào phòng (`/join-room`) → Biên nhận (`/room-preview`) → Bối cảnh (`/gm10/context`) → Khẩu vị (`/gm10/preferences`) → Phòng chờ (`/gm11/lobby`) → Sẵn sàng (`setReady`) → Bắt đầu chọn món (`startRound`).
  - Giữ nguyên toàn bộ layout UI có sẵn; production mode dùng `LiveRoomRepository` sạch sẽ, không import/fallback fixture mock.
  - Quản lý phiên khách tự động và khôi phục token qua `SecureStore` tại composition root (`RoomRepositoryProvider`).
  - Tạo harness kiểm tra luồng trực quan chuyên dụng trên app tại `/internal/gm25` (`Gm25FlowCheckScreen`).
  - Ngoài scope: Voting và finalization (thuộc GM-20/GM-26); social chat/bạn bè (GM-22/28); native build release (GM-31).

---

## Start gate — Trước viết phần độc lập

- [x] Đã nhận đủ các start dependencies trên `main`:
  - GM-07: `mobile/src/data/api/contracts.ts` (DTOs, client interfaces, error codes).
  - GM-09: `mobile/src/features/home/screens/HomeScreen.tsx`.
  - GM-10: `mobile/src/features/context/screens/ContextScreen.tsx`, `PreferencesScreen.tsx`.
  - GM-11: `mobile/src/features/rooms/screens/LobbyScreen.tsx`.
  - GM-16: `mobile/src/data/auth/session.ts` (GoTrue session, secure storage).
  - GM-19: `supabase/migrations/0019_room_lifecycle.sql` (9 RPCs room lifecycle).
  - GM-21: `supabase/migrations/0021_history.sql` (History RPCs & consent).
- [x] Không thêm dependency/package native mới ngoài Expo baseline 57.0.30.

---

## Merge gate — Trí đối chiếu lại trước merge

| Dependency | Upstream PR / commit trên main | Project / Artifacts |
| --- | --- | --- |
| GM-07 | PR #104, `0711782`; PR #105, `9f71bba` | Done trên Project; contracts GM-07.1 có trên base |
| GM-09 | PR #121, `30ecb56` | Done trên Project; HomeScreen có trên base |
| GM-10 | PR #122, `58b2849` | Done trên Project; Context & Preferences screens có trên base |
| GM-11 | `1862c86` | Done trên Project; LobbyScreen có trên base |
| GM-16 | `1862c86` | Done trên Project; Auth session & transport có trên base |
| GM-19 | `1862c86` | Done trên Project; Migration 0019 có trên base |
| GM-21 | `1862c86` | Done trên Project; Migration 0021 có trên base |
| GM-24 | Đang thực hiện | Làm trước phần độc lập theo ADR-006; location fallback an toàn |

- [ ] Target ref `origin/main` (`daa9174`).
- [ ] Chạy lại `python scripts/task_readiness.py --task GM-25 --gate merge --base-ref origin/main`.
- [ ] Reviewer Trí kiểm tra commit, code thực tế và nghiệm thu trên thiết bị thật theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).

---

## AC và Verification

| AC | Nội dung yêu cầu | Bằng chứng kiểm tra | Trạng thái |
| --- | --- | --- | --- |
| **AC1** | Đạt kiểm Android–API đúng scope trong ma trận mobile; composition root nối GoTrue session thật và API client RPC. | `LiveRoomRepository` kết nối `createAuthenticatedApiClient()`; 10/10 tests trong `roomRepository.test.ts` pass, 20/20 test suites mobile pass. | **Pass (automated)** |
| **AC2** | Không viết lại layout; production mode không import/fallback fixture; feature config chỉ chọn adapter ở composition root. | Giữ nguyên layout gốc; `RoomRepositoryProvider` phân tách `real` và `mock`; screens dùng DI qua context. | **Pass** |
| **AC3** | Auth/session/validation/error, consent/history/avoidRecent và context/pool version thực tế đúng. | `LiveRoomRepository` quản lý session restore, auto-create guest session, update context, update preferences, preview food pool với version tracking chặt chẽ. | **Pass** |
| **AC4** | Nhiều máy nhận cùng snapshot, reset ready khi context/roster/consent đổi; expired/full/cancel handled. | Server đồng bộ snapshot và reset ready khi bối cảnh đổi. Xử lý chuẩn `ROOM_EXPIRED`, `CANCELLED`, `ROOM_FULL`. | **Pass** |
| **AC5** | Out-of-coverage/unknown/empty trả lý do server và sửa bối cảnh; không start pool rỗng. | Trả về lý do `NO_ELIGIBLE_FOOD`, `OUT_OF_COVERAGE`; UI vô hiệu hóa nút bắt đầu nếu pool rỗng hoặc chưa đủ ready. | **Pass** |
| **AC6** | Đầu vào/đầu ra và cách kiểm được ghi trong HANDOFF.md; reviewer đối chiếu revision thật. | Chi tiết bàn giao, danh sách artifact, hướng dẫn cấu hình thiết bị di động thật ghi tại `docs/evidence/roadmap-v2/GM-25/HANDOFF.md`. | **Pass** |

### Kết quả kiểm tra toàn hệ thống:
- [x] `cd mobile; npm test`: **20/20 test suites passed, 576/576 tests passed** (Jest 46.38s).
- [x] `cd mobile; npm run typecheck`: **0 errors** (`tsc --noEmit`).
- [x] `cd mobile; npm run lint`: **0 errors** (`eslint .`).
- [x] `cd mobile; npm run check:architecture`: **Boundaries OK**.
- [x] `cd mobile; npm run check:expo`: **Dependencies are up to date (Expo SDK 57.0.30)**.
- [x] `python scripts/validate_repository.py`: **Documents, links, JSON, task manifest OK**.
- [x] `python -m unittest discover -s tests -p "test_*.py"`: **550 tests passed, OK** (103.74s).
- [x] `python scripts/task_readiness.py --check-docs`: **Task indexes match task metadata**.
- [x] `git diff --check`: **Clean, 0 whitespace errors**.

---

## Artifact bàn giao roadmap-v2

| Artifact thực tế | Version | Trách nhiệm |
| --- | --- | --- |
| `mobile/src/features/rooms/services/roomRepository.ts` | GM-25.1 | `LiveRoomRepository` thực hiện 12 RPC methods, error normalization, request ID derivation |
| `mobile/src/features/rooms/index.ts` | GM-25.1 | Re-export các room services, hooks và screens |
| `mobile/src/bootstrap/RoomRepositoryProvider.tsx` | GM-25.1 | Context provider quản lý session, toggle real/mock adapter ở composition root |
| `mobile/src/bootstrap/AppProviders.tsx` | GM-25.1 | Wrap ứng dụng với `RoomRepositoryProvider` |
| `mobile/src/features/rooms/screens/Gm25FlowCheckScreen.tsx` | GM-25.1 | Màn hình kiểm tra luồng tích hợp UI-BE chuyên dụng trên app |
| `mobile/src/app/internal/gm25.tsx` | GM-25.1 | Route `/internal/gm25` cho Flow Check Screen |
| `mobile/src/app/create-room.tsx` | GM-25.1 | Route tạo phòng nối live repository |
| `mobile/src/app/join-room.tsx` | GM-25.1 | Route vào phòng nối live repository |
| `mobile/src/app/room-preview.tsx` | GM-25.1 | Route biên nhận vào phòng nối live repository |
| `mobile/src/app/gm10/context.tsx` | GM-25.1 | Route bối cảnh nối live repository với `roomId` |
| `mobile/src/app/gm10/preferences.tsx` | GM-25.1 | Route khẩu vị nối live repository với `roomId` |
| `mobile/src/app/gm11/lobby.tsx` | GM-25.1 | Route phòng chờ nối live repository với `roomId` |
| `mobile/src/features/rooms/screens/LobbyScreen.tsx` | GM-25.1 | Dual-mode: live repository cho sản phẩm + mock client cho demo/test GM-11 |
| `mobile/tests/unit/roomRepository.test.ts` | GM-25.1 | 10 unit tests bao phủ toàn bộ phương thức RPC và kịch bản lỗi |
| `docs/evidence/roadmap-v2/GM-25/CHECKS.md` | GM-25.1 | Báo cáo kiểm chứng đầy đủ các AC và ma trận mobile-API |
| `docs/evidence/roadmap-v2/GM-25/HANDOFF.md` | GM-25.1 | Tài liệu bàn giao và hướng dẫn cấu hình thiết bị Android thật |

---

## Review cuối — Trí

- [ ] Reviewer Trí (`ThanhTris`) kiểm tra AC, cả hai gate và evidence trên thiết bị/revision thực tế theo [ADR-013](../../../architecture/decisions/ADR-013-project-owner-final-review.md).
- [ ] Trí cập nhật trạng thái nghiệm thu / Done trên GitHub Project #2.
