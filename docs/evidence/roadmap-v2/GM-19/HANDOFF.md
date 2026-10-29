## Current settings correction candidate —2026-10-29

[GM19.2 handoff](settings-stability/HANDOFF.md) covers the new forward migration
0034, host-only updateSettings, stable pools and response-driven regression.
This is stacked on GM-15 PR140, not human approval or a Project status change.
The following sections retain evidence of their original revisions.

# GM-19 — handoff

Owner/reviewer: Trí / ThanhTris. Contract GM-19.1, schema0.3.0; approval pending.
See CHECKS.md for actual Pass/Not run and PATCH_MANIFEST.json for source hashes.

Implemented artifacts: migration0019, SQL suites, HTTP examples, Bruno50 request
collection, gm19_http_fixture.py and gm19_http_check.mjs/reset/stop scripts.
Storage rationale: [GM19_STORAGE_SUPPLEMENT.md](../../../architecture/GM19_STORAGE_SUPPLEMENT.md).

## Reproduce on local Windows

1. Start local Docker Supabase. Python must have tzdata and UTF-8; Node>=22.13.
2. `$env:PYTHONUTF8='1'; node scripts/gm19_http_check.mjs --bruno` creates an
   owned disposable DB with real guest JWTs and synthetic published-state data.
   Wait for BRUNO_READY. Existing app data is untouched.
3. Open `supabase/tests/bruno/GM-19`, select Local.runtime.private and run all
   requests sequentially. Loopback54331 is the owned test gateway, not app DB.
4. `node scripts/gm19_http_check.mjs --against` reruns SQL/HTTP/real GM-07 client
   against that owned live fixture and writes http-results-final.json. It does
   not drop the fixture or disclose JWTs. After changing unmerged functions,
   the fixture helper's reload mode applies functions only to its owned DB.
5. Before Run Again use `node scripts/gm19_bruno_reset.mjs` (test budgets only).
6. Stop safely with `node scripts/gm19_http_stop.mjs`. Wait for owned cleanup;
   it removes that DB/PostgREST/test identities/runtime files. Never kill a
   Windows process to claim cleanup passed.

Nine RPCs use caller identity, ACK/version/room guards and private projections.
Request IDs remain opaque GM-07 strings, including req_*; private UUID storage
keys are derived server-side and successful responses echo the original ID.
Post-start card/context data is pinned, rather than read from live catalogue.

GM-25 receives Android product wiring/forbidden/auth/version/retry UI tests.
GM-20 receives voting/finalization; GM-21 provides trusted history inputs.
Server SQL/HTTP/Bruno results above do not claim mobile integration/native pass.

On 2026-10-14 a fresh disposable database was created. SQL passed 15 assertions
and HTTP passed all 32 scenario groups, including the four review regressions,
variant identity, terminal expiry and empty-pool revalidation. Bruno desktop
passed all 50 sequential requests. The final owned fixture was stopped and
reported `owned DB and guests removed`; see CHECKS.md and the evidence files for
source hashes and the captured Runner output.
Trí's final review remains pending; do not mark Done.

## v4 account-consent supplement — 2026-10-26 (local QA candidate)

For v4 only, account-level personal/group consent is inherited through the shared membership/admission path for host creation, direct join and invitation acceptance. The current account settings are synchronized again when the host starts, then each scope is frozen per member in the v4 session snapshot. Missing settings mean opt-out. Keep v2/v3 admission and consent semantics unchanged; already-started sessions are not granted new scopes. Migration 0029 implements a membership trigger plus start-time synchronization on the owned QA project; it is not merged or deployed. The 82-case local run is recorded in `review-results/dish-v4-qa-20261026/api-check-results.json` and does not replace GM-19's approved baseline or human review.
