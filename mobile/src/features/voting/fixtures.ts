import { type PoolDish, type RoomResult } from '../../data/api';

/** Sample dishes for the voting screens until the flashcard redesign replaces scenario mode. */
export const MOCK_DISHES: PoolDish[] = [
  {
    roundDishId: 'rd_01',
    choiceId: 'choice_01',
    dishId: 'dish_pho_bo',
    name: 'Phở bò tái nạm',
    description: 'Nước dùng ninh xương 12 tiếng thơm quế hồi, thịt bò tái mềm',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_nuoc'],
    origin: 'north',
    temperature: 'hot',
    priceMin: 55000,
    priceMax: 75000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 55000,
      priceMax: 75000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_pho_phu_vuong',
    venueName: 'Phở Phú Vương',
    venueAddress: '339 Lê Văn Sỹ, Quận 3',
    distanceM: 650,
    artwork: {
      url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Markus Winkler',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'low' },
      sour: { present: false, intensity: 'none' },
    },
  },
  {
    roundDishId: 'rd_02',
    choiceId: 'choice_02',
    dishId: 'dish_com_tam',
    name: 'Cơm tấm sườn bì chả',
    description: 'Sườn nướng than hoa mật ong đậm đà, chả trứng béo ngậy',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_com'],
    origin: 'south',
    temperature: 'warm',
    priceMin: 45000,
    priceMax: 65000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 45000,
      priceMax: 65000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_com_tam_ba_ghien',
    venueName: 'Cơm Tấm Ba Ghiền',
    venueAddress: '84 Đặng Văn Ngữ, Phú Nhuận',
    distanceM: 1200,
    artwork: {
      url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Thu Nguyen',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'medium' },
      sour: { present: false, intensity: 'none' },
    },
  },
  {
    roundDishId: 'rd_03',
    choiceId: 'choice_03',
    dishId: 'dish_bun_cha',
    name: 'Bún chả Hà Nội',
    description: 'Chả viên nướng xém cạnh, chả miếng thơm lừng cùng nước mắm chua ngọt',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_nuoc'],
    origin: 'north',
    temperature: 'warm',
    priceMin: 50000,
    priceMax: 65000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 50000,
      priceMax: 65000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_bun_cha_145',
    venueName: 'Bún Chả 145 Bùi Viện',
    venueAddress: '145 Bùi Viện, Quận 1',
    distanceM: 950,
    artwork: {
      url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Manki Kim',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'medium' },
      sour: { present: true, intensity: 'medium' },
    },
  },
  {
    roundDishId: 'rd_04',
    choiceId: 'choice_04',
    dishId: 'dish_bun_dau',
    name: 'Bún đậu mắm tôm thập cẩm',
    description: 'Đậu mơ rán giòn vỏ mềm trong, chả cốm nóng hổi, thịt bắp luộc',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_an_vat'],
    origin: 'north',
    temperature: 'warm',
    priceMin: 55000,
    priceMax: 70000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 55000,
      priceMax: 70000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_bun_dau_a_chanh',
    venueName: 'Bún Đậu A Chảnh',
    venueAddress: '175 Thành Thái, Quận 10',
    distanceM: 1400,
    artwork: {
      url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Dan Gold',
    },
    flavor: {
      spicy: { present: true, intensity: 'medium' },
      salty: { present: true, intensity: 'high' },
      sweet: { present: true, intensity: 'low' },
      sour: { present: true, intensity: 'medium' },
    },
  },
];

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
