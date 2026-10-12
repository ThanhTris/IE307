# GM-18 — Checks phần độc lập

Ngày 2026-10-12; base 9188c736def7e125266f8cce2314b9f1f5c31b81 + working-tree patch.
Node 26.0.0 / macOS, PostgreSQL 17 local GM-03; Python runner stdlib 3.13,
Python regression bundled runtime. Contract GM-07.1 / GM-18.1 / food 1.1.0 / schema 0.1.0.
Source hash và result cuối được ghi trong sql-results.json/PATCH_MANIFEST.json.
Review Pending; không tự Approved/Done hoặc claim public RPC/device Pass.

## Kiểm đã chạy

| Phép kiểm | Expected / actual | Kết quả / artifact |
| --- | --- | --- |
| Eligibility domain | 68/68, 0 skip | Pass; domain-regression.txt (gộp decision: 237/237) |
| SQL/private permissions/parity/typed DB | 139/139 assertions; 60 cases (42 gốc + 18 bổ sung) | Pass; sql-results.json/sql-run.txt |
| Mobile typecheck/lint/Jest/architecture | 288/288 tests; 4 warnings baseline, 0 errors | Pass; mobile-check.txt |
| Full Python | 544/544 tests, 0 skip | Pass; python-regression.txt |
| Actual draft | 21 venues / 18 dishes / 190 offerings; zero eligible choices | Pass rejection/query; sql-results.json actualDraft |
| Repo/docs/diff | validator, indexes và whitespace | Pass; repository-check.txt/docs-freshness.txt/PATCH_MANIFEST.json |

All 60 fixture outputs compare exact complete TS/SQL values, including ordered pool,
profiles/prices/unit/null, reason sets, metadata and offering refs. Original expected
offering sets are retained and checked independently. Four DST cases cover both
fall-back folds and spring-forward before/after gap in America/New_York.
Winner filtering before cap checks rank-nine winner. Physical fixture keeps its
simulation flag; production mode rejects it. Actual draft queries keep every row
and version unchanged. Runner dropped its process-created DB after the checks.

Tested actual bundle SHA256:
0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02.
No publish performed. Original fixtures, verified manifest and migrations 0001–0003
remain byte-identical to the base revision. Source hashes are captured before run
and checked unchanged at the end, so a mid-run code change cannot be marked Pass.

Lệnh: node --test mobile/tests/eligibility.test.mjs; scripts/gm18_eligibility_check.py;
mobile npm run check; Python unittest full; validate_repository/task_readiness --check-docs/diff.

Mobile check lần đầu có 1 timeout shell 5000 ms (287/288 tests); không sửa test,
không tăng timeout. Lần chạy lại giữ nguyên ngưỡng đã Pass 288/288. Xem
[output đầu](mobile-first-run.txt), [output chạy lại trước chốt](mobile-rerun-before-final.txt)
và mobile-check.txt cho revision cuối. Typecheck/lint/architecture kiểm riêng;
4 lint warnings baseline ở GM-07 contracts/index, không có error.

## AC và giới hạn

- Coverage/radius, source freshness/unknown, lịch/ngoại lệ/timezone/DST/overnight/
  last order, meal slot, sold-out/paused và expired override: expected fixture
  sets độc lập, không dùng algorithm để sửa expected.
- <=8 unique, category representation, budget/temperature/flavor/recent mềm,
  price/unit/null, một representative offering/card, deterministic seed/order.
- Complete TS/SQL parity trên cùng fixture, typed DB snapshot/preview,
  winner refetch không đổi winner và query không sửa row/version.
- Actual bundle GM-08 draft 0.4.1 được nạp trực tiếp/query riêng; không giả verified.
- Private schema/functions deny anon/authenticated/service_role; không security
  definer hoặc cấp quyền mới cho app. Scratch DB tự cleanup; giữ unrelated sentinel.

Merge gate live lúc 13:34 UTC+7 ngày 2026-10-12: BLOCKED GM-17 (Todo),
start gate vẫn đạt. Xem [merge-gate.txt](merge-gate.txt).

Not run/blocker trước nghiệm thu toàn bộ GM-18: public RPC/auth/rate limit và
member/result ACL sau GM-17; chốt radius/time horizon và projection theo GM-07;
positive query dataset verified (manifest hiện 0); Android/API/device cases theo
ma trận và HANDOFF. CI workflow đã thêm, revision hiện chưa push/chạy remote.
