# GM06.3 review-fix plan — 2026-10-27

Owner Tâm; reviewer Trí Pending. Published PR136 head a7f54d8; target main79eb0b9.
Current plan: [dated reviewer mapping](review-fix-2026-10-27/PLAN.md).
The previous GM06.2 plan is retained as previous-PLAN.md in that folder.

1. Receive main without rewriting pushed history; preserve main0027..0031 and CI
   workflow_call, action pins, diagnostics and artifacts.
2. Use forward0032/schema0.10.0/GM06.3, with corresponding runner/down/docs/manifest.
   Reproduce old23505 and validator NULL bypass; no ledger suppression.
3. Strict exact keys/boolean predicates and callers; regression{}, missing/wrong
   fields, SQL NULL, JSON null and nullable metadata, nested pool/storage checks.
4. Keep existing dish_v4_private as actual API authority; document independent model
   boundary and adapter still missing. Preserve existing v4 results/history/consent.
5. Actual fresh install, populated v4 upgrade/readback/cleanup/revoke/delete/replay,
   QA rollback/reapply, legacy history/schema, pinned v2 parity, v3 SQL/HTTP and
   fresh v4 HTTP using its own database/network/new credentials; required validators.
6. No app DB reset/reconcile/deploy, production data, new provider/package, Project
   status/approval change or self-merge. Trí reviews current revision after push.
