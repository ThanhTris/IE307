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

## Trạng thái trước review #182

Kiểm `task_readiness.py --task GM-35 --gate merge --base-ref origin/main --verify-outputs` ngày 2026-11-19 trên `origin/main` `5a69b56`. Sau khi đồng bộ hồ sơ GM-34, checker báo `BLOCKED_ON_BASE`. Project #2 ghi GM-16 và GM-28 đã Done nhưng checker thấy hai artifact khác nội dung trên nhánh đích. GM-35 mở rộng vòng đời phiên trong `mobile/src/data/auth/session.ts` và dùng chung read/write để xóa lịch sử cá nhân trong `mobile/src/features/history/services/historyRepository.ts`. Reviewer cần xác nhận ownership và cách tiếp nhận hai thay đổi này trước khi chạy lại gate. Kết quả đọc Project chỉ ghi bằng chứng ở thời điểm chạy.

## Kiểm lại sau review #182

Revision app `9eb698a` trên `main` `5a69b56`. Code chuyển phiên nằm trong `f53db06` và phần thu gọn artifact trong `9eb698a`. Migration và ca HTTP hai tài khoản nằm trong `b0c8d59`.

| Ca kiểm | Kết quả |
| --- | --- |
| Request của phiên khách trong lúc đổi tài khoản | Kiểm thử dừng `clearPrivateData` và gửi lưu consent trong khi repository vẫn trả phiên khách. Trước sửa, transport nhận request cũ với token thành viên rồi UI nhận `AUTH_REQUIRED`. Sau sửa, request cũ trả `AUTH_REQUIRED` trước transport. Request tiếp theo gửi đúng một lần với phiên thành viên. |
| Đổi tên với hai tài khoản | QA `gm35-review-profile-1119` chạy CLI 2.120.0, `qa:verify` đạt với 48 migration, ownership và heartbeat worker đã xác minh. `node scripts/gm35_account_check.mjs gm35-review-profile-1119` đạt cả 5 nhóm ca. Sau ACK đổi tên, GoTrue và hồ sơ xã hội của chính chủ trả tên mới. Tài khoản thứ hai đọc tên mới qua `list_friends` và `find_partner_by_code`. UUID, mã bạn bè, avatar seed và quan hệ giữ nguyên. Phiên QA đã được dọn. |
| Hồi quy mobile | 201/201 ca trong 9 suite với `--testTimeout=30000`, TypeScript, lint tệp đã sửa, kiểm kiến trúc và Expo `58.0.25` theo lockfile đạt. G04 gửi lại đúng tên sau lỗi và nhận ACK, G05 bấm lần hai khi pending chỉ gọi service một lần và xóa cả ba ô sau lỗi. Hai ca UI dùng provider kiểm thử. |
| Export Android | Expo `58.0.25` export Android thành công với 3.926 module và xuất bundle Hermes `.hbc`. Kết quả xác nhận bước đóng gói JS. |
| Runner và tài liệu | 20/20 ca `npm test` ở repo gốc đạt. `validate_repository.py` và `task_readiness.py --check-docs` đạt. Python regression toàn repo chạy 628 ca trên Python 3.15 cục bộ, kết thúc với 167 thất bại, 39 lỗi và 6 bỏ qua. Log có lỗi thiếu `jsonschema` và `tzdata`. Các workflow CI dùng Python 3.12. |
| Merge gate | `python scripts/task_readiness.py --task GM-35 --gate merge --base-ref origin/main --verify-outputs` đọc Project #2 và trả `BLOCKED_ON_BASE`. Artifact GM-28 `historyRepository.ts` và GM-07 `client.ts` khớp `origin/main`. Mục còn chặn là GM-16 `mobile/src/data/auth/session.ts`. Xem ranh giới producer trong [HANDOFF](HANDOFF.md#bàn-giao-producer-gm-16). |
| AVD sau sửa | Tại lượt này, danh sách ADB rỗng và chưa có AVD có thể chạy. Xem phần [bàn giao lượt AVD](FIGMA_PARITY.md#bàn-giao-lượt-avd-cho-trí) cho ma trận kiểm hiện hành. |

## Kiểm lại sau khi nhận GM-45

Revision app và migration `8329d49` ghép với `origin/main` `5bbee5d`. QA sạch `gm35-gm45-review-1119` dùng Supabase CLI `2.120.0`, Auth/REST `127.0.0.1:54451` và Mailpit `127.0.0.1:54454`. `qa:verify` đạt với 49 migration, ownership hợp lệ và worker có heartbeat. Manifest đã đối chiếu với database có đủ:

| Migration | Schema | Contract |
| --- | --- | --- |
| `0061_gm45_room_realtime.sql` | `0.31.6` | `dish-session-v4/roadmap-v2/GM-45.1` |
| `0062_gm35_profile_display_name.sql` | `0.31.7` | `roadmap-v2/GM-35/profile-display-name` |

- `node scripts/gm35_account_check.mjs gm35-gm45-review-1119` đạt 5/5 nhóm Auth/Mailpit. Sau ACK đổi tên, chính chủ đọc tên mới qua GoTrue và hồ sơ xã hội. Tài khoản thứ hai thấy tên mới qua `list_friends` và `find_partner_by_code`. UUID, mã bạn bè, avatar seed và quan hệ giữ nguyên.
- `node scripts/gm45_realtime_check.mjs` đạt 22/22 ca trên cùng QA. Hai thành viên nhận đúng version qua WebSocket, client reconnect bắt kịp version mới và worker phát tín hiệu chuyển vòng. Outsider/cựu thành viên bị lọc. Retention dọn bản ghi và publication giữ INSERT/UPDATE. Phiên QA được dọn sau khi hai bộ kiểm hoàn tất.
- Mobile đạt 168/168 ca trong 9 suite cho Auth/session, G04/G05, hồ sơ, lịch sử, Realtime, lobby và voting. Ca consent trong lúc dọn cache xác nhận không gửi request cũ. TypeScript, kiểm kiến trúc, Expo SDK/lockfile, 20/20 ca runner và kiểm tài liệu đạt.
- Expo `58.0.25` export Android thành công với 3.929 module và bundle Hermes `.hbc` trên revision đã ghép.
- Python 3.12 với dependencies của CI chạy 691 ca, có 3 lỗi và 7 ca bỏ qua. Khi chạy lại 3 ca lỗi với thư mục tạm mặc định, hai ca export fixture/báo cáo đạt. Ca `test_gm40_manifest...test_foreign_checkout_and_symlink_rejected` vẫn dừng ở thao tác tạo symlink trên Windows vì thiếu quyền (`WinError 1314`).
- Merge gate với `--verify-outputs` trên `origin/main` `5bbee5d` trả `BLOCKED_ON_BASE` duy nhất ở `mobile/src/data/auth/session.ts` của GM-16.

## Lượt kiểm trên máy Android API 37

Ngày 19/11/2026, checkout `1561d901fa6d15f76091445e005b2cc097f52e91`. QA `gm35-avd-092834100` trên loopback xác minh ownership, 49 migration (gồm `0061` và `0062`), worker và hai catalogue QA. Backend thật đạt 5/5 nhóm Auth/Mailpit, gồm đổi tên và đọc lại bằng hai tài khoản.

Realtime đạt 22/22 khi chạy lại. Lượt đầu fail ở assertion sau khi kick vì kênh nhận các version 1–3 đã tạo trước thao tác kick; ca REST xác nhận người bị kick không đọc được dòng tín hiệu. Log của cả hai lượt được giữ riêng để truy vết độ ổn định của runner.

`Medium_Phone_API_37.0` boot với Expo Go 58.0.5. Các ca tương tác trong app, G04/G05, ảnh đối chiếu và trợ năng vẫn **Not run** tại lần ghi này vì Metro QA trên cổng 8082 chưa khởi động. Merge gate với base `5bbee5d` vẫn `BLOCKED_ON_BASE` ở artifact GM-16 `mobile/src/data/auth/session.ts`. Log và ma trận local nằm trong `review-results/gm35-avd-092834100/`.

## Bàn giao các mục còn chặn merge

- **GM-16.** [Patch producer](GM16_PRODUCER.patch) tách `session.ts` và hai guard Auth từ baseline `5bbee5d`. `git apply --check` đạt trên baseline. Checkout thử của producer đạt 69/69 ca `authSession` và `authTransport`, cùng TypeScript. Ca hồi quy đổi phiên trên nhánh GM-35 cũng đạt khi chạy riêng. Trí chốt ranh giới để tiếp nhận vào `main`. Sau bàn giao, chạy lại ca đổi phiên và merge gate trên revision đã đồng bộ. [HANDOFF](HANDOFF.md#bàn-giao-producer-gm-16)
- **AVD.** Trí sẽ chạy và ghi bằng chứng trên revision cuối, gồm các luồng tài khoản, G04/G05, ảnh Figma/app ở 412dp và cấu hình trợ năng. Trạng thái chờ lượt AVD. [FIGMA_PARITY](FIGMA_PARITY.md#bàn-giao-lượt-avd-cho-trí)

## Kết quả AVD đã thu trước khi sửa bố cục

Revision `7cb8d89`, Android API 37, Expo Go 58.0.5, QA local `gm35-avd-092834100`. GoTrue ghi `signup` 200, `verify` 403 cho mã sai và 200 cho mã Mailpit hợp lệ. App vào Home và giữ phiên khi đổi mật độ. Đăng nhập lại bằng mật khẩu và recovery hoàn chỉnh từ UI vẫn chờ kiểm.

- **G04:** proxy trả 503, tên vừa nhập vẫn còn sau lỗi. Lần thử lại được chuyển tới GoTrue. Đọc lại DB QA xác nhận tên mới ở cả GoTrue và hồ sơ xã hội. [Ảnh sau lưu](avd-20261119/avd-g04-readback-412.png)
- **G05:** nút lưu khóa lúc pending. Bấm thêm trong lúc chờ, proxy ghi đúng một request ghi và trả 503. Chưa có bằng chứng trạng thái ba ô sau phản hồi.
- **Trợ năng:** phát hiện nhãn Giao diện bẻ giữa từ ở 320dp với chữ 200%. Kiểm lại bản sửa trên AVD 320dp và font scale 2,0: cả Giao diện và Cỡ chữ đọc trọn nhãn và giá trị trên hai dòng, vẫn cuộn được. TalkBack còn chờ. [Trước sửa](avd-20261119/avd-profile-settings-320-200.png) · [Sau sửa](avd-20261119/avd-profile-settings-fixed-320-200.png)
- **Hồi quy sau sửa:** 57/57 ca tập trung của GM-35 đạt. GM-16 tách ở PR #183, đạt 69/69 ca Auth/session và TypeScript. Runner backend QA xác minh 49 migration, 7/7 assertion Auth–REST và 5/5 nhóm Auth/Mailpit đạt.

### Kiểm bổ sung trực tiếp trên AVD

App revision `3675d42` trên cùng AVD và QA. G04 trả lỗi 503 có kiểm soát: nút khóa khi chờ, toast báo lỗi, tên còn nguyên và nút lưu mở lại. [Đang lưu](avd-20261119/avd-g04-pending-412.png) · [Sau lỗi](avd-20261119/avd-g04-error-412.png)

G05 với mật khẩu hiện tại cố ý sai: GoTrue từ chối bước xác thực, app báo lỗi ngay dưới ô hiện tại, xóa cả ba trường và nút lưu hoạt động lại. Lượt trước có bằng chứng riêng về chặn gửi lặp và một request ghi bị proxy trả 503. Ca xác minh cả ba trường sau 503 vẫn chờ. [Ảnh lỗi Auth](avd-20261119/avd-g05-invalid-current-412.png)

Recovery trong app gửi yêu cầu tới Auth QA, Mailpit có thư cho đúng tài khoản thử. Bước lưu mật khẩu mới và đăng nhập lại trên AVD chờ thao tác trực tiếp.
