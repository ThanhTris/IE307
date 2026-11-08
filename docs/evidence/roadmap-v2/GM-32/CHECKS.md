# GM-32 — local v4 consent/history run

Date: 2026-10-26. Scope: local BE/Data API candidate only. This file is execution evidence for the supplement, not task approval or status.

| Check | Expected | Actual | Result |
|---|---|---|---|
| Dedicated QA ownership/schema/worker | owned project, schema 0.9.1, verified migration definitions | matched `ie307-dish-v4-qa-20261026`; migration 0029 applied | Pass |
| Direct v4 HTTP | all assertions, consent scopes and temporal behavior | 82/82 | Pass |
| Bruno BE Core | 26 sequential requests, history request returns saved result/podium | 26/26, 0 failed, 0 skipped | Pass |
| GM-40 catalogue shortage | 3 requests with exact real data availability | 3/3 from same-day run | Pass |
| GM-20/22 legacy runners | regression on isolated QA | Not run: both scripts target repository-root app Supabase container | Not run |
| Full Python repository suite | no regressions | 595 run, 6 skipped, 21 failures in `test_mobile_api_test_plan` | Fail (unrelated task-plan assertions) |
| Android / phone / FE | product integration | outside scope | Not run |

The 21 failures are existing task-plan assertions: the test expects a relative `MOBILE_API_TEST_MATRIX.md` link and the literal “Android thật” in task 24/26–31/33/35 metadata; those strings are absent from the current task text/manifest. The v4 consent changes do not modify those task files. `validate_repository.py`, `task_readiness.py --check-docs`, and `git diff --check` pass.

Full local-only report: `review-results/dish-v4-qa-20261026/bruno-qa-summary.md` and `api-check-results.json`. No credentials are committed. The QA app database was not changed.
