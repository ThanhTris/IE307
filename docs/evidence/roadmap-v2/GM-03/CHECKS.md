# GM-03 — output checks

## Kết quả hiện hành sau Docker restart — 2026-11-05

Trí đã áp dụng **Localhost by default** và restart Docker Desktop. Run cuối `loopback-20261105d` kiểm main `4903256` với diff local sửa test runner; không có thay đổi migration/API/luật BE. Desktop 4.96.3 / Engine 29.9.2, CLI 2.120.0, Node 24.15.0. Đây là bằng chứng mới thay thiếu sót loopback/runtime trong các lượt trước bên dưới; không tự ghi approval hoặc đổi Project.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| Effective bindings | API/DB chỉ loopback | Docker inspect API 54361 và DB 54362 chỉ `127.0.0.1` / `::1`; guard nghiêm ngặt đạt | Pass |
| Startup/inventory | Fresh owned DB, source/ledger/definitions/ACL/hash đúng manifest | 25 migrations đến 0038, 199 functions, 2 catalogue; `qa:verify` đạt ownership và worker heartbeat | Pass |
| Auth+REST | Signup, refresh đúng identity, authenticated RPC, JWT thiếu/giả bị chặn | 7/7 assertions đạt trên cùng origin QA | Pass (HTTP) |
| v4 API/schema | Phòng/pool, settings, ballot/waiting, result/Top 3, consent/history và privacy | 151 ca đạt; 575 request/response envelope qua JSON Schema 2020-12 | Pass (API-only) |
| Fixture cleanup/post-suite verify | Catalogue về đúng inventory đã seal, không thêm ngoại lệ cho drift | Ca shortage dọn member/room/catalogue tạm trong transaction trên owned QA, assertion `0|0`; post-suite verify còn đúng 2 catalogue | Pass |
| Worker recovery | Stop/start đúng owned process, heartbeat mới và manifest vẫn khớp | `worker-stop` → `worker-start` → `verify` đạt | Pass |
| Final cleanup | Chỉ dọn tài nguyên QA, xóa credentials và đóng cổng | Run `stopped`; không còn owned container/volume/network/credentials; 54361/54362 không listen | Pass |
| Bruno desktop / Android / native | Bằng chứng UI hoặc thiết bị riêng | Không chạy trong lượt này | Not run |

Catalogue giữ 39 món draft/test (bundle 1.1.0, source hash `776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`) và fixture tổng hợp 20 món riêng. Manifest compatibility contract B/schema 0.9.2 không thay danh sách schema/migration thực tế đã readback; không suy rằng suite B này đã nghiệm thu mọi API canonical, importer GM-40, FE hoặc production.

Lượt `loopback-20261105a` đã đạt 151 ca nhưng post-suite verify phát hiện runner để lại catalogue shortage tạm. Hai thử nghiệm cleanup tiếp theo bị writer guard rồi FK members chặn; đều giữ lỗi và cleanup QA đầy đủ. Bản runner cuối dùng writer context transaction-local cho postgres fixture cleanup, xóa đúng member/room rồi catalogue test; giữ nguyên mọi guard, FK và kiểm drift. Run `loopback-20261105d` xác nhận toàn lifecycle đạt. Log/JSON trước–sau cùng binding inspect giữ local tại `review-results/docker-binding-fix-20261105/`; cả bốn run đã stopped và không tác động DB app.

## Lịch sử trước Docker restart — 2026-11-05, main `4903256`

Hai lượt sở hữu riêng `fix-main-20261105` và `fix-main-bind-20261105` chạy bằng Node 24.15.0, Supabase CLI 2.120.0, Docker Engine 29.9.2 trên Windows. Cổng API/DB `54361/54362` trống trước khi chạy; các dịch vụ ETL đang có được giữ nguyên. Đây là kết quả mới của startup có guard, thay ghi chú lịch sử bên dưới rằng guard chưa chạy lại.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| Startup loopback nghiêm ngặt | API/DB chỉ publish `127.0.0.1` hoặc `::1` | Cả hai lượt dừng với `QA_HOST_BINDING_NOT_LOOPBACK`, sau khi CLI chạy migrations đến 0038 | Fail / tooling-environment blocker |
| Cấu hình network | Owned bridge tắt IPv6, default host binding `127.0.0.1` | Docker inspect xác nhận `EnableIPv6=false`, option và owner/run labels khớp | Pass (config only) |
| Binding thực tế DB | Effective ports chỉ loopback | Lượt tái hiện: HostConfig có `HostIp=""`; NetworkSettings có `0.0.0.0:54362` và `[::]:54362`, đúng owned network | Fail; network option không đủ trên toolchain này |
| Guard và cleanup | Không tiếp tục nếu binding sai; dọn đúng run | Cả hai lượt exit 1, state `stopped`, cleanup `worker/supabase/network` hoàn thành; không tạo manifest hợp lệ | Pass (fail-closed/cleanup) |
| Auth+REST, runtime inventory, worker, v4 API suite | Chạy sau startup đạt | Bị chặn trước owner DB marker, seed, manifest và worker; không dùng kết quả CI wildcard thay bằng chứng | Not run |
| Runner regression | Kiểm ports/ownership/nonce/loopback | `npm test`: 19/19 đạt ở lượt sửa này | Pass (unit) |

Report/log và Docker inspection đã bỏ Env/credentials nằm local trong `review-results/main-fixes-20261105/`. Không reset DB app, không đổi migration, không bật wildcard hoặc thay toolchain. Snapshot Kong thu được lúc container chưa có effective ports không được dùng để khẳng định binding Kong; lần quan sát `docker ps` của lượt đầu thấy cả API `54361` và DB `54362` publish wildcard. Kết luận chắc chắn từ inspection DB là strict startup chưa đạt; không suy mọi Docker Desktop đều có hành vi này.

Chưa có cách sửa được xác minh trong cấu hình QA hiện hành. Supabase CLI tạo publish không chỉ định HostIp; bridge option không được áp dụng vào mapping thực tế ở máy này. Nếu cần đổi CLI, proxy hoặc Docker toàn máy, phải chốt phương án trước theo phạm vi đã duyệt. Giữ **thiếu nghiệm thu loopback/runtime**, không quy thành lỗi luật BE hoặc tự chuyển trạng thái Project.

## Supplement 2026-11-05 — Cơ chế kiểm soát loopback binding & quyền sở hữu QA Runner

Bổ sung kiểm tra theo yêu cầu cập nhật ngày 2026-11-05:
1. **Kiểm soát tạo mạng QA (`scripts/backend-qa.mjs`):**
   - Bổ sung cờ `--ipv6=false` khi tạo mạng Docker bridge sở hữu riêng (`state.networkName`), kết hợp cùng `-o com.docker.network.bridge.host_binding_ipv4=127.0.0.1`.
   - Gắn nhãn sở hữu bắt buộc: `com.gm03.owner_uuid` và `com.gm03.run_id`.
2. **Kiểm tra cổng và cách ly tài nguyên:**
   - Cổng QA (`54361`/`54362` hoặc `54371`/`54372`) hoàn toàn tách biệt với cổng phát triển của app (`54321`/`54322`). Hàm `validatePorts` từ chối ngay lập tức nếu trùng cổng app (`QA_APP_PORT_FORBIDDEN`).
   - Kiểm tra quyền sở hữu container/volume qua nhãn project và marker bảng PostgreSQL `gm03_qa_private.owner_manifest`.
3. **Quy tắc Loopback Binding nghiêm ngặt:**
   - Hàm `assertLoopbackPublishedPort` chỉ chấp nhận địa chỉ IP `127.0.0.1` hoặc `::1`. Mọi binding dạng wildcard (`0.0.0.0`, `::`, hoặc rỗng `""`) đều bị từ chối fail-closed với lỗi `QA_HOST_BINDING_NOT_LOOPBACK`.
   - **Quan sát trên host Windows Docker Desktop:** Supabase CLI không chỉ định HostIp cho DB; Docker inspect cho thấy effective bindings `0.0.0.0` và `::` dù network đặt default loopback. Guard phát hiện và cleanup. Đây là giới hạn đã tái hiện của toolchain trên máy này; chưa xác minh cơ chế nội bộ Docker hoặc giải pháp binding tường minh, không kết luận chung cho mọi host Windows.
   - **Quy tắc nghiệm thu:** Cấu hình wildcard trong CI không được dùng làm bằng chứng chứng minh loopback-only.
4. **Kết quả kiểm thử:**
   - Node test root (`npm test`): 19/19 tests Pass, bao gồm cả test loopback guard, kiểm tra nonce worker và dọn dẹp tài nguyên.

| Kiểm tra | Lệnh / Đầu vào | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|---|
| Root Backend QA Tests | `npm test` | 19 tests kiểm tra guard, ports, loopback, process nonce | 19 passed, 0 failures (364ms) | Pass |
| Cấm cổng app | `validatePorts(54321, 54372)` | Ném lỗi QA_APP_PORT_FORBIDDEN | Ném đúng lỗi | Pass |
| Kiểm tra loopback | `assertLoopbackPublishedPort` với 0.0.0.0 / :: | Ném lỗi QA_HOST_BINDING_NOT_LOOPBACK | Bị chặn, fail-closed đúng thiết kế | Pass |
| Resource Ownership | `assertOwnedResource`, `assertOwnedVolume` | Kiểm tra nhãn runId, projectId, workdir | Khớp nhãn sở hữu mới Pass | Pass |
| Cleanup an toàn | `runTrackedStep` | Thao tác cleanup thất bại không được ghi nhận hoàn thành | Giữ trạng thái retryable | Pass |

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
