# GM19.2 — settings correction handoff

Implementation requested by Vinh on2026-10-29. Owner/reviewer remain Trí/ThanhTris;
this package is for review, not Approved/Done. Stack: GM-15 PR140 commit237e5f7,
whose base isa6e89fc. Merge140 first, retarget this PR to refreshed main, recheck
migration numbering and merge gate, then review GM-19. No GM-15 policy edits.

## Contract and scope

Public baseline stays `dish-session-v4/roadmap-v2/GM-07.B` and its pinned schema.
Internal supplement is `dish-session-v4/roadmap-v2/GM-19.2`, schema0.11.1;
[0034](../../../../../supabase/migrations/0034_gm19_settings_stability.sql) replaces
only the private v4 dispatcher. Its other branches are byte-identical to0027.
Public routing, v2/v3 and consent/waiting/submit/finalize/history logic stay pinned.
This does not switch GM-20 result authority to canonical storage0032.

- Active nonhost member:403 NOT_HOST; outsider:403 NOT_MEMBER. Settings/pool/
  room version/session are unchanged. Existing quota/reference-epoch bookkeeping
  remains shared; the assertion concerns room/session state, not rate counters.
- Accepted new request, including no-op/time-only: room version increments once.
  Identical retry reads the old ACK before version/state checks; changed payload
  under the same requestId is409 REQUEST_ID_REUSED. No artificial ACK for failures.
- Count/meal edits select from the room's pinned catalogue with its pinned seed,
  independent of intervening time/no-op room-version increments. Current preference
  ranking remains UNSUPPORTED. Do not interpret changing active release as rebinding
  an existing room or activating a draft catalogue in production.
- Compare the complete proposed cards keyed by dish ID, excluding roundDishId and
  order. If identical, keep original cards/order/row IDs/poolVersion. Otherwise
  increment poolVersion once and preserve exact requested count. DesiredAt edits
  never select another pool; shortage leaves room/session untouched.
- Existing reference_epoch→room→session locking/ACK order remains. A concurrent
  same-version pair has one accepted mutation and one VERSION_CONFLICT; duplicated
  attempts receive one persisted ACK. Once started, fresh edits are ROOM_LOCKED.

## Reproduce real HTTP assertions

Node24, Python3.12 with existing scripts/ci-requirements.txt, Docker Linux engine.
Use the checked-in package-lock.json; npm ci installs existing tooling only.

```sh
npm ci
python scripts/dish_v4_ci.py run
```

The runner creates a unique `ie307-dish-v4-qa-...` project on ports54361/54362,
checks exact project/container/workdir labels and owned marker, applies all current
migrations and checks ledger, imports the real39-dish test/demo release, switches
to a separate synthetic20-dish release for positive cases, starts the owned worker,
calls real GoTrue guest JWTs/PostgREST RPCs, validates baseline schema and cleans
only the new project. It refuses occupied QA ports and never resets the app DB.
The real shortage fixture and synthetic positive cases are not production approval.

On Docker Desktop where CLI publishes wildcard interfaces, the existing CI runner
requires this explicit local option (all calls still use127.0.0.1):

```sh
GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1 \
GM_V4_PYTHON=/absolute/path/to/python \
GM_V4_REPORT_PATH=.work/ci/gm19-settings-http.json \
python scripts/dish_v4_ci.py run
```

Do not set GITHUB_ACTIONS locally to bypass binding checks. The stricter GM-03
qa:start runner rejected such a binding and safely cleaned its own project during
preparation; no guard was relaxed. This run used the pre-existing explicit CI
opt-in. Use your platform's environment variable syntax on Windows.

[HTTP examples](../../../../../supabase/tests/http/GM-19-settings-v4.http) contain
only placeholders; copy each accepted response's version into the next attempt.
The automated suite includes actual `11.0` numeric wire encoding and rejects10.5.
It covers new no-op/time-only/offset/null attempts, same-content meal edits, pinned
catalogue/seed, shortage, private execute ACL, retry/reuse/stale/locked and races.
Existing v4 waiting/quorum/timeout/Top3/history/consent/20-member tests also run.

Runtime reports are `.work/ci/dish-v4-ci-report.json` and the configured HTTP path.
These contain synthetic assertions and hashes, not credentials. Private CLI status
and guest JWTs stay process-local. Sanitized final copies are in this evidence
folder; [CHECKS](CHECKS.md) records actual counts and limitations. If interrupted,
use `python scripts/dish_v4_ci.py cleanup` for its recorded owned project; do not
stop/reset the application's Supabase project.

## Deployment / recovery / consumers

No application DB was migrated. Before applying on an integration target, Trí
checks migration ledger, definitions, version/hash and numbering against fresh
main; run migration up only under the target's deployment process. The migration
is transactional and performs no room/session data rewrite. Do not edit/delete a
merged migration or ledger to downgrade. Reverting to the old dispatcher restores
the known nonhost privilege bug, so any shared-environment reversal needs a reviewed
forward patch that keeps the host guard. Disposable QA recovery is owned cleanup.

GM-20 receives stable settings/poolVersion, original row IDs for equivalent edits,
ACK/version/race expectations and the unchanged B wire. Its authority/ID/FK mapping,
writer, SQL/domain parity and new supplement metadata remain its own task. GM-25
and GM-32 receive consumer/retry/error/device cases; HTTP/SQL here does not prove
Android integration, Figma, native or production acceptance. Project Done and
review are Trí's decisions; neither this PR nor gate output changes their status.
