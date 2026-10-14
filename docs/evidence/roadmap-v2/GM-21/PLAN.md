# GM-21 — Independent history/consent implementation plan

2026-10-14. Owner HoaiTam/Tâm, reviewer ThanhTris/Trí (Pending).
User explicitly requested GM-21. Branch codex/gm-21-history-consent from
origin/main a33d5e85f1aeb7c7bda02310e02880a3af5e77da (GM18 PR108 merged).
Start gate checked live 2026-10-14T03:53:46Z: READY_TO_CLAIM, GM06/07/18 Done.
Schema0.2.0, food/core1.1.0, GM07.1, GM18.1, new GM21.1. GM20 still merge input.

Read task GM21, CONTEXT_HISTORY_SPEC, IDENTITY_PRIVACY_SPEC, ROOM_SPEC,
ACCESS_MATRIX and ADR015/014. Frozen migrations0001..0005/0018, GM07 client/DTO,
GM18 kernel/fixtures and package/lockfiles remain unchanged. No provider/package.

Scope:
- 0021_history.sql adds authenticated get_history/update_history_consent/delete_history,
  private settings/limits and minimal display projection, using existing public
  histories/consents/idempotency. auth.uid, explicit validation, stable cursor,
  50/page, 30day TTL, same operation/requestId/hash ACK before mutation.
- Personal opt-out/delete cannot delete other users' personal rows. Group withdrawal
  deletes affected group summaries, not results; no identity/reason of withdrawal
  exposed. Default no consent, no automatic retrospective opt-in.
- Private trusted ports derive canonical sorted roster hash; recent<=3 within30days,
  all scoped consents, rank only already eligible food. Prepare/freeze/record hooks
  receive server room/result identities, never client groupKey/roster/GPS/history.
- Lobby consent/roster/history changes invalidate recent state/reset ready and bump
  context/version under GM17 reference-epoch-before-room locking. Started snapshots
  and decision remain immutable. GM19/20 must call hooks in their own transactions.
- GM07 HistoryItem requires roomId/code after operational24h cleanup. Keep minimal
  private display snapshot (room UUID/code/member count) linked only to history,
  cascade/TTL with it; no live-room FK, ballot/GPS/anchor/mood/token. Backfill only
  from actual live parents; missing legacy presentation fails closed, never fake.

Test plan: guarded disposable PG17 applying exact migrations; synthetic finalized
and lobby scenarios, caller/outsider, scoped consent/partial/withdraw/re-opt-in,
correct group/recent limit/window, pagination/TTL/delete, ACK/hash conflict/concurrent
retry, roster/ready/frozen snapshot, actual retention cleanup, safe projections,
private grants. HTTP real guest JWT/PostgREST/GM07 client against isolated DB,
no real publish or mock finalize claim. Current GM20 finalization integration and
Android GM25/28/31 are explicitly Not run/handoff; do not recreate their API.

Run repo/Python/mobile regression, index/diff checks. Evidence in this folder.
Do not self-review, mark Done, commit/push or edit Project. Trí reviews revision.

Implementation supplement: GM07 opaque req_* IDs are mapped to private UUID ACK
storage by SHA256. Minimal presentations plus completion receipts prevent missing
display after retention and deleted-summary resurrection. Detached public consent
uniqueness is corrected forward in0021 for multiple retained meals; no historical
consent ID is merged/regranted. Existing retention worker purges own metadata via
an idempotency DELETE statement hook; no extra service/provider. Scope/storage
delta is for Trí review, not self approval. Actual ports are independently tested;
GM19/20 wiring remains Not run.
