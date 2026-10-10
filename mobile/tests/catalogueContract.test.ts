import rawDataset from '../../tests/fixtures/food-v1/gm03-dataset.json';
import rawCases from '../../tests/fixtures/food-v1/gm03-cases.json';
import template from '../../supabase/seed/templates/food-v1.template.json';
import { FOOD_CONTRACT_VERSION, normalizeDishName, validateFoodDataset, validatePoolFixture } from '../src/domain/catalogue';
import type { FoodDataset, FoodPoolFixture } from '../src/domain/catalogue';

const clone = (): FoodDataset => JSON.parse(JSON.stringify(rawDataset));
const cases = rawCases.cases as FoodPoolFixture[];
const NOW = '2026-10-08T00:00:00Z';

describe('GM-03 dataset contract (synthetic data, no importer/database)', () => {
  test('the complete fixture is structurally valid and is always draft', () => {
    expect(validateFoodDataset(rawDataset)).toEqual({ valid: true, issues: [] });
    expect(rawDataset.kind).toBe('fixture');
    expect(rawDataset.status).toBe('draft');
    expect(rawDataset.contractVersion).toBe(FOOD_CONTRACT_VERSION);
  });
  test('blank template is a valid draft envelope, not publishable survey data', () => {
    expect(validateFoodDataset(template).valid).toBe(true);
    expect(validateFoodDataset(template, { purpose: 'publish', now: NOW }).issues.some((i) => i.code === 'EMPTY_DATASET')).toBe(true);
  });
  test.each([null, undefined, [], 'dataset', 123, {}, { ...rawDataset, dishes: null }, { ...rawDataset, dishes: [null] }])('malformed input yields field errors rather than throwing: %p', (value) => {
    const result = validateFoodDataset(value);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.path).toMatch(/^\$/);
  });
  const invalidCases: [string, (d: FoodDataset) => void, string][] = [
    ['contract version', (d) => { d.contractVersion = 'v0'; }, 'ENUM'],
    ['unstable ID', (d) => { d.dishes[0]!.id = 'Món ăn'; }, 'ID'],
    ['duplicate ID', (d) => { d.dishes.push(d.dishes[0]!); }, 'DUPLICATE_ID'],
    ['duplicate normalized alias', (d) => { d.dishes[1]!.aliases.push('  CƠM   TEST  '.trim()); }, 'DUPLICATE_ALIAS'],
    ['alias same as own name', (d) => { d.dishes[0]!.aliases.push('CƠM TEST'); }, 'DUPLICATE_ALIAS'],
    ['category references cuisine', (d) => { d.dishes[0]!.categoryIds = ['cuisine-vn']; }, 'TAXON_REF'],
    ['deprecated category', (d) => { d.taxonomy.find((t) => t.id === 'category-rice')!.status = 'deprecated'; }, 'TAXON_REF'],
    ['duplicate taxonomy key', (d) => { d.taxonomy.push({ ...d.taxonomy[0]!, id: 'cuisine-vn-other' }); }, 'DUPLICATE_TAXON'],
    ['temperature key used for flavor', (d) => { d.taxonomy.find((t) => t.type === 'flavor')!.key = 'hot'; }, 'TAXON_KEY'],
    ['no meal slots', (d) => { d.dishes[0]!.mealSlots = []; }, 'ARRAY'],
    ['duplicate meal slots', (d) => { d.dishes[0]!.mealSlots = ['lunch', 'lunch']; }, 'DUPLICATE'],
    ['unknown branch', (d) => { d.offerings[0]!.venueId = 'venue-missing'; }, 'VENUE_REF'],
    ['unknown dish', (d) => { d.offerings[0]!.dishId = 'dish-missing'; }, 'DISH_REF'],
    ['wrong schedule owner', (d) => { d.offerings[0]!.scheduleId = 'schedule-venue-a'; }, 'SCHEDULE_REF'],
    ['wrong service mode', (d) => { d.venues[0]!.serviceModes = []; }, 'ARRAY'],
    ['duplicate offering identity', (d) => { d.offerings.push({ ...d.offerings[0]!, id: 'off-duplicate' }); }, 'DUPLICATE_OFFERING'],
    ['unknown menu source', (d) => { d.offerings[0]!.menuSource = 'source-missing'; }, 'SOURCE'],
    ['source lacks price rights category', (d) => { d.sources[0]!.appliesTo = ['editorial', 'menu', 'hours', 'location']; }, 'SOURCE'],
    ['negative price', (d) => { d.offerings[0]!.price!.min = -1; }, 'NUMBER'],
    ['inverted price', (d) => { d.offerings[0]!.price!.min = 999999; }, 'PRICE_RANGE'],
    ['zero group serving size', (d) => { d.offerings[2]!.price!.servingSize = 0; }, 'NUMBER'],
    ['latitude outside range', (d) => { d.venues[0]!.lat = 91; }, 'NUMBER'],
    ['longitude outside range', (d) => { d.publicAnchors[0]!.lng = -181; }, 'NUMBER'],
    ['infinite coordinates', (d) => { d.venues[0]!.lat = Infinity; }, 'NUMBER'],
    ['invalid timezone', (d) => { d.venues[0]!.timezone = 'Fake/Timezone'; }, 'TIMEZONE'],
    ['schedule different timezone', (d) => { d.schedules[0]!.timezone = 'UTC'; }, 'TIMEZONE_MISMATCH'],
    ['schedule orphan', (d) => { d.schedules[0]!.ownerId = 'venue-missing'; }, 'OWNER_REF'],
    ['missing branch schedule', (d) => { d.schedules = d.schedules.filter((s) => s.id !== 'schedule-venue-a'); }, 'VENUE_SCHEDULE'],
    ['duplicate owner schedule', (d) => { d.schedules.push({ ...d.schedules[0]!, id: 'schedule-duplicate' }); }, 'DUPLICATE_SCHEDULE'],
    ['incomplete week', (d) => { d.schedules[0]!.weekly.pop(); }, 'ARRAY'],
    ['duplicate weekday', (d) => { d.schedules[0]!.weekly[0]!.dayOfWeek = 2; }, 'WEEK'],
    ['weekday outside 1..7', (d) => { d.schedules[0]!.weekly[0]!.dayOfWeek = 0; }, 'NUMBER'],
    ['unknown day with invented hours', (d) => { d.schedules[0]!.weekly[0]!.intervals = [{ startTime: '08:00', endTime: '10:00', endDayOffset: 0, is24Hours: false }]; }, 'INTERVAL_STATUS'],
    ['open day without hours', (d) => { d.schedules[0]!.weekly[0]!.status = 'open'; }, 'INTERVAL_STATUS'],
    ['24:00 clock', (d) => { d.schedules[0]!.weekly[4]!.intervals[0]!.endTime = '24:00'; }, 'CLOCK'],
    ['overnight without next-day offset', (d) => { d.schedules[0]!.weekly[4]!.intervals[0]!.endDayOffset = 0; }, 'INTERVAL_RANGE'],
    ['offset creates >24h', (d) => { d.schedules[0]!.weekly[4]!.intervals[0]!.endTime = '23:00'; }, 'INTERVAL_RANGE'],
    ['false full-day flag', (d) => { d.schedules[0]!.weekly[4]!.intervals[0]!.is24Hours = true; }, 'FULL_DAY'],
    ['overlapping shifts', (d) => { d.schedules[0]!.weekly[4]!.intervals.push({ startTime: '23:00', endTime: '01:00', endDayOffset: 1, is24Hours: false }); }, 'OVERLAP'],
    ['impossible local date', (d) => { d.dateExceptions[0]!.localDate = '2026-02-30'; }, 'DATE'],
    ['unknown exception schedule', (d) => { d.dateExceptions[0]!.scheduleId = 'schedule-missing'; }, 'SCHEDULE_REF'],
    ['duplicate date override', (d) => { d.dateExceptions.push({ ...d.dateExceptions[0]!, id: 'exception-duplicate' }); }, 'DUPLICATE_EXCEPTION'],
    ['closed date with last order', (d) => { d.dateExceptions[0]!.lastOrder = '23:00'; }, 'LAST_ORDER'],
    ['override orphan', (d) => { d.availabilityOverrides[0]!.offeringId = 'off-missing'; }, 'OFFERING_REF'],
    ['override expiry inversion', (d) => { d.availabilityOverrides[0]!.expiresAt = '2026-10-10T14:00:00Z'; }, 'OVERRIDE_EXPIRY'],
    ['open coverage ring', (d) => { d.coverageAreas[0]!.boundary.pop(); }, 'RING'],
    ['degenerate coverage ring', (d) => { d.coverageAreas[0]!.boundary = [[0, 0], [0, 0], [0, 0], [0, 0]]; }, 'RING'],
    ['coverage wrong version', (d) => { d.coverageAreas[0]!.datasetVersion = 'another-version'; }, 'VERSION'],
    ['unknown anchor coverage', (d) => { d.publicAnchors[0]!.coverageId = 'coverage-missing'; }, 'COVERAGE_REF'],
    ['invalid UTC instant', (d) => { d.checkedAt = '2026-02-30T00:00:00Z'; }, 'UTC'],
    ['equal freshness dates', (d) => { d.validUntil = d.checkedAt; }, 'FRESHNESS'],
    ['same entering/reviewing person', (d) => { d.reviewedBy = d.enteredBy; }, 'REVIEW'],
    ['verified source without reviewer', (d) => { d.sources[0]!.status = 'verified'; }, 'REVIEW'],
    ['fixture switched to published', (d) => { d.status = 'published'; d.reviewedBy = 'other-person'; }, 'FIXTURE_PUBLICATION'],
  ];
  test.each(invalidCases)('%s is rejected with a field path', (_name, change, code) => {
    const data = clone(); change(data);
    const result = validateFoodDataset(data);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code, path: expect.stringMatching(/^\$/) })]));
  });
  test('unknown fields, including misleading allergen guarantees, are rejected', () => {
    const data = clone();
    Object.assign(data.dishes[0]!, { allergenSafe: true });
    expect(validateFoodDataset(data).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_FIELD', path: '$.dishes[0].allergenSafe' })]));
  });
  test('Object prototype field names cannot bypass unknown-field validation', () => {
    const data = clone(); Object.assign(data, { toString: 'unexpected field' });
    expect(validateFoodDataset(data).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_FIELD', path: '$.toString' })]));
  });
  test('validation never edits the supplied dataset/snapshot', () => {
    const data = clone(), before = JSON.stringify(data);
    validateFoodDataset(data);
    validateFoodDataset(data, { purpose: 'publish', now: NOW });
    expect(JSON.stringify(data)).toBe(before);
  });
  test('temperature cannot be substituted for spicy intensity', () => {
    const data = clone(); Object.assign(data.offerings[0]!.flavor!, { spicy: 'hot' });
    expect(validateFoodDataset(data).valid).toBe(false);
  });
  test('nulls stay null and zero price is explicit, never a default', () => {
    const data = clone(); data.offerings[0]!.price!.min = 0; data.offerings[0]!.price!.max = 0;
    expect(validateFoodDataset(data).valid).toBe(true);
    expect(data.offerings[3]!.price).toBeNull();
    expect(data.dishes[0]!.ingredientTags).toBeNull();
  });
  test('overnight/full-day and adjacent shifts have explicit, valid representations', () => {
    const data = clone();
    data.schedules[0]!.weekly[0] = { dayOfWeek: 1, status: 'open', intervals: [{ startTime: '00:00', endTime: '00:00', endDayOffset: 1, is24Hours: true }] };
    data.schedules[0]!.weekly[1] = { dayOfWeek: 2, status: 'open', intervals: [{ startTime: '08:00', endTime: '12:00', endDayOffset: 0, is24Hours: false }, { startTime: '12:00', endTime: '14:00', endDayOffset: 0, is24Hours: false }] };
    expect(validateFoodDataset(data).valid).toBe(true);
  });
  test('ISO milliseconds do not change chronological freshness checks', () => {
    const data = clone(); data.checkedAt = '2026-10-06T00:00:00Z'; data.validUntil = '2026-10-06T00:00:00.001Z';
    expect(validateFoodDataset(data).valid).toBe(true);
  });
  test('unlicensed artwork is rejected; absent artwork needs no fake link', () => {
    const data = clone(); data.dishes[0]!.artwork = { uri: 'https://example.invalid/image.jpg', license: 'unknown', sourceRef: 'source-fixture' };
    const result = validateFoodDataset(data);
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['SOURCE', 'LICENSE']));
  });
  test('artwork must have a source of kind artwork and an allowed URI', () => {
    const data = clone(); data.sources[0]!.appliesTo.push('artwork');
    data.dishes[0]!.artwork = { uri: 'asset://synthetic-test.svg', sourceRef: 'source-fixture', license: 'fixture-only' };
    expect(validateFoodDataset(data).valid).toBe(true);
    data.dishes[0]!.artwork.uri = 'javascript:alert(1)';
    expect(validateFoodDataset(data).issues.some((i) => i.code === 'ARTWORK_URI')).toBe(true);
  });
  test('publication blocks fixtures and unreviewed source metadata', () => {
    const result = validateFoodDataset(rawDataset, { purpose: 'publish', now: NOW });
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['FIXTURE_PUBLICATION', 'SOURCE_NOT_VERIFIED', 'NOT_VERIFIED']));
  });
  test('publication needs explicit server time and independent dataset review', () => {
    const data = clone(); data.kind = 'survey'; data.status = 'verified';
    expect(validateFoodDataset(data, { purpose: 'publish' }).issues.map((i) => i.code)).toEqual(expect.arrayContaining(['NOW_REQUIRED', 'REVIEW']));
    expect(validateFoodDataset(data, { purpose: 'publish', now: 'yesterday' }).issues.some((i) => i.code === 'UTC')).toBe(true);
  });
  test('parent validity cannot hide an expired offering/source/schedule', () => {
    const data = clone();
    data.offerings[0]!.validUntil = '2026-10-07T00:00:00Z';
    data.sources[0]!.validUntil = '2026-10-07T00:00:00Z';
    data.schedules[0]!.validUntil = '2026-10-07T00:00:00Z';
    expect(validateFoodDataset(data).valid).toBe(true); // A draft can describe stale/unknown data for boundary tests.
    const result = validateFoodDataset(data, { purpose: 'publish', now: NOW });
    for (const path of ['$.offerings[0]', '$.sources[0]', '$.schedules[0]']) expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path, code: 'STALE' })]));
  });
  test('NFKC/spacing/case normalize aliases without removing Vietnamese accents', () => {
    expect(normalizeDishName('  CƠM   TEST  ')).toBe('cơm test');
    expect(normalizeDishName('Ｃơm TEST')).toBe('cơm test');
    expect(normalizeDishName('Cơm')).not.toBe(normalizeDishName('Com'));
  });
});

describe('GM-03 authored pool/context fixtures (not eligibility implementation)', () => {
  test.each(cases.map((value) => [value.id, value] as const))('%s has valid context/references and <=8 unique cards', (_id, value) => {
    expect(validatePoolFixture(value, rawDataset)).toEqual({ valid: true, issues: [] });
  });
  test('empty expected pool stays empty and no fixture is filled with duplicates', () => {
    expect(cases.find((c) => c.id === 'next-day-exception')!.expectedPool).toEqual([]);
    const value = JSON.parse(JSON.stringify(cases[0])) as FoodPoolFixture;
    value.expectedPool.push(value.expectedPool[0]!);
    expect(validatePoolFixture(value, rawDataset).issues.some((i) => i.code === 'DUPLICATE_DISH')).toBe(true);
    value.expectedPool = Array.from({ length: 9 }, () => value.expectedPool[0]!);
    expect(validatePoolFixture(value, rawDataset).issues.some((i) => i.code === 'POOL_LIMIT')).toBe(true);
  });
  test('seed replay case records the same context and expected snapshot for GM-11', () => {
    expect(cases[0]!.poolSeed).toBe(cases[1]!.poolSeed);
    expect(cases[0]!.context).toEqual(cases[1]!.context);
    expect(cases[0]!.expectedPool).toEqual(cases[1]!.expectedPool);
  });
  test('offering refs cannot mix a different dish or variant into a card', () => {
    const value = JSON.parse(JSON.stringify(cases[0])) as FoodPoolFixture;
    value.expectedPool[0]!.offeringIds = ['off-hotpot-b'];
    expect(validatePoolFixture(value, rawDataset).issues.some((i) => i.code === 'OFFERING_REF')).toBe(true);
  });
  test('anchor and coverage must match, and context errors include field paths', () => {
    const value = JSON.parse(JSON.stringify(cases[0])) as FoodPoolFixture;
    value.context.anchorId = 'anchor-b'; value.context.radiusM = -1;
    expect(validatePoolFixture(value, rawDataset).issues.some((i) => i.path === '$.context.radiusM')).toBe(true);
    value.context.radiusM = 1000;
    expect(validatePoolFixture(value, rawDataset).issues.some((i) => i.code === 'ANCHOR_REF')).toBe(true);
  });
  test.each([null, {}, { ...cases[0], expectedPool: null }])('malformed pool %p is rejected', (value) => {
    expect(validatePoolFixture(value, rawDataset).valid).toBe(false);
  });
  test('invalid dataset cannot be used as a reference catalogue', () => {
    expect(validatePoolFixture(cases[0], null).issues.some((i) => i.code === 'INVALID_DATASET')).toBe(true);
  });
});
