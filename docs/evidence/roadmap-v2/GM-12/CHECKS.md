# GM-12 Checks — UI Flashcard, Vòng hai, ACK và Chờ kết quả

- Task / Contract: GM-12 / `food-v1/roadmap-v2/GM-12.2` (ui-figma-final/2026-10-25)
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Branch: `complete_ui_task_seventy_three`
- Base revision: `7e24074` (origin/main)
- Upstream dependencies:
  - GM-05 (Shared UI Components): PR #142 (Done trên Project #2)
  - GM-07 (API Client Contracts & Mock): PR #138 (Done trên Project #2)
- Target deliverables:
  - `mobile/src/features/voting/screens/VoteScreen.tsx`
  - `mobile/src/features/voting/screens/FinalRoundScreen.tsx`
  - `mobile/src/features/voting/components/FlashcardDeckView.tsx`
  - `mobile/src/features/voting/components/CandidateKeepRemoveCard.tsx`
  - `mobile/src/features/voting/components/FinalRoundHeaderAndOutcome.tsx`
  - `mobile/src/features/voting/components/VoteScenarioAndStatusBanner.tsx`
  - `mobile/src/features/voting/hooks/useRoundOneVoting.ts`
  - `mobile/src/features/voting/hooks/useRoundTwoVoting.ts`
  - `mobile/src/features/voting/fixtures.ts`
  - `mobile/src/app/room/vote.tsx`
  - `mobile/tests/component/votingScreens.test.tsx`
- Environment: Windows, Node v22.11.0, npm 11.3.0, Expo SDK 58, React Native 0.88.0.

---

## 1. Kết quả kiểm tra tự động (Automated Test Suite)

| Case / AC | Lệnh thực thi | Đầu vào và Kỳ vọng | Kết quả thực tế / Assertion | Trạng thái |
|---|---|---|---|---|
| **R1 Flashcard Deck & Điều hướng thẻ** | `npm --prefix mobile test -- votingScreens.test.tsx -t "renders flashcard deck"` | Hiển thị thẻ món đầu tiên ($1/N$), thanh tiến trình, nút điều hướng thẻ Tiếp theo/Trước đó, nút Hoàn tác | 23 assertions passed; hiển thị chính xác tên món, hình ảnh, nhãn giá và vị trí thẻ hiện tại | **Pass** |
| **R1 Ba nút cử chỉ thay thế ($\ge 48\text{dp}$)** | `npm --prefix mobile test -- votingScreens.test.tsx -t "replaces gesture with explicit buttons"` | Ba nút `✕ Không ăn` (NO), `★ Muốn ăn` (WANT), `✓ Ăn được` (OK) hiển thị rõ ràng, touch target $\ge 48\text{dp}$, bấm chuyển thẻ tự động và cập nhật ballot | Pass; chọn từng nút cập nhật đúng lựa chọn NO/WANT/OK và chuyển sang thẻ tiếp theo | **Pass** |
| **R1 Chạm hai lần (Double-tap) đặt WANT** | `npm --prefix mobile test -- votingScreens.test.tsx -t "double-tap gesture"` | Chạm hai lần liên tiếp trong 300ms vào thẻ món ăn sẽ tự động gán nhãn WANT | Pass; double-tap cập nhật vote thành WANT thành công | **Pass** |
| **R1 Hoàn tác (Undo) trước nộp & Khóa sau nộp** | `npm --prefix mobile test -- votingScreens.test.tsx -t "allows undoing before submission and locks after ACK"` | Cho phép hoàn tác thẻ đã bình chọn trước khi nộp; sau khi nộp (pending hoặc ACK), toàn bộ tương tác và nút hoàn tác bị khóa cứng | Pass; undo quay lại thẻ trước và khôi phục lựa chọn; sau ACK nút nộp hiển thị "Đã nộp phiếu (Đã xác nhận)" và bị disabled | **Pass** |
| **R1/R2 Đồng hồ đếm ngược chờ 60 giây** | `npm --prefix mobile test -- votingScreens.test.tsx -t "countdown timer"` | Khi vào waiting sau ACK, đồng hồ đếm ngược từ 60 giây xuất hiện (`WAITING_DEADLINE_SECONDS = 60`) | Pass; hiển thị "Thời gian chờ còn lại: 60s" và đếm ngược ổn định | **Pass** |
| **Host Chốt ngay: Ngưỡng đa số $A_r > M/2$** | `npm --prefix mobile test -- votingScreens.test.tsx -t "host early finish threshold"` | Roster khóa 3 người ($M=3$): $1/3$ ACK $\implies$ Nút disabled; $2/3$ ACK $\implies$ Nút enabled. Thành viên thường không có quyền chốt | Pass; $1/3$ disabled, $2/3$ enabled; đúng yêu cầu làm rõ của chủ dự án ngày 2026-10-25 | **Pass** |
| **R2 Mở Vòng 2 thật sự khi $N=1$** | `npm --prefix mobile test -- votingScreens.test.tsx -t "renders round two with N=1"` | Kể cả còn duy nhất 1 ứng viên ($N=1$), hệ thống vẫn mở Vòng 2 thật sự cho phép người chơi REMOVE (Cap 1) hoặc KEEP | Pass; hiển thị giao diện Vòng 2 với $N=1$, Cap = 1 món tối đa; không auto-finalize trước biểu quyết | **Pass** |
| **R2 Giới hạn loại Cap 30% ($\max(1, \lfloor 0.30 \times N \rfloor)$)** | `npm --prefix mobile test -- votingScreens.test.tsx -t "enforces Cap 30%"` | Với $N=4$, $\text{Cap} = \max(1, \lfloor 1.2 \rfloor) = 1$. Khi đã loại 1 món, nút Loại của món thứ hai phải bị vô hiệu hóa | Pass; nút Loại món thứ hai bị disabled kèm thông báo "Đã đạt giới hạn loại (1 món)" | **Pass** |
| **R2 Xóa nút Loại tất cả; Giữ nút Giữ tất cả** | `npm --prefix mobile test -- votingScreens.test.tsx -t "provides safe keep all action"` | Không còn nút "Loại tất cả" gây vi phạm Cap; có nút "Giữ tất cả các món còn lại" an toàn | Pass; không tìm thấy nút "Loại tất cả"; nút "Giữ tất cả các món còn lại" hoạt động chính xác | **Pass** |
| **R2 SheetDialog xác nhận trước khi nộp** | `npm --prefix mobile test -- votingScreens.test.tsx -t "shows confirmation SheetDialog"` | Bấm nộp Vòng 2 mở SheetDialog tóm tắt số món giữ, số món loại và cảnh báo `ALL_REMOVED` nếu loại hết | Pass; SheetDialog xuất hiện đầy đủ thông tin tóm tắt và nút "Chốt phiếu ngay" | **Pass** |
| **R2 Payload gửi đúng KEEP/REMOVE** | `npm --prefix mobile test -- votingScreens.test.tsx -t "submits round 2 choices with KEEP/REMOVE"` | Payload Vòng 2 gửi `round: 2` và các vote `KEEP` / `REMOVE` (không map nhầm sang WANT/NO) | Pass; payload kiểm tra đúng 100% contract API v4 | **Pass** |
| **R2 Kịch bản lỗi và Thử lại** | `npm --prefix mobile test -- votingScreens.test.tsx -t "handles error and retry in round two"` | Lỗi mạng hiển thị banner đỏ và nút "Thử lại nộp phiếu Vòng 2" | Pass; retry gửi lại thành công và ghi nhận ACK | **Pass** |
| **Integration Test Routes** | `npm --prefix mobile test -- routes.test.tsx resultRoutes.test.tsx` | Kiểm tra điều hướng toàn bộ route `/room/vote`, `/room/result` và các luồng ứng dụng Expo Router | Pass; 29/29 route integration tests passed (Tổng 52 tests passed) | **Pass** |
| **TypeScript Strict Check** | `npm --prefix mobile run typecheck` | Kiểm tra strict types với `tsc --noEmit` trên toàn bộ source mobile | Exit code 0, 0 errors | **Pass** |
| **ESLint Check** | `npm --prefix mobile run lint` | Kiểm tra style và quy chuẩn import/unused trên toàn bộ source mobile | Exit code 0, 0 errors, 0 warnings | **Pass** |
| **Architecture Boundaries** | `npm --prefix mobile run check:architecture` | Kiểm tra ranh giới kiến trúc độc lập giữa các layer | "Architecture boundaries OK" | **Pass** |
| **Expo Dependencies Baseline** | `npm --prefix mobile run check:expo` | Kiểm tra tính tương thích lockfile và SDK 58 | Dependencies are up to date | **Pass** |
| **Android JS Bundle Export** | `npm --prefix mobile run bundle:android` | Xuất gói Android qua Metro bundler | 1,555 modules bundled, xuất `dist/android` thành công | **Pass** |
| **Repository Integrity & Docs** | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs` | Kiểm tra toàn vẹn liên kết tài liệu, indexes task và FR traceability | Task indexes match task metadata; Repository OK | **Pass** |

---

## 2. Kiểm thử thực tế trên thiết bị (Expo Go Android)

- **Trạng thái:** `Not run` (chờ chủ dự án Trí kiểm tra thực tế trên thiết bị).
- **Cách thức chạy để kiểm tra:**
  1. Chạy server phát triển Expo: `npm --prefix mobile run start`.
  2. Mở ứng dụng Expo Go trên điện thoại Android, quét mã QR hiển thị trên terminal hoặc truy cập trực tiếp `exp://<local-ip>:8081`.
  3. Điều hướng đến màn hình bình chọn: mở route `/room/vote`.
  4. Trải nghiệm:
     - Thử vuốt/bấm 3 nút `✕ Không ăn`, `★ Muốn ăn`, `✓ Ăn được` trên Flashcard.
     - Chạm hai lần (double-tap) vào thẻ món ăn để gán nhãn `★ Muốn ăn`.
     - Thử bấm nút "Hoàn tác lựa chọn trước" để quay lại thẻ trước đó.
     - Duyệt hết các thẻ món và bấm "Xác nhận nộp phiếu".
     - Kiểm tra đồng hồ đếm ngược 60 giây và thanh chọn kịch bản Host ($1/3$ nộp vs $2/3$ nộp).
     - Chuyển sang Vòng 2, kiểm tra giới hạn loại Cap 30% và hộp thoại SheetDialog xác nhận.

---

## 3. Giới hạn kỹ thuật (Known Limits)

- Màn hình sử dụng dữ liệu fixture mô phỏng độc lập tuân thủ contract GM-07 / API v4 để phục vụ kiểm thử giao diện và hành vi người dùng.
- Chưa kết nối trực tiếp đến database Supabase production hoặc RPC backend (phần việc này thuộc task GM-26 tích hợp API consumer).
- Tài liệu này ghi nhận kết quả kiểm thử trung thực, không tự ý đánh dấu `Done` hay `Approved` trước khi chủ dự án Trí nghiệm thu.
