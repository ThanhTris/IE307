# Kiểm GM-02

Từ mobile: `npm ci`, `npm run check`, `npm run check:expo`, `npm run bundle:android`.
Baseline hiện hành theo [hướng dẫn Expo](../../docs/project/EXPO_BASELINE.md) và package-lock của checkout. Chạy thêm `npm run test:expo-baseline` cho regression manifest/lock/install và SDK incompatibility; `npm run check:expo:latest` là kiểm online trong bảo trì GM-02, không thay kiểm đã khóa hoặc device.
Component tests: shell không cần backend env, navigation/back/recover not-found; safe-area mock chỉ phục vụ layout. Integration tests kiểm Expo Router bằng route modules thật. Unit/integration không thay smoke Android/Expo Go.
`AppFontProvider.test.tsx` kiểm load thành công/chậm/lỗi, font style 400/500/600/700 và child không bị remount; đây là unit test loader, không thay kiểm render thiết bị thật.
Static architecture guard không thay review bảo mật. Các task sau thêm tests theo feature, không chuyển screenshot HTML thành native evidence.

## GM-15 decision domain riêng

Từ root: `node --test mobile/tests/decision.test.mjs` (Node24), sau đó
`node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json`.
Jest chỉ nhận .test.ts/.test.tsx nên suite .mjs được CI riêng Decision domain chạy
và upload report. npm run check vẫn chạy strict typecheck/lint/Jest/architecture.
Không coi type stripping là typecheck hoặc fixture là SQL parity/persisted retry.
