# Data/BE checks — ADR-019 supplement

Date: 2026-10-22. Baseline main d8245a02c85d5b3bc4888a826589e99c1dc58a6d.
Scope: Data/BE only per owner's latest instruction. No task approval/Done is recorded here.

| Check | Actual | Limits |
| --- | --- | --- |
| Live Project start gates GM-01/15/19/20/25 | Done on Project, artifacts checked | This is dependency approval, not review of this patch |
| Node decision-v2 + seeded legacy + new policy | 179 tests Pass | 169 legacy + 10 new pure policy tests, no UI |
| PostgreSQL + HTTP suite | 108 assertions Pass before final test-only release guard; final CI reruns exact committed source | Synthetic namespace-owned DB, 20-card fixture, signed local JWTs; no GoTrue UI |
| Worker | Separate worker without app clients finalizes elapsed round; source/ledger/search_path preflight tested; tampered definition rejected | Local-only worker CLI provided; not installed on app DB |
| Concurrency | Two simultaneous join requests compete for slot20, exactly one succeeds | Epoch lock + room serialization; broader load tests still QA scope |
| Data | Exact host count10–20; insufficient filtered data rejected; duplicate IDs/unknown meal rejected; source/card release immutable | Real GM-40 bundle is not imported or activated by this patch |
| Security | Outsider/anon denied; only own ballot projected; host-only finalize; private table ACL checked | No public matrix/score/tie set; privacy review for Top3 remains Pending |
| Retention | Existing cleanup removes expired new rooms/private rows, wrapper preserves legacy cleanup | Disposable data only; app DB untouched |
| Python existing regression | 550 tests, OK, skipped=6, 85.919s | Windows/Python3.14; no phone/native assertion |
| TypeScript | Typecheck Pass | Checks pure domain compilation as part of source; FE implementation deferred |
| Repository/indexes/diff | Pass | Offline docs checks |
| Android, Expo, full app journey | Not run — deferred by owner | No new FE implementation in this PR |

See HANDOFF for wire payloads, operator setup and boundaries. All test databases and REST containers created by the suite are removed after verification. Tokens/keys/real votes/GPS are not stored.

Data PR129 remains Review at 58890c274ebf5c67f370d946421f303762921141 with two validator findings. This patch does not mark GM-40 complete or replace the missing actual importer/readback handoff.
