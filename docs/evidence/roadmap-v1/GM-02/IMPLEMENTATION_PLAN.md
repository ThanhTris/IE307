# GM-02 — Kế hoạch bản nháp sanbox

Ngày 2026-10-08; baseline main `1b9e156c22f33f2965286cb1cc9685702811516f`, branch `sanbox`. Người thực hiện bản nháp: Codex theo yêu cầu trực tiếp của chủ dự án: “oke tiếp tục task 2, khi nào làm xong task thì đưa tui phần test … cũng như báo cáo lại”. Owner đề xuất trong task vẫn Tuấn, reviewer đề xuất Trí; chưa ghi họ đã nhận việc hoặc duyệt package.

Start gate đã chạy và trả BLOCKED/WAIT GM-01. Yêu cầu tiếp tục cho phép soạn bản triển khai nháp riêng trên sanbox; không thay review GM-01, không mở merge gate, không Approved/Done. Dependency/package dưới đây là lựa chọn của bản nháp để reviewer kiểm, không là quyết định của Trí. Không đổi luật sản phẩm/API/ADR/provider hoặc tạo backend.

## Scope và contract

- Expo SDK 57 stable từ npm, React 19.2.3/React Native 0.86.3 theo template chính thức; khóa phiên bản trực tiếp và lockfile. TypeScript strict, ESLint, Jest Expo.
- Routes mỏng trong src/app; feature bootstrap dùng adapter native; domain không React/Expo/network. Contract production tiếp tục theo API_CONTRACT/UI_SPEC/NOTIFICATIONS_LINKS_SPEC tại baseline trên, chưa triển khai auth/room/votes.
- Màn spike ghi rõ thử nghiệm: camera QR → kiểm link/mã → màn xác nhận, không join server; SQLite counter vô danh riêng để thử persist/restart; permission và local notification, không coi là remote push.
- Chỉ scheme gi-cung-duoc://join?code=...; không nhận arbitrary URL, token hoặc tự join. Parser spike được test độc lập; GM-23 vẫn chịu trách nhiệm contract QR/link production và auth/capacity/expiry.
- Android Continuous Native Generation: config là source; android/ios sinh lại bằng prebuild, không version control generated projects. Android development build dùng expo-dev-client; không EAS upload/deploy.

## Patch plan

1. mobile/package.json, package-lock.json, app.config.ts, tsconfig.json, expo-env.d.ts, ESLint/Jest config và scripts kiểm ranh giới domain.
2. mobile/src/app: layout/index/join; features/bootstrap: hub/join screens, adapter SQLite/notifications/camera; domain parser link spike.
3. Unit tests: malformed links, query allowlist, manual code, SQL persist/error và permission/local notification flow qua mock SDK (không thay test native).
4. mobile/README.md và evidence GM-02: phiên bản/license thật, lệnh/test output, test card cho người dùng, AC và giới hạn.

## Test plan

- npm ci; typecheck; lint; Jest; architecture boundary; Expo dependency check/config; Android Metro bundle.
- Native: development build → cold launch/navigation; camera grant/deny/manual; QR hợp lệ/lạ; warm/cold link; counter tăng/restart/reset; notifications grant/deny/local tap. Ghi thiết bị/OS/network và kết quả thực tế. T-01 auth/T-17 remote push/T-18 join server chỉ bàn giao đường test, chưa nghiệm thu feature sau.
- Handoff repo: validator, 69 regression tests hiện có, indexes, diff. Không ghi pass cho build/thiết bị/FCM chưa chạy.

## Nguồn chọn dependency

- [SDK compatibility](https://docs.expo.dev/versions/latest/)
- [Router installation](https://docs.expo.dev/router/installation/)
- [Expo Jest](https://docs.expo.dev/develop/unit-testing/)
- [Camera SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)
- [SQLite SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)

Registry thực tế ngày chạy: expo latest/sdk-57 = 57.0.27; expo-template-blank-typescript latest = 57.0.29. Không dùng canary/next. Phiên bản/license cuối ghi lại sau install từ package metadata.
