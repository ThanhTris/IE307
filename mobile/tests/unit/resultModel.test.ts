import { belongsToWinner, distanceLabel, isWinnerResult, noConsensusReason, priceLabel, publicTarget, timeLabel } from '../../src/features/result/model';
import { noConsensusFixture, offeringFixture, resultContext, winnerFixture } from '../../src/bootstrap/resultFixtures';
import { decideWithSeed, type RoundOneVote } from '../../src/domain/decision';
import { selectedResultFields } from '../../src/domain/decision/choiceMapping';

test.each(['PERFECT', 'CONSENSUS', 'COMPROMISE'] as const)('accepts finalized %s without selecting a winner', tier => {
  const result = winnerFixture(tier);
  expect(isWinnerResult(result)).toBe(true);
  expect(noConsensusReason(result)).toBeNull();
  expect(result.winnerDish?.roundDishId).toBe(result.winnerRoundDishId);
});
test('rejects inconsistent result vocabulary and never substitutes the first dish', () => {
  const result = winnerFixture();
  expect(isWinnerResult(null)).toBe(false);
  expect(isWinnerResult({ ...result, winnerRoundDishId: 'another-row' })).toBe(false);
  expect(isWinnerResult({ ...result, reasonCode: 'ALL_REMOVED' })).toBe(false);
  expect(isWinnerResult({ ...result, round: 2 })).toBe(false);
  expect(isWinnerResult(noConsensusFixture())).toBe(false);
  expect(noConsensusReason({ ...noConsensusFixture(), winnerDish: result.winnerDish })).toBeNull();
});
test.each(['EMPTY_INTERSECTION', 'ALL_REMOVED'] as const)('no consensus %s has no winner', reason => {
  const result = noConsensusFixture(reason);
  expect(noConsensusReason(result)).not.toBeNull();
  expect(result.winnerDish).toBeNull();
  expect(result.winnerRoundDishId).toBeNull();
});
test.each(['PERFECT', 'CONSENSUS', 'COMPROMISE'] as const)('fixture %s agrees with the domain on synthetic ballots containing a vetoed alternative', tier => {
  // Ballots and the selector are test-only, never passed to the result screens.
  const result = winnerFixture(tier);
  const winner = result.winnerDish!;
  const roster = ['a', 'b', 'c', 'd'];
  const votes: Record<typeof tier, RoundOneVote[]> = { PERFECT: ['WANT', 'WANT', 'WANT', 'WANT'], CONSENSUS: ['WANT', 'WANT', 'WANT', 'OK'], COMPROMISE: ['WANT', 'WANT', 'OK', 'OK'] };
  const round1 = Object.fromEntries(roster.map((member, i) => [member, { [winner.choiceId]: votes[tier][i], vetoed: i === 3 ? 'NO' : 'WANT' }]));
  const round2 = Object.fromEntries(roster.map(member => [member, { [winner.choiceId]: 'KEEP' }]));
  const selected = decideWithSeed({ policyVersion: 'decision-v2', round: result.round, roster, pool: [winner.choiceId, 'vetoed'],
    round1, ...(result.round === 2 ? { round2 } : {}), seed: '00000001' });
  expect(selectedResultFields(selected, [{ roundDishId: winner.roundDishId, choiceId: winner.choiceId }, { roundDishId: 'vetoed-row', choiceId: 'vetoed' }]))
    .toEqual({ winnerRoundDishId: result.winnerRoundDishId, matchTier: result.matchTier, reasonCode: result.reasonCode, policyVersion: 'decision-v2' });
});
test('keeps offering identity scoped to the exact winning choice and public anchor', () => {
  const result = winnerFixture();
  const offering = offeringFixture(result).items[0]!;
  expect(publicTarget(offering, result, resultContext)).toEqual({ roomId: result.roomId, resultId: result.resultId,
    winnerRoundDishId: result.winnerRoundDishId, choiceId: result.winnerDish!.choiceId, dishId: result.winnerDish!.dishId,
    offeringId: offering.offeringId, venueId: offering.dish.venueId, venueName: offering.dish.venueName,
    address: offering.dish.venueAddress, anchorId: resultContext.anchorId });
  const wrongChoice = { ...offering, dish: { ...offering.dish, choiceId: 'other-variant' } };
  expect(belongsToWinner(wrongChoice, result)).toBe(false);
  expect(publicTarget(wrongChoice, result, resultContext)).toBeNull();
  expect(publicTarget(offering, result, null)).toBeNull();
  expect(publicTarget(offeringFixture(result, 'unknown').items[0]!, result, resultContext)).toBeNull();
});
test('price formatter preserves zero, missing endpoints, unknown units, currency and group portions', () => {
  const dish = offeringFixture(winnerFixture()).items[0]!.dish;
  expect(priceLabel({ ...dish, price: { priceMin: 0, priceMax: 0, currency: 'VND', unit: 'portion', servingSize: null } })).toContain('0 VND / phần');
  expect(priceLabel({ ...dish, price: { priceMin: 120000, priceMax: null, currency: 'VND', unit: 'group', servingSize: '2–3 người' } })).toContain('Từ 120.000 VND / phần nhóm · 2–3 người');
  expect(priceLabel({ ...dish, price: { priceMin: null, priceMax: 50000, currency: null, unit: null, servingSize: null } })).toContain('Đến 50.000 (chưa rõ tiền tệ) / đơn vị chưa rõ');
  expect(priceLabel({ ...dish, price: { priceMin: null, priceMax: null, currency: 'VND', unit: 'portion', servingSize: null } })).toBe('Chưa có giá');
  expect(priceLabel({ ...dish, price: { priceMin: 50000, priceMax: 40000, currency: 'VND', unit: 'portion', servingSize: null } })).toBe('Chưa có giá');
});
test('distance and date do not turn unknown into zero/current time', () => {
  expect(distanceLabel(0)).toContain('0 m đường chim bay');
  expect(distanceLabel(1500)).toContain('1,5 km');
  expect(distanceLabel(undefined)).toBe('Chưa rõ khoảng cách');
  expect(distanceLabel(-1)).toBe('Chưa rõ khoảng cách');
  expect(timeLabel(null)).toBe('Chưa rõ');
  expect(timeLabel('bad-date')).toBe('Chưa rõ');
  expect(timeLabel('2030-10-16T05:00:00Z')).toContain('12:00:00');
});
