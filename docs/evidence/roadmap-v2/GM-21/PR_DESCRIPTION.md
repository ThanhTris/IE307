## Task và phạm vi

- Task Markdown: `tasks/backlog/GM-21.md`; owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
- Roadmap-v2 GM-21 / mã cũ GM-17 / issue #82.
- Assignment: Tâm giao triển khai/tích hợp; baseline food-v1; API_CONTRACT, CONTEXT_HISTORY_SPEC, IDENTITY_PRIVACY_SPEC; ADR014/015. Review Trí Pending.
- Branch `codex/gm-21-history-consent` → `main`, PR113, không stacked.
- Scope: get/delete/history consent; summary personal/group đúng quyền; recent<=3 đúng nhóm; nối GM19 lobby/start và writer nguyên tử GM20. Ngoài scope: Android consumer GM25/28/31, production deploy/scheduler/publish. Không đổi luật phiếu/engine/DTO/package upstream.

## Start gate — trước viết phần độc lập

- [x] Đã chạy `python scripts/task_readiness.py --task GM-21`; GM06/07/18 Done, đủ HANDOFF/artifact trên target.
- [ ] Reviewer Trí duyệt plan/revision; owner đã giao việc, không package/provider/license mới.
- Contract/input: GM07.1 client/contracts unchanged, food/core1.1.0; GM19/schema0.3.0; GM20.3/schema0.5.0; output GM21.2/schema0.6.0. Requests/errors/nullable/opaque IDs/cursor tại `docs/architecture/GM21_HISTORY_API.md`.
- File ownership: GM21 owns0021/0024, runners/tests/docs; không sửa migrations đã merge. GM19/20 đã bàn giao, không thêm dependency ngược.
- Giai đoạn trước dùng synthetic persisted state; hiện đã chạy actual room/start/submit/finalize. Positive food vẫn fixture, không verified publish.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task/PR upstream | Project Done / checker | Merge commit thực tế | Artifact/version trên target khớp? |
| --- | --- | --- | --- | --- |
| GM06 | PR102 | Done / merge-gate.txt |7060b882 | Có; frozen0001..0003 |
| GM07 | PR104/105 | Done / merge-gate.txt |07117821 /9f71bba6 | Có; client/contract/guards |
| GM18 | PR108 | Done / merge-gate.txt |a33d5e8 | Có;0018/GM18.1 |
| GM20 | PR115 | Done / merge-gate.txt |ad8478d | Có;0023/GM20.3/schema0.5.0 |

- [x] Ref target fetched: `origin/main=991de6620715d1219da900499f4aa2d683b01bb4` (includes PR116 Expo fix).
- [x] `python scripts/task_readiness.py --task GM-21 --gate merge --base-ref origin/main` đạt READY_FOR_MERGE_REVIEW, live Project; thời điểm trong `gm20-integration/merge-gate.txt`.
- [ ] Người merge kiểm lại code/merge commit upstream thật và target ở thời điểm merge.
- [x] Rebase target; actual integration tests có kết quả trong CHECKS/PATCH_MANIFEST. Diff giới hạn GM21.
- Target/tested HEAD:991de66 /06d1d5b + working-tree patch và source hashes. New remote CI chưa chạy trước push.
- Schema/privacy:0021 private settings/presentation/receipts, sửa uniqueness cho detached consents;0024 nối pool/start/writer, bỏ detached grants và giữ pinned name/TTL. Rollback dừng consumers/revoke execute, backup và forward migration; không reset/drop retained data. App DB có drift, chưa deploy/reconcile.

## AC và verification

| AC | Pass/Fail/Not run | Evidence/output/version/môi trường | Mock hay thật / giới hạn |
| --- | --- | --- | --- |
| Personal/group opt-in, ACL/TTL/delete/privacy/page50 | Pass | SQL45 + HTTP21, schema0.6.0/macOS/PG17 | Real PG/JWT/GM07, synthetic positive data |
| Consent/roster reset-ready và <=3 recent đúng nhóm | Pass | Actual lifecycle10 + SQL45 | Real GM19→GM18 pool; eligibility giữ nguyên |
| Frozen start, actual finalize history và retry | Pass | lifecycle + upstream GM20/22 scenarios | Real HTTP/result/history/event; no duplicate/resurrection |
| Pinned name, min consent TTL, rollback | Pass | lifecycle assertions | DB fault injection riêng; retry3 histories |
| Regression | Pass / skips ghi rõ | GM17/93, domain237, mobile382, Python550/5skips | Static/unit/owned DB; không Android |
| Mobile consumer/API handoff | Bàn giao; device Not run | HANDOFF + MOBILE_API_TEST_MATRIX | GM25/28/31 app→API→UI/cache nhận tiếp |

- [x] `python scripts/validate_repository.py`
- [x] `python -m unittest discover -s tests -p "test_*.py"` —550 tests,5 existing skips.
- [x] `python scripts/task_readiness.py --check-docs`; metadata contract đổi đã `--write-docs`.
- [x] `git diff --check`
- Native/Android/a11y/offline Not run (consumer stage); typecheck/lint/mobile unit/architecture và SQL/RLS/race theo CHECKS. Không suy native Pass từ HTTP.
- Food source/license/coverage/menu-hours/freshness/unknown/overnight giữ nguyên contract/kernel; positive fixtures tách verified data, không thu thập/publish mới.
- Artifact/version/source hashes tại PATCH_MANIFEST; output GM21.2/schema0.6.0 nhận bởi GM25/28/31. Trí review Pending; không tự Done.
- Evidence mới `docs/evidence/roadmap-v2/GM-21/gm20-integration/`; giữ evidence cũ.

## Review cuối — Trí

- [ ] Reviewer kiểm AC, cả hai gate và evidence cho revision PR hiện tại; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done trên Project; lưu review revision/evidence. Thay code sau review phải review lại.

READY_FOR_MERGE_REVIEW không là quyền tự merge. Checker đọc Project/artifacts;
Done không tự chứng minh code đã vào target. Native/production deployment không
được suy ra từ fixture/SQL/CI. Updated patch cần push và CI/review revision mới.

## Artifact bàn giao roadmap-v2

Track BE / implementation / API+SQL thật, không mock UI.

| Input task | Artifact + version/commit | Có trên target/nhánh? | Smoke đã kiểm |
| --- | --- | --- | --- |
| GM06/17 |0001..0005/schema0.2.0/ADR015 | Có | SQL typed constraints/RLS93 |
| GM07 | GM07.1 client/contracts/guards | Có | Real client HTTP + mobile382 |
| GM18 |0018/GM18.1 | Có |237 domain + actual rank port parity |
| GM19 |0019/schema0.3.0/PR112 | Có | Actual lifecycle/start |
| GM20 |0023/GM20.3/schema0.5.0/ad8478d | Có | Actual submit/finalize/history +22 regression |

Output:0021_history.sql +0024_history_integration.sql; history.sql; GM-21.http;
GM21 runners; GM21_HISTORY_API.md. food/core1.1.0, schema0.6.0, GM21.2.
Commands/expected results/tasks nhận: `docs/evidence/roadmap-v2/GM-21/HANDOFF.md`.

- [ ] UI mock/native không thuộc output API này; không ghi API/native Pass từ fixture.
- [x] Đầu vào đủ; không tạo lại scaffold/contract/prerequisite.

## Output chạy được — UI / BE / Data

CHECKS.md: `docs/evidence/roadmap-v2/GM-21/CHECKS.md`, tested06d1d5b + patch hashes,
macOS/Node26/PG17/Python3.13; target991de66.

| Endpoint/field | Request/lệnh | Input | Expected + assertion | Actual + evidence | Mock/thật / Result |
| --- | --- | --- | --- | --- | --- |
| get_history | gm21_http_check.mjs / GM-21.http | JWT/scope/cursor | Caller-only,<=50,safe DTO | HTTP21/SQL45 | Real API / Pass |
| consent/delete | same runner | Opaque ID/bool/scope/history UUID | Same ACK,409 reuse, scoped delete | Concurrent8/1,withdraw/no resurrection | Real API / Pass |
| pool/recent/start | gm21_lifecycle_check.mjs | Actual room/roster/consent |<=3,rank only eligible,ready reset,frozen | lifecycle10 | Real API/SQL / Pass |
| finalize→history | lifecycle + gm21_upstream_regression.mjs gm20 | Actual ballots/server result | Atomic pinned summary/TTL/retry/rollback | Actual3 histories/rollback +22 regression | Real API/SQL / Pass |

- [ ] Expo/device product UI not run; consumer Android scope bàn giao rõ.
- [x] API request runner có HTTP/body/error/state/version assertions, không dựng lại producer.
- [x] Ma trận mobile tách server/unit/device; HANDOFF endpoint/auth/setup và GM25/28/31 cases, không thêm dependency ngược.
- [x] Data fields/schema/FK/unit/null/privacy/version và SQL/query thật theo API scope; không verified publish claim.
- [x] Evidence che secrets/GPS/phiếu thật; app deployment drift và remote CI/device/review còn chưa kiểm được ghi rõ, không dùng CI/docs thay nghiệm thu.
