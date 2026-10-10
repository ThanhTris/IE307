# GM-03 — BE foundation handoff

Task đang `review`; owner Trí, reviewer `ThanhTris`. Reviewer cũ đã bỏ theo yêu cầu chủ dự án. Handoff này chỉ bàn giao cấu trúc BE và runner local, không bàn giao API nghiệp vụ.

## Đầu ra

- Root `package.json`/`package-lock.json`: chỉ pin Supabase CLI tooling.
- `scripts/backend.mjs`: start/status/stop/smoke/test và reset local có guard.
- `supabase/config.toml`, `.env.example`, README và `_shared/README.md`: cấu hình/biên giới local, không remote secret.
- `supabase/tests/database/00_local_smoke.test.sql`: test kết nối/query nền.
- `supabase/tests/http/GM-03.http`: request health nền cho Postman/curl/runner.

## Chạy lại

Từ root: `npm ci`; bật Docker Linux engine; `npm run backend:start`; `npm run backend:status`; `npm run backend:smoke`; `npm run backend:test`; sau đó `npm run backend:stop`.

Đã kiểm local start/status/HTTP health/SQL smoke và ca stop. Chưa có migration nghiệp vụ, RPC/RLS, data import, API room/vote hoặc remote deployment. GM-04/06/07/08 nhận đầu vào từ task này theo dependency graph; reviewer kiểm target branch sau push.
