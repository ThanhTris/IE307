# GM20.4 canonical — synthetic QA collection

Run `python scripts/gm20_canonical_check.py --bruno` from repository root with
Node24/Python3.12/Docker and the existing locked dependencies. On Docker Desktop
set GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1. The runner checks the full automated suite,
then creates a fresh synthetic two-person ROUND_1 room and writes the ignored
Local.runtime.private.bru environment (0600); no credentials in logs/evidence.

Select that environment and run01–11 once in order. All-WANT ballots lead to one
R1 canonical terminal, cohort2, fixed Top3; outsider gets403, old submit receipt
replays. All IDs/version/votes derive from the actual snapshot. Run Again uses a
fresh fixture via `python scripts/gm20_canonical_check.py --against --bruno`.
Do not edit DB rows/pool IDs or republish a real catalogue to reuse the collection.

`python scripts/gm20_canonical_check.py --cleanup` removes only the exact recorded
worker/project/backup and its own private environment. Local.bru is placeholders.
Broader parity/quorum/race/rollback/consent/cleanup cases are automated, not these
11 UI requests. Collection desktop execution is Not run until actually exercised;
HTTP runner results do not assert a Bruno desktop pass or Android integration.
