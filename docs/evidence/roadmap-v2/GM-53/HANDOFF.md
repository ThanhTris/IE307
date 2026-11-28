# GM-53 — Bàn giao xóa tài khoản và liên kết pháp lý

Tuấn thực hiện, Trí review. Mã nguồn ở nhánh `codex/gm-53-delete-account`,
base `d7b89f2`. Xem [kế hoạch](PLAN.md), [kết quả kiểm](CHECKS.md) và
[đối chiếu thiết kế](FIGMA_PARITY.md).

- Điểm vào sản phẩm là **Cá nhân → Xóa tài khoản**, route
  `/account/delete-account`, cho cả khách và tài khoản email. Từ Hồ sơ
  cũng mở được Quyền riêng tư, Điều khoản và Hỗ trợ ở trình duyệt. Phiên
  bản hiển thị lấy từ cấu hình Expo của bản đang chạy.
- Form nhập **XÓA**. Với email, app xác minh mật khẩu trên GoTrue của
  phiên hiện tại. Phiên xác minh tạm không được lưu hoặc đưa vào app.
  Khi cần mật khẩu, có lối **Quên mật khẩu?** ngay dưới ô nhập. Luồng
  khôi phục dùng email của tài khoản đang đăng nhập. Sau khi đặt mật khẩu,
  người dùng đăng nhập lại rồi mở lại màn xóa.
- App gọi GM-49 `POST /functions/v1/delete-account` bằng bearer hiện
  hành, body chỉ có UUID. Khi lỗi có thể thử lại, giữ cùng UUID và bearer
  trong bộ nhớ của phiên. Mật khẩu bị xóa khỏi form khi gửi. Sau force-stop
  hoặc bearer hết hạn, phiên phải được xác minh lại.
- Chỉ sau ACK đúng UUID và `deleted:true`, app vô hiệu hóa epoch, xóa
  token, cache, phiếu nháp/bản nhận, bí mật thông báo và payload/metadata
  SQLite của danh tính qua GM-31, rồi về Welcome. Lỗi dọn local giữ phiên
  ở trạng thái khóa và cho thử lại dọn local. Auth và dữ liệu server do
  GM-49 thu hồi trong giao dịch.
- Tham chiếu upstream: [GM-35](../GM-35/HANDOFF.md),
  [GM-49](../GM-49/HANDOFF.md) và [GM-50](../GM-50/HANDOFF.md).
- Liên kết khách theo thứ tự email → xác minh OTP → đặt mật khẩu.
  GoTrue chuyển cùng UUID sang tài khoản email ngay sau OTP. Quay lại từ
  màn đặt mật khẩu giữ nguyên liên kết và phiên hiện tại.

## Bước 5 — kiểm Expo Go trên AVD

Tuấn xác nhận đã kiểm thủ công bằng Expo Go trên điện thoại Android
ngày 26/11/2026 và xác nhận lại lỗi bàn phím sau sửa. Trí sửa bàn phím
bằng `ef6ee889`, kiểm lại ca 320dp và chữ 200%, sau đó chạy AVD Chặng
3A nối QA thật trên mã app tại `9de4903a`. [Lượt 27/11](avd-2026-11-27/RESULTS.md)
· [Lượt 28/11](avd-2026-11-28/RESULTS.md) · [Bằng chứng và các ca còn chờ](CHECKS.md#tổng-hợp-avd-chặng-3a-ngày-27-và-28-tháng-11)

Dùng stack QA riêng và tài khoản thử nghiệm vì xóa là thao tác thật.
Không dùng môi trường production. Mở Docker Desktop và Android AVD.

Stack `gm53-1126` đã được dựng với API 54381, DB 54382 và Mailpit 54384.
Nếu stack còn chạy, từ thư mục gốc kiểm bằng
`npm run qa:verify -- --run-id gm53-1126` rồi dùng `gm53-1126` cho
terminal Expo bên dưới. Edge của stack này đã phục vụ route delete-account.

Sau khi mở lại Docker, kiểm riêng endpoint vì `qa:verify` không probe
Edge. Nếu gateway trả 502 và container Edge đang dừng, khởi động lại
đúng container QA, chờ sẵn sàng rồi kiểm lại. POST không có bearer phải
trả 401 từ hàm. Nếu worker đã dừng, chạy lại `qa:worker-start`.

```powershell
docker start supabase_edge_runtime_gm03qa-gm53-1126
npm run qa:worker-start -- --run-id gm53-1126
npm run qa:verify -- --run-id gm53-1126
curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:54381/functions/v1/delete-account
```

Nếu cần dựng stack mới, từ thư mục gốc chọn các cổng còn trống, cài
root dependencies nếu thiếu, rồi xác minh stack ngay sau khi tạo.

```powershell
$gm53QaRun = "gm53-$(Get-Date -Format 'MMdd-HHmmss')"
npm ci --no-audit --no-fund
npm run qa:start -- --run-id $gm53QaRun --api-port 54381 --db-port 54382 --mail-port 54384
npm run qa:verify -- --run-id $gm53QaRun
npm run qa:worker-start -- --run-id $gm53QaRun
$gm53QaPath = (Resolve-Path ".work/qa/$gm53QaRun").Path
New-Item -ItemType Directory -Force (Join-Path $gm53QaPath 'supabase/functions/delete-account') | Out-Null
Copy-Item supabase/functions/delete-account/index.ts (Join-Path $gm53QaPath 'supabase/functions/delete-account/index.ts')
$gm53QaNetwork = (Get-Content (Join-Path $gm53QaPath 'state.json') -Raw | ConvertFrom-Json).networkId
node node_modules/supabase/dist/supabase.js functions serve delete-account --workdir $gm53QaPath --network-id $gm53QaNetwork --no-verify-jwt
```

Giữ terminal chạy Edge mở. Trong terminal Expo, dùng chính run ID vừa
tạo. Nếu đổi cổng, cập nhật cả URL, `adb reverse` và cổng bên dưới.
Đăng ký email QA rồi lấy OTP ở Mailpit `http://127.0.0.1:54384`.
Khóa lấy từ file là khóa public của QA. Không chụp file credential,
mật khẩu, OTP hoặc bearer vào bằng chứng.

```powershell
$gm53QaRun = '<run-id-vừa-tạo>'
$gm53QaPublic = Get-Content ".work/qa/$gm53QaRun/credentials.private.json" -Raw | ConvertFrom-Json
$env:EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54381'
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $gm53QaPublic.anonKey
adb reverse tcp:54381 tcp:54381
adb reverse tcp:8081 tcp:8081
Set-Location mobile
npm ci --no-audit --no-fund
npx expo start --go --localhost --port 8081 --clear
```

Nhấn `a` trong Expo để mở AVD. Dùng một tài khoản khác cho mỗi ca
xóa thành công. Nếu còn phiên cũ từ stack khác, xử lý bằng luồng khôi
phục/xóa phiên của app trước khi tạo khách QA.

| Ca | Thao tác và kết quả mong đợi |
| --- | --- |
| Khách | Cá nhân → Xóa tài khoản. Bấm Hủy để về Hồ sơ. Mở lại, nhập sai cụm để kiểm nút khóa. Nhập XÓA rồi gửi. App về Welcome sau ACK. |
| Email | Thử mật khẩu sai. Ô mật khẩu trống lại, thông báo lỗi hiện, phiên vẫn mở. Nhập đúng và gửi. App về Welcome. Thử đăng nhập lại bằng tài khoản đã xóa. |
| Email liên kết nhưng chưa đặt mật khẩu | Tạo khách QA, liên kết email, nhập OTP Mailpit rồi bấm Back ở màn Đặt mật khẩu. Từ **Cá nhân → Xóa tài khoản** bấm **Quên mật khẩu?**, gửi mã cho email đang đăng nhập, nhập OTP, đặt mật khẩu và bấm **Quay lại đăng nhập**. Đăng nhập bằng mật khẩu mới, mở lại màn xóa, xác nhận và kiểm app về Welcome. |
| Pending / Back | Dùng độ trễ có kiểm soát ở QA hoặc slow network. Bấm liên tiếp và bấm Back phần cứng khi đang gửi. Chỉ có một yêu cầu và màn vẫn đứng tại chỗ đến khi có kết quả. Với tài khoản email, kiểm **Quên mật khẩu?** khóa khi đang gửi. |
| Mất kết nối | Trên AVD, sau khi mở form thử bỏ `adb reverse` của cổng API. Gửi, kiểm vẫn ở form và giữ phiên. Nối lại cổng, thử lại đến khi server ACK. Xem kiểm tự động cho UUID/bearer lặp lại. |
| Đang trong phòng | Tạo/phục hồi phòng chờ rồi mở form. Kiểm thông báo yêu cầu rời/hủy phòng hoặc đợi vòng kết thúc. Rời/hủy đúng luồng, quay lại và thử. Dùng phiên khác để kiểm ở vai trò thành viên nếu cần. |
| Phiên hết hạn | Dùng QA thu hồi phiên qua Auth của tài khoản thử. Kiểm thông báo phiên hết hạn và nút quay lại Welcome để đăng nhập. |
| Dọn dữ liệu máy | Sau xóa, Back/reload/cold start vẫn ở Welcome. Tạo khách khác, kiểm không có lịch sử, nháp phiếu hoặc phòng của tài khoản cũ. Dùng runner GM-49 để kiểm server với JWT cũ. |
| Link / version | Mở lần lượt Quyền riêng tư, Điều khoản và Hỗ trợ. Kiểm URL đúng và trở lại app được. Đối chiếu phiên bản trên Hồ sơ với bản đang chạy. |
| Hiển thị | Chụp ở 412dp rồi thử 320/360dp, chữ 200%, tối và TalkBack. Kiểm label, thứ tự focus, vùng chạm, bàn phím, safe area và nút gửi nhìn được khi cuộn. |

Ca hồi quy sau lượt Expo Go trên điện thoại thật:

- Bật chế độ tối ở Trang chủ. Kiểm ảnh bàn ăn hòa với nền banner, không
  thấy khung nền sáng quanh ảnh.
- Ở Cá nhân, kiểm nút xóa có thùng rác trong nhóm Tài khoản và Đăng xuất
  nằm dưới Thông tin ứng dụng. So nền ô XÓA với ô mật khẩu ở sáng và tối.
- Hoàn tất màn xin quyền, đăng xuất rồi đăng nhập cùng hoặc khác tài khoản.
  Màn xin quyền lần đầu không hiện lại. Quyền thực tế vẫn lấy từ hệ điều hành
  khi dùng tính năng.
- Cho lượt kiểm lại trên điện thoại QA ngày 26/11/2026, cờ xin quyền của
  bản cài đặt được đặt lại. Lần đăng nhập kế tiếp phải thấy màn xin quyền.
  Các quyền Android đã cấp cho Expo Go vẫn hiển thị là đã cấp.
- Với khách, nhập email rồi xác minh OTP. Quay lại từ màn Đặt mật khẩu mới,
  kiểm Cá nhân có email đã liên kết. Kiểm trên một khách QA khác rằng lưu
  mật khẩu sau OTP cho phép đăng nhập bằng mật khẩu vừa đặt.
- Với tài khoản email, nhập cùng một giá trị ở cả ba ô Đổi mật khẩu. Nếu
  mật khẩu hiện tại nhập sai, ô hiện tại báo sai. Nếu đúng, ô mật khẩu mới
  yêu cầu chọn giá trị khác.

Các mã 403/409/429/5xx và thời gian Retry-After được kiểm trong unit
tests. Nếu dùng phản hồi QA giả lập để tái lập trên AVD, ghi rõ đó là
ca mô phỏng và ghi riêng các ca Auth/REST/Edge thật. Bổ sung commit/build,
Android/AVD, SDK Expo, run ID, thao tác, expected/actual và ảnh vào
[CHECKS](CHECKS.md), [FIGMA_PARITY](FIGMA_PARITY.md).

### Tài khoản đã liên kết email nhưng chưa đặt mật khẩu

Xác minh OTP `email_change` trên GoTrue hoàn tất liên kết và giữ nguyên
UUID. Nếu người dùng quay lại hoặc đóng app ở màn Đặt mật khẩu mới, phiên
đã liên kết vẫn dùng được khi còn hiệu lực. Đăng nhập bằng mật khẩu và
xác nhận mật khẩu khi xóa tài khoản cần mật khẩu đã đặt.
[Tài liệu Supabase Auth](https://supabase.com/docs/guides/auth/auth-anonymous#link-an-email--phone-identity)

Trí đã tái hiện tình huống trên AVD và chốt thêm **Quên mật khẩu?** ngay
trên màn xóa. Lối này hiện cho mọi tài khoản email khi form yêu cầu mật
khẩu hiện tại, áp dụng cả khi quên mật khẩu. Khách vẫn chỉ có ô XÓA.
[Quyết định trên PR #223](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7213447136)

Sau khi đặt mật khẩu, bấm **Quay lại đăng nhập** để kết thúc phiên cũ.
Đăng nhập lại bằng mật khẩu mới rồi xác nhận xóa. Kiểm Auth và Edge đã
xác nhận đường này trên QA. Tuấn xác nhận trọn luồng đạt trên Expo Go
điện thoại Android và Trí kiểm luồng đạt trên AVD ngày 27/11/2026.
[Kết quả kiểm](CHECKS.md#khôi-phục-mật-khẩu-từ-màn-xóa-tài-khoản)

### Đề xuất UX của Tuấn cho tài khoản email đang đăng nhập

Khi mở **Quên mật khẩu?** từ màn Xóa tài khoản, sau khi xác minh OTP và
đặt mật khẩu mới, đưa người dùng về **Cá nhân** với phiên đăng nhập hợp
lệ. Người dùng có thể mở lại màn xóa và xác nhận bằng mật khẩu mới.

Đề xuất chờ Trí xem xét. Trên QA, GoTrue đã thu hồi phiên cũ sau khi
đặt lại mật khẩu. Nếu triển khai, cần xác nhận cách duy trì hoặc cấp
lại phiên cho đúng tài khoản, đồng thời giữ bước xác minh mật khẩu
trước lệnh xóa. Luồng hiện tại vẫn dùng **Quay lại đăng nhập**.

Khi xong, dừng Expo/Edge. Với Edge được mở trong terminal, nhấn Ctrl+C
ở terminal Edge. Với run `gm53-1126`, PID của launcher đã lưu trong
`.work/qa/gm53-1126/gm53-edge.pid`. Chỉ dừng launcher nếu kiểm lại nó là
tiến trình `functions serve delete-account` của run này. Quay về thư mục
gốc để chạy `npm run qa:stop -- --run-id $gm53QaRun`. Bỏ cặp
`adb reverse` đã đặt nếu không còn dùng. Chạy gate merge kèm
`--verify-outputs` trước khi xin review.
