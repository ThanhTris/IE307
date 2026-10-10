import { FLAVORS, FOOD_CONTRACT_VERSION, INTENSITIES, MEAL_SLOTS, normalizeDishName, SOURCE_KINDS, TAXON_TYPES, TEMPERATURES } from './taxonomy';
import type { ContractIssue, FoodDataset, FoodPoolFixture, ValidationOptions, ValidationResult } from './types';

type Check = (value: unknown, path: string, issues: ContractIssue[]) => void;
type Shape = Record<string, Check>;
const issue = (issues: ContractIssue[], path: string, code: string, message: string) => { issues.push({ path, code, message }); };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text: Check = (v, p, e) => { if (typeof v !== 'string' || !v.trim() || v !== v.trim()) issue(e, p, 'TEXT', 'Expected nonempty trimmed text.'); };
const id: Check = (v, p, e) => { if (typeof v !== 'string' || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(v)) issue(e, p, 'ID', 'Expected a stable lowercase ASCII ID.'); };
const oneOf = (values: readonly unknown[]): Check => (v, p, e) => { if (!values.includes(v)) issue(e, p, 'ENUM', `Expected one of ${values.join(', ')}.`); };
const nullable = (check: Check): Check => (v, p, e) => { if (v !== null) check(v, p, e); };
const number = (min: number, max = Number.MAX_SAFE_INTEGER, integer = false): Check => (v, p, e) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) issue(e, p, 'NUMBER', `Expected ${integer ? 'integer' : 'number'} in [${min}, ${max}].`);
};
const boolean: Check = (v, p, e) => { if (typeof v !== 'boolean') issue(e, p, 'BOOLEAN', 'Expected boolean.'); };
const array = (check: Check, min = 0): Check => (v, p, e) => {
  if (!Array.isArray(v) || v.length < min) { issue(e, p, 'ARRAY', `Expected array with at least ${min} items.`); return; }
  v.forEach((item, i) => check(item, `${p}[${i}]`, e));
};
const distinct = (check: Check, min = 0): Check => (v, p, e) => {
  array(check, min)(v, p, e);
  if (Array.isArray(v) && new Set(v).size !== v.length) issue(e, p, 'DUPLICATE', 'Values must be unique.');
};
const object = (shape: Shape): Check => (v, p, e) => {
  if (!record(v)) { issue(e, p, 'OBJECT', 'Expected object.'); return; }
  for (const key of Object.keys(shape)) shape[key]?.(v[key], `${p}.${key}`, e);
  for (const key of Object.keys(v)) if (!Object.prototype.hasOwnProperty.call(shape, key)) issue(e, `${p}.${key}`, 'UNKNOWN_FIELD', 'Field is outside this contract.');
};
const utc: Check = (v, p, e) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().replace('.000Z', 'Z') !== v.replace('.000Z', 'Z')) issue(e, p, 'UTC', 'Expected a valid UTC ISO instant.');
};
const localDate: Check = (v, p, e) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(`${v}T00:00:00Z`)) || new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v) issue(e, p, 'DATE', 'Expected a valid YYYY-MM-DD date.');
};
const clock: Check = (v, p, e) => { if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) issue(e, p, 'CLOCK', 'Expected HH:mm (00:00 to 23:59).'); };
const timezone: Check = (v, p, e) => {
  if (typeof v !== 'string') { issue(e, p, 'TIMEZONE', 'Expected IANA timezone.'); return; }
  try { new Intl.DateTimeFormat('en', { timeZone: v }).format(0); }
  catch { issue(e, p, 'TIMEZONE', 'Unknown timezone.'); }
};
const freshness: Shape = { checkedAt: utc, validUntil: utc };
const sourced: Shape = { ...freshness, sourceRef: id };
const publication = oneOf(['draft', 'verified', 'published']);
const status = oneOf(['open', 'closed', 'unknown']);
const flavor = nullable(object(Object.fromEntries(FLAVORS.map((key) => [key, oneOf(INTENSITIES)]))));
const interval = object({ startTime: clock, endTime: clock, endDayOffset: oneOf([0, 1]), is24Hours: boolean });
const day = object({ dayOfWeek: number(1, 7, true), status, intervals: array(interval) });
const point: Check = (v, p, e) => {
  if (!Array.isArray(v) || v.length !== 2) { issue(e, p, 'POSITION', 'Expected [longitude, latitude].'); return; }
  number(-180, 180)(v[0], `${p}[0]`, e); number(-90, 90)(v[1], `${p}[1]`, e);
};
const schema = object({
  contractVersion: oneOf([FOOD_CONTRACT_VERSION]), datasetVersion: id, kind: oneOf(['fixture', 'survey']),
  status: publication, enteredBy: text, reviewedBy: nullable(text), ...freshness,
  taxonomy: array(object({ id, version: id, type: oneOf(TAXON_TYPES), key: id, label: text, description: text, status: oneOf(['active', 'deprecated']), sourceRef: id })),
  dishes: array(object({ id, version: id, name: text, aliases: distinct(text), description: text, cuisineIds: distinct(id), originIds: distinct(id), categoryIds: distinct(id, 1), mealSlots: distinct(oneOf(MEAL_SLOTS), 1), ingredientTags: nullable(distinct(text)), temperature: nullable(oneOf(TEMPERATURES)), flavor, artwork: nullable(object({ uri: text, sourceRef: id, license: text })) })),
  venues: array(object({ id, branchName: text, address: text, adminAreaId: id, lat: number(-90, 90), lng: number(-180, 180), timezone, status: oneOf(['active', 'closed', 'unknown']), serviceModes: distinct(oneOf(['dine_in']), 1), ...sourced })),
  offerings: array(object({ id, venueId: id, dishId: id, variantId: id, variant: text, menuSource: id, scheduleId: id, serviceMode: oneOf(['dine_in']), status: publication, ...freshness, price: nullable(object({ min: number(0), max: number(0), unit: oneOf(['person', 'portion', 'group']), currency: oneOf(['VND']), servingSize: nullable(number(1, Number.MAX_SAFE_INTEGER, true)), sourceRef: id })), temperature: nullable(oneOf(TEMPERATURES)), flavor })),
  schedules: array(object({ id, ownerType: oneOf(['venue', 'offering']), ownerId: id, timezone, weekly: array(day, 7), ...sourced })),
  dateExceptions: array(object({ id, scheduleId: id, localDate, status, intervals: array(interval), lastOrder: nullable(clock), ...sourced })),
  availabilityOverrides: array(object({ id, offeringId: id, state: oneOf(['available', 'sold_out', 'paused', 'unknown']), sourceRef: id, observedAt: utc, expiresAt: utc })),
  coverageAreas: array(object({ id, name: text, boundary: array(point, 4), datasetVersion: id, ...sourced })),
  publicAnchors: array(object({ id, name: text, lat: number(-90, 90), lng: number(-180, 180), coverageId: id })),
  sources: array(object({ id, locator: text, usageRights: text, appliesTo: distinct(oneOf(SOURCE_KINDS), 1), enteredBy: text, reviewedBy: nullable(text), status: publication, ...freshness })),
});

export function validateFoodDataset(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const issues: ContractIssue[] = [];
  schema(input, '$', issues);
  if (issues.length) return { valid: false, issues }; // Safe to use typed fields only after shape checks.
  const data = input as FoodDataset;
  const add = (path: string, code: string, message: string) => issue(issues, path, code, message);
  const collections = ['taxonomy', 'dishes', 'venues', 'offerings', 'schedules', 'dateExceptions', 'availabilityOverrides', 'coverageAreas', 'publicAnchors', 'sources'] as const;
  for (const collection of collections) {
    const seen = new Set<string>();
    data[collection].forEach((entry, i) => {
      if (seen.has(entry.id)) add(`$.${collection}[${i}].id`, 'DUPLICATE_ID', 'ID already exists in this entity collection.');
      seen.add(entry.id);
    });
  }
  const sources = new Map(data.sources.map((s) => [s.id, s]));
  function source(ref: string, kind: typeof SOURCE_KINDS[number], path: string) {
    const entry = sources.get(ref);
    if (!entry || !entry.appliesTo.includes(kind)) add(path, 'SOURCE', `Missing source for ${kind}.`);
  }
  function dates(entry: { checkedAt: string; validUntil: string }, path: string) {
    if (Date.parse(entry.validUntil) <= Date.parse(entry.checkedAt)) add(path, 'FRESHNESS', 'validUntil must be later than checkedAt.');
    if (options.purpose === 'publish' && options.now && (Date.parse(entry.validUntil) <= Date.parse(options.now) || Date.parse(entry.checkedAt) > Date.parse(options.now))) add(path, 'STALE', 'Not current at publication time.');
  }
  function review(entry: { enteredBy: string; reviewedBy: string | null; status: string }, path: string) {
    if (entry.reviewedBy === entry.enteredBy || (entry.status !== 'draft' && !entry.reviewedBy)) add(path, 'REVIEW', 'Verification requires a reviewer different from the person entering data.');
  }
  dates(data, '$'); review(data, '$');
  data.sources.forEach((s, i) => { dates(s, `$.sources[${i}]`); review(s, `$.sources[${i}]`); });
  const names = new Map<string, string>();
  data.taxonomy.forEach((t, i) => {
    source(t.sourceRef, 'editorial', `$.taxonomy[${i}].sourceRef`);
    const values = t.type === 'temperature' ? TEMPERATURES : t.type === 'flavor' ? FLAVORS : t.type === 'meal_slot' ? MEAL_SLOTS : null;
    if (values && !(values as readonly string[]).includes(t.key)) add(`$.taxonomy[${i}].key`, 'TAXON_KEY', 'Key must match the enum of its taxonomy type.');
  });
  for (const type of TAXON_TYPES) {
    const keys = data.taxonomy.filter((t) => t.type === type).map((t) => t.key);
    if (new Set(keys).size !== keys.length) add('$.taxonomy', 'DUPLICATE_TAXON', `Duplicate key in ${type}.`);
  }
  data.dishes.forEach((d, i) => {
    const path = `$.dishes[${i}]`;
    for (const [field, type] of [['cuisineIds', 'cuisine'], ['originIds', 'origin'], ['categoryIds', 'category']] as const) {
      for (const ref of d[field]) if (!data.taxonomy.some((t) => t.id === ref && t.type === type && t.status === 'active')) add(`${path}.${field}`, 'TAXON_REF', `Expected active ${type} ID.`);
    }
    for (const name of [d.name, ...d.aliases]) {
      const normalized = normalizeDishName(name);
      if (names.has(normalized)) add(`${path}.aliases`, 'DUPLICATE_ALIAS', `Name/alias already belongs to ${names.get(normalized)}.`);
      names.set(normalized, d.id);
    }
    if (d.artwork) {
      source(d.artwork.sourceRef, 'artwork', `${path}.artwork.sourceRef`);
      if (!/^(https:\/\/|asset:\/\/)/.test(d.artwork.uri)) add(`${path}.artwork.uri`, 'ARTWORK_URI', 'Use a licensed HTTPS image or packaged asset URI.');
      if (/^(unknown|unverified|none)$/i.test(d.artwork.license)) add(`${path}.artwork.license`, 'LICENSE', 'Unknown rights cannot authorize an image.');
    }
  });
  data.venues.forEach((v, i) => { source(v.sourceRef, 'location', `$.venues[${i}].sourceRef`); dates(v, `$.venues[${i}]`); });
  const offeringKeys = new Set<string>();
  data.offerings.forEach((o, i) => {
    const path = `$.offerings[${i}]`;
    dates(o, path); source(o.menuSource, 'menu', `${path}.menuSource`);
    const venue = data.venues.find((v) => v.id === o.venueId);
    if (!venue) add(`${path}.venueId`, 'VENUE_REF', 'Unknown branch.');
    else if (!venue.serviceModes.includes(o.serviceMode)) add(`${path}.serviceMode`, 'SERVICE_MODE', 'Branch does not support this service mode.');
    if (!data.dishes.some((d) => d.id === o.dishId)) add(`${path}.dishId`, 'DISH_REF', 'Unknown dish.');
    const schedule = data.schedules.find((s) => s.id === o.scheduleId);
    if (!schedule || schedule.ownerType !== 'offering' || schedule.ownerId !== o.id) add(`${path}.scheduleId`, 'SCHEDULE_REF', 'Must reference this offering\'s own schedule.');
    const key = JSON.stringify([o.venueId, o.dishId, o.variantId, o.serviceMode]);
    if (offeringKeys.has(key)) add(path, 'DUPLICATE_OFFERING', 'Duplicate branch/dish/variant/serviceMode.');
    offeringKeys.add(key);
    if (o.price) {
      source(o.price.sourceRef, 'price', `${path}.price.sourceRef`);
      if (o.price.min > o.price.max) add(`${path}.price`, 'PRICE_RANGE', 'Price min must not exceed max.');
    }
  });
  function intervals(status: string, values: { startTime: string; endTime: string; endDayOffset: number; is24Hours: boolean }[], path: string) {
    if ((status === 'open') !== (values.length > 0)) add(path, 'INTERVAL_STATUS', 'Open needs intervals; closed/unknown must have none.');
    const spans = values.map((v, i) => {
      const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
      const start = minutes(v.startTime), end = minutes(v.endTime) + v.endDayOffset * 1440;
      if (end <= start || end - start > 1440) add(`${path}[${i}]`, 'INTERVAL_RANGE', 'Interval must advance by at most 24h; overnight needs endDayOffset=1.');
      const fullDay = v.startTime === '00:00' && v.endTime === '00:00' && v.endDayOffset === 1;
      if (v.is24Hours !== fullDay || (end - start === 1440 && !fullDay)) add(`${path}[${i}]`, 'FULL_DAY', '24h requires explicit 00:00 to next-day 00:00 and is24Hours=true.');
      return { start, end };
    }).sort((a, b) => a.start - b.start);
    for (let i = 1; i < spans.length; i++) if (spans[i]!.start < spans[i - 1]!.end) add(path, 'OVERLAP', 'Intervals in one day must not overlap.');
  }
  const ownerSchedules = new Set<string>();
  data.schedules.forEach((s, i) => {
    const path = `$.schedules[${i}]`;
    dates(s, path); source(s.sourceRef, 'hours', `${path}.sourceRef`);
    const venue = s.ownerType === 'venue' ? data.venues.find((v) => v.id === s.ownerId) : data.venues.find((v) => v.id === data.offerings.find((o) => o.id === s.ownerId)?.venueId);
    if (!venue) add(`${path}.ownerId`, 'OWNER_REF', 'Schedule owner must exist.');
    else if (s.timezone !== venue.timezone) add(`${path}.timezone`, 'TIMEZONE_MISMATCH', 'Owner and schedule must use the branch timezone.');
    const key = `${s.ownerType}:${s.ownerId}`;
    if (ownerSchedules.has(key)) add(path, 'DUPLICATE_SCHEDULE', 'One weekly schedule per owner; put shifts inside it.');
    ownerSchedules.add(key);
    if (s.weekly.length !== 7 || new Set(s.weekly.map((d) => d.dayOfWeek)).size !== 7) add(`${path}.weekly`, 'WEEK', 'Represent all seven days once; missing hours are unknown.');
    s.weekly.forEach((d, j) => intervals(d.status, d.intervals, `${path}.weekly[${j}].intervals`));
  });
  data.venues.forEach((v, i) => {
    if (!data.schedules.some((s) => s.ownerType === 'venue' && s.ownerId === v.id)) add(`$.venues[${i}]`, 'VENUE_SCHEDULE', 'Branch needs an explicit schedule, including unknown days.');
  });
  const exceptions = new Set<string>();
  data.dateExceptions.forEach((d, i) => {
    const path = `$.dateExceptions[${i}]`;
    dates(d, path); source(d.sourceRef, 'hours', `${path}.sourceRef`);
    if (!data.schedules.some((s) => s.id === d.scheduleId)) add(`${path}.scheduleId`, 'SCHEDULE_REF', 'Unknown schedule.');
    const key = `${d.scheduleId}:${d.localDate}`;
    if (exceptions.has(key)) add(path, 'DUPLICATE_EXCEPTION', 'Only one replacement per schedule/local date.');
    exceptions.add(key); intervals(d.status, d.intervals, `${path}.intervals`);
    if (d.status !== 'open' && d.lastOrder !== null) add(`${path}.lastOrder`, 'LAST_ORDER', 'No last order for closed/unknown dates.');
  });
  data.availabilityOverrides.forEach((a, i) => {
    const path = `$.availabilityOverrides[${i}]`;
    if (!data.offerings.some((o) => o.id === a.offeringId)) add(`${path}.offeringId`, 'OFFERING_REF', 'Unknown offering.');
    source(a.sourceRef, 'menu', `${path}.sourceRef`);
    if (Date.parse(a.expiresAt) <= Date.parse(a.observedAt)) add(path, 'OVERRIDE_EXPIRY', 'expiresAt must be later than observedAt.');
  });
  data.coverageAreas.forEach((c, i) => {
    const path = `$.coverageAreas[${i}]`;
    dates(c, path); source(c.sourceRef, 'location', `${path}.sourceRef`);
    if (c.datasetVersion !== data.datasetVersion) add(`${path}.datasetVersion`, 'VERSION', 'Coverage belongs to the envelope version.');
    const first = c.boundary[0]!, last = c.boundary[c.boundary.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1] || new Set(c.boundary.slice(0, -1).map((p) => p.join(','))).size < 3) add(`${path}.boundary`, 'RING', 'Closed ring needs at least three distinct points.');
  });
  data.publicAnchors.forEach((a, i) => { if (!data.coverageAreas.some((c) => c.id === a.coverageId)) add(`$.publicAnchors[${i}].coverageId`, 'COVERAGE_REF', 'Unknown coverage.'); });
  if (data.kind === 'fixture' && data.status !== 'draft') add('$.status', 'FIXTURE_PUBLICATION', 'Fixtures must remain draft.');
  if (options.purpose === 'publish') {
    if (data.kind !== 'survey') add('$.kind', 'FIXTURE_PUBLICATION', 'Synthetic data cannot be published as a real survey.');
    if (!options.now) add('$.now', 'NOW_REQUIRED', 'Pass server publication time explicitly.');
    else utc(options.now, '$.now', issues);
    if (data.status !== 'verified' && data.status !== 'published') add('$.status', 'NOT_VERIFIED', 'Publication needs verified input.');
    if (!data.dishes.length || !data.venues.length || !data.offerings.length || !data.coverageAreas.length || !data.publicAnchors.length) add('$', 'EMPTY_DATASET', 'Publication needs dishes, branches, offerings, coverage and anchors.');
    data.sources.forEach((s, i) => {
      if (s.status === 'draft' || !s.reviewedBy || s.usageRights === 'fixture-only' || s.locator.startsWith('fixture://') || /^(unknown|unverified|none)$/i.test(s.usageRights)) add(`$.sources[${i}]`, 'SOURCE_NOT_VERIFIED', 'Real publication needs reviewed sources and documented usage rights.');
    });
    data.offerings.forEach((o, i) => { if (o.status === 'draft') add(`$.offerings[${i}].status`, 'NOT_VERIFIED', 'Draft offerings cannot be published.'); });
  }
  return { valid: issues.length === 0, issues };
}

// Checks authored fixture structure only. It does not select, filter or rank food.
export function validatePoolFixture(input: unknown, dataset: unknown): ValidationResult {
  const issues: ContractIssue[] = [];
  object({
    id, kind: oneOf(['fixture']), datasetVersion: id, contextVersion: id, poolSeed: text,
    context: object({ anchorId: id, coverageId: id, radiusM: number(1), desiredAt: utc, mealSlot: oneOf(MEAL_SLOTS), serviceMode: oneOf(['dine_in']), timeHint: oneOf(['now', 'scheduled', 'late_night']), budget: nullable(object({ min: number(0), max: number(0), unit: oneOf(['person']), currency: oneOf(['VND']) })) }),
    preferenceCategoryIds: array(distinct(id)),
    expectedPool: array(object({ dishId: id, variantId: id, offeringIds: distinct(id, 1) })),
    expectedReason: text, notes: text,
  })(input, '$', issues);
  const datasetResult = validateFoodDataset(dataset);
  if (!datasetResult.valid) issue(issues, '$.dataset', 'INVALID_DATASET', 'Provide a structurally valid dataset.');
  if (issues.length) return { valid: false, issues };
  const value = input as FoodPoolFixture, data = dataset as FoodDataset;
  const add = (path: string, code: string, message: string) => issue(issues, path, code, message);
  if (value.datasetVersion !== data.datasetVersion) add('$.datasetVersion', 'VERSION', 'Fixture must target the supplied dataset.');
  if (!data.coverageAreas.some((c) => c.id === value.context.coverageId)) add('$.context.coverageId', 'COVERAGE_REF', 'Unknown coverage.');
  const anchor = data.publicAnchors.find((a) => a.id === value.context.anchorId);
  if (!anchor || anchor.coverageId !== value.context.coverageId) add('$.context.anchorId', 'ANCHOR_REF', 'Anchor must belong to the selected coverage.');
  if (value.context.budget && value.context.budget.min > value.context.budget.max) add('$.context.budget', 'PRICE_RANGE', 'Budget min must not exceed max.');
  for (const refs of value.preferenceCategoryIds) for (const ref of refs) if (!data.taxonomy.some((t) => t.id === ref && t.type === 'category' && t.status === 'active')) add('$.preferenceCategoryIds', 'TAXON_REF', 'Expected active category IDs.');
  if (value.expectedPool.length > 8) add('$.expectedPool', 'POOL_LIMIT', 'At most eight dishes.');
  const seen = new Set<string>();
  value.expectedPool.forEach((p, i) => {
    const path = `$.expectedPool[${i}]`;
    if (!data.dishes.some((d) => d.id === p.dishId)) add(`${path}.dishId`, 'DISH_REF', 'Unknown dish.');
    if (seen.has(p.dishId)) add(path, 'DUPLICATE_DISH', 'One card per dish; choose one variant rather than duplicate it.');
    seen.add(p.dishId);
    for (const ref of p.offeringIds) if (!data.offerings.some((o) => o.id === ref && o.dishId === p.dishId && o.variantId === p.variantId)) add(`${path}.offeringIds`, 'OFFERING_REF', 'Offering must match both dish and variant.');
  });
  return { valid: issues.length === 0, issues };
}
