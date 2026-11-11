# Kiểm thử mobile

Từ `mobile/`: `npm ci`, `npm run check` (typecheck → lint → jest → architecture guard), `npm run check:expo`, `npm run bundle:android`. Baseline Expo theo [hướng dẫn](../../docs/project/EXPO_BASELINE.md); `npm run test:expo-baseline` kiểm manifest/lock/install.

## Bố cục

| Thư mục | Nội dung |
|---|---|
| `unit/` | Repository, mapping, validator, luật thuần, điều hướng (không render) |
| `component/` | Render màn hình/luồng bằng Testing Library (Jest) |
| `integration/` | Route module thật của Expo Router |
| `mocks/api/` | `MockApiClient` và dữ liệu mock — chỉ dùng trong test, app không đóng gói |
| `fixtures/` | Dữ liệu và màn preview cho test (`result/`, `setup/`, `gm27/`) |
| `helpers/` | Tiện ích dùng chung cho test |
| `*.test.mjs` | Suite Node riêng cho domain decision/eligibility/dish policy (CI Decision chạy) |

Jest chỉ nhận `.test.ts`/`.test.tsx`. Suite `.mjs` chạy từ root: `node --test mobile/tests/decision.test.mjs`, rồi `node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json`.

Test không thay cho kiểm trên thiết bị thật (Expo Go/Android), và static architecture guard không thay review bảo mật.
