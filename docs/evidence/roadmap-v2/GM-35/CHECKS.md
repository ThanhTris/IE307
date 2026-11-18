# GM-35 — Kiểm thử và xác nhận

Phạm vi lần này gồm mã nguồn, kiểm thử tự động và đối chiếu thiết kế. Lệnh `task_readiness --task GM-35` được bỏ qua theo chỉ đạo khi bắt đầu. Bước cuối là người dùng mở và xác nhận giao diện trên Expo. Trạng thái thiết bị vẫn chờ xác nhận.

| Ca kiểm | Đầu vào và kết quả kỳ vọng | Bằng chứng |
| --- | --- | --- |
| Auth client và phiên | Response sai schema bị từ chối. Lỗi OTP dùng mã lỗi đã lọc. Link giữ UUID và tăng epoch. Logout chặn kết quả đăng nhập còn pending. Recovery giữ nguyên phiên chính. | `mobile/tests/unit/authTransport.test.ts`, `mobile/tests/unit/authSession.test.ts` |
| G04 | Đổi tên, gửi khi offline. Nút pending bị khóa. Form giữ tên để thử lại. | `mobile/tests/component/accountEditScreen.test.tsx` |
| G05 | Nhập ba ô mật khẩu, gửi khi provider lỗi. Nút pending bị khóa. Cả ba ô được xóa khi lỗi. | `mobile/tests/component/accountEditScreen.test.tsx` |
| Cá nhân khách | Nhấn Đăng nhập hoặc Liên kết email. Mỗi thao tác mở đúng route sản phẩm. | `mobile/tests/component/profileScreen.test.tsx` |
| Đăng ký | Trường thiếu hoặc sai hiện viền đỏ và thông báo bên dưới. Chỉnh một trường xóa lỗi của trường đó. Form sai chưa gọi Auth. | `mobile/tests/component/accountAccessScreen.test.tsx` |
| Xác minh email và gửi lại mã | Nhập năm chữ số và bấm xác minh. Lỗi hiện dưới ô mã và Auth chưa nhận yêu cầu xác minh. Gửi lại hiển thị lời nhắc kiểm tra hộp thư. | `mobile/tests/component/accountAccessScreen.test.tsx` |
| GoTrue và Mailpit | Đăng nhập bị chặn trước khi xác minh. OTP sai hoặc dùng lại bị từ chối. Email đã dùng báo conflict khi liên kết. Recovery trả cùng ACK cho email tồn tại và email lạ. Mật khẩu cũ bị từ chối sau khi đặt mật khẩu mới. | `node scripts/gm35_account_check.mjs <qa-run-id>` trên QA đã xác minh ledger |
| Expo Android và visual parity | 412dp, 320/360dp, chữ 200%, TalkBack, bàn phím, Back, safe area, login/verify/profile/password/logout và lỗi mạng. | Chờ người dùng chạy và xác nhận theo [HANDOFF](HANDOFF.md) và [FIGMA_PARITY](FIGMA_PARITY.md). |

## Kết quả trên workspace

- Pass: 113/113 ca trong 7 suite mobile cho đăng ký, xác minh email, G04/G05, hồ sơ, session, Auth transport và tích hợp tìm phòng GM-44. Typecheck, lint các tệp UI đã sửa và kiểm ranh giới kiến trúc đạt. Phần hiển thị trên Expo Go vẫn chờ xác nhận thiết bị.
- Pass: 79/79 kiểm thử chuyên biệt cho Auth transport, session, Cá nhân, G04 và G05. TypeScript, ESLint trên `src`/`tests`, kiểm kiến trúc và 19/19 test runner backend đều đạt.
- Pass trên QA `gm35-auth-be-1118`: CLI 2.120.0 áp dụng `0060_gm44_active_room.sql` và runner lên READY với worker. Kiểm ownership và ledger trước khi gọi GoTrue. Đã chạy đạt bốn nhóm ca HTTP cho đăng ký, OTP, đăng nhập, liên kết email, đổi và đặt lại mật khẩu. Trigger đồng bộ tên hồ sơ của phiên thử cũ không còn trong chuỗi migration của nhánh.
- Expo export Android đã tạo đồ thị Metro. Bước ghi bytecode Hermes thất bại do quyền ghi thư mục tạm của sandbox. Kiểm giao diện trên Expo thuộc bước xác nhận của người dùng.
- Python regression toàn repo chạy 628 ca và thất bại. Kết quả có lỗi quyền ghi thư mục tạm, HTTP 403/429 và lỗi `TIME` ở fixture dữ liệu. Kết quả này chưa xác nhận regression toàn repo.
