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

## Bước 5 — kiểm Expo Go trên AVD

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
| Pending / Back | Dùng độ trễ có kiểm soát ở QA hoặc slow network. Bấm liên tiếp và bấm Back phần cứng khi đang gửi. Chỉ có một yêu cầu và màn vẫn đứng tại chỗ đến khi có kết quả. |
| Mất kết nối | Trên AVD, sau khi mở form thử bỏ `adb reverse` của cổng API. Gửi, kiểm vẫn ở form và giữ phiên. Nối lại cổng, thử lại đến khi server ACK. Xem kiểm tự động cho UUID/bearer lặp lại. |
| Đang trong phòng | Tạo/phục hồi phòng chờ rồi mở form. Kiểm thông báo yêu cầu rời/hủy phòng hoặc đợi vòng kết thúc. Rời/hủy đúng luồng, quay lại và thử. Dùng phiên khác để kiểm ở vai trò thành viên nếu cần. |
| Phiên hết hạn | Dùng QA thu hồi phiên qua Auth của tài khoản thử. Kiểm thông báo phiên hết hạn và nút quay lại Welcome để đăng nhập. |
| Dọn dữ liệu máy | Sau xóa, Back/reload/cold start vẫn ở Welcome. Tạo khách khác, kiểm không có lịch sử, nháp phiếu hoặc phòng của tài khoản cũ. Dùng runner GM-49 để kiểm server với JWT cũ. |
| Link / version | Mở lần lượt Quyền riêng tư, Điều khoản và Hỗ trợ. Kiểm URL đúng và trở lại app được. Đối chiếu phiên bản trên Hồ sơ với bản đang chạy. |
| Hiển thị | Chụp ở 412dp rồi thử 320/360dp, chữ 200%, tối và TalkBack. Kiểm label, thứ tự focus, vùng chạm, bàn phím, safe area và nút gửi nhìn được khi cuộn. |

Các mã 403/409/429/5xx và thời gian Retry-After được kiểm trong unit
tests. Nếu dùng phản hồi QA giả lập để tái lập trên AVD, ghi rõ đó là
ca mô phỏng và ghi riêng các ca Auth/REST/Edge thật. Bổ sung commit/build,
Android/AVD, SDK Expo, run ID, thao tác, expected/actual và ảnh vào
[CHECKS](CHECKS.md), [FIGMA_PARITY](FIGMA_PARITY.md).

Khi xong, dừng Expo/Edge. Với Edge được mở trong terminal, nhấn Ctrl+C
ở terminal Edge. Với run `gm53-1126`, PID của launcher đã lưu trong
`.work/qa/gm53-1126/gm53-edge.pid`. Chỉ dừng launcher nếu kiểm lại nó là
tiến trình `functions serve delete-account` của run này. Quay về thư mục
gốc để chạy `npm run qa:stop -- --run-id $gm53QaRun`. Bỏ cặp
`adb reverse` đã đặt nếu không còn dùng. Chạy gate merge kèm
`--verify-outputs` trước khi xin review.
