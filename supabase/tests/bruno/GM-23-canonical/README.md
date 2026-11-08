# GM-23.2 canonical notifications — owned synthetic QA

Run `python scripts/gm23_canonical_check.py --bruno` with Node24, Python,
Docker and locked root dependencies. Docker Desktop needs the existing explicit
`GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1` QA opt-in; no application DB is touched.
The runner executes parity/API/SQL/transport suites, then prepares fresh guests,
a ROUND_1 room and a second actual NO_CONSENSUS result via producer RPCs.

Select `Local.runtime.private` and run 01–22 in order. Requests 01–11 exercise
producer/result/reconnect/outsider/replay; 12–14 verify DECIDED, NO_CONSENSUS,
and inbox-only friend invitation projections. Requests 15–22 exercise granted
device registration, exact ACK replay, changed-payload rejection, caller-scoped
unregister, safe metadata projection and unregister replay. Every expected
status/body is exact. Versions/vote IDs come from preceding responses.
No setup endpoint, production publish or client-provided winner is introduced.

Before another desktop run use `python scripts/gm23_canonical_check.py --prepare-bruno`
to prepare new identities/rooms and replace the ignored environment. Every
sequential run updates runtime variables from fresh snapshots. `--against --bruno`
also reruns all suites. Do not change DB rows or republish a real catalogue.

`python scripts/gm23_canonical_check.py --cleanup` stops only its recorded owned
worker/project/backup and removes its private environment. Failure keeps ownership
metadata for retry, including after gateway shutdown. `--status` reports no secrets.
All environment values in Local.bru are placeholders. Desktop output is recorded
separately from automated HTTP and does not prove remote Expo/Android delivery.
