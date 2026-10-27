# GM06.2 canonical storage checks

Owner Tâm; reviewer Trí, Pending. Uncommitted supplement on main a31f403.
Version/source hashes/clock/environment and exact counts: sql-results.json and
PATCH_MANIFEST.json. Fixtures synthetic; no production data or provider involved.

| Acceptance / trigger | Expected and actual evidence | State / limit |
| --- | --- | --- |
| New forward storage + FK/registry |0027 fresh install and populated legacy/v3 upgrade; exact catalogue release/hash; rejects dangling IDs/collision; source hashes verified | Pass SQL; no production apply |
| Locked result/card/Top3 | Descending scores, dense ties, winner included at rank1, bound from actual stored R1 cohort; UPDATE/replay cannot reroll; source cards stay fixed | Pass SQL; actual vote/eligible cutoff calculation belongs GM15/20 |
| NO_CONSENSUS and20 members | EMPTY_INTERSECTION R1/ALL_REMOVED R2 store NULL winner/empty podium;20 accepted,21 rejected, no legacy dish/winner fabricated | Pass SQL |
| Atomic result/history | Child membership/audience written only in parent's transaction; deferred roster fingerprint/count/cohort checks; UNIQUE receipt race persists one history | Pass SQL; producer command/outbox wiring Not run |
| History cleanup/consent | Real gm17 cleanup removes operational room/session and room preferences but retains canonical snapshot/registry + valid detached consent; revoke/expiry hides, purge/deletion keeps anti-replay receipt | Pass SQL; new public history APIs/participant identity DTO pending GM17/21 |
| Account/room preference privacy | Defaults stored separately, room copy does not change with account edits; version/lobby/member validation; no client/publisher/service-role schema/table/function access | Pass storage/default-deny; caller-owned RPC is producer scope Pending |
| Nullable price | Ignore missing timestamp; latest-null amount or newest timestamp tie returns NULL without fallback; preserve currency/unit/source null; no price/person conversion; locked result unchanged | Pass SQL; richer GM40 import adapter and GM07 wire mapping pending |
| Upgrade/rollback | Fresh and empty down/reapply, down rejects retained rows; restores previous cleanup body, legacy records/catalogue remain | Pass QA only; application backup/deployment Not run |
| Existing v3 API/worker/SQL |108 scenarios, including real loopback PostgREST JWT and original policy/parity/retention behavior | Pass v3-regression.json; synthetic JWT/users/data, not GoTrue login/Android/v4 |
| Existing GM06.1 schema | Original pgTAP, mappings, race/upgrade/rollback runner | legacy-schema-results.json; exact outcome in manifest |
| Full Python regression |594 tests,5 skips,21 failing mobile documentation subcases; same21 independently reproduced from pristine main | Fail, pre-existing; python-regression.txt + baseline-regression.json. Not a blanket regression Pass |
| Repository/index/diff | Offline docs/links/JSON/task indexes and whitespace | Logs in this folder; not approval |
| Live gates | GM03/04 baseline accepted; new supplement reviewed separately | start-gate.txt / merge-gate.txt; checker does not approve runtime |
| CI/new v4 producer/production/Android | Not executed from this uncommitted patch | Not run; no mock/legacy evidence substituted |

Storage schema AC is verified independently of future business API and policy work.
Migration includes a narrow retention bridge requiring Trí/GM17 review; unchanged
predecessor body retained by rename. Exact function/source comparisons and actual
cleanup assertions are in SQL report. No edits to previously merged migrations,
legacy core DTOs, package/config, catalogue bundle/importer, or policy-v3 calculation.
