# GM-35 — Kiểm thử và xác nhận

Task [GM-35 / #96](../../../../tasks/backlog/GM-35.md), revision UI `ui-figma-final/2026-10-25/GM-35.2`. Revision mã nguồn bàn giao `9193459` trên `codex/gm-35-account-profile-recovery`. Reviewer theo task là Trí (`ThanhTris`).

Ngày 2026-11-19, người kiểm thử xác nhận đã hoàn thành lượt kiểm thủ công trên Expo Go. Trao đổi trước đó ghi nhận luồng cơ bản hoạt động và liệt kê các lỗi UI được sửa sau khi thử. Xác nhận cuối chưa kèm log từng ca, mẫu thiết bị, SHA đã mở trong Expo hoặc ảnh đối chiếu. Cách dựng QA và tái lập nằm trong [HANDOFF](HANDOFF.md).

| Ca kiểm | Đầu vào và kết quả kỳ vọng | Bằng chứng |
| --- | --- | --- |
| Auth client và phiên | Response sai schema bị từ chối. Lỗi OTP dùng mã lỗi đã lọc. Link giữ UUID và tăng epoch. Logout chặn kết quả đăng nhập còn pending. Recovery giữ nguyên phiên chính. | `mobile/tests/unit/authTransport.test.ts`, `mobile/tests/unit/authSession.test.ts` |
| G04 | Đổi tên, gửi khi offline. Nút pending bị khóa. Form giữ tên để thử lại. | `mobile/tests/component/accountEditScreen.test.tsx` |
| G05 | Nhập ba ô mật khẩu, gửi khi provider lỗi. Nút pending bị khóa. Cả ba ô được xóa khi lỗi. | `mobile/tests/component/accountEditScreen.test.tsx` |
| Cá nhân khách | Hiện tên khách. Mở Đăng nhập và Liên kết email từ đúng route. Giao diện và Cỡ chữ áp dụng ngay và lưu trên thiết bị. | `mobile/tests/component/profileScreen.test.tsx` |
| Quyền khách trên Home | Footer giữ Bạn bè và Lịch sử. Khách tạo/tham gia phòng được và Home không tải danh sách Kèo nhanh. | `mobile/tests/component/homeScreen.test.tsx`, `mobile/tests/component/liveRoomLifecycle.test.tsx` |
| Đăng nhập và recovery từ Cá nhân | Ô trống hoặc email sai định dạng báo dưới ô. Server từ chối mật khẩu/email thì hiện toast, giữ nguyên email và xóa mật khẩu. Recovery từ Đổi mật khẩu chỉ gửi mã tới đúng email phiên hiện tại. | `mobile/tests/component/accountAccessScreen.test.tsx`, `mobile/tests/unit/authSession.test.ts` |
| Đăng ký | Trường thiếu hoặc sai hiện viền đỏ và thông báo bên dưới. Chỉnh một trường xóa lỗi của trường đó. Form sai chưa gọi Auth. | `mobile/tests/component/accountAccessScreen.test.tsx` |
| Xác minh email và gửi lại mã | Nhập năm chữ số và bấm xác minh. Lỗi hiện dưới ô mã và Auth chưa nhận yêu cầu xác minh. Lời nhắc kiểm tra hộp thư tự ẩn sau 5 giây kể từ khi gửi lại thành công. | `mobile/tests/component/accountAccessScreen.test.tsx` |
| Cài đặt và đăng xuất | Chọn giao diện/cỡ chữ, cập nhật consent cá nhân qua API, xác nhận xóa lịch sử cá nhân và bỏ qua màn trung gian sau đăng xuất. | `mobile/tests/component/profileScreen.test.tsx`, `mobile/tests/unit/socialInboxHistoryRepositories.test.ts` |
| GoTrue và Mailpit | Đăng nhập bị chặn trước khi xác minh. OTP sai hoặc dùng lại bị từ chối. Email đã dùng báo conflict khi liên kết. Recovery trả cùng ACK cho email tồn tại và email lạ. Mật khẩu cũ bị từ chối sau khi đặt mật khẩu mới. | `node scripts/gm35_account_check.mjs <qa-run-id>` trên QA đã xác minh ledger |
| Expo Go thủ công | Kiểm giao diện và thao tác sản phẩm theo [HANDOFF](HANDOFF.md). | Người kiểm thử xác nhận đã hoàn thành ngày 2026-11-19. |
| AVD và visual parity theo tiêu chí merge | AVD nối backend QA local, ảnh Figma/app cùng viewport 412dp, kiểm 320/360dp, chữ 200%, TalkBack, bàn phím, Back và safe area. | Chưa có bằng chứng trong hồ sơ. Xem [FIGMA_PARITY](FIGMA_PARITY.md). |

## Kết quả trên workspace

- Revision `9193459`: 152/152 ca trong 7 suite mobile, 20/20 ca runner backend, TypeScript, kiểm ranh giới kiến trúc và kiểm Expo SDK 58 với lockfile đều đạt. Mobile kiểm Đăng nhập/Đăng ký/Recovery, hồ sơ, Home khách, Auth/session và repository lịch sử. Commit đồng bộ `main` chỉ thêm tài liệu GM-33/34.
- Pass lịch sử: 113/113 ca trong 7 suite mobile cho đăng ký, xác minh email, G04/G05, hồ sơ, session, Auth transport và tích hợp tìm phòng GM-44. Typecheck, lint các tệp UI đã sửa và kiểm ranh giới kiến trúc đạt.
- Pass: 79/79 kiểm thử chuyên biệt cho Auth transport, session, Cá nhân, G04 và G05. TypeScript, ESLint trên `src`/`tests`, kiểm kiến trúc và 19/19 test runner backend đều đạt.
- Pass trên QA `gm35-auth-be-1118`: CLI 2.120.0 áp dụng `0060_gm44_active_room.sql` và runner lên READY với worker. Kiểm ownership và ledger trước khi gọi GoTrue. Đã chạy đạt bốn nhóm ca HTTP cho đăng ký, OTP, đăng nhập, liên kết email, đổi và đặt lại mật khẩu. Trigger đồng bộ tên hồ sơ của phiên thử cũ không còn trong chuỗi migration của nhánh.
- Phiên QA local `gm35-smtp-wire-1118` lên `READY` với mật khẩu thử nghiệm và `qa:verify` đạt. Đã đối chiếu cấu hình SMTP và hai mẫu OTP. Ca gửi Gmail thật chưa chạy. Cách tái lập QA hiện hành dùng Mailpit.
- Pass 20/20 test runner và 4/4 nhóm ca Auth HTTP trên QA Mailpit `gm35-mailpit-reg-1118`, gồm đăng ký, xác minh, đăng nhập, liên kết tài khoản khách, đổi và đặt lại mật khẩu. Cả hai phiên QA kiểm cấu hình Gmail và hồi quy Mailpit đã được dọn.
- Sau khi bỏ mã cố định, 20/20 test runner và 4/4 nhóm ca Auth HTTP trên `gm35-mailpit-retest-1118` đạt. Runner lấy mã xác minh và mã đặt lại mật khẩu từ hai thư Mailpit. Phiên Expo đang dùng tại cổng `54391` đã được gỡ trigger mã cố định, giữ tài khoản thử và tiếp tục phục vụ Mailpit tại cổng `54394`.
- Expo export Android đã tạo đồ thị Metro. Bước ghi bytecode Hermes thất bại do quyền ghi thư mục tạm của sandbox. Kết quả Expo Go thủ công nằm ở bảng trên.
- Python regression toàn repo chạy 628 ca và thất bại. Kết quả có lỗi quyền ghi thư mục tạm, HTTP 403/429 và lỗi `TIME` ở fixture dữ liệu. Kết quả này chưa xác nhận regression toàn repo.

## Trạng thái trước review

Kiểm `task_readiness.py --task GM-35 --gate merge --base-ref origin/main --verify-outputs` ngày 2026-11-19 trên `origin/main` `5a69b56`. Sau khi đồng bộ hồ sơ GM-34, checker báo `BLOCKED_ON_BASE`. Project #2 ghi GM-16 và GM-28 đã Done nhưng checker thấy hai artifact khác nội dung trên nhánh đích. GM-35 mở rộng vòng đời phiên trong `mobile/src/data/auth/session.ts` và dùng chung read/write để xóa lịch sử cá nhân trong `mobile/src/features/history/services/historyRepository.ts`. Reviewer cần xác nhận ownership và cách tiếp nhận hai thay đổi này trước khi chạy lại gate. Kết quả đọc Project chỉ ghi bằng chứng ở thời điểm chạy.

Trước review chính thức, bổ sung log và ảnh AVD nối backend QA local thật cho các ca còn thiếu ở trên. Xác nhận Expo Go được lưu độc lập với nghiệm thu AVD và quyết định của reviewer.
