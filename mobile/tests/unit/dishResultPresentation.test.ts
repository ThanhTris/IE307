import { dishResultFixture, resultCaseOptions, scoredResultFixture } from '../../src/bootstrap/dishResultFixtures';
import { resultPrice, validScoredResult } from '../../src/features/result/services/resultPresentation';

test.each(resultCaseOptions.filter(item => item.id !== 'legacy' && item.id !== 'invalid').map(item => item.id))('fixture %s is a valid immutable result projection', id => {
  const input = scoredResultFixture(id), before = JSON.stringify(input);
  expect(validScoredResult(input)).toBe(true); expect(JSON.stringify(input)).toBe(before);
});
test('rejects wrong cohort, dense rank, duplicate IDs, missing winner and altered locked winner', () => {
  const good = scoredResultFixture();
  expect(validScoredResult(scoredResultFixture('invalid'))).toBe(false);
  expect(validScoredResult({ ...good, round1BallotCount: 2 })).toBe(false);
  expect(validScoredResult({ ...good, topDishes: good.topDishes.map(item => ({ ...item, isWinner: false })) })).toBe(false);
  expect(validScoredResult({ ...good, winner: { ...good.winner!, description: 'changed' } })).toBe(false);
  expect(validScoredResult({ ...good, topDishes: [good.topDishes[0]!, good.topDishes[0]!] })).toBe(false);
  const tied = scoredResultFixture('tie-first');
  expect(validScoredResult({ ...tied, topDishes: tied.topDishes.map((item, i) => ({ ...item, rank: i + 1 })) })).toBe(false);
});
test('baseline B can omit cohort while supplement cannot; legacy never fabricates a podium', () => {
  const { round1BallotCount: omitted, ...base } = scoredResultFixture();
  expect(omitted).toBe(3);
  expect(validScoredResult(base)).toBe(false);
  expect(validScoredResult({ ...base, contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B' })).toBe(true);
  expect(dishResultFixture('legacy').input.result).not.toHaveProperty('topDishes');
});
test('NO_CONSENSUS cannot carry a winner, podium or wrong round reason', () => {
  const value = scoredResultFixture('empty-r1');
  expect(validScoredResult({ ...value, round: 2 })).toBe(false);
  expect(validScoredResult({ ...value, topDishes: scoredResultFixture().topDishes })).toBe(false);
  expect(validScoredResult({ ...value, winner: scoredResultFixture().winner })).toBe(false);
});
test('price preserves observed units and hides unknown or unproven price', () => {
  const dish = scoredResultFixture().winner!;
  expect(resultPrice(dish)).toBeNull();
  const priceReference = { amount: 120000, currency: 'VND', unit: 'group', servingSize: '2 người', sourceRef: 'Menu', checkedAt: '2026-11-03T05:00:00Z' };
  expect(resultPrice({ ...dish, priceReference })).toContain('120.000 VND / phần nhóm');
  expect(resultPrice({ ...dish, priceReference: { ...priceReference, checkedAt: 'invalid' } })).toBeNull();
});
