# ADR-021 — Version-pinned canonical writer candidate

Status: Proposed for Trí review. Vinh requested this implementation choice in the
conversation2026-10-29; this is not project-owner approval or Project Done.
Source: issue81 comment6438978390, GM06.3/0032, GM07.B and B-supplement/PR138,
GM15.3/PR140 and GM19.2/PR141. Candidate branch stacks on68e2e07.

## Choice implemented for QA review

- Existing unversioned/v2/v3/B rooms and results retain their existing authority.
  New `dish-session-v4/roadmap-v2/GM-07.B-supplement` sessions pin GM06.3 canonical
  storage at creation. There is no backfill, copied result or dual registry insert.
- A private server flag defaults off for new supplement creation; disabling it
  later does not orphan readers or the worker for already-pinned sessions. QA
  enables it on its owned DB. No application DB migration/activation is authorized.
- Canonical results, members, history receipts/audience and a private transactional
  outbox are inserted in the terminal transaction. Canonical's existing registry
  trigger alone reserves the same result UUID returned by the API. Existing B
  public events/inbox remain their own pinned path; GM23 receives the new outbox.
- Operational shared v4 rows remain a bridge; a private capability row pins the
  new authority and separate ACK namespace. The legacy session result_id FK is
  never made nullable without rules or pointed at an incompatible result table.
- Initial10–20 locked cards remain in canonical storage. Final-round row IDs are
  separately pinned to the canonical result, allowing R2 winner/podium readback
  after room cleanup. No current catalogue/price lookup during result/history read.
- Price checkedAt↔observedAt conversion is explicit; nullable metadata is not
  invented. Legacy DTO shape remains pinned. Cohort R1 metadata is supplied only
  through the already defined B-supplement. NO_CONSENSUS has no winner/podium.
- Secure independent selector seed is private and generated once for terminal;
  evaluate/score/Top3 follow the independent GM15 vectors. Neither poolSeed nor
  client entropy is accepted as terminal seed. Quorum/timer are transaction guards.

## Rollout and recovery boundaries

Trí reviews authority/ID/ACL mapping and the candidate revision before integration.
Live gate remains BLOCKED while GM15/19 are Needs Update. Vinh explicitly asked to
continue candidate QA work from their unmerged stack; no status/gate metadata is
changed. Before a shared deployment, inspect ledger/definitions/collision objects,
get a reviewed backup/restore plan and refresh main/migration numbering. Roll back
new creation via the flag while retaining readers/writer for pinned sessions; no
reverting result IDs, rewriting stored results, backfill or deleting retained data.
