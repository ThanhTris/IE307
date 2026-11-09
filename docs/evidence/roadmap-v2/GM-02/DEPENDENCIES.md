# GM-02 — bộ dependency nền

## Trạng thái hiện hành — Expo SDK 58 & Hỗ trợ SVG (Cập nhật 2026-11-06)

Dự án hiện sử dụng **Expo SDK 58** (`~58.0.23`) với React Native `0.88.1` và React `19.3.0`. Nhánh `issue87_figma_ui_gm26` được đồng bộ các package patch theo kết quả Expo compatibility ngày 2026-11-06; đây là thay đổi local, chưa push lên main.
Hỗ trợ vector SVG được bổ sung phục vụ hiển thị tài sản thương hiệu (`BrandLogo`, Figma node `22:394`):
- `react-native-svg@15.16.0` (trong `dependencies`): khớp chính xác với `bundledNativeModules.json` của Expo SDK 58, đảm bảo tương thích hoàn toàn với Expo Go và Android build.
- `react-native-svg-transformer@1.5.3` (trong `devDependencies`): cấu hình qua `metro.config.js` để biên dịch file `.svg` thành React Native component trong quá trình build của Metro bundler.
- `jest.config.cjs`: cấu hình mock `\.(svg)$` trỏ về `tests/mocks/svgMock.tsx`.
- `app.config.ts`: PNG `mobile/assets/brand/gi-cung-duoc-icon.png` chỉ dùng làm launcher icon của ứng dụng native; toàn bộ UI hiển thị logo thương hiệu qua vector SVG (`BrandLogo`).

| Nhóm | Gói & Phiên bản đã khóa | Vai trò |
| --- | --- | --- |
| Expo Core / Router | `expo@~58.0.23`, `expo-router@~58.0.30` | Nền tảng framework & định tuyến file-based |
| React & React Native | `react@19.3.0`, `react-native@0.88.1` | Runtime UI |
| Vector SVG | `react-native-svg@15.16.0` | Native SVG rendering (SDK 58 bundled module) |
| UI Utilities | `@expo/ui@~58.0.27`, `react-native-safe-area-context@~5.11.1`, `react-native-screens@~4.30.1` | Expo UI, safe area & screens navigation |
| Expo Modules | `expo-constants@~58.0.13` → 58.0.15, `expo-font@~58.0.10` → 58.0.11, `expo-linking@~58.0.16`, `expo-location@~58.0.20`, `expo-notifications@~58.1.8`, `expo-secure-store@~58.0.2`, `expo-sqlite@~58.0.15`, `expo-status-bar@~58.0.4`, `expo-system-ui@~58.0.7` | Các module nền Expo đã kiểm qua `check:expo` (bổ sung `expo-notifications` cho GM-29 và `expo-sqlite` cho GM-31 ngày 2026-11-09) |
| Build Tooling | `react-native-svg-transformer@1.5.3`, `typescript@6.0.3`, `@expo/metro-config@58.0.17` (transitive) | Metro bundler transformer & type checking |
| Test & QA | `jest@30.5.2`, `jest-expo@~58.0.14`, `@react-native/jest-preset@0.88.1`, `@testing-library/react-native@14.1.0` | Unit & component test runners |

Phiên bản trong bảng là package range và kết quả resolve trong `mobile/package-lock.json` trên nhánh đang kiểm; TypeScript là `6.0.3`, Metro config là `58.0.17`. Các phiên bản trong evidence baseline cũ chỉ áp dụng revision đã ghi.

---

## Phân loại cảnh báo Dependency (`npm audit` & warnings)

Kết quả kiểm tra bảo mật `npm audit` ghi nhận 38 khuyến cáo (3 low, 32 moderate, 3 high). Tuân thủ nguyên tắc **không nâng hàng loạt** và **không chạy `npm audit fix --force`**, các cảnh báo được phân loại cụ thể theo ngữ cảnh thực thi:

### 1. Runtime (Client Mobile App)
- **Số lượng lỗ hổng:** **0**.
- **Đánh giá:** Không có lỗ hổng nào nằm trong runtime code xuất sang thiết bị người dùng. Các thư viện runtime chính (`react`, `react-native`, `react-native-svg`, `expo`, `expo-router`) đều sạch hoặc đã được sandbox bởi React Native Hermes engine.

### 2. Build / Bundler / CLI Tooling
- **Gói:** `node-forge` (qua `@expo/cli`), `zod` (qua `@expo/cli`), `@svgr/plugin-svgo` / `deepmerge` (qua `react-native-svg-transformer`).
- **Đánh giá:**
  - `node-forge`: dùng để tạo chứng chỉ TLS tự ký tạm thời khi chạy dev server Expo LAN/local. Không ảnh hưởng đến production build hoặc native runtime.
  - `zod`: kiểm tra schema file cấu hình của Expo CLI lúc start dev server.
  - `deepmerge`: nằm trong plugin SVGO tối ưu SVG tĩnh lúc bundle với Metro; không chạy trên client.

### 3. Dev / Test Runner Tooling
- **Gói:** `glob`, `minimatch`, `test-exclude`, `babel-jest` (nằm sâu trong cây phụ thuộc của `jest`, `@jest/core`, `babel-plugin-istanbul`).
- **Đánh giá:** Chỉ chạy trong môi trường kiểm thử Jest trên máy developer/CI khi chạy lệnh `npm test`. Không đóng gói vào ứng dụng Android.

> [!WARNING]
> **Lý do không chạy `npm audit fix --force`:**
> `npm audit fix --force` từng đề xuất hạ cấp `expo` từ `58.0.19` xuống `52.0.49` và hạ cấp `react-native-svg-transformer` xuống `0.14.3`. Đây là đề xuất ghi nhận ở lần audit trước, không phải kết quả audit mới của lượt này; áp dụng vẫn sẽ phá vỡ kiến trúc và tương thích với React 19 / RN 0.88.

---

## Snapshot lịch sử (2026-10-10 — Bootstrap)

Bảng ngày 2026-10-10 bên dưới là snapshot lúc bootstrap, giữ để truy vết.

| Nhóm | Phiên bản pin ban đầu |
| --- | --- |
| Expo / Router / React / React Native | 57.0.27 / 57.0.25 / 19.2.3 / 0.86.3 |
| constants / linking / status-bar / system-ui | 57.0.21 / 57.0.12 / 57.0.1 / 57.0.4 |
| safe-area / screens | 5.7.0 / 4.26.2 |
| TypeScript / React types | 6.0.3 / 19.2.4 |
| ESLint / config Expo | 9.39.5 / 57.0.2 |
| Jest / Jest types / jest-expo / RN preset | 29.7.0 / 29.5.14 / 57.0.5 / 0.86.3 |
| testing-library / test-renderer | 14.1.0 / 1.2.0 |
