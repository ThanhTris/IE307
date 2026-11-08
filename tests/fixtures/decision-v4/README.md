# decision-v4 — GM15.3 simulated parity inputs

All102 cases are **synthetic** (`fixtureOnly=true`), isolated from real rooms,
menus and ballots. Input/expected were written without importing the evaluator.
The cap table1..20 is explicit. The cutoff seed golden uses the existing selector
u32 draw1364076727 for seed00000001, index7 in a sorted10-item tie.

Policy `dish-decision-v4/ADR-019-30PCT-MIN1`, evaluator1.0.0, score
`want2-ok1-round1-v1`, ranking `score-desc-dense-rank-v1`.

Each case contains id/spec/input/expected. The input is the initial locked pool
of10–20 stable **dish IDs**, locked roster2–20, current round, full ACKed R1/R2
ballot maps and explicit private seed. Missing member means absent ballot; every
present ballot is complete. No UNSET or partial/draft ballot is accepted. R2 maps
only the derived survivors, even when there is one; zeros removals require a
user-confirmed full KEEP ballot, not a server-synthesized ballot.

`expected.error=INVALID_INPUT` is a cross-runtime validation category. TypeScript
throws RangeError; the parity helper normalizes it. It is not a new RPC error enum.
Other expected objects match the entire private evaluator result. Candidate sets,
eligible IDs and cohort data are test/server internals, never public raw snapshot
fields. GM20 whitelists final output into the versioned DTO under transaction.

Coverage: no ACK/empty intersection/N1 real R2/wait/KEEP/REMOVE; N1..20 cap/zero
REMOVE/over-cap; group remove-all; rosters/cohorts2..20 and R2 late voter; score and
odd/even tier boundaries; R1 rank entire eligible set; seeded cutoff includes winner;
invalid version/member/partial/UNSET/round transitions/preferences. Procedural
node tests add permutation/replay/frozen input,128 seeds, bounds and unsafe shapes.

```sh
node --test mobile/tests/dishPolicyV4.test.mjs
node mobile/scripts/check-dish-v4.mjs --report /tmp/dish-v4-actual.json
# Optional private parity probe; synthetic input only:
node scripts/evaluate_dish_policy_v4.mjs < /tmp/synthetic-v4-input.json
```

Node24 type stripping is not typecheck; mobile npm run typecheck is separate.
GM20 consumes these fixed vectors for SQL parity and checks auth/ACK/clock/quorum/
atomic result/history/event/retry. GM15 does not persist a result or implement
host-majority/timeout permission; supplying a cohort to the pure evaluator is not
authorization to finalize. No SQL/Android/production acceptance is implied.
