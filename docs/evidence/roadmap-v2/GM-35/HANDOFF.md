# GM-35 — Bàn giao tài khoản, hồ sơ và recovery

[GM-35 / #96](../../../../tasks/backlog/GM-35.md) · Tuấn phụ trách · Trí (`ThanhTris`) review. Nhánh `codex/gm-35-account-profile-recovery` nhắm tới `main`, hợp đồng UI `ui-figma-final/2026-10-25/GM-35.2`. Revision theo từng lượt kiểm, xác nhận Expo Go ngày 2026-11-19 và bằng chứng API nằm trong [CHECKS](CHECKS.md). Bảng đường dẫn Figma và các khác biệt nằm trong [FIGMA_PARITY](FIGMA_PARITY.md).

## Các đường vào sản phẩm

- `/welcome` mở đăng nhập hoặc đăng ký bằng email. Đăng ký và gửi lại xác minh dẫn đến ô nhập mã sáu chữ số.
- `/profile` với khách hiển thị tên đã nhập, hai mục Giao diện và Cỡ chữ, nút Đăng nhập và Liên kết email. Liên kết gồm xác minh email rồi đặt mật khẩu trên cùng user ID. Email trùng giữ nguyên phiên khách. Đăng nhập một tài khoản có sẵn chuyển sang user ID và dữ liệu của tài khoản đó.
- Footer vẫn mở được Bạn bè và Lịch sử khi là khách. Cả hai route hiển thị lời mời đăng nhập. Kèo nhanh, mời bạn từ danh sách, Hộp thư và đăng ký push dành cho tài khoản đăng nhập. Khách tạo và tham gia phòng, chia sẻ mã hoặc QR trong phòng như thường lệ.
- `/profile` với tài khoản hiển thị thông tin từ GoTrue và mở Sửa hồ sơ, Đổi mật khẩu, hoặc xác nhận Đăng xuất. Khi GoTrue cập nhật `user_metadata.display_name`, migration `0062` cập nhật tên ở `public.profiles` trong cùng giao dịch. Bạn bè và tra mã đọc tên mới ngay sau khi tải lại. API phòng và lịch sử giữ ACL theo user ID hiện hành.
- Từ Đăng nhập chọn **Quên mật khẩu?** để nhận mã. Nếu mở từ **Đổi mật khẩu → Quên mật khẩu hiện tại?**, service so khớp email nhập vào với email của phiên đang đăng nhập trước khi gửi mã. Phiên recovery chỉ tồn tại trong bộ nhớ và được thu hồi sau khi đổi mật khẩu hoặc bỏ luồng. Đăng xuất quay thẳng về `/welcome`.

## Artifact cho các phần tích hợp tiếp theo

| Artifact | Nội dung và nơi dùng |
| --- | --- |
| [Account feature](../../../../mobile/src/features/account/index.ts) và [route account](../../../../mobile/src/app/account/%5Bflow%5D.tsx) | Điểm vào production cho đăng nhập, đăng ký, liên kết, recovery, sửa hồ sơ và đổi mật khẩu. Nhánh bổ sung các đường vào tài khoản trên shell hiện có. Diff với `main` không xóa hoặc đổi tên route sản phẩm. |
| [Auth service](../../../../mobile/src/data/auth/account.ts) và [composition](../../../../mobile/src/data/auth/index.ts) | Consumer nhận phiên/token qua GM-16. Liên kết giữ UUID của khách. Đăng nhập vào một tài khoản sẵn có dùng phiên và dữ liệu của tài khoản đích. Recovery giữ proof riêng theo phiên và màn. Người bảo trì Auth dùng lại các điểm này khi mở rộng provider. |
| [Cài đặt Cá nhân](../../../../mobile/src/features/account/components/ProfileSettings.tsx), [tùy chọn thiết bị](../../../../mobile/src/shared/lib/AppPreferences.tsx) và [adapter lịch sử Cá nhân](../../../../mobile/src/features/account/services/profileHistorySettings.ts) | Giao diện/cỡ chữ dùng chung cho khách và tài khoản, lưu theo thiết bị. Công tắc Thông báo điều khiển banner trong app. Lưu lịch sử cập nhật consent cá nhân qua API và khi tắt sẽ thu hồi quyền lưu, đồng thời xóa lịch sử cá nhân theo chính sách backend. Adapter dùng API GM-28 để xóa từng mục cá nhân sau xác nhận, giữ lịch sử nhóm và dừng giữa các mục nếu phiên thay đổi. |
| [Bộ kiểm tra GoTrue](../../../../scripts/gm35_account_check.mjs) và [GM-35.http](../../../../supabase/tests/http/GM-35.http) | QA/release có thể tái lập đăng ký, xác minh, liên kết tài khoản khách, đổi và đặt lại mật khẩu, rồi xác minh đổi tên bằng hai tài khoản có quan hệ bạn bè. Dùng tài khoản thử riêng, OTP từ Mailpit và Publishable Key của phiên QA. |

Code tài khoản dùng GoTrue `auth/v1`. Migration [`0062_gm35_profile_display_name.sql`](../../../../supabase/migrations/0062_gm35_profile_display_name.sql) đăng ký schema `0.31.7`, sau `0061`/`0.31.6` của GM-45 trên `main` `5bbee5d`. Runner GM-35 kiểm migration và đăng ký schema trên phiên QA đã xác minh. Trigger nhận tên hợp lệ khi metadata thay đổi, dùng UUID của dòng Auth và chỉ cập nhật tên cùng version của hồ sơ. UUID, mã bạn bè, avatar seed và quan hệ bạn bè giữ nguyên. Các hồ sơ đã lệch tên từ bản thử cũ cần một lần đổi sang tên hợp lệ mới hoặc kế hoạch đối soát riêng nếu cần xử lý hàng loạt. Supabase hosted và kiểm gửi Gmail thật thuộc bước triển khai sau.

## Bàn giao producer GM-16

Trí review ranh giới producer trong [PR #183](https://github.com/ThanhTris/IE307/pull/183). [GM16_PRODUCER.patch](GM16_PRODUCER.patch) tách ba file quản lý phiên và kiểm dữ liệu Auth từ baseline `5bbee5d`. Code của consumer GM-35 đã có trên PR #182.

| Producer | Đề xuất bàn giao |
| --- | --- |
| GM-16 · [`session.ts`](../../../../mobile/src/data/auth/session.ts) | Producer bàn giao `runAccountOperation`, callback công bố phiên và thứ tự serialize đổi phiên, xoay token, logout. Epoch tiến khi bắt đầu thay danh tính và khi phiên mới đã lưu an toàn. Lấy token kiểm epoch đã chụp trước hàng đợi và client kiểm lại ngay trước transport. Phần này cần review cùng kiểm thử `clearPrivateData` tạm dừng. GM-35 giữ thao tác đăng nhập, xác minh, recovery và màn hình tiêu thụ API phiên. |
| GM-28 · [`historyRepository.ts`](../../../../mobile/src/features/history/services/historyRepository.ts) | Artifact đã khớp `origin/main` `5bbee5d`. GM-35 giữ luồng xóa nhiều mục cá nhân trong adapter, tái sử dụng `fetch`, `delete`, `readConsent` và `updateConsent`. |

Sau khi chốt phạm vi, có thể kiểm và áp patch trên nhánh producer tách từ `5bbee5d`. Sao chép patch vào một thư mục ngoài checkout producer và dùng đường dẫn tuyệt đối.

```powershell
$patch = 'C:\path\GM16_PRODUCER.patch'
git apply --check $patch
git apply $patch
```

- Lớp phiên GM-16 sở hữu `runAccountOperation` và `onAccountSessionChange`, lưu token trước khi công bố danh tính, tăng epoch trước khi dọn cache và sau khi lưu phiên đích. Logout và refresh dùng cùng hàng đợi. Restore/refresh tiếp tục kiểm UUID và hỗ trợ phiên email đã xác minh.
- Patch nhận cùng hai guard của Auth nền. `isStoredSession` trong `validation.ts` và `userDto` trong `transport.ts` nhận phiên hợp lệ của cả khách và tài khoản khi restore/refresh. Đường tạo khách kiểm `isGuest === true` tại cả transport và session manager. Restore/refresh giữ đối chiếu UUID.
- GM-35 giữ OTP, recovery proof, credential validation, luồng GoTrue riêng cho tài khoản, màn hình và callback wiring của app. Giữ ca `consent started while guest cleanup is paused` trong [kiểm thử tích hợp client/repository](../../../../mobile/tests/unit/authSession.test.ts). Ca này kiểm request cũ dừng trước transport và request mới đi đúng một lần với token phiên đích.

Sau khi patch GM-16 được bàn giao lên `main`, GM-35 cần fetch và đồng bộ revision producer vào PR #182. Đối chiếu `session.ts` với artifact trên `origin/main`, chạy lại ca đổi phiên và `python scripts/task_readiness.py --task GM-35 --gate merge --base-ref origin/main --verify-outputs`. Xem [CHECKS](CHECKS.md).

## Kiểm thử trên Expo Go với mã Mailpit

Trong phiên QA local, GoTrue tạo mã 6 chữ số cho xác minh đăng ký, đặt lại mật khẩu và liên kết email của tài khoản khách. Lấy mã trong thư mới nhất ở Mailpit tại `http://127.0.0.1:54394`.

Mở Docker Desktop và dùng Node/Python theo runner GM-03. Chọn các cổng còn trống rồi chạy từ thư mục gốc. Nếu gặp `QA_HOST_BINDING_NOT_LOOPBACK`, đối chiếu cách cấu hình Docker trong [runbook GM-03](../GM-03/RUNBOOK_QA.md).

```powershell
$gm35Run = "gm35-mail-$(Get-Date -Format 'MMdd-HHmmss')"
npm ci
npm run qa:start -- --run-id $gm35Run --api-port 54391 --db-port 54392 --mail-port 54394
npm run qa:verify -- --run-id $gm35Run
node scripts/gm35_account_check.mjs $gm35Run
```

Khi kiểm đồng tồn tại với GM-45, dùng cùng phiên QA sạch sau khi `qa:verify` đạt:

```powershell
$env:GM03_QA_WORKDIR = (Resolve-Path ".work/qa/$gm35Run").Path
$env:GM03_QA_MANIFEST = (Resolve-Path ".work/qa/$gm35Run/manifest.json").Path
node scripts/gm45_realtime_check.mjs
```

Runner cần báo `READY` trước khi verify và thử Auth. Lấy `anonKey` từ `.work/qa/$gm35Run/credentials.private.json` cho `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trong `mobile/.env.local` và đặt `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54391`. Giữ credential và OTP trong môi trường QA.

Với AVD hoặc điện thoại Android qua USB, kiểm tra `adb devices` nhận thiết bị, rồi chuyển tiếp cả cổng API và Metro. Sau đó nhấn `a` trong cửa sổ Expo để mở app.

```powershell
adb reverse tcp:54391 tcp:54391
adb reverse tcp:8081 tcp:8081
Set-Location mobile
npm ci
npx expo start --go --localhost --port 8081
```

Dùng email thử nghiệm để đăng ký và nhập mã trong thư **Xác minh email**. Đăng nhập rồi đăng xuất, chọn **Quên mật khẩu?** và nhập mã trong thư **Đặt lại mật khẩu**. Sau đó lưu mật khẩu mới và đăng nhập lại. Khi kiểm xong, chạy `npm run qa:stop -- --run-id $gm35Run` để dọn phiên QA.

## Bàn giao lượt AVD cho Trí

Trí thực hiện lượt AVD trên revision cuối của PR #182, nối Auth, REST và worker của QA local đã xác minh. Dùng Mailpit để lấy OTP đăng ký và recovery. Với G04, tạo lỗi server có kiểm soát, kiểm tên vẫn giữ, rồi khôi phục kết nối và lưu lại đến khi thấy ACK thành công. Với G05, tạo khoảng chờ trước khi server trả lỗi, thử bấm lưu lần hai, rồi kiểm cả ba ô trống và nút lưu dùng lại được. Ghi SHA, Android/Expo, run ID QA, ảnh đối chiếu Figma 412dp và kết quả 320/360dp, chữ 200%, TalkBack, bàn phím và Back. [Bảng ca AVD](FIGMA_PARITY.md#bàn-giao-lượt-avd-cho-trí)

App gọi trực tiếp `signup`, `verify`, `token?grant_type=password`, `recover` và `user` dưới `/auth/v1`. Xác minh email dùng loại `signup`. Recovery dùng loại `recovery` và chỉ dùng token tạm để đặt mật khẩu. Gọi `logout?scope=local` để thu hồi phiên tạm đó. Request mẫu có trong [GM-35.http](../../../../supabase/tests/http/GM-35.http).
