## Publication preparation —2026-10-29

## Current PR143 review follow-up — decimal create (2026-10-29)

Trí's [review comment](https://github.com/ThanhTris/IE307/pull/143#issuecomment-6500474678)
identified integer-valued10.0/20.0 being rejected by create. The still-unmerged0035
now converts through numeric after the unchanged type/integrality/range guards.
Contract and schema versions are unchanged. Raw HTTP regressions inspect actual
snapshot settings/pool counts; fractional/out-of-range/type-invalid values and
shortage remain rejected. Raw JSON is also retained through Python Schema2020-12
validation, rather than JSON.stringify normalizing away the decimal literal.

Current source/checks/replay evidence is in [decimal-create](decimal-create/README.md)
and the updated MANIFEST. Earlier numbers/ref/status sections below describe the
original candidate runs; their historical reports remain intact. GM19#141 is now
merged into mainfdee7fa; live start/merge gates pass, while Trí's PR/ADR review is
still required. No app database or Project approval/status was changed.


Vinh now requested commit/push and a review PR. GM15 is Done/merged; GM19 remains
Needs Update. Parent PR141 has been rebased to204c25f and retargeted to main5c339cf;
this feature PR stacks on that branch, with only GM20 changes in its review diff.
Merge still requires GM19 acceptance and Trí review of this candidate/ADR021.

# GM20.4 — versioned canonical writer handoff

Candidate requested by Vinh, reviewer Trí. Branch `codex/gm-20-canonical-writer-v4`
stacks on GM19 commit68e2e07/PR141 and GM15 commit237e5f7/PR140; maina6e89fc at
start. User explicitly chose the versioned canonical proposal and requested QA
candidate code while those PRs remain unmerged. This is not Project Done or Trí's
approval. [ADR021](../../../../architecture/decisions/ADR-021-versioned-canonical-writer.md)
remains Proposed; [mapping](MAPPING.md), [plan](PLAN.md), CHECKS and manifest pin
scope, source/hash and actual results. The live dependency gate remains authoritative.

## Shipped code / contract

- Forward0035/schema0.12.0, supplement GM20.4. Existing migrations are unchanged.
- Public RPC name remains `dish_session(command,payload)`. New version is the
  already supplied `dish-session-v4/roadmap-v2/GM-07.B-supplement` from GM07;
  no rewrite of baseline B/schema/client/UI. B-supplement publishes cohort R1.
- Creation gate `gm20_canonical_private.configuration.allow_new_sessions` defaults
  false. Only the owned QA runner enables it. Turning creation off does not orphan
  existing sessions, worker, reader or retained history. No app DB migrated/enabled.
- Old B/v2/v3 routing/results retain their original private bodies and authority.
  New sessions pin canonical storage at create; separated ACK namespace avoids
  cross-version create replay converting an old room. No backfill or dual-write.
- Strict SQL evaluator parity against102 independently authored GM15 vectors,
  accepted complete maps, locked roster/pool and secure terminal seed; N0/N1,
  R2 cap, NO/REMOVE, points/tier/Top3 and tie-boundary logic are versioned.
- Canonical registry trigger alone reserves resultId. Final-round row IDs, private
  selector seed, result_members/R1 flags, scoped history/audience/receipts and
  terminal outbox/audience are in the terminal transaction. New result lives only
  in gm06_canonical. There is no fake venue/offering or public seed/tie matrix.
- Operational result FK stays pinned to its old table. A capability row links new
  room to canonical result; immutable final-row mapping makes R2/history reads
  survive operational room cleanup without recomputation or identity changes.
- Reference-epoch→room/session locks, real auth/membership, version/pool/round/
  expiry and ACK replay are server-side. Host ends waiting only at current-round
  majority; timeout at60s requires>=1 ACK. Empty R2/pre-wait host action is NOT_READY.
  Expired WAITING rejects writes even before the next worker tick.
- Worker verifies actual ledger, old aliases and new forward definitions/security
  path against source; it refuses drift. Retention and scoped predicates remain
  supplied GM17/GM06 interfaces. Commit-time member/history checks run as definer
  without opening their schemas to clients.

## Reproduce on owned disposable QA

Node24, Python3.12 with existing scripts/ci-requirements.txt, Docker Linux engine.
Use npm ci from the unchanged root lock. No new dependency or app package/config.

```sh
npm ci
python scripts/gm20_canonical_check.py
# Docker Desktop CLI wildcard binding requires the existing explicit local opt-in:
GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1 python scripts/gm20_canonical_check.py --bruno
# Re-run on the same label/namespace-verified QA without resetting it:
python scripts/gm20_canonical_check.py --against --bruno
# Remove only this project's worker/containers/backup/private environment:
python scripts/gm20_canonical_check.py --cleanup
```

Use the platform's env syntax, set GM_V4_PYTHON to the chosen interpreter if needed.
The runner checks unused54361/54362, derives a unique `ie307-dish-v4-qa-...`
project, checks container/workdir/owner marker, applies all current migrations,
imports the real39-dish test/demo release and separate synthetic20-dish fixture,
then runs baseline B HTTP, SQL parity and authenticated B-supplement HTTP. It uses
real GoTrue guest JWTs/PostgREST and its real timeout worker. No app DB reset,
production publish, real ballots/AI call or network push occurs.

Default run cleans in finally. `--bruno`/`--keep` retains only the owned fixture;
`--against` verifies the private control file, labels and DB marker first. Namespace
validation rejects the app project, external workdir, unrelated env keys and bad
UUIDs. Private state under `.work/` and Bruno environment0600 are ignored. Logs and
exported reports do not contain credentials or private production votes/seeds.
The simulated lost-response proxy deliberately drops the response after the server
has committed; the normal retry then reads the single saved ACK/submission.

[HTTP examples](../../../../../supabase/tests/http/GM-20-canonical.http) use only
placeholders. [Bruno collection](../../../../../supabase/tests/bruno/GM-20-canonical/README.md)
contains11 sequential requests, prepared from a fresh actual snapshot/guest pair.
Bruno desktop execution is Not run; preparing its private environment and running
HTTP assertions is not a desktop or Android pass. Existing legacy collection is
unchanged. Optional collection fixture creation is separately marked in report.

Reports in `.work/gm20-canonical/`: sql-parity.json, http-results.json,
dish-v4-api-results.json and dish-v4-ci-report.json. Safe final copies/checks and
SHA256 manifest are in this evidence folder. CI adds an owned canonical job to
the existing BE/Data reusable workflow, uploading only named sanitized reports.
No CI execution is claimed until this working tree is committed/pushed and run.

## Upgrade / recovery / consumers

Before shared integration, Trí reviews ADR021/ID/ACL mapping, receives GM15/19 Done
on live Project, refreshes main and checks0035 numbering/ledger/actual definitions.
Source hashes/version/health alone are not a deployed-code or backup guarantee.
If shared DB has draft collision objects, obtain a reviewed backup/reconcile plan;
never edit merged migrations, reset the app or silently switch old results.

Rollback new admission with the server flag; keep readers/writer/retained storage
for already-pinned sessions. Removing/renaming authority or deleting/backfilling
rows needs another reviewed forward plan. Canonical receipts survive payload delete
and prevent retry resurrection. Scoped consent checks remain live at history read.

GM21 receives canonical writer/history projection/visibility/receipt interface;
GM23 receives terminal_outbox/audience with resultId/status/contract/version, not a
public event FK or push entitlement. Its consumer delivery/ack policy is separate.
GM26/27/31 receive submit/ACK/retry/result/history/expiry/device cases. Native/UI,
production activation, consumer outbox delivery and project-owner acceptance remain
outside these server checks. Publication is authorized by the user; no Approved/Done or production activation is inferred.


## Main refresh during implementation

GM15 PR140 merged into main5c339cf (also GM40 dependency docs2f91f92).
The candidate branch was rebased onto that main; inherited GM19 code is local
commit204c25f, equivalent to PR141's68e2e07 patch. Remote GM19 PR141 remains open;
no parent PR was pushed/retargeted by this GM20 code-only work. Start-time a6e89fc/
68e2e07 references above remain historical inputs, not the final target revision.
Live gate now waits only for GM19 Needs Update; GM15 is accepted Done. The branch
keeps the new GM40 task/dependency/index metadata from main without reverting it.
