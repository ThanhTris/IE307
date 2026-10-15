# GM-21.2 — History, consent and lifecycle integration

2026-10-15. Owner Tâm, reviewer Trí, review Pending. Target main 991de66
(includes GM19 PR112, GM20.3 PR115 and Expo fix PR116). GM07.1 unchanged;
schema0.6.0 via0021 +0024. Actual lifecycle/finalize checks use disposable DBs.

## Wire contract

- get_history(scope, cursor?): authenticated own personal or consent-valid member
  group summaries; newest finalizedAt/id first, <=50/page. cursor is last row.id
  from the same caller/scope, not a client groupKey. Bad/missing/foreign cursor is
  INVALID_INPUT; if cursor expires/deletes, refetch page1. No opaque nextCursor field
  was added to the existing GM07 array contract. GM31 keeps local cache <=50.
- update_history_consent(requestId, scope, consent): scope personal/group, consent
  JSON boolean (not string/null), opaque nonempty ASCII [A-Za-z0-9_-] requestId
  <=128 characters, compatible with GM07's req_* defaults and UUID custom IDs.
- delete_history(requestId, history_id): own personal or group where caller was
  a member. Unknown/another owner's UUID is a successful no-op, not an existence
  oracle. Group deletion affects that group summary; personal peers/results stay.

Success reads {ok:true,data:[HistoryItem]}; writes {ok:true,requestId,data:null}.
Error includes top-level messageKey plus nested error.messageKey and requestId
when applicable. HTTP401 AUTH_REQUIRED;400 INVALID_INPUT;409 REQUEST_ID_REUSED;
429 RATE_LIMITED;503 UNKNOWN_ERROR only for legacy valid histories without an
actual presentation snapshot. Validation never invents room codes/IDs or silently
hides a valid legacy row. Missing/forged JWT is rejected by PostgREST before SQL.
Rate limit is60/minute per user/endpoint; exact ACK retries do not consume it.

RequestId stays unchanged on wire. Storage UUID is first128 bits of SHA256 over
server caller/operation/opaque ID. Existing public.idempotency stores SHA256 of
canonical JSON payload and the fixed internal ACK reference shape, expires24h.
Lookup precedes business changes, scope guards/locks serialize with reference_epoch;
same ID/body returns identical void ACK without reapplying; another payload409.
Client must not blindly replay old writes beyond ACK TTL; expired live ACK400.
No userId, roster, groupKey, winner, location or client clock is accepted.

## Consent semantics

Settings default absent/disabled. Existing explicit scoped consents remain valid;
no implicit permission is created from a user identity, room membership or history.
Global personal/group setting controls future prepared consents. Room member
historyConsent=false still prevents prepare; frozen room consentSnapshot controls
recording. A global change applies to caller's active lobbies, synchronizes its
history flag, invalidates evaluated/cached/ready state and bumps context/version
when there is state to invalidate. All affected ready flags reset conservatively.

Withdrawal physically deletes the relevant summaries, revokes existing scoped
consents (including detached metadata), preserves other users' personal history
and never edits a decided result/roster/ballot. Group withdrawal does not expose who
withdrew. Opt-in does not recreate old rows or grant consent after start. A revoked
scoped consent may be renewed only in LOBBY by the trusted prepare hook and then
has a new server grantedAt; it cannot validate an older finalized meal.

## Trusted transaction ports — not public RPCs

All gm21_private helpers/tables/schema deny anon/authenticated/service_role.
Public RPC wrappers are trusted-owner SECURITY DEFINER with pg_catalog-only path
and qualified names; only authenticated has execute, no new app table writes.
Lock order is GM17/GM06 reference_epoch before room locks; do not invert it.

| Port | Consumer requirement | Output |
| --- | --- | --- |
| prepare_consents(room, expected_version) | GM19, current member, LOBBY guard; explicit global + room opt-in; no active/terminal grants | Creates/renews current scoped consents, never retrospective |
| recent_dishes(room) | GM19 server identity; LOBBY derives active canonical roster and all fresh scoped group consents | <=3 finalized results in30days from exactly the same sorted roster/group; unknown/partial ->[] |
| freeze_recent(room, expected_version) | GM19 LOBBY lock, call before transition in same transaction after prepare/revalidation | Stores roster/hash/<=3IDs/contextVersion; returns IDs |
| gm20_private.write_history(room,result) | Existing GM20 atomic finalize call, extended by0024 | Pinned winner card, shortest consent expiry, completion receipt; per-user personal/all-member group |
| record_result(result) | Legacy0021 synthetic fixture helper; not called by production GM20 | Historical port regression only; not the authoritative writer |

Canonical hash: SHA256 of gm21-group-v1: plus sorted unique UUIDs separated by
commas. Client cannot provide it. recent_dishes checks both key and exact roster,
scoped consents/TTL, server clock, and never reads personal summaries for groups.
GM19 places returned IDs into existing GM18 input.recentDishIds and uses its own
room context.avoidRecent. GM18 keeps this a soft rank on eligible offerings; NO,
coverage/hours/unknown rules are unchanged. 0024 wraps the delivered GM19 pool port and uses its existing GM18 kernel;
create (no roster yet) has no recents. Lobby/join/preferences/context/start use
server-derived IDs. A before-state transition trigger freezes the exact roster/
recent IDs/contextVersion in the same start transaction. All room-consent/roster
changes invalidate ready/version; global changes/deletes refresh active lobby pools.
The original GM19 and GM20 migrations remain unchanged.
After start, recent_dishes returns the frozen snapshot; later withdrawal cannot
change the locked voting pool/result, and is excluded from future sessions.

GM20's existing atomic writer is replaced forward in0024, preserving pinned card
metadata from gm19_private.pool_snapshots and TTL=min(finalizedAt+30days, relevant
consent expiries). It checks frozen opt-in, scoped consent granted before finalize,
current revocation/expiry and explicit global opt-out. Detached retained consents
are never interpreted as global permissions. A completion receipt is written
inside the same transaction, including no-history outcomes. Retry/delete/opt-in
cannot add retrospective summaries. History failure rolls back the final ballot,
result, event and receipt together. The original0021 record_result helper remains
private only for legacy fixture regression; production never delegates to it.

## Storage/retention supplement

0021 does not rewrite merged0001..0005/0018. One physical correction is needed
for ADR015: consents_unique_1 keeps (user, nonnull room, scope) uniqueness while
allowing multiple room-null retention_detached consent IDs for separate meals.
An additional partial unique index preserves one active global (room-null,
non-detached) row per user/scope. Existing room-scoped ON CONFLICT ON CONSTRAINT
consents_unique_1 remains supported. Do not upsert detached metadata or coalesce
multiple historical consent IDs into a live global grant. Global settings here
are private and do not collide with detached public consent rows.

Private presentations keep only history_id, authentic room UUID/code, memberCount;
no FK to operational room, no roster/GPS/anchor/mood/ballot/artwork. Captured at
history insert while parents exist, backfilled only from existing real parents,
cascades when history is deleted/expired. This satisfies GM07 HistoryItem after
GM17 purges operational state after24h without keeping that state for30days.

Private recent snapshots cascade with room deletion. Completion receipts expire
at finalizedAt+30days; windows expire1minute. Existing GM17 cleanup issues DELETE
on idempotency every cycle, whose new GM21 statement trigger purges expired own
metadata even when no ACK rows were deleted. Normal RPCs also prune expired own
metadata. No new service/scheduler is installed; operator must run the existing
reviewed GM17 worker continuously for physical retention on a deployed environment.

Rollback: first stop consumers/revoke the three public API EXECUTE grants.
Full down migration is not automatic: reverting null uniqueness cannot represent
multiple retained meals without data loss. Preserve summaries/consents and use a
reviewed forward migration/backup, as with ADR015. Do not drop history or reset DB
just to restore the old constraint.

## Test and consumer scope

scripts/gm21_history_check.py: disposable PG, synthetic data, SQL claims only.
scripts/gm21_http_check.mjs: real GoTrue guest JWT + disposable PostgREST + actual
GM07 client/guards/network. Synthetic persisted results test trusted port behavior;
they are not GM20 finalize integration. No real publication/data promotion.
GM25/28/31 receive history/consent/delete/TTL/auth/cursor and cache<=50 cases;
Android app→API→UI is their integration work and remains Not run here.

scripts/gm21_lifecycle_check.mjs exercises actual create/join/preferences/ready/
start/submit/finalize/history via real JWTs, PostgREST and the unchanged GM07 client:
default/partial/full consent, replay/delete, pinned name/TTL, <=3 matching recents,
eligible set/rank port parity, frozen start, withdrawal/reopt-in, roster/ready,
detached consent exclusion and transaction rollback. Ten scenario groups Pass.
Positive food records are synthetic; actual HTTP/SQL execution is real. No publish.

0024 renames the original private pool implementation to pool_without_history and
keeps the original three-argument pool_for_room signature for upstream callers.
The wrapper derives recents itself; no caller can inject history IDs. Missing
catalogue version `unavailable` preserves the existing room's FK-backed version
with an empty pool (or create sentinel0.0.0); no dish/coverage is invented.
Empty initial rooms preserve the initial membership version rule; a materialized
lobby pool counts as evaluated state for consent invalidation even before ready.
Do not deploy0024 without0021/0019/0023. A dirty app migration ledger needs operator
reconciliation/backup review; these tests never reset or reconcile that database.
