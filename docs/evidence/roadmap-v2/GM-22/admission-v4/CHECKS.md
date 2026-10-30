# GM-22.2 admission checks

Date: 2026-10-31

Base revision: `621acccf777c8a2538012641ce525cba0e6ae3ce` (`origin/main`)

Working revision: `2a6902db41f20462dc44c849f6dd4806160a18fc` on PR #145.

Contract: `food-v1/roadmap-v2/GM-22.1`

Supplement/schema: `food-v1/roadmap-v2/GM-22.2` / `0.14.0`

## Results

| Check | Result | Input and expected | Actual |
|---|---|---|---|
| Fresh disposable migrations + GM-22 SQL TAP | **Pass — 35/35** | Apply the full migration chain including GM-21 `0036` and GM-22 `0037`; check ACL, identity, pair constraints and admission | TAP plan `1..35`; 35 passed, 0 failed on owned QA project `ie307-dish-v4-qa-20261030-135000060500-1`. [sql-run.txt](sql-run.txt) |
| Auth + REST admission suite | **Pass — 75/75** | Real guest JWTs; exact capacity, expiry/state, ACK/replay, privacy, quota and race outputs for decision-v2/v3/B/B-supplement | 75 named cases passed on fresh QA project `ie307-dish-v4-qa-20261030-676092440100-1`. All four lock-over-expiry cases returned `410 / ROOM_EXPIRED`; each left invitation pending, membership absent, ACK absent, and room/pool versions unchanged. [http-results.json](http-results.json) |
| Bruno desktop Runner | **Pass — 12/12** | Run the sequential collection on the retained QA runtime; all IDs and versions come from earlier responses | Bruno 4.3.0 showed 12 passed, 0 failed, 0 skipped. Expected statuses `200, 200, 200, 200, 200, 200, 200, 200, 200, 401, 403, 200`; invalid recipient returned `NOT_RECIPIENT`. [bruno-run.txt](bruno-run.txt) |
| GM-21 canonical history/consent HTTP regression | **Pass — 80/80** | Run producer-driven history suite against the same isolated database with both `0036` and `0037` installed | Personal/group consent, owner isolation, revoke/delete, no-consensus/ALL_REMOVED, 20-member audience, room cleanup, retention boundaries and real lock races passed. QA project `ie307-dish-v4-qa-20261030-135000060500-1`; detailed ignored runner output is under `.work/gm21-canonical/http-results.json`. |
| GM-21 deployed-function fingerprint | **Pass — 6/6** | Compare actual `pg_proc.prosrc` and security metadata to migration `0036` | All six functions matched after normalizing PostgreSQL-preserved CRLF to LF. The GM-21 checker now performs this platform-neutral normalization; migration `0036` is unchanged. |
| GM-19/20 runner regressions | **Pass — 12/12** | `node --test tests/gm19-runtime-files.test.mjs tests/gm20-cli.test.mjs` | 12 passed, 0 failed. This checks runner/cleanup wiring; server API outcomes are in the live HTTP suites. |
| GitHub PR checks | **Pass — 18/18** | PR #145 workflow run [41132033283](https://github.com/ThanhTris/IE307/actions/runs/41132033283) on commit `2a6902d` | Required CI, schema, backend, GM-07/18/20/21/40, GM-08, mobile, decision and repository validation all passed. |
| Python regression | **Fail — 1 environment error** | `PYTHONUTF8=1 python -m unittest discover -s tests -p "test_*.py"` | 657 tests ran; 6 skipped, 1 error. `test_stage_refuses_symlink_output` stopped at `Path.symlink_to` with Windows `WinError 1314` (symlink privilege unavailable); the other 650 tests passed. No system security setting was changed. |
| Validator, docs, syntax and diff | **Pass** | Repository validator, task docs checker, Node/Python syntax and `git diff --check` | All passed. `git diff --check` printed only Git's LF/CRLF working-copy notices. |
| Merge readiness | **READY_FOR_MERGE_REVIEW** | `python scripts/task_readiness.py --task GM-22 --gate merge --base-ref origin/main` | Gate read Project #2 at `2026-10-30T21:30:45.951236+00:00` and resolved `origin/main` to `621acccf777c8a2538012641ce525cba0e6ae3ce`; reviewer approval is still required. |
| Cleanup | **Pass** | Stop only the retained owned Bruno QA project using its ownership metadata | Project `ie307-dish-v4-qa-20261030-135000060500-1` stopped; private state/environment removed; application database unchanged. |
| Android UI / remote push | Not run | Android consumer is GM-28; remote push is GM-23/29 | No mobile or remote delivery result claimed. |

## Coverage notes

- The lock race starts a real REST accept request before expiry, blocks it on the owned reference lock across both cutoffs, then checks the returned status and persisted state. Coverage includes the pinned decision-v2, v3, B and B-supplement branches. The QA worker is paused only for these fixtures through a marker inside its verified owned QA workdir and resumes after each case.
- The separate HTTP suite also covers capacity boundaries 8/9 and 20/21, acceptance/acceptance and accept/join/start/cancel/unfriend races, active-member replay, outsider/recipient checks, inbox projection and direct-write denial.
- Bruno ran against the retained QA project while GM-21 migration `0036` and GM-22 migration `0037` were both installed. The later GM-21 suite used that same project before cleanup.
- GM-21 consent and retention suite produced 80 passing HTTP assertions. Its migration fingerprint initially reported a false mismatch because Windows/PostgreSQL CRLF bytes differed from Python's normalized migration text; the checker was corrected to normalize line endings and then matched all six functions. No GM-21 migration or policy was changed.
- The full Python command completed with one Windows symlink privilege error. This is reported as Fail, not Pass; no test was removed or rewritten.
- QA contained synthetic identities and fixture data only. `applicationDatabaseChanged=false`; no application database was reset and no production data was published.

Source hashes, migration hashes, each QA project and cleanup are recorded in
[MANIFEST.json](MANIFEST.json). This evidence does not change Project status or
provide Trí's approval.
