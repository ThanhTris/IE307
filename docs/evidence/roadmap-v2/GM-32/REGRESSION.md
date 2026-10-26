# GM-32 — v4 consent/history regression handoff (2026-10-26)

This supplement records a local QA candidate regression run for migration 0029; it does not mark GM-32 or producer tasks Done, approved, merged, or deployed.

## Inputs

- Repository baseline: `main` at `dd12cd7d75d651726f27507746fc703daf114500`.
- Local candidate: migrations 0027, 0028 and 0029; contract `dish-session-v4/roadmap-v2/GM-07.B`, policy `dish-decision-v4/ADR-019-30PCT-MIN1`, schema 0.9.1.
- Owned QA: project `ie307-dish-v4-qa-20261026`, loopback API 54361, DB 54362. Application DB unchanged.
- Data: active 20-item synthetic fixture only for positive flow; real release remains 39 draft/test-demo items and reports dinner 7, snack 1. No production publication.

## Reproduce

1. Confirm Docker labels/ownership and ports before use; verify migration ledger, schema registry, actual function definitions and worker heartbeat.
2. Start/verify only the named QA project using the repository's owned local setup. Apply migrations forward; do not reset the application DB.
3. Run `node scripts/gm_v4_http_check.mjs` for real Auth+REST checks. In Bruno select `Local.private` under `supabase/tests/bruno/GM-07B` and run all requests sequentially. Run GM-40 catalogue shortage collection separately.
4. Inspect `review-results/dish-v4-qa-20261026/api-check-results.json` and `bruno-qa-summary.md`; those files contain local run output and remain ignored.

## Actual local candidate results

- Direct real-HTTP regression: 82/82 assertions passed, including personal-only/group-only, missing group consent, lobby opt-in before start, no retroactive grant after start, and revoke before finalize.
- Bruno BE Core: 26/26 passed after applying migration 0029. Request 25 returned a history item for the finalized room with the persisted result ID and capped Top 3; prior 25/26 failure is retained in the local report for traceability.
- GM-40 catalogue collection: prior same-day run 3/3 passed; those checks are separate from the positive synthetic room fixture.
- Worker verifier accepted schema 0.9.1 and definitions from 0029. PostgreSQL applied the forward migration to the owned QA project.
- GM-20 and GM-22 old runners: Not run. Their current setup targets `supabase_db_gi-cung-duoc-local` via the repository-root Supabase project, not the owned QA container. Pointing them there would violate this run's QA isolation. Legacy v2/v3 runtime regression therefore remains unverified by this supplement.
- Android/device, FE/API integration, remote CI, production DB and human review: Not run.

These outputs demonstrate only the local candidate and exact tested revision. Review the diff and rerun the suites on the PR/merge target before accepting it.
