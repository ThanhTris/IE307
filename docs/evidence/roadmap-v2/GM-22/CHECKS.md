# GM-22 — checks

## Current GM-22.2 admission supplement

The checks below preserve the previously reviewed GM-22.1/schema `0.4.0`
baseline. They are historical and do not establish the current admission
requirements. For current migration `0036`, schema `0.13.0`, capacity/race
regressions, Bruno desktop evidence, source hashes and cleanup, use
[admission-v4/CHECKS.md](admission-v4/CHECKS.md) and
[admission-v4/MANIFEST.json](admission-v4/MANIFEST.json). The current supplement
must be reviewed by Trí; this note does not change Project status.

Owner/reviewer: Trí / ThanhTris. Contract `food-v1/roadmap-v2/GM-22.1`, schema
`0.4.0`. Clean-run revision: `9454ff1c21b1d989b8b8b17d314b2f34bf9ac6d2`.

| Check | Result | Evidence |
|---|---|---|
| SQL disposable ACL/identity/pair constraints | Pass: 19/19 assertions on a fresh disposable database | `supabase/tests/database/GM-22_social.test.sql`, `sql-run.txt` |
| HTTP disposable real JWT social flow | Pass: 14/14 scenario groups; synthetic namespace, endpoint `127.0.0.1:54332` | `scripts/gm22_http_check.mjs`, `http-results.json` |
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
invites can be recreated with a new event; concurrent room invites serialize to
one pending row; eight-member rooms return
`ROOM_FULL`; locked rooms return `ROOM_LOCKED`; result notifications are
projected as `room_result` without an invitation ID; and unfriend preserves
existing room membership. Retained Bruno mode was stopped with the stop script,
which returned `stopped:true, cleaned:true` after dropping its owned database
and guest identities. The runtime persists `stopped:true` before cleanup, so a
later stop invocation retries cleanup without contacting the closed gateway.

## Current-schema event regression — 2026-10-27 (local)

Reproduced the obsolete `events_social_shape` name assertion on fully migrated v4 QA. Migration 0027 intentionally replaces that constraint with the v4-compatible result reference check. The TAP suite now exercises copied production CHECK/NOT NULL rules on a temporary table: valid friend, room invitation, legacy result and v4 result shapes must be accepted; missing references, conflicting result references, invalid friend room and unknown kind must be rejected. The existing real invitation RPC checks remain. Temporary shape checks do not claim foreign-key/trigger coverage; those remain the responsibility of actual persisted RPC suites.

GM-22 TAP passed **29/29**, and all three database TAP files passed **47/47** on owned PostgreSQL. The original 19-case GM-22 file failed at case 12 before this change. Input, before/after JSON and TAP logs are local under `review-results/ci-sql-fix-20261027/`; no CI assertion was disabled, and no event runtime constraint was changed. Remote CI and Android were not run by these SQL checks.
