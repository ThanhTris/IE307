import {
  MOCK_DISHES,
  type PoolDish,
  type RoomResult,
} from '../../data/api';

export type VoteScreenScenario = 'round_two' | 'waiting' | 'success' | 'error';

export type FinalScreenScenario = 'consensus' | 'waiting' | 'all_removed' | 'error';

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

/**
 * Contenders for Round 2 in demo/fixtures.
 * Specifically dishes #1 (Phở Bò) and #3 (Bún Chả Hà Nội) from MOCK_DISHES
 * so the pool is realistic and distinct.
 */
export const FIXTURE_ROUND_TWO_CANDIDATES: PoolDish[] = [
  MOCK_DISHES[0]!, // Phở Bò Tái Lăn
  MOCK_DISHES[2]!, // Bún Chả Hà Nội Đào Duy Từ
];

/**
 * Fixture candidate pools for AC verification across N=1, 3, 4, 10.
 */
export const FIXTURE_CANDIDATES_N1: PoolDish[] = [MOCK_DISHES[0]!];
export const FIXTURE_CANDIDATES_N3: PoolDish[] = MOCK_DISHES.slice(0, 3);
export const FIXTURE_CANDIDATES_N4: PoolDish[] = MOCK_DISHES.slice(0, 4);
export const FIXTURE_CANDIDATES_N10: PoolDish[] = MOCK_DISHES.slice(0, 10);

/**
 * Fixture result for Round 2 where winner is dish #2 (Bún Chả),
 * proving the screen does NOT blindly pick the first candidate or first KEEP dish.
 */
export const FIXTURE_ROUND_TWO_CONSENSUS_RESULT: RoomResult = {
  resultId: 'res_gm12_consensus_buncha',
  roomId: 'room_demo_gm12',
  round: 2,
  winnerRoundDishId: MOCK_DISHES[2]!.roundDishId,
  winnerDish: MOCK_DISHES[2]!,
  reasonCode: 'ACCEPTABLE_FINAL',
  matchTier: 'CONSENSUS',
  finalizedAt: new Date().toISOString(),
  policyVersion: 'decision-v2',
};

/**
 * Fixture result for Round 2 where all contenders were eliminated by members.
 */
export const FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT: RoomResult = {
  resultId: 'res_gm12_all_removed',
  roomId: 'room_demo_gm12',
  round: 2,
  winnerRoundDishId: null,
  winnerDish: null,
  reasonCode: 'ALL_REMOVED',
  matchTier: 'NO_CONSENSUS',
  finalizedAt: new Date().toISOString(),
  policyVersion: 'decision-v2',
};

/**
 * Helper to simulate an async deferred mock request with configurable outcome.
 */
export async function simulateDeferredRequest<T>(
  data: T,
  options: {
    delayMs?: number;
    shouldFail?: boolean;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { delayMs = 0, shouldFail = false, errorMessage = 'Mô phỏng lỗi kết nối máy chủ.' } = options;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (shouldFail) {
    throw new Error(errorMessage);
  }
  return data;
}
