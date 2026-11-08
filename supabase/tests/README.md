# Local tests

Root: npm ci → Docker Linux engine → backend:start → backend:smoke → backend:test → backend:stop.

- database/00_local_smoke.test.sql: pgTAP plan(3), connection/version/query/rollback; không thay schema/RLS/RPC.
- http/GM-03.http: platform health, Postman assertions và runner Node tương đương; không token. Dừng services rồi gọi lại phải connection failure.
- Root tests/backend-runner.test.mjs: unit guards/redaction/health assertions với fetch/process mock, chạy npm test; không đóng AC HTTP/SQL thật.
- functions: chưa có Edge Function trong scope nền.

API sau thêm HTTP suite/SQL/race/role tests riêng và CHECKS có actual output đã che secret. Không thêm business schema để kiểm GM-03 trước GM-04.

## GM-03 — isolated disposable Auth + REST QA

Use the run-scoped commands from the repository root: `npm run qa:start -- --run-id <safe-id> --api-port 54371 --db-port 54372`, then `qa:status`, `qa:verify`, `qa:test`, and `qa:stop` with the same ID. The default pair is `54361/54362`; do not reuse a port pair that belongs to another live project. The runner checks project/volume/network ownership, creates a clean DB from all pinned migrations, validates and stages GM-40 plus an explicitly synthetic 20-card fixture, seals the live runtime inventory, then tests real GoTrue signup/refresh and authenticated REST. Cleanup failure is nonzero and retryable; keep the `.work/qa/<id>` ownership metadata until cleanup reports success. Full instructions are in [GM-03 QA runbook](../../docs/evidence/roadmap-v2/GM-03/RUNBOOK_QA.md). The Bruno collection is `tests/bruno/GM-03`; use only its generated ignored `Local.<id>.private.bru` environment, never an app DB.

## GM-18 — eligibility and API after GM-17

`python3 scripts/gm18_eligibility_check.py --report /tmp/gm18-sql-results.json`
creates/drops a guarded disposable DB, compares the common TypeScript/SQL fixture
outputs, queries a physical fixture snapshot and unchanged real draft bundle.
`food_eligibility.sql` has read-only helper assertions; it is not the full parity
suite. It also verifies API grants/default deny and scoped rollback.
`node scripts/gm18_http_check.mjs` uses actual guest JWTs and the real mobile
client/guards/GM-18 adapter against its process-owned disposable PostgREST/DB.
Install root/mobile dependencies and start the local backend first.
`http/GM-18.http` contains runnable public request examples. Actual GM-08 rows
remain draft; positive published-state scenarios are synthetic and isolated.
No production publish or Android screen/native acceptance is claimed.
See [CHECKS](../../docs/evidence/roadmap-v2/GM-18/CHECKS.md) and
[HANDOFF](../../docs/evidence/roadmap-v2/GM-18/HANDOFF.md).
