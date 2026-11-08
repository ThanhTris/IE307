import type { CanonicalHistoryItem, CanonicalHistoryPage, LegacyUnscoredHistoryResult } from './historyTypes';
import { mapRawToResultDish, mapRawToScoredResult } from '../../result/services/resultRepository';
import { validRawDish, validRawTerminal } from '../../result/services/resultWireGuard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;
const ITEM_KEYS = new Set([
  'historyId', 'roomId', 'resultId', 'scope', 'createdAt', 'expiresAt', 'result',
  'desiredAt', 'finalizedAt', 'memberCount', 'round1BallotCount', 'participants',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every(key => allowed.has(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

function isLegacyResult(value: unknown): value is LegacyUnscoredHistoryResult {
  if (!isRecord(value) || !onlyKeys(value, new Set(['capability', 'status', 'winner', 'reasonCode', 'finalizedAt']))) return false;
  if (value.capability !== 'legacy-unscored-v1' || !['DECIDED', 'NO_CONSENSUS'].includes(String(value.status))
    || !Object.hasOwn(value, 'winner') || !isTimestamp(value.finalizedAt)) return false;
  if (value.reasonCode !== undefined && value.reasonCode !== null && typeof value.reasonCode !== 'string') return false;
  if (value.winner !== null && !validRawDish(value.winner)) return false;
  return value.status === 'DECIDED' ? value.winner !== null : value.winner === null;
}

function parseHistoryItem(value: unknown): CanonicalHistoryItem | undefined {
  if (!isRecord(value) || !onlyKeys(value, ITEM_KEYS)) return undefined;
  if (!isUuid(value.historyId) || !isUuid(value.roomId) || !isUuid(value.resultId)
    || (value.scope !== 'personal' && value.scope !== 'group')
    || !isTimestamp(value.createdAt) || !isTimestamp(value.expiresAt)
    || Date.parse(value.expiresAt) <= Date.parse(value.createdAt)) return undefined;
  if (value.desiredAt !== undefined && value.desiredAt !== null && !isTimestamp(value.desiredAt)) return undefined;
  if (value.finalizedAt !== undefined && !isTimestamp(value.finalizedAt)) return undefined;
  if (value.memberCount !== undefined && (!Number.isInteger(value.memberCount) || Number(value.memberCount) < 1 || Number(value.memberCount) > 20)) return undefined;
  if (value.round1BallotCount !== undefined && (!Number.isInteger(value.round1BallotCount) || Number(value.round1BallotCount) < 0 || Number(value.round1BallotCount) > 20)) return undefined;
  if (value.participants !== undefined && (!Array.isArray(value.participants) || value.participants.length > 20
    || value.participants.some(participant => !isRecord(participant)
      || !onlyKeys(participant, new Set(['displayName', 'role']))
      || typeof participant.displayName !== 'string' || !participant.displayName.trim() || participant.displayName.length > 24
      || !['HOST', 'MEMBER'].includes(String(participant.role))))) return undefined;

  let result: CanonicalHistoryItem['result'];
  if (validRawTerminal(value.result)) {
    const mapped = mapRawToScoredResult(value.result);
    if (!mapped || mapped.resultId !== value.resultId) return undefined;
    if (value.round1BallotCount !== undefined && mapped.round1BallotCount !== undefined
      && value.round1BallotCount !== mapped.round1BallotCount) return undefined;
    if (value.finalizedAt !== undefined && value.finalizedAt !== mapped.finalizedAt) return undefined;
    result = mapped;
  } else if (isLegacyResult(value.result)) {
    if (value.result.finalizedAt !== value.finalizedAt && value.finalizedAt !== undefined) return undefined;
    result = {
      ...value.result,
      winner: value.result.winner === null ? null : mapRawToResultDish(value.result.winner),
    };
    if (value.result.winner !== null && result.winner === null) return undefined;
  } else {
    return undefined;
  }

  return {
    historyId: value.historyId,
    roomId: value.roomId,
    resultId: value.resultId,
    scope: value.scope,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    result,
    ...(value.desiredAt !== undefined ? { desiredAt: value.desiredAt as string | null } : {}),
    ...(value.finalizedAt !== undefined ? { finalizedAt: value.finalizedAt as string } : {}),
    ...(value.memberCount !== undefined ? { memberCount: value.memberCount as number } : {}),
    ...(value.round1BallotCount !== undefined ? { round1BallotCount: value.round1BallotCount as number } : {}),
    ...(value.participants !== undefined ? { participants: value.participants as { displayName: string; role: string }[] } : {}),
  };
}

/** Validates the raw history projection before a screen or cache can consume it. */
export function parseCanonicalHistoryPage(value: unknown): CanonicalHistoryPage | undefined {
  if (!isRecord(value) || !onlyKeys(value, new Set(['items'])) || !Array.isArray(value.items)) return undefined;
  const items = value.items.map(parseHistoryItem);
  if (items.some(item => !item)) return undefined;
  return { items: items as CanonicalHistoryItem[] };
}
