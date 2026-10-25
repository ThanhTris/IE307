## Task và phạm vi

Task `tasks/backlog/GM-06.md`, owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Roadmap-v2 GM-06, mã cũ GM-05. Tâm nhận yêu cầu cập nhật ngày2026-10-25.
Branch `codex/gm-06-canonical-storage` → main, không stacked.

Bổ sung migration tiến0027/schema0.9.0/GM06.2 để kết quả dish-only, card đã khóa và
Top3 tồn tại theo retention mà không phụ thuộc session đã cleanup. History hỗ trợ
nhóm2–20 và NO_CONSENSUS không winner; giữ consent/ACL/anti-replay. Thêm storage
preference mặc định tài khoản và snapshot phòng, cùng quan sát giá nullable.

Ngoài scope: API/policy/writer v4, sửa runtime v2/v3, tính lại score/eligible set,
mobile/Places, đổi contract B, catalogue/importer, production migrate/publish.
Bridge retention mới thuộc phạm vi schema, cần Trí/GM17 review; body cũ được giữ.

## Start gate — trước viết phần độc lập

- [x] `python scripts/task_readiness.py --task GM-06 --base-ref origin/main` đạt READY_TO_CLAIM; GM03 Needs Update và GM04 Done là baseline được nhận theo ADR011.
- [ ] Trí review patch/test plan và interface supplement. Không thêm package/provider/native.
- Input: GM03 runner/config; GM04 food/core1.1.0; schema0.8.0/0026 catalogue authority; GM17 registry/consent/cleanup và GM21 settings.
- Contract B còn proposed, không dùng schema B hiện tại làm chứng nhận runtime; storage có mapping nullable price/observedAt cần GM07 chốt wire.
- File ownership: migration0027/down, runner GM06, mapping/evidence/CI GM06; không nhận UI/feature API task khác.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task upstream | Project / checker | Artifact trên target |
| --- | --- | --- | --- |
| GM03 | Runner/config | Needs Update baseline; start/merge-gate.txt | Có trên origin/main, đủ baseline |
| GM04 | Dictionary food/core1.1.0 | Done | Có trên origin/main, không sửa |

- [x] Nhận main8293bb3 bằng fast-forward; nguồn gốc nhánh a31f403. Commit mới chỉ làm rõ docs/quorum; không thay migrations hoặc input storage đã kiểm.
- [x] Merge checker READY_FOR_MERGE_REVIEW; đây chỉ là gate baseline/artifact.
- [ ] Trí kiểm revision hiện tại, actual upstream merge/artifact và bridge retention; không tự duyệt/merge.
- [ ] Hoàn tất/đối chiếu lỗi regression tài liệu mobile đã có trên main trước quyết định merge; không dùng schema tests thay việc đó.
- Contract/schema: additive storage GM06.2/schema0.9.0; không backfill v2/v3. Down QA từ chối dữ liệu mới còn retained; production rollback giữ storage và tắt future writer.

## AC và verification

| AC | Result | Evidence / environment | Giới hạn |
| --- | --- | --- | --- |
| Canonical result/locked cards/Top3/registry/FK | Pass | sql-results.json, PostgreSQL17 QA | Trusted SQL fixtures; chưa có producer v4 |
|20 members/NO_CONSENSUS/consent-retention/receipt race | Pass |80 assertions SQL, actual cleanup | API summary/detail/participant ACL pending GM17/21 |
| Preferences/private snapshots/latest-null/tied price | Pass | SQL default-deny + value assertions | No caller API, richer GM40 adapter pending |
| Fresh/populated upgrade/down/reapply, preserves legacy | Pass | SQL report +67 legacy pgTAP/18 races | QA only, not app DB apply |
| Baseline v3 policy/worker/HTTP | Pass |108 scenarios, PostgREST JWT local | Synthetic users/JWT/data; not GoTrue/native/v4 |
| Python full regression | Fail, pre-existing |594 tests,5 skips,21 mobile-doc subcases; pristine main reproduces same failures | baseline-regression.json; not all-tests-green |
| Repo/index/diff | Pass | Logs in this folder | Offline validation only |

- [x] `python scripts/validate_repository.py`
- [ ] `python -m unittest discover -s tests -p "test_*.py"` —21 pre-existing failed mobile documentation subcases,5 skips; không giấu/đổi test để xanh.
- [x] `python scripts/task_readiness.py --check-docs`
- [x] `git diff --check`
- Native/Expo/a11y: N/A cho data-schema supplement; chưa có UI/producer v4.
- Food data: fixture synthetic; không thay dữ liệu/ảnh/quyền nguồn hoặc publish.
- Artifact/hash/version và known limits xem PATCH_MANIFEST/CHECKS/HANDOFF.

## Review cuối — Trí

- [ ] Trí kiểm AC, gates, SQL/retention/privacy và evidence tại revision PR mới.
- [ ] Trí nghiệm thu/chuyển Done; AI không tick, không tự cập nhật Project.

## Artifact bàn giao roadmap-v2

Track DATA, stage database. Không phải API/native release.

| Input task | Artifact/version | Nhánh/target | Smoke |
| --- | --- | --- | --- |
| GM03/04 | Runner/config + food/core1.1.0 | main | SQL runner local |
| GM17/21 | Registry/consent/cleanup/settings baseline | main | Actual cleanup/privacy assertions |
| GM20/40 |0026/catalogue authority, schema0.8.0 | main |108 v3 regression scenarios |
| GM07 | B proposed | docs trên main | Wire closure/runtime Not run |

Output:0027 + down, docs/data/GM06_CANONICAL_STORAGE.md, GM06 canonical runner;
contract GM06.2/schema0.9.0. Consumer GM07/17/18/19/20/21/23/32/40 nhận theo HANDOFF.

## Output chạy được — UI / BE / Data

CHECKS/HANDOFF trong docs/evidence/roadmap-v2/GM-06/canonical-storage/.

| Component/field | Lệnh | Input/expected | Actual/evidence | Scope |
| --- | --- | --- | --- | --- |
| Canonical schema/history/preferences/price | `python3 scripts/gm06_canonical_check.py --report /tmp/gm06-canonical-results.json` | Synthetic fresh/upgrade/invalid/privacy/cleanup/race/down/reapply |80 assertions Pass | SQL thật trong DB QA có marker |
| Legacy schema | `python3 scripts/gm06_schema_check.py --report /tmp/gm06-legacy-results.json` |67 pgTAP +18 races | Pass | Legacy fixture only |
| Existing dish-session v3 | `python3 scripts/dish_policy_sql_check.py` | Original SQL/domain/worker/HTTP JWT |108 Pass | Actual v3; not v4 |

- [x] Data/schema/FK/null/unit/version và SQL thật, synthetic fixtures tách dữ liệu thật.
- [x] Evidence không JWT/secret/raw ballot/private seed; actual SQL reports dùng boolean/hash assertion.
- [ ] Integration v4/production backup+migration và final Trí review: Not run/Pending, không suy Pass từ CI/docs/legacy.
