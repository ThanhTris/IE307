import type { RoomState } from './rooms';

export type ErrorCode =
  // Auth & Permissions
  | 'AUTH_REQUIRED'
  | 'NOT_MEMBER'
  | 'NOT_HOST'
  | 'NOT_READY'
  | 'NOT_PARTNER'
  | 'NOT_RECIPIENT'
  | 'CONSENT_REQUIRED'
  // Validation & Input
  | 'INVALID_INPUT'
  | 'INVALID_DISH'
  | 'INCOMPLETE_BALLOT'
  // Room Lifecycle & State
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_LOCKED'
  | 'ROOM_EXPIRED'
  | 'ROOM_TERMINAL'
  | 'NOT_ENOUGH_MEMBERS'
  | 'INVALID_ROOM_STATE'
  | 'CONTEXT_CHANGED'
  // Voting & Submission
  | 'ALREADY_SUBMITTED'
  | 'VERSION_CONFLICT'
  | 'REQUEST_ID_REUSED'
  | 'REMOVE_LIMIT'
  // Eligibility & Coverage
  | 'OUT_OF_COVERAGE'
  | 'NO_ELIGIBLE_FOOD'
  | 'AVAILABILITY_UNKNOWN'
  | 'DESIRED_TIME_PASSED'
  | 'INSUFFICIENT_DISHES'
  | 'CONTRACT_MISMATCH'
  | 'UNSUPPORTED_FIELD'
  // Social & Invitations
  | 'INVITE_EXPIRED'
  | 'INVITE_REJECTED'
  | 'INVITE_CANCELLED'
  // Rate limit & Infra
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface ApiError {
  messageKey: ErrorCode;
  message?: string;
  details?: Record<string, unknown>;
}

export type ReadResult<T> =
  | { ok: true; data: T; stale?: boolean; fetchedAt?: string }
  | { ok: false; error: ApiError };

export type WriteResult<T = void> =
  | { ok: true; requestId?: string; roomId?: string; version?: number; state?: RoomState | string; data: T }
  | { ok: false; requestId?: string; roomId?: string; error: ApiError };
