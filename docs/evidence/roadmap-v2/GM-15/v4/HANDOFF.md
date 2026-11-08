# GM15.3 — decision-v4 handoff

Owner Vinh; reviewer Trí. Main input a6e89fcc00fad2ad2c3cef9c0599cdabf7c035f7
(PR138 contract + PR139 catalogue), branch codex/gm-15-v4-domain. New revision is
for review; no Approved/Done or Project update. Existing v2/v3 remain byte-identical.

## Contract and entry points

- Pure module [dishPolicyV4](../../../../../mobile/src/domain/decision/dishPolicyV4.ts):
  `decideDishSessionV4(unknown)` and `removalCapV4(N)`.
- Task supplement **GM15.3**, policy **dish-decision-v4/ADR-019-30PCT-MIN1**,
  evaluator1.0.0; same established selector u32-murmur3-rejection-v1. Score/rank
  version constants match ADR020/GM07.B. Nothing globally redirects old evaluators.
- [Fixed JSON vectors](../../../../../tests/fixtures/decision-v4/cases.json) / [guide](../../../../../tests/fixtures/decision-v4/README.md),
  [Node tests](../../../../../mobile/tests/dishPolicyV4.test.mjs),
  [report runner](../../../../../mobile/scripts/check-dish-v4.mjs),
  [private CLI](../../../../../scripts/evaluate_dish_policy_v4.mjs).
- [Actual input–expected–actual](vector-results.json), [checks](CHECKS.md),
  [plan](PLAN.md), [manifest](MANIFEST.json) pin tested content, not runtime deployment.

Input requires exactly policyVersion/roster/pool/round/round1/round2/seed. Pool is
initial10–20 unique stable dish IDs, roster2–20. Generic IDs are case-sensitive and
opaque; runtime SQL uses its canonical UUID strings. Selector/order use existing
binary JavaScript string sorting; GM20 maps the exact UUID identities to SQL C order.
Aliases/menu variants/roundDishIds do not become additional dishes. R2 derives
survivors from initial pool and R1 NO, and accepts votes only for that set.

Only server-ACKed **complete** ballots belong in the maps. Absent ballots stay
absent; a partial/UNSET/wrong-scope map throws RangeError without vote data in its
message. Empty current-round participation waits. No member gets implicit KEEP.
An R2 snapshot following a unanimous/empty/no-ACK R1 is invalid. R1 winner-first,
empty intersection ends, otherwise every nonempty set opens R2. R2 per-member
cap=max(1,floor(.30*N)), zero removals valid, group removal can empty the pool.
R2 affects eligibility only. Scores are2WANT+OK across the explicit R1 cohort.

Outputs are a discriminated union: WAITING/ROUND_2 (no terminal), DECIDED (winner,
reason/tier, score/rank versions and Top3), NO_CONSENSUS (null winner/versions,
empty podium, reason). `round1BallotCount` is the scoring cohort; tier uses it, not
roster size or R2 submitted count. Top3 ranks **all** final eligible dishes, takes
up to3 deterministically, ensures the seeded highest-score winner is included and
returns dense ranks. R1 unanimous still ranks other eligible dishes below winner.
The engine neither generates seeds nor claims deterministic seeds are secure RNG.

## Receiving GM20, without dependency inversion

GM20 receives the policy function and independent102 vectors for new SQL parity.
Server caller must authorize evaluation under room lock (ALL, host majority after
waiting, or timeout with>=1 ballot), derive identity/round/pool, retain locked cards,
provide private secure seed and persist result **once**. This pure function doesn't
wait for all roster members before tallying a permitted partial cohort. It cannot
be used as an RPC permission check. Missing/partial client drafts must not be
relabeled as accepted server maps.

Map stable dishId into the final round's locked card/roundDishId. Preserve fixed
resultId, winner, Top3 order/scores/ranks, policy/score/rank versions, R1 cohort and
consent/history/event references in the chosen authoritative storage transaction.
`round1BallotCount` supports the explicit B-supplement field; it does not switch
public contractVersion from baseline B or deploy that supplement by itself.
The output is private and includes candidate/eligible sets: whitelist allowed
terminal fields, never serialize the entire evaluator object as a public DTO.

GM19 (Trí) remains needed for GM20's lifecycle start gate: host settings guard and
stable pool for no-op/time changes, with real HTTP/race evidence and Done on Project.
GM15 has no reverse dependency on GM20; downstream SQL/persist/race/parity is not
claimed by these domain tests. GM20 storage/authority/ID/FK review remains its own
scope; no SQL migration/API/history or mobile UI was changed in this PR.

## Reproduce

Node24 and Python>=3.11 for existing repository tests; install only locked tooling:

```sh
npm ci --prefix mobile --no-audit --no-fund
node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs mobile/tests/dishPolicy.test.mjs mobile/tests/dishPolicyV4.test.mjs
node mobile/scripts/check-decision.mjs --report /tmp/decision-actual.json
node mobile/scripts/check-dish-v4.mjs --report /tmp/dish-v4-actual.json
npm run typecheck --prefix mobile
npm run lint --prefix mobile
npm test --prefix mobile -- --watch=false
npm run check:architecture --prefix mobile
python3 -m pip install -r scripts/ci-requirements.txt
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
```

No new package/lockfile, DB reset, API/GPT call, production activation or Android
UI flow. Mobile tooling verification is not a device test. Trí reviews the final
PR revision/manifest and sets acceptance; checker only confirms upstream gate.
