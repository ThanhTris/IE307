# GM-06 canonical storage supplement — plan

Owner Tâm; reviewer Trí (Pending). Accepted implementation request:2026-10-25.
Branch codex/gm-06-canonical-storage, target origin/main a31f403fbcdc4cfdb03e03fe77506ccdd9a4cbea.
Start gate live READY_TO_CLAIM; GM03 Needs Update baseline/GM04 Done.

Scope: new forward migration0027, private GM06.2 canonical terminal storage,
locked cards/podium/registry references, 2–20 member history without fake winner,
account defaults and per-room preference snapshots, nullable price observations
with latest-valid-timestamp selection. Preserve every existing migration and
v2/v3 decision/RPC definitions. Add a narrow retention wrapper plus reference/consent
protection hooks; preserve the old cleanup body by rename, pending GM17 review. No public RPC, grants, policy routing or automatic writer.
Existing dish_v3_private.catalogues is the catalogue authority, not public.dishes.

Contract B/GM07 remains a proposal (transport/history/cohort/nullable-price gaps).
Storage supplement is a producer interface pending Trí review, not a replacement
wire DTO or a deployed v4 policy. GM17/18/19/20/21/40 integrate the reviewed storage
with actual lifecycle/consent/ACL/terminal calculation/catalogue adapters later.

Test plan: owned disposable PostgreSQL17 only; all old migrations then0027,
fresh and populated upgrade, registry/catalogue/FK/hash/constraint failures,
immutable fixed podium/card, NO_CONSENSUS no winner, dense ranks and score bounds,
20/21 members, latest/null/tied price without fallback, preferences default deny,
room cleanup preserving history, consent/revoke/expiry/tombstone guards, rollback
without changing legacy data/functions then reapply, and baseline v3 regression.
Capture real expected/actual assertions, source hashes and cleanup. No DB reset,
no production deployment/data publish, no package/native/provider dependency.
