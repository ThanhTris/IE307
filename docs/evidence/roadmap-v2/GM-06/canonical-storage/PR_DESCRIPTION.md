## Task và phạm vi

Task `tasks/backlog/GM-06.md`; owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Roadmap-v2 GM-06 / mã cũ GM-05; Tâm nhận cập nhật trực tiếp ngày2026-10-27.
Branch `codex/gm-06-canonical-storage` → main; PR #136, không stacked.
Spec/ADR: ADR-019, ADR-020, UI–BE–Data handoff2026-10-25.

Main đã dùng0027/schema0.9.0 cho v4; bản PR cũ trùng migration/ledger và có thể
cho price{} lọt qua SQL NULL. Bản sửa dùng0032/schema0.10.0/GM06.3, exact-key
null-safe và strict boolean CHECK; bổ sung populated v4 upgrade/retention/readback.

`dish_v4_private` vẫn là authority của API. `gm06_canonical` là model SQL private
độc lập, chưa có adapter/writer API; chưa thể tuyên bố đã đồng bộ toàn bộ runtime.
Ngoài scope: đổi v4 policy/DTO, mirror/backfill live data, mobile/Places, production
migration/reset/reconcile/publish. Shared cleanup wrapper được giữ rõ để Trí review.

## Start gate — trước viết phần độc lập

- [x] `python scripts/task_readiness.py --task GM-06 --base-ref origin/main`: READY_TO_CLAIM; đọc Project live ngày2026-10-27, dependency Done theo rule hiện hành.
- [ ] Trí review patch/test plan và supplement tại revision mới. Không thêm package/provider/license/native.
- Input: GM03 runner/config, GM04 food/core1.1.0; existing v4 GM07.B/0027..0031, GM17 registry/retention, GM21 settings, catalogue authority `dish_v3_private.catalogues`.
- File ownership: migration0032/down, GM06 runners/tests/dictionary/evidence/schema CI.
- Phần độc lập: model SQL và kiểm tương thích. Phần còn chờ: ownership/adapter, atomic writer/reader/consent/DTO cho model mới; không gắn nhãn mock là runtime pass.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task upstream | Project / checker | Artifact trên target |
| --- | --- | --- | --- |
| GM03 | BE runner/config | Done; live check2026-10-27 | Baseline trên main79eb0b9 |
| GM04 | food/core1.1.0 | Done; live check2026-10-27 | Baseline trên main79eb0b9 |

- [x] Đã fetch `origin/main` = `79eb0b94c7ba39d2699d5d59d3898753674cc0be`.
- [x] Merge checker READY_FOR_MERGE_REVIEW; chỉ là dependency/artifact gate.
- [x] Đã nhận main bằng merge, giải quyết workflow conflict và chạy integration SQL thật; main0027..0031 giữ nguyên. Merge còn chờ commit cùng bản sửa.
- [ ] Trí kiểm upstream merge/artifact và revision PR mới sau push; checker không chứng minh deployed DB hoặc thay review.
- Contract/schema: additive independent GM06.3/schema0.10.0, không đổi B/runtime0.9.x.
- Rollback: QA down từ chối retained independent rows; operational rollback giữ dữ liệu/routing cũ, cần backup/reconcile được review trước deploy.

## AC và verification

| AC | Result | Evidence / environment | Mock/thật / giới hạn |
| --- | --- | --- | --- |
| P1 migration identity, ledger, fresh/populated upgrade/down | Pass | review-fix-2026-10-27/sql-results.json, PostgreSQL17 | SQL thật; reproduced old23505 |
| P2 price NULL bypass, nested storage rejection | Pass | Same report: {}, từng missing/wrong field, SQL NULL; JSON null/nullable metadata valid | SQL thật, synthetic data |
| Result/Top3/member20/NO_CONSENSUS/FK/privacy/prices/preferences | Pass |196 assertions total with upgrade/retention/races | Independent SQL model; chưa API writer |
| Existing v4 result/history/defaults/consents preserved | Pass | Populated RPC upgrade/down + cleanup/revoke/delete/exact replay | Actual main v4 RPC; no mirrored data |
| Fresh v4 HTTP readback/ACL/cleanup/revoke/delete/replay | Pass27 assertions (including140 pinned v2 parity vectors) | isolated-http-results.json; own PostgreSQL/PostgREST/network/new credentials | Actual HTTP; synthetic JWT/users, not GoTrue/device |
| Existing v3 SQL/worker/HTTP | Pass |108 cases, v3-regression.json | Actual v3, synthetic fixtures |
| Legacy schema/history | Pass |67 TAP +18 races;47 history cases | Actual QA SQL |
| Full Python | Pass |611 tests,5 skips; python-regression.txt | Existing skips retained |
| Repo/index/diff | Pass | Current logs/manifest | Offline verification |
| Full GM03 QA startup | Not completed | QA_HOST_BINDING_NOT_LOOPBACK; own project cleaned | Guard preserved, not Auth pass |

- [x] `python scripts/validate_repository.py`
- [x] `python -m unittest discover -s tests -p "test_*.py"` —611 tests,5 skips.
- [x] `python scripts/task_readiness.py --check-docs`
- [x] `git diff --check`
- Native/Android/a11y/offline: N/A for SQL-schema patch; no new UI/native claim.
- Food: synthetic fixtures, no real data/artwork/license change or production publish.
- Tested head a7f54d8 + main79eb0b9 + uncommitted fix; exact source SHA256 in manifest.
- Consumers GM07/17/18/19/20/21/23/32/40; independent-model integration Pending their reviewed adapter plan.

## Review cuối — Trí

- [ ] Reviewer kiểm AC, cả hai gate, retention wrapper và evidence cho revision mới; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done trên Project. Thay code sau review phải review lại.

READY_FOR_MERGE_REVIEW không cấp quyền tự merge. Storage/compatibility Pass không
là API integration hoàn tất, deployed DB, CI revision mới hoặc nghiệm thu toàn GM06.

## Artifact bàn giao roadmap-v2

Track DATA, stage database; actual SQL + existing API HTTP compatibility, no mobile.

| Input task | Artifact/version/commit | Có trên target? | Smoke |
| --- | --- | --- | --- |
| GM03/04 | Runner/config + food/core1.1.0 | main79eb0b9 | Fresh migration/legacy checks |
| GM07/17/21 | GM07.B v4/consent/retention,0027..0031 | main79eb0b9 | Populated upgrade, RPC readback/cleanup/revoke/replay |
| GM20/40 | Existing v3/v4 policy + catalogue authority | main79eb0b9 |108 v3 cases + v4 fixtures |

Output:0032 + QA down, GM06 runners/tests, dictionary and schema workflow.
Contract GM06.3-canonical-storage/schema0.10.0; runtime B remains unchanged.
HANDOFF.md: `docs/evidence/roadmap-v2/GM-06/canonical-storage/HANDOFF.md`.

- [ ] Nối model độc lập vào runtime: Pending; không nhận API/native pass từ fixture.
- [x] Existing v4 authority được dùng trực tiếp để kiểm upgrade/readback; không tạo lại contract/catalogue.

## Output chạy được — UI / BE / Data

CHECKS.md: `docs/evidence/roadmap-v2/GM-06/canonical-storage/CHECKS.md`.

| Component/field | Lệnh/request | Input/expected assertion | Actual/evidence | Scope |
| --- | --- | --- | --- | --- |
| Independent storage/upgrade/validators | `python3 scripts/gm06_canonical_check.py --report /tmp/gm06.json` | Fresh/populated, invalid/null/FK/privacy/retention/race/down/reapply |196 Pass | SQL thật, synthetic identities/data |
| Existing v4 HTTP | `python3 scripts/gm06_isolated_http_check.py --report /tmp/gm06-http.json` | Actual result/history/defaults, ACL, cleanup/revoke/delete/replay |27 Pass (140 v2 vectors), isolated-http-results.json | Own fresh containers/network/credentials |
| Legacy schema | `python3 scripts/gm06_schema_check.py --report /tmp/gm06-legacy.json` |67 TAP +18 races | Pass | QA DB |
| Legacy history | `python3 scripts/gm21_history_check.py --report /tmp/gm06-history.json` |47 consent/privacy/retention/idempotency cases | Pass | Actual legacy RPC SQL |

- [x] Data/schema/FK/null/version, valid/invalid fixtures và SQL thật; dữ liệu synthetic tách production.
- [x] Evidence dùng booleans/hashes; không secret/JWT/raw votes/private seed.
- [ ] Production backup/reconcile/deploy, independent-model integration và final Trí review: Pending.
