import {
  ApiError,
  ErrorCode,
  ReadResult,
  RoomState,
} from '../contracts';
import {
  ResponseGuard,
  isRecord,
  isNonEmptyString,
  isVersion,
  isRoomState,
  isVoidPayload,
} from '../responseGuards';

export interface RpcCallerContext {
  generateRequestId(): string;
  mapError(err: unknown): ApiError;
  callRpc<T>(rpcName: string, params: Record<string, unknown>): Promise<T>;
  normalizeWriteResponse<T>(
    raw: unknown,
    fallbackRequestId: string,
    guard: ResponseGuard<T>,
    roomId?: string
  ):
    | { ok: true; data: T; requestId: string; roomId?: string; version?: number; state?: RoomState | string }
    | { ok: false; requestId: string; roomId?: string; error: ApiError };
  normalizeReadResponse<T>(raw: unknown, guard: ResponseGuard<T>): ReadResult<T>;
}

const KNOWN_ERROR_CODES: ErrorCode[] = [
  'AUTH_REQUIRED', 'NOT_MEMBER', 'NOT_HOST', 'NOT_READY', 'NOT_PARTNER', 'NOT_RECIPIENT', 'CONSENT_REQUIRED',
  'INVALID_INPUT', 'INVALID_DISH', 'INCOMPLETE_BALLOT',
  'ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_LOCKED', 'ROOM_EXPIRED', 'ROOM_TERMINAL',
  'INVALID_ROOM_STATE', 'CONTEXT_CHANGED',
  'ALREADY_SUBMITTED', 'VERSION_CONFLICT', 'REQUEST_ID_REUSED',
  'OUT_OF_COVERAGE', 'NO_ELIGIBLE_FOOD', 'AVAILABILITY_UNKNOWN', 'DESIRED_TIME_PASSED',
  'INSUFFICIENT_DISHES', 'CONTRACT_MISMATCH', 'UNSUPPORTED_FIELD',
  'INVITE_EXPIRED', 'INVITE_REJECTED', 'INVITE_CANCELLED', 'RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT',
  'MALFORMED_RESPONSE', 'UNKNOWN_ERROR',
];

export function isValidErrorCode(key: string): key is ErrorCode {
  return KNOWN_ERROR_CODES.includes(key as ErrorCode);
}

export function generateRequestIdHelper(): string {
  return 'req_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function mapErrorHelper(err: unknown): ApiError {
  if (!err || typeof err !== 'object') {
    return { messageKey: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
  }

  const errObj = err as Record<string, unknown>;

  if (errObj.name === 'AbortError' || errObj.message === 'Timeout' || errObj.message === 'TIMEOUT') {
    return { messageKey: 'TIMEOUT', message: 'Request timed out' };
  }

  const candidatePayloads: unknown[] = [];
  if (errObj.body && typeof errObj.body === 'object') {
    const body = errObj.body as Record<string, unknown>;
    if (body.error && typeof body.error === 'object') {
      candidatePayloads.push(body.error);
    }
    candidatePayloads.push(body);
  }
  if (errObj.error && typeof errObj.error === 'object') {
    candidatePayloads.push(errObj.error);
  }
  candidatePayloads.push(errObj);

  for (const candidate of candidatePayloads) {
    if (!candidate || typeof candidate !== 'object') continue;
    const c = candidate as Record<string, unknown>;
    if (typeof c.messageKey === 'string' && isValidErrorCode(c.messageKey)) {
      return {
        messageKey: c.messageKey as ErrorCode,
        message: typeof c.message === 'string' ? c.message : undefined,
        details: c.details as Record<string, unknown> | undefined,
      };
    }
    if (typeof c.code === 'string') {
      if (c.code === 'P0001' && typeof c.message === 'string') {
        const match = c.message.match(/^[A-Z_]+/);
        if (match && isValidErrorCode(match[0])) {
          return {
            messageKey: match[0] as ErrorCode,
            message: c.message,
            details: c.details as Record<string, unknown> | undefined,
          };
        }
      } else if (isValidErrorCode(c.code)) {
        return {
          messageKey: c.code as ErrorCode,
          message: typeof c.message === 'string' ? c.message : undefined,
          details: c.details as Record<string, unknown> | undefined,
        };
      }
    }
  }

  if (typeof errObj.status === 'number') {
    if (errObj.status === 401 || errObj.status === 403) {
      return { messageKey: 'AUTH_REQUIRED', message: 'Authentication required' };
    }
    if (errObj.status === 404) {
      return { messageKey: 'ROOM_NOT_FOUND', message: 'Resource not found' };
    }
    if (errObj.status === 409) {
      return { messageKey: 'VERSION_CONFLICT', message: 'Resource version conflict' };
    }
    if (errObj.status === 429) {
      return { messageKey: 'RATE_LIMITED', message: 'Too many requests' };
    }
  }

  if (errObj.message && typeof errObj.message === 'string' && errObj.message.includes('Network')) {
    return { messageKey: 'NETWORK_ERROR', message: 'Network connection error' };
  }

  return { messageKey: 'UNKNOWN_ERROR', message: 'Operation failed' };
}

export function normalizeWriteResponseHelper<T>(
  raw: unknown,
  fallbackRequestId: string,
  guard: ResponseGuard<T>,
  roomId?: string
):
  | { ok: true; data: T; requestId: string; roomId?: string; version?: number; state?: RoomState | string }
  | { ok: false; requestId: string; roomId?: string; error: ApiError } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      requestId: fallbackRequestId,
      roomId,
      error: { messageKey: 'MALFORMED_RESPONSE', message: 'RPC write returned non-object response' },
    };
  }

  const env = raw as Record<string, unknown>;
  if (typeof env.ok !== 'boolean') {
    return {
      ok: false,
      requestId: fallbackRequestId,
      roomId,
      error: { messageKey: 'MALFORMED_RESPONSE', message: 'RPC write response missing boolean ok field' },
    };
  }

  const resRequestId = typeof env.requestId === 'string' ? env.requestId : fallbackRequestId;
  const resRoomId = typeof env.roomId === 'string' ? env.roomId : roomId;

  if (env.ok === false) {
    const errObj = (typeof env.error === 'object' && env.error !== null) ? (env.error as Record<string, unknown>) : {};
    let messageKey: ErrorCode = 'UNKNOWN_ERROR';
    if (typeof errObj.messageKey === 'string' && isValidErrorCode(errObj.messageKey)) {
      messageKey = errObj.messageKey;
    } else if (typeof env.messageKey === 'string' && isValidErrorCode(env.messageKey)) {
      messageKey = env.messageKey as ErrorCode;
    }
    return {
      ok: false,
      requestId: resRequestId,
      roomId: resRoomId,
      error: {
        messageKey,
        message: typeof errObj.message === 'string' ? errObj.message : (typeof env.message === 'string' ? env.message : 'Operation failed'),
        details: (typeof errObj.details === 'object' && errObj.details !== null) ? (errObj.details as Record<string, unknown>) : undefined,
      },
    };
  }

  const payload = Object.prototype.hasOwnProperty.call(env, 'data')
    ? (env.data === null ? undefined : env.data)
    : (guard === isVoidPayload ? undefined : env);
  const metadataValid = (env.requestId === undefined || isNonEmptyString(env.requestId))
    && (env.roomId === undefined || isNonEmptyString(env.roomId))
    && (env.version === undefined || isVersion(env.version))
    && (env.state === undefined || isRoomState(env.state));
  const payloadRecord = isRecord(payload) ? payload : undefined;
  const receipt = isRecord(payloadRecord?.receipt) ? payloadRecord.receipt : undefined;
  const payloadVersion = payloadRecord?.version ?? payloadRecord?.roomVersion;
  const identifiersMatch = (roomId === undefined || env.roomId === undefined || env.roomId === roomId)
    && (payloadRecord?.roomId === undefined || resRoomId === undefined || payloadRecord.roomId === resRoomId)
    && (env.version === undefined || payloadVersion === undefined || env.version === payloadVersion)
    && (payloadRecord?.requestId === undefined || payloadRecord.requestId === resRequestId)
    && (receipt === undefined || receipt.requestId === resRequestId);
  if (!metadataValid || !guard(payload) || !identifiersMatch) {
    return {
      ok: false, requestId: resRequestId, roomId,
      error: { messageKey: 'MALFORMED_RESPONSE', message: 'RPC write response does not match endpoint contract' },
    };
  }
  const version = isVersion(env.version) ? env.version : undefined;
  const state = isRoomState(env.state) ? env.state : undefined;

  return {
    ok: true,
    data: payload,
    requestId: resRequestId,
    roomId: resRoomId,
    version,
    state,
  };
}

export function normalizeReadResponseHelper<T>(raw: unknown, guard: ResponseGuard<T>): ReadResult<T> {
  if (raw === null || raw === undefined) {
    return {
      ok: false,
      error: { messageKey: 'MALFORMED_RESPONSE', message: 'Read RPC returned empty response' },
    };
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const env = raw as Record<string, unknown>;
    if (env.ok === false || (env.error && typeof env.error === 'object')) {
      const errObj = (env.error && typeof env.error === 'object') ? (env.error as Record<string, unknown>) : {};
      let messageKey: ErrorCode = 'UNKNOWN_ERROR';
      if (typeof errObj.messageKey === 'string' && isValidErrorCode(errObj.messageKey)) {
        messageKey = errObj.messageKey;
      } else if (typeof env.messageKey === 'string' && isValidErrorCode(env.messageKey)) {
        messageKey = env.messageKey as ErrorCode;
      }
      return {
        ok: false,
        error: {
          messageKey,
          message: typeof errObj.message === 'string' ? errObj.message : 'Read operation failed',
        },
      };
    }
    if ('ok' in env) {
      if (env.ok === true && guard(env.data)) return { ok: true, data: env.data };
      return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE', message: 'Read RPC returned invalid envelope or data' } };
    }
  }

  return guard(raw) ? { ok: true, data: raw }
    : { ok: false, error: { messageKey: 'MALFORMED_RESPONSE', message: 'Read RPC returned invalid data' } };
}
