# GM-02 — Dependency và license metadata

Ngày 2026-10-08; metadata từ package-lock.json và package.json đã cài. Đây là inventory kỹ thuật, không là reviewer chấp thuận license/dependency.

| Package | Version khóa | License metadata | Loại |
| --- | --- | --- | --- |
| expo | 57.0.27 | MIT | runtime |
| expo-camera | 57.0.6 | MIT | runtime |
| expo-constants | 57.0.21 | MIT | runtime |
| expo-dev-client | 57.0.19 | MIT | runtime |
| expo-device | 57.0.2 | MIT | runtime |
| expo-linking | 57.0.12 | MIT | runtime |
| expo-notifications | 57.0.22 | MIT | runtime |
| expo-router | 57.0.25 | MIT | runtime |
| expo-sqlite | 57.0.4 | MIT | runtime |
| expo-status-bar | 57.0.1 | MIT | runtime |
| expo-system-ui | 57.0.4 | MIT | runtime |
| react | 19.2.3 | MIT | runtime |
| react-dom | 19.2.3 | MIT | runtime |
| react-native | 0.86.3 | MIT | runtime |
| react-native-reanimated | 4.5.1 | MIT | runtime |
| react-native-safe-area-context | 5.7.0 | MIT | runtime |
| react-native-screens | 4.26.2 | MIT | runtime |
| react-native-worklets | 0.10.1 | MIT | runtime |
| @react-native/jest-preset | 0.86.3 | MIT | tool/test |
| @testing-library/react-native | 13.3.3 | MIT | tool/test |
| @types/jest | 29.5.14 | MIT | tool/test |
| @types/react | 19.2.4 | MIT | tool/test |
| eslint | 9.39.5 | MIT | tool/test |
| eslint-config-expo | 57.0.2 | MIT | tool/test |
| jest | 29.7.0 | MIT | tool/test |
| jest-expo | 57.0.5 | MIT | tool/test |
| react-test-renderer | 19.2.3 | MIT | tool/test |
| typescript | 6.0.3 | Apache-2.0 | tool/test |

Lockfile SHA-256: `9bbbb7f2ac92f89fa49a3467db01e4ce7bfd9d951fb16f365e17977eed340445`.

## Lựa chọn và giới hạn

- Phiên bản runtime lấy theo Expo 57.0.27 bundledNativeModules.json, template chính thức 57.0.29. React DOM 19.2.3 và Reanimated/Worklets được khóa theo React/SDK vì npm tự kéo peer mới gây xung đột; Android là platform duy nhất, không nhận web AC.
- ESLint 10.12.0 đã thử và lỗi plugin react/display-name (context.getFilename); giữ ESLint 9.39.5 tương thích preset Expo. npm đánh dấu deprecated, reviewer cần chấp thuận hoặc chọn preset tương thích mới trước merge. Không tắt rule để giả lint đạt.
- Jest 29.7.0 và jest-expo 57.0.5 theo runner Expo; react-test-renderer 19.2.3 phục vụ RNTL 13.3.3. Không nâng riêng Jest 30 trái preset.
- Không service_role/backend SDK/FCM credentials trong client; Expo dev-client dùng build cục bộ, chưa EAS upload.
- License trên là SPDX metadata của direct dependencies, không phải audit toàn bộ notices/native artifacts. Transitive node-forge báo dual license BSD-3-Clause OR GPL-2.0; cần reviewer kiểm notices và lựa chọn phù hợp. App private không tự đặt license của dự án.

## npm audit thực tế

NPM_AUDIT.json ghi 64 affected-package entries: 49 high, 15 moderate, 0 critical; không phải 64 lỗi độc lập. Có 5 advisory gốc (braces, decode-uri-component, node-forge, sprintf-js, uuid), các entry còn lại lan theo dependency graph. Audit exit 1, chưa được xử lý/accepted.

- braces 3.0.3, node-forge 1.4.0, sprintf-js 1.1.3 đang là latest registry và advisory chưa có bản vá phù hợp lúc kiểm. Không báo dependency an toàn chỉ vì đã dùng stable Expo.
- decode-uri-component 0.5.0 chuyển ESM; query-string trong Router còn dùng CommonJS. uuid 11.1.1 đổi major so với xcode ^7; chưa ép override khi chưa kiểm đầy đủ upstream. Reviewer quyết định remediation/exception theo revision, không tự downgrade Expo 44/RN 0.72 theo audit suggestion.
- Trước merge cần xử lý hoặc reviewer ghi nhận rủi ro có căn cứ và kiểm lại audit. Không public dev server/tunnel hoặc release bản này như production.

[Audit JSON](NPM_AUDIT.json) · [Kế hoạch](IMPLEMENTATION_PLAN.md) · [Báo cáo](REPORT.md)

Endpoint Expo online yêu cầu @types/react ~19.2.4 (mới hơn template/local map); đã khóa exact 19.2.4. Audit JSON được lấy trước thay đổi type-only này; cây runtime/tooling có advisory không đổi.
