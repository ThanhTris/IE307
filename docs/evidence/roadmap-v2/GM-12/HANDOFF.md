# GM-12 handoff

- Task / owner / reviewer: GM-12 / Trang (@rosy179) / Trí (@ThanhTris)
- Contract: `food-v1/roadmap-v2/GM-12.1`
- Branch / base: `codex/gm-12-voting-ui` / `991de66` / `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6` (origin/main)
- Upstream PRs: GM-05 (PR #105 / #109), GM-07 (PR #104)
- Issue: [#73](https://github.com/ThanhTris/IE307/issues/73)

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/voting/screens/VoteScreen.tsx` | Màn hình bình chọn Vòng 1: ba nút WANT/OK/NO luôn hiện, double-tap đặt WANT (không toggle về UNSET, không tự submit), scroll dọc không ghi phiếu (`unstable_pressDelay={100}`), UNSET khác OK, nút Gửi yêu cầu đủ phiếu, khóa chặt chẽ khi pending/ACK | `cd mobile; npm start`; mở route `/gm12/vote` | GM-26 (tích hợp voting API) |
| `mobile/src/features/voting/screens/FinalRoundScreen.tsx` | Màn hình chọn lọc Vòng 2: toggle đôi Giữ (KEEP) / Loại (REMOVE), loại hết tất cả món vẫn hợp lệ, SheetDialog xác nhận nộp riêng, khóa chặt chẽ khi pending/ACK, hiển thị kết quả từ fixture (không tự hardcode winner), tối đa 2 vòng | `cd mobile; npm start`; mở route `/gm12/final` | GM-26 (tích hợp voting API) |
| `mobile/src/features/voting/fixtures.ts` | Bộ fixtures mô phỏng kịch bản (Thành công, Chờ nhóm, Lỗi/Retry, Vòng 2) và helper async deferred request phục vụ demo và QA | Tích hợp sẵn trong VoteScreen & FinalRoundScreen | GM-26 |
| `mobile/src/features/voting/index.ts` | Module index export VoteScreen, FinalRoundScreen, fixtures và các kiểu dữ liệu liên quan | `import { VoteScreen, FinalRoundScreen } from '@/features/voting'` | GM-26 |
| `mobile/src/app/gm12/vote.tsx`, `mobile/src/app/gm12/final.tsx` | Các route Expo Router điều hướng trực tiếp đến màn Vòng 1 và Vòng 2 | `cd mobile; npm start` | GM-26 |
| `mobile/tests/component/gm12Screens.test.tsx` | Bộ test component và interaction bao phủ 19 ca kiểm thử toàn diện cho toàn bộ AC và review requirements của GM-12 (bao gồm kiểm tra payload KEEP/REMOVE vòng 2) | `cd mobile; npx jest tests/component/gm12Screens.test.tsx` | Reviewer |
| `docs/evidence/roadmap-v2/GM-12/CHECKS.md` | Bảng kết quả kiểm tra tự động, môi trường và giới hạn kỹ thuật | Đọc kèm handoff | Reviewer |

## Status and known limits

Mock-only. Phiếu bình chọn và lựa chọn vòng 2 là dữ liệu fixture tuân thủ contract GM-07. Chưa kết nối RPC Supabase và chưa có cơ chế đồng bộ realtime giữa các thiết bị. Các bài kiểm thử tự động (strict typecheck, eslint, architecture boundary guard, jest 19 component tests + 4 route tests = 23 tests, Android JS bundle export) đều đã đạt (Pass). Đã cung cấp thanh chọn kịch bản (Scenario Picker) ngay trên giao diện Expo để người dùng/reviewer có thể kiểm thử trực tiếp mọi kịch bản (pending, ACK, error, retry, chờ nhóm, vòng 2, kết quả đồng thuận) trên điện thoại thật. Hạng mục smoke trên thiết bị vật lý ghi nhận Not run chờ reviewer Trí kiểm tra thực tế. Hồ sơ này không tự ý đánh dấu Approved hoặc Done theo quy định của dự án.
