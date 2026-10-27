# GM-03 — output checks

## Supplement 2026-10-27 — PR #137 QA and Bruno run

Run `gm03-pr137-20261027`, based on revision `b6efb50229feae7a54df8923796ff9af056872da` with a dirty working tree, contract `dish-session-v4/roadmap-v2/GM-07.B`, schema `0.9.1`, API `54371`, DB `54372`. Runtime reports are under ignored `.work/qa/gm03-pr137-20261027/`; the report records no credentials, identity IDs, or changes to the application database.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| GM-03 Auth + REST | Health, guest signup/refresh with same identity, authenticated REST; missing/forged JWT denied | 7 assertions passed; HTTP `200` for healthy/authenticated calls and `401` for missing/forged JWT | Pass |
| GM-07.B/v4 API suite | Response-driven cases against disposable QA DB; schema and runtime fingerprint match | 83 API cases passed; 439 response envelopes validated against JSON Schema 2020-12; 16 migrations, schema `0.9.1`, 172 functions, two catalogues verified | Pass |
| Bruno desktop | Six GM-03 requests return exact expected statuses `200,200,200,200,401,401` | Runner All 6 / Passed 6 / Failed 0 / Skipped 0. [Runner screenshot](bruno-runner-gm03-20261027.jpg) | Pass |
| Worker recovery | Stop/restart worker and verify it resumes against owned manifest | Worker restart and post-restart verification passed | Pass |
| QA cleanup | Remove only owned worker/project/network and close QA ports | QA run stopped; owned resources removed; application DB left unchanged | Pass |
| Docker loopback binding | Effective published API/DB host bindings remain loopback-only | Docker Desktop published `0.0.0.0` and `::` despite the custom bridge loopback option. The QA run was stopped after observing this. `backend-qa.mjs` now checks effective published bindings and fails closed; helper tests pass, but the guarded start has not been rerun on this host | **Fail on this host** |
| v4 CI disposable run | Explicitly configured test binding, suite completes, and cleanup succeeds | 83 cases passed on `54361/54362`; report says `bindingPolicy: explicit-local-wildcard`; worker/project/workdir cleanup passed | Pass, explicit wildcard test mode only |
| Regression and repository checks | Worker/ownership/unit and repository checks pass | Node `npm test` 19/19; worker process tests 2/2; QA ownership tests 4/4; Python suite 607 run / 6 skipped / all passed; repository validator and docs checker pass | Pass |

Do not treat the v4 CI run's explicitly allowed wildcard binding as proof of GM-03 loopback isolation. The checked host's Docker Desktop binding behavior prevents full GM-03 acceptance until the guarded QA runtime can be run with effective loopback-only mappings. The API/Bruno results above were captured before the fail-closed binding check was added; no container or port remains open now.

## Supplement 2026-10-26 — isolated QA and Windows worker

Working tree based on `fe5b5f363d94787f4dac6fcfb1933698fb534830`, branch `codex/gm-02-03-foundations`; owner/reviewer Trí / ThanhTris. These are implementation checks, not human approval. Exact runtime/source fingerprints are in [QA manifest](QA_MANIFEST.json), and input/expected/actual assertions are in [QA results](QA_TEST_RESULTS.json).

| Case | Input / expected | Actual | Result |
| --- | --- | --- | --- |
| Clean QA setup | New run `gm03-20261026m`, ports `54371/54372`; all migrations on fresh owned volume | Ready; 16 migration ledger entries, schema `0.9.1`, GM-07.B; Realtime disabled | Pass |
| Runtime fingerprint | Sealed source/config/ledger/function/ACL/catalogue inventory must match | 172 functions, 2 catalogues, ownership verified | Pass |
| Real Auth + REST | Health → guest signup → refresh → same caller → REST; missing/forged JWT rejected | 7 assertions Pass; authenticated RPC `200`, invalid/missing JWT `401` | Pass |
| Existing v4 HTTP suite on new QA | Receive versions from real responses; preserve legacy and v4 rules | 82/82 assertions Pass, including worker timeout without client finalize | Pass |
| Bruno desktop | Run all 6 GM-03 requests on `Local.gm03-20261026m.private` | Runner All 6 / Passed 6 / Failed 0 / Skipped 0; statuses `200,200,200,200,401,401`; response panes with credentials kept closed | Pass |
| Windows console regression | Recurring Docker calls must be hidden and preserve SQL/stdout/errors | 2 worker-process tests + 29 importer tests Pass; `CREATE_NO_WINDOW` on QA and app-local worker adapters | Pass |
| Worker recovery | Terminate only PID matching run-scoped script and nonce; restart against unchanged sealed manifest | `qa:worker-start` returned `READY`, heartbeat ready, DB preserved | Pass |
| Final cleanup | Stop only run `gm03-20261026m` and remove its owned resources | Worker, Supabase project and network cleaned; Docker engine left running | Pass |
| Tooling regression | Root `npm test` | 16/16 Pass | Pass |
| Repository/docs | Validator, task index checker, diff whitespace | Validator, index checker and `git diff --check` Pass | Pass |
| Full Python baseline | UTF-8/tzdata environment, all Python tests | 594 tests; 21 failures in `test_mobile_api_test_plan` for existing GM-24..35 task text/link requirements; 6 skipped. Those files are outside this patch | Fail (baseline) |

The Windows issue was repeated `docker.exe` console creation from Python worker subprocesses, not a Docker engine restart loop. See [Windows worker fix](WINDOWS_WORKER.md). A previous QA run `gm03-20261026l` had 7+82 HTTP assertions and 6/6 Bruno Pass; after source changes it was stopped rather than resealing its manifest. Its first cleanup attempt failed while Docker was off, retained metadata, and the same stop command succeeded after Docker restarted.

Runtime fault-injection coverage for every ledger/function/source drift, port/ownership conflict and cleanup failure remains incomplete; unit guards do not count as runtime Pass. GM-03 remains under review. Android is outside this BE runner acceptance.

## Historical baseline — 2026-10-10

2026-10-10. Owner Trí; reviewer `ThanhTris` (review sau khi push). Contract `food-v1/roadmap-v2/GM-03.1`. Tested working tree trên `4f154af714411e81351e7761ceca281b1436fa68`; chưa có commit mới tại thời điểm ghi evidence. Đây là kiểm cấu trúc/runner nền, chưa nghiệm thu API nghiệp vụ, schema, RLS/RPC hoặc dataset.

| Case | Input/lệnh | Expected | Actual | Kết quả |
| --- | --- | --- | --- | --- |
| Config/runner guard | `npm test` tại root | project/port/loopback/reset/secret guard đúng | 8 tests Pass | Pass |
| Start/status | `npm run backend:start`, `npm run backend:status` | local project đúng, output không secret | local Supabase start được; status chỉ in `gi-cung-duoc-local` và loopback URL | Pass |
| Platform health smoke | `npm run backend:smoke` | endpoint nền trả HTTP 200 và body hợp lệ | GoTrue health 200, version/description nonempty | Pass |
| Database smoke | `npm run backend:test` | pgTAP có 3 assertions thật | `Files=1, Tests=3, All tests successful` | Pass |
| Stop guard | `npm run backend:stop`, gọi lại health | chỉ local project dừng, không stop remote | local service dừng; gọi lại không kết nối được | Pass |
| Business API/schema/data | Ngoài scope GM-03 | không tự nhận đã có | Chưa triển khai; task sau phụ trách | N/A |

Supabase CLI `2.120.0`, Docker local, PostgreSQL `17.11`. Reviewer `ThanhTris` cần đối chiếu lại revision, output và phạm vi trước khi đánh dấu Done.
