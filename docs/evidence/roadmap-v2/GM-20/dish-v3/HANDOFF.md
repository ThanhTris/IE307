# Data/BE supplement — ADR-019

Scope owner instruction 2026-10-22: implement/check **Data and BE now; FE later**. No screen/client/package/native changes in this patch. Domain source remains in the shared pure domain folder; it is backend parity code, not a mounted UI.

Policy: dish-decision-v3; wire: dish-session-v3/ADR-019; schema: 0.8.0 / migration 0026. Baseline main d8245a02c85d5b3bc4888a826589e99c1dc58a6d. Legacy decision-v2 unchanged.

## API

POST /rest/v1/rpc/dish_session with authenticated JWT and JSON:

```json
{"command":"create","payload":{"requestId":"unique-stable-id","displayName":"Host","dishCount":15,"mealSlot":"dinner","cuisineIds":[],"categoryIds":[]}}
```

Commands: create, join, snapshot, start, submit, waiting, finalize, cancel, leave. See the request suite. Envelope: {ok:true,data:snapshot} or {ok:false,error:{messageKey,details}}. Business errors use this new envelope; clients must assert ok/body, not only HTTP 200. Auth/transport failures may use HTTP 401/403.

create: exact integer count 10–20, mealSlot required; optional UUID cuisineIds/categoryIds filter within metadata. Empty/unknown meal labels do not match all meals. No location/venue input. Missing catalogue, insufficient filtered data or inactive worker rejects create; no count reduction/filter relaxation.

join: code + displayName, max20, same identity rejoin does not duplicate. start: host, expectedVersion, at least two members, locks roster/pool without ready.

submit: roomId, round, poolVersion, complete votes object keyed dishId. Round1 WANT/OK/NO; round2 KEEP/REMOVE with min(3,floor((N-1)/2)) removals. expectedVersion is not a gate for per-user ballot/waiting: round+poolVersion scope is authoritative so peers do not invalidate one another's ballot on the global version. Draft/per-dish input is not sent through this endpoint.

waiting: separate signal after successful complete submission and entering the waiting screen. First such signal starts 60s for that round; remount/retry does not extend. If all members have entered waiting, finish early. Host finalize is explicit with expectedVersion and at least one complete ballot. Missing participants never contribute OK/KEEP or score.

Result: immutable resultId/winner/reason/tier/round/time. Only own ballot is projected; no matrices, counts of WANT/NO, scores or tie sets. Progress count is aggregate submissions. PERFECT means every received complete round-one ballot WANT, not proof that every roster member voted. Reconnect reads snapshot; round2 still open accepts a member who missed round1; NO from round1 never returns. Terminal is read-only.

All writes use stable requestId for exact replay within 24h; altered payload reuse rejects. A replay ACK is a historical receipt; read snapshot for current state. snapshot reconciles elapsed deadlines before returning. Late-round requests cannot mutate the new round.

## Data boundary / activation

This PR supplies private runtime tables and their constraints, not a replacement for the offline validator/importer of GM-40. Dataset producer remains GM-40 / PR129. Private catalogue rows contain stable dish IDs/names plus mealSlots/cuisineIds/categoryIds, immutable release id/source SHA/cards/test flag; explicit active flag, default inactive. Sessions freeze selected cards/source hash. No quán/offering/schedule/anchor FK in the new profile. Public rooms/member identities and legacy data remain; place/dataset columns are nullable only for the new policy, guarded for legacy.

No real bundle is activated by this migration or suite. Full GM-40 import/readback/reimport/source validation and its two open validator defects still need completion/review before handing over the real release. No production publish approval is implied. Do not hand-edit an active source hash, invent tags or relabel draft data as published. Tests use new synthetic namespace/20 cards and testData=true.

Snapshot/public create of this version uses a separate RPC; legacy clients keep their existing entrypoints. FE DTO/screens, social/invite/history consumers and full Android journey are downstream work. This server patch does not claim those integrations are complete; legacy history/snapshots remain covered by their existing contracts.

## Worker and deployment

Migration is append-only; never apply it to a running app DB merely because git pulled. Check ledger/definitions, backup and reconcile any draft objects first. To upgrade an intended local DB, use the team's reviewed migration process. **No app database was migrated during verification.**

After explicit migration + reviewed catalogue load, run:

```sh
python scripts/dish_policy_worker.py
```

The local-only guard verifies the existing Supabase PostgreSQL17/config; worker ticks every second and never resets or migrates. create/start require a heartbeat newer than15s. Existing rooms can also reconcile on reads. For hosted deployment, a reviewed server job calls dish_v3_private.tick() every second; postgres-only privilege, never put a privileged key in mobile. [Supabase Cron supports second intervals](https://supabase.com/docs/guides/cron/quickstart). Job deployment and monitoring on the target remain an operator step, not a side effect of tests.

Worker preflight checks schema 0.8.0, hashes deployed function bodies against this migration (LF/CRLF normalized), SECURITY DEFINER and fixed search_path. It blocks draft definitions outside the expected source. tick also runs existing dependency-aware retention once per minute, preserving cleanup of legacy and new rooms/private ballots.

## Checks

```sh
node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs mobile/tests/dishPolicy.test.mjs
python scripts/dish_policy_sql_check.py
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
```

The SQL suite creates an owned disposable DB from template0, applies all migrations, uses signed synthetic local JWTs over actual loopback PostgREST, runs a separate timeout worker thread, verifies retention, then stops only its REST container and drops only its marker-verified DB. It never changes app data or logs credentials. These are API/SQL checks, not GoTrue UI or phone tests.

Downgrade: disable entry into the new policy and its worker only after draining active new rooms; retain rows for existing snapshots. Reverting the migration is not supported as a blind DROP/reset. Forward repair must preserve data/legacy FKs and permissions.
