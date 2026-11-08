# GM-23.2 — handoff

## Current PR #154 verification — 2026-11-05

The branch now contains main `5564f307981e8c5a63e7aa6052e6d820db233c59` and
test-source commit `9fcdc5da057b0b315c955f0bfd906aaca05dbd8c`. Full GM-23
canonical/sender HTTP passed 151 cases /728 envelopes; GM-20's producer-consumer
checker passed 178 assertions /711 envelopes; the migration 0037→0038 upgrade
passed. Both QA projects were cleaned. Read the detailed [cross-task evidence](../../GM-20/canonical-writer/gm23-integration-followup-2026-11-05/HANDOFF.md)
for exact reports, source hashes, schema/producer version distinction and
reproduction. CI for the updated PR waits on push; Trí's review is still pending.

The original handoff snapshot below is dated 2026-11-04 and retained as history.

Target branch was fast-forwarded to main `4a35374`; server test snapshot was
`7c22db8` plus the same uncommitted GM-23 patch. The intervening main commits
touch only GM-11/14 UI and docs. Schema `0.15.0`, migration
`0038_gm23_canonical_notifications.sql`. Public inbox/register/unregister
signatures and DTO GM-23.1 are unchanged. Canonical result contract:
`dish-session-v4/roadmap-v2/GM-07.B-supplement`. Trí reviews the final revision;
this handoff is not an approval or a Done decision.

## Reproduce the server and sender checks

Prerequisites: Node 24, Python with the pinned `scripts/ci-requirements.txt`,
Docker Desktop/Linux engine, and the existing repo `npm ci`. QA opts into the
local Docker wildcard only for the disposable runner. It uses Auth + REST on
`http://127.0.0.1:54361`, DB port `54362`, synthetic fixtures and an owned
project/volume. It does not reset or migrate the app database.

```text
python scripts/gm23_canonical_check.py --bruno
python scripts/gm23_canonical_check.py --status
python scripts/gm23_canonical_check.py --prepare-bruno
python scripts/gm23_canonical_check.py --against --bruno
python scripts/gm23_cleanup_check.py
```

After `--bruno`, open `supabase/tests/bruno/GM-23-canonical` in Bruno, activate
the generated ignored `Local.runtime.private` environment and run the 22
requests sequentially. Use a newly prepared fixture before another run; IDs and
ACK request keys are single-run data. The private environment contains only
synthetic guest JWTs and is removed by cleanup. Never commit, copy into shared
environments, or include it in reports.

`gm23_cleanup_check.py` intentionally injects one cleanup failure after the
gateway closes, checks that ownership journal remains, retries without the
gateway, then verifies idempotent second stop and zero owned containers or
volumes. It must run only after saving the Bruno evidence you need. It leaves
foreign runtimes untouched.

## Wire and authorization boundaries

Inbox `room_result.metadata` contains only `roomId`, `resultId`, `status`,
`contractVersion`, and `eventVersion` for `DECIDED` or `NO_CONSENSUS`. Push
payload adds event type/ID and remains reference-only; it contains no ballot,
score, preference, seed, or token. `FRIEND_INVITED` is inbox-only. Consumers
must authenticate and refetch through the result API; a push does not grant
access to result or history. Dedupe by `eventId`; worker crash/provider timeout
can still produce a duplicate push, so exactly-once delivery is not promised.

The terminal event and inbox audience are materialized transactionally from
the GM-20 outbox, with private mapping through GM-17's result registry. Catchup
only uses live source rows, and projections cannot outlive the source TTL or
seven days. The 0037→0038 upgrade/backfill and repeated materializer check are
in [upgrade results](upgrade-results.json).

## Sender and consumers

Sender network calls remain outside the producer transaction. Token generation,
lease, retry budget/backoff and ticket/receipt comparison are private. A stale
receipt from token A cannot revoke token B after rotation. Local fake HTTP
provider tests prove transport/SQL behavior only; **remote Expo delivery was
not run**. Sender entrypoint uses `x-push-sender-secret`; the local worker keeps
service credentials only in its server process environment.

GM-28 receives inbox UI; GM-29 owns Android permission, Expo token
registration/unregistration before logout and real remote delivery; GM-30 owns
tap/deep-link/auth/refetch. Offline logout must still perform GM-16 local
cleanup and must not claim server revocation until online unregister succeeds.
Android inbox/tap/remote-push checks are **Not run** in this backend task.

Latest checks and exact desktop Runner statuses are in [CHECKS](CHECKS.md) and
[Bruno results](bruno-desktop.txt). The desktop Runner showed 22/22 Pass before
the QA cleanup. GitHub CI was not part of the evidence snapshot; check the PR
for current CI. Project status remains unchanged; PR creation does not approve
or mark the task Done. Trí review and merge remain pending.
