# GM40.2 — Checks

Owner Vinh, reviewer Trí. Base main e3f7058; tested working-tree patch on branch
codex/gm-40-rich-projection, not Approved/Done. MANIFEST pins current source,
upstream schemas/migrations and artifacts; reports contain expected/actual and
public request/response samples without tokens or ballots.

| Check | Actual | Result |
| --- | --- | --- |
| Owned GM40 SQL/JWT HTTP |125 assertions:47 maintained legacy +78 rich adoption | Pass |
| Existing B reduced R2 |2 survivors remain exactly2 during rich activation/restore; IDs/cards/version/SHA unchanged | Pass |
| GM18 upstream regression |286 SQL/HTTP assertions; fresh internal network, fixture auth/JWT | Pass |
| Python |657 tests,6 skipped;9 new admission/source/stage/coverage tests | Pass |
| Mobile |tsc, lint0 errors/4 existing warnings,27 Jest suites/714 tests, architecture | Pass |
| Notebook |7 code cells, Python runner | Pass; direct Jupyter Not run |
| Offline build/source |two builds identical; original bundle/schema/importers unchanged | Pass |
| Repository/index/diff |actual local validators | Pass |
| Live Project gate |READY_TO_START and READY_FOR_MERGE_REVIEW | Not human approval |
| Hosted CI / Android / production / Bruno desktop |not executed for uncommitted patch | Not run, no claim |

Node24.22.1/Python3.12.14/macOS arm64, PostgreSQL17.11, existing pinned Supabase/
jsonschema tooling. No new app package/lock or SQL/API implementation. CI reuses
existing GM40 job and adds pinned validator plus rich checks; no hosted run claimed.

QA readback pins real39-card source, schema/labels/17 display prices, explicit
source→rich release suffix, no-op/conflict, fault rollback, activation/restore and
old session/result/FK stability. Blank meal metadata is not eligible everywhere.
Breakfast14/lunch23/dinner7/snack1; source-null/rights and latest-price tie behavior
are not weakened. Category cross-tabs do not add hard filters or ranking.

Actual API samples cover catalogue39, lunch20 and dinner shortage20→available7.
SQL asserts private ACL and rich metadata/no hidden-price fallback. R2 B fixture
uses existing server tick from the driver; no new timeout/score/consumer claim.
All temporary owned DB/REST/worker resources cleaned, source/app data preserved.
