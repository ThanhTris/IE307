# GM-22.2 admission checks

Date: 2026-10-30

Base revision: `e3f7058525da14c3b147fc909511cef7c803ee7c` (`origin/main`)

Contract: `food-v1/roadmap-v2/GM-22.1`

Supplement/schema: `food-v1/roadmap-v2/GM-22.2` / `0.13.0`

## Results

| Check | Result | Input and expected | Actual |
|---|---|---|---|
| Fresh disposable migrations + GM-22 SQL TAP | **Pass — 35/35** | Apply all migrations to an isolated QA database; verify grants, auth boundary, admission helper ACL, event constraints, friend invite behavior | TAP plan `1..35`; all 35 assertions passed, 0 failed; [sql-run.txt](sql-run.txt) |
| Auth + REST HTTP suite | **Pass — 63/63** | Real guest JWTs against isolated GoTrue/PostgREST; exercise social flow, exact capacity and capacity+1 for decision-v2/v3/B/B-supplement, ACK/replay, expiry/state/permission, privacy, quotas and serialized races | All 63 named cases passed; missing/forged JWT returned 401; full/capacity/state outcomes matched exact status/message key; live accepted ACK replayed unchanged while retention cleanup ran. [http-results.json](http-results.json). Runtime project `ie307-dish-v4-qa-20261030-086609693500-1`, `127.0.0.1:54361`; this run cleaned itself on completion. |
| Bruno desktop Runner | **Pass — 12/12** | Execute the GM-22 collection sequentially against a fresh owned QA runtime; request IDs and room/invitation IDs flow from prior responses | 12 passed, 0 failed, 0 skipped in Bruno 4.3.0. Exact expected statuses were `200, 200, 200, 200, 200, 200, 200, 200, 200, 401, 403, 200`; the wrong-recipient case returned `NOT_RECIPIENT`. The accepted invite response returned HTTP 200 and a membership UUID; replay preserved the ACK and the final snapshot contained the recipient. See [bruno-run.txt](bruno-run.txt). |
| Repository Python regression | **Pass — 648 tests, 6 skipped** | `PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py"` | Exit 0; 648 tests ran, 0 failures, 6 skipped. Includes GM-07.B contract/schema fixtures and backend QA runner tests. [Log](python-regression.txt). A transient Python `ResourceWarning` noted a rate-limited HTTP response while the suite continued; it did not fail a test. |
| GM-19/20 runner regressions | **Pass — 12/12** | `node --test tests/gm19-runtime-files.test.mjs tests/gm20-cli.test.mjs` | Ownership-safe cleanup/preflight and GM-20 CLI entrypoint assertions passed. API cases are not exercised by the CLI test; live admission and ACK behavior is covered by the 63-case HTTP suite. |
| Repository/docs/readiness checks | **Pass** | Repository validator, task docs checker, merge readiness (`--base-ref origin/main`), Node syntax checks, Python compile and `git diff --check` | Validator/docs passed; merge gate returned `READY_FOR_MERGE_REVIEW` for GM-22 on `origin/main=e3f7058525da14c3b147fc909511cef7c803ee7c`. This is not reviewer approval. `git diff --check` had no whitespace errors (Git printed only LF→CRLF notices for two JS files). |
| Cleanup | **Pass** | Stop retained Bruno QA project and fresh HTTP QA project only by their owner metadata | Both owned projects stopped; private runtime and generated Bruno environment removed; application database unchanged. See manifest cleanup record. |
| Android UI | Not run | Consumer integration is GM-28 | No Android result claimed. |
| Remote push | Not run | Sender/device notification flow is GM-23/29 | No push result claimed. |

## Coverage notes

- Capacity boundary: decision-v2 admits 8 and rejects 9; v3, B, and B-supplement admit 20 and reject 21. Rejection leaves active roster unchanged. V3/B/B-supplement preserve the pinned pool version.
- Race suite covers accept/accept, accept/reject, accept/direct-join at the last seat, accept/start, accept/cancel, unfriend/invite/accept, and cleanup/live-ACK replay. It verifies final database state and uniqueness rather than accepting either status indiscriminately.
- Replay tests prove immutable accepted ACK after room expiry and unfriend; changed payload returns `409 REQUEST_ID_REUSED`; an already-active member is not rewritten or used to increment room version.
- Privacy checks cover preview projection, outsider snapshot denial, direct membership-write denial, own inbox projection, and foreign/unknown cursor rejection.
- The desktop Bruno chain is a separate fresh QA runtime from the 63-case HTTP run. Bruno output shows status/body assertions for the chained friend and room-invite flow; no access/refresh token is written to evidence.
- Dedicated GM-16 and GM-17 full standalone suites were not pointed at the application Supabase instance. Their relevant auth boundary, own/outsider projection and direct-write checks were exercised in the isolated GM-22 HTTP/SQL runs; GM-16 adapter refresh and GM-17 full history/retention semantics remain owned by their respective task evidence.
- Full server API admission/retry/race regressions for the GM-19 and GM-20 contracts were exercised through the current GM-22 HTTP suite on fresh migrations; the separate GM-19/20 runner tests above only cover runner behavior.
- QA data is synthetic only. `applicationDatabaseChanged=false`; no application DB reset or production catalogue publish occurred.
- Docker Desktop required the QA runner's explicit `GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1` opt-in for its published QA ports. PostgREST/Auth endpoint remained `127.0.0.1:54361`; the first run without opt-in stopped during port-binding preflight before the final fresh QA run.
- The initial Bruno run exposed an assertion bug that compared membership-row `memberId` to auth `userId`. The assertion now checks the returned membership UUID and verifies the member's `userId` through room snapshot. The complete fresh-run rerun passed 12/12.

Source hashes and per-runtime ownership are recorded in [MANIFEST.json](MANIFEST.json). This evidence does not change the task's Project status or provide Trí's approval.
