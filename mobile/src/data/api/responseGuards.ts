/** Runtime guards for RPC payloads. TypeScript types alone cannot validate JSON. */
import type {
  CreateRoomResponse, JoinRoomResponse, SessionResponse, SubmissionReceipt,
  SubmitBallotResponse, FriendInvitation, RoomInvitation, RoomState,
  SessionUser, DiscoveryContextResponse, PreviewFoodPoolResponse, PoolDish,
  RoomSnapshot, Friend, InboxItem, HistoryItem, HistoryConsent, SocialIdentity,
} from './contracts';

export type ResponseGuard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Room invite codes are six unambiguous server-generated characters. */
export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}

export function isVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = parts;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return Number(month) >= 1 && Number(month) <= 12
    && Number(day) >= 1 && Number(day) <= daysInMonth
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
}

export function isRoomState(value: unknown): value is RoomState {
  return typeof value === 'string' && [
    'LOBBY', 'ROUND_1', 'ROUND_2', 'DECIDED', 'NO_CONSENSUS', 'CANCELLED',
    'EXPIRED', 'FINALIZED', 'VOTING', 'COMPLETED',
  ].includes(value);
}

export function isVoidPayload(value: unknown): value is void {
  return value === undefined;
}

export function isCreateRoomResponse(value: unknown): value is CreateRoomResponse {
  return isRecord(value) && isNonEmptyString(value.roomId) && isRoomCode(value.code)
    && isVersion(value.version) && isTimestamp(value.expiresAt);
}

export function isJoinRoomResponse(value: unknown): value is JoinRoomResponse {
  return isRecord(value) && isNonEmptyString(value.roomId) && isRoomCode(value.code)
    && isVersion(value.version) && isNonEmptyString(value.memberId);
}

export function isSessionResponse(value: unknown): value is SessionResponse {
  return isRecord(value) && isNonEmptyString(value.token) && isTimestamp(value.expiresAt)
    && isSessionUser(value.user);
}

function isSubmissionReceipt(value: unknown): value is SubmissionReceipt {
  if (!isRecord(value)) return false;
  return (value.round === 1 || value.round === 2) && isNonEmptyString(value.intentId)
    && isNonEmptyString(value.requestId) && isTimestamp(value.submittedAt) && isCount(value.voteCount)
    && (value.votesSummary === undefined || (Array.isArray(value.votesSummary)
      && value.votesSummary.every(vote => isRecord(vote) && isNonEmptyString(vote.roundDishId)
        && typeof vote.vote === 'string' && ['WANT', 'OK', 'NO', 'KEEP', 'REMOVE'].includes(vote.vote))));
}

export function isSubmitBallotResponse(value: unknown): value is SubmitBallotResponse {
  if (!isRecord(value)) return false;
  return typeof value.accepted === 'boolean' && (value.round === 1 || value.round === 2)
    && typeof value.allMembersSubmitted === 'boolean' && isVersion(value.roomVersion)
    && (value.requestId === undefined || isNonEmptyString(value.requestId))
    && (value.receipt === undefined || (isSubmissionReceipt(value.receipt)
      && value.receipt.round === value.round
      && (value.requestId === undefined || value.receipt.requestId === value.requestId)));
}

export function isFriendInvitation(value: unknown): value is FriendInvitation {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.inviterUserId)
    && isNonEmptyString(value.inviterName) && isNonEmptyString(value.inviteeUserId)
    && typeof value.status === 'string' && ['pending', 'accepted', 'rejected', 'expired'].includes(value.status)
    && isTimestamp(value.createdAt) && isTimestamp(value.expiresAt);
}

export function isRoomInvitation(value: unknown): value is RoomInvitation {
  return isFriendInvitation(value) && isRecord(value)
    && isNonEmptyString(value.roomId) && isRoomCode(value.roomCode);
}

export function arrayOf<T>(guard: ResponseGuard<T>): ResponseGuard<T[]> {
  return (value: unknown): value is T[] => Array.isArray(value) && value.every(guard);
}

const isStringArray = arrayOf(isNonEmptyString);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const optional = (value: unknown, guard: (value: unknown) => boolean) => value === undefined || guard(value);
const nullable = (value: unknown, guard: (value: unknown) => boolean) => value === null || guard(value);
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value);
const isTemperature = (value: unknown) => oneOf(value, ['hot', 'warm', 'cold', 'ambient', 'unknown']);
const isCurrency = (value: unknown) => oneOf(value, ['VND', 'USD', 'THB', 'KRW', 'JPY', 'CNY', 'EUR', 'other']);
const isPriceUnit = (value: unknown) => oneOf(value, ['portion', 'item', 'person', 'group', 'kg', 'menu_item_unspecified']);
const isVote = (value: unknown) => oneOf(value, ['WANT', 'OK', 'NO', 'KEEP', 'REMOVE']);

export function isSessionUser(value: unknown): value is SessionUser {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.displayName)
    && isBoolean(value.isGuest) && isTimestamp(value.createdAt) && optional(value.avatarSeed, isString);
}

export function isDiscoveryContext(value: unknown): value is DiscoveryContextResponse {
  return isRecord(value) && Array.isArray(value.anchors) && value.anchors.every(anchor =>
    isRecord(anchor) && isNonEmptyString(anchor.id) && isNonEmptyString(anchor.coverageId)
    && isNonEmptyString(anchor.name) && isString(anchor.address) && isNumber(anchor.lat) && isNumber(anchor.lng))
    && Array.isArray(value.coverageAreas) && value.coverageAreas.every(area => isRecord(area)
      && isNonEmptyString(area.id) && isNonEmptyString(area.name) && isNonEmptyString(area.adminAreaId))
    && isTimestamp(value.serverTime);
}

function isFlavor(value: unknown): boolean {
  return isRecord(value) && ['spicy', 'salty', 'sweet', 'sour'].every(key => {
    const item = value[key];
    return isRecord(item) && nullable(item.present, isBoolean)
      && oneOf(item.intensity, ['none', 'low', 'medium', 'high', 'unknown']);
  });
}

function isPrice(value: unknown): boolean {
  return isRecord(value) && nullable(value.priceMin, isNumber) && nullable(value.priceMax, isNumber)
    && nullable(value.currency, isCurrency) && nullable(value.unit, isPriceUnit)
    && nullable(value.servingSize, isString) && optional(value.sourceRef, v => nullable(v, isString))
    && optional(value.pricingStrategy, v => nullable(v, isString));
}

function isArtwork(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.url)
    && oneOf(value.usageRights, ['unknown', 'granted', 'licensed', 'public_domain', 'denied'])
    && nullable(value.license, isString) && nullable(value.attribution, isString);
}

export function isPoolDish(value: unknown): value is PoolDish {
  return isRecord(value) && isNonEmptyString(value.roundDishId) && isNonEmptyString(value.choiceId)
    && isNonEmptyString(value.dishId) && isNonEmptyString(value.name)
    && isStringArray(value.cuisineIds) && isStringArray(value.categoryIds)
    && optional(value.description, v => nullable(v, isString))
    && optional(value.origin, v => oneOf(v, ['north', 'central', 'south', 'unknown', 'not_applicable']))
    && optional(value.temperature, v => nullable(v, isTemperature))
    && optional(value.flavor, v => nullable(v, isFlavor)) && optional(value.artwork, v => nullable(v, isArtwork))
    && optional(value.priceMin, v => nullable(v, isNumber)) && optional(value.priceMax, v => nullable(v, isNumber))
    && optional(value.currency, v => nullable(v, isCurrency)) && optional(value.unit, v => nullable(v, isPriceUnit))
    && optional(value.servingSize, v => nullable(v, isString)) && optional(value.price, v => nullable(v, isPrice))
    && optional(value.venueId, isString) && optional(value.venueName, isString)
    && optional(value.venueAddress, isString) && optional(value.distanceM, isNumber);
}

export function isPreviewFoodPool(value: unknown): value is PreviewFoodPoolResponse {
  return isRecord(value) && arrayOf(isPoolDish)(value.pool) && isNonEmptyString(value.datasetVersion)
    && isNonEmptyString(value.eligibilityVersion) && isTimestamp(value.evaluatedAt) && isCount(value.totalCandidateCount);
}

function isContext(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.anchorId) && optional(value.anchorName, isString)
    && isNumber(value.radiusM) && isTimestamp(value.desiredAt)
    && oneOf(value.serviceMode, ['dine_in', 'takeaway', 'delivery'])
    && oneOf(value.mealSlot, ['breakfast', 'lunch', 'dinner', 'snack'])
    && optional(value.timeHint, v => v === 'late_night')
    && optional(value.budget, v => nullable(v, isNumber)) && isBoolean(value.avoidRecent);
}

function isPreferences(value: unknown): boolean {
  return isRecord(value) && isStringArray(value.cuisineIds) && isStringArray(value.categoryIds)
    && optional(value.temperature, isTemperature) && optional(value.flavor, isFlavor) && isBoolean(value.historyConsent);
}

function isResult(value: unknown): boolean {
  if (!(isRecord(value) && isNonEmptyString(value.resultId) && isNonEmptyString(value.roomId)
    && (value.round === 1 || value.round === 2) && nullable(value.winnerRoundDishId, isNonEmptyString)
    && nullable(value.winnerDish, isPoolDish) && isTimestamp(value.finalizedAt)
    && value.policyVersion === 'decision-v2')) return false;
  if (value.reasonCode === 'EMPTY_INTERSECTION' || value.reasonCode === 'ALL_REMOVED') {
    return value.matchTier === 'NO_CONSENSUS'
      && value.winnerRoundDishId === null && value.winnerDish === null;
  }
  const tierValid = value.reasonCode === 'UNANIMOUS_WANT' ? value.matchTier === 'PERFECT'
    : value.reasonCode === 'ACCEPTABLE_FINAL'
      && (value.matchTier === 'CONSENSUS' || value.matchTier === 'COMPROMISE');
  return tierValid && isRecord(value.winnerDish)
    && value.winnerRoundDishId === value.winnerDish.roundDishId;
}

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  return isRecord(value) && isNonEmptyString(value.roomId) && isNonEmptyString(value.code)
    && isRoomState(value.state) && isVersion(value.version) && isNonEmptyString(value.hostUserId)
    && isContext(value.context) && Array.isArray(value.members) && value.members.every(member =>
      isRecord(member) && isNonEmptyString(member.userId) && isNonEmptyString(member.displayName)
      && isBoolean(member.isHost) && isBoolean(member.ready) && isTimestamp(member.joinedAt)
      && optional(member.hasSubmitted, isBoolean))
    && optional(value.ownPreferences, isPreferences) && (value.round === 1 || value.round === 2)
    && isVersion(value.poolVersion) && arrayOf(isPoolDish)(value.pool)
    && optional(value.ownVotes, votes => isRecord(votes) && Object.entries(votes).every(([id, vote]) => isNonEmptyString(id) && isVote(vote)))
    && optional(value.ownSubmission, v => nullable(v, isSubmissionReceipt))
    && optional(value.datasetVersion, v => nullable(v, isNonEmptyString))
    && optional(value.eligibilityVersion, v => nullable(v, isNonEmptyString))
    && optional(value.evaluatedAt, v => nullable(v, isTimestamp))
    && optional(value.result, v => nullable(v, isResult)) && isTimestamp(value.expiresAt);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string => typeof value === 'string' && uuidPattern.test(value);
const canonicalContracts = ['dish-session-v4/roadmap-v2/GM-07.B', 'dish-session-v4/roadmap-v2/GM-07.B-supplement'];
const canonicalPolicy = 'dish-decision-v4/ADR-019-30PCT-MIN1';
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const uniqueStringArray = (value: unknown, valid: (item: unknown) => boolean = isString) =>
  Array.isArray(value) && value.every(valid) && new Set(value).size === value.length;

function isCanonicalFlavor(value: unknown): boolean {
  if (!isRecord(value) || !onlyKeys(value, ['spicy', 'salty', 'sweet', 'sour'])) return false;
  return (['spicy', 'salty', 'sweet', 'sour'] as const).every(key => {
    const item = value[key];
    return isRecord(item) && onlyKeys(item, ['present', 'intensity'])
      && nullable(item.present, isBoolean) && oneOf(item.intensity, ['none', 'low', 'medium', 'high', 'unknown']);
  });
}

function isCanonicalArtwork(value: unknown): boolean {
  if (!isRecord(value) || !onlyKeys(value, ['uri', 'altText', 'attribution'])) return false;
  return isNonEmptyString(value.uri) && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value.uri)
    && isNonEmptyString(value.altText) && value.altText.length <= 300
    && nullable(value.attribution, v => isString(v) && v.length <= 500);
}

function isCanonicalPrice(value: unknown): boolean {
  return isRecord(value) && onlyKeys(value, ['amount', 'currency', 'unit', 'servingSize', 'sourceRef', 'checkedAt'])
    && isNumber(value.amount) && value.amount >= 0
    && isString(value.currency) && /^[A-Z]{3}$/.test(value.currency)
    && oneOf(value.unit, ['portion', 'item', 'person', 'group', 'kg', 'menu_item_unspecified'])
    && nullable(value.servingSize, v => isString(v) && v.length <= 160)
    && isNonEmptyString(value.sourceRef) && value.sourceRef.length <= 500 && isTimestamp(value.checkedAt);
}

function isCanonicalPoolDish(value: unknown): boolean {
  return isRecord(value) && onlyKeys(value, [
    'roundDishId', 'dishId', 'name', 'description', 'mealSlots', 'cuisineIds', 'cuisineLabels',
    'categoryIds', 'categoryLabels', 'temperature', 'flavor', 'artwork', 'priceReference',
  ]) && isUuid(value.roundDishId) && isUuid(value.dishId)
    && isNonEmptyString(value.name) && value.name.length <= 256
    && nullable(value.description, v => isString(v) && v.length <= 2000)
    && uniqueStringArray(value.mealSlots, slot => ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(slot)))
    && uniqueStringArray(value.cuisineIds, isUuid) && uniqueStringArray(value.categoryIds, isUuid)
    && uniqueStringArray(value.cuisineLabels, v => isNonEmptyString(v) && v.length <= 80)
    && uniqueStringArray(value.categoryLabels, v => isNonEmptyString(v) && v.length <= 80)
    && nullable(value.temperature, isTemperature) && nullable(value.flavor, isCanonicalFlavor)
    && nullable(value.artwork, isCanonicalArtwork) && nullable(value.priceReference, isCanonicalPrice);
}

function isCanonicalMember(value: unknown): boolean {
  return isRecord(value) && onlyKeys(value, ['userId', 'displayName', 'role', 'submissionStatus'])
    && isUuid(value.userId) && isNonEmptyString(value.displayName)
    && value.displayName.length <= 24 && oneOf(value.role, ['HOST', 'MEMBER'])
    && oneOf(value.submissionStatus, ['NOT_SUBMITTED', 'ACCEPTED']);
}

function isCanonicalPreferences(value: unknown): boolean {
  if (!(isRecord(value) && onlyKeys(value, ['cuisineIds', 'categoryIds', 'temperature', 'flavor', 'budget', 'avoidRecent'])
    && uniqueStringArray(value.cuisineIds, isUuid) && uniqueStringArray(value.categoryIds, isUuid)
    && nullable(value.temperature, isTemperature) && nullable(value.flavor, isCanonicalFlavor)
    && isBoolean(value.avoidRecent))) return false;
  if (value.budget === null) return true;
  return isRecord(value.budget) && onlyKeys(value.budget, ['maximum', 'currency', 'unit'])
    && isNumber(value.budget.maximum) && value.budget.maximum >= 0
    && typeof value.budget.currency === 'string' && /^[A-Z]{3}$/.test(value.budget.currency)
    && oneOf(value.budget.unit, ['portion', 'item', 'person', 'group', 'kg', 'menu_item_unspecified']);
}

function isCanonicalTerminalResult(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const result = value;
  if (!(onlyKeys(result, ['resultId', 'contractVersion', 'policyVersion', 'status', 'round', 'winner', 'reasonCode', 'finalizedAt', 'scoreVersion', 'rankingVersion', 'topDishes', 'round1BallotCount'])
    && isUuid(result.resultId) && canonicalContracts.includes(String(result.contractVersion))
    && result.policyVersion === canonicalPolicy && oneOf(result.status, ['DECIDED', 'NO_CONSENSUS'])
    && (result.round === 1 || result.round === 2) && nullable(result.winner, isCanonicalPoolDish)
    && oneOf(result.reasonCode, ['UNANIMOUS_WANT', 'ACCEPTABLE_FINAL', 'EMPTY_INTERSECTION', 'ALL_REMOVED'])
    && isTimestamp(result.finalizedAt)
    && (result.scoreVersion === 'want2-ok1-round1-v1' || result.scoreVersion === null)
    && (result.rankingVersion === 'score-desc-dense-rank-v1' || result.rankingVersion === null)
    && Array.isArray(result.topDishes) && result.topDishes.length <= 3
    && result.topDishes.every(item => isRecord(item) && onlyKeys(item, ['dish', 'score', 'rank', 'isWinner'])
      && isCanonicalPoolDish(item.dish) && isCount(item.score) && isCount(item.rank) && item.rank >= 1 && isBoolean(item.isWinner))
    && isCount(result.round1BallotCount) && result.round1BallotCount <= 20)) return false;
  if (result.status === 'DECIDED') {
    const winner = result.winner;
    const topDishes = result.topDishes as Record<string, unknown>[];
    const winnerRow = topDishes.filter(item => item.isWinner);
    const winnerDish = winnerRow[0]?.dish;
    const ordered = topDishes.every((item, index) => index === 0 || Number(topDishes[index - 1]!.score) >= Number(item.score));
    return isRecord(winner) && topDishes.length >= 1 && winnerRow.length === 1
      && isRecord(winnerDish) && winnerDish.roundDishId === winner.roundDishId
      && topDishes.every(item => Number(item.score) <= 2 * Number(result.round1BallotCount))
      && new Set(topDishes.map(item => (item.dish as Record<string, unknown>).roundDishId)).size === topDishes.length
      && ordered && result.scoreVersion === 'want2-ok1-round1-v1' && result.rankingVersion === 'score-desc-dense-rank-v1'
      && (result.reasonCode === 'UNANIMOUS_WANT' || result.reasonCode === 'ACCEPTABLE_FINAL');
  }
  return result.winner === null && result.topDishes.length === 0
    && result.scoreVersion === null && result.rankingVersion === null
    && ((result.round === 1 && result.reasonCode === 'EMPTY_INTERSECTION')
      || (result.round === 2 && result.reasonCode === 'ALL_REMOVED'));
}

/** Strict runtime guard for GM-07.B canonical snapshots; pool count is phase dependent. */
export function isCanonicalRoomSnapshot(value: unknown): value is RoomSnapshot {
  if (!isRecord(value)) return false;
  const snapshot = value;
  if (!(onlyKeys(snapshot, [
    'contractVersion', 'policyVersion', 'catalogueVersion', 'catalogueSha', 'roomId', 'code', 'state',
    'version', 'round', 'poolVersion', 'dishCount', 'pool', 'members', 'submittedCount', 'memberCount',
    'ownBallot', 'ownWaiting', 'waitingStartedAt', 'deadline', 'serverTime', 'result', 'hostUserId', 'settings',
    'ownPreferences', 'ownPreferenceRevision', 'preferenceRanking', 'removalCap', 'expiresAt', 'canEndWaiting',
  ]) && canonicalContracts.includes(String(snapshot.contractVersion))
    && snapshot.policyVersion === canonicalPolicy && isNonEmptyString(snapshot.catalogueVersion)
    && typeof snapshot.catalogueSha === 'string' && /^[a-f0-9]{64}$/.test(snapshot.catalogueSha)
    && isUuid(snapshot.roomId) && isRoomCode(snapshot.code)
    && oneOf(snapshot.state, ['LOBBY', 'ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2', 'DECIDED', 'NO_CONSENSUS', 'CANCELLED', 'EXPIRED'])
    && isVersion(snapshot.version) && (snapshot.round === 1 || snapshot.round === 2) && isVersion(snapshot.poolVersion)
    && isCount(snapshot.dishCount) && snapshot.dishCount >= 10 && snapshot.dishCount <= 20
    && Array.isArray(snapshot.pool) && snapshot.pool.length <= 20 && snapshot.pool.every(isCanonicalPoolDish)
    && Array.isArray(snapshot.members) && snapshot.members.length >= 1 && snapshot.members.length <= 20 && snapshot.members.every(isCanonicalMember)
    && isCount(snapshot.submittedCount) && snapshot.submittedCount <= 20
    && isCount(snapshot.memberCount) && snapshot.memberCount >= 1 && snapshot.memberCount <= 20
    && (snapshot.ownBallot === null || (Array.isArray(snapshot.ownBallot) && snapshot.ownBallot.every(item =>
      isRecord(item) && isUuid(item.roundDishId) && oneOf(item.choice, ['WANT', 'OK', 'NO', 'KEEP', 'REMOVE']))))
    && isBoolean(snapshot.ownWaiting) && nullable(snapshot.waitingStartedAt, isTimestamp)
    && nullable(snapshot.deadline, isTimestamp) && isTimestamp(snapshot.serverTime)
    && nullable(snapshot.result, isCanonicalTerminalResult) && isUuid(snapshot.hostUserId)
    && isRecord(snapshot.settings) && onlyKeys(snapshot.settings, ['dishCount', 'mealSlot', 'desiredAt'])
    && isCount(snapshot.settings.dishCount) && snapshot.settings.dishCount >= 10 && snapshot.settings.dishCount <= 20
    && oneOf(snapshot.settings.mealSlot, ['breakfast', 'lunch', 'dinner', 'snack'])
    && nullable(snapshot.settings.desiredAt, isTimestamp) && isCanonicalPreferences(snapshot.ownPreferences)
    && (snapshot.ownPreferenceRevision === null || isVersion(snapshot.ownPreferenceRevision))
    && snapshot.preferenceRanking === 'UNSUPPORTED'
    && (snapshot.removalCap === null || (isCount(snapshot.removalCap) && snapshot.removalCap <= 6))
    && isTimestamp(snapshot.expiresAt) && isBoolean(snapshot.canEndWaiting))) return false;

  if (snapshot.state === 'LOBBY' || snapshot.state === 'ROUND_1' || snapshot.state === 'WAITING_1') {
    if (snapshot.round !== 1 || snapshot.pool.length < 10 || snapshot.result !== null) return false;
  }
  if (snapshot.state === 'ROUND_2' || snapshot.state === 'WAITING_2') {
    if (snapshot.round !== 2 || snapshot.pool.length < 1 || snapshot.result !== null
      || snapshot.removalCap !== Math.max(1, Math.floor(snapshot.pool.length * 0.3))) return false;
  }
  if (snapshot.state === 'NO_CONSENSUS') {
    const result = snapshot.result;
    if (snapshot.pool.length !== 0 || !isCanonicalTerminalResult(result)
      || result.status !== 'NO_CONSENSUS' || result.round !== snapshot.round) return false;
  }
  if (snapshot.state === 'DECIDED') {
    const result = snapshot.result;
    if (!isCanonicalTerminalResult(result) || result.status !== 'DECIDED'
      || result.round !== snapshot.round) return false;
  }
  if (snapshot.state === 'WAITING_1' || snapshot.state === 'WAITING_2') {
    if (snapshot.waitingStartedAt === null || snapshot.deadline === null) return false;
  }
  const hosts = snapshot.members.filter(member => member.role === 'HOST');
  if (snapshot.memberCount !== snapshot.members.length || hosts.length !== 1 || hosts[0]!.userId !== snapshot.hostUserId
    || snapshot.submittedCount !== snapshot.members.filter(member => member.submissionStatus === 'ACCEPTED').length) return false;
  if (snapshot.state === 'ROUND_1' || snapshot.state === 'ROUND_2' || snapshot.state === 'LOBBY') {
    if (snapshot.waitingStartedAt !== null || snapshot.deadline !== null || snapshot.canEndWaiting) return false;
  }
  if (snapshot.state === 'CANCELLED' || snapshot.state === 'EXPIRED') {
    if (snapshot.result !== null || snapshot.canEndWaiting) return false;
  }
  return true;
}

export function isFriend(value: unknown): value is Friend {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.friendUserId)
    && isNonEmptyString(value.displayName) && isNonEmptyString(value.friendCode)
    && value.status === 'active' && isTimestamp(value.since);
}

export function isSocialIdentity(value: unknown): value is SocialIdentity {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.displayName)
    && isNonEmptyString(value.friendCode) && isNonEmptyString(value.avatarSeed);
}

export function isInboxItem(value: unknown): value is InboxItem {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.eventId)
    && oneOf(value.type, ['friend_invite', 'room_invite', 'room_result'])
    && isString(value.title) && isString(value.body) && isBoolean(value.read)
    && optional(value.metadata, isRecord) && isTimestamp(value.createdAt);
}

export function isHistoryItem(value: unknown): value is HistoryItem {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.roomId)
    && isRoomCode(value.roomCode) && isTimestamp(value.mealDate) && optional(value.winnerName, isString)
    && optional(value.winnerArtworkUrl, v => nullable(v, isString)) && isCount(value.memberCount)
    && oneOf(value.scope, ['personal', 'group']);
}

export function isHistoryConsent(value: unknown): value is HistoryConsent {
  return isRecord(value) && isBoolean(value.personal) && isBoolean(value.group);
}
