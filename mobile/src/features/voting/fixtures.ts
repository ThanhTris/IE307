import {
  MOCK_DISHES,
  type PoolDish,
  type RoomResult,
} from '../../data/api';

export type VoteScreenScenario = 'success' | 'waiting' | 'error' | 'round_two';

export type FinalScreenScenario = 'waiting' | 'consensus' | 'all_removed' | 'error';

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
