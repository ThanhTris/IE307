# GM-22.2 admission handoff

## Delivered

- Forward-only migration `0036_gm22_invitation_admission.sql` advances schema to `0.13.0`; public GM-22.1 RPC signatures and response DTOs are preserved.
- `accept_room_invite` revalidates recipient, accepted pair, active inviter membership, invite/room expiry, LOBBY state, display name and capacity under the reference → pair → room → invitation lock order.
- B and B-supplement call the shared GM-19 `dish_v4_private.admit_member`; v3 uses its trusted membership writer with capacity 20 and no legacy pool refresh; decision-v2 retains capacity 8 and its pinned legacy path.
- Replays return the stored ACK before quota and mutable state checks. Replaying does not rewrite an active membership or mutate room preferences, version, pool or events. Changed payload for the same request ID returns `REQUEST_ID_REUSED`.
- `unfriend` deterministically locks the canonical pair and related rooms/invitations, cancels pending room invitations and does not remove existing room members.
- The HTTP suite creates its own guest identities through QA Auth and uses real JWTs against QA REST. Bruno has a separately prepared and retained isolated runtime with dynamic IDs/versions; use `python scripts/gm22_admission_check.py --bruno` to recreate it and `python scripts/gm22_admission_check.py --cleanup` to stop it safely.

## Evidence and limits

SQL passed 35/35; authenticated HTTP passed 63/63; Bruno desktop Runner passed 12/12; Python regression passed 648 tests (6 skipped); targeted GM-19/20 runner regressions passed 12/12. Repository validation, docs checking, Node/Python syntax checks, diff checking, and the merge-readiness gate passed. The runs used isolated QA runtimes with fixture-only data. Docker Desktop needed the runner's explicit local wildcard opt-in to publish QA ports; the API origin remained loopback `127.0.0.1:54361`. The 63-case HTTP run and the fresh Bruno run have distinct QA project IDs recorded in `http-results.json`, `bruno-run.txt` and `MANIFEST.json`. Bruno's private environment and QA credentials were removed after its successful run. Cleanup is recorded as successful, and the application database was not changed.

The standalone GM-16 and GM-17 full suites were not run against the application Supabase instance. Their relevant auth, own/outsider access and direct-write boundaries are covered by the isolated GM-22 suites; GM-16 session-adapter refresh and GM-17 full history/retention semantics remain covered by their own task evidence. Android remains Not run and is handed to GM-28. Event sender/terminal notification bridge remains with GM-23. This handoff is not a Done transition or reviewer approval.

## Consumer handoff

GM-28 can accept a room invite using the existing GM-22.1 RPC and receives the existing `JoinRoomResponse` (`roomId`, `version`, `memberId`). For v4, admission uses GM-19's shared helper and preserves the locked policy/pool and active member state. Acceptance of an already-active recipient replays the exact stored ACK without rewriting their membership. Terminal rooms reject admission; clients should refresh the room snapshot after a successful acceptance or replay.
