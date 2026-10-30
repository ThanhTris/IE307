# GM-21 canonical history — scope and input plan

## Implementation accepted — 2026-10-30

Tâm requested implementation in this conversation. Reviewer Trí Pending. Branch
codex/gm-21-canonical-history is now based on main/PR143 e3f7058. Live start gate
READY_TO_CLAIM: GM06/07/18/20 Done, writer0035/GM20.4/schema0.12.0 and the supplied
GM07.B-supplement DTO/mapping are present on target. Earlier blocked preparation
below is historical, not the current gate.

Patch: forward0036/schema0.13.0/GM21.3; keep one result authority per pinned session.
Reuse GM20's real B-supplement history/result projection and scoped receipt writer,
including persisted Top3/R1 cohort and NO_CONSENSUS. No new command, DTO, writer,
participant identity storage, paging arguments, backfill or creation-flag rollout.
Optional participant identities stay absent because no reviewed retained identity
snapshot was delivered. Legacy get_history keeps its existing bounded cursor API;
the supplement history schema has no cursor, so do not silently add one.

Close the actual integration gaps: canonical payload purge on account scope revoke
and consent invalidation; common delete_history removes the authorized canonical
payload as well as its existing legacy behavior, retaining replay receipts; restore
the trusted v4 guard after the consent wrapper. Reject new audience links using
retention-detached consent while leaving existing retained links readable. Serialize
canonical history/audience writes on the existing reference epoch before row locks.
Retain every merged migration and all legacy result/consent/scoring behavior.

QA: reuse the owned GM20/GM03 Auth+REST setup/worker and baseline compatibility,
then actual create/start/finalize→history/result→catalogue change→cleanup→revoke/
delete/retry, independent scopes/late opt-in/20 members/outsider, no-consensus/R2,
detached-consent rejection/rollback and real two-session races. Validate the existing
GM07 request/response schemas, run full required regressions, capture source hashes
and clean only this QA namespace. No app DB reset/migration, external message,
Project status/approval, native/Android claim, automatic commit or push.

## Historical preparation — 2026-10-27

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), Pending. User accepted scope in
this conversation2026-10-27. Source: [comment issue82](https://github.com/ThanhTris/IE307/issues/82#issuecomment-6438979028).
Main1bf28d8 includes merged PR136/GM06.3/schema0.10.0. Branch
codex/gm-21-canonical-history starts from that target; no stacked PR or new API.

## Gate and independent preparation

Live start checker is BLOCKED: GM07, GM18 and GM20 are Needs Update, not Done.
The current checker and PROJECT_READINESS enforce Done-only dependencies; older
ADR/workflow passages still mention Needs Update baseline acceptance. This patch
does not edit the gate or treat that inconsistency as implementation authorization.
The issue permits parallel independent work only against an agreed interface;
GM20's canonical writer/authority mapping and the new shared DTO are not handed off.

This branch prepares a reviewable source map, producer input checklist and acceptance
matrix. No migration, route, public RPC, reader/writer adapter or mobile change is
implemented; no mock response/schema is presented as the agreed new contract.
Existing v2/v3/v4 routing and actual v4 dish_v4_private authority stay unchanged.
No code/runtime acceptance, Project approval/Done, commit/push or external comment.

## Implementation sequence once inputs arrive

1. Receive GM07/17 DTO/capability, ACL/participant projection and consent/retention
   rules; GM20 hands off writer commit/version and one authority per pinned session.
2. Review the result/history/reference mapping in MAPPING.md with Vinh and Trí.
   Resolve registry registration, locked projection, consent start pin, createdAt,
   score version nullability and participant display before dependent code.
3. Allocate a forward migration number against current main with the upstream
   owners. Never edit merged0032 or silently dual-write/backfill existing data.
4. Implement version-aware read/detail/delete/revoke/retention together, preserve
   legacy capability and retry tombstones; no reverse dependency GM20→GM21.
5. Run producer-driven SQL/JWT HTTP cases in TEST_MATRIX.md, record actual commit/
   versions/requests/responses/assertions and clean only owned QA resources.
6. GM28 consumes the reviewed reader DTO; mobile/device verification remains a
   consumer stage and does not block server tests or add a backward dependency.

Outputs of this preparation: MAPPING.md, TEST_MATRIX.md, INPUT_STATUS.json,
CHECKS.md/HANDOFF.md and live gate output. The detached-consent diagnostic is an
independent-model failure found during the earlier GM06 audit, not a public API
exploit or a completed fix. It is recorded as a producer/retention review input.
