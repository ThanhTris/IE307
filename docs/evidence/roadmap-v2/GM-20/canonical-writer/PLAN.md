# GM20.4 — Canonical writer candidate patch/test plan

User Vinh requested code from GM19 branch68e2e07, including GM15 commit237e5f7.
Main isa6e89fc. Live start gate is BLOCKED (GM15/19 Needs Update); user expressly
requested candidate work on the unmerged stack and chose versioned canonical
storage. Integration/merge and Trí's approval remain blocked; do not mark Done.
Read [ADR021](../../../../architecture/decisions/ADR-021-versioned-canonical-writer.md).

## Scope / inputs

Issue81 comment6438978390; GM06.3/schema0.10.0 (0032); current B wire and explicit
B-supplement (PR138); GM15.3 independent102 vectors (PR140); GM19.2/schema0.11.1
(PR141). New forward0035/schema0.12.0; task supplement GM20.4. Old migrations,
contracts, TS domain and stored v2/v3/B results stay pinned. No UI/package changes.

## Patch sequence

1. Closed pure SQL v4 kernel +102-vector parity. Explicit locked roster/pool,
   complete ACKed maps, N0/N1/R2cap, cohort score/tier, seeded Top3 and errors.
2. Versioned capability + isolated ACK namespace, canonical card adapter/row map,
   immutable projection, scoped history/audience/receipt and transactional outbox.
3. New opt-in B-supplement dispatcher, finish worker routing and reader. Default
   creation flag off; original B routing/persisted data retained. No dual-write.
4. Owned disposable QA: baseline B HTTP regression then enable only QA supplement.
   Real guest JWT create/join/start/submit/wait/finalize/result/history; assert
   registry count, canonical authority, row IDs/score/cohort, auth/ACL and source.
5. Races, retry/lost receipt, stale/cap/one candidate/all removed, timeout/host
   majority, catalogue switching, scoped consent/revoke/delete and room cleanup.
   Inject controlled test failure in owned DB, confirm entire transaction rolls back.
6. Repository, Python, Node domain/tooling, diff and final live gate; record actual
   outcomes and remaining consumer/native/production boundaries. Leave working tree
   without auto commit/push/PR unless user requests it.

## Ownership / safety

Vinh owner, Trí reviewer. Use private fixed-search-path security-definer wrappers,
reference_epoch before room/session locks, server auth and membership. Keep ballot,
seed, consent/raw matrices out of DTOs/logs/evidence (synthetic vectors labelled).
No shared DB reset/reconcile or activation. Existing CLI pinned dependencies only.
GM21 receives canonical writer/read contract; GM23 receives outbox references;
GM26/27/31 receive response/retry cases. No reverse dependency to those consumers.


## Main refresh during implementation

GM15 PR140 merged into main5c339cf (also GM40 dependency docs2f91f92).
The candidate branch was rebased onto that main; inherited GM19 code is local
commit204c25f, equivalent to PR141's68e2e07 patch. Remote GM19 PR141 remains open;
no parent PR was pushed/retargeted by this GM20 code-only work. Start-time a6e89fc/
68e2e07 references above remain historical inputs, not the final target revision.
Live gate now waits only for GM19 Needs Update; GM15 is accepted Done. The branch
keeps the new GM40 task/dependency/index metadata from main without reverting it.


User requested publication after implementation on2026-10-29. Prepare a normal
review PR stacked on updated GM19 PR141; keep dependency/ADR merge gate blocked.
This supersedes the earlier working-tree-only instruction, not human approval.
