# GM-23.2 — checks

## Current PR #154 integration follow-up — 2026-11-05

PR branch includes main `5564f307981e8c5a63e7aa6052e6d820db233c59`; the
tested checker source is commit `9fcdc5da057b0b315c955f0bfd906aaca05dbd8c`.
Fresh disposable QA passed the GM-20 full-chain follow-up (178 canonical
assertions /711 envelopes), GM-23 canonical/sender HTTP (151 /728 envelopes),
and the 0037→0038 live/expired/idempotent upgrade. GM-23's received v4 baseline
was 150 cases /575 envelopes; SQL TAP and cleanup also passed. The exact
expected/actual, output files and migration/source hashes are in the [GM-20
integration follow-up](../../GM-20/canonical-writer/gm23-integration-followup-2026-11-05/CHECKS.md).
This new local result does not represent GitHub CI yet; the updated PR must be
pushed for CI. Android/remote Expo delivery remain Not run.

The dated section below records the earlier 2026-11-04 snapshot and its counts.

Checked 2026-11-04 on `codex/gm-23-canonical-notifications`, fast-forwarded
onto `origin/main` `4a35374b3cb3bbdb3bd8151fe471e779deb0430f`. The runtime tests
ran on the same GM-23 source patch at base `7c22db8d8a216c96c9b1cd1a26fcd95ccd56cdd0`;
the intervening eight main commits change only GM-11/14 UI and their docs, not
GM-23 server/test sources. The post-cleanup `--status` fix was smoke-tested
directly. Schema `0.15.0`, migration `0038_gm23_canonical_notifications.sql`.
Owner/reviewer: Trí / ThanhTris. Manifest contains source and evidence hashes.

| Area | Expected / actual | Result |
| --- | --- | --- |
| Fresh owned QA | Full migration set through 0038, GoTrue guest JWT and REST on loopback; app database unchanged | Pass |
| Independent SQL parity | 102 GM-20 input vectors | Pass |
| Received GM-07.B runtime | 150 response-driven cases; JSON Schema 2020-12 validated 577 envelopes | Pass |
| GM-23 canonical/history HTTP | 153 cases; 764 response envelopes validated against JSON Schema 2020-12 | Pass |
| Sender HTTP subset | 25 cases, overlapping the 153-case run; includes token rotation, stale receipt, lease/backoff/retry, provider errors and timeout-after-receive | Pass |
| SQL ACL and sender | `notifications.sql`: 20 pgTAP; canonical supplement: 12 pgTAP; Auth 7, room lifecycle 15, finalize 11, social 35; history/revoke/retention assertion blocks pass | Pass |
| Upgrade | Actual 0037 → 0038 migration with one live and one expired terminal outbox row; repeated migration/materialization leaves exactly one live mapping/event and two inbox rows, and no expired projection | Pass |
| Bruno desktop 4.3.0 | GM-23.2 collection, `Local.runtime.private`, sequential Runner: 22/22 passed, 0 failed, 0 skipped. Exact statuses include valid `200`, outsider `403`, changed-payload ACK reuse `409`; outputs are in [Bruno desktop results](bruno-desktop.txt) | Pass |
| Sender fake HTTP provider | 25 sender-focused integration cases use real SQL and local fake provider; separate legacy sender shim tests 4/4 | Pass |
| Type/tooling | `deno check supabase/functions/push-sender/index.ts`; Node QA ownership/cleanup tests 19/19 | Pass |
| Python regression | Linux Python 3.12: 658 tests, 6 skipped, all remaining passed; see [Linux output](python-regression-linux.txt) | Pass |
| Repository/docs/diff | Repository validator, task docs checker and `git diff --check` | Pass |
| Readiness | Start gate `READY_TO_CLAIM`; merge gate on fetched `origin/main` `4a35374` returned `READY_FOR_MERGE_REVIEW` | Pass |
| Cleanup failure/retry/status | Injected failure after gateway shutdown retains journal; retry without gateway and second stop remove only owned containers/volumes; subsequent `--status` reports `owned=false`, `running=false`; none remain | Pass |
| Windows Python historical run | Earlier Python 3.14 run had a Windows `WinError 1314` creating a symlink in one test; assertions were not weakened. Linux run above covers the suite successfully | Historical environment limitation |
| Remote Expo delivery / Android inbox and tap | Real Expo credential/token/native consumer not present; handed to GM-28/29/30 | Not run |
| GitHub CI on final patch | No remote PR checks included in this evidence snapshot; see the PR for current run status | Not run at evidence capture |

The current final Bruno run was shown in the desktop Runner and recorded as a
sanitized text result. `bruno-runner.jpg` is retained as a historical 13/13
capture and is not evidence for the current 22/22 run. The private Bruno
environment and disposable QA credentials are excluded from evidence. The QA
runtime has been cleaned; the application database was not reset or modified.

Detailed machine-readable results: [HTTP](http-results.json),
[received v4 API](dish-v4-api-results.json), [sender](sender-results.json),
[0037→0038 upgrade](upgrade-results.json), [cleanup](cleanup-results.json),
and [manifest](manifest.json). Fake transport is not reported as remote Expo
delivery; Android consumer work remains with GM-28/29/30.


## Current rerun output — 2026-11-05

The fresh run produced 151 canonical/history/sender HTTP cases and 728 schema
envelopes. It included stale receipt A after token B rotation, exact ACK replay,
event materialization/rollback, audience/TTL, delivery lease, sender retry and
expiry checks. The SQL TAP outputs from this run are included in the linked
GM-20 integration follow-up. The 0037→0038 upgrade returned one live mapping,
one event and two inbox rows, skipped the expired outbox, and remained exactly
once after reapplication. QA ownership status after cleanup was
`owned=false`, `running=false`; application DB unchanged.
