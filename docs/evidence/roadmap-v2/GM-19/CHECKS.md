# GM-19 — checks, 2026-10-14

Contract `food-v1/roadmap-v2/GM-19.1`, schema `0.3.0`. Owner/reviewer:
Trí / ThanhTris; human approval pending. Uncommitted source hashes are recorded
in PATCH_MANIFEST.json and http-results-final.json.

| Check | Expected / actual | Result / evidence |
| --- | --- | --- |
| Fresh fixture | New owned DB, all migrations, real GoTrue JWTs, synthetic published-state food; no actual draft promoted | Pass setup; http-fresh-run.txt |
| SQL boundary | ACL, auth, security-definer/search_path, input and quota | Pass 13 assertions; sql-run.txt |
| HTTP / real GM-07 client | All nine RPCs, opaque IDs, ACK retry, preferences, context and privacy | Pass 30 scenario groups; http-results-final.json and http-final-run.txt |
| Concurrency | Duplicate requests, final seat, join/start, host start/cancel, context/ready | Pass; same HTTP report |
| Revalidation | Catalogue/dataset changes, expired desiredAt, stale/empty pool, frozen snapshot, multi-choice preference reranking | Pass; same HTTP report |
| Commit/response loss | Database commits before response is dropped; retry returns one saved ACK | Pass; same HTTP report |
| Quota and retention | Create 10/min, snapshot 60/min, caller isolation, ACK replay after quota and ACK cascade | Pass; same HTTP report |
| Bruno desktop | 47 sequential requests with status/body assertions | Pass 47/47, Fail 0, Skipped 0; bruno-results.json and bruno-runner-47-pass.jpg |
| Python regression | UTF-8 and timezone data | Pass 550 tests, 6 skipped; python-regression.txt |
| Mobile consumer | Previous typecheck/lint/Jest/architecture; no mobile changes since | Pass 382 tests / 11 suites on 2026-10-13; mobile-check.txt |
| Repository | Validator, task indexes, diff whitespace | validation.txt |
| Project gates | Live start approval and merge artifacts against local origin/main a33d5e8 | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW; start-gate.txt and merge-gate.txt; ref freshness not verified |
| Android UI | Product integration belongs to GM-25 | Not run; no native/UI acceptance claimed |

Fresh setup found an offering/venue mismatch: persistence selected the first
offering in a multi-venue list and could discard the projected choice. The fix
matches both venue and dish. Functions were reloaded into the newly created owned
DB before the successful full SQL/HTTP rerun. The start/cancel race uses the host
so cancellation is valid before or after start; member cancellation in lobby
correctly returns NOT_HOST.

http-results.json/http-fresh-error.txt retain the earlier failed attempt;
http-results-final.json is the authoritative later 30-case run. The earlier
Docker/503 startup failure ran zero cases and is not an API acceptance result.

The current fixture remains active for Bruno inspection on loopback port 54331.
Cleanup of this active run is not claimed: use `node scripts/gm19_http_stop.mjs`
when finished and inspect its cleanup output. Runtime credentials are ignored.
GM-16/17/18 tracked files were restored; 24 assistant-created temporary screenshots
were removed. No commit, push, merge, Done transition or human approval.
