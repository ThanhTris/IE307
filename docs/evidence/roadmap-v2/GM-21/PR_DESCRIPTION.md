## Task và phạm vi

Task tasks/backlog/GM-21.md, owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Roadmap-v2 GM-21 / mã cũ GM-17 / issue #82. Tâm yêu cầu bắt đầu ngày2026-10-14.
Baseline food-v1; API_CONTRACT/CONTEXT_HISTORY_SPEC/IDENTITY_PRIVACY_SPEC,
ADR014/015, supplement docs/architecture/GM21_HISTORY_API.md. Review Pending.
Branch codex/gm-21-history-consent → main, không stacked. Draft phần độc lập.

Thêm API đọc/xóa history và consent theo caller, giữ summary tối đa30ngày,
không lộ roster/groupKey/votes/location. Rút consent xóa summary liên quan,
không đổi winner hoặc personal history của người khác. Retry cùng request/body
không ghi lại; helper producer không hồi sinh history đã xóa. Canonical recent
ports hỗ trợ<=3 kết quả đúng nhóm và snapshot khóa sau start.
Ngoài scope hiện tại: GM19/20 thực tế chưa được nối; Android GM25/28/31,
production scheduler/deploy/publish. Không thay package/GM07 DTO/frozen migrations.

## Start gate — trước viết phần độc lập

- [x] task_readiness GM21 --base-ref origin/main đạt READY_TO_CLAIM; GM06/07/18 Done, input/HANDOFF có đúng version.
- [ ] Trí review plan/revision. Owner đã giao việc; không package/provider mới.
- Contract GM21.1/GM07.1/food1.1.0/schema0.2.0+0021; actual GM07 real client dùng nguyên trạng. Nullable/errors/cursor/opaque IDs tại supplement.
- File ownership: mới0021_history/SQL+HTTP tests/runners/evidence; GM19/20 tiếp tục file riêng, không sửa/dựng lại producer.
- Làm trước bằng synthetic persisted results/real SQL+HTTP; actual room/start/finalize wiring vẫn Not run, do GM21 bổ sung sau upstream. Không thêm dependency ngược lên GM19/20.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Dependency | Upstream | Project / checker2026-10-14T04:42:32Z | Merge commit thật | Target khớp? |
| --- | --- | --- | --- | --- |
| GM06 | PR102 | Done |7060b8825ad72ee9442d8890719f82451d473c33 | Có |
| GM07 | PR104/105 | Done |07117821 /9f71bba6 | Có; frozen client/contracts |
| GM18 | PR108 | Done |a33d5e85f1aeb7c7bda02310e02880a3af5e77da | Có;0018/GM18.1 |
| GM20 |0020 finalize/HANDOFF | Todo | Chưa có trên target | Chưa; merge blocker |

- [x] Target fetched main a33d5e8, nhánh mới bắt đầu từ commit này.
- [ ] Merge gate đạt — hiện BLOCKED GM20, integration/merge-gate.txt; không bypass.
- [ ] Người merge đối chiếu upstream merge commits/artifact/revision sau khi GM20 bàn giao.
- [ ] Cập nhật nhánh và chạy lại integration room/start/finalize thật sau upstream.
- Schema/privacy:0021 private settings/projection/receipts/ports, authenticated-only wrappers. Correct detached-consent uniqueness forward, giữ uniqueness scoped/active-global. Existing worker purges metadata qua DELETE hook; no extra scheduler service.
- Rollback: stop consumers/revoke public execute; full down cần backup/forward migration vì old null uniqueness không chứa được nhiều retained meals, không xóa data để revert.

## AC và verification

| AC | Result | Evidence/môi trường | Thật/giới hạn |
| --- | --- | --- | --- |
| Caller personal/group, privacy/consent/delete | Pass độc lập | SQL45/HTTP21, integration/ | Real PG/JWT/client; synthetic summaries |
| Canonical roster/recent<=3/30days, frozen snapshot | Pass ports | SQL assertions | Consumer room/start wiring Not run |
| ACK/hash/retry/rate | Pass | HTTP8 concurrent writes/1mutation;60/61 read budget | Real network; opaque GM07 req IDs |
| TTL/multiple retained meals/display/50paging | Pass | Actual cleanup + retained projections/keyset | GM31 cache/Android Not run |
| Actual finalize→history and create/start ranking | Not run | GM20 input absent | Merge blocker, not replaced by synthetic ports |
| Handoff/device coverage | Bàn giao | HANDOFF + mobile matrix | GM25/28/31 device integration Not run |

- [x] python scripts/validate_repository.py
- [x] python -m unittest discover -s tests -p "test_*.py" —550/550
- [x] python scripts/task_readiness.py --check-docs
- [x] git diff --check
- Mobile typecheck/lint/unit/architecture382/382,4baseline warnings/0errors; domain237/237; GM17 regression93 Pass (optional concurrentCleanup skipped by upstream runner).
- Food source/license/coverage new collection N/A; no real publish, input/verified manifest/kernel/frozen migrations unchanged. Fixtures synthetic, no verified claim.
- Artifact tested a33d5e8+patch, hashes in PATCH_MANIFEST.json. GM20 owner upstream; Trí review Pending. Remote CI Not run before push.

## Review cuối — Trí

- [ ] Trí kiểm AC, gate và revision evidence, không tự tick.
- [ ] Trí nghiệm thu/chuyển Done sau actual upstream integration; lưu review revision/evidence.

Checker/docs/mock không thay execution/review. Đây là draft partial delivery,
không đề nghị merge/Done toàn bộ GM21 khi GM20 và actual wiring chưa đạt.

## Artifact bàn giao roadmap-v2

BE / implementation / API+SQL thật trên data synthetic; không UI mock.

| Input task | Artifact/version | Có target/nhánh? | Smoke |
| --- | --- | --- | --- |
| GM06/17 |0001..0005/schema0.2.0/ADR015 | Có | Typed PG + ACL93 |
| GM07 | contracts/client/guards GM07.1 | Có | HTTP client + mobile382 |
| GM18 |0018/GM18.1 | Có | Existing domain237 + canonical recent ports |
| GM20 |0020_finalize/HANDOFF | Chưa | Not run |

Output0021_history.sql/history.sql/GM21.http + runners, supplement/CHECKS/HANDOFF.
Versions/commands/expected outputs trong docs/evidence/roadmap-v2/GM-21/HANDOFF.md.
GM21 tiếp tục tự tích hợp vào producer upstream sau bàn giao; GM25/28/31 nhận API cases.

- [ ] UI mock/native N/A ở phần API độc lập, không claim Pass từ fixture.
- [x] Start inputs thực đủ; không tạo lại scaffold/contract/prerequisite.

## Output chạy được — UI / BE / Data

CHECKS.md: docs/evidence/roadmap-v2/GM-21/CHECKS.md, tested a33d5e8+patch,
macOS/Node26/PG17.11/Python3.12.14–3.13.3.

| Endpoint/field | Lệnh/request | Input | Expected | Actual/evidence | Loại/result |
| --- | --- | --- | --- | --- | --- |
| get_history | gm21_http_check.mjs / GM21.http | JWT/scope/cursor | Only caller/valid group,50/page,safe DTO | HTTP21 + SQL45 | Real API synthetic data / Pass |
| consent/delete | same suite | Opaque requestId/scope/bool/historyUUID | Same ACK; changed409; deletion scoped | Concurrent8/1,withdraw/peer/result assertions | Real API / Pass |
| recent/freeze/record ports | gm21_history_check.py | Trusted room/version/result | Correct group/3recent/frozen/idempotent summary | SQL45 | Real PG/synthetic finalize / Pass ports |
| Actual GM19/20 pipeline | Chờ upstream | Real room/start/finalize | History/ready/pool/consent atomic | Not run | Merge blocker |

- [ ] Expo/Android UI cases không chạy ở đây.
- [x] API request runner/examples có status/body/error assertions, không giả producer.
- [x] Mobile matrix handoff tách server/unit/device, adb reverse54321 hoặc trusted HTTPS; GM31 cache<=50/identity isolation kiểm riêng.
- [x] Data fields/FK/unit/null/privacy/version đủ theo scope; source hashes/physical query thật.
- [x] Evidence không keys/JWT/raw ballots/private GPS. Mandatory actual integration chưa chạy giữ blocker.
