/** Runtime guards for write payloads. TypeScript types alone cannot validate JSON. */
import type {
  CreateRoomResponse, JoinRoomResponse, SessionResponse, SubmissionReceipt,
  SubmitBallotResponse, FriendInvitation, RoomInvitation, RoomState,
} from './contracts';

export type ResponseGuard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
  return isRecord(value) && isNonEmptyString(value.roomId) && isNonEmptyString(value.code)
    && isVersion(value.version) && isTimestamp(value.expiresAt);
}

export function isJoinRoomResponse(value: unknown): value is JoinRoomResponse {
  return isRecord(value) && isNonEmptyString(value.roomId) && isNonEmptyString(value.code)
    && isVersion(value.version) && isNonEmptyString(value.memberId);
}

export function isSessionResponse(value: unknown): value is SessionResponse {
  if (!isRecord(value) || !isRecord(value.user)) return false;
  const user = value.user;
  return isNonEmptyString(value.token) && isTimestamp(value.expiresAt)
    && isNonEmptyString(user.id) && isNonEmptyString(user.displayName)
    && typeof user.isGuest === 'boolean' && isTimestamp(user.createdAt)
    && (user.avatarSeed === undefined || typeof user.avatarSeed === 'string');
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
    && isNonEmptyString(value.roomId) && isNonEmptyString(value.roomCode);
}
