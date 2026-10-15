# GM-12 handoff

- Task / owner / reviewer: GM-12 / Trang (@rosy179) / Trí (@ThanhTris)
- Contract: `food-v1/roadmap-v2/GM-12.1`
- Branch / base: `implement_issue_seventy_three` / `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6` (origin/main)
- Issue: [#73](https://github.com/ThanhTris/IE307/issues/73)

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/voting/screens/VoteScreen.tsx` | Màn hình bình chọn Vòng 1: ba nút WANT/OK/NO luôn hiện, double-tap đặt WANT không tự submit, scroll dọc không ghi phiếu, UNSET khác OK, nút Gửi yêu cầu đủ phiếu | `cd mobile; npm start`; mở route `/gm12/vote` | GM-26 (tích hợp voting API) |
| `mobile/src/features/voting/screens/FinalRoundScreen.tsx` | Màn hình chọn lọc Vòng 2: toggle đôi Giữ (KEEP) / Loại (REMOVE), loại hết tất cả món vẫn hợp lệ, dialog xác nhận nộp riêng, tối đa 2 vòng trên luồng mẫu | `cd mobile; npm start`; mở route `/gm12/final` | GM-26 (tích hợp voting API) |
| `mobile/src/features/voting/index.ts` | Module index export VoteScreen, FinalRoundScreen và các kiểu dữ liệu liên quan | `import { VoteScreen, FinalRoundScreen } from '@/features/voting'` | GM-26 |
| `mobile/src/app/gm12/vote.tsx`, `mobile/src/app/gm12/final.tsx` | Các route Expo Router điều hướng trực tiếp đến màn Vòng 1 và Vòng 2 | `cd mobile; npm start` | GM-26 |
| `mobile/tests/component/gm12Screens.test.tsx` | Bộ test component và interaction bao phủ 11 ca kiểm thử cho toàn bộ AC của GM-12 | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Reviewer |
| `docs/evidence/roadmap-v2/GM-12/CHECKS.md` | Bảng kết quả kiểm tra tự động, môi trường và giới hạn kỹ thuật | Đọc kèm handoff | Reviewer |

## Status and known limits

Mock-only. Phiếu bình chọn và lựa chọn vòng 2 là dữ liệu fixture trong bộ nhớ hoặc qua mock client adapter GM-07. Chưa kết nối RPC Supabase và chưa có cơ chế đồng bộ realtime giữa các thiết bị. Các bài kiểm thử tự động (strict typecheck, eslint, architecture boundary guard, jest component/route tests, Android JS bundle export) đều đã đạt (Pass). Kiểm tra hiển thị và cảm ứng trên thiết bị thật Expo Go Android được đánh dấu Not run và cần reviewer/owner thực hiện trước khi nghiệm thu. Hồ sơ này không tự ý đánh dấu Approved hoặc Done theo quy định của dự án.
