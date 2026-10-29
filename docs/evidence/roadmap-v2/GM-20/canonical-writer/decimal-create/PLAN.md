# GM20.4 review follow-up — integer-valued JSON number literals

Review: PR143 comment6500474678 by Trí on head588781c. Live start gate is
READY_TO_START; main remains fdee7fa. Owner Vinh requested the fix and PR push.

Scope: change the still-unmerged0035 create conversion to numeric::integer after
its existing number/integrality/range guards. Keep schema/contract/version and
shortage rules, other routes, merged SQL and production admission unchanged.

Add actual raw-JSON Auth/PostgREST regression for10/10.0/20/20.0. Inspect snapshot
settings and exact pool length. Reject10.5/9/21 and string/null/boolean values.
Preserve raw request JSON through schema validation (JSON.stringify loses .0).
Also assert decimal input cannot bypass insufficient catalogue inventory.

Run full owned QA: exact102 SQL vectors, baseline B and B-supplement HTTP/schema
suite, real GoTrue guests and timeout worker; no app DB writes. Run Python,
repository/index/diff and GM06 schema compatibility. Refresh source hashes,
manifest, CHECKS/HANDOFF and actual evidence. Commit/push existing PR143, verify CI.
Do not rewrite historical reports to claim new execution or mark Approved/Done.
