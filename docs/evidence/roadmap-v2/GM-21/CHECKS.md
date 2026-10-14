# GM-21 — Independent checks

2026-10-14; owner Tâm, reviewer Trí, Pending. Branch codex/gm-21-history-consent.
Tested main/HEAD a33d5e85f1aeb7c7bda02310e02880a3af5e77da + working-tree patch.
Contract GM21.1 / GM07.1 / food1.1.0; schema0.2.0 +0021 storage supplement.
macOS/Node26.0.0/PostgreSQL17.11; SQL Python3.13.3, HTTP/regression bundled3.12.14.
Source/result hashes: PATCH_MANIFEST.json and integration/*-results.json.
No self approval, Done, commit/push, production publish or native claim.

| AC/output | Expected/assertion | Actual/evidence | Type/result/limit |
| --- | --- | --- | --- |
| Own/group read, scope/cursor, safe projection | No outsider/groupKey/roster/ballot/location leak | integration/sql-results.json + http-results.json | SQL/HTTP real, synthetic summaries; Pass |
| Scoped opt-in/withdraw/delete | Default no grant; physical group removal; peers personal preserved; no result mutation | SQL45/HTTP21 suite | PostgreSQL and GoTrue JWT/GM07 client real; Pass |
| Retry/idempotency | Opaque req_* IDs, same ACK, changed payload409, concurrent8 writes exactly1 mutation | HTTP case assertions, SQL stored version check | Real network/concurrent calls; Pass |
| Anti-repeat | Server canonical exact roster, consent/TTL, <=3/30days, forged key ignored, frozen start snapshot | SQL assertions | Private trusted ports on real PG, synthetic contexts; Pass |
| Recent ranking integration | GM19 calls ports and supplies IDs to existing GM18 soft ranking; actual room/start/finalize | Not run; upstream GM19/20 wiring pending | Mandatory final integration before task completion |
| Record producer | Actual persisted synthetic winner/consents; same outer statement server time; retry/delete no resurrection | SQL port calls and completion receipts | Trusted helper real, GM20 producer Not run |
| Retention | Two past meals detach consent independently; operational parents removed24h; summary authentic until30days; expired own metadata purged by GM17 worker | SQL45 incl cleanup/presentation/receipt checks | PG cleanup real, no deployed continuous scheduler claim |
| Page/cache boundary | Stable ID cursor no overlap, <=50 rows/page | SQL51+ synthetic summaries | Server paging Pass; GM31 local cache<=50 Not run here |
| Existing GM17 ACL/retention | Frozen upstream tests unchanged | 93 assertions Pass; integration/gm17-regression.json | SQL claims only; optional concurrentCleanup skipped by upstream runner |
| Mobile contract/typecheck/lint/unit/architecture | Existing DTO/client unchanged | 382 tests Pass,4 baseline warnings/0 errors; integration/mobile-check.txt | Unit/static, no Android claim |
| Domain regression | Eligibility/recent soft rank and decision invariants | 237 tests Pass; integration/domain-regression.txt | Existing synthetic domain fixtures |
| Full Python | Regression suite | 550 tests Pass; integration/python-regression.txt | Offline regression |
| Repository/index/diff | Links/JSON/task graph/freshness/whitespace | integration/repository-check.txt,docs-check.txt,diff-check.txt | Offline checks; not approval |
| Start gate | GM06/07/18 Done + target artifacts | start-gate.txt; READY_TO_CLAIM 2026-10-14T03:53:46Z | Live Project and fetched main |
| Merge gate | GM20 Done +0020 actual handoff | integration/merge-gate.txt; BLOCKED GM20 Todo at2026-10-14T04:42:32Z | Still blocked, not bypassed |
| Android / remote CI / final review | App→API→UI + current pushed revision | Not run / Not run / Pending | Android consumers GM25/28/31; Trí review |

HTTP suite uses actual GoTrue guest tokens, actual PostgREST verifier/network and
unchanged GM07 factory/client/response guards against its own loopback DB/gateway.
No response/transport mock. Only synthetic persisted decisions/consents are loaded;
this is not real GM20 finalize or actual user history. All21 cases Pass, including
outsider/missing/forged JWT, errors, opaque request IDs, concurrent8/one mutation,
physical group withdrawal, no resurrection, authentic retained history, unchanged
room/result hash and61 concurrent reads with60success/1HTTP429 plus caller isolation.
Runner removed owned container/DB/three namespaced guests. No JWT/key/raw ballots
or private GPS is stored in artifacts. No publication/real data promotion.

SQL45 assertions distinguish SQL JWT claims from JWT verification. Captures allow
real cleanup of operational parents without fake room code; missing legacy display
metadata fails closed with503/UNKNOWN_ERROR. Detached uniqueness correction is a
forward storage change in0021, not editing0001/0004. Existing GM17 test64 initially
caught a membership-trigger version bump; initial unready membership is now left
alone and unchanged GM17 suite passes93. Same-statement producer test inserts a
new result (does not mutate immutable result) then invokes record_result. Both
results immutability and server timestamps are preserved.

Trí must review storage/consent/API revision. GM20 remains the merge input; GM19
must wire private prepare/recent/freeze hooks and revalidate/reset/freeze its pool.
Existing GM18 pure tests cover ranking invariants; they do not prove that pending
room/start integration. No API/UI task is marked Done from these checks.

Integration ownership: the remaining adaptation of delivered GM19/20 transactions
is GM21 work after their real outputs are available. The port signatures above
do not add a dependency/AC to GM19/20 or block their completion on this task.
GM21 will receive those producers, wire its own callbacks/adapters and rerun real
create/lobby/start/finalize assertions before final completion.
