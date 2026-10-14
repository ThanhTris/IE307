# GM-22 — checks

Owner/reviewer: Trí / ThanhTris. Contract `food-v1/roadmap-v2/GM-22.1`, schema
`0.4.0`. Clean-run revision: `5b148de7b296fa8bccb8385fbcebebdb32855892`.

| Check | Result | Evidence |
|---|---|---|
| SQL disposable ACL/identity/pair constraints | Pass: 19/19 assertions on a fresh disposable database | `supabase/tests/social.sql`, `sql-run.txt` |
| HTTP disposable real JWT social flow | Pass: 7/7 scenario groups; synthetic namespace, endpoint `127.0.0.1:54332` | `scripts/gm22_http_check.mjs`, `http-results.json` |
| Bruno desktop | Pass: desktop Runner completed 10/10 selected requests; 10 passed, 0 failed, 0 skipped on a fresh retained fixture | `bruno-results.txt`, `supabase/tests/bruno/GM-22/` |
| Mobile typecheck/lint/unit tests | Pass: TypeScript, lint 0 errors (4 existing warnings), Jest 11 suites/382 tests | command output |
| Python UTF-8/tzdata fixture | Pass: `PYTHONUTF8=1`; root regression 550 tests, 6 skipped, 0 failures | command output |
| Repository validator/docs/field contracts/diff | Pass: validator, task docs, 166/166 field cases, consistency check, `git diff --check` | command output |
| Android consumer (GM-28) | Not run | downstream handoff |

The server suite and the Bruno desktop run both used real JWTs against a
namespaced disposable gateway. The Bruno fixture keeps the accepted friend pair
and pending room invitation so the request chain can exercise the positive
room-invite path; the regular HTTP suite still runs the destructive unfriend
cleanup assertion. The disposable namespace and container were stopped and
removed after the run; the application database was not reset and no production
data was promoted.
