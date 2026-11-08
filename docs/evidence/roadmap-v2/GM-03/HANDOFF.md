# GM-03 — BE foundation handoff

## Handoff hiện hành sau Docker restart — 2026-11-05

Strict loopback/runtime gap đã có bằng chứng chạy thành công trên host này ở run `loopback-20261105d`: sau khi Trí đổi Docker Desktop **Localhost by default** và restart, API/DB 54361/54362 chỉ publish `127.0.0.1` / `::1`. Startup, inventory/ledger/definitions, Auth+REST **7/7**, v4 **151 ca / 575 schema envelopes**, post-suite verify, worker stop/start/verify và cleanup đều đạt. Có 25 migrations, 199 functions và 2 catalogue (39 món draft/test + fixture 20 món riêng). Chi tiết và giới hạn ở [CHECKS](CHECKS.md), cách cấu hình host ở [runbook](RUNBOOK_QA.md).

Baseline `4903256` + diff local `scripts/gm_v4_http_check.mjs` sửa cleanup fixture shortage: dọn member/room và release tạm đúng thứ tự FK, trong writer context transaction-local trên owned QA. Lỗi post-suite catalogue drift trước sửa và hai lần cleanup bị guard/FK chặn đều được giữ trong log local `review-results/docker-binding-fix-20261105/`. Verifier không được nới, migration/API/policy không đổi. Run cuối đã stopped, credentials và owned resources đã dọn. Evidence thu trước commit; Trí yêu cầu commit/push bản sửa lên main ngày 2026-11-05. Việc xuất bản không thay approval/Project; Bruno UI, Android/native và các API ngoài suite giữ scope riêng.

Phần dưới là evidence lịch sử trước cấu hình Docker mới; các ghi chú không có cách binding/chưa chạy lại không còn là kết luận hiện hành cho host này.

## Handoff sau kiểm lại strict QA — 2026-11-05

Main `4903256` đã chạy lại startup có guard hai lần trên owned QA `fix-main-20261105` và `fix-main-bind-20261105` (API/DB `54361/54362`, CLI 2.120.0, Docker Engine 29.9.2). Cả hai bị chặn với `QA_HOST_BINDING_NOT_LOOPBACK` và tự cleanup về `stopped`. Network đã có default loopback và `--ipv6=false`, nhưng Docker inspect DB vẫn cho effective bindings `0.0.0.0`/`::`. Chi tiết expected/actual và phạm vi inspection ở [CHECKS](CHECKS.md).

Guard/cleanup hoạt động; **vòng đời QA loopback đầy đủ chưa đạt**. Auth+REST, inventory/manifest, seed và worker của lượt mới **Not run** vì chưa qua startup. Root unit tests đạt 19/19 không thay kết quả đó. Log/JSON local giữ trong `review-results/main-fixes-20261105/`; evidence cũ bên dưới giữ nguyên theo revision. Không dùng CI wildcard để đóng thiếu sót, không sửa DB app/migration hoặc tự thay Project status. Phương án cần đổi toolchain/proxy/cấu hình Docker toàn máy cần chủ dự án chốt trước.

## Supplement 2026-11-05 — QA Runner Loopback Isolation & Resource Ownership

Đợt cập nhật này bàn giao tiêu chuẩn QA Runner cho các task backend (`GM-15..23`, `GM-32`):
1. **Kiểm soát Loopback Binding nghiêm ngặt:**
   - Hàm `assertLoopbackPublishedPort` trong `scripts/backend-qa.mjs` kiểm tra và thực thi cơ chế fail-closed nếu cổng xuất bản không thuộc `127.0.0.1` hoặc `::1`.
   - Cấu hình wildcard trong CI chỉ được sử dụng cho môi trường kiểm thử CI tự động, không được suy diễn là bằng chứng đạt chuẩn loopback-only trên môi trường máy trạm.
2. **Quyền sở hữu tài nguyên & dọn dẹp an toàn:**
   - Mạng bridge tạo mới với `--ipv6=false` và `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`.
   - Tất cả tài nguyên (mạng, container, volume) đều được gắn nhãn sở hữu `com.gm03.owner_uuid` và `com.gm03.run_id`.
   - Tiến trình worker gắn nonce bảo vệ; chỉ tiến trình khớp nonce mới được dừng/khởi động lại.
   - Thao tác `qa:stop` dọn dẹp sạch sẽ tài nguyên của phiên QA mà không bao giờ can thiệp vào cơ sở dữ liệu phát triển (`54321`/`54322`).
3. **Bằng chứng kiểm thử:**
   - Toàn bộ 19 test trong `tests/backend-runner.test.mjs` và `tests/backend-qa.test.mjs` đều đạt Pass.

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
# Merge integration — 2026-10-27

PR #137 integrates main `9871137`, including migrations 0030/0031 and schema 0.9.2. The dual GM03/CI QA modes are preserved. Manifest production, worker validation and API reporting now require/read back 0.9.2; old 0.9.1 manifests are rejected even with a valid seal. Recreate QA from current source rather than resealing an earlier run. GM-07.B wire contract remains unchanged.

Trí explicitly requested merge and Project status updates in the current owner conversation, accepting the reported CI limitation (GM-40 setup port 54322 occupied). This instruction does not convert unrun tests into Pass: the prior loopback-only host failure/fault-injection gaps and Android exclusions remain as recorded in CHECKS. Project status is the owner's disposition; runtime evidence retains its actual results.
