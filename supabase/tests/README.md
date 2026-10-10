# Local tests

Root: npm ci → Docker Linux engine → backend:start → backend:smoke → backend:test → backend:stop.

- database/00_local_smoke.test.sql: pgTAP plan(3), connection/version/query/rollback; không thay schema/RLS/RPC.
- http/GM-03.http: platform health, Postman assertions và runner Node tương đương; không token. Dừng services rồi gọi lại phải connection failure.
- Root tests/backend-runner.test.mjs: unit guards/redaction/health assertions với fetch/process mock, chạy npm test; không đóng AC HTTP/SQL thật.
- functions: chưa có Edge Function trong scope nền.

API sau thêm HTTP suite/SQL/race/role tests riêng và CHECKS có actual output đã che secret. Không thêm business schema để kiểm GM-03 trước GM-04.
