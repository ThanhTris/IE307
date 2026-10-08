# Mobile — GM-02 development spike

Bản nháp trên `sanbox` theo yêu cầu tiếp tục của chủ dự án ngày 2026-10-08. GM-01 còn Pending; GM-02 chưa Approved/Done hoặc đủ merge gate. Màn hình là spike kỹ thuật QR/link, SQLite và thông báo cục bộ; chưa có auth, API, phòng nhóm hoặc chọn món.

## Môi trường

Node >=22.13 (đã dùng 24.15.0), npm 11.12.1, JDK 17. Expo 57.0.27, React 19.2.3, React Native 0.86.3; mọi direct dependency khóa exact và dùng package-lock.json. [Version/license](../docs/evidence/roadmap-v1/GM-02/DEPENDENCIES.md) ghi metadata thực tế và lựa chọn peer. Dependency review độc lập vẫn Pending.

Android development build cần Android Studio/SDK Platform 36, platform-tools, môi trường Java/Android và thiết bị/emulator. Máy soạn bản nháp chưa có SDK/adb ở PATH hoặc vị trí mặc định; không có APK/native smoke đã đạt. Xem [hướng dẫn Expo](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build).

## Chạy

### Xem nhanh trên điện thoại khi chưa cài Android SDK

Cài [Expo Go hỗ trợ SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=true) trên điện thoại Android. Điện thoại và máy tính cùng Wi-Fi, chạy từ thư mục mobile:

```powershell
npm run start:go
```

Mở Expo Go → Scan QR code → quét QR trong terminal. Lệnh này dùng Expo Go qua LAN, không build APK nên không cần Android Studio/SDK/adb trên máy tính. Nếu CLI hiện QR của development build, kiểm đang chạy đúng `start:go`; không bấm A để mở Android khi chưa có SDK.

Có thể xem màn spike, thử mã/QR và counter SQLite. Mục notification sẽ hiện hướng dẫn dùng development build vì Expo Go Android SDK 57 ném lỗi khi nạp module `expo-notifications`; custom scheme `gi-cung-duoc://...`, cold start app riêng và remote push cũng cần development build. Expo Go không là evidence Android build đã đạt. Quyền/SQLite trong Expo Go thuộc container của Expo Go. [Expo Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) ghi remote push Android cần development build.

Ô mã thủ công tự chuyển ký tự sang in hoa khi gõ hoặc dán; parser vẫn kiểm tra lại mã trước khi mở màn xác nhận.

Để có QR mẫu cho bước camera, mở [QR fixture ABC234](../docs/evidence/roadmap-v1/GM-02/qr-sample-ABC234.svg) trên màn hình PC. Mã chứa `gi-cung-duoc://join?code=ABC234` và chỉ kiểm parser/màn xác nhận cục bộ.

### Kiểm source và build riêng

Từ thư mục `mobile`:

```powershell
npm ci
npm run check
npm run check:expo
npm run bundle:android
```

`check` gồm typecheck, lint, Jest và ranh giới domain. `bundle:android` kiểm Metro/Hermes bundle, không biên dịch APK. Kết quả thực tế nằm trong [báo cáo](../docs/evidence/roadmap-v1/GM-02/REPORT.md).

Sau khi có Android SDK và thiết bị/emulator:

```powershell
adb devices
npm run android
```

Lệnh android sinh native project từ app.config.ts rồi build/cài development client, khởi động Metro. Những lần sau dùng `npm start` và mở app đã cài. Không dùng Expo Go làm evidence development build/push. Không cấu hình EAS/projectId/FCM giả, không upload code hoặc credentials.

Chiến lược CNG: app.config.ts + package/lockfile là source; mobile/android và mobile/ios bị ignore. `npm run prebuild:android` chỉ sinh project, không chứng minh Gradle build. Không chỉnh native generated rồi coi là source bền vững.

## Tự test

Làm theo [test card GM-02](../docs/evidence/roadmap-v1/GM-02/USER_TEST.md). Test code kiểm input lỗi, permission deny/retry, storage failure và màn xác nhận với SDK mock; cần thiết bị thật để kiểm QR/persist/notification/link cold/warm.

## Ranh giới

- `src/app`: layout/routes/intent adapter mỏng.
- `src/features/bootstrap`: screens/components và adapter SQLite/notifications của spike, không API/backend.
- `src/domain/bootstrap`: parser thuần TypeScript, không React/SDK/network; bảng chữ cái spike bỏ 0/1/I/O, GM-03/GM-23 sẽ review production contract.
- SQLite `gm02-spike.db` chỉ có bộ đếm vô danh, không token/vote/GPS/outbox thật.
- Camera chỉ xin quyền khi bấm quét, không microphone/location; đóng khi blur/background. Mã có thể nhập thủ công.
- Link `gi-cung-duoc://join?code=ABC234` chỉ dẫn tới màn kiểm tra, không cấp membership hoặc tự join. HTTPS/App Links chưa cấu hình.
- Local notification không là remote push. Không lấy/log token; server sender/FCM/receipt/inbox thuộc GM-18. Auth/secure session thuộc GM-07, link/join thật thuộc GM-23/GM-12.
- `.env.example` không có key. EXPO_PUBLIC_* sẽ nằm trong bundle; không đưa service_role hoặc secret vào client. Supabase vẫn theo ADR chờ review.
