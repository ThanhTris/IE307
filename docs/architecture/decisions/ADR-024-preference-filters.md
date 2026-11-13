# ADR-024 — Preference filters: soft ranking at start, 5–20 dishes

- Status: **Accepted by the project owner in chat on 2026-11-13** (to be re-confirmed by Trí in review).
- Scope: canonical B-supplement runtime (`gm20_canonical_private`, contract `GM-07.B-supplement`), new and in-flight
  lobbies. The baseline B dispatcher (`dish_v4_private.dispatch`) and pinned v2/v3 sessions are unchanged.
- Runtime: `0050_preference_ranking.sql` (schema 0.26.0), applied to the local QA database only.

## Context

The preferences screen now offers dish groups (6 for main meals, 8 for "Ăn vặt"), four regions and six flavours.
Until now the server stored preferences but never used them: the pool was a seeded random draw by meal
(`pool_for`), so choosing "Cơm" changed nothing. When a meal has fewer dishes than requested, the app offers
"Dùng N món", which needs rooms below 10 dishes.

## Decision

1. **Soft ranking at start.** When the host starts, round 1 is drawn again from the pinned catalogue, same meal, count
   and seed. Each dish scores the sum, over the locked roster, of the preference dimensions it matches
   (`preference_match`): a shared dish group, the chosen region equal to the dish `origin`, each of Cay / Chua / Ngọt
   wanted and present, salty high (Mặn / Đậm đà) or low (Thanh đạm), and the Béo / Ngậy tag. The top dishes by score
   form the pool; ties and unmatched dishes keep the seeded order; the pool is shown in seeded order. Every member
   weighs the same, the host has no extra weight, and ranking is separate from WANT/OK/NO and the decision policy.
   Missing dish data matches nothing and is never guessed. If the drawn pool differs, `poolVersion` increases with the
   start. Lobby screens do not show the pool, so nobody sees a pool change.
2. **5–20 dishes.** `dishCount` accepts 5..20 (create, updateSettings, stored session, decision model, stored-result
   check). The client stepper still offers 10..20; 5..9 comes only from accepting a shortage.
3. **Region field.** Cards carry `origin` (`north`, `central`, `south`, `west`, or null). Stored results drop it to keep
   the GM-06 card shape.
4. **Placeholder taxonomy.** Groups and regions without catalogue entries use stable uuid5 IDs
   (`gicungduoc:ui:<code>`); the data team keeps these IDs when it adds them to the taxonomy. Béo / Ngậy rides in
   `categoryIds` until the flavour contract gets a field.

## Consequences

- With today's data (origin 1/39, flavour 0/39) ranking works mainly on dish groups; it improves as data is filled
  (see `docs/data/DISH_FILTER_DATA_REQUIREMENTS.md`).
- The domain evaluator `decideDishSessionV4` accepts pools of 5..20 to stay in parity with SQL.
- Not run: SQL/domain parity CI (`scripts/dish_v4_ci.py`, `scripts/gm20_canonical_check.py`). Evidence: QA e2e
  `.work/e2e/30-test-preference-ranking.mjs` (range, matching units, ranking at start, a 5-dish room to a decided
  result), plus regression runs of the tie-break and round-2 cap scripts.
