## Task và phạm vi

- Task Markdown: `tasks/backlog/GM-21.md`; owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
- Roadmap-v2 GM-21, mã cũ GM-17; issue hiện hành #82, phần bổ sung theo comment6438979028.
- Assignment accepted ngày30/10/2026. Baseline GM21.2 giữ nguyên; supplement GM21.3/schema0.13.0 nhận GM20.4/PR143 và GM07.B-supplement. Dùng mapping/ADR021 đã bàn giao; trạng thái Proposed của ADR không được tự đổi thành approval.
- Branch `codex/gm-21-canonical-history` → `main`, không stacked.

Khi canonical history bị revoke hoặc gọi common `delete_history`, payload cần được xóa ở đúng kho và giữ receipt chống hồi sinh. Forward0036 bổ sung các đường này, chặn audience mới tái sử dụng consent đã retention-detach và giữ history đã lưu đọc được sau cleanup phòng. Reader/result projection GM20 được dùng lại; winner/Top3/card/price/order không tính lại từ catalogue.

Ngoài scope: đổi writer/thuật toán/DTO GM07, participant identity snapshot, paging của supplement, mobile/Android, production migrate/publish hoặc bật creation flag trên DB ứng dụng.

## Start gate — trước viết phần độc lập

- [x] Đã chạy `python scripts/task_readiness.py --task GM-21 --base-ref origin/main`: READY_TO_START; GM06/07/18/20 Done và đủ output/HANDOFF.
- [x] Owner nhận việc; patch/test plan tại `canonical-integration/PLAN.md`, assignment local accepted.
- [ ] Trí review scope/patch/evidence revision hiện tại; không có package/provider/license mới.
- Contract/fixtures: GM06.3/0032, GM20.4/0035/schema0.12.0 và schema `dish-session-v4/roadmap-v2/GM-07.B-supplement`; legacy B/v2/v3 giữ authority cũ.
- File ownership:0036/down, GM21 QA/request/evidence; GM20 QA helper chỉ thêm internal hook/report directory để tái sử dụng, default suite/guards giữ nguyên.
- Không dùng mock thay API evidence. Device/production chưa chạy; không thêm dependency ngược GM20 → GM21.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task/PR upstream | Project Done / thời điểm checker | Merge commit thực tế | Artifact/version trên target khớp? |
| --- | --- | --- | --- | --- |
| GM-06 | PR136 | Done,30/10 13:37 +07 |1bf28d8 |0032/GM06.3/schema0.10.0, khớp |
| GM-07 | PR138 | Done,30/10 13:37 +07 |40feb9b | Baseline B và B-supplement schema riêng, khớp |
| GM-18 | PR139 | Done,30/10 13:37 +07 |a6e89fc | Catalogue/handoff baseline và supplement, khớp |
| GM-20 | PR143 | Done,30/10 13:37 +07 |e3f7058 |0035/GM20.4/schema0.12.0, writer/mapping có trên main |

- [x] Đã fetch target: `origin/main` = `e3f7058525da14c3b147fc909511cef7c803ee7c`; nhánh từ target này.
- [x] `python scripts/task_readiness.py --task GM-21 --gate merge --base-ref origin/main`: READY_FOR_MERGE_REVIEW.
- [x] Đã kiểm upstream merge commits là ancestor của target; hash/artifacts khớp, migrations đã merge không đổi; SQL/HTTP integration đã chạy.
- [ ] Người merge kiểm lại target, diff, CI và review tại revision PR hiện tại; cập nhật/rebase và rerun nếu target đổi.
- Thay đổi: forward0036/schema0.13.0/GM21.3; không đổi wire GM07 hoặc authority theo phiên. GM28/31 nhận reader/consent/delete semantics; producer GM20 giữ nguyên.
- Rollback:0036 down được kiểm trên QA, khôi phục named prior API bodies, bỏ guards/ledger mới, giữ result/receipt/data còn lại. Không phục hồi payload đã xóa/revoke; deployment retained DB cần backup/plan và review riêng.

## AC và verification

| AC | Pass/Fail/Not run | Evidence/version/môi trường | Mock hay thật / giới hạn |
| --- | --- | --- | --- |
| Actual writer → canonical result/history, locked card/Top3/cohort/order | Pass | `canonical-integration/http-results.json`, GM21.3/schema0.13.0 | GoTrue guest JWT/PostgREST thật, synthetic owned QA |
| Personal/group độc lập, late opt-in, revoke trước/sau finalize,20 người/outsider | Pass |80 consumer checks,700 request/response schema envelopes | Không lộ raw ballots/preferences/seed/identities |
| Common/capability delete, ACK retry, reconnect sau delete/cleanup | Pass | Actual HTTP + SQL receipt/payload assertions | Giữ result, receipt và scope/owner còn hợp lệ |
| Cleanup/audience race hai thứ tự và finalize/revoke đồng thời | Pass | SQL sessions thật, quan sát Lock,23514/rollback assertions | READ COMMITTED; không mock scheduler |
| Detached consent và retention/expiry/down/reapply | Pass | Original red diagnostic + forward0036 green cases | Boundary dùng explicit predicate time; không giả đã chờ30 ngày |
| Existing B/v4 và full GM20 regression | Pass |151 baseline B checks/575 envelopes;125 producer checks/705 envelopes | Bao gồm fault/atomic rollback/retry, worker/quorum; không Android |
| Independent SQL parity và legacy pagination/consent | Pass |102 independent vectors;47 legacy SQL checks | Legacy50-row keyset/cursor; SQL claims tách JWT verification |
| Python/repo/index/diff | Pass |648 tests OK,5 existing skips; logs | Offline/unit không thay API hoặc human review |
| Hosted CI revision mới | Not run tại lúc chuẩn bị commit | Workflow canonical job đã thêm | Kiểm trên PR sau push |
| Android/FE/native/cache consumer | Not run | Bàn giao GM25/28/31 theo matrix | Ngoài scope BE này |

- [x] `python scripts/validate_repository.py`
- [x] `python -m unittest discover -s tests -p "test_*.py"` —648 tests OK,5 skips.
- [x] `python scripts/task_readiness.py --check-docs` — metadata assignment đã sinh/check indexes.
- [x] `git diff --check`
- Native/typecheck/lint/a11y/offline UI: N/A cho BE patch, không có UI mới; device handoff giữ Not run. SQL/ACL/race/rollback: actual QA ở trên.
- Food: dùng real39-dish draft import và synthetic positive pool tách riêng; không sửa source/verified flags, license/freshness/menu-hours hay bịa nhãn/giá/coverage để vượt test.
- Artifact: source SHA256 và report hashes trong MANIFEST.json; QA khởi tạo từ toàn bộ migrations rồi final consumer iteration trên cùng owned QA. Tested main e3f7058 + patch trước commit; code publish khớp sourceHashes hiện hành. MANIFEST ghi riêng normalization một dòng trống EOF; runtime reports giữ nguyên hash thực sự đã chạy, không đổi executable tokens.
- Environment: macOS, Node26, Python3.13/jsonschema4.26.0, Supabase CLI2.120.0/PostgreSQL17; cleanup namespace/worker/backup/private control đã Pass.
- Optional participants không được trả vì chưa có retained identity projection được bàn giao. Supplement không có cursor trong schema; extra fields bị từ chối, legacy paging giữ nguyên.
- Evidence mới nằm trong `docs/evidence/roadmap-v2/GM-21/canonical-integration/`; baseline và red diagnostic cũ được giữ theo revision.

## Review cuối — Trí

- [ ] Trí kiểm AC, cả hai gate và evidence cho revision PR hiện tại; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done trên Project; lưu review revision/evidence. Thay code sau review phải review lại.

READY_FOR_MERGE_REVIEW không là quyền tự merge. Checker không tự chứng minh upstream đã merge hoặc nghiệm thu runtime. Mock/CI/docs validator không thay API/native/data thật.

## Artifact bàn giao roadmap-v2

Track BE, stage implementation; SQL/Auth/REST thật, không có UI mới.

| Input task | Artifact + version/commit | Có trên target/nhánh? | Smoke đã kiểm |
| --- | --- | --- | --- |
| GM06/07 |0032/schema0.10.0; B-supplement schema/PR138 | main e3f7058 | Input/hash và request/response schema |
| GM18 | Catalogue/handoff/PR139 | Có | Actual draft/synthetic QA import và source pins |
| GM20 |0035/schema0.12.0/GM20.4/PR143 | Có |102 parity vectors,125 producer HTTP checks |

- Output:0036/down; `scripts/gm21_canonical_check.py`, `gm21_canonical_http.mjs`; HTTP suite, CI job, mapping/checks/manifest.
- Integration GM21.3/schema0.13.0; wire vẫn `dish-session-v4/roadmap-v2/GM-07.B-supplement`; consumers GM28/31 và cases consent cho GM25.
- HANDOFF.md: `docs/evidence/roadmap-v2/GM-21/HANDOFF.md`; supplement tại `canonical-integration/HANDOFF.md`.
- [x] Đủ đầu vào thực tế; dùng lại producer/DTO, không dựng lại scaffold/contract hoặc bỏ prerequisite.
- [ ] Android/native consumer evidence vẫn Not run, không ghi Pass từ fixture/server.

## Output chạy được — UI / BE / Data

Theo TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md. CHECKS.md:
`docs/evidence/roadmap-v2/GM-21/canonical-integration/CHECKS.md`; source/env tại MANIFEST.json.

| Endpoint/field | Request/lệnh | Input | Expected + assertion | Actual + evidence | Mock/thật / result |
| --- | --- | --- | --- | --- | --- |
| dish_session history | POST `/rest/v1/rpc/dish_session` | history + B-supplement version | Same stored resultId/winner/Top3/cohort/card; đúng consent/TTL |80 checks/700 envelopes | HTTP thật, Pass |
| delete_history và deleteHistory | Common RPC hoặc versioned command | Own/other/missing ID, request retry | Đúng payload bị xóa/no-op; receipt/result giữ, không hồi sinh | Consumer report | HTTP + SQL thật, Pass |
| update_history_consent | POST existing RPC | personal/group false | Purge canonical scope, scope khác giữ, guard được restore | Consumer report, trước/sau cleanup | HTTP + SQL thật, Pass |
| Detached consent/race/retention | `python scripts/gm21_canonical_check.py` | Owned QA và2 SQL sessions | Invalid link23514; original link đọc được; rollback sạch | Reports + cleanup-results.json | Thật, Pass |
| Legacy pagination | Existing get_history(scope,cursor) | Capped50/remaining/foreign cursor | No overlap, cursor caller/scope được kiểm |47 SQL checks | SQL thật, Pass |

- [x] API suite `supabase/tests/http/GM-21-canonical.http` và runner có HTTP/body/error/state/version assertions.
- [x] Đối chiếu MOBILE_API_TEST_MATRIX: server/unit/device tách riêng, consumer/endpoint setup và cases bàn giao đầy đủ; không thêm dependency ngược.
- [x] Schema/FK/null/unit/privacy/version dùng artifact upstream; SQL/query/rollback thực tế, không bịa dữ liệu verified.
- [x] Evidence không chứa JWT/credential URI/phiếu thật/GPS; private controls bị loại và QA đã dọn.
- [ ] Hosted CI và review Trí còn Pending; không tự chuyển Done hoặc deploy DB ứng dụng.
