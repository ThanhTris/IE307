# GM-32 manifest regression supplement

Vinh owns the task and Trí reviews it. The existing GM-32 PR #163 retains contract simulation coverage for GM-19.
The follow-up is based on that PR and main `30aa524`, which contains GM-40
PR #164. The GM-32 start and output gates permit the candidate for review.
The suites here exercise deployed SQL and HTTP in a disposable GM-03 run.

1. Verify each explicitly selected GM-03 manifest, ownership, live Auth/REST
   services, worker, deployed functions and migration ledger. Keep reports in
   the ignored checkout and preserve the producer's input hashes.
2. Exercise the real GM-40 test catalogue and pinned v3 result, then baseline
   B wire/settings/admission. Compare legacy v2 eligibility SQL and domain
   behavior with synthetic vectors. Exercise v2 rollback, revalidation and
   concurrent cancel/submit, and compare legacy decision and selector vectors. Query the real GM-08 draft in a rollback
   transaction and verify the member/outsider boundary over actual HTTP.
3. Compare canonical v4 SQL to the independent decision vectors and run the
   maintained producer HTTP regressions for writer, consent, history and events.
   Use one fresh manifest per producer where the suite modifies QA fixtures.
4. Reuse GM-31 unit tests and add an opt-in test that reconciles a restarted
   outbox with live canonical snapshots and checks idempotent replay.
5. Capture actual counts, representative expected/actual values and gaps for
   GM-33, including the separate Android/native run. Verify cleanup by run ID.
