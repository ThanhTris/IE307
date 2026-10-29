# GM18.2 dish-only API checks — 2026-10-29

Owner Tâm, reviewer Trí Pending. Branch codex/gm-18-dish-catalogue, base main40feb9b
+ uncommitted patch. Schema0.11.0/0033, contract dish-catalogue/roadmap-v2/GM-18.2;
GM07/PR138 baseline B remains separate. Exact hashes/environment: sql-http-results.json
and PATCH_MANIFEST.json. No production/application DB migration, publish or approval.

| AC/output | Expected / actual evidence | Result / limit |
| --- | --- | --- |
| Real draft import/readback |39 stable IDs, original source/hash/version preserved; rich labels/terms/flavor/temp; idempotent reimport and fault rollback; original release unchanged | Pass SQL/HTTP in sql-http-results.json; real draft, not verified data |
| Exact10–20 initial preview | Each count10..20 returns that many unique dishes;9/21/fraction/bool/null/string/huge rejected; no room/ballot writes | Pass actual HTTP; preview has no persisted round UUIDs |
| Meal eligibility/shortage | Real source counts14/23/7/1; dinner/snack return409 available/requested; unknown mealSlots excluded; location/coverage/hard filters rejected | Pass; no invented labels or expanded quota |
| Projection/price | Latest source time, UTC-equivalent ties and latest null; nullable metadata retained, B-compatible price hidden if unrepresentable; no unit conversion; source privacy | Pure projection9 tests + real HTTP/SQL schema checks |
| Soft preferences/privacy | Unknown cuisine/budget/unit/recent never removes candidates; explicit UNSUPPORTED; actual v4 defaults stay own-caller and room snapshots survive later default edits | Pass actual RPC; advanced preference/recent ranking not implemented, not required for core |
| Existing v4 production path | Rich release → real create/join/start/submit/finalize → same locked result after catalogue activation | Pass actual HTTP; existing runtime authority/routing unchanged |
| Auth/rate/schema | Missing/anonymous denied, fixed path/grants, no private helper grants, wrong versions/fields/types rejected;429; absent/oversized/duplicate-ID catalogue503 | Pass actual SQL/JWT HTTP; synthetic auth, not GoTrue login |
| Legacy eligibility parity |60 complete TS/SQL vectors + independently expected offering sets, existing kernel SQL assertions | Pass120 checks on fresh PostgreSQL; fixture data separate |
| V2/v4 compatibility |140 pinned v2 parity vectors plus actual v4 result/history/defaults/ACL/retention/delete/retry | Pass27 baseline harness assertions; no B-supplement producer claim |
| Down/reapply | New RPC/helpers/ledger removed/reapplied; enriched catalogue and existing v4 result remain | Pass disposable QA only |
| Existing pure domain |237 eligibility/decision/seeded tests | Pass domain-regression.txt |
| Python / repo / indexes / diff | Logs in this folder | Pass638 Python tests/5 skips, repo/index/diff; offline checks do not approve API |
| Start/merge gate | Live Project Done dependencies, target40feb9b | Logs; baseline readiness only |
| CI / app DB deploy / Android / Trí acceptance | Not executed/approved by this working-tree delivery | Not run/Pending; no mock/CI/native inference |

The inherited GM06 QA harness now accepts an optional internal exercise hook; its
normal CLI behavior is unchanged and the entire baseline still executes before
GM18 assertions. All network/DB/REST/credential resources are new and ownership-
checked, no host ports, no existing service credentials read. Actual source data
is test_demo/draft; positive larger pools and auth users/JWTs are synthetic. Reports
contain booleans/counts/hashes rather than tokens/raw votes/private identities.
