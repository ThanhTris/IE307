# GM-22 — checks

Owner/reviewer: Trí / ThanhTris. Contract `food-v1/roadmap-v2/GM-22.1`, schema
`0.4.0`. Clean-run revision: `8412e0022ee47bde0561e319ee3b719fa52f9953`.

| Check | Result | Evidence |
|---|---|---|
| SQL disposable ACL/identity/pair constraints | Pass: 19/19 assertions on a fresh disposable database | `supabase/tests/database/GM-22_social.test.sql`, `sql-run.txt` |
| HTTP disposable real JWT social flow | Pass: 13/13 scenario groups; synthetic namespace, endpoint `127.0.0.1:54332` | `scripts/gm22_http_check.mjs`, `http-results.json` |
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

Review regressions covered by the clean run: rejected and expired friend/room
invites can be recreated with a new event; eight-member rooms return
`ROOM_FULL`; locked rooms return `ROOM_LOCKED`; result notifications are
projected as `room_result` without an invitation ID; and unfriend preserves
existing room membership. Retained Bruno mode was stopped with the stop script,
which returned `stopped:true, cleaned:true` after dropping its owned database
and guest identities.
