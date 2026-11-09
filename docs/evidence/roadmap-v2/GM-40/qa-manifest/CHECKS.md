# GM40.3 checks on 2026-11-09

The candidate was tested in a fresh checkout of main
`bc5a0629c0d1050ef3256ec9fa73bd669019fb84` with the GM-40 patch applied and
`npm ci --offline` completed. macOS arm64, Docker Desktop 4.55.0, Docker Engine
29.1.3, Supabase CLI 2.120.0, Node 24.15.0, Python 3.12.14 and jsonschema 4.26.0.

| Check | Expected | Actual |
| --- | --- | --- |
| Live merge gate with output verification | Required artifacts and Project dependencies | READY_FOR_MERGE_REVIEW |
| Real QA provisioning | Sealed GM03 manifest, owned DB, Auth and REST with loopback bindings, healthy worker | Pass. API 54371 and DB 54372 bound to 127.0.0.1. 28 migrations verified |
| Source data and provenance | Exactly 39 real test-demo dishes, separate synthetic seed | Pass. Bundle SHA 776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f |
| Import and SQL | Readback, repeat import, conflict, rollback, activate and restore | Pass on the real database |
| HTTP suite | Schema-validated catalogue, lunch preview, and honest dinner shortage | Pass. 200/39 dishes, 200/20 of 23, 409 INSUFFICIENT_DISHES with 7 available and 20 requested |
| Room continuity | Persisted v3 winner and catalogue pin survive reimport and restore. Locked v4 R2 retains two cards | Pass |
| Manifest integrity | Original release inventory and worker verify against the same seal after the suite | Pass |
| Regression | Python, root Node, generated catalogue, repository, indexes and whitespace | Python regression counts are recorded in validation.txt. Node 19 pass. All static checks pass |

Both full runs passed 100 assertions against the same manifest seal. The producer then stopped the owned worker, Supabase stack and network. [Runtime evidence](runtime-1109.json)
records the request inputs and outcomes, manifest seal, migration and source
hashes, and cleanup. [Handoff](HANDOFF.md) gives the commands and the scope
of the temporary Docker loopback setup.

On this Mac the normal CLI first reported wildcard port bindings and the
existing startup guard rejected them. The successful run used a temporary
private Docker socket to request explicit loopback binds for the two owned
containers. Docker itself reported the effective addresses. The 2026-11-07 development runs found a missing v3 snapshot field in the
fixture and an outdated SQL ownership marker. The final suite uses the v3 first-round pool version and
checks the exact GM03 run ID and owner UUID.

Run details are for Data and backend QA. Hosted CI and human review are pending.
