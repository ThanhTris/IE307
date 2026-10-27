# PR123 — revision evidence follow-up

Review: https://github.com/ThanhTris/IE307/pull/123#issuecomment-6218965995
Published/tested implementation:91c1dac48d80bcfcfb77b39bf99de793c703bd9e.
Original implementation:858ef00; inspected target:4a8cd64. No rebase performed.

The reviewer confirms the price fix and no new blocking code issue in the inspected
draft pipeline. This follow-up updates CHECKS/HANDOFF/PR description/task footer and
PATCH_MANIFEST to identify the actual published fix. It changes no runtime, tests,
provider, packages, core contracts, dataset, schema or deployment settings.

PATCH_MANIFEST retains the original test-source hashes. Each hash was verified
against the Git blob in91c1dac, including the source-hashed pre-commit HTTP runner.
Historical raw execution reports and baseline CI snapshots remain unchanged;
previous-manifest.json preserves the superseded manifest. Original HTTP metadata
says858ef00 + working-tree fix because that was the execution state, not because
the price fix is still unpublished. CI now confirms the committed implementation.
ci-checks.json contains all26 successful GitHub check runs anchored to91c1dac;
counts include both push/pull-request triggered checks, not26 distinct workflows.
Local documentation checks/regression for this follow-up are recorded separately.
No local HTTP rerun or real recognizer/native/Edge execution is claimed here.

GM34 remains the merge dependency recorded by the live gate; do not bypass it.
Provider/license/privacy/quota/cost/real permitted-menu accuracy/pilot remain Pending.
Keep OCR disabled. No independent-task code acceptance becomes full-task Done,
merge permission, source verification, production publish or Project mutation.
The documentation follow-up itself is uncommitted until the user runs the supplied
commands; its CI and Trí review must be checked after push.

## Follow-up validation

- Python regression:558 tests,5 existing skips, exit0; python-regression.txt.
- Repository documentation validator:Pass; repository-check.txt.
- Task indexes:Pass; docs-check.txt.
- Whitespace/diff:Pass; diff-check.txt (empty means no whitespace errors).
- Live merge gate:BLOCKED, GM34 Project Todo; merge-gate.txt. This expected
  blocker is retained and is not a test pass or permission to merge.
- Runtime/tests are unchanged from91c1dac; no new local HTTP/native/provider run.
