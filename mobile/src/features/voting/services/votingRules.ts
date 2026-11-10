/** Product rules for voting rounds, shared by the live repositories and the screens. */

/**
 * Calculates Round 2 elimination cap according to product spec:
 * cap = max(1, floor(0.30 * N)), applying even for N=1.
 */
export function getRoundTwoEliminationCap(candidateCount: number): number {
  if (candidateCount <= 0) return 0;
  return Math.max(1, Math.floor(0.30 * candidateCount));
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
