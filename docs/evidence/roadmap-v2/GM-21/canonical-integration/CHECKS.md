# GM21.3 canonical integration checks — 2026-10-30

Owner Tâm; reviewer Trí Pending. Branch codex/gm-21-canonical-history, target
main/PR143 e3f7058 plus the uncommitted patch pinned by MANIFEST.json. Schema0.13.0,
GM21.3, unchanged received GM07.B-supplement wire and GM20.4 canonical writer.
No app DB migration/reset, Project approval/status write or production activation.

| Check/output | Actual result / evidence | Limit |
| --- | --- | --- |
| Canonical producer→history, immutable result/card/Top3 |80 checks Pass; http-results.json;700 request/response schema envelopes | Actual GoTrue guest JWT/PostgREST, owned synthetic data |
| Scopes, late opt-in, before/after-finalize revoke,20 members, outsider |Pass in80 checks | No raw identity/ballot/preferences/seed exposure; optional participants omitted |
| Common and versioned delete, retry/reconnect after delete |Pass, including common delete after operational room cleanup; receipts/results remain | Same missing/other-owner successful no-op, existing API/ACK format |
| Cleanup vs audience insert, both lock orders |Actual two SQL sessions wait on Lock; cleanup commits, invalid link rejects23514, failed receipt/audience rolled back | READ COMMITTED; no mocked scheduler |
| Concurrent actual finalize/revoke |One canonical result, zero group payload, personal scopes survive | Actual HTTP requests and SQL readback |
| Original detached-consent defect |Historical red: diagnostics/gm06-detached-consent/red-detached-consent.json; forward0036 now rejects new links | Existing retained links stay readable; no merged migration edited |
| Retention/expiry |Before/at expiry and30day predicate boundary, actual expired consent purge, retained refs after cleanup | Future boundary uses explicit predicate time, not a30day wall-clock wait |
| QA down/reapply |Only0036 integration objects/ledger removed; stored writer result/receipts unchanged; reapply restores without resurrection | Disposable QA only, not deployment recovery approval |
| Existing B/v4 baseline |151 checks Pass;575 schema envelopes; baseline-http-results.json | Auth/REST server, no Android claim |
| Full GM20 writer business regression |125 checks Pass;705 schema envelopes; producer-http-results.json | Includes terminal fault/atomic rollback/retry, quorum/worker and pinned B compatibility |
| Independent GM15/GM20 SQL parity |102 vectors Pass; writer-parity.json | Independently supplied expected values, no fixture rewrite |
| Legacy history/consent/retention/paging SQL |47 checks Pass; legacy-sql-results.json; capped50, cursor no overlap | Nested owned QA DB, SQL claims separate from JWT verification |
| Consumer function source/security verification |6 deployed bodies match0036; SECURITY DEFINER/fixed path; client/helper/alias denial tests Pass | Definition comparison before HTTP, default-deny private functions |
| Required Python regression |648 tests OK,5 existing skips; python-regression.txt | Unit/offline is not runtime or human approval |
| Repo/index/diff/start/merge gates |Logs in this folder | Readiness is prerequisite checking, not review or merge permission |
| Hosted CI at this new revision |Not run before commit/push; workflow job added | Check exact PR revision after publication |
| Android/FE/cache/consumer integration |Not run; GM25/28/31 handoff | Outside this BE patch; never inferred from HTTP/schema |

The QA was initialized from all current migrations with the real39-dish draft
import and separate synthetic positive pool. The final80-case consumer iteration
ran on that owned QA after the full producer regression; source hashes identify
its exact revision. The initial fresh consumer iteration passed79 cases before
adding the explicit common-delete-after-cleanup check and rerun-safe fixture ID.
No live/source dataset, verified flags, scoring policy or result was backfilled.

Environment: local macOS, Node26, Python3.13 with existing jsonschema4.26.0 pin,
Supabase CLI2.120.0/PostgreSQL17; actual Docker bindings/ledger in runtime-results.json.
Private environment/JWT/control files are excluded. Reports are scanned for JWT/
credential URIs and contain synthetic/public assertions, not real ballots or GPS.
Cleanup removed only the labeled QA worker/containers/workdir/backup volume;
cleanup-results.json and final inspection record the result. Trí review Pending.

Publication normalization: removed one empty EOF line from gm21_canonical_http.mjs.
Raw runtime reports remain unchanged; MANIFEST.json records tested/published hashes
and the exact byte relation. No executable tokens changed; node --check passed.
