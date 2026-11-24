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

## Bàn giao trước khi GM-16 vào main

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

## Kiểm sau khi nhận GM-16 và đổi migration

Ngày 21/11/2026, revision `1a5d335` gồm `main` `ebd21af` và migration mới. #183 đã merge ở `a462a8c`. `session.ts` khớp chính xác với `origin/main`. Hai conflict ở `transport.ts` và `validation.ts` giữ guard từ GM-16 và các hàm tài khoản GM-35. So sánh cây file sau merge cho thấy `historyRepository.ts` khớp `main` và phần migration của PR chỉ thêm `0066`.

QA sạch `gm35-schema66-1121`, Supabase CLI `2.120.0`, Auth/REST `127.0.0.1:54481`, Mailpit `127.0.0.1:54484`. `qa:verify` đối chiếu 52 migration trong ledger với manifest và xác nhận worker có heartbeat. Ledger và schema registry của phiên QA ghi:

| Migration | Schema | Contract |
| --- | --- | --- |
| `0061_gm45_room_realtime.sql` | `0.31.6` | `dish-session-v4/roadmap-v2/GM-45.1` |
| `0062_gm46_has_recent_history.sql` | `0.31.7` | `dish-session-v4/roadmap-v2/GM-46.1` |
| `0064_gm49_delete_account.sql` | `0.31.8` | `release-v1/2026-11-20/GM-49.1` |
| `0065_gm48_hosted_tick_schedule.sql` | — | GM-48 dùng `pg_cron` trên hosted |
| `0066_gm35_profile_display_name.sql` | `0.31.9` | `roadmap-v2/GM-35/profile-display-name` |

`0062_gm35_profile_display_name.sql` và `0.31.7` trong các lượt QA trước phản ánh revision cũ. Phiên mới kiểm `0066` và `0.31.9` với `upstream_revision = 'GM-22/0022; base 0064'`.

- Runner Auth/Mailpit đạt 5/5 nhóm, gồm xác minh một lần, đăng nhập bằng mật khẩu, liên kết khách giữ UUID, đổi và recovery mật khẩu. Sau ACK đổi tên, chính chủ và tài khoản bạn bè đọc tên mới. UUID, mã bạn bè, avatar seed và quan hệ giữ nguyên. Smoke GM-45 Realtime đạt 22/22 trên cùng QA. Đã dọn worker, Supabase và network của phiên thử.
- TypeScript, `check:architecture`, 20/20 ca runner ở repo gốc, `validate_repository.py` và `task_readiness.py --check-docs` đạt. Jest tập trung đạt 115/115 ca trong `authSession`, `authTransport` và `pr155RemainingFlows`. Ca đổi phiên giữ kết quả request cũ dừng trước transport. Sau khi ghép, fixture kiểm lịch sử gần đây của GM-46 được đặt thành tài khoản đã bật lưu lịch sử để kiểm đúng đường đọc. Fixture phiên khách giữ mặc định khách cho các ca khác. Ba suite UI tài khoản/hồ sơ đạt 18/18 khi chạy lại với timeout 60 giây sau một timeout ở lượt Windows mặc định.
- Lượt Jest toàn bộ trên Windows ghi timeout ở `liveDishResultScreen` cho ca `renders DECIDED result with Top 3 podium, winner and price`. Một lượt đối chứng chỉ chạy ca này trên checkout `main` `ebd21af` cũng timeout với giới hạn 30 giây. Kết quả CI của HEAD PR được theo dõi riêng với lượt Windows này.
- Lượt Python 3.12 chạy 722 ca, còn 3 failure, 2 error và 7 ca bỏ qua. Hai failure truy vết `TC-ROOM-001` được xử lý trong `926000e`: khôi phục tên đã đăng ký của ca tạo phòng và giữ assertion khách không đọc danh sách bạn. Chạy lại nhóm `test_test_cases.py` đạt 25/25 và ca Jest tạo phòng đạt 1/1. Hai ca lỗi Git của `test_field_contracts` và `test_task_readiness` đạt khi chạy lại riêng. Ca tạo symlink của GM-40 còn vướng quyền trên Windows (`WinError 1314`).
- `python scripts/task_readiness.py --task GM-35 --gate merge --base-ref origin/main --verify-outputs` đọc Project #2 và trả `READY_FOR_MERGE_REVIEW` trên `ebd21af`. Blocker `BLOCKED_ON_BASE` của GM-16 đã hết. Checker xác nhận dependency và artifact. AVD bắt buộc vẫn cần kết quả thực tế trước merge.
- Rà trùng lặp trên base `ebd21af`: #208 đã merge với `0065`. PR #209 chỉ sửa tài liệu GM-51 và không giao nhau với file của #182. Kế hoạch GM-54 còn tham chiếu `0065_gm54_app_min_version.sql`, cần chọn số còn trống khi task đó triển khai. [Kế hoạch GM-54](../../../../tasks/backlog/GM-54.md)

### Bằng chứng AVD còn thiếu trên revision cuối

Trí thực hiện lượt Chặng 3A trên HEAD của PR #182 sau `1a5d335`. Các lượt AVD ở trên vẫn được lưu theo SHA đã chạy. Bằng chứng mới cần có đăng nhập lại bằng mật khẩu, xác minh và recovery hoàn chỉnh từ UI với mã Mailpit, G04 lỗi và retry, G05 chặn gửi lặp và ảnh ba ô trống sau lỗi ghi API, ảnh đối chiếu 412dp, 320/360dp, chữ 200%, TalkBack, bàn phím, Back và safe area. Các ca này đang **Not run** trên revision cuối, chờ lượt AVD của Trí. [Ma trận](FIGMA_PARITY.md#bàn-giao-lượt-avd-cho-trí)

## Lượt AVD Chặng 3A trên `de8f018` (2026-11-24) và che email ở màn nhập mã

Máy Android API 37 (`Medium_Phone_API_37.0`, 1080×2400, 420 dpi ≈ 412dp, chữ 1,0), Expo Go 58.0.5 / SDK 58, QA sạch `gm35-avd3a-1124-2123` (Supabase CLI 2.120.0, `qa:verify` PASS với 52 migration, worker heartbeat, `gm35_account_check.mjs` 5/5 nhóm Auth/Mailpit). App nối QA qua proxy loopback chỉ giả lỗi 503 cho `PUT /auth/v1/user` khi có tệp cờ. Tài khoản và mật khẩu là giá trị thử, không ghi vào log hay ảnh.

| Ca | Kết quả | Bằng chứng |
| --- | --- | --- |
| Đăng ký email, OTP từ Mailpit, xác minh, vào app | Đạt | [Form](avd-20261124/03_signup_filled_412.png), [Nhập mã](avd-20261124/04_verify_412.png) |
| G04 bấm lặp khi pending | Đạt: ba lần bấm, proxy ghi đúng một request | [Đang lưu](avd-20261124/09_g04_pending_412.png) |
| G04 lỗi 503 giữ tên, nút mở lại | Đạt | [Sau lỗi](avd-20261124/10_g04_error_412.png) |
| G04 thử lại có ACK | Đạt: request được chuyển tới GoTrue, đọc lại DB QA ra tên mới | [Sau thử lại](avd-20261124/11_g04_retry_ok_412.png) |
| G05 bấm lặp khi pending | Đạt: ba lần bấm, một request | [Đang cập nhật](avd-20261124/13_g05_pending_412.png) |
| G05 lỗi 503 ở bước ghi | Đạt: cả ba ô trống, nút mở lại | [Sau 503](avd-20261124/14_g05_after_503_412.png) |
| Quên mật khẩu → OTP → mật khẩu mới | Đạt | [Hoàn tất](avd-20261124/19_recovery_done_412.png) |
| Đăng nhập bằng mật khẩu mới; mật khẩu cũ bị từ chối | Đạt: UI vào Home, `POST /token` mật khẩu cũ 400, mật khẩu mới 200 | [Đăng nhập](avd-20261124/20_login_newpw_412.png) |
| Ảnh đối chiếu Figma 412dp | **Not run**: chưa ghép ảnh app với frame Figma, vì chưa mở Figma trong trình duyệt. | Chờ Trí hoặc lượt tiếp theo |
| 360dp, 320dp, chữ 200% | Đạt một phần, xem mục dưới | [Ảnh](avd-20261124/) |
| Bàn phím, Back, safe area | **Not run** có hệ thống. Chỉ dùng Back và bàn phím trong lúc thao tác ca ở trên, chưa kiểm riêng. | Chờ lượt tiếp theo |
| TalkBack | **Not run** | Chờ lượt tiếp theo |

### Che email, số điện thoại ở màn nhập mã (bắt buộc bảo mật)

Trước sửa, màn "Kiểm tra hộp thư" hiện nguyên địa chỉ ([ảnh trước sửa](avd-20261124/17_recovery_masked_412.png)). Sau sửa, `mobile/src/features/account/services/maskContact.ts` chỉ cho thấy phần cuối: bốn dấu chấm cố định (không lộ độ dài), ký tự cuối của tên khi tên từ 4 ký tự, và phần miền. Số điện thoại chỉ còn ba số cuối. Trên AVD hiện `••••a@example.test` ([ảnh](avd-20261124/21_recovery_code_masked_412.png)). `mobile/tests/unit/maskContact.test.ts` 5/5; `accountAccessScreen.test.tsx` kiểm đúng chuỗi đã che. TypeScript và ESLint các tệp đã sửa đạt.

### Mật khẩu được băm trước khi lưu

Mật khẩu chỉ đi tới GoTrue qua HTTPS. Schema `public` không có cột mật khẩu. Trên DB QA, 3/3 dòng `auth.users` có `encrypted_password` dạng bcrypt (`$2a$`, 60 ký tự). Client không ghi mật khẩu vào SecureStore, SQLite hay log.

### Kích thước nhỏ và chữ 200% (đã chụp ngày 2026-11-24)

Đặt bằng `adb shell wm size` và `settings put system font_scale`: 412dp (1080×2400), 360dp (945×2100), 320dp (840×1867), chữ 1,0 và 2,0. Với mỗi ảnh, `uiautomator dump` được kiểm: không có phần tử nào vượt chiều rộng màn hình.

| Cấu hình | Màn đã chụp | Kết quả |
| --- | --- | --- |
| 412dp, chữ 1,0 | Cá nhân, Sửa hồ sơ, Đổi mật khẩu | Không tràn ngang |
| 360dp, chữ 1,0 | Đăng nhập, Quên mật khẩu, Đăng ký, Cá nhân, Sửa hồ sơ, Đổi mật khẩu | Không tràn ngang |
| 360dp, chữ 2,0 | Cá nhân, Sửa hồ sơ, Đổi mật khẩu | Không tràn ngang |
| 320dp, chữ 1,0 | Đăng nhập, Quên mật khẩu, Đăng ký, Cá nhân, Sửa hồ sơ, Đổi mật khẩu | Không tràn ngang |
| 320dp, chữ 2,0 | Cá nhân; Đăng nhập (xem bằng mắt, không lưu ảnh) | Không tràn ngang. Nội dung bẻ dòng và cuộn được. Thanh tab dưới che nửa dòng đầu của danh sách khi chưa cuộn. |

**Chưa chụp:** 320dp chữ 2,0 cho Sửa hồ sơ và Đổi mật khẩu; 360dp chữ 2,0 cho Đăng nhập, Quên mật khẩu, Đăng ký (lượt tự động bị lệch vì nút gửi nằm ngoài màn khi chưa cuộn). Ảnh `rec_code_*` lượt đầu bị loại vì đổi `wm size` làm Expo Go tải lại bundle. Biểu tượng bánh răng dev chồng lên chuông thông báo ở 320dp chữ 2,0 (đã có từ trước PR này, chỉ ghi nhận).

Màn Cá nhân vẫn hiện email đầy đủ của chính tài khoản đang đăng nhập; việc che chỉ áp dụng cho màn nhập mã.
