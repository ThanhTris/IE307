# GM06.3 — PR136 review handoff

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), Pending. Updated2026-10-27 for
[review136](https://github.com/ThanhTris/IE307/pull/136#issuecomment-6423340169).
Branch codex/gm-06-canonical-storage → main. Published head a7f54d8; merge target
79eb0b94c7ba39d2699d5d59d3898753674cc0be. Merge is resolved but uncommitted;
no push, Project/approval change, application migration/reconcile or publish.
[Checks](CHECKS.md), [manifest](PATCH_MANIFEST.json), [dated reports](review-fix-2026-10-27/README.md).

## Received inputs and delivered patch

- Live GM03/04 baseline gates use Done only; actual artifact/version on target checked.
- Existing main v4 migrations0027..0031, GM07.B RPC, dish_v4_private writer/result/
  history/defaults/room preferences, GM17 cleanup and GM21 consent settings.
- Published conflicting0027/0.9.0 is replaced before merge by0032/0.10.0/GM06.3.
  Main's applied migrations stay byte-identical; no ON CONFLICT ledger bypass.
- Strict boolean price/card/terminal/preference validation: null-safe exact keys,
  explicit SQL NULL rejection and IS TRUE checks; JSON null remains valid unknown.
- Narrow cleanup wrapper preserves the old body, handles independent references,
  enables the actual v4 guard only for trusted cleanup and restores its prior value.
- QA down0032 refuses retained independent data, removes only own objects/ledger and
  restores the prior cleanup body. No production down/backup/reconcile executed.
- Workflow conflict resolved preserving main workflow_call, pinned action SHAs,
  full TAP/diagnostics/artifact retention/ci-report and both SQL suites.

## Authority and consumer boundary

**The existing dish_v4_private model remains the actual v4 API authority.** Its
writer/results/history/defaults/preferences and events are not redirected, mirrored
or backfilled. GM06.3 adds an independent private SQL model with different IDs;
the0.10.0 storage row does not change GM07.B or runtime ledger0.9.0–0.9.2.
See [dictionary and authority map](../../../../data/GM06_CANONICAL_STORAGE.md).

The current main v4 producer is available and was exercised through its real SQL
RPC and HTTP. Integrating gm06_canonical still needs a separately reviewed ownership/
adapter plan across GM07/17/18/19/20/21/40: one authority, IDs/FKs, DTO/price mapping,
atomic writer/readers, consent/revoke/delete and pinned stored data. This patch
cannot be described as complete runtime synchronization or final GM06 acceptance.
GM32 receives reproducible compatibility reports; actual production/device evidence
remains separate. No new client grants, public API/provider/package or mobile UI.

## Reproduce

```sh
npm ci
npm run backend:start
python3 scripts/gm06_canonical_check.py --previous-source-ref a7f54d8e404a2d988d390fbd724938fea623e98b --report /tmp/gm06-canonical-results.json
python3 scripts/gm06_isolated_http_check.py --report /tmp/gm06-isolated-http-results.json
python3 scripts/dish_policy_sql_check.py
python3 scripts/gm21_history_check.py --report /tmp/gm06-legacy-history.json
python3 scripts/gm06_schema_check.py --report /tmp/gm06-legacy-results.json
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-06 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

The optional previous-source-ref reproduces the published bugs before the fix.
The SQL runner uses marker-owned disposable databases, reads only application auth
DDL/introspection and never writes app identities/data. HTTP QA uses new tmpfs PG,
new internal Docker network, local pinned images and newly generated credentials;
no existing service credential is read and no host port is exposed. JWTs/auth users
are synthetic; PostgREST authorization is real, GoTrue login is outside this check.
Both runners clean only their own verified resources and report booleans/hashes.

196 storage/upgrade assertions,108 v3 cases,47 legacy-history cases,67 legacy TAP
assertions plus18 races passed. Python611 tests passed with5 skips. 27 fresh SQL/HTTP assertions (including140 pinned v2 parity vectors) passed; exact sources are recorded in the dated reports. The previous21 Python
mobile-doc failures no longer reproduce after receiving upstream main fixes.
The full GM03 QA attempt stopped at QA_HOST_BINDING_NOT_LOOPBACK on this macOS
Docker setup; no guard was weakened and it is not an Auth QA pass.

## Review, deployment and remaining work

Trí reviews the current revision, retention wrapper, migration identity and explicit
unwired-model boundary. AI does not approve, mark Done or merge. Start/merge checker
results are baseline gates, not runtime acceptance. Remote CI awaits new commit.
Before any retained/shared database deployment inspect real ledger/definitions,
obtain reviewed backup/restore/reconcile and resolve draft objects; git pull/health
alone does not prove deployment. Keep v4 routing pinned and retain independent data
on operational rollback. A future adapter requires its own integration verification.
