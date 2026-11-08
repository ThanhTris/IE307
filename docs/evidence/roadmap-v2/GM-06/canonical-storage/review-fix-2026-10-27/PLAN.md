# PR136 review-fix plan — 2026-10-27

Review: https://github.com/ThanhTris/IE307/pull/136#issuecomment-6423340169
Reviewed head a7f54d8; current merge target79eb0b9. Owner Tâm, reviewer Trí Pending.
Main is being merged without rewriting pushed history; no commit/push performed.

P1: forward migration0032/schema0.10.0/storageGM06.3, preserve all main migrations
0027..0031 and workflow_call/pinned actions/diagnostics. Confirm unique prefixes,
ledger and populated v4 upgrade/readback/cleanup/revoke/delete/replay, plus fresh
install and regressions. Resolve the workflow conflict by retaining both suites.

Runtime authority remains dish_v4_private: results/history/default_preferences/
room_preferences and the actual writer/RPC on main. gm06_canonical is private,
unwired independent SQL storage only; do not copy live v4 rows, redirect writes,
claim the API uses it, or migrate/backfill already pinned v2/v3/v4 results. Document
this boundary and the explicit integration work still Pending for Trí/producer review.

P2: exact null-safe key checks and strict boolean results/callers in all canonical
validators. Reject SQL NULL, empty/missing/wrong-type prices/card/podium input;
JSON null remains valid unknown price. Reproduce published bug on SQL, then test
full price shape, nullable metadata, every missing/wrong field and storage rejection.

All SQL work is namespace-owned disposable QA. No app DB migration/reset/reconcile,
no public service/provider/package or Project/status/approval mutation.
