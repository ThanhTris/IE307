# PR136 review evidence — 2026-10-27

Owner Tâm; reviewer Trí, Pending. Reviewed published head a7f54d8; tested working
merge of main79eb0b9 plus uncommitted fixes. No push or Project status change.
Current migration0032/storageGM06.3/schema0.10.0. Exact source hashes and check
clocks are in each JSON report and ../PATCH_MANIFEST.json.

| File | Current result / actual scope |
| --- | --- |
| sql-results.json |196 real SQL assertions: old23505/NULL-bypass reproduction, strict validators, independent model, populated actual v4 upgrade/down, cleanup/revoke/delete/replay |
| isolated-http-results.json |27 assertions (including140 pinned v2 parity vectors): fresh all19 migrations, migration/runtime ledger, actual v4 writer and HTTP readback/ACL/history/defaults/cleanup/revoke/delete/replay; synthetic auth/JWT |
| v3-regression.json |108 existing v3 SQL/domain/worker/real HTTP cases |
| legacy-history-results.json |47 legacy history/consent/privacy/idempotency/retention cases |
| legacy-schema-results.json |67 TAP assertions,2 schedule races and16 reference races, mappings/upgrade/down |
| python-regression.txt | Full Python suite; final exit/result in log and manifest |
| repository-check.txt / docs-check.txt / diff-check.txt | Repository/index/whitespace validation |
| start-gate.txt / merge-gate.txt | Project live2026-10-27, target79eb0b9; READY_TO_CLAIM / READY_FOR_MERGE_REVIEW |
| QA_ATTEMPTS.md | Full GM03 QA loopback-binding limitation and isolated HTTP environment boundary |
| PLAN.md | Review mapping, patch/test plan and ownership boundary |
| previous-* | Historical GM06.2 evidence before receiving current main; not current results |

All data/identities are synthetic. SQL runners use marker-owned disposable DBs;
HTTP runner creates its own PostgreSQL/PostgREST/internal network and credentials,
with no exposed host port and no existing service credential reuse. Cleanup is
ownership-checked. No raw votes/JWTs/seeds, real personal data or full private rows
are reported. GoTrue login, mobile/device, production migration/data and a writer
adapter from v4 to gm06_canonical remain outside the verified scope.

Existing v4 remains authoritative in dish_v4_private;0.10.0 is the independent
storage ledger only. Both gates are dependency checks, not review/approval/Done.
