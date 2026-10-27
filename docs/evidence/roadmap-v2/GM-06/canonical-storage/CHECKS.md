# GM06.3 — PR136 review checks

Owner Tâm, reviewer Trí (Pending), checked2026-10-27. Published head a7f54d8;
working-tree merge of main79eb0b9 plus review fixes, not yet committed/pushed.
Storage GM06.3 / migration0032 / schema0.10.0. Exact sources, clocks and environment
are in [manifest](PATCH_MANIFEST.json) and [current reports](review-fix-2026-10-27/README.md).

| Acceptance / trigger | Actual verification | State / limit |
| --- | --- | --- |
| Reviewer P1 migration collision | Published0027 fails against main with23505; fresh0032 has unique numeric version and distinct0.10.0 ledger; runtime0.9.0–0.9.2 retained | Pass actual SQL; no conflict suppression |
| Reviewer P2 NULL bypass | Published validators reproduce price=NULL, card=NULL and terminal accepted for price{}; fixed validators reject{}, every missing/wrong field, SQL NULL, bad nested pool/storage | Pass actual SQL; JSON null/full nullable metadata remain accepted |
| Independent storage constraints | Immutable locked cards/Top3,20/21 boundary, NO_CONSENSUS, registry/FK/hash/cohort, defaults/room copies, price selection, private grants, atomic audience/receipt races | Pass; not a business-policy calculation or API writer |
| Populated actual v4 upgrade | Existing public RPC creates DECIDED/group20 and NO_CONSENSUS before0032; result/history/preferences/consents and definitions compared after upgrade/down | Pass; dish_v4_private remains authority |
| Actual shared retention/revoke/delete/replay | Operational v4 room/session removed; retained history reads exact stored result; group revoke preserves personal history; terminal ACK cannot resurrect deleted history; writer guard restored | Pass SQL; existing v4 RPC used |
| Fresh v4 PostgREST HTTP | Separate fresh PostgreSQL/PostgREST, synthetic auth users/JWT, all migrations; HTTP assertions in isolated-http-results.json | Pass27 assertions (including140 pinned v2 parity vectors); not GoTrue signup or Android |
| Fresh/upgrade/down/reapply |196 assertions including retained-data rollback refusal and legacy preservation | Pass sql-results.json; QA only |
| Existing v3 SQL/worker/HTTP |108 cases, synthetic identities/data, real PostgREST/JWT | Pass v3-regression.json |
| Legacy history |47 real SQL cases incl consent/privacy/idempotency/cleanup | Pass legacy-history-results.json |
| Legacy schema |67 pgTAP assertions,2 schedule races,16 reference races | Pass legacy-schema-results.json |
| Python full regression |611 tests,5 existing skips | Pass python-regression.txt; old21 doc failures were fixed upstream |
| Repository/task indexes/whitespace | Required validators and git diff checks | Logs/manifest; not approval |
| Live gates | Fresh Project read, target79eb0b9, Done-only dependency rule | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW; not Trí approval |
| Full GM03 Auth+REST QA attempt | All migrations applied, strict loopback-binding guard stopped startup and cleaned owned project | Not completed, QA_HOST_BINDING_NOT_LOOPBACK; guard retained |
| Independent model API integration / production / device | No adapter, production deployment or device run | Not run/Pending; no completion claim |

The v4 runtime functions/storage and migrations0027..0031 are unchanged. Only the
existing shared cleanup entry point receives a documented wrapper; its prior body
is retained by rename. No app DB migration/reset/reconcile or real data publish.
The resolved CI keeps workflow_call, pinned actions, full TAP diagnostics/artifacts
and adds the canonical checks. Remote CI on the new revision awaits commit/push.
Historical GM06.2 reports are archived as previous-* in the dated review folder.
