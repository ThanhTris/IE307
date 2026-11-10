# Mobile — app Gì Cũng Được (Expo)

Expo SDK 58 + Expo Router + TypeScript strict, chạy trên Android qua Expo Go. App chỉ dùng backend thật (Supabase); không có chế độ mock hay màn preview trong app. Mock client, fixture và màn preview cho test nằm trong `tests/`.

Cấu trúc thư mục, route và quy ước đặt tên: [src/README.md](src/README.md). Cấu trúc toàn repo: [REPOSITORY_STRUCTURE](../docs/project/REPOSITORY_STRUCTURE.md).

## Luồng chính

Khách nhập tên → Trang chủ → Tạo phòng → `/room/setup`: chủ phòng thiết lập phòng (buổi ăn, số món, giờ) rồi chọn khẩu vị → phòng chờ (mã, QR, mời bạn) → bình chọn vòng 1 → (vòng chung kết) → kết quả hoặc không chốt được.
Thành viên vào phòng bằng mã/QR/link mời hoặc chấp nhận lời mời trong Hộp thư → vào thẳng bước khẩu vị (`/room/setup?roomId=…&stage=preferences`) → phòng chờ.
"Tiếp tục phiên" ở trang chủ mở đúng màn theo trạng thái phòng. Chạm thông báo đẩy → làm mới phiên và hộp thư → mở Hộp thư.

## Chạy từ clone sạch

Node >=22.13, npm, Expo Go 58 trên Android (máy thật hoặc emulator). Từ root:

```powershell
cd mobile
npm ci
copy .env.example .env.local   # điền URL và publishable/anon key của Supabase
npm start
```

Backend local cho dev/QA: từ root chạy `npm run qa:start -- --run-id <id>` (xem [scripts/README.md](../scripts/README.md)); lấy `apiUrl` và `anonKey` của run đó điền vào `.env.local`. **Không bao giờ** đặt service-role key vào app.

Thiếu cấu hình máy chủ thì app hiện "Chưa cấu hình máy chủ" thay vì dữ liệu giả. Expo Go quét QR trong terminal; điện thoại và máy cùng LAN. LAN lỗi: `npm run start:tunnel` (cần `@expo/ngrok`).

Thông báo đẩy từ xa không chạy trong Expo Go trên Android: cần EAS Project ID (`EXPO_PUBLIC_EAS_PROJECT_ID`), Firebase/FCM và development build. Hộp thư trong app vẫn dùng được khi chưa có các bước này.

## Kiểm tra

```powershell
npm run check            # typecheck → lint → jest → architecture guard
npm run check:expo
npm run test:expo-baseline
npm run bundle:android
```

CI (`foundations.yml`) chạy đúng các lệnh trên. Bundle `dist/android` bị Git bỏ qua; bundle Pass không thay cho mở app trên điện thoại. Sau khi nhận thay đổi package từ main: `npm ci` rồi `npm start -- --clear`. Bộ package/lockfile và phạm vi Expo: [baseline](../docs/project/EXPO_BASELINE.md).

Font Inter 4.1 (400/500/600/700) đóng gói trong `assets/fonts/` (SIL OFL 1.1, hash trong `assets/fonts/SOURCE.md`); `AppFontProvider` dùng font hệ thống khi đang tải hoặc lỗi.

## Domain thuần

[Decision engine](src/domain/decision/README.md) và [eligibility](src/domain/eligibility/README.md) là TypeScript thuần dùng làm tham chiếu chính sách. Từ root: `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` (Node 24); CI Decision chạy riêng.

## Tài liệu liên quan

[Tests](tests/README.md) · [Auth/session](src/data/auth/README.md) · [Dependencies GM-02](../docs/evidence/roadmap-v2/GM-02/DEPENDENCIES.md) · [Figma parity GM-02](../docs/evidence/roadmap-v2/GM-02/FIGMA_PARITY.md) · [Figma task map](../docs/design/UI_FIGMA_TASK_MAP.json)
