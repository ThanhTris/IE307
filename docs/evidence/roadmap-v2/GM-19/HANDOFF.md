# GM-19 — handoff

Owner/reviewer: Trí / ThanhTris. Contract GM-19.1, schema0.3.0; approval pending.
See CHECKS.md for actual Pass/Not run and PATCH_MANIFEST.json for source hashes.

Implemented artifacts: migration0019, SQL suites, HTTP examples, Bruno47 request
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

On 2026-10-14 Docker recovered and Auth was restarted. A fresh disposable database
was created. After fixing offering/venue persistence and correcting the legal
actor in the start/cancel race, SQL passed 13 assertions and HTTP passed all 30
scenario groups, including ranking, dataset changes and response loss after
commit. See CHECKS.md and the final report for source hashes and Bruno evidence.
The fixture stays active for inspection; cleanup is not claimed for this run.
Trí's final review remains pending; do not mark Done.
