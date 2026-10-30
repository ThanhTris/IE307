# GM-22.2 admission handoff

## Delivered

- Forward-only migration `0037_gm22_invitation_admission.sql` advances schema
  to `0.14.0`; public GM-22.1 RPC signatures and response DTOs are preserved.
- `accept_room_invite` takes the reference → pair → room → invitation locks,
  rereads mutable rows, then captures one `clock_timestamp()` decision time.
  Both room and invitation expiry are checked against that time before
  admission, and `responded_at` plus membership timestamps use the same value.
- B/B-supplement use GM-19 `dish_v4_private.admit_member`; v3 uses a trusted
  writer at capacity 20 without legacy pool refresh; decision-v2 retains its
  capacity 8 and pinned behavior.
- ACK replay remains before mutable expiry/state checks. A request waiting for
  locks past expiry returns `410 / ROOM_EXPIRED` without member, invitation,
  version, pool or success-ACK changes.
- `unfriend` locks the canonical pair and related rooms/invitations
  deterministically, cancels pending room invitations and preserves current
  room membership.

## Evidence and limits

GM-22 SQL TAP passed 35/35; authenticated HTTP passed 75/75; Bruno desktop
Runner passed 12/12. GitHub PR #145 checks passed 18/18 on commit `2a6902d`.
The GM-21 canonical history/consent suite passed 80/80 on
the same isolated database with migrations `0036` and `0037` installed, and all
six deployed function fingerprints matched after Windows line-ending
normalization. GM-19/20 runner regressions passed 12/12. Repository validator,
docs checker, syntax checks and diff check passed.

The Python regression command ran 657 tests, skipped 6 and reported one
environment error: Windows denied creating a symlink in
`test_stage_refuses_symlink_output` (`WinError 1314`). The remaining 650 tests
passed. No system security setting was changed. Merge readiness is recorded in
CHECKS after its final gate.

Runs used isolated QA projects, synthetic identities and fixture-only data.
The retained Bruno project and generated private environment were cleaned up;
cleanup verified ownership and the application database was unchanged. The
Bruno Runner's 12/12 output remains open in Bruno for inspection. No token/key
is included in evidence. Android remains Not run and is handed to GM-28;
terminal event/sender remains with GM-23/29. This handoff does not change task
status or constitute Trí's approval.

## Consumer handoff

GM-28 can accept a room invite using the existing GM-22.1 RPC and receives the
existing `JoinRoomResponse` (`roomId`, `version`, `memberId`). For v4,
admission uses GM-19's shared helper and preserves the locked policy/pool and
active member state. Acceptance of an already-active recipient replays the
exact stored ACK without rewriting membership. Terminal or expired rooms
reject new admission; clients should refresh the room snapshot after successful
acceptance or replay.
