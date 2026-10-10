# Kiểm GM-02

Từ mobile: `npm ci`, `npm run check`, `npm run check:expo`, `npm run bundle:android`.
Component tests: shell không cần backend env, navigation/back/recover not-found; safe-area mock chỉ phục vụ layout. Integration tests kiểm Expo Router bằng route modules thật. Unit/integration không thay smoke Android/Expo Go.
Static architecture guard không thay review bảo mật. Các task sau thêm tests theo feature, không chuyển screenshot HTML thành native evidence.

## GM-15 decision domain riêng

Từ root: `node --test mobile/tests/decision.test.mjs` (Node24), sau đó
`node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json`.
Jest chỉ nhận .test.ts/.test.tsx nên suite .mjs được CI riêng Decision domain chạy
và upload report. npm run check vẫn chạy strict typecheck/lint/Jest/architecture.
Không coi type stripping là typecheck hoặc fixture là SQL parity/persisted retry.
