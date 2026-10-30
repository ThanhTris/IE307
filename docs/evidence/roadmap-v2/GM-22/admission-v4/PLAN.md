# GM-22.2 — Room invitation admission supplement

Owner/reviewer: Trí / ThanhTris. Public task contract remains
`food-v1/roadmap-v2/GM-22.1`; this forward-only supplement is
`food-v1/roadmap-v2/GM-22.2`.

## Baseline and scope

- Received `origin/main` revision `e3f7058525da14c3b147fc909511cef7c803ee7c`.
- Dedicated branch: `codex/gm-22-admission-v4`; the pre-existing GM-07 worktree
  is kept separate.
- Starting gate: `READY_TO_CLAIM` for GM-22 on that revision.
- Upstream artifacts: GM-19/20 migrations through `0035`, schema `0.12.0`,
  GM-07.B and B-supplement dispatch, GM-19 shared v4 admission helper, and the
  version-pinned v2/v3 admission paths.
- Forward migration: `0036_gm22_invitation_admission.sql`, schema `0.13.0`.
- No package, mobile consumer, event sender, or terminal decision engine changes.

## Implementation and acceptance

1. Preserve `accept_room_invite` signature and `JoinRoomResponse`.
2. Serialize admission in reference → canonical pair → room → invitation order,
   and re-read mutable invitation fields under lock.
3. Require caller recipient, current accepted pair, active inviter, unexpired
   invitation and room, lobby state, valid display name, and policy-specific
   capacity within one transaction.
4. Route B and B-supplement through `dish_v4_private.admit_member`; use v3
   trusted membership writes with cap 20 but without legacy pool refresh; retain
   decision-v2 capacity 8 and its legacy preference/pool behavior.
5. Preserve exact ACK replay before quota and mutable checks. Replays must not
   mutate existing membership, preferences, room version, pool, or events.
6. Keep `unfriend` locking deterministic across the canonical pair and related
   rooms/invitations; cancel pending invites without removing room membership.
7. Verify migration/ACL with SQL TAP, real JWT through isolated Auth+REST,
   boundary and concurrency fixtures, Bruno desktop, repository checks, and a
   final merge readiness gate.

## Test data and safety

Use only a fresh namespaced GM-03 QA project, synthetic identities, and the
fixture-only catalogue where a legacy positive flow requires one. QA API/DB
ports are `54361/54362`; on Docker Desktop this runner requires the explicit
`GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1` opt-in for Docker port publishing, while
the Auth/REST endpoint remains loopback. Do not reset or publish the application
database. Cleanup must verify project/container/workdir ownership and retain
metadata on failure.

Expected policy capacities: decision-v2 admits up to 8, rejects 9; v3, B and
B-supplement admit up to 20, reject 21. Authentication, recipient, pair,
inviter membership, expiry, state, retry, privacy and serialized race outcomes
are checked against exact status and message key. Consumer Android work remains
with GM-28; sender/event delivery remains with GM-23.

## Evidence status

The exact input, expected result, observed result, revision, source hashes and
cleanup outcome are recorded in [CHECKS](CHECKS.md), [HANDOFF](HANDOFF.md) and
[MANIFEST](MANIFEST.json). Desktop Bruno and regression results remain `Not run`
until actually executed. These artifacts are a review candidate; they do not
change Project status or constitute Trí's approval.
