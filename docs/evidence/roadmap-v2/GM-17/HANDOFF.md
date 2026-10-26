# GM-17 — Handoff / schema0.2.0 / contract GM-17.1

Owner/reviewer Trí / ThanhTris, review Pending. Working tree on branch
codex/gm-17-access-retention, base4bb928e55c31dbc4dea185362a66063b65a1f4fd.
MANIFEST.json identifies uncommitted artifact hashes; CHECKS contains actual
results/limits. No commit/push/PR/Done or GitHub Project Status change performed.

## Inputs and output

GM-06 PR102 merge7060b8825ad72ee9442d8890719f82451d473c33, GM-16 PR106
mergef6f2fce9a7ba235892e94a5b92b97485008b95c6. Project Done gate checked live.
0001schema0.1.0 is immutable;0004 adds access + retention schema0.2.0. GM-06 mapping
still documents its baseline; ACCESS_MATRIX/ADR-015 describe changed FK/storage
paths. Food/core1.1.0 and mobile DTO/client contracts unchanged.

| Artifact | How to consume |
| --- | --- |
| supabase/migrations/0004_access_policies.sql | Apply after0001..0003, migration up --local; never edit applied upstream migrations |
| docs/architecture/ACCESS_MATRIX.md / ADR-015 | Column/row/role matrix, trusted guard signature/error/lock order, storage/retention supplement |
| supabase/tests/rls.sql / scripts/gm17_access_check.py | Marker injection into disposable real PostgreSQL; SQL claims not JWT evidence |
| scripts/gm17_http_check.mjs / gm17_http_fixture.py | Real GoTrue JWT + PostgREST assertions, random namespace/owned synthetic cleanup |
| scripts/gm17_retention.mjs | Local60second worker, --once or --cycles=N; Ctrl+C stops, no background installation |
| supabase/tests/http/GM-17.http / bruno/GM-17 | HTTP placeholders/expected statuses and Bruno20request collection/setup/cleanup README; Bru CLI4.2.1 execution evidence in BRUNO_CLI_CHECK.txt |

## Reproduce

Windows PowerShell at repository root, Node>=22.13, Docker Linux engine, Python
3.12+ with timezone data. Set GM17_PYTHON if default Python lacks tzdata; examples
use `$env:GM17_PYTHON` only after setting it to an executable on your machine.

```powershell
$env:PYTHONUTF8 = '1'
# Example: $env:GM17_PYTHON = 'C:/path/to/python.exe'
npm ci
npm run backend:start
node node_modules/supabase/dist/supabase.js migration up --local
python scripts/gm17_access_check.py --report .work/gm17-sql.json
python scripts/gm17_import_regression.py --report .work/gm17-import.json
node scripts/gm17_http_check.mjs
node scripts/gm17_retention.mjs --cycles=2
python scripts/validate_repository.py
python -m unittest discover -s tests -p 'test_*.py'
python scripts/task_readiness.py --check-docs
git diff --check
```

SQL checker creates/drops only a randomized gm17_check DB, copying auth.users DDL
without auth rows/credentials plus auth.uid definition. Import regression uses
upstream gm08_check DB. HTTP setup requires three distinct anonymous identities
with the random namespace metadata marker before any cleanup. SQL fixtures and
HTTP fixtures are synthetic, never real published seed. No db reset/volume removal.

For Bruno, run `node scripts/gm17_http_check.mjs --bruno-setup`, select
Local.runtime.private, and run the collection sequentially from Bruno desktop or
Bru CLI4.2.1, then run `node scripts/gm17_bruno_cleanup.mjs`. Existing setup must
be cleaned first. Local credential environments are ignored; never export them or
raw auth responses. The current run used Bru CLI4.2.1 and is recorded in
BRUNO_CLI_CHECK.txt; Android/mobile consumers remain outside this server test.

No automatic down migration: after operational rows have been purged they cannot
be recreated from identity references. Review/backup before shared deployment;
isolated SQL DB is the preferred destructive regression environment. Retention
worker on the real local app DB performs actual eligible TTL deletions.

## Consumer wiring and remaining tests

- GM-18/19/20/21/22/23: receive schema0.2.0 and matrix; business endpoint owner calls
  private require_room inside its transaction, never grant it as public RPC.
  ACK lookup precedes version, reference_epoch precedes room row locks. Join/
  discovery/pre-membership invite acceptance implement their own gate.
- GM-19/20: stable terminal_at via trigger; raw rows/results/ballots purged after
  cutoff. Do not expose roster consent/tie sets or treat host as ballot admin.
- GM-21: create minimal history snapshot with exact server roster/groupKey/scoped
  consent; read summary without joining purged live result/room. Revocation/delete
  must physically delete affected summaries within its endpoint transaction.
- GM-22/23: read own/pair safe surfaces; invitation expiry/pair/state and push token
  invalidation/event creation/retry still owned by their endpoints. Event/ACK refs
  are stable IDs, not permission to navigate a deleted room.
- GM-25/26/28/31: Android session transport → own/outsider/expired error/UI, no
  other ballots/history/private tokens; logout/identity cache cleanup. Not run here.

Phone setup: use existing GM-16 loopback forwarding `adb reverse tcp:54321 tcp:54321`
and API http://127.0.0.1:54321, separate from Metro8081. Remove forwarding with
`adb reverse --remove tcp:54321`. Alternatively trusted HTTPS backend; do not
configure LAN HTTP, bypass certificate checks, deploy/tunnel local backend or put
service_role in app. Record real device/runtime/build and revision in consumers.

Realtime stays disabled and no private base-table publication is present. Future
notifications carry ACL-protected minimal refetch hints; do not interpret this
static audit as a live websocket/device Pass. Local worker2cycles does not certify
a production scheduler; deployment/pilot must configure one and collect its own
evidence. Trí reviews final revision/AC, then decides Project Done/merge.

## v4 consent supplement — 2026-10-26 (local QA candidate)

For v4 schema 0.9.1, personal/group history choices are account-level settings with default opt-out. GM-21 owns the consent API and scoped projections; GM-17 continues to own access control, revocation/deletion and retention guarantees. At room start the server pins each enabled scope for each locked member; personal history is per consenting owner, while a group projection requires every roster member's group scope. Revocation before persistence removes the affected scope; post-start opt-in is not retroactive. Existing v2/v3 sessions and already-started v4 snapshots are not reinterpreted, and completed sessions are not backfilled. These rules are candidate requirements, not evidence of an approved deployment. Migration 0029 and schema 0.9.1 were applied only to the owned local QA project; see the ignored `review-results/dish-v4-qa-20261026/` report.
