# GM20.4 CI follow-up — canonical upgrade runner boundary

User reported PR143 run40888041948: GM06 schema failed, then required aggregator
failed solely because that job failed. No runtime/schema or approval change.

Cause reproduced locally: gm06_canonical_check temporarily withholds0032 to test
its empty migration/down and populated upgrade, but applied every other migration,
including new0035 which needs gm06_canonical. SQLSTATE3F000 occurs before assertions.

Patch: explicitly bound the pre-upgrade baseline to migration versions before0032;
include target0032 in actual model-test hashes, report downstream hashes separately.
Keep the independent model/down/upgrade/rollback assertions. Later migrations are
still tested in the all-migration isolated HTTP suite and canonical writer job.
Do not edit any applied migration or skip a CI job/check to hide the failure.

Validation: original local failure, then real GM06 canonical runner and full
isolated HTTP runner; full baseline schema check/TAP where feasible, Python
regression, repository/index/diff. Record exact assertion counts and sanitized
report, commit/push fix to existing PR143, verify new CI. No app DB reset or
migration, packages, Project Done/approval change or new public API.
