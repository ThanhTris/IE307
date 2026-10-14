# GM-21.1 — History/consent independent API and producer ports

2026-10-14. Owner Tâm, reviewer Trí, review Pending. Base main a33d5e8 (GM18
PR108). GM07.1 unchanged; schema0.2.0 + forward0021. GM20 finalize and GM19
room/start integration are separate work and are not claimed by these fixtures.

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
| record_result(result) | GM20 in its atomic finalize transaction after actual immutable result/round winner exist; reference_epoch first | Personal per opted-in user; group only all frozen members/scoped consents; count inserted |

Canonical hash: SHA256 of gm21-group-v1: plus sorted unique UUIDs separated by
commas. Client cannot provide it. recent_dishes checks both key and exact roster,
scoped consents/TTL, server clock, and never reads personal summaries for groups.
GM19 places returned IDs into existing GM18 input.recentDishIds and uses its own
room context.avoidRecent. GM18 keeps this a soft rank on eligible offerings; NO,
coverage/hours/unknown rules are unchanged. This handoff does not reimplement
create/lobby/start or finalize. Their real integration is Not run until upstream.
After start, recent_dishes returns the frozen snapshot; later withdrawal cannot
change the locked voting pool/result, and is excluded from future sessions.

record_result derives dish/variant identity from actual persisted winner and
copies the current catalogue name into the immutable summary. No current winner
or no consent -> no summary. Scoped consent.grantedAt <= actual finalizedAt,
current enabled/not revoked/unexpired, frozen historyConsent and any explicit
current global opt-out all apply. It accepts valid server clock_timestamp inside
the same outer statement. Completion receipts prevent producer retries from
recreating user-deleted/withdrawn rows or adding retrospective consent. Existing
history results are marked completed on migration; explicit deletes/withdrawals
also mark their result. Result IDs only, no ballots/context in receipts.

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

Integration ownership: the remaining adaptation of delivered GM19/20 transactions
is GM21 work after their real outputs are available. The port signatures above
do not add a dependency/AC to GM19/20 or block their completion on this task.
GM21 will receive those producers, wire its own callbacks/adapters and rerun real
create/lobby/start/finalize assertions before final completion.
