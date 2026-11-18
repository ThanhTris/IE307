# GM-35 — Bàn giao tài khoản, hồ sơ và recovery

Nhánh `codex/gm-35-account-profile-recovery` từ `main` `a7c2201`. UI theo `ui-figma-final/2026-10-25/GM-35.2`. Kết quả thực thi và bước xác nhận Expo nằm trong [CHECKS](CHECKS.md). Đối chiếu màn và khác biệt nằm trong [FIGMA_PARITY](FIGMA_PARITY.md).

## Các đường vào sản phẩm

- `/welcome` mở đăng nhập hoặc đăng ký bằng email. Đăng ký và gửi lại xác minh dẫn đến ô nhập mã sáu chữ số.
- `/profile` với khách mở đăng nhập hoặc liên kết email. Liên kết gồm xác minh email trước rồi đặt mật khẩu trên cùng user ID. Email trùng giữ nguyên phiên khách. Đăng nhập một tài khoản có sẵn chuyển sang user ID và dữ liệu của tài khoản đó. Lịch sử của phiên khách vẫn thuộc user ID cũ.
- `/profile` với tài khoản hiển thị thông tin từ GoTrue và mở Sửa hồ sơ, Đổi mật khẩu, hoặc xác nhận Đăng xuất. Hồ sơ dùng trường `user_metadata.display_name`. Đồng bộ tên sang `public.profiles` thuộc BE hồ sơ. API phòng và lịch sử giữ ACL theo user ID hiện hành.
- Từ Đăng nhập chọn **Quên mật khẩu?** để nhận mã qua email. Phiên do recovery cấp chỉ tồn tại trong bộ nhớ và chỉ dùng để đổi mật khẩu. Sau đó người dùng quay về Đăng nhập.

## Dựng QA cho bước xác nhận Expo

Từ thư mục gốc, dùng Node và Supabase CLI theo lockfile của repo. Lệnh dựng QA yêu cầu Docker và Python theo runner GM-03. Chọn cổng còn trống cho ba dịch vụ.

Bộ cấu hình [email QA](../../../../supabase/qa/gm35/email.toml) chỉ áp dụng cho phiên mới có `--mail-port`. GM-35 dùng GoTrue cho đăng ký, xác minh, đăng nhập và recovery, không có migration riêng cho các luồng này. Số `0060` thuộc GM-44 trên `main`. Tạo run ID mới nếu phiên thử cũ có trigger hồ sơ tạm.

```powershell
npm ci
npm run qa:start -- --run-id gm35-expo --api-port 54381 --db-port 54382 --mail-port 54384
npm run qa:verify -- --run-id gm35-expo
node scripts/gm35_account_check.mjs gm35-expo
```

Trên máy Windows đã thử, Docker không đáp ứng kiểm tra bind loopback của runner (`QA_HOST_BINDING_NOT_LOOPBACK`). Runner đã dừng phiên QA đó. Chạy bước này trên một host QA có Docker bind API, DB và Mailpit về loopback.

Đọc giá trị `anonKey` của cấu hình QA riêng trong `.work/qa/gm35-expo/credentials.private.json` để đặt `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. App chỉ dùng khóa `anon` hoặc publishable. Với Android AVD, chuyển tiếp cổng bằng `adb reverse tcp:54381 tcp:54381`, đặt `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54381` trong `mobile/.env.local`, rồi chạy `npm ci` và `npm run start:go` từ `mobile`. Hộp thư QA mở tại `http://127.0.0.1:54384`. Dùng địa chỉ thử nghiệm mới cho ca đăng ký/liên kết.

Lần lượt thử đăng ký và mã sai, đăng nhập sau xác minh, recovery và đăng nhập bằng mật khẩu mới, khách liên kết email mới và email đã dùng, lưu tên khi mạng lỗi, đổi mật khẩu khi mạng lỗi và đăng xuất. Sau khi quan sát G04/G05 lúc mất mạng, bật lại kết nối và thử lưu lại. Chụp các màn ở 412dp và kiểm 320/360dp, font scale 200%, TalkBack, bàn phím, Back và safe area. Người yêu cầu thực hiện và xác nhận bước Expo. Trí là reviewer GM-35.

## Cấu hình GoTrue ở môi trường dùng chung

Khi bàn giao backend, áp dụng cấu hình Email Auth trên Supabase của môi trường đích. Bật đăng ký email và yêu cầu xác minh email, đặt độ dài mã là 6 và mật khẩu tối thiểu 8 theo cấu hình QA. Cấu hình SMTP của môi trường đó và dùng [mẫu OTP](../../../../supabase/templates/account-code.html) cho Confirmation và Recovery. Mẫu Email Change phục vụ luồng liên kết email hiện có. Mailpit chỉ dùng trong QA local.

App gọi trực tiếp `signup`, `verify`, `token?grant_type=password`, `recover` và `user` dưới `/auth/v1`. Xác minh email dùng loại `signup`. Recovery dùng loại `recovery` và chỉ dùng token tạm để đặt mật khẩu. Gọi `logout?scope=local` để thu hồi phiên tạm đó. Request mẫu có trong [GM-35.http](../../../../supabase/tests/http/GM-35.http).
