# GM-03 — BE foundation handoff

## Supplement 2026-10-27 — QA, Bruno, and loopback limitation

The PR #137 revision was exercised with an owned disposable Supabase project (`gm03-pr137-20261027`, contract B/schema `0.9.1`) and then cleaned up. Seven Auth/REST assertions and 83 v4 API cases passed; the Bruno desktop Runner showed the exact six expected responses `200,200,200,200,401,401` in [this screenshot](bruno-runner-gm03-20261027.jpg). Worker restart/verification passed. Detailed assertions and limitations are in [CHECKS](CHECKS.md); raw reports remain under ignored `.work/`.

**Open acceptance issue:** Docker Desktop published the QA ports on `0.0.0.0` and `::` even though the isolated bridge was configured for `127.0.0.1`. The runtime was stopped to close those ports. A fail-closed check now inspects the effective mappings, and unit coverage passes, but the guarded startup has not been rerun because this Docker Desktop host does not provide the required loopback-only binding. The separately approved v4 CI wildcard run is recorded as explicit wildcard test mode, not GM-03 isolation evidence. Do not claim GM-03 fully accepted until an environment produces loopback-only mappings and the complete QA lifecycle passes there.

The app's mobile check is separately recorded in [GM-02](../GM-02/CHECKS.md). Current Home visual parity with Figma is not achieved; that UI gap is not changed by this backend QA runner PR.

## Supplement 2026-10-26

Implementation working tree on `fe5b5f3`, reviewer Trí / ThanhTris; no commit/push or approval recorded. Use [isolated QA runbook](RUNBOOK_QA.md) for `qa:start`, `qa:status`, `qa:verify`, `qa:test`, `qa:worker-start` and `qa:stop`. [Manifest](QA_MANIFEST.json) pins the tested code and runtime; [results](QA_TEST_RESULTS.json) contains the 7 Auth/REST and 82 v4 assertions from run `gm03-20261026m`. Bruno desktop independently passed all 6 requests on that same run.

The app project is for normal development. QA uses a temporary owned project/volume/network so migrations can run from a clean DB and synthetic users/data can be completely removed without deleting app data. Defaults are API `54361`, DB `54362`; this run used `54371/54372` because another existing QA project owns the default pair. Never stop a different project to free those ports.

Worker and local-adapter Docker subprocesses now use `CREATE_NO_WINDOW` on Windows. Node runner subprocesses already use `windowsHide`. SQL, error handling and ownership checks remain active. [Windows regression](WINDOWS_WORKER.md) records why the terminal windows appeared and how the fix was checked.

Final `qa:verify` after worker recovery passed. `qa:stop` then cleaned the worker, Supabase project and network for `gm03-20261026m`; the Docker engine and other projects were left running. Bruno Runner was left displaying its 6/6 result. Re-running requests requires a fresh QA run and its generated private environment.

CHECKS distinguishes real HTTP/Bruno, process unit checks and remaining runtime fault-injection cases. The full Python suite still reports 21 existing task-matrix failures outside GM-02/03; these were not changed to claim a green baseline. GM-03 is not marked Approved/Done.

## Historical baseline handoff

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
