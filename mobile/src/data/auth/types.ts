import type { ApiClient, ApiError, ReadResult, SessionUser } from '../api/contracts';

/** GM-16.1: credentials stay inside auth/storage; never part of a room DTO. */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: SessionUser;
}

export interface SessionStorage {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthPort {
  createGuest(displayName: string): Promise<StoredSession>;
  verify(accessToken: string): Promise<SessionUser>;
  refresh(refreshToken: string): Promise<StoredSession>;
  logout(accessToken: string): Promise<void>;
}

export interface SessionApi extends Pick<ApiClient, 'createGuestSession' | 'restoreSession' | 'logout'> {
  getAccessToken(): Promise<ReadResult<string>>;
  getGeneration(): number;
}

export class AuthFailure extends Error {
  readonly error: ApiError;
  readonly retryAfterMs?: number;
  constructor(error: ApiError, retryAfterMs?: number) {
    super(error.messageKey); // Raw server/network errors can contain credentials.
    this.name = 'AuthFailure';
    this.error = { messageKey: error.messageKey };
    this.retryAfterMs = retryAfterMs;
  }
}

export function authError(error: unknown): ApiError {
  return error instanceof AuthFailure ? error.error : { messageKey: 'UNKNOWN_ERROR' };
}
