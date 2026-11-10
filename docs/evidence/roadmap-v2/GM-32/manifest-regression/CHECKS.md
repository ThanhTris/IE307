# GM-32 manifest regression checks

Run on 2026-11-10 on the existing PR #163 branch, over main `30aa524` (includes GM-40 PR #164).
Runtime groups used commit `3c2a59b` and legacy decision parity used
`5f81cde`. Each exact revision is in the run extract. Each run used a separate
GM-03 QA project with GoTrue, PostgREST, a Postgres ledger of 28 migrations
through 0041 and a healthy worker. Runtime was macOS, Docker 29.1.3, Node
24.15.0 and Python 3.12.14. Ports were loopback-only. The local Docker
socket adapter scoped loopback publishing to each owned project.

| Run | Evidence | Actual |
| --- | --- | --- |
| `gm32-163-base` | GM-18.2 catalogue import/readback and pinned v3 result with the real 39-dish GM-40 bundle | Pass, 100 assertions |
| `gm32-163-base` | Guest Auth/REST and contract GM-07.B lifecycle, settings, admission, worker and HTTP schema | Pass, 7 Auth/REST and 171 wire assertions |
| `gm32-163-base` | Legacy v2 eligibility, GM-08 draft rollback probe, member/outsider ACL, two rounds, rollback/retry, last-submit/cancel and start revalidation | Pass, 142 assertions |
| `gm32-163-legacy-decision` | Legacy v2 evaluator and seeded selector | Pass, 140 vectors in deployed SQL and the TypeScript fixture suites |
| `gm32-163-canon` | GM-15 decision vectors evaluated against live GM-20.4 SQL and TypeScript; canonical GM-07.B-supplement writer | Pass, 102 vectors in each implementation and 188 HTTP/SQL assertions |
| `gm32-163-boundaries` | Exact count 10–20, R2 survivor N=0–20, strict-majority M=2/3/4/5/20, clock boundary, preference ACL and invite/start race | Pass, 279 assertions |
| `gm32-163-history` | Canonical GM-21 consent, history and retention | Pass, 89 assertions |
| `gm32-163-notify` | Canonical GM-23 inbox, sender and receipt reconciliation with a local fake push provider | Pass, 151 assertions including reused history cases |
| `gm32-163-outbox` | GM-31 unit and live canonical ACK/outbox reconciliation | Pass, 18 unit tests and one live test |

The [run manifest extract](RUNS.json) records the release identities, seals,
runner hashes and migration checksums. The baseline producers use
`dish-session-v4/roadmap-v2/GM-07.B`; the canonical producers use
`dish-session-v4/roadmap-v2/GM-07.B-supplement` and decision policy
`dish-decision-v4/ADR-019-30PCT-MIN1`. The baseline settings suite reported
schema 0.16.1. The canonical writer separately checked its consent-read
dependency at 0.16.0 and reported latest producer schema 0.16.1. The full
applied ledger is recorded separately from these producer labels.

| Input / operation | Expected | Actual |
| --- | --- | --- |
| GM-08 draft `0.4.1`, no covered anchor, legacy preview with no fixture capability | Empty pool, `OUT_OF_COVERAGE`, rollback leaves no version rows | Empty pool, `OUT_OF_COVERAGE`, 190 excluded offerings, zero persisted version rows |
| v2 `get_room_snapshot`, terminal room member vs outsider JWT | Member gets persisted result; outsider gets 403 with no data | 200 and matching result ID; 403 with no data |
| v2 last submit vs host cancel with the same version | One accepted operation; result/event count matches terminal state | HTTP 200 and 409; matching result/event counts |
| v2 final event fault, then identical retry | Full rollback of final submission/result/event and no version increment; retry commits once | Counts remained `[1,0,0]` on failure and reached `[2,1,1]` after retry; exact receipt replay |
| v2 start with menu expiring before desiredAt | 409 `NO_ELIGIBLE_FOOD`, empty pool and readiness reset | 409, empty pool, room/pool versions advanced once, lobby remained |
| B `create`, dinner count 10, real GM-40 catalogue | 409 `INSUFFICIENT_DISHES`; report available count | 409 `INSUFFICIENT_DISHES`, 7 available for 10 requested |
| B `updateSettings`, no-op or time-only, and replay/race | Retain pool IDs/version; retry returns same ACK; concurrent mutations commit once | Checked stable IDs, exact ACK, and one mutation for duplicate/settings/start races |
| B waiting after ACK with exactly half roster | 60,000 ms window, host cannot end early | 60,000 ms and `canEndWaiting=false` |
| B-supplement with 20 initial dishes, varying NO count | R1 N=0 terminates; N=1–20 locks exact survivors; cap+1 rejected when representable; exact cap admitted | All 21 survivor inputs matched; R2 used new row IDs and zero default ballots; N=1 remove-all ended without winner |
| B-supplement host finalize in R1 and R2 with M=2/3/4/5/20 | Minimum ACKs 2/2/3/3/11; under-threshold host and non-host cannot finalize; R1 ACKs do not count for R2 | Threshold, HTTP errors, locked count and round reset matched |
| B-supplement one waiting ballot at synthetic elapsed 59/60/61s, both rounds | Remain waiting at 59; transition at 60/61 even below host majority | Actual deployed tick kept both at 59, opened R2 from R1 and produced one R2 terminal result at 60/61 |
| B-supplement invite acceptance concurrent with start | One accepted write, one conflict, roster follows winning operation | HTTP 200 and 409, one version increment and correct member count |
| B-supplement all WANT for two locked members | `DECIDED`, round 1, `UNANIMOUS_WANT`, two R1 ballots | All four values matched |
| B-supplement lost submit response, same request retried | One ballot and one saved ACK | One ballot and one ACK |
| B-supplement final writer error injection | Roll back registry, result, history, events and ACK | Rollback assertions passed; retry wrote scoped history once |
| History revoke after operational room cleanup | Hide payload and retain one tombstone | `[false, 1]` with both cleanup orderings |
| Sender receives a push ticket without delivery receipt | Remain pending | Pending |
| Outbox restart after a lost submit response, same request retried | Server snapshot reconciles to ACK with payload removed; retry returns the same ACK and one ballot; peer cannot read ballot | Zero automatic replays, saved ACK without payload, exact HTTP replay, one submission and empty peer ballot |
| Outbox holds a stale next-pool intent when room decides | Discard stale intent; keep persisted result ID on fetch | Stale intent absent, no replay and result ID unchanged |

Static and offline regression on the same candidate:

- Python unittest discovery passed, 679 collected with 6 skipped.
- Mobile Jest passed, 81 suites and 1,513 tests. The live-only test is opt-in
  and ran separately. Mobile typecheck, lint and architecture check passed.
- Root backend-runner and backend-QA Node tests passed, 19 tests.
- The first live outbox harness attempts failed in the test setup. The final
  run uses Node HTTP and initializes the SQLite schema via GM-31 startup
  cleanup. It reopens an outbox object on the same Node SQLite database and
  in-memory secure adapter. Android force-stop and native storage remain
  separate checks.
- Owned QA worker, stack and network were cleaned for each recorded run.

## Acceptance audit

| Scope | Evidence and limit |
| --- | --- |
| Server and dataset | Legacy v2 HTTP lifecycle plus 60 SQL/domain eligibility vectors, pinned v3 room/result continuity, distinct B and B-supplement runs, separate GM-08 draft and synthetic data. Scope is regression against deployed QA definitions. |
| Decision and clock | All required counts and thresholds above, 140 legacy and 102 canonical decision vectors, persisted scores, consent/history, event and ACL. For 59/60/61 the test ages the individual session fixture and executes the deployed tick within a rollback transaction, while Auth/REST creates and reads the fixture. The separate canonical producer tests a real worker/host/submit race. |
| Price | Received GM-18.2 projection unit suite checks invalid observations, newest null, timestamp tie, nullable metadata and unit retention. GM-40 runtime round-trips the real projected cards and hash. |
| G01–G03 | Received friends/inbox/history suites cover empty/error, unavailable references, scoped cache, expiry and invalidation. Three new GM-32 component cases distinguish errors from empty data and no search match, and check retry recovery on friends, inbox and no-cache history. Component assertions use injected typed responses. Authenticated history/inbox HTTP suites are recorded separately. |
| G04/G05 | **Not run.** The live profile mutation and change-password screen are GM-35/P1 consumer scope. Current profile/settings routes render guest screens. Once received, verify G04 input retention and G05 field clearing on network/server failure. Reviewer disposition is pending in [the review record](../CHECKS.md#g04-g05-reviewer-disposition). |
| Native | **Not run** in GM-32. Places adapter permission/quota/attribution and result isolation have mocked component/unit coverage. Restricted live Places key, native push, physical two-client reconnect and Android USB belong to the device follow-up. See the [mobile API matrix](../../../../testing/MOBILE_API_TEST_MATRIX.md). |

## Integration gate

PR #164 landed at main `30aa524`. The original PR #163 GM-19 settings tests
were retained and the candidate passed the live Project merge-readiness
check against that target. Runtime and UI evidence have the boundaries
listed above. No Project status was changed.

See [plan](PLAN.md) and [handoff](../HANDOFF.md).
