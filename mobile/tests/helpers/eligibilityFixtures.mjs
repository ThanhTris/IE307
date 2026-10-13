import { readFileSync } from 'node:fs';
export const fixturePolicy = { maxRadiusM: 10000, maxFutureSeconds: 604800, fixtureMode: true };
export const read = name => JSON.parse(readFileSync(new URL(`../../../tests/fixtures/food-data-v1/${name}`, import.meta.url), 'utf8'));
export const suite = read('cases.json');
export const datasets = read('datasets.json');
export function adaptLegacy(bundle) {
  const data = structuredClone(bundle);
  data.contractVersion = '1.1.0';
  for (const row of data.entities.datasetVersions) row.contractVersion = '1.1.0';
  for (const v of data.entities.venues) {
    const groups = [...new Set(data.entities.weeklySchedules.filter(r => r.ownerType === 'venue' && r.ownerId === v.id).map(r => r.scheduleId))];
    if (groups.length !== 1) throw Error('Fixture venue binding is ambiguous');
    v.scheduleId = groups[0];
  }
  for (const e of ['weeklySchedules', 'dateExceptions']) for (const r of data.entities[e]) {
    r.lastOrder ??= null; r.lastOrderDayOffset ??= null;
  }
  return data;
}
export function extraCases() {
  const baseline = suite.cases.find(c => c.datasetKey === 'one');
  const one = adaptLegacy(datasets.one);
  const offeringId = one.entities.venueDishes[0].offeringId;
  const result = [];
  const add = (id, mutate, eligible = true) => {
    const c = { id, bundle: structuredClone(one), input: structuredClone(baseline.input),
      evaluatedAt: baseline.evaluatedAt, policy: fixturePolicy, expectedEligibleOfferingIds: eligible ? [offeringId] : [] };
    mutate(c); result.push(c);
  };
  add('gm18-last-order-at', c => {
    for (const r of c.bundle.entities.weeklySchedules.filter(r => r.ownerType === 'offering')) { r.lastOrder = '12:00'; r.lastOrderDayOffset = 0; }
  });
  add('gm18-last-order-after', c => {
    for (const r of c.bundle.entities.weeklySchedules.filter(r => r.ownerType === 'offering')) { r.lastOrder = '12:00'; r.lastOrderDayOffset = 0; }
    c.input.context.desiredAt = '2026-10-10T05:00:01Z';
  }, false);
  add('gm18-coverage-expired', c => { c.bundle.entities.coverageAreas[0].validUntil = c.evaluatedAt; }, false);
  add('gm18-service-unknown', c => { c.bundle.entities.venueDishes[0].serviceMode = null; }, false);
  add('gm18-own-row-expired', c => { c.bundle.entities.venueDishes[0].validUntil = c.evaluatedAt; }, false);
  add('gm18-future-checked-at', c => { c.bundle.entities.venueDishes[0].checkedAt = '2026-10-11T05:00:00Z'; }, false);
  add('gm18-hole-excludes-venue', c => {
    c.bundle.entities.coverageAreas[0].boundary.coordinates.push([[0.0005,-0.0005],[0.0015,-0.0005],[0.0015,0.0005],[0.0005,0.0005],[0.0005,-0.0005]]);
  }, false);
  add('gm18-anchor-not-public', c => { c.bundle.entities.publicAnchors[0].isPublic = false; }, false);
  add('gm18-unknown-price-is-eligible', c => {
    for (const key of ['priceMin','priceMax','unit','currency']) c.bundle.entities.venueDishes[0][key] = null;
  });
  add('gm18-budget-is-soft', c => { c.input.context.budget = 1; });
  add('gm18-recent-is-soft', c => {
    c.input.context.avoidRecent = true; c.input.recentDishIds = [c.bundle.entities.venueDishes[0].dishId];
  });
  add('gm18-wrong-meal-slot', c => { c.input.context.mealSlot = 'breakfast'; }, false);
  for (const [id, preference] of [['gm18-prefer-hot',{temperature:'hot'}],
    ['gm18-prefer-spicy',{flavor:{spicy:{present:true,intensity:'high'}}}]]) {
    const c={id,bundle:adaptLegacy(datasets['profile-split']),input:structuredClone(baseline.input),
      evaluatedAt:baseline.evaluatedAt,policy:fixturePolicy,
      expectedEligibleOfferingIds:datasets['profile-split'].entities.venueDishes.map(r=>r.offeringId).sort()};
    c.input.preferencesByParticipant={A:preference}; result.push(c);
  }
  return result;
}
export function timezoneCases() {
  const baseline = suite.cases.find(c => c.datasetKey === 'one');
  const values = [
    ['gm18-dst-fold-first','2026-11-01T05:30:00Z',true],
    ['gm18-dst-fold-second','2026-11-01T06:30:00Z',true],
    ['gm18-dst-spring-before-gap','2026-03-08T06:30:00Z',true],
    ['gm18-dst-spring-after-gap','2026-03-08T07:30:00Z',false],
  ];
  return values.map(([id,at,eligible]) => {
    const bundle = adaptLegacy(datasets.one), input = structuredClone(baseline.input);
    const month = at.slice(0,7);
    for (const list of Object.values(bundle.entities)) for (const row of list) {
      row.checkedAt = month+'-01T00:00:00Z'; row.validUntil = month+'-20T00:00:00Z';
    }
    bundle.entities.venues[0].timezone = 'America/New_York';
    const groups = new Map();
    for (const row of bundle.entities.weeklySchedules) if (!groups.has(row.scheduleId)) {
      groups.set(row.scheduleId,{ ...row, timezone:'America/New_York',dayOfWeek:7,
        startTime:'01:00',endTime:'02:00',endDayOffset:0,is24Hours:false });
    }
    bundle.entities.weeklySchedules = [...groups.values()];
    input.context.desiredAt = at;
    return { id,bundle,input,evaluatedAt:at,policy:fixturePolicy,
      expectedEligibleOfferingIds: eligible ? [bundle.entities.venueDishes[0].offeringId] : [] };
  });
}
