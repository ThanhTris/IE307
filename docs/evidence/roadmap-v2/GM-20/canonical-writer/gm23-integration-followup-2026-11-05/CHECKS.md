# GM-20 / GM-23 canonical notification follow-up

Checked 2026-11-05 on PR #154 branch `codex/gm-23-canonical-notifications`.
The test source revision is `9fcdc5da057b0b315c955f0bfd906aaca05dbd8c`;
the merged main base is `5564f307981e8c5a63e7aa6052e6d820db233c59`.
This is a follow-up to the historical GM-20.4 evidence. It does not change the
runtime, migrations, public RPC/DTO or schema.

## Results

| Check | Expected / actual | Result |
| --- | --- | --- |
| Full migration chain | GM-20 producer 0035, GM-21 0036, GM-22 0037, GM-23 0038 applied; latest DB schema `0.15.0` | Pass |
| GM-20 producer identity | GM-20.4 / migration 0035 / producer schema `0.12.0`; separately reports actual database schema `0.15.0` | Pass |
| Independent SQL parity | 102 vectors; expected output matched for every vector | Pass |
| GM-20 baseline Auth/REST | 150 response-driven cases / 575 schema envelopes | Pass |
| GM-20 canonical HTTP | 178 assertions / 711 schema envelopes | Pass |
| Canonical result event | Exactly one mapping and one `ROOM_RESULT_READY` event for each terminal result; result ID, room, status, contract, version and dedupe key match canonical result/outbox | Pass |
| Audience and inbox | Event recipients, frozen outbox audience, locked roster and one inbox row per recipient match; no outsider inbox | Pass |
| Retention and legacy boundary | Event/inbox expiry equals `LEAST(outbox.expires_at, outbox.created_at + 7 days)`; no `dish_v4_result_id`, public legacy result, or `dish_v4_private` result is written | Pass |
| Replay and race stability | Submit, waiting, finalize ACK replay, result refetch and host/worker race keep event, mapping and inbox IDs/rows unchanged | Pass |
| Rollback/retry | Injected terminal failure leaves zero canonical mapping/event/inbox; retry creates one valid set | Pass |
| GM-23 canonical and sender HTTP | 151 cases / 728 response envelopes; includes old receipt A ignored after token B rotation | Pass |
| GM-23 SQL | Auth 7, social 35, finalize 11, room lifecycle 15, notifications 20, canonical notifications 12; history assertion blocks completed | Pass |
| Upgrade 0037 → 0038 | Live result backfilled once; expired result skipped; second application produces no duplicate event/inbox | Pass |
| Local checker tests | Node syntax, Python GM-20 runner ownership/failure tests 4/4 and `git diff --check` | Pass |
| Repository/docs/readiness | `validate_repository.py`, task docs checker, diff check and GM-23 merge gate on fetched main `5564f30` | Pass; `READY_FOR_MERGE_REVIEW` |
| QA cleanup | Both disposable QA runs stopped; `GM-23 --status` returned `owned=false`, `running=false`; application DB unchanged | Pass |
| GitHub CI on updated PR revision | Runs after push | Not run at this evidence capture |
| Android / remote Expo push | Consumer/native delivery scope | Not run |

The GM-20 baseline API report retains its inherited `0.9.2` label from the
received v4 runner. The separate SQL ledger check and GM-20 HTTP/parity reports
identify the actual full database as `0.15.0`; the producer's own migration
version remains `0.12.0`. These labels describe distinct layers.

Detailed input/expected/actual and source hashes are in the JSON outputs beside
this file. Earlier zero-event expectation and prior counts remain historical;
this run requires exactly one canonical event and records its actual counts.

## Scope boundary

This follow-up confirms server transaction and sender transport integration.
It does not claim Android inbox/tap or remote Expo delivery, approval by Trí,
Project status change, merge, or production activation.
