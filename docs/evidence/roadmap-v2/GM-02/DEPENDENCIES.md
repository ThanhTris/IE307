# GM-02 — bộ dependency nền

2026-10-10. Bộ stack/package được chủ dự án chốt trong hội thoại, xem [GM-01 review](../GM-01/REVIEW.md). Package mobile riêng root BE; Node 24.15.0/npm11.12.1 đã dùng, engines >=22.13. Không cài global CLI hoặc camera/push/SQLite/dev-client.

| Nhóm | Phiên bản pin |
| --- | --- |
| Expo / Router / React / React Native | 57.0.27 / 57.0.25 / 19.2.3 / 0.86.3 |
| constants / linking / status-bar / system-ui | 57.0.21 / 57.0.12 / 57.0.1 / 57.0.4 |
| safe-area / screens | 5.7.0 / 4.26.2 |
| TypeScript / React types | 6.0.3 / 19.2.4 |
| ESLint / config Expo | 9.39.5 / 57.0.2 |
| Jest / Jest types / jest-expo / RN preset | 29.7.0 / 29.5.14 / 57.0.5 / 0.86.3 |
| testing-library / test-renderer | 14.1.0 / 1.2.0 |

Đọc publisher metadata từ npm registry ngày này và đối chiếu `expo/bundledNativeModules.json`. [Expo template](https://registry.npmjs.org/expo-template-default/57.0.29), [Router peers](https://registry.npmjs.org/expo-router/57.0.25), [testing-library peers](https://registry.npmjs.org/@testing-library%2freact-native/14.1.0), [test-renderer deps](https://registry.npmjs.org/test-renderer/1.2.0).

## Khóa peer gián tiếp

Npm ban đầu tự chọn react-dom19.3, worklets0.13 và test-renderer1.3/reconciler0.34; không hợp nhánh React19.2/SDK57. Đã giải bằng phiên bản thỏa peer range, không dùng force/legacy-peer-deps:

- react-dom19.2.3 cùng React19.2.3.
- react-native-reanimated4.5.1/worklets0.10.1 theo map SDK57; dependency gián tiếp của Router UI, không thêm capability màn mới.
- react-server-dom-webpack19.1.5 là một nhánh patch được Expo Router/jest-expo cho phép (`~19.0.4 || ~19.1.5 || ~19.2.4`), peer React/DOM^19.1.5 chấp nhận19.2.3; nhánh19.2.4 đòi React/DOM^19.2.4, không tự tăng bộ React đã chốt. Shell Android không dùng server components/web deployment.
- test-renderer1.2.0 dùng reconciler0.33 của React19.2 thay latest1.3/React19.3. React-test-renderer19.2.3 chỉ dependency của jest-expo, không dùng trực tiếp cho component tests.

Lockfile được npm sinh, dùng npm ci để tái lập. Peer/type/bundle/component/router và Expo compatibility phải Pass tại CHECKS trước nghiệm thu; pin phiên bản không là tuyên bố đã audit mọi dependency/vulnerability.
