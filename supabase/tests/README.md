# Local tests

Root: npm ci → Docker Linux engine → backend:start → backend:smoke → backend:test → backend:stop.

- database/00_local_smoke.test.sql: pgTAP plan(3), connection/version/query/rollback; không thay schema/RLS/RPC.
- http/GM-03.http: platform health, Postman assertions và runner Node tương đương; không token. Dừng services rồi gọi lại phải connection failure.
- Root tests/backend-runner.test.mjs: unit guards/redaction/health assertions với fetch/process mock, chạy npm test; không đóng AC HTTP/SQL thật.
- functions: chưa có Edge Function trong scope nền.

API sau thêm HTTP suite/SQL/race/role tests riêng và CHECKS có actual output đã che secret. Không thêm business schema để kiểm GM-03 trước GM-04.

## GM-18 — independent eligibility

`python3 scripts/gm18_eligibility_check.py --report /tmp/gm18-sql-results.json`
creates/drops a guarded disposable DB, compares the common TypeScript/SQL fixture
outputs, queries a physical fixture snapshot and unchanged real draft bundle.
`food_eligibility.sql` has read-only helper assertions; it is not the full parity
suite. `http/GM-18.http` records public integration cases still Not run, pending
GM-17. No fixture or draft query is positive verified catalogue evidence.
See [CHECKS](../../docs/evidence/roadmap-v2/GM-18/CHECKS.md) and
[HANDOFF](../../docs/evidence/roadmap-v2/GM-18/HANDOFF.md).
