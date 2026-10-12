import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility, insidePolygon, distanceMetres, refetchWinner } from '../src/domain/eligibility/index.ts';
import { suite, datasets, adaptLegacy, fixturePolicy, extraCases, timezoneCases } from './helpers/eligibilityFixtures.mjs';
const results = new Map();
for (const c of suite.cases) test(`GM-04 eligibility fixture: ${c.id}`, () => {
  const bundle = adaptLegacy(datasets[c.datasetKey]);
  const before = JSON.stringify(bundle);
  const result = evaluateEligibility(bundle, c.input, c.evaluatedAt, fixturePolicy);
  results.set(c.id, result);
  assert.deepEqual(result.eligibleOfferingIds, [...c.expected.eligibleOfferingIds].sort());
  assert.deepEqual(result.excludedOfferings.map(r => r.offeringId).sort(), c.expected.excludedOfferings.map(r => r.offeringId).sort());
  assert.deepEqual(result.needsConfirmationOfferings.map(r => r.offeringId).sort(), c.expected.needsConfirmationOfferings.map(r => r.offeringId).sort());
  assert.ok(result.pool.length >= c.expected.pool.minSize && result.pool.length <= c.expected.pool.maxSize);
  assert.equal(new Set(result.pool.map(r => r.choiceId)).size, result.pool.length);
  for (const code of c.expected.pool.requiredCategoryCodes) {
    const taxonomy = bundle.entities.taxonomy.find(r => `${r.type === 'category' ? '' : r.type + ':'}${r.code}` === code
      || r.code === code || r.code === code.split(':').at(-1));
    assert.ok(taxonomy && result.pool.some(r => r.categoryIds.includes(taxonomy.id)), code);
  }
  if (!result.pool.length) assert.ok(result.reasonCodes.length);
  for (const card of result.pool) {
    const offering = bundle.entities.venueDishes.find(r => r.offeringId === card.representativeOfferingId);
    const dish = bundle.entities.dishes.find(r => r.id === card.dishId);
    assert.equal(card.priceMax, offering.priceMax);
    assert.equal(card.unit, offering.unit);
    assert.equal(card.temperature, offering.profileOverrides?.temperature ?? dish.temperature);
    assert.deepEqual(card.flavor, offering.profileOverrides?.flavor ?? dish.flavor);
  }
  assert.equal(JSON.stringify(bundle), before);
});
test('same seed, snapshot and reversed source arrays produce identical ordered pool', () => {
  const ids = suite.comparisons[0].caseIds;
  for (const id of ids.slice(1)) assert.deepEqual(results.get(id).pool, results.get(ids[0]).pool);
});
const base = () => adaptLegacy(datasets.one);
const input = () => structuredClone(suite.cases[0].input);
const at = suite.cases[0].evaluatedAt;
test('fixture data is rejected by production evaluation', () => {
  assert.throws(() => evaluateEligibility(base(), input(), at, { ...fixturePolicy, fixtureMode: false }), /FIXTURE_NOT_ALLOWED/);
});
test('radius, horizon, NaN and missing policy limits reject input', () => {
  for (const radius of [0, -1, 10001, Infinity, NaN]) {
    const request = input(); request.context.radiusM = radius;
    assert.throws(() => evaluateEligibility(base(), request, at, fixturePolicy), /INVALID_INPUT/);
  }
  const request = input(); request.context.desiredAt = '2026-11-01T00:00:00Z';
  assert.throws(() => evaluateEligibility(base(), request, at, fixturePolicy), /INVALID_INPUT/);
  assert.throws(() => evaluateEligibility(base(), input(), at, { ...fixturePolicy, maxRadiusM: 0 }), /INVALID_INPUT/);
});
test('polygon hole excludes venue but includes outer and hole boundaries', () => {
  const polygon = { type: 'Polygon', coordinates: [[[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]], [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]] };
  assert.equal(insidePolygon(polygon, 0, 0), false);
  assert.equal(insidePolygon(polygon, 1, 0), true);
  assert.equal(insidePolygon(polygon, 2, 0), true);
  assert.equal(insidePolygon(polygon, 3, 0), false);
  assert.equal(distanceMetres(0, 0, 0, 0), 0);
});
test('last order is inclusive, then excluded without changing source data', () => {
  const bundle = base();
  for (const row of bundle.entities.weeklySchedules.filter(r => r.ownerType === 'offering')) {
    row.lastOrder = '12:00'; row.lastOrderDayOffset = 0;
  }
  assert.equal(evaluateEligibility(bundle, input(), at, fixturePolicy).pool.length, 1);
  const req = input(); req.context.desiredAt = '2026-10-10T05:00:01Z';
  assert.equal(evaluateEligibility(bundle, req, at, fixturePolicy).pool.length, 0);
});
test('stale coverage and mismatched coverage cannot expand the search area', () => {
  const bundle = base(); bundle.entities.coverageAreas[0].validUntil = at;
  assert.equal(evaluateEligibility(bundle, input(), at, fixturePolicy).pool.length, 0);
  const req = input(); req.context.coverageId = 'another-area';
  assert.equal(evaluateEligibility(base(), req, at, fixturePolicy).pool.length, 0);
});
test('stock unknown and expired sold-out overrides remain scheduled, never confirmed', () => {
  const c = suite.cases.find(c => c.id === 'availability-override-expired') ?? suite.cases.find(c => c.datasetKey === 'sold-out' && !c.expected.excludedOfferings.length);
  const result = evaluateEligibility(adaptLegacy(datasets[c.datasetKey]), c.input, c.evaluatedAt, fixturePolicy);
  assert.ok(result.pool.length);
  assert.equal(result.pool[0].availability, 'scheduled');
});

for (const c of [...extraCases(), ...timezoneCases()]) test(c.id, () => {
  const result = evaluateEligibility(c.bundle, c.input, c.evaluatedAt, c.policy);
  assert.deepEqual(result.eligibleOfferingIds, c.expectedEligibleOfferingIds);
  if (c.id === 'gm18-prefer-hot') assert.equal(result.pool[0].temperature, 'hot');
  if (c.id === 'gm18-prefer-spicy') assert.equal(result.pool[0].flavor.spicy.present, true);
});
test('refetch winner does not drop rank-nine dish or replace unavailable winner', () => {
  const c = suite.cases[0], bundle = adaptLegacy(datasets[c.datasetKey]);
  const preview = evaluateEligibility(bundle, c.input, c.evaluatedAt, fixturePolicy);
  const winner = bundle.entities.venueDishes.find(r => !preview.pool.some(p => p.dishId === r.dishId));
  assert.deepEqual(refetchWinner(bundle, c.input, c.evaluatedAt, fixturePolicy, winner.dishId, null).map(r => r.dishId), [winner.dishId]);
  winner.scheduleId = null;
  assert.deepEqual(refetchWinner(bundle, c.input, c.evaluatedAt, fixturePolicy, winner.dishId, null), []);
});
