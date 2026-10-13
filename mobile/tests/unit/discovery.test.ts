import { createDiscoveryApi } from '../../src/data/discovery';
import type { ApiClient, PoolDish, PreviewFoodPoolResponse } from '../../src/data/api/contracts';
const request = { anchorId: 'anchor', radiusM: 1000, desiredAt: '2026-10-14T05:00:00Z', mealSlot: 'lunch' as const, serviceMode: 'dine_in' as const };
const one = { roundDishId: 'round', choiceId: 'choice', dishId: 'dish', name: 'Synthetic', cuisineIds: [], categoryIds: [], offeringIds: ['offer'], availability: 'scheduled' };
const preview = { pool: [one], datasetVersion: '0.4.1', eligibilityVersion: 'gm18-eligibility-1.0.0', evaluatedAt: '2026-10-13T05:00:00Z', totalCandidateCount: 1, poolSeed: 'seed', policyVersion: 'gm18-api-1.0.0', reasonCodes: [] };
function client(value: unknown, cards: unknown = [one]): Pick<ApiClient, 'previewFoodPool' | 'getDiscoveryContext' | 'getResultOfferings'> {
  return { previewFoodPool: jest.fn(async () => ({ ok: true as const, data: value as PreviewFoodPoolResponse })),
    getDiscoveryContext: jest.fn(async () => ({ ok: true as const, data: { anchors: [], coverageAreas: [], serverTime: '2026-10-13T05:00:00Z' } })),
    getResultOfferings: jest.fn(async () => ({ ok: true as const, data: cards as PoolDish[] })) };
}
test('valid typed supplement preserves scheduled stock', async () => {
  const result = await createDiscoveryApi(client(preview)).previewFoodPool(request);
  expect(result.ok).toBe(true);
  if (result.ok) { expect(result.data.pool[0]?.availability).toBe('scheduled'); expect(result.data.poolSeed).toBe('seed'); }
});
test.each([undefined, null, '', 123])('invalid server seed is rejected: %p', async poolSeed => {
  expect((await createDiscoveryApi(client({ ...preview, poolSeed })).previewFoodPool(request)).ok).toBe(false);
});
test.each([['secret'], [1], null, [['OUT_OF_COVERAGE']]])('invalid public reason codes rejected: %p', async reasonCodes => {
  expect((await createDiscoveryApi(client({ ...preview, pool: [], reasonCodes })).previewFoodPool(request)).ok).toBe(false);
});
test('empty real-data pool keeps an explicit out-of-coverage reason', async () => {
  const result = await createDiscoveryApi(client({ ...preview, pool: [], totalCandidateCount: 0, reasonCodes: ['OUT_OF_COVERAGE'] })).previewFoodPool(request);
  expect(result.ok).toBe(true); if (result.ok) expect(result.data.reasonCodes).toEqual(['OUT_OF_COVERAGE']);
});
test('empty without reason or positive with reason is malformed', async () => {
  for (const value of [{ ...preview, pool: [] }, { ...preview, reasonCodes: ['OUT_OF_COVERAGE'] }])
    expect((await createDiscoveryApi(client(value)).previewFoodPool(request)).ok).toBe(false);
});
test('duplicate and >8 pool choices are rejected', async () => {
  for (const pool of [[one, one], Array.from({ length: 9 }, (_, n) => ({ ...one, choiceId: String(n) }))])
    expect((await createDiscoveryApi(client({ ...preview, pool })).previewFoodPool(request)).ok).toBe(false);
});
test('result permits multiple venues for same winner but no invalid stock claims', async () => {
  expect((await createDiscoveryApi(client(preview, [one, { ...one, offeringIds: ['other'] }])).getResultOfferings('r', 's')).ok).toBe(true);
  expect((await createDiscoveryApi(client(preview, [{ ...one, availability: 'live-guaranteed' }])).getResultOfferings('r', 's')).ok).toBe(false);
});
test('backend membership errors are preserved', async () => {
  const source = client(preview); source.getResultOfferings = jest.fn(async () => ({ ok: false as const, error: { messageKey: 'NOT_MEMBER' as const } }));
  expect(await createDiscoveryApi(source).getResultOfferings('r','s')).toEqual({ ok: false, error: { messageKey: 'NOT_MEMBER' } });
});

test('array stock state and different-winner result rows are malformed', async () => {
  for (const cards of [[{ ...one, availability: ['scheduled'] }], [one, { ...one, dishId: 'another-winner' }]])
    expect((await createDiscoveryApi(client(preview, cards)).getResultOfferings('r','s')).ok).toBe(false);
});
test('private extra card fields are not forwarded by discovery adapter', async () => {
  const result = await createDiscoveryApi(client({ ...preview, pool: [{ ...one, enteredBy: 'private' }] })).previewFoodPool(request);
  expect(result.ok).toBe(true);if(result.ok) expect(result.data.pool[0]).not.toHaveProperty('enteredBy');
});
