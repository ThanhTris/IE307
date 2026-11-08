import { parseCanonicalHistoryPage } from '../../src/features/history/services/historyWireGuard';

const uuid = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const rawDish = {
  dishId: uuid('10'), roundDishId: uuid('20'), name: 'Phở bò', description: null,
  mealSlots: ['lunch'], cuisineIds: [], cuisineLabels: [], categoryIds: [], categoryLabels: [],
  temperature: null, flavor: null, artwork: null, priceReference: null,
};
const result = {
  resultId: uuid('30'),
  contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
  policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
  status: 'DECIDED', round: 2, winner: rawDish, reasonCode: 'ACCEPTABLE_FINAL',
  finalizedAt: '2026-10-18T11:59:00Z', scoreVersion: 'want2-ok1-round1-v1',
  rankingVersion: 'score-desc-dense-rank-v1', round1BallotCount: 3,
  topDishes: [{ dish: rawDish, score: 6, rank: 1, isWinner: true }],
};
const historyPage: any = {
  items: [{
    historyId: uuid('1'), roomId: uuid('2'), resultId: result.resultId, scope: 'personal',
    createdAt: '2026-10-18T12:00:00Z', expiresAt: '2027-10-18T12:00:00Z', result,
  }],
};

describe('canonical history wire validation', () => {
  test('accepts a persisted B-supplement result without changing its winner or score projection', () => {
    const parsed = parseCanonicalHistoryPage(historyPage);
    expect(parsed?.items[0]?.result).toMatchObject({ status: 'DECIDED', round: 2, resultId: result.resultId, winner: { name: 'Phở bò' } });
    expect(parsed?.items[0]?.result).toHaveProperty('topDishes.0.score', 6);
  });

  test('accepts legacy-unscored history while keeping unknown score fields absent', () => {
    const legacy = structuredClone(historyPage);
    legacy.items[0]!.result = {
      capability: 'legacy-unscored-v1', status: 'DECIDED', winner: rawDish,
      reasonCode: null, finalizedAt: '2026-10-18T11:59:00Z',
    };
    const parsed = parseCanonicalHistoryPage(legacy);
    expect(parsed?.items[0]?.result).toMatchObject({ capability: 'legacy-unscored-v1', winner: { name: 'Phở bò' } });
    expect(parsed?.items[0]?.result).not.toHaveProperty('topDishes');
  });

  test('rejects a DECIDED round-one result carrying the round-two reason', () => {
    const malformed = structuredClone(historyPage);
    malformed.items[0]!.result.round = 1;
    expect(parseCanonicalHistoryPage(malformed)).toBeUndefined();
  });

  test('rejects a winner below another dish and rejects a non-dense tie rank', () => {
    const lowerWinner = structuredClone(historyPage);
    const second = { ...rawDish, dishId: uuid('11'), roundDishId: uuid('21'), name: 'Bún bò' };
    lowerWinner.items[0]!.result.topDishes = [
      { dish: second, score: 7, rank: 1, isWinner: false },
      { dish: rawDish, score: 6, rank: 2, isWinner: true },
    ];
    expect(parseCanonicalHistoryPage(lowerWinner)).toBeUndefined();

    const tiedRanks = structuredClone(historyPage);
    tiedRanks.items[0]!.result.topDishes = [
      { dish: rawDish, score: 6, rank: 1, isWinner: true },
      { dish: { ...rawDish, dishId: uuid('12'), roundDishId: uuid('22') }, score: 6, rank: 2, isWinner: false },
    ];
    expect(parseCanonicalHistoryPage(tiedRanks)).toBeUndefined();
  });

  test.each([
    ['missing result ID', { ...historyPage.items[0]!, resultId: undefined }],
    ['numeric result ID', { ...historyPage.items[0]!, resultId: 42 }],
    ['missing mandatory result field', { ...historyPage.items[0]!, result: { ...result, scoreVersion: undefined } }],
    ['extra raw ballot field', { ...historyPage.items[0]!, result: { ...result, rawBallots: [] } }],
  ])('rejects %s before mapping', (_label, item) => {
    expect(parseCanonicalHistoryPage({ items: [item] })).toBeUndefined();
  });

  test('rejects mismatched history/result identity and ballot cohort count', () => {
    const wrongResult = structuredClone(historyPage);
    wrongResult.items[0]!.resultId = uuid('99');
    expect(parseCanonicalHistoryPage(wrongResult)).toBeUndefined();

    const wrongCount = structuredClone(historyPage);
    wrongCount.items[0]!.round1BallotCount = 2;
    expect(parseCanonicalHistoryPage(wrongCount)).toBeUndefined();
  });
});
