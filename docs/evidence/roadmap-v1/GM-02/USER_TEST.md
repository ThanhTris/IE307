# GM-02 — Phần test cho chủ dự án

Ngày 2026-10-08. Đây là kịch bản để bạn chạy và ghi kết quả, chưa là kết quả native đã chạy. [Báo cáo thực tế](REPORT.md). Chỉ thử bản nền, chưa thử tính năng chọn món.

## Xem giao diện ngay bằng Expo Go (không cần Android SDK trên PC)

1. Cài [Expo Go cho SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=true) trên Android.
2. Cho điện thoại và PC vào cùng Wi-Fi.
3. Chạy PowerShell:

```powershell
Set-Location 'C:\Users\ADMIN\.codex\worktrees\1043\Project\mobile'
npm.cmd run start:go
```

4. Mở Expo Go → Scan QR code → quét QR trong terminal. Giữ terminal chạy; nhấn Ctrl+C khi xong. Không bấm A (mở Android emulator/adb) nếu chưa có SDK.

Mong đợi mở màn “Bản kiểm tra nền GM-02”. Có thể thử màn hình, nhập mã ABC234, QR trong app và bộ đếm; mục notification sẽ nói cần development build, không phải lỗi app. Quyền/dữ liệu thuộc container Expo Go. Custom scheme/cold launch app riêng, APK và push từ server vẫn thử theo development build bên dưới, không ghi Pass từ Expo Go. [Giới hạn notifications của Expo Go](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

QR fixture để thử camera: [mở QR mẫu `qr-sample-ABC234.svg`](qr-sample-ABC234.svg) trên màn hình PC rồi trong app bấm “Mở camera quét QR”. Payload chính xác là `gi-cung-duoc://join?code=ABC234`; đây là mã cục bộ để kiểm parser và màn xác nhận, không cấp quyền hoặc join phòng thật. QR trong terminal ở bước trên vẫn là QR để tải app vào Expo Go.

## 1. Kiểm tự động

Mở PowerShell:

```powershell
Set-Location 'C:\Users\ADMIN\.codex\worktrees\1043\Project\mobile'
npm ci
npm run check
npm run check:expo
npm run bundle:android
```

Mong đợi: mỗi lệnh exit 0, typecheck/lint không lỗi, Jest xanh, domain boundary OK, Expo dependency phù hợp, bundle Android được tạo trong dist/android (ignored). Bundle JS không phải APK.

## 2. Chạy trên Android

Cần Node/JDK, Android Studio/SDK 36 và emulator hoặc máy thật USB debugging. Nếu SDK ở đường dẫn mặc định, đặt biến cho phiên PowerShell (đổi nếu cài chỗ khác):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
adb devices
npm run android
```

Chấp nhận USB debugging trên thiết bị. Mong đợi app development build mở màn “Bản kiểm tra nền GM-02”. Lần sau `npm start` rồi mở app đã cài. Nếu chưa có SDK/thiết bị, ghi Not run; không dùng ảnh prototype thay kết quả này.

## 3. Checklist thiết bị

| ID | Thao tác | Kết quả cần thấy |
| --- | --- | --- |
| B-01 | Mở app lần đầu, chưa bấm gì | Hiện nhãn spike và giới hạn; chưa hỏi camera/thông báo |
| B-02 | Nhập abc234 → Kiểm tra mã | Ô nhập tự viết thành ABC234; màn xác nhận hiện ABC234, ghi chưa join server; Back/Về màn kiểm tra hoạt động |
| B-03 | Nhập ABO234 hoặc ít hơn 6 ký tự | Báo không hợp lệ, không mở màn phòng |
| B-04 | Bấm quét → từ chối camera | Vẫn nhập ABC234 được; từ chối vĩnh viễn có Mở Cài đặt |
| B-05 | Cho camera → quét QR link mẫu | Mở đúng một màn xác nhận ABC234; camera đóng khi chuyển màn/ra nền |
| B-06 | Quét QR URL lạ hoặc link có thêm token/query | Báo không hợp lệ; không mở browser hoặc tham gia phòng |
| B-07 | Tăng bộ đếm vài lần → force-stop bằng hệ thống → mở app lại | Giá trị giữ nguyên; Đọc lại đồng bộ; Đặt lại về 0 rồi restart vẫn 0 |
| B-08 | Bấm thử thông báo → từ chối quyền | Báo từ chối, QR/SQLite vẫn dùng được |
| B-09 | Bật quyền → bấm thử → đưa app ra nền → chạm thông báo sau 3 giây | Thông báo trung tính; mở app và ghi đã nhận thao tác chạm local notification |
| B-10 | Lặp B-09 nhưng đóng app trước khi chạm | Cold launch nhận thao tác nếu OS giao; ghi OS/thời gian thực tế; không gọi là remote push |
| B-11 | Đổi dark/light, font hệ thống 200%, TalkBack | Text/nút đọc được, scroll tới mọi mục, nút >=48dp; ghi lỗi nếu có |
| B-12 | Tắt mạng sau khi bundle đã tải, thử manual/SQLite/local notification | Các spike cục bộ vẫn thử được; không hiện phòng/kết quả nhóm giả |

QR hợp lệ chứa chính xác `gi-cung-duoc://join?code=ABC234`. QR không hợp lệ có thể chứa `https://example.com/` hoặc `gi-cung-duoc://join?code=ABC234&token=test`. Không dùng dữ liệu/token thật.

## 4. Link warm/cold qua adb

Khi app đang mở, chạy lệnh đầu để thử warm link; sau đó force-stop và mở link để thử cold link:

```powershell
adb shell am start -W -a android.intent.action.VIEW -d 'gi-cung-duoc://join?code=ABC234' vn.gicungduoc.sandbox
adb shell am force-stop vn.gicungduoc.sandbox
adb shell am start -W -a android.intent.action.VIEW -d 'gi-cung-duoc://join?code=ABC234' vn.gicungduoc.sandbox
```

Mong đợi cả hai tới màn xác nhận ABC234, không tự join/ready. Metro cần đang chạy cho development build. Chưa có HTTPS association/deferred link/server state nên không nghiệm thu các phần đó của T-18.

## 5. Gửi lại kết quả

Ghi: model thiết bị, Android version, Node/npm/JDK, mạng, ngày, ID test + Pass/Fail/Not run; lỗi ghi thao tác, expected/actual và ảnh màn hình nếu tiện. Không gửi token, raw votes, credentials hoặc tọa độ cá nhân. Khi phát hiện lỗi, mình sửa và chạy lại các kiểm tra liên quan trước báo cáo tiếp.

T-01 guest/session, T-17 remote push/receipt/inbox và T-18 membership/full/locked/expired phải test ở task tính năng tương ứng; các spike này không đóng AC đó.
