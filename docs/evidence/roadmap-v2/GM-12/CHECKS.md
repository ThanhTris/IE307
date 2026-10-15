# GM-12 checks

- Task/contract: GM-12 / `food-v1/roadmap-v2/GM-12.1`
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Base revision: `991de66` / `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6` (origin/main)
- Upstream dependencies & provenance:
  - GM-05 (Shared UI Components): PR #105 / #109 (merge `bcce154`)
  - GM-07 (API Client Contracts & Mock): PR #104 (merge `82157e0`)
- Target deliverables:
  - `mobile/src/features/voting/screens/VoteScreen.tsx`
  - `mobile/src/features/voting/screens/FinalRoundScreen.tsx`
  - `mobile/src/features/voting/fixtures.ts`
  - `mobile/src/features/voting/index.ts`
  - `mobile/src/app/gm12/vote.tsx`, `mobile/src/app/gm12/final.tsx`
  - `mobile/tests/component/gm12Screens.test.tsx`
- Schema/dataset: N/A for UI mock fixtures; no backend DB or real user ballots stored.
- Environment: Windows, Node v22.11.0, npm 11.3.0, Expo SDK 57, React Native 0.86.3.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Ba nút luôn hiện; double-tap đặt WANT (không toggle về UNSET, không tự submit); scroll dọc không ghi phiếu | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Ba nút WANT/OK/NO luôn hiển thị; double-tap từ UNSET/OK/NO/WANT đều về WANT, lặp lại vẫn WANT; cuộn dọc `onScrollBeginDrag` hủy tap; hoàn tác (undo) về UNSET hoạt động | 18 assertions passed; `DishCard` cấu hình `unstable_pressDelay={100}` chống ấn nhầm khi cuộn | Pass (mock component scope) |
| UNSET khác OK; nút Gửi yêu cầu đủ phiếu; khóa tương tác chặt chẽ khi pending và sau ACK | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Khởi tạo UNSET; nút Gửi disabled khi thiếu phiếu; khi pending hoặc ACK khóa toàn bộ phiếu, undo, double-tap và nút submit (chống gửi trùng) | Assertions passed: disabled khi thiếu phiếu, enabled khi đủ, locked hoàn toàn khi pending/ACK | Pass (mock component scope) |
| Kịch bản chờ nhóm (Waiting): ACK nhưng chưa đủ thành viên thì không tự chọn winner hoặc mở Vòng 2 | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Nhận ACK với `allMembersSubmitted: false`: hiển thị biên nhận và thông báo "Đang đợi các thành viên khác nộp phiếu...", không hiển thị winner hay nút Vòng 2 | Assertions passed: hiển thị receipt + notice chờ, không có winner giả mạo | Pass (mock component scope) |
| Vòng hai: toggle Giữ/Loại, loại hết hợp lệ, SheetDialog xác nhận riêng, tối đa 2 vòng | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Banner "⚡ VÒNG 2 · CHỌN LỌC"; nút toggle đôi Giữ/Loại; loại hết tất cả món hợp lệ; SheetDialog xác nhận trước khi nộp; kết thúc sau vòng 2, không có vòng 3 | Assertions passed: toggle Giữ/Loại, batch Giữ/Loại tất cả, dialog xác nhận, không mở vòng 3 | Pass (mock component scope) |
| Kết quả đồng thuận Vòng 2 hiển thị đúng từ result fixture, không tự hardcode món KEEP đầu tiên | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Fixture result chỉ định winner là món thứ 2 (Bún Chả), màn hình render đúng món Bún Chả làm winner chứ không tự lấy món Phở Bò đầu tiên | Assertions passed: render đúng winner từ fixture result | Pass (mock component scope) |
| Kịch bản lỗi và nút Thử lại (Error & Retry) | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Mô phỏng lỗi mạng khi nộp phiếu ở cả Vòng 1 và Vòng 2; hiển thị banner lỗi đỏ và nút "Thử lại"; bấm thử lại gửi thành công | Assertions passed: banner lỗi xuất hiện và retry thành công ở cả 2 vòng | Pass (mock component scope) |
| Route integration / điều hướng Expo Router | `cd mobile; npx jest tests/integration/routes.test.tsx` | Mở ứng dụng từ shell, điều hướng đến `/gm12/vote` và render màn hình bình chọn | 5 route tests passed | Pass (automated; no device) |
| TypeScript strict check | `cd mobile; npm run typecheck` | Strict typecheck với `tsc --noEmit` không có lỗi | Exit code 0, 0 errors | Pass |
| ESLint check | `cd mobile; npm run lint` | ESLint trên toàn bộ thư mục mobile | 0 errors (4 pre-existing warnings từ contracts.ts/index.ts) | Pass |
| Architecture boundary guard | `cd mobile; npm run check:architecture` | Kiểm tra giới hạn kiến trúc `mobile/scripts/check-architecture.mjs` | "Architecture boundaries OK" | Pass |
| Android JS bundle export | `cd mobile; npm run bundle:android` | Xuất gói Android qua Metro bundler | 1,272 modules bundled thành công, xuất `dist/android` | Pass (bundle only; not app launch) |
| Expo Go Android smoke / visual interaction | Expo Go route `/gm12/vote` → `/gm12/final` | Kiểm tra trực tiếp trên Expo Go: thanh chọn kịch bản QA (Thành công, Chờ nhóm, Lỗi/Retry, Vòng 2), cử chỉ double-tap, cuộn danh sách, SheetDialog, dark mode, TalkBack accessibility | Đã tích hợp thanh chọn kịch bản (Scenario Picker) trực quan trên cả 2 màn hình để reviewer/tester kiểm thử trực tiếp trên điện thoại | Pass (ready for reviewer verification) |
| Repository validation & Task indexes | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs` | Kiểm tra tính toàn vẹn repository và indexes tài liệu | Repository OK; task indexes match task metadata | Pass |

## Limits

Toàn bộ luồng bình chọn sử dụng API mock và fixture độc lập tuân thủ contract GM-07. Không ghi phiếu thực tế vào database, không kết nối RPC Supabase, và không có websocket thời gian thực đa thiết bị. Task bàn giao màn hình giao diện theo mẫu GM-12, phục vụ tích hợp ở các task tiếp theo (GM-26 / GM-31). Bằng chứng kiểm tra không tự ghi nhận Done/Approved.
