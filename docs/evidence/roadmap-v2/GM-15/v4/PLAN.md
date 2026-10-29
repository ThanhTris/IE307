# GM15.3 — versioned decision-v4 domain patch/test plan

Vinh requests implementation/PR on2026-10-29; reviewer Trí. Base main a6e89fc.
Start gate READY_TO_CLAIM: GM04/GM07 Done on live Project. No status mutation.
Input: GM07 PR138 B/supplement, ADR019/020, issue76 current supplement. Preserve
v2/v3 source, expected vectors, selection algorithm and pinned SQL migrations.

Add pure TypeScript module dishPolicyV4, policy dish-decision-v4/ADR-019-30PCT-MIN1,
evaluator1.0.0, score want2-ok1-round1-v1, rank score-desc-dense-rank-v1. Locked
roster2–20 and initial pool10–20, only complete server-ACKed ballots are supplied.
Caller (GM20) decides when evaluation is authorized (all/host majority/timeout),
not this pure tally. No clock, entropy, network, persistence or public DTO.

Winner-first R1; exclude every NO; empty→EMPTY_INTERSECTION; remaining1..20→R2.
Cap max(1,floor(.30*N)) with N actual R2 pool; no auto KEEP/finalize or refill.
R2 only removes; score always from R1 cohort. Rank all eligible survivors with
<=3 dense-ranked entries, deterministic tie subset including seeded winner.
Return private candidates and R1 cohort metadata for server mapping, never votes.

Tests/independent JSON vectors: roster/count boundaries, partial/missing/invalid
ballots, invalid R2 transitions, N1..20/cap/over-cap/all-removed, tier/cohort/score,
Top3 cutoff/winner inclusion, deterministic replay/permutation/no mutation, strict
policy/version dispatch and preferences excluded from tally. Keep old tests.
Runner emits input/expected/actual only for clearly simulated fixtures and no
live seed/ballots. CI discovers v4 suite and artifacts. Receive SQL parity vectors
in GM20 later; do not claim SQL/persist/concurrency/Android acceptance here.
