# GM-12 checks

- Task/contract: GM-12 / `food-v1/roadmap-v2/GM-12.1`
- Base revision: `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6` (origin/main)
- Target deliverables: `mobile/src/features/voting/screens/VoteScreen.tsx`, `mobile/src/features/voting/screens/FinalRoundScreen.tsx`
- Schema/dataset: N/A for UI mock fixtures; no backend DB or real user ballots stored.
- Environment: Windows, Node v22.11.0, npm 11.3.0, Expo SDK 57, React Native 0.86.3.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| Ba nút luôn hiện; double-tap đặt WANT, không tự submit; scroll dọc không ghi phiếu | `cd mobile; npx jest --runTestsByPath tests/component/gm12Screens.test.tsx` | Ba nút WANT/OK/NO luôn hiển thị trên thẻ món; double-tap vùng thẻ đặt WANT nhưng không tự submit; scroll dọc không ghi nhận phiếu; đổi phiếu và hoàn tác (undo) về UNSET hoạt động | 11 assertions passed; card header và badge cập nhật trạng thái phiếu | Pass (mock component scope) |
| UNSET khác OK; nút Gửi yêu cầu đủ phiếu; các trạng thái pending/ACK/error chỉ fixture gắn nhãn | `cd mobile; npx jest --runTestsByPath tests/component/gm12Screens.test.tsx` | Khởi tạo UNSET; nút Gửi bị vô hiệu hóa khi còn món chưa chọn; chỉ bật khi đủ phiếu tất cả món; fixture pending, ACK biên nhận, và error thử lại gắn nhãn rõ ràng | Assertions passed: disabled khi thiếu phiếu, enabled khi đủ phiếu, receipt ACK và retry error | Pass (mock component scope) |
| Vòng hai có confirm nộp riêng, Loại hết hợp lệ, tối đa hai vòng trên luồng mẫu | `cd mobile; npx jest --runTestsByPath tests/component/gm12Screens.test.tsx` | Banner Vòng 2 "⚡ VÒNG 2 · CHỌN LỌC"; nút toggle đôi Giữ (KEEP) / Loại (REMOVE); loại hết tất cả món vẫn hợp lệ và nút Gửi bật; SheetDialog xác nhận nộp riêng; tối đa 2 vòng, không có vòng 3 | Assertions passed: toggle Giữ/Loại, loại hết hợp lệ, dialog xác nhận, thông báo hoàn tất không vòng 3 | Pass (mock component scope) |
| Card hiển thị tên/ảnh fallback/tags/giá nguồn; không triển khai chốt winner hoặc outbox ở đây | `cd mobile; npx jest --runTestsByPath tests/component/gm12Screens.test.tsx` | Hiển thị tên món, tags, giá ước tính, địa điểm; ảnh dự phòng 🍜 khi thiếu artwork; server/mock quyết định đồng thuận, UI không tự chốt cục bộ hay tạo outbox | Assertions passed: fallback emoji 🍜 và metadata đầy đủ | Pass (mock component scope) |
| Route integration / điều hướng Expo Router | `cd mobile; npx jest --runTestsByPath tests/integration/routes.test.tsx` | Mở ứng dụng từ shell, điều hướng đến `/gm12/vote` và render màn hình bình chọn | 4 route tests passed | Pass (automated; no device) |
| TypeScript strict check | `cd mobile; npm run typecheck` | Strict typecheck với `tsc --noEmit` không có lỗi | Exit code 0 | Pass |
| ESLint check | `cd mobile; npm run lint` | ESLint trên toàn bộ thư mục mobile | 0 errors (4 pre-existing warnings từ contracts.ts/index.ts) | Pass |
| Architecture boundary guard | `cd mobile; npm run check:architecture` | Kiểm tra giới hạn kiến trúc `mobile/scripts/check-architecture.mjs` | "Architecture boundaries OK" | Pass |
| Android JS bundle export | `cd mobile; npm run bundle:android` | Xuất gói Android qua Metro bundler | 1,271 modules bundled thành công, xuất `dist/android` | Pass (bundle only; not app launch) |
| Expo Go Android smoke / visual interaction | Expo Go route `/gm12/vote` → `/gm12/final` | Mở trực tiếp trên thiết bị Android qua Expo Go để kiểm tra hiển thị, safe area và cử chỉ | Chưa chạy trên thiết bị thật; xuất bundle thành công | Not run; reviewer/owner chạy trước nghiệm thu |
| Repository validation & Task indexes | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs` | Kiểm tra tính toàn vẹn repository và indexes tài liệu | Repository OK; task indexes match task metadata | Pass |
| Live dependency check | `python scripts/task_readiness.py --task GM-12` | Kiểm tra trạng thái dependency trên GitHub Project #2 | Quyền token hiện tại thiếu `read:project` (BLOCKED_PROJECT_UNVERIFIED). Start dependencies GM-05 (`bcce154`) và GM-07 (`82157e0`) đã được merge đầy đủ trên origin/main | BLOCKED_PROJECT_UNVERIFIED (cần token read:project để live gate Pass) |

## Limits

Toàn bộ luồng bình chọn sử dụng API mock và fixture độc lập. Không ghi phiếu thực tế vào database, không kết nối RPC Supabase, và không có websocket thời gian thực đa thiết bị. Task bàn giao màn hình giao diện theo mẫu GM-12, phục vụ tích hợp ở các task tiếp theo (GM-26 / GM-31). Bằng chứng kiểm tra không tự ghi nhận Done/Approved.
