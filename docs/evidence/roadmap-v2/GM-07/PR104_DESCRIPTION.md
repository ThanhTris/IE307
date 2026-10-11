# GM-07: validate RPC responses and isolate mock caller data

Task GM-07 / issue #68, owner Trang (@rosy179), reviewer Trí (@ThanhTris). Independent review and Trí acceptance remain pending.

The PR defines core API DTOs, error envelopes and the public ApiClient interface, an injectable RPC/fetch client with token/timeout/error handling, and an in-memory mock adapter for UI development. It includes explicit success/loading/empty/error/stale fixtures, retry behavior and contract mapping to GM-04/GM-06. The database RPC implementations remain with the downstream API tasks.

Mock joinRoom used an undeclared roomId after mutating the roster, causing TS2552 and runtime rejection. The RPC client also accepted ok:true payloads without the required endpoint fields. This patch uses room.roomId and validates each typed-write payload before success, preserving valid flat/nested responses and void ACKs. Malformed data/metadata returns MALFORMED_RESPONSE; retry tests verify stable ACK, member count and version.

Read RPCs previously accepted primitive snapshots, objects in place of lists and incomplete restored users, installing the supplied token on malformed success. All eight read methods now validate the DTO or array, including nested fields, before success; failed restore preserves the existing token. Mock ownPreferences/ownVotes/ownSubmission are stored by room and caller so switching users cannot expose the previous caller ballot or receipt. Copies prevent request/ACK/snapshot mutation from changing stored private data.

Scope: GM-07 contract/client/mock, API contract food-v1/roadmap-v2/GM-07.1. No package/lockfile, SQL/schema, Expo base or privacy rule changes. Normalizer implementation helpers now require an endpoint guard; public ApiClient method signatures are unchanged.

Inputs GM-02/03/04/06 compared against fetched target main 00c4f27a97d4f1487dfed7c54c1253c766709a1a. GM-04 1.1.0 is adapter/dictionary proposal, GM-06 schema 0.1.0, mock datasets remain fixtures. Tested read/isolation code commit: 3f7f2412ed253eb67109368373e997599e916689 (base PR e482ccb3d9fec8051d71550a75916c9541fd2476); read-isolation-fix/PATCH_MANIFEST.json identifies source/spec/test hashes. Mobile check and Python contract were rerun on this code commit; a following evidence-only commit records output. Earlier write/join code f0599f8c4b92bf372fc6e3e497389cd59cadf914 and evidence e482ccb are retained in history.

Validation on Windows, Node 24.15.0/npm 11.12.1/Python 3.12.14 UTF-8:

- npm run check: typecheck and architecture pass; lint 0 errors/4 existing warnings; 6 Jest suites/266 tests pass with default timeout.
- API suites include the previous 135 cases plus 125 read/isolation cases; valid bare/enveloped DTOs, nested malformed data, token installation, two callers/two rooms/two rounds, caller-scoped retries and private object mutation.
- Python GM-07: 10 tests pass; source assertions do not substitute for runtime guards.
- Full Python: 476 tests, 1 failure/5 errors; exactly these six reproduce on an origin/main snapshot with the same runtime (encoding probe and Windows legacy locking). Full regression is not reported as pass.
- HANDOFF TypeScript examples compiled in the earlier patch; their code is unchanged. Current repository/index/diff checks and live READY_FOR_MERGE_REVIEW gate are recorded in CHECKS.md and read-isolation-fix/README.md.

Evidence/HANDOFF: docs/evidence/roadmap-v2/GM-07/CHECKS.md and HANDOFF.md, with raw output files and patch manifest. Runtime mock/transport tests validate scaffold behavior, not production RPC/RLS/native/verified-data acceptance. Independent review, CI for a pushed new SHA and Trí acceptance remain pending. No reviewer approval, Project Done or merge is recorded by this description.
