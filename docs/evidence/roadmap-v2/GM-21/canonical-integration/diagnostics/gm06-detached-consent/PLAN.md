# GM06 consent-scope follow-up plan — 2026-10-27

Owner Tâm; reviewer Trí Pending. Baseline PR136/d433dfd, main79eb0b9.
No new reviewer comment;16 checks on d433dfd Pass. User asks to continue fixing.
Default scope is remaining independent-model correctness, not changing API routing
or architecture while clarification is pending. Existing v4 remains authoritative.

Investigate the retention boundary: after room cleanup a room-scoped consent has
room_id=NULL and retention_detached=true. It must keep authorizing its original
saved history, but must not become a reusable global consent for another room.
Add an actual SQL negative regression that first reproduces whether another new
history accepts that detached consent, then a narrow private insert guard if needed.
Do not change merged main migrations, public DTOs or actual v4 writer semantics.

Verification: red/green PostgreSQL on marker-owned QA DB; preserved old history
readback, correct global/same-room consent, cross-room and detached reuse rejection,
no invalid receipt left behind, revoke/delete/retry; rerun storage suite and fresh
v2/v4 HTTP compatibility. Required Python/repository/index/diff checks. New evidence
records exact sources and limits; no approval/Done, production/app DB modification,
new package/provider, automatic PR comment or API integration claim.
