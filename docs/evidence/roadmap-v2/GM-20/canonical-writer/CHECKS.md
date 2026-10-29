# GM20.4 — candidate checks

Owner Vinh, reviewer Trí; branch based on68e2e07 (GM19 PR141), including GM15
PR140/237e5f7. Source hashes and actual input–expected–actual are in the manifest
and exported reports. Not Approved/Done; dependency/ADR review remains pending.

| Check | Actual | Status |
| --- | --- | --- |
| Pure SQL / independent GM15 vectors |102/102 exact expected outputs, including invalid inputs and selector/Top3 | Pass |
| Baseline B HTTP after migration | Current maintained suite, real guest JWT/PostgREST/worker; old authority preserved | 151 assertions /575 envelopes Pass, baseline-http-results.json |
| B-supplement actual HTTP | Canonical-only result, one registry/outbox, R1/R2/N1/N0/ALL_REMOVED, score/cohort, lost response/retry, transaction rollback, host/submit/tick race, expiry, consent20 and cleanup | 114 assertions /683 envelopes Pass, http-results.json |
| Fresh + populated QA | Full candidate run from fresh DB and rerun on owned populated DB; no reset/app DB writes | Pass, runtime-results.json + populated HTTP report |
| Mobile typecheck / lint / architecture | Pass;4 existing lint warnings,0 errors | Pass |
| Jest |27 suites /704 tests | Pass |
| Node domain / backend tooling |288 /19 tests | Pass |
| Python |646 tests OK,6 skipped | Pass |
| Repository / task indexes / diff | Actual final output recorded in checks.json | Pass |
| Start / merge gate | Live Project, no local/cache fallback; GM19 still Needs Update; GM15 Done | BLOCKED, not bypassed for integration |
| Bruno environment |11-request collection, private0600 QA environment prepared; credential files ignored | Prepared; desktop execution Not run |
| Android / push consumer / production | Separate consumer/deployment scope, no evidence claimed | Not run |

Node24.22.1, Python3.12.14, macOS arm64, PostgreSQL17, pinned Supabase CLI2.120.0.
Existing dependencies restored from lock; no package/lock changes. Existing pinned
jsonschema4.26.0 used from isolated /tmp venv. No AI calls or catalogue relabeling.

Only synthetic ballots/seed vectors are in reports; JWTs and private runtime/env
files are excluded. Actual terminal entropy remains server-private. SQL fixture
expected values were authored independently by GM15, not computed by this kernel.
Record counts vary with concurrent winners/polls; report numbers refer to their
own exact run. API samples are checked against the supplied B-supplement schema.

The controlled fault is injected after registry/result/member/history writes and
before the outbox insert; transaction failure rolls back room/version, result,
registry, scoped history/audience/receipts and ACK. Retry then writes once. A local
proxy also drops a committed ballot's response and normal retry returns one ACK.

Versioned authority is an implementation candidate selected by Vinh; ADR021 and
Trí's integration approval are still pending. New creation flag defaults OFF.
Gate results do not auto-mark dependencies Done. Native/production/GM23 consumer
and Bruno desktop acceptance cannot be inferred from SQL/HTTP/CI preparation.


## Main refresh during implementation

GM15 PR140 merged into main5c339cf (also GM40 dependency docs2f91f92).
The candidate branch was rebased onto that main; inherited GM19 code is local
commit204c25f, equivalent to PR141's68e2e07 patch. Remote GM19 PR141 remains open;
no parent PR was pushed/retargeted by this GM20 code-only work. Start-time a6e89fc/
68e2e07 references above remain historical inputs, not the final target revision.
Live gate now waits only for GM19 Needs Update; GM15 is accepted Done. The branch
keeps the new GM40 task/dependency/index metadata from main without reverting it.


Final new-main runs: fresh114 assertions /681 schema envelopes and populated114 /
683. Poll/race-dependent envelope counts differ; both run the same source bytes.
The separate SQL parity report contains all102 input/independent expected/actual
rows. Baseline B and old stored projections remain unchanged by new result writes.
Commit-time controlled fault now includes active personal/group consent; history,
receipt and audience counts remain unchanged on rollback, then retry writes3 once.
Actual output/evidence does not include private runtime or Bruno credentials.
