# GM-22 Bruno Auth + REST QA

Run `python scripts/gm22_admission_check.py --bruno` to provision a fresh,
owned Supabase Auth+REST QA project and create the ignored private environment
`environments/Local.runtime.private.bru`. Import this collection, select that
environment, and run requests in order. The friend invite and room invitation
IDs are captured from prior responses; status and `messageKey` assertions are
exact for every request.

The fixture uses three GoTrue guest identities in a disposable project on
loopback port 54361. Bruno creates the B room and friend/room invitations from
actual preceding responses, then accepts and replays them. The environment
contains short-lived local JWTs and is ignored by Git. Never copy it into CHECKS,
HANDOFF, screenshots, or a shared collection. Cleanup with `python scripts/gm22_admission_check.py
--cleanup`; ownership metadata remains until teardown succeeds so cleanup can
be retried after a partial failure.
