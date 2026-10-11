# GM-07: validate write responses and repair mock join ACK

Task GM-07 / issue #68, owner Trang (@rosy179), reviewer Trí (@ThanhTris). Independent review and Trí acceptance remain pending.

The PR defines core API DTOs, error envelopes and the public ApiClient interface, an injectable RPC/fetch client with token/timeout/error handling, and an in-memory mock adapter for UI development. It includes explicit success/loading/empty/error/stale fixtures, retry behavior and contract mapping to GM-04/GM-06. The database RPC implementations remain with the downstream API tasks.

Mock joinRoom used an undeclared roomId after mutating the roster, causing TS2552 and runtime rejection. The RPC client also accepted ok:true payloads without the required endpoint fields. This patch uses room.roomId and validates each typed-write payload before success, preserving valid flat/nested responses and void ACKs. Malformed data/metadata returns MALFORMED_RESPONSE; retry tests verify stable ACK, member count and version.

Scope: GM-07 contract/client/mock, API contract food-v1/roadmap-v2/GM-07.1. No package/lockfile, SQL/schema, Expo base or privacy rule changes. Normalizer implementation helpers now require an endpoint guard; public ApiClient method signatures are unchanged.

Inputs GM-02/03/04/06 compared against target main 00c4f27a97d4f1487dfed7c54c1253c766709a1a. GM-04 1.1.0 is adapter/dictionary proposal, GM-06 schema 0.1.0, mock datasets remain fixtures. Tested code commit: f0599f8c4b92bf372fc6e3e497389cd59cadf914 (PR base 67f00e6d5b7016c44895617241ab41e0aa7583f1). Mobile check/Python contract rerun on this commit. A following evidence-only commit records output; PATCH_MANIFEST.json identifies tested files.

Validation on Windows, Node 24.15.0/npm 11.12.1/Python 3.12.14 UTF-8:

- npm run check: typecheck and architecture pass; lint 0 errors/4 existing warnings; 4 Jest suites/141 tests pass after cold shell timeout and rerun with default timeout.
- Targeted API Jest: 2 suites/135 tests pass, including 117 new runtime cases.
- Python GM-07: 10 tests pass; source assertions do not substitute for runtime guards.
- Full Python: 476 tests, 1 failure/5 errors; exactly these six reproduce on an origin/main snapshot with the same runtime (encoding probe and Windows legacy locking). Full regression is not reported as pass.
- HANDOFF TypeScript examples compile in the mobile project context; repository/index/diff checks and live gate results are recorded in CHECKS.md.

Evidence/HANDOFF: docs/evidence/roadmap-v2/GM-07/CHECKS.md and HANDOFF.md, with raw output files and patch manifest. Runtime mock/transport tests validate scaffold behavior, not production RPC/RLS/native/verified-data acceptance. Independent review, CI for a pushed new SHA and Trí acceptance remain pending. No reviewer approval, Project Done or merge is recorded by this description.
