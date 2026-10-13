# GM-17 — CHECKS

Owner/reviewer: Trí / ThanhTris. Approval: Pending. Date2026-10-13 (UTC+7).
Branch codex/gm-17-access-retention; base main4bb928e55c31dbc4dea185362a66063b65a1f4fd.
Working tree chưa commit/push; MANIFEST.json ghi exact file SHA256, không dùng base
SHA để giả code đã commit. Contract GM-17.1, schema0.2.0, food/core1.1.0.

Environment: Windows, Python bundled3.12.14/PYTHONUTF8=1 (có timezone data), Docker
29.4.3, Supabase CLI2.120.0, official PostgreSQL17.11. Node runtime xem TOOLS.txt.
SQL uses isolated disposable databases; synthetic fixtureOnly inputs, simulated
publication chỉ trong SQL DB. HTTP uses actual local GoTrue + PostgREST and three
anonymous synthetic users; each namespace cleaned without reset/volume deletion.
No verified dataset published, no remote deploy, no phone/build run in GM-17.

| Case/input | Expected → actual/assertion | Result/artifact |
| --- | --- | --- |
| Upgrade0001..0003 + existing fixture rows →0004 | Schema0.2.0, terminal backfill, valid FKs; local function/policy/column grants match fresh final migration → matched | Pass, SQL_CHECK.json |
| host/member A/B/outsider/anon | Own ballot/preference/submission only; no cross-user/outsider disclosure → matched | Pass, SQL93 assertions |
| explicit private columns/direct writes | Denied, no ties/consent snapshot/hash/token/write privilege → matched | Pass, SQL + HTTP_CHECK.json |
| Publisher/catalogue | Publisher food CRUD only; published simulated row visible; draft/unpublished/internal author hidden → matched | Pass, SQL; no actual publish |
| Trusted guard | Auth/member/host/version/expiry/terminal negative and live host positive → matched | Pass, SQL |
| Consent/expiry | Denied immediately before physical cleanup, personal/group boundaries → matched | Pass, SQL |
| Retention old/live rooms | Old room/ballots/context removed; before-cutoff room retained; history and live ACK preserved → matched | Pass, SQL |
| History max30days/device30days | Reject overlong history retention; stale token/device and dependent delivery removed → matched | Pass, SQL |
| Repeat/overlap cleanup | Repeat safe; second real connection returns skipped=true under held lock → matched | Pass, SQL_CHECK.json |
| Actual GoTrue JWT host/member/outsider | HTTP200 correct projection/own rows/empty outsider; no metadata spoof → matched | Pass, HTTP_CHECK.json, 23 cases including cleanup |
| Private read/write over HTTP |403/42501; anonymous/forged JWT401 → matched | Pass, HTTP_CHECK.json |
| Expired JWT verification | Locally signed synthetic expired JWT rejected401 by real PostgREST verifier → matched | Pass; not natural session expiry evidence |
| Worker | Two cycles60seconds apart, actual local cleanup invocation → matched, no eligible app rows in these cycles | Pass, WORKER_CHECK.txt |
| Bruno setup/cleanup | Ignored environment + synthetic namespace; cleanup verified ownership and removed own test users/files → matched | Pass, HTTP_SETUP_CHECK.txt + BRUNO_SETUP_CLEANUP.txt |
| Bruno collection16requests | Bru CLI4.2.1 ran the tracked collection against local GoTrue/PostgREST;16/16 tests passed (200 allowed projections/empty lists,403 private fields/tables,401 anonymous) | Pass, BRUNO_CLI_CHECK.txt; ignored credentials/synthetic namespace cleaned after run |
| GM-06 baseline |67pgTAP,2schedule races,16reference races, rollback/upgrade → matched | Pass, GM06_REGRESSION.json |
| GM-08 baseline |31cases synthetic import/reimport/query/race/rollback → matched | Pass, GM08_REGRESSION.json |
| GM-08 after schema0.2.0 |31upstream cases after0004; only registry assertion expects0.1.0+0.2.0 → matched | Pass, GM08_SCHEMA02_REGRESSION.json |
| GM-16 |8HTTP auth cases + bounded real429 +7SQL assertions → matched | Pass, GM16_REGRESSION.txt |
| Backend runner |8tests | Pass, BACKEND_RUNNER.txt |
| Python |550tests, no failures/errors | Pass, PYTHON_REGRESSION.txt |
| Repo/docs/diff + gate |See GATES_AND_DOCS.txt actual output | Pass, validator/indexes/diff; gate READY_FOR_MERGE_REVIEW |

## Android–API coverage/handoff

| Producer/consumer | Device/runtime/build | Expected | Actual/status |
| --- | --- | --- | --- |
| GM-17 server ACL | Local real JWT/PostgREST/SQL, no phone | Enforce rights independent of UI | Pass above |
| GM-25/26 | Not run in GM-17 | Android caller session → permission/expired error UI; no other ballot | Not run, consumer scope |
| GM-28/31 | Not run in GM-17 | History/invites/token boundaries, logout and identity cache isolation | Not run, consumer scope |
| Realtime subscription | Config disabled, no device | No private publication; future event ACL/refetch only | Publication audit Pass; live subscription Not run |

GM-17 does not claim full SEC-03 capacity/ballot transitions, SEC-06 invite/unfriend
race, SEC-07 consent/delete endpoint, SEC-08 remote push/local cache isolation.
These belong to business/integration producers/consumers listed in HANDOFF. Its
current SQL/access/retention surfaces are tested without waiting for those tasks.

## Reproduction notes

See HANDOFF.md commands and upstream manifests. The legacy GM-16 rate setup
script has a PowerShell array-expression issue in workdir label construction and
can leave a renamed Auth container on an error. This run restored Auth immediately,
then applied parenthesized label construction and guarded cleanup **in memory**;
stopped/removed only the superseded local Auth backup after the replacement was
running. Original script is unchanged; database volumes/keys were not changed.
Final Auth has trusted X-Forwarded-For rate header, and HTTP429/SQL rerun passed.
Do not classify a script exit0 as Pass without the output assertions.

Mobile code/packages/DTOs unchanged: mobile typecheck/native build N/A for this
patch. Consumer tests remain explicit Not run, not N/A. Production scheduler,
load/quota, backup/uninstall and production deploy are not claimed.

## Late environment interruption

At2026-10-13T09:17UTC Docker Desktop reported stopped/unable to start during WSL
upgrade. That HTTP attempt had no cases executed; recovery restarted Docker and
the retained Auth container without resetting volumes. Final HTTP23cases passed
after recovery. Import regression adapts only the registry assertion to the
intentional0.1.0+0.2.0 registry; final31cases passed. Python550tests reran Pass.

Final deployment audit compares private function bodies (CRLF normalized),
effective function grants, policies and column grants between freshly migrated
disposable DB and local API DB. It caught inherited default function grants and
two generated schedule-group columns from an earlier draft; final0004 explicitly
revokes all client function rights then regrants four safe predicates. Local draft
grants were aligned, full SQL93assertions reran Pass with
localDeploymentMatchesFresh=true, and HTTP reran on those matching rights. No
upstream migration or migration history was rewritten to pretend equivalence.
