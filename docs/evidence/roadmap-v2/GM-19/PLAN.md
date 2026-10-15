# GM-19 implementation plan

- Contract: `food-v1/roadmap-v2/GM-19.1`; schema version `0.3.0`.
- Add `0019_room_lifecycle.sql` with the nine lifecycle RPCs, private ACK/rate
  tables, fixed `search_path`, caller-derived identity, and explicit DTO
  projections.
- Validate the SQL boundary with the pgTAP suite, HTTP request examples, and
  the local Bruno collection. Positive rows are supplied only by a disposable
  synthetic fixture; draft catalogue data is never promoted.
- Keep Android/UI acceptance for GM-25 and voting/finalization for GM-20.

## Fixture and integration follow-up, 2026-10-13

Use GM-18 published-state simulation in an owned disposable DB, real GM-16
GoTrue identities, local54331 gateway and sequential Bruno47 requests. Reuse
GM-07 real client and runtime guards to check successful and failed responses.
Test idempotent retries/capacity/races/expiry/revalidation/private projection and
429 independently. Keep the fixture running for visual inspection; provide an
owned reset/stop flow and redact credentials. Fix GM-19 defects discovered by
these runs and record all mandatory Not run cases. No package, push or approval.
