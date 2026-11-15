import { type PoolDish, type RoomResult } from '../../data/api';

// Rules live in services/votingRules; re-exported here for the scenario screens.
export { WAITING_DEADLINE_SECONDS, getRoundTwoEliminationCap, isHostEarlyFinishAllowed } from './services/votingRules';

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

/** `count` distinct round-2 candidates built from the mock dishes (ids and names are made unique), for previews and tests. */
export function roundTwoCandidates(count: number): PoolDish[] {
  return Array.from({ length: count }, (_, index) => {
    const base = MOCK_DISHES[index % MOCK_DISHES.length]!;
    const lap = Math.floor(index / MOCK_DISHES.length);
    return { ...base, roundDishId: `${base.roundDishId}_r2_${index}`, choiceId: `${base.choiceId}_r2_${index}`, dishId: `${base.dishId}_${index}`, name: lap ? `${base.name} ${lap + 1}` : base.name };
  });
}

/**
 * Dishes with every field a flashcard can show (photo, description, categories, cuisines, meals, temperature,
 * flavours, origin and price), so the card layout can be reviewed with full content. Used by the dev preview.
 */
export function richFlashcardDishes(): PoolDish[] {
  const rich: Record<string, unknown>[] = [
    { mealSlots: ['breakfast', 'lunch', 'dinner'], origin: 'north', cuisineIds: [], categoryIds: ['14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc'], flavor: { spicy: { present: true, intensity: 'medium' }, salty: { present: true, intensity: 'high' }, sweet: { present: false, intensity: 'none' }, sour: { present: true, intensity: 'low' } } },
    { mealSlots: ['lunch', 'dinner'], origin: 'south', cuisineIds: [], categoryIds: ['e69b5f45-580d-5ee3-9e43-360650b4c650'], flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: true, intensity: 'high' }, sweet: { present: true, intensity: 'medium' }, sour: { present: false, intensity: 'none' } } },
    { mealSlots: ['breakfast', 'lunch'], origin: 'central', cuisineIds: [], categoryIds: ['ac9e12a4-0416-53fc-af30-5b8b11ee0b49'], flavor: { spicy: { present: true, intensity: 'high' }, salty: { present: true, intensity: 'low' }, sweet: { present: false, intensity: 'none' }, sour: { present: true, intensity: 'medium' } } },
  ];
  const snack = { ...MOCK_DISHES[3]!, roundDishId: 'rd_snack', choiceId: 'choice_snack', dishId: 'dish_snack', name: 'Chè khúc bạch', description: 'Chè mát lạnh, khúc bạch mềm, nhãn và hạnh nhân', mealSlots: ['snack'], origin: 'west', cuisineIds: [], categoryIds: ['97c011b2-3d0b-5d4c-92fb-7d05eb6a6538'], temperature: 'cold', flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: false, intensity: 'none' }, sweet: { present: true, intensity: 'high' }, sour: { present: false, intensity: 'none' } } } as unknown as PoolDish;
  return [...rich.map((extra, index) => ({ ...MOCK_DISHES[index]!, ...extra }) as PoolDish), snack];
}
