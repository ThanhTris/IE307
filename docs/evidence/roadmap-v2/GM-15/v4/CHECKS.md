# GM15.3 — verification

2026-10-29, macOS, Node24.22.1, Python3.12.14; base main a6e89fc.
Owner Vinh; reviewer Trí Pending. [Plan](PLAN.md) / [handoff](HANDOFF.md) /
[manifest](MANIFEST.json) / [vectors](vector-results.json).
This is pure domain evidence, not SQL/RPC/persistence/auth/concurrency/Android.

Checks are recorded after final execution in checks.json. Node type stripping
alone does not prove typecheck; full tsc, lint, Jest and architecture run separately.
Existing v2/v3 files/fixtures and the app dependency lockfile must remain unchanged.
No actual room/user votes or private server seeds are written; JSON report is
explicitly synthetic, input/expected fixed independently of the evaluator.

SQL parity, secure entropy generation, host/waiting authorization, transaction
atomicity, retry persistence, DB ACL/retention, Android and production: **Not run
in this pure-domain patch**, owned by receiving tasks. They are not labeled Pass
from a Node test. Trí reviews GM15 stage AC without inverting dependency to GM20.


## Actual final run on working-tree content

| Check | Actual |
| --- | --- |
| New independent input–expected–actual |102/102 Pass; frozen fixture inputs; report includes source SHA256 |
| Node domain suites |288/288 Pass =179 v2/v3 +109 v4; no legacy expected changed |
| Legacy decision reporter |153/153 checks Pass |
| Full TypeScript typecheck |Pass |
| ESLint |Pass,0 errors;4 existing warnings in API contract/index files |
| Jest mobile regression |27 suites /704 tests Pass; not Android evidence |
| Architecture |Pass |
| Expo installed lock/SDK check |Exit0 offline/cache mode; not online latest or device evidence |
| Full Python regression |642 tests OK,6 skipped according to environment |
| Repository / indexes / git diff --check |Pass |
| Live start and merge gates |READY_TO_CLAIM / READY_FOR_MERGE_REVIEW; upstream only |

Dependencies restored by npm ci from the unchanged SDK58 lock; existing jsonschema
CI pin installed only in /tmp venv for Python checks. No new app dependency/package/
lockfile/config. The Node typeless-module notice and Watchman recrawl warning do
not change the recorded results; no package metadata or Watchman state was changed.
Input/expected outputs are fixtureOnly simulations. SQL/RPC parity and persisted
result/history/event/quorum/race tests stay Not run in this stage; GM20 receives
these vectors. No human review/Project Done/production or native claim follows.

[checks.json](checks.json) records counts/runtime/log hashes/protected sources;
[vector-results](vector-results.json) records every synthetic input/expected/actual.
HEAD-before-patch is the base revision, explicitly not a commit containing the
uncommitted implementation. [Manifest](MANIFEST.json) pins the actual tested bytes.
