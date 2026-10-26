# Mobile — Expo shell, components và adapters

Expo SDK 57 + Expo Router + TypeScript strict. Có shell `/`, `/foundation`, `+not-found`, preview component GM-05, client/mock GM-07, auth/session GM-16 và domain GM-15/18. Harness `/internal/gm16` chỉ development và cần cấu hình theo [auth README](src/data/auth/README.md); không là màn sản phẩm. Màn tạo/join/context/vote và tích hợp Android còn theo GM-09..14/24..31; camera/push/SQLite chưa được coi hoàn thành.

GM-02 bundles Inter 4.1 static weights 400/500/600/700 under `assets/fonts/` (SIL OFL 1.1; hashes in `assets/fonts/SOURCE.md`). `AppFontProvider` loads through Expo Font at runtime and always renders children with system weights while loading or after an error. It does not gate or remount Expo Router/session providers. GM-05 may use `useAppFonts()` for the family-to-weight map and readiness state; typography tokens/components remain GM-05's scope. `/foundation` includes Vietnamese samples for all four weights and the load/fallback status. Figma screenshots, node notes and scope boundaries are recorded in [GM-02 Figma parity](../docs/evidence/roadmap-v2/GM-02/FIGMA_PARITY.md).

## Chạy từ clone sạch

GM-10 mới tách **Ngày ăn** (bấm mở lựa chọn/ngày khác) và **Giờ ăn** `HH:mm`, có ngân sách riêng và ô xác nhận xanh. Đổi ngày/giờ/budget cần xác nhận/xem món lại; xem [đối chiếu bugs.md mới](../docs/evidence/roadmap-v2/GM-10/DATE_UI_REVIEW.md).

Sau lưu bối cảnh GM-10, **Chỉnh lại bối cảnh** tải version mới của cùng phòng và yêu cầu xác nhận/xem món lại. Logo **Về trang chủ** khác nút **Quay lại**; cả hai khóa lúc đang lưu/chưa rõ kết quả. Phân loại và sửa A1..A5 tại [SCOPE_FIX](../docs/evidence/roadmap-v2/GM-10/SCOPE_FIX.md); API/production/shared contrast còn theo ranh giới đã ghi.

GM-10: tại Home `/` mở **Công cụ kiểm thử** cuối màn → **Chọn điểm ăn và khẩu vị** để mở `/gm10/context` → xác nhận/preview/lưu → `/gm10/preferences`; `/shell` cũng có entry. Public anchor/radius/giờ/buổi/budget/avoidRecent và khẩu vị/consent dùng mock GM-07, chưa GPS/API/history thật. Controls ở cuối màn có manual/denied/outside/empty/stale/ready/timeout. Xem [HANDOFF GM-10](../docs/evidence/roadmap-v2/GM-10/HANDOFF.md) và [CHECKS](../docs/evidence/roadmap-v2/GM-10/CHECKS.md). Đã nhận main có GM-09/GM-23 được Trí merge; hai phòng mẫu GM-09/GM-10 vẫn độc lập, tích hợp cùng session/room thuộc GM-25. Đã sửa theo phản hồi Expo Go tại [BUG_REVIEW](../docs/evidence/roadmap-v2/GM-10/BUG_REVIEW.md), chờ kiểm lại sau sửa. Lưu hoặc bỏ qua khẩu vị hiện biên nhận hoàn tất; bản mẫu chưa nối phòng chờ.

Bộ package/lockfile và phạm vi Expo của từng task xem [baseline hiện hành](../docs/project/EXPO_BASELINE.md). `check:expo` kiểm phiên bản đã khóa + map SDK cài tại máy; `check:expo:latest` kiểm online khi bảo trì GM-02, không dùng patch trong evidence cũ làm yêu cầu cài hiện tại.

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
npm run test:expo-baseline
npm run bundle:android
```

`check`: TypeScript → ESLint → Jest → static architecture guard. Bundle `dist/android` ignored; bundle Pass không thay mở trên điện thoại.

Sau nhận thay đổi package từ main, chạy `npm ci` và `npm start -- --clear`. Native dependency/config thay đổi cần rebuild development client/APK; cập nhật Expo Go trên điện thoại không tự cập nhật package trong repo.

Smoke: tên/tagline/nhãn GM-02 và chưa kết nối API → **Xem cấu trúc ứng dụng** → `/foundation` → Quay lại/Android Back. Mở `exp://<LAN-IP>:8081/--/khong-co-trang` để kiểm not-found → Về trang đầu. Kiểm light/dark, TalkBack, font200%, portrait/landscape; không request vị trí/camera/push. Ghi device/revision/screenshot/Pass-Fail-Not run tại [CHECKS](../docs/evidence/roadmap-v2/GM-02/CHECKS.md).

Routes mỏng `src/app`; UI theo feature; composition `src/bootstrap`; domain không React/SDK/network; shared không import feature. GM-07 đã có `data/api`, GM-16 đã có auth/session; local persistence/outbox còn thuộc GM-31. Markers còn trống chỉ là quy hoạch, không là implementation. GM-02 sở hữu package/config/lockfile, override khóa peer Expo/React, không force/legacy-peer-deps. [Dependencies](../docs/evidence/roadmap-v2/GM-02/DEPENDENCIES.md) · [Tests](tests/README.md) · [Cấu trúc](../docs/project/REPOSITORY_STRUCTURE.md) · [Handoff](../docs/evidence/roadmap-v2/GM-02/HANDOFF.md).

## Engine decision-v2 legacy GM-06 → GM-15

[Contract engine](src/domain/decision/README.md) có TypeScript thuần, seeded selection và fixtures kiểm phiếu hai vòng. Từ root chạy `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` bằng Node 24. Typecheck/lint/Jest/architecture kiểm riêng; CI Decision domain chạy suite Node .mjs riêng. SQL parity/persist/retry backend thuộc GM-20, không được chứng minh chỉ bằng winner thuần. [Eligibility domain](src/domain/eligibility/README.md) và SQL/HTTP GM-18 có bộ kiểm riêng; app integration/native evidence vẫn theo task tương ứng.
