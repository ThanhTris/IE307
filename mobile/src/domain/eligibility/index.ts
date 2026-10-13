/** GM-18 independent kernel. Trusted snapshots only; never fetches or publishes. */
export const ELIGIBILITY_VERSION = 'gm18-eligibility-1.0.0';
export type FoodRow = {
  id?: string; offeringId?: string; sourceRef?: string | null; scheduleId?: string | null;
  ownerId?: string; ownerType?: string; venueId?: string; dishId?: string;
  areaId?: string; anchorId?: string; coverageId?: string; isPublic?: boolean;
  name?: string; branchName?: string; address?: string | null; adminAreaId?: string | null;
  variant?: string | null; description?: string | null; origin?: string | null;
  lat?: number | null; lng?: number | null; timezone?: string;
  boundary?: { type: string; coordinates: number[][][] };
  status?: string; reviewStatus?: string; fixtureOnly?: boolean;
  checkedAt?: string | null; validUntil?: string | null; usageRights?: string;
  fieldSources?: Record<string, string>; menuSource?: string | null;
  cuisineIds?: string[]; categoryIds?: string[]; mealSlots?: string[];
  serviceModes?: string[]; serviceMode?: string | null; classificationStatus?: string;
  temperature?: string | null; flavor?: unknown; artwork?: unknown;
  profileOverrides?: Partial<FoodRow> | null;
  priceMin?: number | null; priceMax?: number | null; unit?: string | null;
  currency?: string | null; servingSize?: string | null;
  dayOfWeek?: number; localDate?: string; startTime?: string | null; endTime?: string | null;
  endDayOffset?: number | null; is24Hours?: boolean; intervals?: FoodRow[];
  lastOrder?: string | null; lastOrderDayOffset?: number | null;
  state?: string; observedAt?: string; expiresAt?: string;
  datasetVersion?: string;
};
export type FoodBundle = { fixtureOnly: boolean; datasetVersion: string; entities: Record<string, FoodRow[]> };
export type EligibilityContext = {
  anchorId: string; coverageId?: string; radiusM: number; desiredAt: string;
  mealSlot: string; serviceMode: string; timeHint?: string | null;
  budget?: number | { min: number | null; max: number | null; currency: string; unit: string } | null;
  avoidRecent?: boolean;
};
export type EligibilityInput = {
  context: EligibilityContext; poolSeed: string;
  preferencesByParticipant?: Record<string, { categoryIds?: string[]; cuisineIds?: string[];
    temperature?: string; flavor?: Record<string, { present?: boolean | null; intensity?: string }> }>;
  recentDishIds?: string[];
};
export type EligibilityPolicy = { maxRadiusM: number; maxFutureSeconds: number; fixtureMode: boolean };
export type Rejection = { offeringId: string; reason: string };
export type Candidate = {
  roundDishId: string; choiceId: string; dishId: string; variant: string | null;
  name: string; description: string | null; cuisineIds: string[]; categoryIds: string[];
  origin: string | null; temperature: string | null; flavor: unknown; artwork: unknown;
  priceMin: number | null; priceMax: number | null; unit: string | null; currency: string | null;
  servingSize: string | null; price: { priceMin: number | null; priceMax: number | null;
    unit: string | null; currency: string | null; servingSize: string | null; sourceRef: string | null };
  venueId: string; venueName: string; venueAddress: string | null; distanceM: number;
  representativeOfferingId: string; offeringIds: string[]; availability: 'scheduled' | 'confirmed';
};
const timestamp = (value: string | null | undefined) => value && /(?:Z|[+-]\d\d:\d\d)$/.test(value)
  ? Date.parse(value) : NaN;
const rows = (bundle: FoodBundle, entity: string) => bundle.entities[entity] ?? [];
const accepted = (row: FoodRow) => ['verified', 'published'].includes(row.reviewStatus ?? '');
function fresh(row: FoodRow | undefined, now: number, until: number): boolean {
  return !!row && accepted(row) && timestamp(row.checkedAt) <= now && timestamp(row.validUntil) > until;
}
function sourced(bundle: FoodBundle, row: FoodRow | undefined, now: number, until: number): boolean {
  if (!fresh(row, now, until) || !row) return false;
  const refs = [row.sourceRef, ...(row.menuSource ? [row.menuSource] : []), ...Object.values(row.fieldSources ?? {})];
  return refs.length > 0 && refs.every(ref => {
    const source = rows(bundle, 'dataSources').find(s => s.sourceRef === ref);
    return fresh(source, now, until) && ['granted', 'licensed', 'public_domain'].includes(source?.usageRights ?? '');
  });
}
export function insidePolygon(boundary: FoodRow['boundary'], lat: number, lng: number): boolean {
  if (!boundary || boundary.type !== 'Polygon' || !boundary.coordinates.length) return false;
  function ring(points: number[][]): { inside: boolean; edge: boolean } {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [x, y] = points[i]! as [number, number], [px, py] = points[j]! as [number, number];
      if (Math.abs((lng - x) * (py - y) - (lat - y) * (px - x)) < 1e-12
        && lng >= Math.min(x, px) && lng <= Math.max(x, px)
        && lat >= Math.min(y, py) && lat <= Math.max(y, py)) return { inside: true, edge: true };
      if ((y > lat) !== (py > lat) && lng < (px - x) * (lat - y) / (py - y) + x) inside = !inside;
    }
    return { inside, edge: false };
  }
  if (!ring(boundary.coordinates[0]!).inside) return false;
  return !boundary.coordinates.slice(1).some(points => { const r = ring(points); return r.inside && !r.edge; });
}
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
function localClock(at: number, timezone: string): { date: string; seconds: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const value = (type: string) => parts.find(p => p.type === type)!.value;
  const date = `${value('year')}-${value('month')}-${value('day')}`;
  return { date, seconds: +value('hour') * 3600 + +value('minute') * 60 + +value('second'),
    weekday: new Date(date + 'T00:00:00Z').getUTCDay() || 7 };
}
const seconds = (time: string | null | undefined) => time ? +time.slice(0, 2) * 3600 + +time.slice(3, 5) * 60 : NaN;
function schedule(bundle: FoodBundle, id: string | null | undefined, timezone: string, at: number,
  now: number, ownerType: string, ownerId: string): 'open' | 'closed' | 'unknown' {
  if (!id) return 'unknown';
  const current = localClock(at, timezone);
  const previous = new Date(Date.parse(current.date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
  const exceptions = rows(bundle, 'dateExceptions').filter(r => r.scheduleId === id);
  const today = exceptions.find(r => r.localDate === current.date);
  if (today && (!sourced(bundle, today, now, at) || today.status === 'unknown')) return 'unknown';
  if (today?.status === 'closed') return 'closed';
  let known = false;
  for (const [date, day, offset] of [[current.date, current.weekday, 0],
    [previous, current.weekday === 1 ? 7 : current.weekday - 1, 86400]] as const) {
    const exception = exceptions.find(r => r.localDate === date);
    const periods = exception ? [exception] : rows(bundle, 'weeklySchedules').filter(r => r.scheduleId === id
      && r.ownerType === ownerType && r.ownerId === ownerId && r.timezone === timezone && r.dayOfWeek === day);
    for (const row of periods) {
      // Stale prior-day rows matter only if they could carry into today.
      if (offset && !exception && row.endDayOffset !== 1) continue;
      if (!sourced(bundle, row, now, at) || row.status === 'unknown') continue;
      if (!offset) known = true;
      if (row.status !== 'open') continue;
      const intervals = exception ? row.intervals ?? [] : [row];
      for (const period of intervals) {
        if (offset && period.endDayOffset !== 1) continue;
        const start = seconds(period.startTime), end = seconds(period.endTime) + (period.endDayOffset ?? 0) * 86400;
        const clock = current.seconds + offset;
        const lastOrder = row.lastOrder ?? period.lastOrder;
        const lastOffset = row.lastOrderDayOffset ?? period.lastOrderDayOffset ?? 0;
        if (clock >= start && clock < end && (!lastOrder || clock <= seconds(lastOrder) + lastOffset * 86400)) return 'open';
      }
    }
  }
  return known ? 'closed' : 'unknown';
}
function seedHash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.codePointAt(0)!) % 2147483647;
  return value;
}
export function evaluateEligibility(bundle: FoodBundle, input: EligibilityInput, evaluatedAt: string,
  policy: EligibilityPolicy) {
  const now = timestamp(evaluatedAt), desired = timestamp(input.context.desiredAt), context = input.context;
  if (!(Number.isFinite(now) && Number.isFinite(desired)) || !Number.isFinite(context.radiusM)
    || !(Number.isFinite(policy.maxRadiusM) && Number.isFinite(policy.maxFutureSeconds)
      && policy.maxRadiusM > 0 && policy.maxFutureSeconds > 0) || context.radiusM <= 0
    || context.radiusM > policy.maxRadiusM || desired > now + policy.maxFutureSeconds * 1000
    || !['breakfast', 'lunch', 'dinner', 'snack'].includes(context.mealSlot)
    || !['dine_in', 'takeaway', 'delivery'].includes(context.serviceMode)
    || (context.timeHint != null && context.timeHint !== 'late_night') || !input.poolSeed) throw new Error('INVALID_INPUT');
  if ((bundle.fixtureOnly || Object.values(bundle.entities).some(list => list.some(r => r.fixtureOnly))) && !policy.fixtureMode) throw new Error('FIXTURE_NOT_ALLOWED');
  const until = Math.max(now, desired);
  const anchor = rows(bundle, 'publicAnchors').find(r => r.anchorId === context.anchorId);
  const coverage = rows(bundle, 'coverageAreas').find(r => r.areaId === anchor?.coverageId);
  const datasets = rows(bundle, 'datasetVersions').filter(r => r.datasetVersion === bundle.datasetVersion);
  const hasContext = datasets.length === 1 && sourced(bundle, datasets[0], now, until)
    && sourced(bundle, anchor, now, until) && sourced(bundle, coverage, now, until)
    && coverage?.datasetVersion === bundle.datasetVersion && anchor?.isPublic === true
    && (context.coverageId == null || context.coverageId === anchor.coverageId)
    && anchor.lat != null && anchor.lng != null && insidePolygon(coverage?.boundary, anchor.lat, anchor.lng);
  const eligible: Candidate[] = [], excluded: Rejection[] = [], confirmation: Rejection[] = [];
  for (const offering of [...rows(bundle, 'venueDishes')].sort((a, b) => a.offeringId! < b.offeringId! ? -1 : 1)) {
    const id = offering.offeringId!;
    const venue = rows(bundle, 'venues').find(r => r.id === offering.venueId);
    const dish = rows(bundle, 'dishes').find(r => r.id === offering.dishId);
    let reason = '', needsConfirmation = false;
    const unknown = (code: string) => { reason = code; needsConfirmation = true; };
    if (desired < now) unknown('DESIRED_TIME_PASSED');
    else if (!hasContext) reason = 'OUT_OF_COVERAGE';
    else if (!venue || !dish) unknown('BROKEN_REFERENCE');
    else if (venue.lat == null || venue.lng == null) unknown('COORDINATES_UNKNOWN');
    else if (!insidePolygon(coverage!.boundary, venue.lat, venue.lng)) reason = 'OUT_OF_COVERAGE';
    else if (distanceMetres(anchor!.lat!, anchor!.lng!, venue.lat, venue.lng) > context.radiusM + 1e-7) reason = 'OUTSIDE_RADIUS';
    else if (venue.status !== 'active') unknown('VENUE_UNAVAILABLE');
    else if (!offering.menuSource) unknown('MENU_UNKNOWN');
    else if (![venue, dish, offering].every(r => sourced(bundle, r, now, until))) unknown('SOURCE_OR_ROW_UNVERIFIED');
    else if (!(dish.mealSlots?.length) || dish.classificationStatus !== 'reviewed') unknown('MEAL_UNKNOWN');
    else if (!dish.mealSlots.includes(context.mealSlot)) reason = 'MEAL_MISMATCH';
    else if (offering.serviceMode !== context.serviceMode || !venue.serviceModes?.includes(context.serviceMode)) unknown('SERVICE_MODE_UNAVAILABLE');
    else {
      const mode = schedule(bundle, venue.scheduleId, venue.timezone!, desired, now, 'venue', venue.id!);
      const offerMode = schedule(bundle, offering.scheduleId, venue.timezone!, desired, now, 'offering', id);
      if (mode === 'unknown' || offerMode === 'unknown') unknown('SCHEDULE_UNKNOWN');
      else if (mode !== 'open' || offerMode !== 'open') reason = 'OUTSIDE_SCHEDULE';
      else {
        const active = rows(bundle, 'availabilityOverrides').filter(r => r.offeringId === id
          && timestamp(r.observedAt) <= now && timestamp(r.expiresAt) > until && sourced(bundle, r, now, until));
        if (active.some(r => r.state === 'sold_out' || r.state === 'paused')) reason = 'SOLD_OUT_OR_PAUSED';
      }
    }
    if (reason) { (needsConfirmation ? confirmation : excluded).push({ offeringId: id, reason }); continue; }
    const profile = { ...dish!, ...offering.profileOverrides };
    const choiceId = offering.dishId! + ':' + (offering.variant ?? '');
    const price = { priceMin: offering.priceMin ?? null, priceMax: offering.priceMax ?? null,
      unit: offering.unit ?? null, currency: offering.currency ?? null, servingSize: offering.servingSize ?? null,
      sourceRef: offering.fieldSources?.price ?? null };
    const artwork = offering.artwork ?? dish!.artwork;
    const permittedArtwork = artwork && typeof artwork === 'object' && 'usageRights' in artwork
      && ['granted', 'licensed', 'public_domain'].includes(String(artwork.usageRights)) ? artwork : null;
    eligible.push({ roundDishId: choiceId, choiceId, dishId: offering.dishId!, variant: offering.variant ?? null,
      name: dish!.name!, description: dish!.description ?? null, cuisineIds: profile.cuisineIds ?? [],
      categoryIds: profile.categoryIds ?? [], origin: dish!.origin ?? null, temperature: profile.temperature ?? null,
      flavor: profile.flavor ?? null, artwork: permittedArtwork, priceMin: price.priceMin, priceMax: price.priceMax,
      unit: price.unit, currency: price.currency, servingSize: price.servingSize, price,
      venueId: venue!.id!, venueName: venue!.branchName!, venueAddress: venue!.address ?? null,
      distanceM: Math.round(distanceMetres(anchor!.lat!, anchor!.lng!, venue!.lat!, venue!.lng!)),
      representativeOfferingId: id, offeringIds: [id], availability: rows(bundle, 'availabilityOverrides').some(r =>
        r.offeringId === id && r.state === 'available' && timestamp(r.observedAt) <= now
        && timestamp(r.expiresAt) > until && sourced(bundle, r, now, until)) ? 'confirmed' : 'scheduled' });
  }
  const participants = Object.values(input.preferencesByParticipant ?? {});
  const categories = [...new Set(participants.flatMap(p => p.categoryIds ?? []))].sort();
  const score = (c: Candidate) => {
    const affinity = participants.reduce((n, p) => n + (p.categoryIds ?? []).filter(id => c.categoryIds.includes(id)).length
      + (p.cuisineIds ?? []).filter(id => c.cuisineIds.includes(id)).length
      + (p.temperature && p.temperature !== 'unknown' && c.temperature === p.temperature ? 1 : 0)
      + Object.entries(p.flavor ?? {}).reduce((matches, [key, preference]) => {
        const profile = c.flavor && typeof c.flavor === 'object'
          ? (c.flavor as Record<string, { present?: boolean | null; intensity?: string }>)[key] : undefined;
        return matches + (preference.present != null && profile?.present === preference.present ? 1 : 0)
          + (preference.intensity && preference.intensity !== 'unknown' && profile?.intensity === preference.intensity ? 1 : 0);
      }, 0), 0);
    const budget = context.budget == null ? null : typeof context.budget === 'number'
      ? { max: context.budget, currency: 'VND', unit: 'person' } : context.budget;
    const budgetFit = budget && c.currency === budget.currency && c.unit === budget.unit
      && c.priceMax != null && budget.max != null && c.priceMax <= budget.max ? 1 : 0;
    const recent = context.avoidRecent && input.recentDishIds?.includes(c.dishId) ? 1 : 0;
    return [affinity, budgetFit, -recent, -c.distanceM, -seedHash(input.poolSeed + c.choiceId), c.representativeOfferingId] as const;
  };
  const compare = (a: Candidate, b: Candidate) => {
    const sa = score(a), sb = score(b);
    for (let i = 0; i < 5; i++) if (sa[i] !== sb[i]) return Number(sb[i]) - Number(sa[i]);
    return a.representativeOfferingId < b.representativeOfferingId ? -1 : 1;
  };
  eligible.sort(compare);
  const grouped = new Map<string, Candidate>();
  for (const item of eligible) {
    const prior = grouped.get(item.choiceId);
    if (prior) prior.offeringIds.push(item.representativeOfferingId);
    else grouped.set(item.choiceId, { ...item, offeringIds: [...item.offeringIds] });
  }
  const candidates = [...grouped.values()];
  const pool: Candidate[] = [];
  for (const category of categories) {
    if (pool.some(c => c.categoryIds.includes(category))) continue;
    const candidate = candidates.find(c => c.categoryIds.includes(category) && !pool.includes(c));
    if (candidate && pool.length < 8) pool.push(candidate);
  }
  for (const candidate of candidates) if (pool.length < 8 && !pool.includes(candidate)) pool.push(candidate);
  for (const candidate of pool) candidate.offeringIds.sort();
  return { pool, datasetVersion: bundle.datasetVersion, eligibilityVersion: ELIGIBILITY_VERSION,
    evaluatedAt: new Date(now).toISOString(), poolSeed: input.poolSeed, totalCandidateCount: candidates.length,
    eligibleOfferingIds: eligible.map(c => c.representativeOfferingId).sort(), excludedOfferings: excluded,
    needsConfirmationOfferings: confirmation,
    reasonCodes: pool.length ? [] : [...new Set([...excluded, ...confirmation].map(r => r.reason))].sort()
      .concat(excluded.length + confirmation.length ? [] : ['NO_ELIGIBLE_FOOD']) };
}

export function refetchWinner(bundle: FoodBundle, input: EligibilityInput, evaluatedAt: string,
  policy: EligibilityPolicy, winnerDishId: string, winnerVariant: string | null): Candidate[] {
  const snapshot = { ...bundle, entities: { ...bundle.entities, venueDishes: rows(bundle, 'venueDishes')
    .filter(r => r.dishId === winnerDishId && (r.variant ?? null) === winnerVariant) } };
  return evaluateEligibility(snapshot, input, evaluatedAt, policy).pool;
}
