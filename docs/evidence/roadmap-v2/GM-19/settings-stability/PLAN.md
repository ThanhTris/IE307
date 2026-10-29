# GM-19.2 — host settings and stable lobby pools

Requested by Vinh in this conversation on2026-10-29; owner/reviewer metadata
stays Trí/ThanhTris. Start gate is live READY_TO_CLAIM. Branch is stacked on
GM-15 PR140, commit237e5f7, whose base main isa6e89fc; no GM-15 algorithm edits.

Source of scope: issue80 findings dated2026-10-28 and GM-07.B baseline schema.
Internal supplement GM19.2 / schema0.11.1; public wire remains
`dish-session-v4/roadmap-v2/GM-07.B`. No new public request or response fields.

## Patch

1. New migration0034 replaces only the private v4 dispatcher. Require host for
   updateSettings after auth/membership and before version/body mutation.
2. Keep ACK lookup, reference_epoch→room/session lock order and transaction
   paths. Accepted new attempts increment room version once, including no-op;
   replay returns its persisted ACK without a second increment.
3. Only count/meal change can propose another pool from the pinned catalogue.
   Reuse the pinned room seed, independent of accepted time/no-op versions.
   Compare the complete card content by dish ID, excluding generated row IDs;
   identical content keeps the old order/row IDs/poolVersion. DesiredAt and
   currently unsupported preference ranking cannot reroll. Increment poolVersion
   once only for a changed pool. Reject shortage without partial mutation.
4. Keep public routing, v2/v3 implementations, submit/finalize/history/timer and
   existing consent paths unchanged. Do not apply to the app database.

## Tests / handoff

- Extend response-driven v4 HTTP suite, real guest JWTs on owned disposable QA:
  member/outsider denied with unchanged state; host edits; fresh no-op/time-only;
  equivalent offset timestamps; retry/requestId reuse; decimal integer count,
  fractional/unknown field; count/meal changes with and without content change;
  shortage; stale/locked; concurrent duplicate, two edits and start/edit.
- Validate all requests/responses against baseline JSON Schema; capture actual
  assertions, ledger/function hashes and sanitized reports. Keep secrets ignored.
- Run GM-03 QA ownership/worker checks and existing v4 compatibility, legacy
  decision suites, Python regression, repository/index/diff and merge gate.
- Add HTTP examples and CHECKS/HANDOFF, including migration deploy/restore
  boundaries and GM-20 handoff. No app DB reset, packages, native/API acceptance
  fabrication or Project status/approval changes. Open non-draft stacked PR;
  merge140 first, retarget onto refreshed main, then review GM-19.
