# Mobile — GM-02 Expo shell

Expo SDK 57 + Expo Router + TypeScript strict. Shell thật `/`, kiểm navigation `/foundation`, `+not-found`. Chưa có tạo/join phòng, API/auth hoặc camera/push/SQLite; component GM-05, màn chi tiết GM-09..14.

## Chạy từ clone sạch

Node >=22.13 (đã dùng 24.15.0), npm; Android có Expo Go hỗ trợ SDK 57. Không cần Android Studio/adb/APK để mở shell. Từ root:

```powershell
cd mobile
npm ci
npm start
```

Expo Go quét QR terminal; điện thoại/máy cùng LAN. Cho Node/Metro qua firewall mạng tin cậy, không tự tắt firewall. Mặc định Expo Go + LAN, không development client; shell không cần `.env`/Supabase. Public URL/key dùng khi task sau tích hợp, không service_role trong client.

LAN lỗi: `npm run start:tunnel`. Tunnel cần dịch vụ ngoài và `@expo/ngrok`; nếu CLI yêu cầu cài thêm thì reviewer chốt trước (không thuộc package hiện tại), hoặc dùng LAN khác. Expo Go phải đúng SDK; native/development build thuộc task capability sau.

## Kiểm output

```powershell
npm run check
npm run check:expo
npm run bundle:android
```

`check`: TypeScript → ESLint → Jest → static architecture guard. Bundle `dist/android` ignored; bundle Pass không thay mở trên điện thoại.

Smoke: tên/tagline/nhãn GM-02 và chưa kết nối API → **Xem cấu trúc ứng dụng** → `/foundation` → Quay lại/Android Back. Mở `exp://<LAN-IP>:8081/--/khong-co-trang` để kiểm not-found → Về trang đầu. Kiểm light/dark, TalkBack, font200%, portrait/landscape; không request vị trí/camera/push. Ghi device/revision/screenshot/Pass-Fail-Not run tại [CHECKS](../docs/evidence/roadmap-v2/GM-02/CHECKS.md).

Routes mỏng `src/app`; UI theo feature; composition `src/bootstrap`; domain không React/SDK/network; shared không import feature. GM-07 lắp `data/api`, GM-16 auth, GM-31 local. Markers chỉ quy hoạch, không là implementation. GM-02 sở hữu package/config/lockfile, override khóa peer Expo/React, không force/legacy-peer-deps. [Dependencies](../docs/evidence/roadmap-v2/GM-02/DEPENDENCIES.md) · [Tests](tests/README.md) · [Cấu trúc](../docs/project/REPOSITORY_STRUCTURE.md) · [Handoff](../docs/evidence/roadmap-v2/GM-02/HANDOFF.md).

## Engine decision-v2 legacy GM-06 → GM-15

[Contract engine draft](src/domain/decision/README.md) có TypeScript thuần và fixtures kiểm phiếu hai vòng. Chạy `node --test mobile/tests/decision.test.mjs` bằng Node 24. Typecheck/lint/Jest/architecture đã kiểm riêng bằng tooling GM-02; CI Decision domain chạy suite Node .mjs riêng. SQL parity/seeded winner/persist/retry backend và tích hợp app/RPC còn chờ; xem CHECKS/handoff GM-15.
