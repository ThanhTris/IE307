import type { PoolDish, RoomContext, RoomResult } from '../data/api/contracts';
import type { OfferingState, ResultOffering } from '../features/result/model';

export type WinnerTier = 'PERFECT' | 'CONSENSUS' | 'COMPROMISE';
export type OfferingScenario = Exclude<OfferingState['status'], 'loading' | 'error'> | 'empty'
  | 'loading-initial' | 'loading-refresh' | 'error-initial' | 'error-refresh';
export const resultContext: RoomContext = {
  anchorId: 'anchor_fixture_gm13', anchorName: 'Điểm ăn công cộng mẫu', radiusM: 2000,
  desiredAt: '2030-10-16T05:00:00Z', serviceMode: 'dine_in', mealSlot: 'lunch', avoidRecent: false,
};
export function winnerFixture(tier: WinnerTier = 'PERFECT'): RoomResult {
  const dish: PoolDish = { roundDishId: 'round_dish_fixture_gm13', choiceId: 'choice_fixture_pho', dishId: 'dish_fixture_pho',
    name: 'Phở bò mẫu', cuisineIds: ['vn'], categoryIds: ['noodle_soup'] };
  return { resultId: `result_fixture_gm13_${tier}`, roomId: 'room_fixture_gm13', round: tier === 'PERFECT' ? 1 : 2,
    winnerRoundDishId: dish.roundDishId, winnerDish: dish, reasonCode: tier === 'PERFECT' ? 'UNANIMOUS_WANT' : 'ACCEPTABLE_FINAL',
    matchTier: tier, finalizedAt: '2030-10-16T04:30:00Z', policyVersion: 'decision-v2' };
}
export function noConsensusFixture(reason: 'EMPTY_INTERSECTION' | 'ALL_REMOVED' = 'EMPTY_INTERSECTION'): RoomResult {
  return { resultId: `result_fixture_gm13_${reason}`, roomId: 'room_fixture_gm13_no_consensus', round: reason === 'ALL_REMOVED' ? 2 : 1,
    winnerRoundDishId: null, winnerDish: null, reasonCode: reason, matchTier: 'NO_CONSENSUS',
    finalizedAt: '2030-10-16T04:30:00Z', policyVersion: 'decision-v2' };
}
export function offeringFixture(result: RoomResult, scenario: OfferingScenario = 'ready', refreshed = false): OfferingState {
  const unknown = scenario === 'unknown';
  const initial = scenario === 'loading-initial' || scenario === 'error-initial';
  const status = scenario === 'loading-initial' || scenario === 'loading-refresh' ? 'loading'
    : scenario === 'error-initial' || scenario === 'error-refresh' ? 'error'
      : scenario === 'empty' ? 'ready' : scenario;
  const item: ResultOffering = {
    offeringId: 'offering_fixture_gm13',
    dish: { ...result.winnerDish!, venueId: unknown ? undefined : 'venue_fixture_gm13', venueName: unknown ? undefined : 'Quán phở mẫu',
      venueAddress: unknown ? undefined : scenario === 'changed' ? '24 Đường Minh Họa, điểm bán mẫu mới' : '12 Đường Minh Họa, địa chỉ mẫu',
      distanceM: unknown ? undefined : 650,
      price: { priceMin: unknown ? null : 45000, priceMax: unknown ? null : 65000, currency: unknown ? null : 'VND',
        unit: unknown ? null : 'portion', servingSize: null, sourceRef: unknown ? null : 'Menu tổng hợp GM-13 · không phải giá thật' } },
    source: unknown ? null : 'Fixture GM-13 · nguồn tổng hợp, không xác minh quán thật',
    checkedAt: unknown ? null : '2030-10-15T03:00:00Z',
    schedule: unknown ? null : '10:00–14:00 (UTC+7) · lịch quán và món mẫu',
    availability: scenario === 'closed' ? 'closed' : unknown ? 'unknown' : 'scheduled',
  };
  return { status,
    items: initial || scenario === 'empty' ? [] : [item],
    fetchedAt: initial ? null : scenario === 'stale' ? '2030-10-01T03:00:00Z'
      : refreshed && status !== 'loading' && status !== 'error' ? '2030-10-16T04:32:00Z' : '2030-10-16T04:31:00Z' };
}
