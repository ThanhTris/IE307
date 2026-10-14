# GM-19 — checks, 2026-10-14

Contract `food-v1/roadmap-v2/GM-19.1`, schema `0.3.0`. Owner/reviewer:
Trí / ThanhTris; human approval pending. Uncommitted source hashes are recorded
in PATCH_MANIFEST.json and http-results-final.json.

| Check | Expected / actual | Result / evidence |
| --- | --- | --- |
| Fresh fixture | New owned DB, all migrations, real GoTrue JWTs, synthetic published-state food; no actual draft promoted | Pass setup; http-fresh-run.txt |
| GM-06 schema regression | Fresh migration, contract, schedule/reference races, rollback and reapply | Pass, 67 SQL assertions; gm06-schema-final.txt |
| SQL boundary | ACL, auth, security-definer/search_path, input and quota | Pass 15 assertions, including synthetic auth identity and missing caller claim; sql-run.txt |
| HTTP / real GM-07 client | All nine RPCs, opaque IDs, ACK retry, preferences, context and privacy | Pass 32 scenario groups; http-results.json and http-fresh-run.txt |
| Concurrency | Duplicate requests, final seat, join/start, host start/cancel, context/ready | Pass; same HTTP report |
| Revalidation | Catalogue/dataset changes, expired desiredAt, stale/empty pool, frozen snapshot, multi-choice preference reranking | Pass; same HTTP report |
| Commit/response loss | Database commits before response is dropped; retry returns one saved ACK | Pass; same HTTP report |
| Quota and retention | Create 10/min, snapshot 60/min, caller isolation, ACK replay after quota and ACK cascade | Pass; same HTTP report |
| Bruno desktop | 50 sequential requests with status/body assertions, including variant, terminal expiry and empty-pool regressions | Pass 50/50, Fail 0, Skipped 0; bruno-results.json and bruno-runner-50-pass.png |
| Python regression | UTF-8 and timezone data | Pass 550 tests, 6 skipped; python-regression.txt |
| Mobile consumer | Previous typecheck/lint/Jest/architecture; no mobile changes since | Pass 382 tests / 11 suites on 2026-10-13; mobile-check.txt |
| Repository | Validator, task indexes, diff whitespace | validation.txt |
| Project gates | Live start approval and merge artifacts against local origin/main a33d5e8 | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW; start-gate.txt and merge-gate.txt; ref freshness not verified |
| Android UI | Product integration belongs to GM-25 | Not run; no native/UI acceptance claimed |

The regression review findings are covered: persist_pool keeps the selected
variant, terminal snapshots return ROOM_EXPIRED at and after expiry, empty-pool
revalidation is persisted before NO_ELIGIBLE_FOOD, and SQL uses synthetic auth
identities created inside the rollback transaction. The Bruno-only fixtures are
owned disposable rows and do not promote actual catalogue data.

The earlier 30-case report and failed attempts remain as historical evidence;
http-results.json is the authoritative 32-case run for this revision. The final
Bruno run was observed directly in the desktop Runner and then the owned fixture
was stopped; cleanup reported the owned DB and guests removed. Runtime
credentials are ignored. Android product integration remains GM-25. No commit,
push, merge, Done transition or human approval was performed.
