/** Product rules for voting rounds, shared by the live repositories and the screens. */

/**
 * Round 2 removal limit (ADR-023): 30% of the candidates rounded UP, at least 1.
 * 1-3 dishes -> 1, 4-6 -> 2, 7-10 -> 3, 11 -> 4 ... 20 -> 6. Integer maths ((3N+9)/10) avoids float rounding.
 */
export function getRoundTwoEliminationCap(candidateCount: number): number {
  if (candidateCount <= 0) return 0;
  return Math.max(1, Math.floor((3 * candidateCount + 9) / 10));
}

/**
 * Validates whether the host can finish the waiting period early:
 * Only permitted when strictly more than half of the locked roster has acknowledged ballots:
 * A_r > M / 2, equivalent to A_r >= floor(M / 2) + 1.
 * Exactly half is blocked.
 */
export function isHostEarlyFinishAllowed(acknowledgedCount: number, totalRosterCount: number): boolean {
  if (totalRosterCount <= 0) return false;
  return acknowledgedCount > totalRosterCount / 2;
}

/**
 * Default countdown duration in seconds from the first valid entry into waiting state.
 */
export const WAITING_DEADLINE_SECONDS = 60;
