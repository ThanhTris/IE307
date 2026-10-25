# GM06.2 canonical storage handoff

Owner Tâm (@HoaiTam); reviewer Trí (@ThanhTris), Pending. Requested2026-10-25.
Branch codex/gm-06-canonical-storage; base a31f403fbcdc4cfdb03e03fe77506ccdd9a4cbea.
This supplement is an uncommitted working-tree patch; source hashes and actual test
revision/environment are in sql-results.json/PATCH_MANIFEST.json. No commit/push,
Project state/approval, production migration, publish or app DB reconcile performed.
Legacy GM06.1 evidence outside this folder is historical and unchanged.

## Received input and delivered output

- GM03 local runner/config and GM04 food/core1.1.0 baseline; live Project gate
  accepts Done/Needs Update baseline. Baseline acceptance does not approve supplements.
- Main0026/schema0.8.0 dish_v3_private.catalogues and runtime source, GM17 registry,
  consent and retention chain, GM21 settings. Existing code/hash preserved except
  the explicitly documented retention wrapper/own protection hooks.
- Accepted product requirements in ADR019/020 and UI_BE_DATA_SYNC_HANDOFF_2026-10-25.
  GM07.B remains proposed; GM40 richer catalogue projection is not yet handed off.
- Migration0027 / schema0.9.0 / storageGM06.2; dictionary/interface in
  docs/data/GM06_CANONICAL_STORAGE.md; runner scripts/gm06_canonical_check.py;
  conservative QA-only down file outside migration directory. Existing CI schema
  workflow runs both baseline and new real SQL suite, no package/deployment change.

## Consumers and integration boundary

| Consumer | Available storage/artifact | Still owned by consumer |
| --- | --- | --- |
| GM07 | Closed SQL projection, version labels, nullable price observedAt and cohort count | Resolve proposed wire B nullable price/checkedAt mapping, history DTO/discriminator/version guards; do not serialize SQL rows directly |
| GM17 | FORCE RLS/default-deny, retained registry/consent/cleanup bridge, internal visibility predicate | Review wrapper/hooks, actual caller/consent/participant read ACL and production upgrade/retention verification |
| GM18/19 | Independent account defaults + per-room copies; pre-lock price selector and immutable cards | Owner-only APIs, default-to-room copy/version semantics, taxonomy labels, lock/lifecycle/preview/pool integration |
| GM15/20 | Atomic result/member storage, sorted dense podium/winner/cohort bounds | Actual R1 scoring/NO/REMOVE/eligible cutoff/parity, version-pinned producer and terminal room/history/outbox transaction; storage does not score ballots |
| GM21/23 | Same retained canonical result + consent-bound history/audience/receipts; nullable winner | Actual versioned summary/detail/event-reference APIs, participant projection, revoke/delete requests and live auth/ACL; notification carries reference only |
| GM40 | Existing immutable catalogue authority + optional price observation table | Source/taxonomy/artwork-rights and nullable-observation importer projection; no GM40 data/importer changed here |
| GM32 | Reproducible QA runner/results and baseline v3 regression | Deployed v4 API/data/security/race regression after real producers arrive |

No mobile screen/package, camera/Places/provider, actual data import or public API
is added. New HTTP/Android evidence is N/A for this data-schema delivery; v4 producer
HTTP integration is Not run, not implied by the baseline v3 HTTP regression.

## Reproduce and expected behavior

```sh
npm ci
npm run backend:start
python3 scripts/gm06_canonical_check.py --report /tmp/gm06-canonical-results.json
python3 scripts/gm06_schema_check.py --report /tmp/gm06-legacy-results.json
python3 scripts/dish_policy_sql_check.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-06 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

SQL expected: fresh/upgrade/down/reapply Pass; fixed1–3 podium, score/rank/source/FK
checks; NO_CONSENSUS no winner; 20/21 boundary; current-time consent visibility,
actual operational cleanup preserves valid history and detaches consent; delete/
revoke replay cannot restore history, concurrent recording has exactly one winner;
price latest-null/tied timestamp -> unknown; default/private room snapshots;
all roles denied direct access; legacy v3 definitions/worker/RPC behavior retained.
Reports use synthetic fixture assertions, no raw ballot/token/private seed output.

Full Python regression currently has21 pre-existing failed subcases in mobile task
**documentation**,5 existing skips. baseline-regression.json independently reproduces
the identical21 failures from a pristine archive of origin/main. They are not hidden
or fixed by changing mobile tasks under GM06. Repository/index/diff checks are separate.

## Upgrade / rollback / blockers

No main checkout pull or new ledger row proves a running application migrated.
Inspect ledger + definitions, obtain owner-reviewed backup/reconcile for any retained
DB, and apply through the project workflow. Runner creates template0 namespace-owned
DBs and reads only app auth DDL/introspection; drops only its own marker-verified DB.
No reset, migrate, seed or test identity is written into the app database.

Keep new writers/routes off until GM07/17/18/19/20/21/40 artifacts and review arrive.
For operational rollback retain canonical data and disable the future writer. QA down
refuses nonempty new storage/preferences/prices; after removing only QA rows it
restores old cleanup body/name, drops own schema/hooks/ledger and preserves unrelated
legacy data/catalogue/shared registry. Future downstream FKs must be removed/reviewed
before schema down. Storage test Pass is not full v4 release, policy acceptance,
production deploy, main merge or Trí approval.
