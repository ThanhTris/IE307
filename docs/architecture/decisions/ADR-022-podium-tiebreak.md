# ADR-022 — Podium tie-break by decision time

- Status: **Accepted by the project owner in chat on 2026-11-12** (to be re-confirmed by Trí in review).
- Scope: new sessions on the live runtimes (B and B-supplement). Existing stored results keep their order. Amends ADR-020 decisions 4 and 5 for ordering and winner choice only.
- Runtime: migrations `0047_dish_v4_podium_tiebreak.sql` (baseline B path, pace storage, helpers) and `0048_canonical_podium_tiebreak.sql` (B-supplement / canonical path). Applied to the local QA database only.

## Context

Equal scores shared one podium rank, so the result screen needed layouts with two or three dishes on one pedestal. They looked poor and the group still saw no clear order. Other apps (PlayFab, Nakama, Qstream, Quizzory, Social Point) break ties with time: the one who reached the score first, or decided faster, ranks higher. In this app the thing ranked is a dish, and every voter sends one ballot for all dishes, so "who submitted first" says nothing about a dish. The only per-dish time is how long a person looked at each flashcard before choosing.

## Decisions

1. **Order of dishes with the same score:** (1) score `2×WANT + OK`, (2) more WANT votes, (3) shorter average decision time, a missing time sorts last, (4) the winner, (5) dish id.
   - Step 2 is an explicit guard only. Among dishes nobody voted NO on, score = voters + WANT votes, so equal score already implies equal WANT count.
2. **Winner:** the head of that chain. The seeded draw (`gm20_private.select_winner`) is used only for dishes that are still completely tied (same score, same average time or both without time). `evaluate_v4` is unchanged; `apply_tiebreak` re-orders its decision after it.
3. **Decision time:** the client measures milliseconds from showing a flashcard to the choice and sends `pace: [{ roundDishId, ms }]` with a round-1 `submit`. Round 2 and list mode send none.
   - `public.dish_session` strips `pace` before the pinned handler runs, so the wire contract, the strict key check and the idempotent payload hash are unchanged; replays with another `pace` return the original answer.
   - Values are stored in `dish_v4_private.ballot_pace` (private, row security forced, deleted with the ballot), clamped to 0–60 000 ms, mapped to dish ids through the locked pool. Anything malformed is ignored and never fails the vote.
   - The time is client-measured, so it can be faked. It only orders dishes that already have equal scores and never changes scores or eligibility.
4. **Ranks and wire:** unchanged. Ranks stay dense by score, `scoreVersion` and `rankingVersion` keep their values, and `topDishes` keeps its shape and still satisfies `gm06_canonical.valid_terminal`. What changes is the **order** of `topDishes` and which tied dish is the winner.
5. **Presentation:** the result and history screens give each dish its own place (1, 2, 3) from that order (`podiumOrder`, winner first within equal scores) and add one line "Đồng điểm: xếp theo số lượt Muốn ăn, rồi tốc độ chọn." when scores are tied. Layouts with several dishes on one pedestal are removed.

## Not changed

- `gm20_canonical_private.evaluate_v4`, the domain evaluator `dishPolicyV4.ts` and their parity fixtures: they remain the pure decision model with the old tie order. A decision made through the live path can therefore differ from the model only in which tied dish wins and in the order of equal scores.
- The ranking version label. A later ADR may introduce a new label if clients need to tell the two orders apart.
- Results already stored. Ranks in them are dense by score; the client's `podiumOrder` puts the winner first inside a tie.

## Evidence

- `.work/e2e/28-test-tiebreak.mjs` (not in git): three players, three dishes at 4 points with different decision times, malformed `pace`, replay with another `pace`. Result on the QA backend: the fastest dish wins and leads, order follows time, ranks stay dense, 14/14 checks pass.
- SQL check of `dense_podium` and `pace_ms` on synthetic ballots (rolled back).
- Jest: `podiumOrder.test.ts`, `voteRepository.test.ts` (pace payload), `dishResultPodium.test.tsx`, `liveDishResultScreen.test.tsx`.
- Not run: real devices, SQL/domain parity CI (`scripts/dish_v4_ci.py`, `scripts/gm20_canonical_check.py`) which needs its own QA project.
