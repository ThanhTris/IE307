## Task và phạm vi

- Task: `tasks/backlog/GM-18.md`; roadmap-v2 GM-18, mã cũ GM-11.
- Owner: Tâm (@HoaiTam); reviewer: Trí (@ThanhTris).
- Tâm nhận cập nhật ngày29/10/2026; baseline food-v1 giữ nguyên, supplement GM18.2 theo GM-07/PR138 và ADR-019.
- Branch: `codex/gm-18-dish-catalogue` → `main`; không stacked.

Bổ sung API `get_dish_catalogue` và `preview_dish_pool`: preview trả đúng10–20 món unique theo bữa hoặc shortage `available/requested`, không cần quán/GPS/coverage. Projection opt-in giữ taxonomy ID/code/label/version, nullable metadata và giá mới nhất; dùng cùng catalogue authority và release suffix riêng, không ghi đè release cũ.

Ngoài scope: mobile/Android, đổi policy/writer/history v4, production migrate/publish. Preference/recent ranking nâng cao vẫn công khai `UNSUPPORTED`; không thêm công thức chưa được review.

## Start gate — trước viết phần độc lập

- [x] Đã chạy `python scripts/task_readiness.py --task GM-18 --base-ref origin/main`: READY_TO_CLAIM; start dependencies Done trên Project.
- [x] Owner nhận việc; scope/test plan và input version ghi tại `dish-only/PLAN.md`.
- [ ] Trí review revision hiện tại; dùng lại jsonschema pin có sẵn, không thêm package/provider/native.
- Input: GM06/schema0.10.0, GM07/PR138 B card/schema và B-supplement riêng, GM08/ADR014 test-data scope, GM17 ACL.
- File ownership: forward0033/down, projector/loader opt-in, RPC schema/runner/request suite/evidence và CI GM18.
- Phần mock/chờ: không dùng mock làm runtime evidence; Android và production chưa chạy. Không tự triển khai producer B-supplement hoặc recent ranking.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Dependency | Upstream | Project / checker29/10 | Artifact trên target |
| --- | --- | --- | --- |
| GM-06 | PR136 / `1bf28d8` | Done |0032/schema0.10.0 và helpers khớp |
| GM-07 | PR138 / `40feb9b` | Done | Baseline B và supplement schema được nhận riêng |
| GM-08 | Baseline PR103/110, ADR014 | Done | Importer/manifest/handoff baseline khớp |
| GM-17 | Baseline PR111 và retention hiện hành | Done | Auth/ACL/rate/retention artifacts khớp |

- [x] Target đã fetch: `origin/main` = `40feb9bf66f4bad67074601d8d49ffe587bfef93`.
- [x] `python scripts/task_readiness.py --task GM-18 --gate merge --base-ref origin/main`: READY_FOR_MERGE_REVIEW.
- [x] Migrations đã merge giữ nguyên; nhánh từ target trên, diff trong scope GM18; SQL/HTTP thật đã chạy.
- [ ] Người merge kiểm upstream commits/artifacts và CI/review tại revision mới; cập nhật nhánh/rerun nếu target thay đổi.
- Schema: forward0033 / ledger0.11.0 / `dish-catalogue/roadmap-v2/GM-18.2`. Không thay GM07.B routing hoặc authority `dish_v4_private`.
- Rollback: QA down chỉ bỏ RPC/helpers/ledger mới; giữ catalogue/results/history. Retained deployment cần plan backup/restore và review, không reset DB ứng dụng.

## AC và verification

| AC | Result | Evidence/môi trường | Mock/thật / giới hạn |
| --- | --- | --- | --- |
| Catalogue39 món draft, rich import/readback/replay/fault rollback | Pass | `dish-only/sql-http-results.json`, PostgreSQL17.11/macOS | Dữ liệu nguồn thật draft, không verified |
| Exact10..20/unique/invalid/shortage/unknown meal | Pass | Actual HTTP + schema assertions | Synthetic positive pools tách dataset thật; dinner7/snack1 vẫn shortage |
| Taxonomy/null/price latest/tie/no fallback/no unit conversion | Pass |9 projection tests + SQL/HTTP | Metadata nguồn giữ nguyên; B priceReference null nếu không biểu diễn được |
| Auth/privacy/rate/oversized/duplicate-ID/down/reapply | Pass | Actual SQL/PostgREST JWT | Synthetic auth; không GoTrue signup/device |
| V4 create/start/finalize/defaults/private room snapshots/locked result | Pass | Actual v4 RPC với rich catalogue | Không đổi writer/policy; catalogue đổi không tính lại kết quả |
| Legacy parity và regression | Pass |60 TS/SQL vectors,140 v2 vectors, v4 baseline |257 tổng assertions SQL/HTTP, gồm27 compatibility assertions |
| Domain/Python/repo/index/diff | Pass |237 domain tests;638 Python tests,5 skips; logs | Static/unit không thay review/Android |

- [x] `python scripts/validate_repository.py`
- [x] `python -m unittest discover -s tests -p "test_*.py"` —638 tests, OK,5 skips.
- [x] `python scripts/task_readiness.py --check-docs`
- [x] `git diff --check`
- API runner: `python scripts/gm18_dish_check.py --report /tmp/gm18-dish-results.json` —257 Pass; source SHA256 trong report/manifest.
- Environment: PostgreSQL/PostgREST mới, mạng internal, credential QA mới, không mở host port; tài nguyên được dọn.
- Food:39 món draft/test_demo; không sửa source/bundle/verified flags hoặc suy nguồn/quyền/freshness đã nghiệm thu.
- Native/Android/a11y: Not run/N/A cho BE/Data supplement; consumer kiểm riêng theo MOBILE_API_TEST_MATRIX.
- Evidence chạy trên main40feb9b + working-tree patch trước commit; source hashes khớp bản được publish. Remote CI cần kiểm trên revision PR mới.

## Review cuối — Trí

- [ ] Trí kiểm AC, cả hai gate, schema/API/projection/rollback và evidence tại revision PR hiện tại.
- [ ] Trí nghiệm thu/chuyển Done trên Project; AI không tự tick hoặc đổi trạng thái.

READY_FOR_MERGE_REVIEW không là quyền tự merge. CI/docs/fixture không thay nghiệm thu API/native hoặc deployment thật.

## Artifact bàn giao roadmap-v2

Track BE/Data, stage implementation. Contract/schema API thật, không có UI mới.

| Input task | Artifact/version | Trên target? | Smoke |
| --- | --- | --- | --- |
| GM06/07/08/17 |0032/0.10.0; PR138 B; test-data/ACL baseline | main40feb9b | Gate và source hashes khớp |
| Catalogue nguồn đã có | dataset1.1.0 /39 draft IDs | Có; không đổi source | Actual import/readback; taxonomy/price projection |

- Output:0033 + down, `import_gm18_catalogue.py`, API spec/schema, build/SQL-HTTP runner, request suite và CI artifact.
- Contract `dish-catalogue/roadmap-v2/GM-18.2`, projection GM18.2, ledger0.11.0; consumers GM19/20/24/25/27/40; GM21 giữ scope history riêng.
- HANDOFF.md: `docs/evidence/roadmap-v2/GM-18/dish-only/HANDOFF.md`.
- [x] Giữ source/catalogue authority và pinned legacy results; không dựng lại scaffold/contract upstream.
- [ ] Android/native consumer evidence giữ Not run, không suy từ SQL/HTTP.

## Output chạy được — UI / BE / Data

CHECKS.md: `docs/evidence/roadmap-v2/GM-18/dish-only/CHECKS.md`; exact source/environment tại PATCH_MANIFEST.json.

| Endpoint/field | Request/lệnh | Input → expected | Actual/evidence | Scope/result |
| --- | --- | --- | --- | --- |
| get_dish_catalogue | POST `/rest/v1/rpc/get_dish_catalogue` | Payload version GM18.2 →39 real draft cards, taxonomy/null/source version | SQL/HTTP report | Thật, Pass |
| preview_dish_pool | POST `/rest/v1/rpc/preview_dish_pool` | lunch20 →20 unique/available23; dinner10 →409 available7/requested10 | HTTP suite + report | Thật, Pass |
| Rich importer | `python3 supabase/seed/import_gm18_catalogue.py validate` | Valid source → opt-in suffix :gm18.2; existing release preserved | Reimport/fault/readback checks | QA SQL thật, Pass |
| Regression | `python3 scripts/gm18_dish_check.py --report /tmp/gm18.json` | Invalid/auth/price/privacy/legacy/v4/down |257 assertions Pass | Synthetic auth/data tách real draft |

- [x] API request suite: `supabase/tests/http/GM-18.http`; exact schema/errors/version trong GM18_DISH_CATALOGUE_API.md.
- [x] Data/FK/null/unit/version, valid/invalid and real SQL/HTTP; no secret/JWT/raw ballots/private source output.
- [ ] Production backup/reconcile/deploy, remote CI và final review Pending; không dùng local pass thay nghiệm thu.
