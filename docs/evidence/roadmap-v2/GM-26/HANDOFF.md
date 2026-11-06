# Bàn giao đầu ra task — GM-26 / roadmap-v2

## Current local handoff — 2026-11-06

Source: PR #156 branch `issue87_figma_ui_gm26`, baseline `a52e638fd483fe39098d982eed0a89b78afeae27` plus the final waiting/identity correction. Owner Trang / reviewer Trí are unchanged. Receive the complete patch rather than only one round's hook.

- The route/provider supplies identity; R1/R2 scope draft, intent, receipt and waiting-request state by identity + room + round + poolVersion. Room version remains part of the captured command payload, not the storage key. Ambiguous retries retain that payload.
- ACK and waiting are separate steps. Snapshot-confirmed ACK resumes waiting once automatically; an error keeps ACK and exposes waiting retry. State/round changes are received through accepted snapshots. The server supplies the deadline and remains the authority for transitions and results.
- Waiting retry preserves the complete request, including `expectedVersion`, across newer snapshots. Only an ACK or confirmed conflict replaces that request. Host UI compares the authenticated identity with `hostUserId`; permission to finish waiting still comes from `canEndWaiting`.
- Context generations block late callbacks after room/account changes; the shared read-order guard prevents older snapshots from replacing newer state. Logout clears private in-memory state. Process-restart recovery uses server snapshots; disk outbox work remains GM-31.
- `priceLabel.ts` preserves currency and unit for all GM-26 card/outcome price labels; `menu_item_unspecified` is shown as unknown unit, never inferred as portion/person. Required missing metadata hides the price.
- Successful lobby Start now routes to R1. `NOT_ENOUGH_MEMBERS` is preserved by the API error mapper and has a user-facing explanation.
- Receive `voteSessionState.ts` with both hooks and route identity wiring. GM-27 receives server result navigation; GM-31 may replace the memory storage later while retaining scope and request replay semantics.

Validation: 43 focused regressions and the full 65-suite / 1,104-test mobile run pass; typecheck, lint on touched files and architecture pass. The final run has no `overlapping act()` warning after awaiting test cleanup/unmount. Earlier Docker runners cover 152 baseline HTTP cases, 178 canonical HTTP cases, 102 SQL/domain vectors and 2 consumer-hook cases on owned schema 0.16.0 QA. Android emulator with Expo Go used real QA Auth+REST for guest login, room start, R1 ballot ACK, timeout/worker transition and R2 ballot/REMOVE; DB finalized the room as `DECIDED`. The app then reached the existing result placeholder, so the result consumer remains a GM-27 gap. The automatic lobby-to-R1 fix passed the Expo Router integration test but was not rerun against a fresh QA room on Android. R2 N=1/ALL_REMOVED and N=10/stable Top 3 also pass canonical QA runner ACK recovery and waiting replay/deadline checks. The final waiting/identity correction adds consumer regression evidence; API/Android were not rerun for that correction. See [current checks](CHECKS.md). This QA run did not modify the application database. Visual screenshot review and physical-device evidence remain Not run. Both voting screens use `react-native-safe-area-context` and no longer emit the React Native core SafeAreaView deprecation warning.

## Historical handoff received with PR head d86be40

The baseline below is retained for traceability. Its schema/dataset/SDK versions, test counts and device instructions are historical; use the current producer manifest for a real QA run.

Task / owner / reviewer / track / stage: GM-26 / Trang (`rosy179`) / Trí (`ThanhTris`) / INTEGRATION / integration
PR / branch / target / tested source: Issue #87 / `issue87_figma_ui_gm26` -> `origin/main` (`c5b2b07`); local branch `issue87_figma_ui_gm26`
Contract version / schema version / dataset version: `ui-figma-final/2026-10-25/GM-26.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement` / schema `0.3.0` (GM-19) / dataset `food-v1`
CHECKS.md / FIGMA_PARITY.md: [CHECKS.md](CHECKS.md) / [FIGMA_PARITY.md](FIGMA_PARITY.md)

---

## 1. File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/voting/services/voteRepository.ts` | GM-26 | GM-26.2 | `import { LiveVoteRepository, createLiveVoteRepository, MockVoteRepository, createMockVoteRepository } from '@/features/voting'` | Interface `VoteRepository` thống nhất gọi các RPC `dish_session` v4: `submitBallot`, `enterWaiting`, `finalize`, `getSnapshot`. Xử lý idempotency cache, request ID bền vững, và chuẩn hóa lỗi | GM-27, GM-31, App Shell |
| `mobile/src/app/room/vote.tsx` | GM-26 | GM-26.2 | Route `/room/vote` ở real mode | Tích hợp `createLiveVoteRepository(api)` vào `VoteScreen`, kết nối luồng bỏ phiếu Vòng 1 thật qua Supabase RPC | UI Consumer, App Shell |
| `mobile/src/app/room/final-round.tsx` | GM-26 | GM-26.2 | Route `/room/final-round` ở real mode | Tích hợp `createLiveVoteRepository(api)` vào `FinalRoundScreen`, kết nối luồng chọn lọc Vòng 2 thật qua Supabase RPC | UI Consumer, App Shell |
| `mobile/src/features/voting/hooks/useRoundOneVoting.ts` | GM-26 | GM-26.2 | Hook `useRoundOneVoting` | Quản lý state bỏ phiếu R1, kiểm tra điều kiện nút nộp phiếu, gọi `repository.submitBallot`, đếm ngược waiting 60s, guard `isHostEarlyFinishAllowed` khi $A_r > M/2$ | UI Consumer |
| `mobile/src/features/voting/hooks/useRoundTwoVoting.ts` | GM-26 | GM-26.2 | Hook `useRoundTwoVoting` | Quản lý state Vòng 2, áp dụng trần loại Cap 30% `max(1, floor(0.30 * N))`, gọi `repository.submitBallot` cho R2, host finalize khi $A_r > M/2$ | UI Consumer |
| `mobile/src/features/voting/screens/VoteScreen.tsx` | GM-26 | GM-26.2 | Component `VoteScreen` | Màn hình Vòng 1 đáp ứng 2 Figma nodes (`330:3071`, `330:3072`): flashcard, danh sách món, waiting modal đếm ngược 60s, nút Chốt ngay phân quyền Host | UI Consumer |
| `mobile/src/features/voting/screens/FinalRoundScreen.tsx` | GM-26 | GM-26.2 | Component `FinalRoundScreen` | Màn hình Vòng 2 đáp ứng 3 Figma nodes (`330:3073`, `330:3074`, `638:9369`): danh sách ứng viên sống sót, Cap 30%, retry khi lỗi, hỗ trợ $N=1$ món duy nhất và cảnh báo ALL_REMOVED | UI Consumer |
| `mobile/src/data/api/contracts/common.ts` | GM-26 | GM-26.2 | TypeScript definitions | Bổ sung mã lỗi `'REMOVE_LIMIT'` vào `ErrorCode` union | Toàn bộ repo |
| `mobile/src/data/api/contracts/rooms.ts` | GM-26 | GM-26.2 | TypeScript definitions | Bổ sung `'WAITING_1' \| 'WAITING_2'` vào `RoomState` union | Toàn bộ repo |
| `mobile/src/features/rooms/services/roomEntry.ts` | GM-26 | GM-26.2 | Error copy lookup | Bổ sung bản dịch tiếng Việt cho mã lỗi `REMOVE_LIMIT` | UI Consumer |
| `mobile/tests/unit/voteRepository.test.ts` | GM-26 | GM-26.2 | `npm test -- tests/unit/voteRepository.test.ts` | 25 unit tests kiểm tra toàn diện `LiveVoteRepository` và `MockVoteRepository`: submit R1/R2 canonical wire format (`{ roundDishId, choice }`), waiting, finalize, idempotency, retry, timeout, error mapping, durable requestId mismatch rejection (F6), malformed envelope guards (F7), truthful snapshot mapping (R3) | CI / Test Suite |
| `mobile/tests/component/gm26FigmaParity.test.tsx` | GM-26 | GM-26.2 | `npm test -- tests/component/gm26FigmaParity.test.tsx` | 7 component tests bao phủ 5 Figma nodes (`330:3071`, `330:3072`, `330:3073`, `330:3074`, `638:9369`) | CI / Test Suite |
| `mobile/tests/component/votingScreens.test.tsx` | GM-26 | GM-26.2 | `npm test -- tests/component/votingScreens.test.tsx` | 29 component tests kiểm tra các trường hợp biên của VoteScreen và FinalRoundScreen (bao gồm 6 audit tests R1, R2, R4, R5, R6, R7) | CI / Test Suite |
| `docs/evidence/roadmap-v2/GM-26/FIGMA_PARITY.md` | GM-26 | GM-26.2 | Đọc tài liệu đối chiếu | Báo cáo chi tiết ma trận đối chiếu 5 Figma nodes, kiến trúc dữ liệu và quy tắc nghiệp vụ | Reviewer, Audit |

---

## 2. Acceptance criteria và trạng thái

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| **AC1: Đạt kiểm Android-API** | **Not run** | Android thật + backend test; xem [CHECKS.md](CHECKS.md) | Chưa kết nối thiết bị ADB hoặc backend staging từ xa. | Jest giả lập chứng minh tính tương thích contract, chưa thay cho kiểm thử thiết bị vật lý. |
| **AC2: Giữ nguyên layout UI Figma, không fallback fixture ở production** | **Pass (code path & test) / Not run (Android)** | Route guard và live repository; xem [FIGMA_PARITY.md](FIGMA_PARITY.md) | 7/7 Figma parity tests và 29 voting screen tests pass (toàn bộ 62 test suites / 1.059 tests pass); routes `/room/vote` và `/room/final-round` inject `LiveVoteRepository`. | Cần kiểm tra hiển thị thực tế trên thiết bị vật lý ở các kích thước viewport. |
| **AC3: Auth/session/validation/error, ballot ACK đúng thực tế** | **Pass (synthetic session tests) / Not run (GoTrue thật)** | `voteRepository.test.ts`, `gm26FigmaParity.test.tsx` | Kiểm tra request ID bền vững, stable idempotency cache, xử lý lỗi `REMOVE_LIMIT`, `NOT_HOST`, `NOT_READY`, `VOTE_CLOSED`. | Chưa kiểm thử trên máy chủ GoTrue trực tiếp. |
| **AC4: Waiting 60s và Host chốt sớm đúng quorum** | **Pass (contract & UI) / Not run (multi-client thật)** | `voteRepository.test.ts`, `gm26FigmaParity.test.tsx` | Đồng hồ 60s đếm ngược từ thời điểm người đầu tiên vào waiting; nút Chốt ngay chỉ kích hoạt khi $A_r > M/2$; reconnect không đổi roster M hoặc gia hạn. | Cần kiểm thử thời gian thực giữa 2 máy thật. |
| **AC5: Cap 30% Vòng 2 và hỗ trợ N=1 món duy nhất** | **Pass (contract & UI) / Not run (server thật)** | `gm26FigmaParity.test.tsx`, `votingScreens.test.tsx` | Công thức `max(1, floor(0.30 * N))` thực thi nghiêm ngặt; $N=1$ có cap=1 và cho phép Loại, kết thúc với ALL_REMOVED nếu loại hết. | Chưa có backend staging trực tiếp. |
| **AC6: Đầu vào/đầu ra và cách kiểm ghi trong HANDOFF.md** | **Pass (documentation)** | Tài liệu này và [FIGMA_PARITY.md](FIGMA_PARITY.md) | Ghi rõ cấu hình, file bổ sung và kịch bản 2 máy kiểm tra thực tế. | Đầy đủ tài liệu bàn giao. |

---

## 3. Hướng dẫn cấu hình và nghiệm thu trên điện thoại Android thật

Để kiểm tra luồng tích hợp, dùng ít nhất một điện thoại Android thật (Host) và một client thứ hai (Member) với hai danh tính (identity) riêng biệt:

### 3.1. Cấu hình biến môi trường
Tạo file `mobile/.env.local`:
```ini
EXPO_PUBLIC_SUPABASE_URL=https://<SUPABASE_TEST_HOST>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Khi dùng backend Supabase local qua USB, dùng reverse tunnel:
```powershell
adb reverse tcp:54321 tcp:54321
# Khi kiểm xong
adb reverse --remove tcp:54321
```

```ini
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### 3.2. Khởi chạy ứng dụng
1. Khởi động backend Supabase test hoặc local:
   ```powershell
   npx supabase start
   ```
2. Khởi động Expo Metro Bundler:
   ```powershell
   cd mobile
   npx expo start --clear
   ```
3. Mở app trên 2 thiết bị bằng Expo Go hoặc development build.

### 3.3. Kịch bản kiểm thử 2 máy (Host & Member) theo 5 Figma Nodes

#### Giai đoạn 1: Vòng 1 — Chọn món & Gửi phiếu (Figma Node `330:3071`)
1. **Host** tạo phòng với 10 món, **Member** nhập mã vào phòng. Host bấm "Bắt đầu chọn món" trên `/room/lobby`. Cả 2 máy được điều hướng vào `/room/vote`.
2. **Quan sát Flashcard & Nút Gửi**:
   - Nút "Gửi phiếu" ban đầu bị vô hiệu hóa (`disabled={true}`).
   - Host và Member lần lượt đánh giá từng món bằng cử chỉ hoặc nút bấm:
     - Vuốt phải hoặc bấm "Ăn được (OK)"
     - Chạm 2 lần hoặc bấm "Muốn ăn (WANT)"
     - Vuốt trái hoặc bấm "Không ăn (NO)"
3. **Nộp phiếu Vòng 1**:
   - Khi hoàn thành đánh giá món cuối cùng (10/10 thẻ), nút "Gửi phiếu" chuyển sang trạng thái sẵn sàng.
   - Bấm "Gửi phiếu": Nút chuyển sang "Đang gửi phiếu…", gửi request ID duy nhất lên server. Khi server trả ACK, màn hình khóa tương tác và chuyển sang trạng thái chờ.

#### Giai đoạn 2: Chờ Vòng 1 & Kiểm tra Quorum Chốt ngay (Figma Node `330:3072`)
1. **Quan sát Đồng hồ Chờ**:
   - Máy đầu tiên nộp phiếu (ví dụ: Member) kích hoạt đồng hồ đếm ngược 60 giây.
   - Cả 2 máy hiển thị số người đã hoàn thành: `1/2 thành viên đã xong`.
2. **Kiểm tra Quorum $A_r > M/2$**:
   - Với phòng $M=2$ người, ngưỡng quá nửa là $A_r \ge \lfloor 2/2 \rfloor + 1 = 2$.
   - Khi chỉ có 1 người nộp ($1 = 2/2$): Nút "Chốt ngay · Kết thúc chờ sớm" của Host bị vô hiệu hóa hoặc bị chặn với thông báo chưa đủ quorum.
   - Member hoàn toàn không thấy nút Chốt ngay.
3. **Đạt Quorum**:
   - Host nộp phiếu tiếp theo ($A_r = 2/2$ đạt $2 > 1$). Nút "Chốt ngay" của Host sáng lên và có thể bấm.
   - Host bấm "Chốt ngay": Server finalize Vòng 1, tính điểm và lọc ra các món sống sót (loại trừ các món bị vote NO). Cả 2 máy nhận transition và chuyển sang `/room/final-round`.

#### Giai đoạn 3: Vòng 2 — Pool còn lại & Giới hạn loại Cap 30% (Figma Node `330:3073`)
1. **Quan sát Danh sách Sống sót**:
   - Giả sử còn $N=4$ món sống sót sau Vòng 1.
   - Hệ thống áp dụng Cap 30%: $\text{cap} = \max(1, \lfloor 0.30 \times 4 \rfloor) = 1$ món.
   - Thanh tiêu đề hiển thị: `Bạn được loại tối đa 1 món`.
   - Tất cả 4 món mặc định ở trạng thái `✓ GIỮ`.
2. **Kiểm tra Giới hạn Loại**:
   - Bấm nút "Loại" ở món thứ nhất: Món này chuyển thành `✕ ĐÃ LOẠI`. Counter hiển thị `Đã chọn loại: 1/1 món (Tối đa 1)`.
   - Các nút "Loại" ở 3 món còn lại tự động bị vô hiệu hóa (`disabled={true}`), không thể chọn vượt trần.
   - Bấm "Chọn giữ tất cả": Toàn bộ 4 món được đặt lại về `✓ GIỮ`, counter về `0/1 món`.
3. **Nộp phiếu Vòng 2**:
   - Chọn loại 1 món, sau đó bấm "Xác nhận nộp Vòng 2".
   - SheetDialog xuất hiện tóm tắt: `✓ Giữ lại: 3 món`, `✕ Đã loại: 1 / 1 món tối đa`.
   - Bấm "Chốt phiếu ngay" để hoàn tất.

#### Giai đoạn 4: Chờ Vòng 2, Xử lý lỗi & Kết thúc (Figma Node `330:3074`)
1. **Kiểm tra Retry khi mất mạng**:
   - Tắt kết nối mạng trước khi bấm chốt phiếu: Màn hình hiển thị thông báo lỗi mạng kèm nút "Thử lại nộp phiếu Vòng 2".
   - Bật lại mạng và bấm "Thử lại": Lựa chọn giữ nguyên, gửi lại với cùng request ID, nhận ACK thành công.
2. **Chốt kết quả**:
   - Host bấm kết thúc sớm khi đủ quorum $A_r > M/2$, hoặc đồng hồ 60s hết giờ: Server tính toán món thắng cuộc và chuyển tiếp sang màn hình kết quả `/room/result`.

#### Giai đoạn 5: Vòng 2 với 1 món duy nhất (Figma Node `638:9369`)
1. Kịch bản Vòng 1 chỉ có đúng $N=1$ món sống sót (các món khác đều bị ít nhất 1 người vote NO).
2. Hệ thống vẫn mở Vòng 2 với $\text{cap} = \max(1, \lfloor 0.30 \times 1 \rfloor) = 1$.
3. Cả Host và Member chọn "✕ Đã loại":
   - SheetDialog cảnh báo màu đỏ: `⚠ Chú ý: Bạn đang chọn LOẠI TẤT CẢ các món`.
   - Cả 2 người nộp phiếu loại: Phiên kết thúc với trạng thái `NO_CONSENSUS / ALL_REMOVED`, không bao giờ mở Vòng 3.
